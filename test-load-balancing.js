// Test RPC Load Balancing and Helius Integration
const BASE_URL = 'https://zerog-node-rpc.onrender.com';
// const BASE_URL = 'http://localhost:26657'; // For local testing

async function testLoadBalancing() {
    console.log('🧪 Testing RPC Load Balancing with Helius Integration\n');

    // Test 1: Check health endpoint for RPC endpoint stats
    console.log('📊 Test 1: RPC Endpoint Health Check');
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();
        
        console.log('✅ Health Check Response:');
        console.log('🔗 Endpoints:', JSON.stringify(data.endpoints, null, 2));
        console.log('⚖️ Load Balancing:', JSON.stringify(data.rpc_load_balancing, null, 2));
    } catch (error) {
        console.log('❌ Health Check Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Make multiple RPC calls to test load balancing
    console.log('📊 Test 2: Multiple RPC Calls (Load Balancing Test)');
    try {
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(
                fetch(`${BASE_URL}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_blockNumber',
                        params: [],
                        id: i + 1
                    })
                })
            );
        }

        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        console.log('✅ RPC Call Results:');
        results.forEach((result, index) => {
            if (result.result) {
                const blockNumber = parseInt(result.result, 16);
                console.log(`   Call ${index + 1}: Block ${blockNumber}`);
            } else {
                console.log(`   Call ${index + 1}: Error - ${result.error?.message || 'Unknown'}`);
            }
        });
    } catch (error) {
        console.log('❌ RPC Calls Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Test wallet balance (the main use case for Helius)
    console.log('📊 Test 3: Wallet Balance Query (Helius Use Case)');
    try {
        const testWallet = '0x742d35Cc6634C0532925a3b8D0C9e3e1d2b8e8e8'; // Example wallet
        
        const response = await fetch(`${BASE_URL}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [testWallet, 'latest'],
                id: 1
            })
        });

        const data = await response.json();
        
        if (data.result) {
            const balance = parseInt(data.result, 16) / Math.pow(10, 18);
            console.log(`✅ Wallet Balance: ${balance.toFixed(6)} ETH`);
        } else {
            console.log(`❌ Balance Query Error: ${data.error?.message || 'Unknown'}`);
        }
    } catch (error) {
        console.log('❌ Wallet Balance Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Stress test to trigger rate limiting and failover
    console.log('📊 Test 4: Rate Limiting Stress Test');
    try {
        console.log('🚀 Sending 50 rapid requests to test rate limiting...');
        
        const startTime = Date.now();
        const promises = [];
        
        for (let i = 0; i < 50; i++) {
            promises.push(
                fetch(`${BASE_URL}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_blockNumber',
                        params: [],
                        id: i + 1
                    })
                }).then(r => r.json()).catch(e => ({ error: { message: e.message } }))
            );
        }

        const results = await Promise.all(promises);
        const endTime = Date.now();
        
        const successful = results.filter(r => r.result).length;
        const failed = results.filter(r => r.error).length;
        
        console.log(`✅ Stress Test Results:`);
        console.log(`   📈 Successful: ${successful}/50`);
        console.log(`   ❌ Failed: ${failed}/50`);
        console.log(`   ⏱️ Total Time: ${endTime - startTime}ms`);
        console.log(`   🔄 Avg per request: ${((endTime - startTime) / 50).toFixed(2)}ms`);
        
        // Show some error examples
        const errors = results.filter(r => r.error).slice(0, 3);
        if (errors.length > 0) {
            console.log(`   🔍 Sample Errors:`);
            errors.forEach((error, index) => {
                console.log(`     ${index + 1}. ${error.error.message}`);
            });
        }
    } catch (error) {
        console.log('❌ Stress Test Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: Check health again to see endpoint status after stress test
    console.log('📊 Test 5: Post-Stress Health Check');
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();
        
        console.log('✅ Post-Stress RPC Endpoint Status:');
        if (data.rpc_load_balancing && data.rpc_load_balancing.endpoints) {
            data.rpc_load_balancing.endpoints.forEach(endpoint => {
                console.log(`   ${endpoint.name}: ${endpoint.status} (${endpoint.failures} failures)`);
            });
        }
    } catch (error) {
        console.log('❌ Post-Stress Health Check Error:', error.message);
    }
}

// Run the tests
testLoadBalancing().catch(console.error);
