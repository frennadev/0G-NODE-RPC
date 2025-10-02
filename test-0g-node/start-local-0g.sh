#!/bin/bash

set -e

echo "🚀 Starting 0G Chain Node Locally (macOS)"

# Set environment variables for local testing
export DATA_DIR="./data"
export NODE_NAME="local-0g-test"

# Get local IP
export NODE_IP="127.0.0.1"
echo "📍 Node IP: $NODE_IP"

# Create required directories
mkdir -p $DATA_DIR/0g-home/0gchaind-home/data
mkdir -p $DATA_DIR/0g-home/0gchaind-home/config
mkdir -p $DATA_DIR/0g-home/geth-home
mkdir -p $DATA_DIR/0g-home/log

echo "🔧 Step 1: Initialize 0gchaind (Consensus Layer)"
if [ ! -f "$DATA_DIR/0g-home/0gchaind-home/config/node_key.json" ]; then
    ./0gchaind init $NODE_NAME --home $DATA_DIR/tmp
    
    # Copy keys to permanent location
    cp $DATA_DIR/tmp/data/priv_validator_state.json $DATA_DIR/0g-home/0gchaind-home/data/
    cp $DATA_DIR/tmp/config/node_key.json $DATA_DIR/0g-home/0gchaind-home/config/
    cp $DATA_DIR/tmp/config/priv_validator_key.json $DATA_DIR/0g-home/0gchaind-home/config/
    
    # Clean up temp directory
    rm -rf $DATA_DIR/tmp
    echo "✅ 0gchaind initialized successfully"
else
    echo "✅ 0gchaind already initialized"
fi

echo "🔧 Step 2: Initialize Geth (Execution Layer)"
if [ ! -f "$DATA_DIR/0g-home/geth-home/geth/chaindata/CURRENT" ]; then
    ./geth init --datadir $DATA_DIR/0g-home/geth-home ./geth-genesis.json
    echo "✅ Geth initialized successfully"
else
    echo "✅ Geth already initialized"
fi

echo "🔧 Step 3: Generate JWT Authentication Token"
if [ ! -f "$DATA_DIR/0g-home/0gchaind-home/config/jwt.hex" ]; then
    ./0gchaind jwt generate --home $DATA_DIR/0g-home/0gchaind-home
    echo "✅ JWT token generated"
else
    echo "✅ JWT token already exists"
fi

# Copy JWT token to working directory
cp -f $DATA_DIR/0g-home/0gchaind-home/config/jwt.hex ./

echo "🔧 Step 4: Configure Node Name"
if [ -f "$DATA_DIR/0g-home/0gchaind-home/config/config.toml" ]; then
    sed -i.bak "s/moniker = \"local-0g-test\"/moniker = \"$NODE_NAME\"/" $DATA_DIR/0g-home/0gchaind-home/config/config.toml
fi

echo "✅ Configuration complete. Starting both layers..."

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    pkill -f 0gchaind || true
    pkill -f geth || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

echo "🔗 Step 5: Start 0gchaind (Consensus Layer) on port 26657"
./0gchaind start \
    --rpc.laddr tcp://0.0.0.0:26657 \
    --chaincfg.kzg.trusted-setup-path=kzg-trusted-setup.json \
    --chaincfg.engine.jwt-secret-path=jwt.hex \
    --chaincfg.block-store-service.enabled \
    --home $DATA_DIR/0g-home/0gchaind-home \
    --p2p.external_address $NODE_IP:26656 > $DATA_DIR/0g-home/log/0gchaind.log 2>&1 &

# Wait for 0gchaind to start and be ready
echo "⏳ Waiting for 0gchaind to start and sync..."
sleep 20

# Check if 0gchaind is responding
for i in {1..30}; do
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        echo "✅ 0gchaind is responding"
        break
    else
        echo "⏳ Waiting for 0gchaind... (attempt $i/30)"
        if [ $i -eq 15 ]; then
            echo "📋 0gchaind log (last 10 lines):"
            tail -10 $DATA_DIR/0g-home/log/0gchaind.log || echo "No log yet"
        fi
        sleep 5
    fi
done

echo "⚡ Step 6: Start Geth (Execution Layer) on port 8545"
# Start Geth on port 8545 (standard Ethereum port) with JWT auth
./geth \
    --datadir $DATA_DIR/0g-home/geth-home \
    --networkid 16661 \
    --nat extip:$NODE_IP \
    --authrpc.jwtsecret jwt.hex \
    --authrpc.addr 0.0.0.0 \
    --authrpc.port 8551 \
    --http \
    --http.addr "0.0.0.0" \
    --http.port 8545 \
    --http.api "eth,net,web3,debug,txpool,engine" \
    --http.corsdomain "*" \
    --http.vhosts "*" \
    --ws \
    --ws.addr "0.0.0.0" \
    --ws.port 8546 \
    --ws.api "eth,net,web3,debug,txpool,engine" \
    --ws.origins "*" \
    --engine \
    --engine.addr 0.0.0.0 \
    --engine.port 8551 \
    --engine.jwtsecret jwt.hex > $DATA_DIR/0g-home/log/geth.log 2>&1 &

# Wait for Geth to start
echo "⏳ Waiting for Geth to start..."
sleep 15

# Check if Geth is running and responding
echo "🔍 Checking Geth status..."
if pgrep -f "geth" > /dev/null; then
    echo "✅ Geth process is running"
    
    # Test if Geth RPC is responding
    for i in {1..20}; do
        if curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
            echo "✅ Geth RPC is responding on port 8545"
            break
        else
            echo "⏳ Waiting for Geth RPC... (attempt $i/20)"
            if [ $i -eq 10 ]; then
                echo "📋 Geth log (last 10 lines):"
                tail -10 $DATA_DIR/0g-home/log/geth.log || echo "No log yet"
            fi
            sleep 3
        fi
    done
else
    echo "❌ Geth process not found!"
    echo "📋 Geth log contents:"
    cat $DATA_DIR/0g-home/log/geth.log || echo "No geth.log found"
    exit 1
fi

echo "🎉 0G Chain Node started successfully!"
echo "📊 RPC Endpoints:"
echo "   - Consensus (Tendermint): http://localhost:26657"
echo "   - Execution (Geth): http://localhost:8545"
echo "   - WebSocket: ws://localhost:8546"
echo ""
echo "🧪 Test commands:"
echo "# Test consensus layer"
echo "curl http://localhost:26657/status"
echo ""
echo "# Test execution layer"
echo "curl -X POST http://localhost:8545 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}'"
echo ""

# Run the test script
echo "🧪 Running comprehensive tests..."
./test-0g-node.sh

echo "✅ Testing complete! Check the results above."
