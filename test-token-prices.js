// Test Token Price Endpoints
const BASE_URL = 'https://zerog-node-rpc.onrender.com';
// const BASE_URL = 'http://localhost:26657'; // For local testing

async function testTokenPrices() {
    console.log('🧪 Testing Token Price Endpoints\n');

    // Test 1: Get single token price (USDT on Ethereum)
    console.log('📊 Test 1: Single Token Price (USDT)');
    try {
        const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT on Ethereum
        const response = await fetch(`${BASE_URL}/api/token-price/${usdtAddress}?symbol=USDT`);
        const data = await response.json();
        
        console.log('✅ USDT Price Response:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('❌ USDT Price Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Get token price with 0G conversion
    console.log('📊 Test 2: Token Price with 0G Conversion');
    try {
        const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH on Ethereum
        const response = await fetch(`${BASE_URL}/api/token-price/${wethAddress}?symbol=WETH&include0g=true`);
        const data = await response.json();
        
        console.log('✅ WETH Price with 0G Conversion:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('❌ WETH Price Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Multiple token prices
    console.log('📊 Test 3: Multiple Token Prices');
    try {
        const tokens = [
            { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT' },
            { address: '0xA0b86a33E6441c8C5B07b4b1b3e4c2b8e4c2e5b2', symbol: 'USDC' },
            { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH' }
        ];

        const response = await fetch(`${BASE_URL}/api/token-prices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tokens })
        });
        
        const data = await response.json();
        
        console.log('✅ Multiple Token Prices Response:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('❌ Multiple Token Prices Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Invalid token address
    console.log('📊 Test 4: Invalid Token Address');
    try {
        const invalidAddress = '0xinvalid';
        const response = await fetch(`${BASE_URL}/api/token-price/${invalidAddress}`);
        const data = await response.json();
        
        console.log('✅ Invalid Token Response:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('❌ Invalid Token Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: Test with API key (if available)
    console.log('📊 Test 5: With API Key Authentication');
    try {
        const apiKey = 'your-api-key-here'; // Replace with actual API key
        const response = await fetch(`${BASE_URL}/api/token-price/0xdAC17F958D2ee523a2206206994597C13D831ec7`, {
            headers: {
                'X-API-Key': apiKey
            }
        });
        const data = await response.json();
        
        console.log('✅ API Key Authentication Response:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('❌ API Key Authentication Error:', error.message);
    }
}

// Run the tests
testTokenPrices().catch(console.error);
