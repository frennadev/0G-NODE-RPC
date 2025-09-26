// Test Complete Price Service
const PriceService = require('./price-service');

async function testPriceService() {
    console.log('🔍 Testing Complete 0G Price Service...\n');
    
    const priceService = new PriceService();
    
    // Test 1: Get basic price info
    console.log('📊 Test 1: Get 0G Price Info');
    const priceInfo = await priceService.getPriceInfo();
    console.log('Price Info:', JSON.stringify(priceInfo, null, 2));
    
    // Test 2: Convert 0G amounts to USD
    console.log('\n💰 Test 2: Convert 0G to USD');
    const testAmounts = [0.1, 1, 10, 100];
    for (const amount of testAmounts) {
        const usdValue = await priceService.convertToUSD(amount);
        console.log(`${amount} 0G = $${usdValue?.toFixed(6) || 'N/A'}`);
    }
    
    // Test 3: Enhance trade data with USD
    console.log('\n💹 Test 3: Enhance Trade with USD');
    const sampleTrade = {
        transactionHash: '0xabc123...',
        blockNumber: 6741500,
        timestamp: 1727140923,
        from: '0x1234...',
        to: '0x5678...',
        amount: '54200061641000000000',
        amountFormatted: '54.200061641',
        ethValue: '99000000000000000',
        ethValueFormatted: 0.099,
        totalCost: 0.099,
        pricePerToken: 0.0018265661883511734,
        type: 'BUY',
        classification: 'medium',
        tokenSymbol: 'PAI'
    };
    
    const enhancedTrade = await priceService.enhanceTradeWithUSD(sampleTrade);
    console.log('Enhanced Trade:', JSON.stringify(enhancedTrade, null, 2));
    
    // Test 4: Cache functionality
    console.log('\n⚡ Test 4: Cache Performance');
    const start = Date.now();
    await priceService.get0GPrice(); // Should use cache
    const cacheTime = Date.now() - start;
    console.log(`Cache lookup time: ${cacheTime}ms`);
}

testPriceService().catch(console.error);
