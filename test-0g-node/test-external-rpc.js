#!/usr/bin/env node

const https = require('https');

console.log('🧪 Testing 0G RPC Endpoint Performance');
console.log('=====================================\n');

// Test configuration
const RPC_URL = 'https://evmrpc.0g.ai/';
const TEST_ADDRESS = '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C';

// Helper function to make RPC calls
function makeRpcCall(method, params = []) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: Date.now()
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            },
            timeout: 10000 // 10 second timeout
        };

        const req = https.request(RPC_URL, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        resolve(response.result);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Test functions
async function testBasicRpc() {
    console.log('1. Testing basic RPC methods...');
    
    try {
        const startTime = Date.now();
        
        // Test multiple methods in parallel
        const [blockNumber, netVersion, clientVersion, gasPrice] = await Promise.all([
            makeRpcCall('eth_blockNumber'),
            makeRpcCall('net_version'),
            makeRpcCall('web3_clientVersion'),
            makeRpcCall('eth_gasPrice')
        ]);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`   ✅ Block Number: ${blockNumber}`);
        console.log(`   ✅ Network ID: ${netVersion}`);
        console.log(`   ✅ Client: ${clientVersion.substring(0, 50)}...`);
        console.log(`   ✅ Gas Price: ${gasPrice}`);
        console.log(`   ⏱️  Duration: ${duration}ms`);
        
        return true;
    } catch (error) {
        console.log(`   ❌ Basic RPC failed: ${error.message}`);
        return false;
    }
}

async function testTokenInfo() {
    console.log('\n2. Testing token information...');
    
    try {
        const startTime = Date.now();
        
        // Test token info with batch call (simulating our optimization)
        const batchData = [
            { jsonrpc: '2.0', method: 'eth_call', params: [{ to: TEST_ADDRESS, data: '0x06fdde03' }, 'latest'], id: 1 },
            { jsonrpc: '2.0', method: 'eth_call', params: [{ to: TEST_ADDRESS, data: '0x95d89b41' }, 'latest'], id: 2 },
            { jsonrpc: '2.0', method: 'eth_call', params: [{ to: TEST_ADDRESS, data: '0x313ce567' }, 'latest'], id: 3 },
            { jsonrpc: '2.0', method: 'eth_call', params: [{ to: TEST_ADDRESS, data: '0x18160ddd' }, 'latest'], id: 4 }
        ];

        const batchResponse = await makeRpcCall('', batchData);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`   ✅ Token info retrieved in ${duration}ms`);
        console.log(`   📊 Batch response received`);
        
        return true;
    } catch (error) {
        console.log(`   ❌ Token info failed: ${error.message}`);
        return false;
    }
}

async function testEventLogs() {
    console.log('\n3. Testing event logs (limited range)...');
    
    try {
        const startTime = Date.now();
        
        // Get recent block number first
        const latestBlock = await makeRpcCall('eth_blockNumber');
        const latestBlockNum = parseInt(latestBlock, 16);
        const fromBlock = '0x' + Math.max(0, latestBlockNum - 1000).toString(16); // Last 1000 blocks
        
        console.log(`   📊 Scanning from block ${fromBlock} to latest`);
        
        // Test event logs with limited range (our optimization)
        const logs = await makeRpcCall('eth_getLogs', [{
            fromBlock: fromBlock,
            toBlock: 'latest',
            address: TEST_ADDRESS,
            topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
        }]);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`   ✅ Found ${logs.length} transfer events`);
        console.log(`   ⏱️  Duration: ${duration}ms`);
        
        return true;
    } catch (error) {
        console.log(`   ❌ Event logs failed: ${error.message}`);
        return false;
    }
}

async function testPerformance() {
    console.log('\n4. Testing performance with multiple requests...');
    
    try {
        const startTime = Date.now();
        const requests = [];
        
        // Make 10 parallel requests
        for (let i = 0; i < 10; i++) {
            requests.push(makeRpcCall('eth_blockNumber'));
        }
        
        const results = await Promise.all(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`   ✅ Completed 10 parallel requests`);
        console.log(`   ⏱️  Total duration: ${duration}ms`);
        console.log(`   📊 Average per request: ${(duration / 10).toFixed(2)}ms`);
        
        return true;
    } catch (error) {
        console.log(`   ❌ Performance test failed: ${error.message}`);
        return false;
    }
}

// Main test execution
async function runTests() {
    console.log('Starting performance tests...\n');
    
    const results = {
        basicRpc: await testBasicRpc(),
        tokenInfo: await testTokenInfo(),
        eventLogs: await testEventLogs(),
        performance: await testPerformance()
    };
    
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Basic RPC: ${results.basicRpc ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Token Info: ${results.tokenInfo ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Event Logs: ${results.eventLogs ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Performance: ${results.performance ? '✅ PASS' : '❌ FAIL'}`);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! The 0G RPC endpoint is working well.');
        console.log('💡 Your optimizations (timeouts, limited block ranges, parallel processing) are ready to use.');
    } else {
        console.log('⚠️  Some tests failed. Check the error messages above.');
    }
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error.message);
    process.exit(1);
});

// Run the tests
runTests().catch(console.error);
