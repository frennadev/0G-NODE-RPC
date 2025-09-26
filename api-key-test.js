// Quick Test: How Customers Use API Keys
console.log('🔑 Testing 0G Analytics API with API Keys\n');

const baseUrl = 'https://zerog-node-rpc.onrender.com';

// Step 1: Create a test API key (you do this in admin panel)
console.log('Step 1: Admin creates API key at /admin');
console.log('Example: test@customer.com gets key: zg_free_abc123...\n');

// Step 2: Customer uses the API key
async function testAPIKey() {
    // Replace with actual API key from your admin panel
    const testApiKey = 'zg_free_test123'; // This will fail - need real key
    
    console.log('Step 2: Customer uses API key in 3 ways:\n');
    
    // Method 1: Header (Recommended)
    console.log('📡 Method 1: X-API-Key Header');
    try {
        const response1 = await fetch(`${baseUrl}/api/price`, {
            headers: {
                'X-API-Key': testApiKey
            }
        });
        const data1 = await response1.json();
        console.log('✅ Success:', data1);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    // Method 2: Bearer Token
    console.log('\n🔐 Method 2: Authorization Bearer');
    try {
        const response2 = await fetch(`${baseUrl}/api/price`, {
            headers: {
                'Authorization': `Bearer ${testApiKey}`
            }
        });
        const data2 = await response2.json();
        console.log('✅ Success:', data2);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    // Method 3: Query Parameter
    console.log('\n🔗 Method 3: Query Parameter');
    try {
        const response3 = await fetch(`${baseUrl}/api/price?apikey=${testApiKey}`);
        const data3 = await response3.json();
        console.log('✅ Success:', data3);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    // Test without API key (should fail)
    console.log('\n❌ Test without API key (should fail):');
    try {
        const response4 = await fetch(`${baseUrl}/api/price`);
        const data4 = await response4.json();
        console.log('Response:', data4);
    } catch (error) {
        console.log('Error:', error.message);
    }
}

// Run the test
testAPIKey().then(() => {
    console.log('\n📋 Summary for Customers:');
    console.log('1. Get API key from you');
    console.log('2. Add key to requests using any method above');
    console.log('3. Access all endpoints: /api/price, /api/analytics/{token}, etc.');
    console.log('4. Monitor usage via rate limit headers');
    console.log('5. Upgrade plan when limits are reached');
}).catch(console.error);
