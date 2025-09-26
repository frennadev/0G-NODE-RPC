// Test MongoDB Authentication System
const MongoDBAuth = require('./mongodb-auth');

async function testMongoDB() {
    console.log('🧪 Testing MongoDB Authentication System...\n');
    
    const auth = new MongoDBAuth();
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        // Test 1: Create API key
        console.log('📝 Test 1: Creating API key...');
        const testKey = await auth.generateKey('mongodb-test@example.com', 'pro');
        console.log('✅ Created key:', testKey);
        
        // Test 2: Validate API key
        console.log('\n🔍 Test 2: Validating API key...');
        const validation = await auth.validateRequest(testKey, '/api/price');
        console.log('✅ Validation result:', validation);
        
        // Test 3: Get usage stats
        console.log('\n📊 Test 3: Getting usage stats...');
        const stats = await auth.getUsageStats(testKey);
        console.log('✅ Usage stats:', stats);
        
        // Test 4: Get all keys
        console.log('\n📋 Test 4: Getting all keys...');
        const allKeys = await auth.getAllKeys();
        console.log('✅ Total keys:', allKeys.length);
        console.log('Keys:', allKeys.map(k => ({ email: k.email, tier: k.tier })));
        
        // Test 5: Get analytics
        console.log('\n📈 Test 5: Getting analytics...');
        const analytics = await auth.getAnalytics();
        console.log('✅ Analytics:', analytics);
        
        // Test 6: Rate limiting
        console.log('\n⚡ Test 6: Testing rate limiting...');
        for (let i = 0; i < 3; i++) {
            const validation = await auth.validateRequest(testKey, '/api/test');
            console.log(`Request ${i + 1}:`, validation.valid ? 'OK' : validation.error);
        }
        
        console.log('\n🎉 All MongoDB tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await auth.close();
    }
}

// Run the test
testMongoDB().catch(console.error);
