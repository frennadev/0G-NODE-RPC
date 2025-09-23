#!/bin/bash

set -e

echo "🚀 Starting Geth-Only on Render Port 26657"

# Set environment variables
export DATA_DIR="/data"
export NODE_NAME="${NODE_NAME:-render-geth-node}"

# Get external IP
export NODE_IP=$(curl -s ifconfig.me || echo "0.0.0.0")
echo "📍 Node IP: $NODE_IP"

# Create required directories
mkdir -p $DATA_DIR/0g-home/geth-home
mkdir -p $DATA_DIR/0g-home/log

echo "🔧 Initialize Geth (Execution Layer)"
if [ ! -f "$DATA_DIR/0g-home/geth-home/geth/chaindata/CURRENT" ]; then
    ./bin/geth init --datadir $DATA_DIR/0g-home/geth-home ./geth-genesis.json
    echo "✅ Geth initialized successfully"
else
    echo "✅ Geth already initialized"
fi

echo "✅ Configuration complete. Starting Geth on port 26657..."

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down Geth..."
    pkill -f geth || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

echo "⚡ Starting Geth (Execution Layer) on port 26657"
# Start Geth on port 26657 (the port Render expects)
./bin/geth \
    --datadir $DATA_DIR/0g-home/geth-home \
    --networkid 16661 \
    --nat extip:$NODE_IP \
    --http \
    --http.addr "0.0.0.0" \
    --http.port 26657 \
    --http.api "eth,net,web3,debug,txpool" \
    --http.corsdomain "*" \
    --http.vhosts "*" \
    --ws \
    --ws.addr "0.0.0.0" \
    --ws.port 8546 \
    --ws.api "eth,net,web3,debug,txpool" \
    --ws.origins "*" > $DATA_DIR/0g-home/log/geth.log 2>&1 &

# Wait for Geth to start
echo "⏳ Waiting for Geth to start..."
sleep 20

# Check if Geth is running
if pgrep -f "geth" > /dev/null; then
    echo "✅ Geth process is running"
else
    echo "❌ Geth process not found!"
    echo "📋 Geth log contents:"
    cat $DATA_DIR/0g-home/log/geth.log || echo "No geth.log found"
    exit 1
fi

# Test RPC endpoint
echo "🧪 Testing RPC endpoint on port 26657..."
for i in {1..10}; do
    if curl -s -X POST http://localhost:26657 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q "result"; then
        echo "✅ Geth RPC is responding on port 26657"
        break
    else
        echo "⏳ Waiting for Geth RPC... (attempt $i/10)"
        if [ $i -eq 5 ]; then
            echo "📋 Mid-check geth log:"
            tail -10 $DATA_DIR/0g-home/log/geth.log || echo "No log"
        fi
        sleep 5
    fi
done

echo "🎉 Geth Node started successfully!"
echo "📊 RPC Endpoint:"
echo "   - HTTP: http://localhost:26657 (Render will expose this)"
echo "   - WebSocket: ws://localhost:8546"
echo ""
echo "🧪 Test your address:"
echo "curl -X POST https://zerog-node-rpc.onrender.com/ -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"0x8B598A7C136215A95ba0282b4d832B9f9801f2e2\",\"latest\"],\"id\":1}'"

# Monitor and keep container running
while true; do
    # Check if Geth process is still running
    if ! pgrep -f "geth" > /dev/null; then
        echo "❌ Geth process died, restarting..."
        ./bin/geth \
            --datadir $DATA_DIR/0g-home/geth-home \
            --networkid 16661 \
            --nat extip:$NODE_IP \
            --http \
            --http.addr "0.0.0.0" \
            --http.port 26657 \
            --http.api "eth,net,web3,debug,txpool" \
            --http.corsdomain "*" \
            --http.vhosts "*" \
            --ws \
            --ws.addr "0.0.0.0" \
            --ws.port 8546 \
            --ws.api "eth,net,web3,debug,txpool" \
            --ws.origins "*" > $DATA_DIR/0g-home/log/geth.log 2>&1 &
    fi
    
    # Show status every 30 seconds
    if curl -s -X POST http://localhost:26657 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
        BLOCK_NUM=$(curl -s -X POST http://localhost:26657 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' 2>/dev/null || echo "unknown")
        echo "📈 Current block: $BLOCK_NUM"
    fi
    
    sleep 30
done
