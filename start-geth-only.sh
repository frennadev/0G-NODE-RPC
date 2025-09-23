#!/bin/bash

set -e

echo "🚀 Starting Geth-Only 0G Chain Node..."

# Set environment variables
export DATA_DIR="/data"
export NODE_NAME="${NODE_NAME:-render-geth-node}"

# Get external IP (for Render, this will be the container IP)
export NODE_IP=$(curl -s ifconfig.me || echo "0.0.0.0")
echo "📍 Node IP: $NODE_IP"

# Create required directories
mkdir -p $DATA_DIR/geth-home
mkdir -p $DATA_DIR/log

# Initialize Geth if not already done
if [ ! -f "$DATA_DIR/geth-home/geth/chaindata/CURRENT" ]; then
    echo "🔧 Initializing Geth..."
    ./bin/geth init --datadir $DATA_DIR/geth-home ./geth-genesis.json
    echo "✅ Geth initialized successfully"
else
    echo "✅ Geth already initialized"
fi

echo "✅ Configuration complete. Starting Geth..."

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down Geth..."
    pkill -f geth || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start Geth
echo "⚡ Starting Geth (Execution Layer)..."
echo "📍 Geth command with explicit HTTP flags:"
echo "./bin/geth --datadir $DATA_DIR/geth-home --networkid 16661 --http --http.addr 0.0.0.0 --http.port 8545 --http.api eth,net,web3"

# Try without config file first to isolate the issue
./bin/geth \
    --datadir $DATA_DIR/geth-home \
    --networkid 16661 \
    --nat extip:$NODE_IP \
    --http \
    --http.addr "0.0.0.0" \
    --http.port 8545 \
    --http.api "eth,net,web3,debug,txpool" \
    --http.corsdomain "*" \
    --http.vhosts "*" \
    --allow-insecure-unlock \
    --gcmode archive > $DATA_DIR/log/geth.log 2>&1 &

# Wait for Geth to start
echo "⏳ Waiting for Geth to start..."
sleep 15

# Check if Geth is running
if pgrep -f "geth" > /dev/null; then
    echo "✅ Geth process is running"
    
    # Debug: Check if port is open
    echo "🔍 Checking if port 8545 is open..."
    netstat -tlnp | grep 8545 || echo "❌ Port 8545 not listening"
    
    # Debug: Show geth log
    echo "📋 Geth log (last 10 lines):"
    tail -10 $DATA_DIR/log/geth.log || echo "No log yet"
    
    # Test if RPC is responding
    for i in {1..10}; do
        if curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' > /dev/null 2>&1; then
            echo "✅ Geth RPC is responding"
            break
        else
            echo "⏳ Waiting for Geth RPC... (attempt $i/10)"
            if [ $i -eq 5 ]; then
                echo "📋 Mid-check geth log:"
                tail -5 $DATA_DIR/log/geth.log || echo "No log"
            fi
            sleep 5
        fi
    done
else
    echo "❌ Geth process not found!"
    echo "📋 Geth log contents:"
    cat $DATA_DIR/log/geth.log || echo "No geth.log found"
    exit 1
fi

echo "🎉 Geth Node started successfully!"
echo "📊 RPC Endpoints:"
echo "   - HTTP: http://localhost:8545"
echo "   - WebSocket: ws://localhost:8546"
echo ""
echo "🧪 Test commands:"
echo "curl -X POST http://localhost:8545 -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}'"
echo ""

# Monitor and keep container running
while true; do
    # Check if Geth process is still running
    if ! pgrep -f "geth" > /dev/null; then
        echo "❌ Geth process died, restarting..."
        ./bin/geth \
            --config geth-config.toml \
            --nat extip:$NODE_IP \
            --datadir $DATA_DIR/geth-home \
            --networkid 16661 > $DATA_DIR/log/geth.log 2>&1 &
    fi
    
    # Show sync status every 30 seconds
    if curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' > /dev/null 2>&1; then
        BLOCK_NUM=$(curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' 2>/dev/null || echo "unknown")
        echo "📈 Current block: $BLOCK_NUM"
    fi
    
    sleep 30
done
