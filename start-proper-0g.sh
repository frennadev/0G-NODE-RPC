#!/bin/bash

set -e

echo "🚀 Starting Proper 0G Chain Node (Both Layers)"

# Set environment variables
export DATA_DIR="/data"
export NODE_NAME="${NODE_NAME:-render-0g-node}"

# Get external IP
export NODE_IP=$(curl -s ifconfig.me || echo "0.0.0.0")
echo "📍 Node IP: $NODE_IP"

# Create required directories
mkdir -p $DATA_DIR/0g-home/0gchaind-home/data
mkdir -p $DATA_DIR/0g-home/0gchaind-home/config
mkdir -p $DATA_DIR/0g-home/geth-home
mkdir -p $DATA_DIR/0g-home/log

echo "🔧 Step 1: Initialize Geth (Execution Layer)"
if [ ! -f "$DATA_DIR/0g-home/geth-home/geth/chaindata/CURRENT" ]; then
    ./bin/geth init --datadir $DATA_DIR/0g-home/geth-home ./geth-genesis.json
    echo "✅ Geth initialized successfully"
else
    echo "✅ Geth already initialized"
fi

echo "🔧 Step 2: Initialize 0gchaind (Consensus Layer)"
if [ ! -f "$DATA_DIR/0g-home/0gchaind-home/config/node_key.json" ]; then
    ./bin/0gchaind init $NODE_NAME --home $DATA_DIR/tmp
    
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

echo "🔧 Step 3: Generate JWT Authentication Token"
if [ ! -f "$DATA_DIR/0g-home/0gchaind-home/config/jwt.hex" ]; then
    ./bin/0gchaind jwt generate --home $DATA_DIR/0g-home/0gchaind-home
    echo "✅ JWT token generated"
else
    echo "✅ JWT token already exists"
fi

# Copy JWT token to working directory
cp -f $DATA_DIR/0g-home/0gchaind-home/config/jwt.hex ./

echo "🔧 Step 4: Configure Node Name"
sed -i "s/moniker = \"0G-mainnet-aristotle-node\"/moniker = \"$NODE_NAME\"/" $DATA_DIR/0g-home/0gchaind-home/config/config.toml

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

echo "🔗 Step 5: Start 0gchaind (Consensus Layer)"
./bin/0gchaind start \
    --rpc.laddr tcp://0.0.0.0:26657 \
    --chaincfg.kzg.trusted-setup-path=kzg-trusted-setup.json \
    --chaincfg.engine.jwt-secret-path=jwt.hex \
    --chaincfg.block-store-service.enabled \
    --home $DATA_DIR/0g-home/0gchaind-home \
    --p2p.external_address $NODE_IP:26656 > $DATA_DIR/0g-home/log/0gchaind.log 2>&1 &

# Wait for 0gchaind to start
echo "⏳ Waiting for 0gchaind to start..."
sleep 15

echo "⚡ Step 6: Start Geth (Execution Layer)"
# Start Geth with explicit HTTP flags (config file doesn't enable HTTP by default)
./bin/geth \
    --datadir $DATA_DIR/0g-home/geth-home \
    --networkid 16661 \
    --nat extip:$NODE_IP \
    --authrpc.jwtsecret jwt.hex \
    --http \
    --http.addr "0.0.0.0" \
    --http.port 8545 \
    --http.api "eth,net,web3,debug,txpool" \
    --http.corsdomain "*" \
    --http.vhosts "*" \
    --ws \
    --ws.addr "0.0.0.0" \
    --ws.port 8546 \
    --ws.api "eth,net,web3,debug,txpool" \
    --ws.origins "*" > $DATA_DIR/0g-home/log/geth.log 2>&1 &

# Wait for both to start
echo "⏳ Waiting for both layers to start..."
sleep 20

# Check if both processes are running
echo "🔍 Checking processes..."
if pgrep -f "0gchaind" > /dev/null; then
    echo "✅ 0gchaind (consensus) is running"
else
    echo "❌ 0gchaind not running!"
    tail -10 $DATA_DIR/0g-home/log/0gchaind.log
fi

if pgrep -f "geth" > /dev/null; then
    echo "✅ Geth (execution) is running"
else
    echo "❌ Geth not running!"
    tail -10 $DATA_DIR/0g-home/log/geth.log
fi

# Test RPC endpoints
echo "🧪 Testing RPC endpoints..."

# Test consensus layer
if curl -s http://localhost:26657/status > /dev/null; then
    echo "✅ Consensus RPC (26657) is responding"
else
    echo "❌ Consensus RPC not responding"
fi

# Test execution layer
if curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
    echo "✅ Execution RPC (8545) is responding"
else
    echo "❌ Execution RPC not responding"
fi

echo "🎉 0G Chain Node started successfully!"
echo "📊 RPC Endpoints:"
echo "   - Consensus: http://localhost:26657"
echo "   - Execution: http://localhost:8545"

# Monitor and keep container running
while true; do
    # Check if both processes are still running
    if ! pgrep -f "0gchaind" > /dev/null; then
        echo "❌ 0gchaind died, restarting..."
        ./bin/0gchaind start \
            --rpc.laddr tcp://0.0.0.0:26657 \
            --chaincfg.kzg.trusted-setup-path=kzg-trusted-setup.json \
            --chaincfg.engine.jwt-secret-path=jwt.hex \
            --chaincfg.block-store-service.enabled \
            --home $DATA_DIR/0g-home/0gchaind-home \
            --p2p.external_address $NODE_IP:26656 > $DATA_DIR/0g-home/log/0gchaind.log 2>&1 &
    fi
    
    if ! pgrep -f "geth" > /dev/null; then
        echo "❌ Geth died, restarting..."
        ./bin/geth \
            --datadir $DATA_DIR/0g-home/geth-home \
            --networkid 16661 \
            --nat extip:$NODE_IP \
            --authrpc.jwtsecret jwt.hex \
            --http \
            --http.addr "0.0.0.0" \
            --http.port 8545 \
            --http.api "eth,net,web3,debug,txpool" \
            --http.corsdomain "*" \
            --http.vhosts "*" \
            --ws \
            --ws.addr "0.0.0.0" \
            --ws.port 8546 \
            --ws.api "eth,net,web3,debug,txpool" \
            --ws.origins "*" > $DATA_DIR/0g-home/log/geth.log 2>&1 &
    fi
    
    sleep 30
done
