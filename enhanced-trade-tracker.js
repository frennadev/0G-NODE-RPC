const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const url = require('url');

// Enhanced Trade Tracker - Detects all transfers and classifies as trades
class EnhancedTradeTracker {
    constructor() {
        this.rpcUrl = process.env.RPC_URL || 'https://zerog-node-rpc.onrender.com/';
        this.port = process.env.PORT || 5000;
        this.wsPort = process.env.WS_PORT || 5001;
        
        // Known DEX and exchange patterns
        this.knownPatterns = {
            // Zero address (minting/burning)
            zeroAddress: '0x0000000000000000000000000000000000000000',
            
            // Common exchange/DEX patterns (addresses that frequently trade)
            // These would be populated with actual 0G Chain DEX addresses
            dexRouters: new Set([
                '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router (example)
                '0xe592427a0aece92de3edee1f18e0157c05861564'  // Uniswap V3 Router (example)
            ]),
            
            // Addresses that appear frequently in transfers (likely exchanges/pools)
            highVolumeAddresses: new Set()
        };
        
        this.eventSignatures = {
            transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        };
        
        this.trackedTokens = new Map();
        this.addressAnalysis = new Map(); // Track address patterns
        this.subscribers = new Map();
        
        // Initialize WebSocket server
        this.wss = new WebSocket.Server({ port: this.wsPort });
        this.setupWebSocketServer();
        
        console.log(`🚀 Enhanced Trade Tracker starting...`);
        console.log(`📊 API Server: http://localhost:${this.port}`);
        console.log(`🔴 WebSocket: ws://localhost:${this.wsPort}`);
    }

    // RPC call to 0G node
    async rpcCall(method, params = []) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: Date.now()
            });

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(this.rpcUrl, options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (response.error) {
                            reject(new Error(response.error.message));
                        } else {
                            resolve(response.result);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Get token information
    async getTokenInfo(tokenAddress) {
        try {
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                this.rpcCall('eth_call', [{ to: tokenAddress, data: '0x06fdde03' }, 'latest']),
                this.rpcCall('eth_call', [{ to: tokenAddress, data: '0x95d89b41' }, 'latest']),
                this.rpcCall('eth_call', [{ to: tokenAddress, data: '0x313ce567' }, 'latest']),
                this.rpcCall('eth_call', [{ to: tokenAddress, data: '0x18160ddd' }, 'latest'])
            ]);

            return {
                address: tokenAddress.toLowerCase(),
                name: this.decodeString(name),
                symbol: this.decodeString(symbol),
                decimals: parseInt(decimals, 16),
                totalSupply: parseInt(totalSupply, 16)
            };
        } catch (error) {
            throw new Error(`Failed to get token info: ${error.message}`);
        }
    }

    // Decode ABI-encoded string
    decodeString(hex) {
        if (!hex || hex === '0x') return '';
        try {
            const data = hex.slice(2 + 64 + 64); // Skip 0x + offset + length
            return Buffer.from(data, 'hex').toString('utf8').replace(/\0/g, '');
        } catch {
            return '';
        }
    }

    // Analyze address patterns to identify exchanges/DEXs
    analyzeAddressPatterns(transfers) {
        const addressStats = new Map();
        
        // Count transfer frequency for each address
        for (const transfer of transfers) {
            const from = transfer.from;
            const to = transfer.to;
            
            // Count outgoing transfers (sells)
            if (!addressStats.has(from)) {
                addressStats.set(from, { outgoing: 0, incoming: 0, totalVolume: 0 });
            }
            addressStats.get(from).outgoing++;
            addressStats.get(from).totalVolume += transfer.amount;
            
            // Count incoming transfers (buys)
            if (!addressStats.has(to)) {
                addressStats.set(to, { outgoing: 0, incoming: 0, totalVolume: 0 });
            }
            addressStats.get(to).incoming++;
            addressStats.get(to).totalVolume += transfer.amount;
        }
        
        // Identify high-volume addresses (likely exchanges/DEXs)
        const highVolumeThreshold = transfers.length * 0.05; // 5% of total transfers
        const exchangeAddresses = new Set();
        
        for (const [address, stats] of addressStats) {
            const totalTransfers = stats.incoming + stats.outgoing;
            if (totalTransfers >= highVolumeThreshold) {
                exchangeAddresses.add(address);
                this.knownPatterns.highVolumeAddresses.add(address);
            }
        }
        
        return {
            addressStats,
            exchangeAddresses,
            totalAddresses: addressStats.size
        };
    }

    // Get all transfers and classify them as trades
    async getAllTrades(tokenAddress, fromBlock = '0x0', limit = 1000) {
        try {
            const tokenInfo = await this.getTokenInfo(tokenAddress);
            
            console.log(`🔍 Scanning all transfers for ${tokenInfo.symbol} from block ${fromBlock}...`);
            
            // Get all transfer events for the token
            const logs = await this.rpcCall('eth_getLogs', [{
                fromBlock: fromBlock,
                toBlock: 'latest',
                address: tokenAddress,
                topics: [this.eventSignatures.transfer]
            }]);

            console.log(`📊 Found ${logs.length} transfer events for ${tokenInfo.symbol}`);

            if (logs.length === 0) {
                return {
                    token: tokenInfo,
                    trades: [],
                    summary: this.calculateTradingSummary([], tokenInfo),
                    analysis: { addressStats: new Map(), exchangeAddresses: new Set(), totalAddresses: 0 }
                };
            }

            // Process transfers in batches
            const transfers = [];
            const batchSize = 100;
            
            for (let i = 0; i < Math.min(logs.length, limit); i += batchSize) {
                const batch = logs.slice(i, i + batchSize);
                const batchTransfers = await this.processTransferBatch(batch, tokenInfo);
                transfers.push(...batchTransfers);
                
                // Progress logging
                if (i % 200 === 0) {
                    console.log(`📈 Processed ${i}/${Math.min(logs.length, limit)} transfers...`);
                }
            }

            // Analyze address patterns
            const analysis = this.analyzeAddressPatterns(transfers);
            
            // Classify transfers as trades based on patterns
            const trades = this.classifyTransfersAsTrades(transfers, tokenInfo, analysis);

            // Sort trades by block number and timestamp
            trades.sort((a, b) => a.blockNumber - b.blockNumber);

            console.log(`✅ Processed ${transfers.length} transfers, identified ${trades.length} trades for ${tokenInfo.symbol}`);

            return {
                token: tokenInfo,
                transfers: transfers,
                trades: trades,
                summary: this.calculateTradingSummary(trades, tokenInfo),
                analysis: analysis
            };
        } catch (error) {
            throw new Error(`Failed to get all trades: ${error.message}`);
        }
    }

    // Process a batch of transfer logs
    async processTransferBatch(logs, tokenInfo) {
        const transfers = [];
        
        for (const log of logs) {
            try {
                const transfer = await this.processTransfer(log, tokenInfo);
                if (transfer) {
                    transfers.push(transfer);
                }
            } catch (error) {
                console.error(`Error processing transfer ${log.transactionHash}:`, error.message);
            }
        }
        
        return transfers;
    }

    // Process individual transfer
    async processTransfer(log, tokenInfo) {
        try {
            const from = '0x' + log.topics[1].slice(26);
            const to = '0x' + log.topics[2].slice(26);
            const amount = parseInt(log.data, 16);
            
            // Get block details for timestamp
            const block = await this.rpcCall('eth_getBlockByHash', [log.blockHash, false]);
            const timestamp = parseInt(block.timestamp, 16);
            
            return {
                transactionHash: log.transactionHash,
                blockNumber: parseInt(log.blockNumber, 16),
                timestamp: timestamp,
                from: from.toLowerCase(),
                to: to.toLowerCase(),
                amount: amount,
                amountFormatted: amount / Math.pow(10, tokenInfo.decimals),
                logIndex: parseInt(log.logIndex, 16)
            };
        } catch (error) {
            console.error(`Error processing transfer:`, error.message);
            return null;
        }
    }

    // Classify transfers as trades
    classifyTransfersAsTrades(transfers, tokenInfo, analysis) {
        const trades = [];
        const { exchangeAddresses } = analysis;
        
        for (const transfer of transfers) {
            const tradeType = this.determineTradeType(transfer, exchangeAddresses);
            
            if (tradeType !== 'unknown') {
                const trade = {
                    ...transfer,
                    tokenAddress: tokenInfo.address,
                    tokenSymbol: tokenInfo.symbol,
                    tokenAmount: transfer.amount,
                    tokenAmountFormatted: transfer.amountFormatted,
                    
                    // Trade classification
                    type: tradeType, // 'buy', 'sell', 'transfer', 'mint', 'burn'
                    classification: this.classifyTradeSize(transfer.amount, tokenInfo.totalSupply),
                    
                    // Trade details
                    isExchangeInvolved: this.isExchangeAddress(transfer.from, exchangeAddresses) || 
                                       this.isExchangeAddress(transfer.to, exchangeAddresses),
                    
                    // Price estimation (simplified)
                    estimatedPrice: null, // Would need DEX pair data for accurate pricing
                    
                    // Base/Quote token info (simplified - assume ETH pairs)
                    baseToken: {
                        address: '0x0000000000000000000000000000000000000000',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    quoteToken: {
                        address: tokenInfo.address,
                        symbol: tokenInfo.symbol,
                        decimals: tokenInfo.decimals
                    }
                };
                
                trades.push(trade);
            }
        }
        
        return trades;
    }

    // Determine trade type based on transfer pattern
    determineTradeType(transfer, exchangeAddresses) {
        const { from, to } = transfer;
        
        // Mint (from zero address)
        if (from === this.knownPatterns.zeroAddress) {
            return 'mint';
        }
        
        // Burn (to zero address)
        if (to === this.knownPatterns.zeroAddress) {
            return 'burn';
        }
        
        // Check if exchange is involved
        const fromIsExchange = this.isExchangeAddress(from, exchangeAddresses);
        const toIsExchange = this.isExchangeAddress(to, exchangeAddresses);
        
        if (fromIsExchange && !toIsExchange) {
            // Token flowing from exchange to user = BUY
            return 'buy';
        } else if (!fromIsExchange && toIsExchange) {
            // Token flowing from user to exchange = SELL
            return 'sell';
        } else if (fromIsExchange && toIsExchange) {
            // Exchange to exchange = arbitrage/liquidity
            return 'arbitrage';
        } else {
            // Regular transfer between users
            return 'transfer';
        }
    }

    // Check if address is likely an exchange
    isExchangeAddress(address, exchangeAddresses) {
        return this.knownPatterns.dexRouters.has(address) ||
               this.knownPatterns.highVolumeAddresses.has(address) ||
               exchangeAddresses.has(address);
    }

    // Classify trade size
    classifyTradeSize(amount, totalSupply) {
        const percentage = (amount / totalSupply) * 100;
        
        if (percentage >= 1.0) return 'whale';
        if (percentage >= 0.1) return 'large';
        if (percentage >= 0.01) return 'medium';
        return 'small';
    }

    // Calculate trading summary
    calculateTradingSummary(trades, tokenInfo) {
        const now = Math.floor(Date.now() / 1000);
        const oneHour = 3600;
        const oneDay = 86400;

        const trades24h = trades.filter(t => (now - t.timestamp) < oneDay);
        const tradesHourly = trades.filter(t => (now - t.timestamp) < oneHour);

        const buys = trades.filter(t => t.type === 'buy');
        const sells = trades.filter(t => t.type === 'sell');
        const transfers = trades.filter(t => t.type === 'transfer');
        const mints = trades.filter(t => t.type === 'mint');
        const burns = trades.filter(t => t.type === 'burn');

        const buys24h = trades24h.filter(t => t.type === 'buy');
        const sells24h = trades24h.filter(t => t.type === 'sell');

        const volume24h = trades24h.reduce((sum, t) => sum + t.tokenAmountFormatted, 0);
        const volumeHourly = tradesHourly.reduce((sum, t) => sum + t.tokenAmountFormatted, 0);

        const buyVolume24h = buys24h.reduce((sum, t) => sum + t.tokenAmountFormatted, 0);
        const sellVolume24h = sells24h.reduce((sum, t) => sum + t.tokenAmountFormatted, 0);

        return {
            // Total counts
            totalTrades: trades.length,
            totalBuys: buys.length,
            totalSells: sells.length,
            totalTransfers: transfers.length,
            totalMints: mints.length,
            totalBurns: burns.length,
            
            // 24h metrics
            trades24h: trades24h.length,
            buys24h: buys24h.length,
            sells24h: sells24h.length,
            
            // Hourly metrics
            tradesHourly: tradesHourly.length,
            
            // Volume metrics
            volume24h: volume24h,
            buyVolume24h: buyVolume24h,
            sellVolume24h: sellVolume24h,
            volumeHourly: volumeHourly,
            
            // Trading metrics
            buyPressure: (buys24h.length + sells24h.length) > 0 ? 
                        (buys24h.length / (buys24h.length + sells24h.length)) * 100 : 0,
            
            // Size classifications
            whaleTradesCount: trades.filter(t => t.classification === 'whale').length,
            largeTradesCount: trades.filter(t => t.classification === 'large').length,
            mediumTradesCount: trades.filter(t => t.classification === 'medium').length,
            smallTradesCount: trades.filter(t => t.classification === 'small').length,
            
            // Additional metrics
            avgTradeSize: trades24h.length > 0 ? volume24h / trades24h.length : 0,
            exchangeInvolvedTrades: trades.filter(t => t.isExchangeInvolved).length,
            
            // Latest activity
            lastTrade: trades.length > 0 ? trades[trades.length - 1] : null,
            
            // Token info
            tokenSupply: tokenInfo.totalSupply / Math.pow(10, tokenInfo.decimals)
        };
    }

    // Start tracking a token
    async startTracking(tokenAddress) {
        const normalizedAddress = tokenAddress.toLowerCase();
        
        if (this.trackedTokens.has(normalizedAddress)) {
            return this.trackedTokens.get(normalizedAddress);
        }

        try {
            const tokenInfo = await this.getTokenInfo(normalizedAddress);
            
            const trackingData = {
                ...tokenInfo,
                startTime: Date.now(),
                lastUpdate: Date.now(),
                subscribers: new Set(),
                lastProcessedBlock: await this.rpcCall('eth_blockNumber')
            };

            this.trackedTokens.set(normalizedAddress, trackingData);
            
            // Start monitoring for new transfers
            this.monitorTokenTrades(normalizedAddress);
            
            console.log(`📊 Started tracking ${tokenInfo.symbol} (${normalizedAddress})`);
            return trackingData;
        } catch (error) {
            throw new Error(`Failed to start tracking: ${error.message}`);
        }
    }

    // Monitor token for real-time updates
    async monitorTokenTrades(tokenAddress) {
        const pollInterval = 5000; // 5 seconds
        
        const poll = async () => {
            try {
                const trackingData = this.trackedTokens.get(tokenAddress);
                if (!trackingData) return;

                const latestBlock = await this.rpcCall('eth_blockNumber');
                const fromBlock = trackingData.lastProcessedBlock;
                
                if (parseInt(latestBlock, 16) > parseInt(fromBlock, 16)) {
                    // Get new transfers since last check
                    const logs = await this.rpcCall('eth_getLogs', [{
                        fromBlock: fromBlock,
                        toBlock: latestBlock,
                        address: tokenAddress,
                        topics: [this.eventSignatures.transfer]
                    }]);

                    if (logs.length > 0) {
                        console.log(`🔄 Found ${logs.length} new transfers for ${trackingData.symbol}`);
                        
                        // Process new transfers
                        const newTransfers = await this.processTransferBatch(logs, trackingData);
                        
                        if (newTransfers.length > 0) {
                            // Quick classification (without full analysis)
                            const newTrades = this.classifyTransfersAsTrades(
                                newTransfers, 
                                trackingData, 
                                { exchangeAddresses: this.knownPatterns.highVolumeAddresses }
                            );
                            
                            console.log(`💰 Detected ${newTrades.length} new trades for ${trackingData.symbol}`);
                            
                            // Broadcast to WebSocket subscribers
                            this.broadcastTrades(tokenAddress, {
                                type: 'new_trades',
                                token: trackingData,
                                trades: newTrades,
                                timestamp: Date.now()
                            });
                        }
                    }
                    
                    // Update last processed block
                    trackingData.lastProcessedBlock = latestBlock;
                    trackingData.lastUpdate = Date.now();
                }
                
            } catch (error) {
                console.error(`❌ Error monitoring ${tokenAddress}:`, error.message);
            }
            
            // Continue polling if token is still tracked
            if (this.trackedTokens.has(tokenAddress)) {
                setTimeout(poll, pollInterval);
            }
        };
        
        poll();
    }

    // WebSocket server setup
    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const clientId = Date.now() + Math.random();
            console.log(`🔗 Enhanced trade stream client connected: ${clientId}`);
            
            ws.clientId = clientId;
            ws.subscribedTokens = new Set();
            
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: error.message
                    }));
                }
            });
            
            ws.on('close', () => {
                console.log(`🔌 Enhanced trade stream client disconnected: ${clientId}`);
                for (const tokenAddress of ws.subscribedTokens) {
                    const token = this.trackedTokens.get(tokenAddress);
                    if (token) {
                        token.subscribers.delete(clientId);
                    }
                }
            });
            
            ws.send(JSON.stringify({
                type: 'connected',
                clientId: clientId,
                message: 'Connected to Enhanced 0G Trade Stream',
                features: [
                    'All transfers classified as trades',
                    'Buy/sell/transfer/mint/burn detection',
                    'Exchange address identification',
                    'Complete trade history from inception',
                    'Real-time streaming'
                ]
            }));
        });
    }

    // Handle WebSocket messages
    async handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe_trades':
                if (data.tokenAddress) {
                    await this.subscribeToTrades(ws, data.tokenAddress);
                }
                break;
                
            case 'get_all_trades':
                if (data.tokenAddress) {
                    const result = await this.getAllTrades(data.tokenAddress, data.fromBlock || '0x0', data.limit || 1000);
                    ws.send(JSON.stringify({
                        type: 'all_trades',
                        data: result
                    }));
                }
                break;
                
            case 'unsubscribe':
                if (data.tokenAddress) {
                    this.unsubscribeFromTrades(ws, data.tokenAddress);
                }
                break;
                
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }));
        }
    }

    // Subscribe to trade updates
    async subscribeToTrades(ws, tokenAddress) {
        try {
            const token = await this.startTracking(tokenAddress);
            token.subscribers.add(ws.clientId);
            ws.subscribedTokens.add(tokenAddress);
            
            ws.send(JSON.stringify({
                type: 'subscribed_trades',
                tokenAddress: tokenAddress,
                tokenInfo: token
            }));
            
            console.log(`📺 Client ${ws.clientId} subscribed to ${token.symbol} trades`);
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                message: `Failed to subscribe: ${error.message}`
            }));
        }
    }

    // Unsubscribe from trades
    unsubscribeFromTrades(ws, tokenAddress) {
        const token = this.trackedTokens.get(tokenAddress);
        if (token) {
            token.subscribers.delete(ws.clientId);
            ws.subscribedTokens.delete(tokenAddress);
            
            ws.send(JSON.stringify({
                type: 'unsubscribed_trades',
                tokenAddress: tokenAddress
            }));
        }
    }

    // Broadcast trades to subscribers
    broadcastTrades(tokenAddress, update) {
        const token = this.trackedTokens.get(tokenAddress);
        if (!token) return;
        
        const message = JSON.stringify(update);
        
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && 
                client.subscribedTokens && 
                client.subscribedTokens.has(tokenAddress)) {
                client.send(message);
            }
        });
    }

    // Create HTTP API server
    createAPIServer() {
        const server = http.createServer(async (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            
            const parsedUrl = url.parse(req.url, true);
            const path = parsedUrl.pathname;
            const query = parsedUrl.query;
            
            try {
                await this.handleAPIRequest(req, res, path, query);
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: error.message,
                    timestamp: new Date().toISOString()
                }));
            }
        });
        
        server.listen(this.port, () => {
            console.log(`🌐 Enhanced Trade API running on port ${this.port}`);
        });
        
        return server;
    }

    // Handle API requests
    async handleAPIRequest(req, res, path, query) {
        res.setHeader('Content-Type', 'application/json');
        
        switch (path) {
            case '/':
                res.writeHead(200);
                res.end(JSON.stringify({
                    service: '0G Enhanced Trade Tracker API',
                    version: '1.0.0',
                    endpoints: {
                        '/trades/{address}': 'Get all trades for a token',
                        '/trades/{address}/recent': 'Get recent trades',
                        '/trades/{address}/summary': 'Get trading summary',
                        '/health': 'Service health check'
                    },
                    websocket: `ws://localhost:${this.wsPort}`,
                    features: [
                        'All transfers classified as trades',
                        'Buy/sell/transfer/mint/burn detection',
                        'Exchange address identification',
                        'Complete trade history from token inception',
                        'Real-time streaming with 5s updates'
                    ]
                }));
                break;
                
            case '/health':
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'healthy',
                    trackedTokens: this.trackedTokens.size,
                    activeConnections: this.wss.clients.size,
                    knownExchanges: this.knownPatterns.highVolumeAddresses.size,
                    uptime: process.uptime()
                }));
                break;
                
            default:
                if (path.startsWith('/trades/')) {
                    await this.handleTradeAPI(req, res, path, query);
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Endpoint not found' }));
                }
        }
    }

    // Handle trade-specific API requests
    async handleTradeAPI(req, res, path, query) {
        const pathParts = path.split('/');
        const tokenAddress = pathParts[2];
        const action = pathParts[3];
        
        if (!tokenAddress || !tokenAddress.startsWith('0x')) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid token address' }));
            return;
        }
        
        switch (action) {
            case undefined:
                const fromBlock = query.fromBlock || '0x0';
                const limit = parseInt(query.limit) || 1000;
                
                const allTrades = await this.getAllTrades(tokenAddress, fromBlock, limit);
                res.writeHead(200);
                res.end(JSON.stringify(allTrades));
                break;
                
            case 'recent':
                const recentLimit = parseInt(query.limit) || 100;
                const latestBlock = await this.rpcCall('eth_blockNumber');
                const recentFromBlock = '0x' + Math.max(0, parseInt(latestBlock, 16) - 1000).toString(16);
                
                const recentTrades = await this.getAllTrades(tokenAddress, recentFromBlock, recentLimit);
                res.writeHead(200);
                res.end(JSON.stringify(recentTrades));
                break;
                
            case 'summary':
                const summaryResult = await this.getAllTrades(tokenAddress, '0x0', 10000);
                res.writeHead(200);
                res.end(JSON.stringify({
                    token: summaryResult.token,
                    summary: summaryResult.summary,
                    analysis: summaryResult.analysis,
                    recentTrades: summaryResult.trades.slice(-20)
                }));
                break;
                
            default:
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Trade endpoint not found' }));
        }
    }
}

// Start the Enhanced Trade Tracker
const tracker = new EnhancedTradeTracker();
const apiServer = tracker.createAPIServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down Enhanced Trade Tracker...');
    apiServer.close();
    tracker.wss.close();
    process.exit(0);
});

console.log('🎯 Enhanced 0G Trade Tracker is ready!');
console.log('📚 API Documentation: http://localhost:5000/');
console.log('🔴 Trade Stream: ws://localhost:5001');
console.log('💰 Features: All transfers classified with buy/sell/transfer detection');
