// Token Price Service - Get USD prices for any token
class TokenPriceService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes cache for token prices
        
        // Price sources in order of preference
        this.priceSources = [
            {
                name: 'CoinGecko',
                getPrice: this.getCoinGeckoPrice.bind(this)
            },
            {
                name: 'DEX_Aggregator',
                getPrice: this.getDEXPrice.bind(this)
            }
        ];
    }

    // Main method to get token price
    async getTokenPrice(tokenAddress, tokenSymbol = null) {
        const cacheKey = `token_price_${tokenAddress.toLowerCase()}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        let priceData = null;
        let source = null;

        // Try each price source
        for (const priceSource of this.priceSources) {
            try {
                console.log(`🔍 Fetching ${tokenAddress} price from ${priceSource.name}...`);
                priceData = await priceSource.getPrice(tokenAddress, tokenSymbol);
                
                if (priceData && priceData.usd && priceData.usd > 0) {
                    source = priceSource.name;
                    break;
                }
            } catch (error) {
                console.log(`❌ ${priceSource.name} failed:`, error.message);
                continue;
            }
        }

        // If no price found, try to derive from on-chain data
        if (!priceData) {
            priceData = await this.deriveTokenPrice(tokenAddress);
            source = 'OnChain_Derived';
        }

        if (priceData) {
            this.cache.set(cacheKey, {
                data: {
                    ...priceData,
                    source: source,
                    lastUpdated: Date.now()
                },
                timestamp: Date.now()
            });
        }

        return priceData ? { ...priceData, source, lastUpdated: Date.now() } : null;
    }

    // CoinGecko price fetching
    async getCoinGeckoPrice(tokenAddress, tokenSymbol) {
        try {
            // First try by contract address
            let url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
            
            let response = await fetch(url);
            let data = await response.json();
            
            // Check if we got data by contract address
            const addressData = data[tokenAddress.toLowerCase()];
            if (addressData && addressData.usd) {
                return {
                    usd: addressData.usd,
                    change24h: addressData.usd_24h_change,
                    marketCap: addressData.usd_market_cap,
                    volume24h: addressData.usd_24h_vol
                };
            }

            // If contract address fails, try by symbol search
            if (tokenSymbol) {
                const searchUrl = `https://api.coingecko.com/api/v3/search?query=${tokenSymbol}`;
                const searchResponse = await fetch(searchUrl);
                const searchData = await searchResponse.json();
                
                if (searchData.coins && searchData.coins.length > 0) {
                    const coinId = searchData.coins[0].id;
                    const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
                    
                    const priceResponse = await fetch(priceUrl);
                    const priceData = await priceResponse.json();
                    
                    if (priceData[coinId]) {
                        return {
                            usd: priceData[coinId].usd,
                            change24h: priceData[coinId].usd_24h_change,
                            marketCap: priceData[coinId].usd_market_cap,
                            volume24h: priceData[coinId].usd_24h_vol
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('CoinGecko price fetch error:', error);
            return null;
        }
    }

    // DEX price aggregation (simplified)
    async getDEXPrice(tokenAddress, tokenSymbol) {
        try {
            // This would integrate with DEX aggregators like 1inch, 0x, etc.
            // For now, we'll return null to fall back to on-chain derivation
            return null;
        } catch (error) {
            console.error('DEX price fetch error:', error);
            return null;
        }
    }

    // Derive token price from on-chain trading data
    async deriveTokenPrice(tokenAddress) {
        try {
            // This would analyze recent trades to derive price
            // For now, return null - could be enhanced with your existing trade data
            console.log(`🔄 Attempting to derive price for ${tokenAddress} from on-chain data...`);
            return null;
        } catch (error) {
            console.error('On-chain price derivation error:', error);
            return null;
        }
    }

    // Get multiple token prices at once
    async getMultipleTokenPrices(tokens) {
        const promises = tokens.map(async (token) => {
            const address = typeof token === 'string' ? token : token.address;
            const symbol = typeof token === 'object' ? token.symbol : null;
            
            try {
                const price = await this.getTokenPrice(address, symbol);
                return {
                    address: address,
                    symbol: symbol,
                    success: !!price,
                    price: price
                };
            } catch (error) {
                return {
                    address: address,
                    symbol: symbol,
                    success: false,
                    error: error.message
                };
            }
        });

        return await Promise.all(promises);
    }

    // Enhanced method that includes 0G conversion
    async getTokenPriceWithOGConversion(tokenAddress, tokenSymbol = null) {
        const [tokenPrice, ogPrice] = await Promise.all([
            this.getTokenPrice(tokenAddress, tokenSymbol),
            this.get0GPrice()
        ]);

        if (!tokenPrice || !ogPrice) {
            return tokenPrice;
        }

        return {
            ...tokenPrice,
            priceIn0G: tokenPrice.usd / ogPrice.usd,
            ogPrice: ogPrice.usd
        };
    }

    // Get 0G price (reuse existing logic)
    async get0GPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=zero-gravity&vs_currencies=usd&include_24hr_change=true');
            const data = await response.json();
            
            if (data['zero-gravity']) {
                return {
                    usd: data['zero-gravity'].usd,
                    change24h: data['zero-gravity'].usd_24h_change
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching 0G price:', error);
            return null;
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache stats
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

module.exports = TokenPriceService;
