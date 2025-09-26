// Enhanced Token Analytics Service - USD Pricing, FDV, Timeframes, Liquidity
const PriceService = require('./price-service');

class EnhancedTokenAnalytics {
    constructor() {
        this.priceService = new PriceService();
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes cache for analytics
        
        // Time constants
        this.timeframes = {
            '1h': 3600000,    // 1 hour in ms
            '6h': 21600000,   // 6 hours in ms
            '24h': 86400000   // 24 hours in ms
        };
        
        // Known DEX patterns for liquidity detection
        this.dexPatterns = {
            uniswapV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
            // Add more DEX routers as needed
        };
    }

    // Get comprehensive token analytics
    async getTokenAnalytics(tokenAddress, includeHistorical = true) {
        const cacheKey = `analytics_${tokenAddress}_${includeHistorical}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            console.log(`📊 Generating comprehensive analytics for ${tokenAddress}...`);
            
            // Get basic token info and recent trades
            const [tokenInfo, recentTrades, ogPriceData] = await Promise.all([
                this.getTokenInfo(tokenAddress),
                this.getRecentTrades(tokenAddress, 1000), // Get more trades for better analytics
                this.priceService.get0GPrice()
            ]);

            if (!tokenInfo || !ogPriceData) {
                throw new Error('Failed to get token info or 0G price');
            }

            // Calculate all analytics
            const analytics = {
                token: tokenInfo,
                pricing: await this.calculateTokenPricing(recentTrades, ogPriceData),
                fdv: await this.calculateFDV(tokenInfo, recentTrades, ogPriceData),
                timeframeAnalytics: this.calculateTimeframeAnalytics(recentTrades),
                volumeAnalytics: this.calculateVolumeAnalytics(recentTrades, ogPriceData),
                liquidityAnalytics: await this.calculateLiquidityAnalytics(tokenAddress, ogPriceData),
                marketMetrics: this.calculateMarketMetrics(recentTrades, ogPriceData),
                lastUpdated: Date.now(),
                dataSource: '0G Chain + CoinGecko'
            };

            // Cache the results
            this.cache.set(cacheKey, {
                data: analytics,
                timestamp: Date.now()
            });

            return analytics;

        } catch (error) {
            console.error('Error generating token analytics:', error);
            throw error;
        }
    }

    // Calculate token pricing in USD
    async calculateTokenPricing(trades, ogPriceData) {
        if (!trades || trades.length === 0) {
            return {
                currentPriceUSD: null,
                priceIn0G: null,
                priceChange24h: null,
                error: 'No trade data available'
            };
        }

        // Get latest trade for current price
        const latestTrade = trades[0];
        const currentPriceIn0G = latestTrade.pricePerToken || 0;
        const currentPriceUSD = currentPriceIn0G * ogPriceData.usd;

        // Calculate 24h price change
        const now = Date.now();
        const oneDayAgo = now - this.timeframes['24h'];
        const oldTrades = trades.filter(t => t.timestamp * 1000 < oneDayAgo);
        
        let priceChange24h = null;
        if (oldTrades.length > 0) {
            const oldPrice = oldTrades[oldTrades.length - 1].pricePerToken || 0;
            const oldPriceUSD = oldPrice * ogPriceData.usd;
            if (oldPriceUSD > 0) {
                priceChange24h = ((currentPriceUSD - oldPriceUSD) / oldPriceUSD) * 100;
            }
        }

        return {
            currentPriceUSD: currentPriceUSD,
            priceIn0G: currentPriceIn0G,
            priceChange24h: priceChange24h,
            ogPriceUSD: ogPriceData.usd,
            lastTradeTime: latestTrade.timestamp
        };
    }

    // Calculate Fully Diluted Valuation (FDV)
    async calculateFDV(tokenInfo, trades, ogPriceData) {
        if (!trades || trades.length === 0 || !tokenInfo.totalSupply) {
            return {
                fdvUSD: null,
                fdv0G: null,
                error: 'Insufficient data for FDV calculation'
            };
        }

        const latestTrade = trades[0];
        const currentPriceIn0G = latestTrade.pricePerToken || 0;
        const currentPriceUSD = currentPriceIn0G * ogPriceData.usd;
        
        // Convert total supply to decimal format
        const totalSupplyDecimal = parseInt(tokenInfo.totalSupply) / Math.pow(10, tokenInfo.decimals);
        
        const fdv0G = totalSupplyDecimal * currentPriceIn0G;
        const fdvUSD = totalSupplyDecimal * currentPriceUSD;

        return {
            fdvUSD: fdvUSD,
            fdv0G: fdv0G,
            totalSupply: totalSupplyDecimal,
            currentPrice: currentPriceUSD,
            marketCapRank: this.estimateMarketCapRank(fdvUSD)
        };
    }

    // Calculate buy/sell counts by timeframe
    calculateTimeframeAnalytics(trades) {
        const now = Date.now();
        const analytics = {};

        for (const [period, duration] of Object.entries(this.timeframes)) {
            const cutoffTime = now - duration;
            const periodTrades = trades.filter(t => t.timestamp * 1000 >= cutoffTime);
            
            const buys = periodTrades.filter(t => t.type === 'BUY' || t.type === 'buy');
            const sells = periodTrades.filter(t => t.type === 'SELL' || t.type === 'sell');
            const transfers = periodTrades.filter(t => t.type === 'transfer');
            
            analytics[period] = {
                totalTrades: periodTrades.length,
                buys: buys.length,
                sells: sells.length,
                transfers: transfers.length,
                buyRatio: periodTrades.length > 0 ? (buys.length / periodTrades.length) * 100 : 0,
                sellRatio: periodTrades.length > 0 ? (sells.length / periodTrades.length) * 100 : 0,
                whaleActivity: periodTrades.filter(t => t.classification === 'whale').length,
                largeActivity: periodTrades.filter(t => t.classification === 'large').length
            };
        }

        return analytics;
    }

    // Calculate volume by timeframe
    calculateVolumeAnalytics(trades, ogPriceData) {
        const now = Date.now();
        const analytics = {};

        for (const [period, duration] of Object.entries(this.timeframes)) {
            const cutoffTime = now - duration;
            const periodTrades = trades.filter(t => t.timestamp * 1000 >= cutoffTime);
            
            let volume0G = 0;
            let buyVolume0G = 0;
            let sellVolume0G = 0;
            let tokenVolume = 0;

            periodTrades.forEach(trade => {
                const tradeValue = trade.ethValueFormatted || 0;
                const tokenAmount = parseFloat(trade.amountFormatted) || 0;
                
                volume0G += tradeValue;
                tokenVolume += tokenAmount;
                
                if (trade.type === 'BUY' || trade.type === 'buy') {
                    buyVolume0G += tradeValue;
                } else if (trade.type === 'SELL' || trade.type === 'sell') {
                    sellVolume0G += tradeValue;
                }
            });

            const volumeUSD = volume0G * ogPriceData.usd;
            const buyVolumeUSD = buyVolume0G * ogPriceData.usd;
            const sellVolumeUSD = sellVolume0G * ogPriceData.usd;

            analytics[period] = {
                volume0G: volume0G,
                volumeUSD: volumeUSD,
                buyVolume0G: buyVolume0G,
                buyVolumeUSD: buyVolumeUSD,
                sellVolume0G: sellVolume0G,
                sellVolumeUSD: sellVolumeUSD,
                tokenVolume: tokenVolume,
                avgTradeSize0G: periodTrades.length > 0 ? volume0G / periodTrades.length : 0,
                avgTradeSizeUSD: periodTrades.length > 0 ? volumeUSD / periodTrades.length : 0
            };
        }

        return analytics;
    }

    // Calculate liquidity analytics (DEX pools)
    async calculateLiquidityAnalytics(tokenAddress, ogPriceData) {
        try {
            // This would need to be enhanced to detect actual DEX pairs
            // For now, we'll estimate based on large holder addresses and trading patterns
            
            console.log(`🔍 Analyzing liquidity for ${tokenAddress}...`);
            
            // Get large transfers that might indicate liquidity operations
            const liquidityEstimate = await this.estimateLiquidityFromTrades(tokenAddress, ogPriceData);
            
            return {
                estimated: true,
                totalLiquidityUSD: liquidityEstimate.totalUSD,
                w0gLiquidityUSD: liquidityEstimate.w0gUSD,
                quoteLiquidityUSD: liquidityEstimate.quoteUSD,
                liquidityRatio: liquidityEstimate.ratio,
                majorPairs: liquidityEstimate.pairs,
                lastUpdated: Date.now(),
                note: 'Estimated from trading patterns - actual DEX integration needed for precise data'
            };
            
        } catch (error) {
            console.error('Error calculating liquidity:', error);
            return {
                error: 'Unable to calculate liquidity',
                totalLiquidityUSD: null,
                w0gLiquidityUSD: null,
                quoteLiquidityUSD: null
            };
        }
    }

    // Estimate liquidity from trading patterns
    async estimateLiquidityFromTrades(tokenAddress, ogPriceData) {
        // This is a simplified estimation - would need actual DEX integration for accuracy
        const recentTrades = await this.getRecentTrades(tokenAddress, 100);
        
        if (!recentTrades || recentTrades.length === 0) {
            return {
                totalUSD: 0,
                w0gUSD: 0,
                quoteUSD: 0,
                ratio: 0,
                pairs: []
            };
        }

        // Estimate based on largest trades (likely from liquidity pools)
        const largeTrades = recentTrades
            .filter(t => t.classification === 'whale' || t.classification === 'large')
            .slice(0, 10);

        let estimatedLiquidity0G = 0;
        largeTrades.forEach(trade => {
            estimatedLiquidity0G += (trade.ethValueFormatted || 0) * 10; // Multiply by 10 as rough estimate
        });

        const estimatedLiquidityUSD = estimatedLiquidity0G * ogPriceData.usd;
        const w0gLiquidityUSD = estimatedLiquidityUSD / 2; // Assume 50/50 split
        const quoteLiquidityUSD = estimatedLiquidityUSD / 2;

        return {
            totalUSD: estimatedLiquidityUSD,
            w0gUSD: w0gLiquidityUSD,
            quoteUSD: quoteLiquidityUSD,
            ratio: 0.5,
            pairs: ['0G/TOKEN (estimated)']
        };
    }

    // Calculate additional market metrics
    calculateMarketMetrics(trades, ogPriceData) {
        if (!trades || trades.length === 0) {
            return { error: 'No trade data available' };
        }

        const now = Date.now();
        const oneDayAgo = now - this.timeframes['24h'];
        const dayTrades = trades.filter(t => t.timestamp * 1000 >= oneDayAgo);

        // Calculate unique traders
        const uniqueTraders = new Set();
        dayTrades.forEach(trade => {
            uniqueTraders.add(trade.from);
            uniqueTraders.add(trade.to);
        });

        // Calculate price volatility (standard deviation of prices)
        const prices = dayTrades.map(t => (t.pricePerToken || 0) * ogPriceData.usd);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((a, b) => a + Math.pow(b - avgPrice, 2), 0) / prices.length;
        const volatility = Math.sqrt(variance);

        return {
            uniqueTraders24h: uniqueTraders.size,
            avgPrice24h: avgPrice,
            volatility24h: volatility,
            volatilityPercent: avgPrice > 0 ? (volatility / avgPrice) * 100 : 0,
            highPrice24h: Math.max(...prices),
            lowPrice24h: Math.min(...prices),
            priceRange24h: Math.max(...prices) - Math.min(...prices)
        };
    }

    // Helper: Estimate market cap rank
    estimateMarketCapRank(fdvUSD) {
        if (fdvUSD > 1000000000) return 'Top 100'; // >$1B
        if (fdvUSD > 100000000) return 'Top 500';  // >$100M
        if (fdvUSD > 10000000) return 'Top 1000';  // >$10M
        if (fdvUSD > 1000000) return 'Top 2000';   // >$1M
        return 'Micro Cap';
    }

    // Helper: Get token info (would integrate with existing service)
    async getTokenInfo(tokenAddress) {
        // This would integrate with your existing token info fetching
        // For now, return a placeholder structure
        return {
            address: tokenAddress,
            name: 'Token Name',
            symbol: 'TOKEN',
            decimals: 18,
            totalSupply: '1000000000000000000000000000' // 1B tokens
        };
    }

    // Helper: Get recent trades (would integrate with existing service)
    async getRecentTrades(tokenAddress, limit = 100) {
        // This would integrate with your existing trade fetching
        // For now, return a placeholder structure
        return [];
    }

    // API endpoint: Get comprehensive analytics
    async handleAnalyticsRequest(tokenAddress, options = {}) {
        try {
            const analytics = await this.getTokenAnalytics(tokenAddress, options.includeHistorical);
            
            return {
                success: true,
                data: analytics,
                timestamp: Date.now(),
                cached: this.cache.has(`analytics_${tokenAddress}_${options.includeHistorical}`)
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
}

module.exports = EnhancedTokenAnalytics;
