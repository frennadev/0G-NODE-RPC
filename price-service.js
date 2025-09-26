// 0G Chain Price Service - USD Price Feeds
// Using Node.js built-in fetch

class PriceService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
        this.priceApis = [
            {
                name: 'CoinGecko',
                url: 'https://api.coingecko.com/api/v3/simple/price?ids=zero-gravity&vs_currencies=usd,eth&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true',
                parser: (data) => {
                    const ogData = data['zero-gravity'];
                    return ogData ? {
                        usd: ogData.usd,
                        eth: ogData.eth,
                        change24h: ogData.usd_24h_change,
                        marketCap: ogData.usd_market_cap,
                        volume24h: ogData.usd_24h_vol
                    } : null;
                }
            }
        ];
    }

    // Get 0G price in USD from multiple sources
    async get0GPrice() {
        const cacheKey = '0g_usd_price';
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.price;
        }

        let priceData = null;
        let source = null;

        // Try each API in order
        for (const api of this.priceApis) {
            try {
                const options = {
                    method: 'GET',
                    headers: {
                        'User-Agent': '0G-Node-RPC/1.0',
                        ...api.headers
                    }
                };

                const response = await fetch(api.url, options);
                const data = await response.json();
                
                priceData = api.parser(data);
                
                if (priceData && priceData.usd && priceData.usd > 0) {
                    source = api.name;
                    break;
                }
            } catch (error) {
                console.log(`❌ ${api.name} failed:`, error.message);
                continue;
            }
        }

        if (priceData) {
            this.cache.set(cacheKey, {
                price: priceData,
                source: source,
                timestamp: Date.now()
            });
        }

        return priceData;
    }

    // Derive 0G price from DEX trading pairs (fallback method)
    async derive0GPriceFromDEX() {
        try {
            // Look for 0G/USDT or 0G/USDC pairs on DEXes
            // This would require finding major trading pairs and calculating
            console.log('🔄 Attempting to derive 0G price from DEX data...');
            
            // Placeholder - would need to implement DEX price aggregation
            // Could use Uniswap V3, SushiSwap, or other DEX APIs
            
            return null; // Not implemented yet
        } catch (error) {
            console.log('❌ DEX price derivation failed:', error.message);
            return null;
        }
    }

    // Convert 0G amount to USD
    async convertToUSD(ogAmount) {
        const priceData = await this.get0GPrice();
        if (!priceData || !priceData.usd) return null;
        
        return ogAmount * priceData.usd;
    }

    // Enhanced trade data with USD values
    async enhanceTradeWithUSD(trade) {
        const priceData = await this.get0GPrice();
        if (!priceData || !priceData.usd) return trade;

        return {
            ...trade,
            usdValue: trade.ethValueFormatted * priceData.usd,
            pricePerTokenUSD: trade.pricePerToken * priceData.usd,
            ogPriceUSD: priceData.usd,
            ogChange24h: priceData.change24h,
            priceSource: this.cache.get('0g_usd_price')?.source || 'unknown'
        };
    }

    // Get price info endpoint
    async getPriceInfo() {
        const priceData = await this.get0GPrice();
        const cached = this.cache.get('0g_usd_price');
        
        return {
            ...priceData,
            source: cached?.source || 'unavailable',
            lastUpdated: cached?.timestamp || null,
            cacheAge: cached ? Date.now() - cached.timestamp : null
        };
    }
}

module.exports = PriceService;
