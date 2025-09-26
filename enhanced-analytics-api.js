// Enhanced Analytics API Endpoints
const EnhancedTokenAnalytics = require('./enhanced-token-analytics');
const PriceService = require('./price-service');

class EnhancedAnalyticsAPI {
    constructor(unifiedService) {
        this.analytics = new EnhancedTokenAnalytics();
        this.priceService = new PriceService();
        this.unifiedService = unifiedService; // Reference to existing unified service
        
        // Override the analytics methods to use real data from unified service
        this.analytics.getTokenInfo = this.getTokenInfo.bind(this);
        this.analytics.getRecentTrades = this.getRecentTrades.bind(this);
    }

    // Integration with existing unified service data
    async getTokenInfo(tokenAddress) {
        try {
            // Use the existing token info fetching from unified service
            if (this.unifiedService && this.unifiedService.trackedTokens.has(tokenAddress)) {
                return this.unifiedService.trackedTokens.get(tokenAddress);
            }
            
            // Fallback: fetch token info via RPC
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                this.unifiedService.rpcCall('eth_call', [{
                    to: tokenAddress,
                    data: '0x06fdde03' // name()
                }, 'latest']),
                this.unifiedService.rpcCall('eth_call', [{
                    to: tokenAddress,
                    data: '0x95d89b41' // symbol()
                }, 'latest']),
                this.unifiedService.rpcCall('eth_call', [{
                    to: tokenAddress,
                    data: '0x313ce567' // decimals()
                }, 'latest']),
                this.unifiedService.rpcCall('eth_call', [{
                    to: tokenAddress,
                    data: '0x18160ddd' // totalSupply()
                }, 'latest'])
            ]);

            return {
                address: tokenAddress,
                name: this.decodeString(name),
                symbol: this.decodeString(symbol),
                decimals: parseInt(decimals, 16),
                totalSupply: totalSupply
            };
        } catch (error) {
            console.error('Error fetching token info:', error);
            return null;
        }
    }

    // Get recent trades from unified service
    async getRecentTrades(tokenAddress, limit = 100) {
        try {
            // Use existing trade data from unified service
            return await this.unifiedService.getTokenTrades(tokenAddress, limit);
        } catch (error) {
            console.error('Error fetching recent trades:', error);
            return [];
        }
    }

    // API Endpoint: Get comprehensive token analytics
    async handleTokenAnalytics(req, res, tokenAddress) {
        try {
            const options = {
                includeHistorical: req.query.includeHistorical !== 'false',
                timeframe: req.query.timeframe || '24h'
            };

            console.log(`📊 Generating analytics for ${tokenAddress}...`);
            const analytics = await this.analytics.getTokenAnalytics(tokenAddress, options.includeHistorical);

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: true,
                token: tokenAddress,
                analytics: analytics,
                timestamp: Date.now(),
                version: '2.0'
            }, null, 2));

        } catch (error) {
            console.error('Error in token analytics:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message,
                timestamp: Date.now()
            }));
        }
    }

    // API Endpoint: Get 0G price info
    async handlePriceInfo(req, res) {
        try {
            const priceInfo = await this.priceService.getPriceInfo();
            
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: true,
                price: priceInfo,
                timestamp: Date.now()
            }, null, 2));

        } catch (error) {
            console.error('Error fetching price info:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message,
                timestamp: Date.now()
            }));
        }
    }

    // API Endpoint: Convert 0G to USD
    async handleConversion(req, res) {
        try {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const data = JSON.parse(body);
                const { amount, from, to } = data;

                if (from === '0G' && to === 'USD') {
                    const usdValue = await this.priceService.convertToUSD(amount);
                    const priceData = await this.priceService.get0GPrice();
                    
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({
                        success: true,
                        amount: amount,
                        from: from,
                        to: to,
                        result: usdValue,
                        rate: priceData?.usd || null,
                        timestamp: Date.now()
                    }, null, 2));
                } else {
                    throw new Error('Only 0G to USD conversion supported currently');
                }
            });

        } catch (error) {
            console.error('Error in conversion:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message,
                timestamp: Date.now()
            }));
        }
    }

    // API Endpoint: Get enhanced trades with USD values
    async handleEnhancedTrades(req, res, tokenAddress) {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const includeUSD = req.query.includeUSD === 'true';
            
            // Get trades from unified service
            const trades = await this.getRecentTrades(tokenAddress, limit);
            
            let enhancedTrades = trades;
            if (includeUSD && trades.length > 0) {
                // Enhance trades with USD values
                enhancedTrades = await Promise.all(
                    trades.map(trade => this.priceService.enhanceTradeWithUSD(trade))
                );
            }

            // Get token info
            const tokenInfo = await this.getTokenInfo(tokenAddress);

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: true,
                token: tokenInfo,
                trades: enhancedTrades,
                count: enhancedTrades.length,
                includeUSD: includeUSD,
                timestamp: Date.now()
            }, null, 2));

        } catch (error) {
            console.error('Error in enhanced trades:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message,
                timestamp: Date.now()
            }));
        }
    }

    // API Endpoint: Get market summary for multiple tokens
    async handleMarketSummary(req, res) {
        try {
            const tokens = req.query.tokens ? req.query.tokens.split(',') : [];
            
            if (tokens.length === 0) {
                throw new Error('No tokens specified. Use ?tokens=address1,address2');
            }

            const summaries = await Promise.all(
                tokens.map(async (tokenAddress) => {
                    try {
                        const analytics = await this.analytics.getTokenAnalytics(tokenAddress.trim(), false);
                        return {
                            address: tokenAddress.trim(),
                            success: true,
                            summary: {
                                name: analytics.token.name,
                                symbol: analytics.token.symbol,
                                priceUSD: analytics.pricing.currentPriceUSD,
                                priceChange24h: analytics.pricing.priceChange24h,
                                fdvUSD: analytics.fdv.fdvUSD,
                                volume24hUSD: analytics.volumeAnalytics['24h'].volumeUSD,
                                trades24h: analytics.timeframeAnalytics['24h'].totalTrades,
                                uniqueTraders24h: analytics.marketMetrics.uniqueTraders24h
                            }
                        };
                    } catch (error) {
                        return {
                            address: tokenAddress.trim(),
                            success: false,
                            error: error.message
                        };
                    }
                })
            );

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                success: true,
                tokens: summaries,
                count: summaries.length,
                timestamp: Date.now()
            }, null, 2));

        } catch (error) {
            console.error('Error in market summary:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message,
                timestamp: Date.now()
            }));
        }
    }

    // Helper: Decode hex string response
    decodeString(hex) {
        if (!hex || hex === '0x') return '';
        try {
            const bytes = hex.slice(2);
            const length = parseInt(bytes.slice(64, 128), 16);
            const data = bytes.slice(128, 128 + length * 2);
            return Buffer.from(data, 'hex').toString('utf8');
        } catch (error) {
            return '';
        }
    }

    // Route handler for all analytics endpoints
    handleAnalyticsRoutes(req, res, pathname, query) {
        const parts = pathname.split('/');
        
        if (parts[1] === 'api') {
            switch (parts[2]) {
                case 'price':
                    return this.handlePriceInfo(req, res);
                    
                case 'convert':
                    if (req.method === 'POST') {
                        return this.handleConversion(req, res);
                    }
                    break;
                    
                case 'analytics':
                    if (parts[3]) {
                        return this.handleTokenAnalytics(req, res, parts[3]);
                    }
                    break;
                    
                case 'trades':
                    if (parts[3]) {
                        return this.handleEnhancedTrades(req, res, parts[3]);
                    }
                    break;
                    
                case 'market':
                    if (parts[3] === 'summary') {
                        return this.handleMarketSummary(req, res);
                    }
                    break;
            }
        }
        
        return false; // Not handled by analytics API
    }
}

module.exports = EnhancedAnalyticsAPI;
