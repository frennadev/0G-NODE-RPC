#!/bin/bash

echo "🚀 0G Chain Detailed Sync Monitor"
echo "📊 Network Target: 6,543,820+ blocks (growing 5+ blocks/second)"
echo "🎯 Your Transaction: Block 6,542,022"
echo ""

while true; do
    echo "=== $(date) ==="
    
    # Get basic block info
    BLOCK_RESPONSE=$(curl -s -X POST https://zerog-node-rpc.onrender.com/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')
    BLOCK_HEX=$(echo "$BLOCK_RESPONSE" | jq -r '.result' 2>/dev/null)
    
    if [ "$BLOCK_HEX" != "null" ] && [ "$BLOCK_HEX" != "0x0" ]; then
        BLOCK_NUM=$((16#${BLOCK_HEX#0x}))
        echo "📈 Current Block: $BLOCK_NUM"
    else
        echo "📈 Current Block: 0 (genesis)"
    fi
    
    # Get peer count
    PEER_RESPONSE=$(curl -s -X POST https://zerog-node-rpc.onrender.com/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}')
    PEER_HEX=$(echo "$PEER_RESPONSE" | jq -r '.result' 2>/dev/null)
    if [ "$PEER_HEX" != "null" ]; then
        PEER_COUNT=$((16#${PEER_HEX#0x}))
        echo "🌐 Peers: $PEER_COUNT connected"
    fi
    
    # Get detailed sync status
    SYNC_RESPONSE=$(curl -s -X POST https://zerog-node-rpc.onrender.com/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}')
    
    if echo "$SYNC_RESPONSE" | grep -q '"result":false'; then
        echo "✅ SYNC COMPLETE!"
    elif echo "$SYNC_RESPONSE" | grep -q '"result":{'; then
        echo "🔄 Snap Sync Progress:"
        
        # Parse sync data
        CURRENT=$(echo "$SYNC_RESPONSE" | jq -r '.result.currentBlock' 2>/dev/null)
        HIGHEST=$(echo "$SYNC_RESPONSE" | jq -r '.result.highestBlock' 2>/dev/null)
        SYNCED_ACCOUNTS=$(echo "$SYNC_RESPONSE" | jq -r '.result.syncedAccounts' 2>/dev/null)
        SYNCED_STORAGE=$(echo "$SYNC_RESPONSE" | jq -r '.result.syncedStorage' 2>/dev/null)
        TX_INDEX_REMAINING=$(echo "$SYNC_RESPONSE" | jq -r '.result.txIndexRemainingBlocks' 2>/dev/null)
        
        if [ "$CURRENT" != "null" ]; then
            CURRENT_DEC=$((16#${CURRENT#0x}))
            echo "  📊 Current: $CURRENT_DEC"
        fi
        
        if [ "$HIGHEST" != "null" ] && [ "$HIGHEST" != "0x0" ]; then
            HIGHEST_DEC=$((16#${HIGHEST#0x}))
            echo "  🎯 Highest: $HIGHEST_DEC"
            
            if [ $CURRENT_DEC -gt 0 ] && [ $HIGHEST_DEC -gt 0 ]; then
                PROGRESS=$(echo "scale=2; $CURRENT_DEC * 100 / $HIGHEST_DEC" | bc -l 2>/dev/null || echo "0")
                echo "  📈 Progress: ${PROGRESS}%"
            fi
        else
            echo "  🔍 Discovering network height..."
        fi
        
        if [ "$SYNCED_ACCOUNTS" != "null" ]; then
            ACCOUNTS_DEC=$((16#${SYNCED_ACCOUNTS#0x}))
            echo "  👥 Synced Accounts: $ACCOUNTS_DEC"
        fi
        
        if [ "$SYNCED_STORAGE" != "null" ]; then
            STORAGE_DEC=$((16#${SYNCED_STORAGE#0x}))
            echo "  💾 Synced Storage: $STORAGE_DEC"
        fi
        
        if [ "$TX_INDEX_REMAINING" != "null" ]; then
            TX_REMAINING_DEC=$((16#${TX_INDEX_REMAINING#0x}))
            echo "  📋 TX Index Remaining: $TX_REMAINING_DEC blocks"
        fi
    else
        echo "⏳ Waiting for sync to start..."
    fi
    
    # Test transaction
    TX_RESPONSE=$(curl -s -X POST https://zerog-node-rpc.onrender.com/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getTransactionByHash","params":["0x6f2653877a1029f8a57874f800063fc26fea1972c9d95d0b3eb60af198740519"],"id":1}')
    
    if echo "$TX_RESPONSE" | grep -q "transaction indexing is in progress"; then
        echo "🔄 Transaction indexing: IN PROGRESS"
    elif echo "$TX_RESPONSE" | grep -q '"result":null'; then
        echo "📋 Your transaction: Not found yet"
    elif echo "$TX_RESPONSE" | grep -q '"result":{'; then
        echo "🎉 YOUR TRANSACTION FOUND!"
        echo "$TX_RESPONSE" | jq '.result'
        break
    fi
    
    echo "---"
    sleep 30
done
