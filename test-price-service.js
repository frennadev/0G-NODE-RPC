// Test 0G Price Service - Check Available Data Sources
// Using Node.js built-in fetch (Node 18+)

async function test0GPriceSources() {
    console.log('🔍 Testing 0G Token Price Data Sources...\n');

    const testSources = [
        {
            name: 'CoinGecko - 0g-chain',
            url: 'https://api.coingecko.com/api/v3/simple/price?ids=0g-chain&vs_currencies=usd',
            test: async (url) => {
                const response = await fetch(url);
                const data = await response.json();
                return data['0g-chain']?.usd;
            }
        },
        {
            name: 'CoinGecko - 0g',
            url: 'https://api.coingecko.com/api/v3/simple/price?ids=0g&vs_currencies=usd',
            test: async (url) => {
                const response = await fetch(url);
                const data = await response.json();
                return data['0g']?.usd;
            }
        },
        {
            name: 'CoinGecko - Search for 0G',
            url: 'https://api.coingecko.com/api/v3/search?query=0G',
            test: async (url) => {
                const response = await fetch(url);
                const data = await response.json();
                console.log('   Search results:', data.coins?.slice(0, 3).map(c => `${c.name} (${c.id})`));
                return data.coins?.length > 0 ? 'found_coins' : null;
            }
        },
        {
            name: 'CoinGecko - List coins with 0G',
            url: 'https://api.coingecko.com/api/v3/coins/list',
            test: async (url) => {
                const response = await fetch(url);
                const data = await response.json();
                const ogCoins = data.filter(coin => 
                    coin.name.toLowerCase().includes('0g') || 
                    coin.symbol.toLowerCase() === '0g' ||
                    coin.id.includes('0g')
                );
                console.log('   Found 0G-related coins:', ogCoins.slice(0, 5).map(c => `${c.name} (${c.id})`));
                return ogCoins.length > 0 ? ogCoins : null;
            }
        },
        {
            name: 'Pyth Network - Price Feed List',
            url: 'https://hermes.pyth.network/api/price_feed_ids',
            test: async (url) => {
                const response = await fetch(url);
                const data = await response.json();
                const ogFeeds = data.filter(feed => 
                    feed.toLowerCase().includes('0g') || 
                    feed.toLowerCase().includes('zerog')
                );
                console.log('   0G-related feeds:', ogFeeds.slice(0, 3));
                return ogFeeds.length > 0 ? ogFeeds : null;
            }
        }
    ];

    for (const source of testSources) {
        try {
            console.log(`📡 Testing ${source.name}...`);
            
            const result = await source.test(source.url);
            
            if (result && typeof result === 'number') {
                console.log(`✅ SUCCESS: $${result}`);
            } else if (result) {
                console.log(`✅ Data found:`, typeof result === 'object' ? 'See above' : result);
            } else {
                console.log(`❌ No data found`);
            }
            
        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
    }

    // Test our current 0G RPC for any price-related data
    console.log('🔍 Testing 0G Chain RPC for price data...');
    try {
        const rpcResponse = await fetch('https://zerog-node-rpc.onrender.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
            })
        });
        const rpcData = await rpcResponse.json();
        console.log(`✅ 0G RPC working - Latest block: ${parseInt(rpcData.result, 16)}`);
    } catch (error) {
        console.log(`❌ 0G RPC error: ${error.message}`);
    }

    console.log('\n🎯 Summary: Testing complete. Check results above for available price sources.');
}

// Run the test
test0GPriceSources().catch(console.error);
