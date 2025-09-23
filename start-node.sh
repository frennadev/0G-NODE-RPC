#!/bin/bash

set -e

echo "🚀 Starting 0G Chain Node Setup..."

# Set environment variables
export DATA_DIR="/data"
export NODE_NAME="${NODE_NAME:-render-0g-node}"

# Get external IP (for Render, this will be the container IP)
export NODE_IP=$(curl -s ifconfig.me || echo "0.0.0.0")
echo "📍 Node IP: $NODE_IP"

# Initialize Geth if not already done
if [ ! -f "$DATA_DIR/0g-home/geth-home/geth/chaindata/CURRENT" ]; then
    echo "🔧 Initializing Geth..."
    ./bin/geth init --datadir $DATA_DIR/0g-home/geth-home ./geth-genesis.json
fi

# Ensure directory structure exists
mkdir -p $DATA_DIR/0g-home/0gchaind-home/data
mkdir -p $DATA_DIR/0g-home/0gchaind-home/config
mkdir -p $DATA_DIR/0g-home/geth-home
mkdir -p $DATA_DIR/0g-home/log

# Initialize 0gchaind keys if not already done
if [ ! -f "$DATA_DIR/0g-home/0gchaind-home/config/node_key.json" ]; then
    echo "🔑 Generating node keys..."
    ./bin/0gchaind init $NODE_NAME --home $DATA_DIR/tmp
    
    # Ensure target directories exist
    mkdir -p $DATA_DIR/0g-home/0gchaind-home/data
    mkdir -p $DATA_DIR/0g-home/0gchaind-home/config
    
    # Copy keys to permanent location
    cp $DATA_DIR/tmp/data/priv_validator_state.json $DATA_DIR/0g-home/0gchaind-home/data/
    cp $DATA_DIR/tmp/config/node_key.json $DATA_DIR/0g-home/0gchaind-home/config/
    cp $DATA_DIR/tmp/config/priv_validator_key.json $DATA_DIR/0g-home/0gchaind-home/config/
    
    # Clean up temp directory
    rm -rf $DATA_DIR/tmp
fi

# Generate JWT token if not exists
if [ ! -f "$DATA_DIR/0g-home/0gchaind-home/config/jwt.hex" ]; then
    echo "🔐 Generating JWT token..."
    ./bin/0gchaind jwt generate --home $DATA_DIR/0g-home/0gchaind-home
fi

# Copy JWT token to working directory
cp -f $DATA_DIR/0g-home/0gchaind-home/config/jwt.hex ./

# Update node name in config
sed -i "s/moniker = \"0G-mainnet-aristotle-node\"/moniker = \"$NODE_NAME\"/" $DATA_DIR/0g-home/0gchaind-home/config/config.toml

echo "✅ Configuration complete. Starting services..."

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    pkill -f 0gchaind || true
    pkill -f geth || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start 0gchaind in background
echo "🔗 Starting 0gchaind (Consensus Layer)..."
./bin/0gchaind start \
    --rpc.laddr tcp://0.0.0.0:26657 \
    --chaincfg.kzg.trusted-setup-path=kzg-trusted-setup.json \
    --chaincfg.engine.jwt-secret-path=jwt.hex \
    --chaincfg.block-store-service.enabled \
    --home $DATA_DIR/0g-home/0gchaind-home \
    --p2p.external_address $NODE_IP:26656 > $DATA_DIR/0g-home/log/0gchaind.log 2>&1 &

# Wait a moment for 0gchaind to start
sleep 10

# Start Geth in background
echo "⚡ Starting Geth (Execution Layer)..."
echo "📍 Geth command: ./bin/geth --config geth-config.toml --nat extip:$NODE_IP --datadir $DATA_DIR/0g-home/geth-home --networkid 16661"
./bin/geth \
    --config geth-config.toml \
    --nat extip:$NODE_IP \
    --datadir $DATA_DIR/0g-home/geth-home \
    --networkid 16661 > $DATA_DIR/0g-home/log/geth.log 2>&1 &

# Wait for Geth to start
sleep 5
echo "🔍 Checking if Geth is running..."
if pgrep -f "geth" > /dev/null; then
    echo "✅ Geth process is running"
else
    echo "❌ Geth process not found!"
    echo "📋 Geth log contents:"
    cat $DATA_DIR/0g-home/log/geth.log || echo "No geth.log found"
fi

echo "🎉 0G Chain Node started successfully!"
echo "📊 RPC Endpoints:"
echo "   - Consensus: http://localhost:26657"
echo "   - Execution: http://localhost:8545"

# Monitor logs and keep container running
while true; do
    # Check if processes are still running
    if ! pgrep -f "0gchaind" > /dev/null; then
        echo "❌ 0gchaind process died, restarting..."
        ./bin/0gchaind start \
            --rpc.laddr tcp://0.0.0.0:26657 \
            --chaincfg.kzg.trusted-setup-path=kzg-trusted-setup.json \
            --chaincfg.engine.jwt-secret-path=jwt.hex \
            --chaincfg.block-store-service.enabled \
            --home $DATA_DIR/0g-home/0gchaind-home \
            --p2p.external_address $NODE_IP:26656 > $DATA_DIR/0g-home/log/0gchaind.log 2>&1 &
    fi
    
    if ! pgrep -f "geth" > /dev/null; then
        echo "❌ Geth process died, restarting..."
        ./bin/geth \
            --config geth-config.toml \
            --nat extip:$NODE_IP \
            --datadir $DATA_DIR/0g-home/geth-home \
            --networkid 16661 > $DATA_DIR/0g-home/log/geth.log 2>&1 &
    fi
    
    # Show sync status every 30 seconds
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        SYNC_INFO=$(curl -s http://localhost:26657/status | jq -r '.result.sync_info | {latest_block_height, catching_up}')
        echo "📈 Sync Status: $SYNC_INFO"
    fi
    
    sleep 30
done
