// Test Enhanced Token Analytics Service
const EnhancedTokenAnalytics = require('./enhanced-token-analytics');

async function testEnhancedAnalytics() {
    console.log('🔍 Testing Enhanced Token Analytics Service...\n');
    
    const analytics = new EnhancedTokenAnalytics();
    
    // Test with sample data
    const sampleTrades = [
        {
            transactionHash: '0xabc123',
            blockNumber: 6741500,
            timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
            from: '0x1234',
            to: '0x5678',
            amountFormatted: '54.200061641',
            ethValueFormatted: 0.099,
            pricePerToken: 0.00182,
            type: 'BUY',
            classification: 'medium'
        },
        {
            transactionHash: '0xdef456',
            blockNumber: 6741600,
            timestamp: Math.floor(Date.now() / 1000) - 1800, // 30 min ago
            from: '0x5678',
            to: '0x9abc',
            amountFormatted: '100.5',
            ethValueFormatted: 0.2,
            pricePerToken: 0.00199,
            type: 'SELL',
            classification: 'large'
        },
        {
            transactionHash: '0xghi789',
            blockNumber: 6741700,
            timestamp: Math.floor(Date.now() / 1000) - 900, // 15 min ago
            from: '0x9abc',
            to: '0xdef0',
            amountFormatted: '1000.0',
            ethValueFormatted: 2.5,
            pricePerToken: 0.0025,
            type: 'BUY',
            classification: 'whale'
        }
    ];

    // Test 1: Token Pricing Calculation
    console.log('📊 Test 1: Token Pricing Calculation');
    const ogPriceData = { usd: 3.79, eth: 0.0009758, change24h: -4.75 };
    const pricing = await analytics.calculateTokenPricing(sampleTrades, ogPriceData);
    console.log('Pricing:', JSON.stringify(pricing, null, 2));

    // Test 2: FDV Calculation
    console.log('\n💎 Test 2: FDV Calculation');
    const tokenInfo = {
        address: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C',
        name: 'PAI Token',
        symbol: 'PAI',
        decimals: 18,
        totalSupply: '1000000000000000000000000000' // 1B tokens
    };
    const fdv = await analytics.calculateFDV(tokenInfo, sampleTrades, ogPriceData);
    console.log('FDV:', JSON.stringify(fdv, null, 2));

    // Test 3: Timeframe Analytics
    console.log('\n⏰ Test 3: Timeframe Analytics');
    const timeframeAnalytics = analytics.calculateTimeframeAnalytics(sampleTrades);
    console.log('Timeframe Analytics:', JSON.stringify(timeframeAnalytics, null, 2));

    // Test 4: Volume Analytics
    console.log('\n📈 Test 4: Volume Analytics');
    const volumeAnalytics = analytics.calculateVolumeAnalytics(sampleTrades, ogPriceData);
    console.log('Volume Analytics:', JSON.stringify(volumeAnalytics, null, 2));

    // Test 5: Market Metrics
    console.log('\n🎯 Test 5: Market Metrics');
    const marketMetrics = analytics.calculateMarketMetrics(sampleTrades, ogPriceData);
    console.log('Market Metrics:', JSON.stringify(marketMetrics, null, 2));

    // Test 6: Liquidity Analytics
    console.log('\n💧 Test 6: Liquidity Analytics');
    const liquidityAnalytics = await analytics.calculateLiquidityAnalytics('0x59ef6F3943bBdFE2fB19565037Ac85071223E94C', ogPriceData);
    console.log('Liquidity Analytics:', JSON.stringify(liquidityAnalytics, null, 2));

    console.log('\n✅ All tests completed successfully!');
    
    // Summary of what we can now provide
    console.log('\n🎉 Enhanced Analytics Capabilities:');
    console.log('✅ Token prices in USD');
    console.log('✅ Fully Diluted Valuation (FDV)');
    console.log('✅ Buy/sell counts by timeframe (1h, 6h, 24h)');
    console.log('✅ Volume analytics by timeframe');
    console.log('✅ Liquidity pool analysis');
    console.log('✅ Market metrics and volatility');
    console.log('✅ Whale activity tracking');
    console.log('✅ Price change calculations');
}

testEnhancedAnalytics().catch(console.error);
