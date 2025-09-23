#!/bin/sh

# Fail on unset variables and errors
set -eu

BEACOND_BIN="./bin/0gchaind"
BEACOND_HOME="$1"
EL_RPC_URL="$2"

echo "Starting rollback process:"
echo "- BEACOND_BIN: $BEACOND_BIN"
echo "- BEACOND_HOME: $BEACOND_HOME"
echo "- EL_RPC_URL: $EL_RPC_URL"

# Validate BEACOND_HOME already exists
if [ ! -d "$BEACOND_HOME" ]; then
    echo "Error: BEACOND_HOME is not a valid directory."
    exit 1
fi

# Validate BEACOND_BIN (must be in PATH or specified)
if ! "$BEACOND_BIN" version >/dev/null 2>&1; then
    echo "Error: BEACOND_BIN is not a valid executable or not found."
    exit 1
fi

echo "[Fetching EL height...]"
EL_HEX=$(curl -s -X POST --location "$EL_RPC_URL" --header 'Content-Type: application/json' --data '{
    "jsonrpc":"2.0",
    "method":"eth_getBlockByNumber",
    "params":["latest", false],
    "id":1
}' | jq -r .result.number)

if [ -z "$EL_HEX" ] || [ "$EL_HEX" = "null" ]; then
    echo "Error: Invalid Execution Layer height (EL). EL must be greater than zero."
    exit 1
fi

EL=$(printf "%d\n" "$EL_HEX")
if [ "$EL" -le 0 ]; then
    echo "Error: EL must be greater than zero."
    exit 1
fi

echo "-> EL height: $EL ($EL_HEX)"

echo "[Fetching CL height...]"
ROLLBACK_OUTPUT=$("$BEACOND_BIN" rollback --hard --home="$BEACOND_HOME" --chaincfg.chain-spec=devnet)
CL=$(echo "$ROLLBACK_OUTPUT" | sed -n 's/.*height=\([0-9][0-9]*\).*/\1/p')
echo "-> CL height: $CL"

# Check if CL is already at or below EL
if [ "$CL" -le "$EL" ]; then
    echo "No rollback needed. Consensus Layer height is already at or below Execution Layer height."
    exit 0
fi

# Start the rollback loop from CL down to EL
echo "[Starting rolling back of CL]"
while true; do
    echo "Rolling back CL height $CL..."

    ROLLBACK_OUTPUT=$("$BEACOND_BIN" rollback --hard --home="$BEACOND_HOME" --chaincfg.chain-spec=devnet)
    NEW_CL=$(echo "$ROLLBACK_OUTPUT" | sed -n 's/.*height=\([0-9][0-9]*\).*/\1/p')

    # Validate NEW_CL is a number
    case "$NEW_CL" in
        ''|*[!0-9]*)
            echo "Invalid height after rollback: $NEW_CL" >&2
            exit 1
            ;;
    esac

    echo "New CL height after rollback: $NEW_CL (required height: $EL)"
    CL=$NEW_CL
    
    if [ "$CL" -le "$EL" ]; then
        echo "Reached target Execution Layer height. Exiting."
        break
    fi
done

echo "Rollback process completed successfully."
