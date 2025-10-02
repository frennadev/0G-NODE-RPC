#!/bin/bash

echo "🧪 Testing 0G Chain Node - Both Layers"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test functions
test_consensus() {
    echo -e "\n${YELLOW}🔗 Testing Consensus Layer (Tendermint)${NC}"
    echo "Endpoint: http://localhost:26657"
    
    # Test status
    echo "1. Testing /status endpoint..."
    if curl -s http://localhost:26657/status > /dev/null; then
        echo -e "${GREEN}✅ Consensus layer is responding${NC}"
        
        # Get block height
        BLOCK_HEIGHT=$(curl -s http://localhost:26657/status | jq -r '.result.sync_info.latest_block_height' 2>/dev/null)
        echo "   📊 Latest block: $BLOCK_HEIGHT"
        
        # Get node info
        NODE_ID=$(curl -s http://localhost:26657/status | jq -r '.result.node_info.id' 2>/dev/null)
        echo "   🆔 Node ID: ${NODE_ID:0:20}..."
        
        return 0
    else
        echo -e "${RED}❌ Consensus layer not responding${NC}"
        return 1
    fi
}

test_execution() {
    echo -e "\n${YELLOW}⚡ Testing Execution Layer (Geth)${NC}"
    echo "Endpoint: http://localhost:8545"
    
    # Test eth_blockNumber
    echo "1. Testing eth_blockNumber..."
    BLOCK_RESPONSE=$(curl -s -X POST http://localhost:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')
    
    if echo "$BLOCK_RESPONSE" | jq -e '.result' > /dev/null 2>&1; then
        BLOCK_NUMBER=$(echo "$BLOCK_RESPONSE" | jq -r '.result')
        echo -e "${GREEN}✅ Execution layer is responding${NC}"
        echo "   📊 Block number: $BLOCK_NUMBER"
        return 0
    else
        echo -e "${RED}❌ Execution layer not responding${NC}"
        echo "   Response: $BLOCK_RESPONSE"
        return 1
    fi
}

test_eth_methods() {
    echo -e "\n${YELLOW}🔍 Testing Ethereum RPC Methods${NC}"
    
    # Test methods
    methods=(
        "eth_blockNumber:Get latest block number"
        "eth_syncing:Check sync status"
        "net_version:Get network ID"
        "web3_clientVersion:Get client version"
        "eth_gasPrice:Get gas price"
    )
    
    for method_info in "${methods[@]}"; do
        method=$(echo "$method_info" | cut -d: -f1)
        description=$(echo "$method_info" | cut -d: -f2)
        
        echo "   Testing $method ($description)..."
        response=$(curl -s -X POST http://localhost:8545 \
            -H "Content-Type: application/json" \
            -d "{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"params\":[],\"id\":1}")
        
        if echo "$response" | jq -e '.result' > /dev/null 2>&1; then
            result=$(echo "$response" | jq -r '.result')
            echo -e "   ${GREEN}✅ $method: $result${NC}"
        else
            error=$(echo "$response" | jq -r '.error.message // "Unknown error"' 2>/dev/null)
            echo -e "   ${RED}❌ $method: $error${NC}"
        fi
    done
}

test_token_info() {
    echo -e "\n${YELLOW}🪙 Testing Token Information (eth_call)${NC}"
    
    # Test with a known token address (0G token)
    TOKEN_ADDRESS="0x59ef6F3943bBdFE2fB19565037Ac85071223E94C"
    
    echo "   Testing with token: $TOKEN_ADDRESS"
    
    # Test token name
    name_response=$(curl -s -X POST http://localhost:8545 \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$TOKEN_ADDRESS\",\"data\":\"0x06fdde03\"},\"latest\"],\"id\":1}")
    
    if echo "$name_response" | jq -e '.result' > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Token name call successful${NC}"
    else
        echo -e "   ${RED}❌ Token name call failed${NC}"
    fi
}

test_event_logs() {
    echo -e "\n${YELLOW}📋 Testing Event Logs (eth_getLogs)${NC}"
    
    # Test with recent blocks
    recent_response=$(curl -s -X POST http://localhost:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{"fromBlock":"latest","toBlock":"latest","topics":["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]}],"id":1}')
    
    if echo "$recent_response" | jq -e '.result' > /dev/null 2>&1; then
        log_count=$(echo "$recent_response" | jq '.result | length')
        echo -e "   ${GREEN}✅ Event logs call successful (found $log_count logs)${NC}"
    else
        echo -e "   ${RED}❌ Event logs call failed${NC}"
    fi
}

# Main test execution
echo "Starting tests..."

# Test consensus layer
if test_consensus; then
    CONSENSUS_OK=true
else
    CONSENSUS_OK=false
fi

# Test execution layer
if test_execution; then
    EXECUTION_OK=true
    test_eth_methods
    test_token_info
    test_event_logs
else
    EXECUTION_OK=false
fi

# Summary
echo -e "\n${YELLOW}📊 Test Summary${NC}"
echo "================"

if [ "$CONSENSUS_OK" = true ]; then
    echo -e "${GREEN}✅ Consensus Layer (Tendermint): WORKING${NC}"
else
    echo -e "${RED}❌ Consensus Layer (Tendermint): FAILED${NC}"
fi

if [ "$EXECUTION_OK" = true ]; then
    echo -e "${GREEN}✅ Execution Layer (Geth): WORKING${NC}"
else
    echo -e "${RED}❌ Execution Layer (Geth): FAILED${NC}"
fi

if [ "$CONSENSUS_OK" = true ] && [ "$EXECUTION_OK" = true ]; then
    echo -e "\n${GREEN}🎉 SUCCESS! Both layers are working correctly!${NC}"
    echo "You can now use your local node for all blockchain operations."
    echo ""
    echo "Available endpoints:"
    echo "  - Consensus: http://localhost:26657"
    echo "  - Execution: http://localhost:8545"
    echo "  - WebSocket: ws://localhost:8546"
else
    echo -e "\n${RED}❌ Some tests failed. Check the logs above for details.${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Make sure both 0gchaind and geth processes are running"
    echo "2. Check the log files in /data/0g-home/log/"
    echo "3. Verify ports 26657 and 8545 are not blocked"
    echo "4. Ensure JWT authentication is properly configured"
fi
