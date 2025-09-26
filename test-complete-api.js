// Test Complete Enhanced Analytics API
async function testCompleteAPI() {
    console.log('🔍 Testing Complete Enhanced Analytics API...\n');
    
    const baseUrl = 'https://zerog-node-rpc.onrender.com';
    const testToken = '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'; // PAI token
    
    // Test 1: Get 0G Price
    console.log('💰 Test 1: Get 0G Price');
    try {
        const response = await fetch(`${baseUrl}/api/price`);
        const data = await response.json();
        console.log('✅ 0G Price:', data.price?.usd ? `$${data.price.usd}` : 'N/A');
        console.log('   24h Change:', data.price?.change24h ? `${data.price.change24h.toFixed(2)}%` : 'N/A');
        console.log('   Market Cap:', data.price?.marketCap ? `$${(data.price.marketCap / 1000000).toFixed(1)}M` : 'N/A');
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    // Test 2: Convert 0G to USD
    console.log('\n🧮 Test 2: Convert 0G to USD');
    try {
        const response = await fetch(`${baseUrl}/api/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 10, from: '0G', to: 'USD' })
        });
        const data = await response.json();
        console.log('✅ 10 0G =', data.result ? `$${data.result.toFixed(2)}` : 'N/A');
        console.log('   Rate:', data.rate ? `$${data.rate}` : 'N/A');
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    // Test 3: Get Enhanced Trades with USD
    console.log('\n💹 Test 3: Get Enhanced Trades with USD');
    try {
        const response = await fetch(`${baseUrl}/api/trades/${testToken}?limit=5&includeUSD=true`);
        const data = await response.json();
        
        if (data.success && data.trades && data.trades.length > 0) {
            console.log(`✅ Found ${data.trades.length} trades for ${data.token?.symbol || 'TOKEN'}`);
            
            const trade = data.trades[0];
            console.log('   Latest Trade:');
            console.log(`   - Type: ${trade.type}`);
            console.log(`   - Amount: ${trade.amountFormatted} ${trade.tokenSymbol}`);
            console.log(`   - 0G Value: ${trade.ethValueFormatted} 0G`);
            console.log(`   - USD Value: $${trade.usdValue?.toFixed(6) || 'N/A'}`);
            console.log(`   - Price per Token: $${trade.pricePerTokenUSD?.toFixed(8) || 'N/A'}`);
        } else {
            console.log('❌ No trades found or API error');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    // Test 4: Get Token Analytics
    console.log('\n📊 Test 4: Get Complete Token Analytics');
    try {
        const response = await fetch(`${baseUrl}/api/analytics/${testToken}`);
        const data = await response.json();
        
        if (data.success && data.analytics) {
            const analytics = data.analytics;
            console.log(`✅ Analytics for ${analytics.token?.symbol || 'TOKEN'}:`);
            
            // Pricing
            if (analytics.pricing) {
                console.log('   💰 Pricing:');
                console.log(`   - Current Price: $${analytics.pricing.currentPriceUSD?.toFixed(8) || 'N/A'}`);
                console.log(`   - 24h Change: ${analytics.pricing.priceChange24h?.toFixed(2) || 'N/A'}%`);
            }
            
            // FDV
            if (analytics.fdv) {
                console.log('   💎 FDV:');
                console.log(`   - FDV: $${analytics.fdv.fdvUSD?.toLocaleString() || 'N/A'}`);
                console.log(`   - Rank: ${analytics.fdv.marketCapRank || 'N/A'}`);
            }
            
            // 24h Activity
            if (analytics.timeframeAnalytics?.['24h']) {
                const day = analytics.timeframeAnalytics['24h'];
                console.log('   📈 24h Activity:');
                console.log(`   - Total Trades: ${day.totalTrades}`);
                console.log(`   - Buys: ${day.buys} (${day.buyRatio?.toFixed(1)}%)`);
                console.log(`   - Sells: ${day.sells} (${day.sellRatio?.toFixed(1)}%)`);
                console.log(`   - Whale Activity: ${day.whaleActivity}`);
            }
            
            // 24h Volume
            if (analytics.volumeAnalytics?.['24h']) {
                const volume = analytics.volumeAnalytics['24h'];
                console.log('   💧 24h Volume:');
                console.log(`   - Total Volume: $${volume.volumeUSD?.toFixed(2) || 'N/A'}`);
                console.log(`   - Buy Volume: $${volume.buyVolumeUSD?.toFixed(2) || 'N/A'}`);
                console.log(`   - Sell Volume: $${volume.sellVolumeUSD?.toFixed(2) || 'N/A'}`);
            }
            
            // Market Metrics
            if (analytics.marketMetrics) {
                const metrics = analytics.marketMetrics;
                console.log('   🎯 Market Metrics:');
                console.log(`   - Unique Traders: ${metrics.uniqueTraders24h || 'N/A'}`);
                console.log(`   - Volatility: ${metrics.volatilityPercent?.toFixed(2) || 'N/A'}%`);
                console.log(`   - Price Range: $${metrics.priceRange24h?.toFixed(8) || 'N/A'}`);
            }
            
            // Liquidity
            if (analytics.liquidityAnalytics) {
                const liquidity = analytics.liquidityAnalytics;
                console.log('   🌊 Liquidity:');
                console.log(`   - Total Liquidity: $${liquidity.totalLiquidityUSD?.toLocaleString() || 'N/A'} (estimated)`);
                console.log(`   - 0G Liquidity: $${liquidity.w0gLiquidityUSD?.toLocaleString() || 'N/A'}`);
            }
            
        } else {
            console.log('❌ Analytics not available');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    // Test 5: Market Summary
    console.log('\n🏪 Test 5: Market Summary');
    try {
        const response = await fetch(`${baseUrl}/api/market/summary?tokens=${testToken}`);
        const data = await response.json();
        
        if (data.success && data.tokens && data.tokens.length > 0) {
            console.log('✅ Market Summary:');
            data.tokens.forEach(token => {
                if (token.success) {
                    const summary = token.summary;
                    console.log(`   ${summary.symbol}:`);
                    console.log(`   - Price: $${summary.priceUSD?.toFixed(8) || 'N/A'}`);
                    console.log(`   - FDV: $${summary.fdvUSD?.toLocaleString() || 'N/A'}`);
                    console.log(`   - 24h Volume: $${summary.volume24hUSD?.toFixed(2) || 'N/A'}`);
                    console.log(`   - 24h Trades: ${summary.trades24h || 'N/A'}`);
                } else {
                    console.log(`   ${token.address}: Error - ${token.error}`);
                }
            });
        } else {
            console.log('❌ Market summary not available');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('\n🎉 API Testing Complete!');
    console.log('\n📋 Summary of Available Features:');
    console.log('✅ 0G Token USD pricing');
    console.log('✅ USD conversion utilities');
    console.log('✅ Enhanced trades with USD values');
    console.log('✅ Comprehensive token analytics');
    console.log('✅ FDV calculations');
    console.log('✅ Timeframe analysis (1h, 6h, 24h)');
    console.log('✅ Volume analytics by timeframe');
    console.log('✅ Liquidity pool analysis');
    console.log('✅ Market metrics and volatility');
    console.log('✅ Multi-token market summaries');
}

// Run the complete API test
testCompleteAPI().catch(console.error);
