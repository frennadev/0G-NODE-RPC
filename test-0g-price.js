// Test actual 0G price from CoinGecko
async function get0GPrice() {
    console.log('🔍 Getting 0G Token Price from CoinGecko...\n');

    try {
        // Test the correct CoinGecko ID: zero-gravity
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=zero-gravity&vs_currencies=usd,eth&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true');
        const data = await response.json();
        
        console.log('📊 Raw API Response:', JSON.stringify(data, null, 2));
        
        if (data['zero-gravity']) {
            const ogData = data['zero-gravity'];
            console.log('\n✅ 0G Token Price Data:');
            console.log(`💰 Price: $${ogData.usd}`);
            console.log(`🔗 ETH Price: ${ogData.eth} ETH`);
            console.log(`📈 24h Change: ${ogData.usd_24h_change?.toFixed(2)}%`);
            console.log(`💎 Market Cap: $${ogData.usd_market_cap?.toLocaleString()}`);
            console.log(`📊 24h Volume: $${ogData.usd_24h_vol?.toLocaleString()}`);
            
            return ogData.usd;
        } else {
            console.log('❌ No price data found');
            return null;
        }
        
    } catch (error) {
        console.log('❌ Error fetching price:', error.message);
        return null;
    }
}

// Test conversion examples
async function testConversions() {
    const ogPrice = await get0GPrice();
    
    if (ogPrice) {
        console.log('\n🧮 Example Conversions:');
        console.log(`1 0G = $${ogPrice}`);
        console.log(`10 0G = $${(10 * ogPrice).toFixed(4)}`);
        console.log(`100 0G = $${(100 * ogPrice).toFixed(2)}`);
        console.log(`0.1 0G = $${(0.1 * ogPrice).toFixed(6)}`);
        
        // Example trade conversion
        const exampleTrade = {
            tokenAmount: 54.2,
            ogSpent: 0.099,
            pricePerToken: 0.00182
        };
        
        console.log('\n💹 Example Trade in USD:');
        console.log(`Token Amount: ${exampleTrade.tokenAmount} PAI`);
        console.log(`0G Spent: ${exampleTrade.ogSpent} 0G = $${(exampleTrade.ogSpent * ogPrice).toFixed(6)}`);
        console.log(`Price per Token: ${exampleTrade.pricePerToken} 0G = $${(exampleTrade.pricePerToken * ogPrice).toFixed(8)}`);
    }
}

// Run tests
get0GPrice().then(() => testConversions()).catch(console.error);
