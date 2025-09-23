#!/bin/bash

set -e

echo "🚀 Starting Geth with FULL SYNC (No Network Height Discovery Required)"

# Set environment variables
export DATA_DIR="/data"
export NODE_NAME="${NODE_NAME:-render-geth-full}"

# Get external IP
export NODE_IP=$(curl -s ifconfig.me || echo "0.0.0.0")
echo "📍 Node IP: $NODE_IP"

# Create required directories
mkdir -p $DATA_DIR/geth-home
mkdir -p $DATA_DIR/log

echo "🔧 Step 1: Initialize Geth for Full Sync (Starts from Block 0)"
# Remove existing database to ensure clean start
if [ -d "$DATA_DIR/geth-home/geth" ]; then
    echo "🗑️ Removing existing database for clean full sync..."
    rm -rf $DATA_DIR/geth-home/geth
fi

# Initialize with hash state scheme
./bin/geth init --state.scheme=hash --datadir $DATA_DIR/geth-home ./geth-genesis.json
echo "✅ Geth initialized for full sync"

echo "✅ Configuration complete. Starting Geth with full sync (no network height discovery needed)..."

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down Geth..."
    pkill -f geth || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

echo "⚡ Starting Geth with Full Sync (Immediate Start)"
./bin/geth \
    --datadir $DATA_DIR/geth-home \
    --networkid 16661 \
    --nat extip:$NODE_IP \
    --state.scheme=hash \
    --syncmode full \
    --cache=4096 \
    --maxpeers=50 \
    --bootnodes="enode://2bf74c837a98c94ad0fa8f5c58a428237d2040f9269fe622c3dbe4fef68141c28e2097d7af6ebaa041194257543dc112514238361a6498f9a38f70fd56493f96@8.221.140.134:30303" \
    --discovery.port=30303 \
    --port=30303 \
    --nodiscover=false \
    --v5disc \
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
    --ws.origins "*" > $DATA_DIR/log/geth.log 2>&1 &

# Wait for Geth to start
echo "⏳ Waiting for Geth to start full sync..."
sleep 20

# Check if Geth is running
if pgrep -f "geth" > /dev/null; then
    echo "✅ Geth process is running"
else
    echo "❌ Geth process not found!"
    echo "📋 Geth log contents:"
    cat $DATA_DIR/log/geth.log || echo "No geth.log found"
    exit 1
fi

echo "🎉 Geth Full Sync Node started!"
echo "📊 RPC Endpoint: https://zerog-node-rpc.onrender.com/"
echo "📈 Target: Block 6,542,022 (full sync - processes every block)"
echo "⚡ Advantage: Starts immediately, no network height discovery needed"
echo "⏳ Timeline: Slower but more reliable, ~2-4 hours to reach target"
echo ""
echo "⏳ Sync Status:"

# Monitor sync progress
LAST_BLOCK=0
SYNC_START_TIME=$(date +%s)

while true; do
    # Check if Geth process is still running
    if ! pgrep -f "geth" > /dev/null; then
        echo "❌ Geth died, restarting..."
        ./bin/geth \
            --datadir $DATA_DIR/geth-home \
            --networkid 16661 \
            --nat extip:$NODE_IP \
            --state.scheme=hash \
            --syncmode full \
            --cache=4096 \
            --maxpeers=50 \
            --bootnodes="enode://2bf74c837a98c94ad0fa8f5c58a428237d2040f9269fe622c3dbe4fef68141c28e2097d7af6ebaa041194257543dc112514238361a6498f9a38f70fd56493f96@8.221.140.134:30303" \
            --discovery.port=30303 \
            --port=30303 \
            --nodiscover=false \
            --v5disc \
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
            --ws.origins "*" > $DATA_DIR/log/geth.log 2>&1 &
    fi
    
    # Show sync progress
    if curl -s -X POST http://localhost:26657 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
        CURRENT_BLOCK_HEX=$(curl -s -X POST http://localhost:26657 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' 2>/dev/null || echo "0x0")
        CURRENT_BLOCK=$((16#${CURRENT_BLOCK_HEX#0x}))
        
        if [ $CURRENT_BLOCK -gt $LAST_BLOCK ]; then
            PROGRESS=$(echo "scale=4; $CURRENT_BLOCK * 100 / 6542022" | bc -l 2>/dev/null || echo "0")
            ELAPSED=$(($(date +%s) - $SYNC_START_TIME))
            ELAPSED_MIN=$((ELAPSED / 60))
            
            # Calculate blocks per minute
            if [ $ELAPSED -gt 0 ]; then
                BLOCKS_PER_MIN=$(echo "scale=2; $CURRENT_BLOCK * 60 / $ELAPSED" | bc -l 2>/dev/null || echo "0")
                ETA_MIN=$(echo "scale=0; (6542022 - $CURRENT_BLOCK) / $BLOCKS_PER_MIN" | bc -l 2>/dev/null || echo "unknown")
                echo "📈 Block: $CURRENT_BLOCK / 6,542,022 (${PROGRESS}%) - ${ELAPSED_MIN}m elapsed - ${BLOCKS_PER_MIN} blocks/min - ETA: ${ETA_MIN}m"
            else
                echo "📈 Block: $CURRENT_BLOCK / 6,542,022 (${PROGRESS}%) - ${ELAPSED_MIN}m elapsed"
            fi
            
            # Check if we're close to target
            if [ $CURRENT_BLOCK -gt 6540000 ]; then
                echo "🎯 Almost there! Your swap transaction should be available soon!"
            fi
            
            LAST_BLOCK=$CURRENT_BLOCK
        fi
        
        # Check if we've reached the target
        if [ $CURRENT_BLOCK -ge 6542022 ]; then
            echo ""
            echo "🎉 SUCCESS! Node has synced past your transaction block!"
            echo "✅ Your swap transaction is now available!"
            echo ""
            echo "🧪 Testing your transaction:"
            curl -X POST https://zerog-node-rpc.onrender.com/ \
                -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"eth_getTransactionByHash","params":["0x6f2653877a1029f8a57874f800063fc26fea1972c9d95d0b3eb60af198740519"],"id":1}' | jq '.'
            break
        fi
    else
        echo "⏳ Waiting for RPC to respond..."
    fi
    
    # Get peer count
    PEER_RESPONSE=$(curl -s -X POST http://localhost:26657 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}')
    PEER_HEX=$(echo "$PEER_RESPONSE" | jq -r '.result' 2>/dev/null)
    if [ "$PEER_HEX" != "null" ]; then
        PEER_COUNT=$((16#${PEER_HEX#0x}))
        echo "🌐 Peers: $PEER_COUNT connected"
    fi
    
    sleep 30
done
