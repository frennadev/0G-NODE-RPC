#!/bin/bash

echo "🚀 0G Chain Snap Sync Monitor"
echo "📊 Network: Block 6,543,820+ (growing 5+ blocks/second)"
echo "🎯 Target: Your swap at block 6,542,022"
echo "⏳ Waiting for snap sync to catch up..."
echo ""

START_TIME=$(date +%s)

while true; do
    # Get current block
    RESPONSE=$(curl -s -X POST https://zerog-node-rpc.onrender.com/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')
    
    if echo "$RESPONSE" | grep -q "result"; then
        BLOCK_HEX=$(echo "$RESPONSE" | jq -r '.result' 2>/dev/null)
        if [ "$BLOCK_HEX" != "null" ] && [ "$BLOCK_HEX" != "0x0" ]; then
            # Convert hex to decimal
            BLOCK_NUM=$((16#${BLOCK_HEX#0x}))
            ELAPSED=$(($(date +%s) - START_TIME))
            ELAPSED_MIN=$((ELAPSED / 60))
            
            # Calculate progress
            PROGRESS=$(echo "scale=2; $BLOCK_NUM * 100 / 6542022" | bc -l 2>/dev/null || echo "0")
            
            echo "📈 Block: $BLOCK_NUM / 6,542,022 (${PROGRESS}%) - ${ELAPSED_MIN}m elapsed"
            
            # Check if we've reached the target
            if [ $BLOCK_NUM -ge 6542022 ]; then
                echo ""
                echo "🎉 SUCCESS! Node has synced past your transaction block!"
                echo "✅ Your swap transaction should now be available!"
                echo ""
                echo "🧪 Testing your transaction:"
                curl -X POST https://zerog-node-rpc.onrender.com/ \
                    -H "Content-Type: application/json" \
                    -d '{"jsonrpc":"2.0","method":"eth_getTransactionByHash","params":["0x6f2653877a1029f8a57874f800063fc26fea1972c9d95d0b3eb60af198740519"],"id":1}' | jq '.'
                break
            fi
        else
            echo "⏳ Still at genesis block (0x0) - snap sync initializing..."
        fi
    else
        echo "⏳ Waiting for RPC response..."
    fi
    
    # Test transaction availability
    TX_RESPONSE=$(curl -s -X POST https://zerog-node-rpc.onrender.com/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getTransactionByHash","params":["0x6f2653877a1029f8a57874f800063fc26fea1972c9d95d0b3eb60af198740519"],"id":1}')
    
    if echo "$TX_RESPONSE" | grep -q "transaction indexing is in progress"; then
        echo "🔄 Transaction indexing in progress (good sign!)"
    elif echo "$TX_RESPONSE" | grep -q '"result":null'; then
        echo "📋 Transaction not found yet (normal until sync completes)"
    elif echo "$TX_RESPONSE" | grep -q '"result":{'; then
        echo "🎉 TRANSACTION FOUND! Sync complete!"
        echo "$TX_RESPONSE" | jq '.'
        break
    fi
    
    echo "---"
    sleep 30
done
