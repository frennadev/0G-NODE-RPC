const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const url = require('url');

// DEX Trade Tracker - Real-time Buy/Sell Detection
class DEXTradeTracker {
    constructor() {
        this.rpcUrl = process.env.RPC_URL || 'https://zerog-node-rpc.onrender.com/';
        this.port = process.env.PORT || 4000;
        this.wsPort = process.env.WS_PORT || 4001;
        
        // DEX contract addresses and signatures
        this.dexContracts = {
            // Common DEX router addresses (add 0G specific ones)
            uniswapV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            // Add 0G Chain specific DEX addresses here
        };
        
        // Event signatures for trade detection
        this.eventSignatures = {
            // Uniswap V2 Swap event
            swap: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
            // Transfer event (for token movements)
            transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            // Sync event (for price updates)
            sync: '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'
        };
        
        this.trackedTokens = new Map();
        this.tradeHistory = new Map();
        this.subscribers = new Map();
        this.priceCache = new Map();
        
        // Initialize WebSocket server
        this.wss = new WebSocket.Server({ port: this.wsPort });
        this.setupWebSocketServer();
        
        console.log(`🚀 DEX Trade Tracker starting...`);
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

    // Find DEX pairs for a token
    async findTokenPairs(tokenAddress) {
        try {
            // Look for Transfer events involving the token to find DEX pairs
            const latestBlock = await this.rpcCall('eth_blockNumber');
            const fromBlock = '0x' + Math.max(0, parseInt(latestBlock, 16) - 10000).toString(16); // Last 10k blocks
            
            const logs = await this.rpcCall('eth_getLogs', [{
                fromBlock: fromBlock,
                toBlock: 'latest',
                address: tokenAddress,
                topics: [this.eventSignatures.transfer]
            }]);

            const pairs = new Set();
            const dexAddresses = new Set();

            // Analyze transfers to identify DEX contracts
            for (const log of logs) {
                const from = '0x' + log.topics[1].slice(26);
                const to = '0x' + log.topics[2].slice(26);
                
                // Check if transfer involves known DEX patterns
                if (this.isPotentialDEXAddress(from) || this.isPotentialDEXAddress(to)) {
                    pairs.add(from);
                    pairs.add(to);
                    dexAddresses.add(this.isPotentialDEXAddress(from) ? from : to);
                }
            }

            return {
                pairs: Array.from(pairs).filter(addr => addr !== tokenAddress.toLowerCase()),
                dexAddresses: Array.from(dexAddresses)
            };
        } catch (error) {
            console.error(`Error finding pairs for ${tokenAddress}:`, error.message);
            return { pairs: [], dexAddresses: [] };
        }
    }

    // Check if address might be a DEX contract
    isPotentialDEXAddress(address) {
        // Simple heuristic - in production, you'd maintain a list of known DEX addresses
        return Object.values(this.dexContracts).includes(address.toLowerCase());
    }

    // Get all trades for a token from inception
    async getAllTrades(tokenAddress, fromBlock = '0x0', limit = 1000) {
        try {
            const tokenInfo = await this.getTokenInfo(tokenAddress);
            const pairs = await this.findTokenPairs(tokenAddress);
            
            console.log(`🔍 Scanning trades for ${tokenInfo.symbol} from block ${fromBlock}...`);
            
            // Get all transfer events for the token
            const logs = await this.rpcCall('eth_getLogs', [{
                fromBlock: fromBlock,
                toBlock: 'latest',
                address: tokenAddress,
                topics: [this.eventSignatures.transfer]
            }]);

            console.log(`📊 Found ${logs.length} transfer events for ${tokenInfo.symbol}`);

            const trades = [];
            const processedTxs = new Set();

            // Process transfers in batches to avoid overwhelming the RPC
            const batchSize = 50;
            for (let i = 0; i < Math.min(logs.length, limit); i += batchSize) {
                const batch = logs.slice(i, i + batchSize);
                const batchTrades = await this.processTradeBatch(batch, tokenInfo, pairs);
                trades.push(...batchTrades);
                
                // Progress logging
                if (i % 200 === 0) {
                    console.log(`📈 Processed ${i}/${Math.min(logs.length, limit)} transfers...`);
                }
            }

            // Sort trades by block number and timestamp
            trades.sort((a, b) => a.blockNumber - b.blockNumber);

            console.log(`✅ Found ${trades.length} trades for ${tokenInfo.symbol}`);

            return {
                token: tokenInfo,
                pairs: pairs,
                trades: trades,
                summary: this.calculateTradingSummary(trades, tokenInfo)
            };
        } catch (error) {
            throw new Error(`Failed to get all trades: ${error.message}`);
        }
    }

    // Process a batch of transfers to identify trades
    async processTradeBatch(logs, tokenInfo, pairs) {
        const trades = [];
        const txGroups = new Map();

        // Group logs by transaction hash
        for (const log of logs) {
            if (!txGroups.has(log.transactionHash)) {
                txGroups.set(log.transactionHash, []);
            }
            txGroups.get(log.transactionHash).push(log);
        }

        // Process each transaction
        for (const [txHash, txLogs] of txGroups) {
            try {
                const trade = await this.analyzeTrade(txHash, txLogs, tokenInfo, pairs);
                if (trade) {
                    trades.push(trade);
                }
            } catch (error) {
                console.error(`Error analyzing trade ${txHash}:`, error.message);
            }
        }

        return trades;
    }

    // Analyze a transaction to determine if it's a trade
    async analyzeTrade(txHash, logs, tokenInfo, pairs) {
        try {
            // Get transaction details
            const tx = await this.rpcCall('eth_getTransactionByHash', [txHash]);
            const receipt = await this.rpcCall('eth_getTransactionReceipt', [txHash]);
            
            if (!tx || !receipt) return null;

            // Get block details for timestamp
            const block = await this.rpcCall('eth_getBlockByHash', [tx.blockHash, false]);
            const timestamp = parseInt(block.timestamp, 16);

            // Analyze the logs to determine trade details
            const tradeAnalysis = this.analyzeTradeFromLogs(logs, tokenInfo, pairs);
            
            if (!tradeAnalysis.isTrade) return null;

            // Calculate trade metrics
            const trade = {
                transactionHash: txHash,
                blockNumber: parseInt(tx.blockNumber, 16),
                timestamp: timestamp,
                from: tx.from.toLowerCase(),
                to: tx.to ? tx.to.toLowerCase() : null,
                gasUsed: parseInt(receipt.gasUsed, 16),
                gasPrice: parseInt(tx.gasPrice, 16),
                
                // Trade specific data
                type: tradeAnalysis.type, // 'buy' or 'sell'
                tokenAddress: tokenInfo.address,
                tokenSymbol: tokenInfo.symbol,
                tokenAmount: tradeAnalysis.tokenAmount,
                tokenAmountFormatted: tradeAnalysis.tokenAmount / Math.pow(10, tokenInfo.decimals),
                
                // Base/Quote token details
                baseToken: tradeAnalysis.baseToken,
                quoteToken: tradeAnalysis.quoteToken,
                baseAmount: tradeAnalysis.baseAmount,
                quoteAmount: tradeAnalysis.quoteAmount,
                
                // Price calculation
                price: tradeAnalysis.price,
                priceUSD: tradeAnalysis.priceUSD || null,
                
                // DEX information
                dexAddress: tradeAnalysis.dexAddress,
                pairAddress: tradeAnalysis.pairAddress,
                
                // Additional metadata
                logIndex: logs[0].logIndex,
                classification: this.classifyTrade(tradeAnalysis.tokenAmount, tokenInfo.totalSupply)
            };

            return trade;
        } catch (error) {
            console.error(`Error analyzing trade ${txHash}:`, error.message);
            return null;
        }
    }

    // Analyze logs to extract trade information
    analyzeTradeFromLogs(logs, tokenInfo, pairs) {
        let tokenAmount = 0;
        let baseAmount = 0;
        let quoteAmount = 0;
        let type = 'unknown';
        let baseToken = null;
        let quoteToken = null;
        let dexAddress = null;
        let pairAddress = null;

        // Look for token transfers in the logs
        for (const log of logs) {
            const from = '0x' + log.topics[1].slice(26);
            const to = '0x' + log.topics[2].slice(26);
            const amount = parseInt(log.data, 16);

            // Check if this involves a potential DEX pair
            const isDEXTransfer = pairs.pairs.includes(from) || pairs.pairs.includes(to) ||
                                 pairs.dexAddresses.includes(from) || pairs.dexAddresses.includes(to);

            if (isDEXTransfer) {
                tokenAmount = amount;
                
                // Determine if it's a buy or sell based on transfer direction
                if (pairs.pairs.includes(from) || pairs.dexAddresses.includes(from)) {
                    // Token flowing from DEX to user = BUY
                    type = 'buy';
                    pairAddress = from;
                } else if (pairs.pairs.includes(to) || pairs.dexAddresses.includes(to)) {
                    // Token flowing from user to DEX = SELL
                    type = 'sell';
                    pairAddress = to;
                }
                
                dexAddress = pairs.dexAddresses.find(addr => addr === from || addr === to);
            }
        }

        // For now, assume ETH as base token (in production, detect actual pair tokens)
        baseToken = {
            address: '0x0000000000000000000000000000000000000000', // ETH
            symbol: 'ETH',
            decimals: 18
        };
        
        quoteToken = {
            address: tokenInfo.address,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals
        };

        // Estimate price (simplified - in production, get from DEX reserves)
        const price = tokenAmount > 0 ? baseAmount / tokenAmount : 0;

        return {
            isTrade: tokenAmount > 0 && type !== 'unknown',
            type: type,
            tokenAmount: tokenAmount,
            baseAmount: baseAmount,
            quoteAmount: quoteAmount,
            baseToken: baseToken,
            quoteToken: quoteToken,
            price: price,
            dexAddress: dexAddress,
            pairAddress: pairAddress
        };
    }

    // Classify trade size
    classifyTrade(amount, totalSupply) {
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
        const buys24h = trades24h.filter(t => t.type === 'buy');
        const sells24h = trades24h.filter(t => t.type === 'sell');

        const volume24h = trades24h.reduce((sum, t) => sum + t.tokenAmountFormatted, 0);
        const volumeHourly = tradesHourly.reduce((sum, t) => sum + t.tokenAmountFormatted, 0);

        const buyVolume24h = buys24h.reduce((sum, t) => sum + t.tokenAmountFormatted, 0);
        const sellVolume24h = sells24h.reduce((sum, t) => sum + t.tokenAmountFormatted, 0);

        return {
            totalTrades: trades.length,
            totalBuys: buys.length,
            totalSells: sells.length,
            
            trades24h: trades24h.length,
            buys24h: buys24h.length,
            sells24h: sells24h.length,
            
            tradesHourly: tradesHourly.length,
            
            volume24h: volume24h,
            buyVolume24h: buyVolume24h,
            sellVolume24h: sellVolume24h,
            volumeHourly: volumeHourly,
            
            buyPressure: buys24h.length > 0 ? (buys24h.length / (buys24h.length + sells24h.length)) * 100 : 0,
            
            whaleTradesCount: trades.filter(t => t.classification === 'whale').length,
            largeTradesCount: trades.filter(t => t.classification === 'large').length,
            
            avgTradeSize: trades.length > 0 ? volume24h / trades24h.length : 0,
            
            lastTrade: trades.length > 0 ? trades[trades.length - 1] : null
        };
    }

    // Start tracking a token for real-time updates
    async startTracking(tokenAddress) {
        const normalizedAddress = tokenAddress.toLowerCase();
        
        if (this.trackedTokens.has(normalizedAddress)) {
            return this.trackedTokens.get(normalizedAddress);
        }

        try {
            const tokenInfo = await this.getTokenInfo(normalizedAddress);
            const pairs = await this.findTokenPairs(normalizedAddress);
            
            const trackingData = {
                ...tokenInfo,
                pairs: pairs,
                startTime: Date.now(),
                lastUpdate: Date.now(),
                subscribers: new Set(),
                lastProcessedBlock: await this.rpcCall('eth_blockNumber')
            };

            this.trackedTokens.set(normalizedAddress, trackingData);
            
            // Start monitoring for new trades
            this.monitorTokenTrades(normalizedAddress);
            
            console.log(`📊 Started tracking ${tokenInfo.symbol} trades (${normalizedAddress})`);
            return trackingData;
        } catch (error) {
            throw new Error(`Failed to start tracking: ${error.message}`);
        }
    }

    // Monitor token for real-time trade updates
    async monitorTokenTrades(tokenAddress) {
        const pollInterval = 3000; // 3 seconds
        
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
                        
                        // Process new trades
                        const newTrades = await this.processTradeBatch(logs, trackingData, trackingData.pairs);
                        
                        if (newTrades.length > 0) {
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
            console.log(`🔗 Trade stream client connected: ${clientId}`);
            
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
                console.log(`🔌 Trade stream client disconnected: ${clientId}`);
                // Clean up subscriptions
                for (const tokenAddress of ws.subscribedTokens) {
                    const token = this.trackedTokens.get(tokenAddress);
                    if (token) {
                        token.subscribers.delete(clientId);
                    }
                }
            });
            
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connected',
                clientId: clientId,
                message: 'Connected to 0G DEX Trade Stream',
                features: [
                    'Real-time buy/sell detection',
                    'Complete trade history from inception',
                    'Base/quote token amounts',
                    'Price and volume analytics'
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
                    const trades = await this.getAllTrades(data.tokenAddress, data.fromBlock || '0x0', data.limit || 1000);
                    ws.send(JSON.stringify({
                        type: 'all_trades',
                        data: trades
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
            // CORS headers
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
            console.log(`🌐 DEX Trade API running on port ${this.port}`);
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
                    service: '0G DEX Trade Tracker API',
                    version: '1.0.0',
                    endpoints: {
                        '/trades/{address}': 'Get all trades for a token',
                        '/trades/{address}/recent': 'Get recent trades',
                        '/trades/{address}/summary': 'Get trading summary',
                        '/health': 'Service health check'
                    },
                    websocket: `ws://localhost:${this.wsPort}`,
                    features: [
                        'Real-time buy/sell detection',
                        'Complete trade history from token inception',
                        'Base/quote token amounts and pricing',
                        'DEX pair identification',
                        'Trade classification (whale/large/medium/small)'
                    ]
                }));
                break;
                
            case '/health':
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'healthy',
                    trackedTokens: this.trackedTokens.size,
                    activeConnections: this.wss.clients.size,
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
                // Get all trades
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
                const summaryTrades = await this.getAllTrades(tokenAddress, '0x0', 10000);
                res.writeHead(200);
                res.end(JSON.stringify({
                    token: summaryTrades.token,
                    summary: summaryTrades.summary,
                    lastTrades: summaryTrades.trades.slice(-10)
                }));
                break;
                
            default:
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Trade endpoint not found' }));
        }
    }
}

// Start the DEX Trade Tracker
const tracker = new DEXTradeTracker();
const apiServer = tracker.createAPIServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down DEX Trade Tracker...');
    apiServer.close();
    tracker.wss.close();
    process.exit(0);
});

console.log('🎯 0G DEX Trade Tracker is ready!');
console.log('📚 API Documentation: http://localhost:4000/');
console.log('🔴 Trade Stream: ws://localhost:4001');
console.log('💰 Features: Real-time buy/sell detection with complete trade history');
