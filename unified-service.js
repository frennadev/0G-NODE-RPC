const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const url = require('url');
const fs = require('fs');
const path = require('path');
// Try MongoDB first, fallback to file-based auth
let APIAuth;
try {
    APIAuth = require('./mongodb-auth');
    console.log('🍃 Using MongoDB for API authentication');
} catch (error) {
    console.log('⚠️ MongoDB not available, using file-based auth');
    APIAuth = require('./api-auth');
}

// Unified 0G Service - RPC Proxy + Trade Streaming
class UnifiedOGService {
    constructor() {
        this.rpcUrl = process.env.OFFICIAL_RPC || 'https://evmrpc.0g.ai/';
        this.testnetRpcUrl = process.env.TESTNET_RPC || 'https://evmrpc-testnet.0g.ai/';
        this.port = process.env.PORT || process.env.PROXY_PORT || 26657;
        this.wsPort = process.env.WS_PORT || 26658;
        
        // API Authentication
        this.apiAuth = new APIAuth();
        
        // RPC Proxy Stats
        this.rpcStats = {
            startTime: Date.now(),
            totalRequests: 0,
            errors: 0,
            methodCounts: {},
            networkCounts: { mainnet: 0, testnet: 0 },
            responseTimeSum: 0,
            lastRequests: []
        };
        
        // Trade Streaming
        this.trackedTokens = new Map();
        this.addressAnalysis = new Map();
        this.eventSignatures = {
            transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        };
        this.knownPatterns = {
            zeroAddress: '0x0000000000000000000000000000000000000000',
            dexRouters: new Set(),
            highVolumeAddresses: new Set()
        };
        
        // Initialize WebSocket server
        this.wss = new WebSocket.Server({ port: this.wsPort });
        this.setupWebSocketServer();
        
        // Rate limiting and caching
        this.requestQueue = [];
        this.requestsThisSecond = 0;
        this.maxRequestsPerSecond = 40; // Conservative limit to avoid rate limits
        this.lastResetTime = Date.now();
        this.isProcessingQueue = false;
        this.rateLimitBackoff = 1000; // Start with 1 second backoff
        this.maxBackoff = 30000; // Max 30 seconds
        
        // Caches for performance
        this.tokenInfoCache = new Map();
        this.blockCache = new Map();
        this.txCache = new Map();
        
        // Start request queue processor
        this.startRequestQueueProcessor();
        
        // Only start real-time monitoring on the first PM2 instance (or standalone)
        this.shouldMonitorBlocks = this.determineShouldMonitorBlocks();
        if (this.shouldMonitorBlocks) {
            console.log(`🎯 This instance (${process.env.pm_id || 'standalone'}) will monitor blocks`);
            this.startRealTimeMonitoring();
        } else {
            console.log(`⚡ This instance (${process.env.pm_id}) will handle RPC/WebSocket only`);
        }
        
        console.log(`🚀 Unified 0G Service starting...`);
        console.log(`📊 HTTP Server: http://localhost:${this.port}`);
        console.log(`🔴 WebSocket: ws://localhost:${this.wsPort}`);
        console.log(`⚡ Rate Limiting: ${this.maxRequestsPerSecond} RPS max`);
    }

    // Determine if this instance should monitor blocks (PM2 clustering coordination)
    determineShouldMonitorBlocks() {
        // If not running under PM2, always monitor
        if (!process.env.pm_id) {
            return true;
        }
        
        // Only the first PM2 instance (pm_id === '0') monitors blocks
        const pmId = parseInt(process.env.pm_id);
        return pmId === 0;
    }

    // Rate limiting request queue processor
    startRequestQueueProcessor() {
        setInterval(() => {
            const now = Date.now();
            if (now - this.lastResetTime >= 1000) {
                this.requestsThisSecond = 0;
                this.lastResetTime = now;
            }
            
            this.processRequestQueue();
        }, 50); // Check every 50ms
    }
    
    async processRequestQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0 && this.requestsThisSecond < this.maxRequestsPerSecond) {
            const request = this.requestQueue.shift();
            this.requestsThisSecond++;
            
            try {
                const result = await this.makeDirectRpcCall(request.method, request.params, request.network);
                request.resolve(result);
                
                // Reset backoff on success
                this.rateLimitBackoff = Math.max(1000, this.rateLimitBackoff * 0.9);
            } catch (error) {
                if (error.message.includes('rate exceeded') || error.message.includes('Too many requests')) {
                    // Rate limited - put request back and increase backoff
                    this.requestQueue.unshift(request);
                    this.rateLimitBackoff = Math.min(this.maxBackoff, this.rateLimitBackoff * 2);
                    console.log(`⚠️ Rate limited, backing off for ${this.rateLimitBackoff}ms`);
                    
                    // Wait before processing more requests
                    setTimeout(() => {
                        this.isProcessingQueue = false;
                    }, this.rateLimitBackoff);
                    return;
                } else {
                    request.reject(error);
                }
            }
        }
        
        this.isProcessingQueue = false;
    }

    // RPC call to 0G chain (now with rate limiting and prioritization)
    async rpcCall(method, params = [], network = 'mainnet', priority = 'normal') {
        return new Promise((resolve, reject) => {
            const request = {
                method,
                params,
                network,
                resolve,
                reject,
                timestamp: Date.now(),
                priority: priority // 'high', 'normal', 'low'
            };
            
            // Priority-based insertion
            if (priority === 'high') {
                // Insert at beginning for high priority (live trades)
                this.requestQueue.unshift(request);
            } else if (priority === 'low') {
                // Add to end for low priority (historical data)
                this.requestQueue.push(request);
            } else {
                // Normal priority - insert in middle
                const highPriorityCount = this.requestQueue.filter(r => r.priority === 'high').length;
                this.requestQueue.splice(highPriorityCount, 0, request);
            }
        });
    }
    
    // Direct RPC call (used by queue processor)
    async makeDirectRpcCall(method, params = [], network = 'mainnet') {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: Date.now()
            });

            const targetUrl = network === 'testnet' ? this.testnetRpcUrl : this.rpcUrl;
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(targetUrl, options, (res) => {
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
            const data = hex.slice(2 + 64 + 64);
            return Buffer.from(data, 'hex').toString('utf8').replace(/\0/g, '');
        } catch {
            return '';
        }
    }

    // Get token trades (simplified version for unified service)
    async getTokenTrades(tokenAddress, limit = 100) {
        try {
            const tokenInfo = await this.getTokenInfo(tokenAddress);
            
            // Get recent transfer events
            const latestBlock = await this.rpcCall('eth_blockNumber');
            const fromBlock = '0x' + Math.max(0, parseInt(latestBlock, 16) - 1000).toString(16);
            
            const logs = await this.rpcCall('eth_getLogs', [{
                fromBlock: fromBlock,
                toBlock: 'latest',
                address: tokenAddress,
                topics: [this.eventSignatures.transfer]
            }], 'mainnet', 'low'); // LOW PRIORITY for historical data

            // LATEST-FIRST: Take most recent logs and prioritize them
            const recentLogs = logs.slice(-limit); // Get last N logs (most recent)
            const maxProcessableTrades = Math.min(limit, this.getMaxTradesForCurrentLoad() * 5); // Allow more for historical
            
            let logsToProcess = recentLogs;
            if (recentLogs.length > maxProcessableTrades) {
                // Sort by block number + logIndex (latest first) 
                logsToProcess = recentLogs
                    .sort((a, b) => {
                        const blockDiff = parseInt(b.blockNumber, 16) - parseInt(a.blockNumber, 16);
                        if (blockDiff !== 0) return blockDiff;
                        return parseInt(b.logIndex, 16) - parseInt(a.logIndex, 16);
                    })
                    .slice(0, maxProcessableTrades);
                
                console.log(`⚡ Historical request: Processing ${maxProcessableTrades} most recent trades (skipping ${recentLogs.length - maxProcessableTrades} older ones)`);
            }
            
            const trades = [];
            for (const log of logsToProcess) {
                const from = '0x' + log.topics[1].slice(26);
                const to = '0x' + log.topics[2].slice(26);
                const amount = parseInt(log.data, 16);
                
                // OPTIMIZED: Get ONLY transaction details for 0G amounts (1 API call instead of 3!)
                const txDetails = await this.rpcCall('eth_getTransactionByHash', [log.transactionHash], 'mainnet', 'low'); // LOW PRIORITY for historical trade details
                
                // Use current time as timestamp approximation (no extra API call)
                const blockNumber = parseInt(log.blockNumber, 16);
                const estimatedTimestamp = Math.floor(Date.now() / 1000);
                
                // Extract 0G/ETH amounts (no gas fees)
                const ethValue = parseInt(txDetails.value, 16);
                const ethValueFormatted = ethValue / Math.pow(10, 18);
                
                // Calculate price per token (no gas included)
                let pricePerToken = 0;
                if (ethValueFormatted > 0 && amount > 0) {
                    pricePerToken = ethValueFormatted / (amount / Math.pow(10, tokenInfo.decimals));
                }
                
                // Trade classification with 0G consideration
                let type = 'transfer';
                if (from === this.knownPatterns.zeroAddress) type = 'mint';
                else if (to === this.knownPatterns.zeroAddress) type = 'burn';
                else if (this.knownPatterns.highVolumeAddresses.has(from)) type = 'sell';
                else if (this.knownPatterns.highVolumeAddresses.has(to)) type = 'buy';
                else if (ethValueFormatted > 0) type = 'buy'; // If 0G was spent, likely a buy
                
                const classification = this.classifyTradeSize(amount, tokenInfo.totalSupply);
                
                trades.push({
                    transactionHash: log.transactionHash,
                    blockNumber: blockNumber,
                    timestamp: estimatedTimestamp,
                    from: from.toLowerCase(),
                    to: to.toLowerCase(),
                    
                    // Token amounts
                    amount: amount,
                    amountFormatted: amount / Math.pow(10, tokenInfo.decimals),
                    
                    // 0G/ETH amounts (OPTIMIZED - No gas fees)
                    ethValue: ethValue,
                    ethValueFormatted: ethValueFormatted,
                    totalCost: ethValueFormatted, // Just 0G spent, no gas
                    pricePerToken: pricePerToken,
                    
                    // Classification
                    type: type,
                    classification: classification,
                    tokenSymbol: tokenInfo.symbol
                });
            }

            return {
                token: tokenInfo,
                trades: trades,
                summary: this.calculateTradingSummary(trades, tokenInfo)
            };
        } catch (error) {
            throw new Error(`Failed to get trades: ${error.message}`);
        }
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
        const oneDay = 86400;

        const trades24h = trades.filter(t => (now - t.timestamp) < oneDay);
        const buys = trades.filter(t => t.type === 'buy');
        const sells = trades.filter(t => t.type === 'sell');
        const volume24h = trades24h.reduce((sum, t) => sum + t.amountFormatted, 0);

        return {
            totalTrades: trades.length,
            totalBuys: buys.length,
            totalSells: sells.length,
            trades24h: trades24h.length,
            volume24h: volume24h,
            buyPressure: (buys.length + sells.length) > 0 ? 
                        (buys.length / (buys.length + sells.length)) * 100 : 0,
            whaleTradesCount: trades.filter(t => t.classification === 'whale').length,
            largeTradesCount: trades.filter(t => t.classification === 'large').length
        };
    }

    // WebSocket server setup
    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const clientId = Date.now() + Math.random();
            console.log(`🔗 WebSocket client connected: ${clientId}`);
            
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
                console.log(`🔌 WebSocket client disconnected: ${clientId}`);
            });
            
            ws.send(JSON.stringify({
                type: 'connected',
                clientId: clientId,
                message: 'Connected to Unified 0G Service WebSocket'
            }));
        });
    }

    // Start real-time monitoring
    startRealTimeMonitoring() {
        let lastProcessedBlock = null;
        
        const monitorNewBlocks = async () => {
            try {
                const latestBlock = await this.rpcCall('eth_blockNumber');
                const currentBlockNumber = parseInt(latestBlock, 16);
                
                if (lastProcessedBlock === null) {
                    lastProcessedBlock = currentBlockNumber;
                    console.log(`🔍 Starting real-time monitoring from block ${currentBlockNumber}`);
                    return;
                }
                
                if (currentBlockNumber > lastProcessedBlock) {
                    const blocksToProcess = currentBlockNumber - lastProcessedBlock;
                    
                    // CATCH-UP PROTECTION: Don't process too many blocks at once
                    const maxBlocksPerCycle = this.getMaxBlocksForCurrentLoad();
                    
                    if (blocksToProcess > maxBlocksPerCycle) {
                        console.log(`⚠️ Too far behind (${blocksToProcess} blocks), skipping to recent blocks`);
                        // Jump to recent blocks instead of processing everything
                        lastProcessedBlock = currentBlockNumber - Math.min(maxBlocksPerCycle, 10);
                        console.log(`🎯 Jumped to block ${lastProcessedBlock}, will process last ${Math.min(maxBlocksPerCycle, 10)} blocks`);
                    }
                    
                    const actualBlocksToProcess = currentBlockNumber - lastProcessedBlock;
                    if (actualBlocksToProcess > 0) {
                        console.log(`🆕 New block detected: ${currentBlockNumber} (processing ${actualBlocksToProcess} new blocks)`);
                        
                        // Process new blocks (now limited)
                        for (let blockNum = lastProcessedBlock + 1; blockNum <= currentBlockNumber; blockNum++) {
                            await this.processNewBlock(blockNum);
                        }
                    }
                    
                    lastProcessedBlock = currentBlockNumber;
                }
            } catch (error) {
                console.error('❌ Error monitoring new blocks:', error.message);
            }
        };
        
        // Monitor every 1 second for ultra-fast detection
        setInterval(monitorNewBlocks, 1000);
        console.log('🔄 Real-time block monitoring started (1s interval)');
    }
    
    // Process new block for trades
    async processNewBlock(blockNumber) {
        try {
            // Get all transfer events from this block for tracked tokens
            const trackedTokenAddresses = Array.from(this.trackedTokens.keys());
            
            if (trackedTokenAddresses.length === 0) return;
            
            for (const tokenAddress of trackedTokenAddresses) {
                const blockHex = '0x' + blockNumber.toString(16);
                
                const logs = await this.rpcCall('eth_getLogs', [{
                    fromBlock: blockHex,
                    toBlock: blockHex,
                    address: tokenAddress,
                    topics: [this.eventSignatures.transfer]
                }], 'mainnet', 'high'); // HIGH PRIORITY for live trades
                
                if (logs.length > 0) {
                    console.log(`💰 Found ${logs.length} new transfers for ${tokenAddress} in block ${blockNumber}`);
                    
                    // Get full token info for processing
                    let tokenInfo = this.trackedTokens.get(tokenAddress);
                    if (!tokenInfo.decimals) {
                        // If we don't have full token info, fetch it
                        const fullTokenInfo = await this.getTokenInfo(tokenAddress);
                        tokenInfo = { ...tokenInfo, ...fullTokenInfo };
                        this.trackedTokens.set(tokenAddress, tokenInfo);
                    }
                    
                    // LATEST-FIRST STRATEGY: Limit trades per block to stay functional
                    const maxTradesPerBlock = this.getMaxTradesForCurrentLoad();
                    let logsToProcess = logs;
                    
                    if (logs.length > maxTradesPerBlock) {
                        // Sort by logIndex (latest first) and take most recent
                        logsToProcess = logs
                            .sort((a, b) => parseInt(b.logIndex, 16) - parseInt(a.logIndex, 16))
                            .slice(0, maxTradesPerBlock);
                        
                        console.log(`⚡ High activity: Processing ${maxTradesPerBlock} most recent trades (skipping ${logs.length - maxTradesPerBlock} older ones)`);
                    }
                    
                    const newTrades = [];
                    
                    for (const log of logsToProcess) {
                        const trade = await this.processTransferLog(log, tokenInfo);
                        if (trade) {
                            newTrades.push(trade);
                        }
                    }
                    
                    if (newTrades.length > 0) {
                        // Broadcast to WebSocket subscribers
                        this.broadcastToSubscribers(tokenAddress, {
                            type: 'live_trades',
                            tokenAddress: tokenAddress,
                            blockNumber: blockNumber,
                            trades: newTrades,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error processing block ${blockNumber}:`, error.message);
        }
    }
    
    // Adaptive load management - adjust max trades based on current system load
    getMaxTradesForCurrentLoad() {
        const queueLength = this.requestQueue.length;
        const backoffLevel = this.rateLimitBackoff;
        
        // Adaptive limits based on system stress
        if (backoffLevel > 10000) {
            // Heavy rate limiting - very conservative
            return 3;
        } else if (backoffLevel > 5000 || queueLength > 50) {
            // Moderate rate limiting - conservative  
            return 5;
        } else if (queueLength > 20) {
            // Queue building up - reduce load
            return 10;
        } else {
            // Normal operation - process more trades
            return 20;
        }
    }
    
    // Adaptive block processing - adjust max blocks based on current system load
    getMaxBlocksForCurrentLoad() {
        const queueLength = this.requestQueue.length;
        const backoffLevel = this.rateLimitBackoff;
        
        // Adaptive limits for block catch-up based on system stress
        if (backoffLevel > 10000) {
            // Heavy rate limiting - process very few blocks
            return 3;
        } else if (backoffLevel > 5000 || queueLength > 50) {
            // Moderate rate limiting - process fewer blocks
            return 5;
        } else if (queueLength > 20) {
            // Queue building up - limit block processing
            return 10;
        } else {
            // Normal operation - can process more blocks
            return 20;
        }
    }
    
    // Process individual transfer log with 0G/ETH amounts (OPTIMIZED - Skip gas & block details)
    async processTransferLog(log, tokenInfo) {
        try {
            const from = '0x' + log.topics[1].slice(26);
            const to = '0x' + log.topics[2].slice(26);
            const amount = parseInt(log.data, 16);
            
            // Get ONLY transaction details for 0G amounts (1 API call instead of 3!)
            const txDetails = await this.rpcCall('eth_getTransactionByHash', [log.transactionHash], 'mainnet', 'high'); // HIGH PRIORITY for live trade details
            
            // Use block number from log for timestamp approximation (no extra API call)
            const blockNumber = parseInt(log.blockNumber, 16);
            const estimatedTimestamp = Math.floor(Date.now() / 1000); // Current time as fallback
            
            // Extract 0G/ETH value from transaction
            const ethValue = parseInt(txDetails.value, 16);
            const ethValueFormatted = ethValue / Math.pow(10, 18); // Convert wei to ETH/0G
            
            // Calculate price per token (if ETH was spent) - NO GAS FEES
            let pricePerToken = 0;
            if (ethValueFormatted > 0 && amount > 0) {
                pricePerToken = ethValueFormatted / (amount / Math.pow(10, tokenInfo.decimals));
            }
            
            // Classify trade type
            let type = 'transfer';
            if (from === this.knownPatterns.zeroAddress) type = 'mint';
            else if (to === this.knownPatterns.zeroAddress) type = 'burn';
            else if (this.knownPatterns.highVolumeAddresses.has(from)) type = 'sell';
            else if (this.knownPatterns.highVolumeAddresses.has(to)) type = 'buy';
            else if (ethValueFormatted > 0) type = 'buy'; // If ETH was spent, likely a buy
            
            const classification = this.classifyTradeSize(amount, tokenInfo.totalSupply);
            
            return {
                transactionHash: log.transactionHash,
                blockNumber: blockNumber,
                timestamp: estimatedTimestamp,
                from: from.toLowerCase(),
                to: to.toLowerCase(),
                
                // Token amounts
                amount: amount,
                amountFormatted: amount / Math.pow(10, tokenInfo.decimals),
                
                // 0G/ETH amounts (OPTIMIZED - No gas fees)
                ethValue: ethValue,
                ethValueFormatted: ethValueFormatted,
                totalCost: ethValueFormatted, // Just the 0G spent, no gas
                pricePerToken: pricePerToken,
                
                // Trade classification
                type: type,
                classification: classification,
                tokenSymbol: tokenInfo.symbol,
                tokenAddress: tokenInfo.address,
                logIndex: parseInt(log.logIndex, 16),
                isLive: true // Mark as live trade
            };
        } catch (error) {
            console.error('❌ Error processing transfer log:', error.message);
            return null;
        }
    }
    
    // Broadcast to WebSocket subscribers
    broadcastToSubscribers(tokenAddress, message) {
        let subscriberCount = 0;
        
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && 
                client.subscribedTokens && 
                client.subscribedTokens.has(tokenAddress)) {
                client.send(JSON.stringify(message));
                subscriberCount++;
            }
        });
        
        if (subscriberCount > 0) {
            console.log(`📡 Broadcasted live trades to ${subscriberCount} subscribers for ${tokenAddress}`);
        }
    }
    
    // Subscribe to token for real-time updates
    async subscribeToToken(ws, tokenAddress) {
        if (!this.trackedTokens.has(tokenAddress)) {
            // Get full token info and add to tracking
            try {
                const tokenInfo = await this.getTokenInfo(tokenAddress);
                this.trackedTokens.set(tokenAddress, {
                    ...tokenInfo,
                    subscribers: new Set()
                });
                console.log(`📊 Started tracking ${tokenInfo.symbol} (${tokenAddress}) for real-time updates`);
            } catch (error) {
                console.error(`❌ Failed to get token info for ${tokenAddress}:`, error.message);
                // Fallback to basic tracking
                this.trackedTokens.set(tokenAddress, {
                    address: tokenAddress,
                    subscribers: new Set()
                });
            }
        }
        
        // Add client to subscribers
        if (!ws.subscribedTokens) {
            ws.subscribedTokens = new Set();
        }
        ws.subscribedTokens.add(tokenAddress);
        
        const tokenData = this.trackedTokens.get(tokenAddress);
        tokenData.subscribers.add(ws.clientId);
        
        ws.send(JSON.stringify({
            type: 'subscribed',
            tokenAddress: tokenAddress,
            message: `Subscribed to live trades for ${tokenAddress}`
        }));
        
        console.log(`📺 Client ${ws.clientId} subscribed to live trades for ${tokenAddress}`);
    }

    // Handle WebSocket messages
    async handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe_live_trades':
                if (data.tokenAddress) {
                    await this.subscribeToToken(ws, data.tokenAddress);
                }
                break;
                
            case 'get_token_trades':
                if (data.tokenAddress) {
                    const trades = await this.getTokenTrades(data.tokenAddress, data.limit || 100);
                    ws.send(JSON.stringify({
                        type: 'token_trades',
                        data: trades
                    }));
                }
                break;
                
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type. Available: subscribe_live_trades, get_token_trades'
                }));
        }
    }

    // Create unified HTTP server
    createServer() {
        const server = http.createServer(async (req, res) => {
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            
            const parsedUrl = url.parse(req.url, true);
            const path = parsedUrl.pathname;
            const query = parsedUrl.query;
            
            // API Authentication (skip for health, admin, and root RPC)
            if (path !== '/health' && !path.startsWith('/admin') && path !== '/') {
                const apiKey = req.headers['x-api-key'] || 
                              req.headers['authorization']?.replace('Bearer ', '') ||
                              query.apikey;

                const validation = await this.apiAuth.validateRequest(apiKey, path);
                
                if (!validation.valid) {
                    const statusCode = validation.code || 401; // Default to 401 if code is undefined
                    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: validation.error,
                        code: validation.code,
                        message: validation.code === 429 ? 
                            'Rate limit exceeded. Upgrade your plan at /admin' :
                            'Invalid API key. Get your key at /admin'
                    }));
                    return;
                }

                // Add rate limit headers
                res.setHeader('X-RateLimit-Tier', validation.tier);
                res.setHeader('X-RateLimit-Daily-Remaining', validation.usage.dailyLimit - validation.usage.daily);
                res.setHeader('X-RateLimit-Monthly-Remaining', validation.usage.monthlyLimit - validation.usage.monthly);
            }
            
            try {
                if (path.startsWith('/admin')) {
                    // Handle admin panel
                    await this.handleAdminRequest(req, res, path, query);
                } else if (req.method === 'POST' && path === '/') {
                    // Handle RPC requests
                    await this.handleRPCRequest(req, res, query);
                } else if (req.method === 'GET') {
                    // Handle API requests
                    await this.handleAPIRequest(req, res, path, query);
                } else {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Method not allowed. Use POST for RPC calls.',
                        allowed_methods: ['POST'],
                        endpoints: {
                            'health': 'GET /health',
                            'stats': 'GET /stats',
                            'trades': 'GET /trades/{address}',
                            'rpc': 'POST /'
                        }
                    }));
                }
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: error.message,
                    timestamp: new Date().toISOString()
                }));
            }
        });
        
        // Handle WebSocket upgrade on main server
        server.on('upgrade', (request, socket, head) => {
            if (request.url === '/ws' || request.url === '/websocket') {
                this.wss.handleUpgrade(request, socket, head, (ws) => {
                    this.wss.emit('connection', ws, request);
                });
            } else {
                socket.destroy();
            }
        });
        
        server.listen(this.port, () => {
            console.log(`🌐 Unified 0G Service running on port ${this.port}`);
            console.log(`🔴 WebSocket available at: ws://localhost:${this.port}/ws`);
        });
        
        return server;
    }

    // Handle RPC requests (proxy functionality)
    async handleRPCRequest(req, res, query) {
        const requestStartTime = Date.now();
        this.rpcStats.totalRequests++;
        
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                const method = requestData.method;
                this.rpcStats.methodCounts[method] = (this.rpcStats.methodCounts[method] || 0) + 1;

                const network = query.network || 'mainnet';
                this.rpcStats.networkCounts[network]++;

                const targetUrl = network === 'testnet' ? this.testnetRpcUrl : this.rpcUrl;
                
                const proxyReq = https.request(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body)
                    }
                }, proxyRes => {
                    let responseBody = '';
                    proxyRes.on('data', chunk => responseBody += chunk);
                    proxyRes.on('end', () => {
                        const responseTime = Date.now() - requestStartTime;
                        this.rpcStats.responseTimeSum += responseTime;
                        
                        this.rpcStats.lastRequests.unshift({
                            timestamp: new Date().toISOString(),
                            method: method,
                            network: network,
                            responseTime: responseTime,
                            isError: proxyRes.statusCode !== 200
                        });
                        
                        if (this.rpcStats.lastRequests.length > 10) {
                            this.rpcStats.lastRequests.pop();
                        }

                        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(responseBody);
                    });
                });

                proxyReq.on('error', e => {
                    console.error(`Proxy request error: ${e.message}`);
                    this.rpcStats.errors++;
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        jsonrpc: "2.0", 
                        error: { code: -32000, message: `Proxy error: ${e.message}` } 
                    }));
                });

                proxyReq.write(body);
                proxyReq.end();

            } catch (error) {
                console.error('Invalid JSON or proxy error:', error);
                this.rpcStats.errors++;
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    jsonrpc: "2.0", 
                    error: { code: -32700, message: "Parse error: Invalid JSON" } 
                }));
            }
        });
    }

    // Handle admin panel requests
    async handleAdminRequest(req, res, path, query) {
        if (path === '/admin' || path === '/admin/') {
            // Serve embedded admin panel HTML
            const adminHTML = this.getAdminPanelHTML();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(adminHTML);
        } else if (path === '/admin/create-key' && req.method === 'POST') {
            // Create new API key
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { email, tier } = JSON.parse(body);
                    const apiKey = await this.apiAuth.generateKey(email, tier);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        apiKey: apiKey,
                        email: email,
                        tier: tier
                    }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: error.message
                    }));
                }
            });
        } else if (path === '/admin/keys') {
            // Get all API keys
            try {
                const keys = await this.apiAuth.getAllKeys();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    keys: keys
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Admin endpoint not found' }));
        }
    }

    // Handle API requests (trade streaming functionality)
    async handleAPIRequest(req, res, path, query) {
        res.setHeader('Content-Type', 'application/json');
        
        switch (path) {
            case '/health':
                const uptime = Date.now() - this.rpcStats.startTime;
                const avgResponseTime = this.rpcStats.totalRequests > 0 ? 
                    this.rpcStats.responseTimeSum / this.rpcStats.totalRequests : 0;
                
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: "healthy",
                    message: "Unified 0G Service is running",
                    uptime: `${Math.floor(uptime / 1000)}s`,
                    services: {
                        rpc_proxy: "active",
                        trade_streaming: "active",
                        websocket: "active"
                    },
                    endpoints: {
                        mainnet_rpc: this.rpcUrl,
                        testnet_rpc: this.testnetRpcUrl,
                        websocket: `ws://localhost:${this.port}/ws`,
                        websocket_internal: `ws://localhost:${this.wsPort}`
                    },
                    stats: {
                        total_requests: this.rpcStats.totalRequests,
                        errors: this.rpcStats.errors,
                        success_rate: `${((this.rpcStats.totalRequests - this.rpcStats.errors) / this.rpcStats.totalRequests * 100).toFixed(2)}%`,
                        avg_response_time: `${avgResponseTime.toFixed(2)}ms`,
                        network_usage: this.rpcStats.networkCounts,
                        websocket_connections: this.wss.clients.size
                    },
                    features: [
                        "Enhanced RPC proxy with load balancing",
                        "Real-time token trade streaming",
                        "WebSocket live updates",
                        "Complete trade history analysis",
                        "Buy/sell/whale detection"
                    ]
                }));
                break;
                
            case '/stats':
                res.writeHead(200);
                res.end(JSON.stringify(this.rpcStats));
                break;
                
            default:
                if (path.startsWith('/trades/')) {
                    await this.handleTradeAPI(req, res, path, query);
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ 
                        error: 'Endpoint not found',
                        available_endpoints: ['/health', '/stats', '/trades/{address}']
                    }));
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
        
        try {
            const limit = parseInt(query.limit) || 100;
            const trades = await this.getTokenTrades(tokenAddress, limit);
            
            if (action === 'summary') {
                res.writeHead(200);
                res.end(JSON.stringify({
                    token: trades.token,
                    summary: trades.summary,
                    recentTrades: trades.trades.slice(-10)
                }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify(trades));
            }
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    // Get embedded admin panel HTML
    getAdminPanelHTML() {
        return `<!DOCTYPE html>
<html>
<head>
    <title>0G Analytics API - Admin Panel</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .form-group { margin: 10px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a87; }
        .key-list { margin-top: 20px; }
        .key-item { padding: 15px; margin: 10px 0; background: #f9f9f9; border-radius: 5px; border-left: 4px solid #007cba; }
        .usage-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px; }
        .stat { text-align: center; padding: 10px; background: #e9f4ff; border-radius: 4px; }
        .tier-free { border-left-color: #28a745; }
        .tier-pro { border-left-color: #ffc107; }
        .tier-enterprise { border-left-color: #dc3545; }
        .pricing { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px; }
        .plan { padding: 20px; border: 2px solid #ddd; border-radius: 8px; text-align: center; }
        .plan.pro { border-color: #ffc107; }
        .plan.enterprise { border-color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 0G Analytics API - Admin Panel</h1>
            <p>Manage API keys and monitor usage</p>
        </div>

        <!-- Create New API Key -->
        <div class="section">
            <h2>Create New API Key</h2>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" id="email" placeholder="customer@example.com" required>
            </div>
            <div class="form-group">
                <label>Tier:</label>
                <select id="tier">
                    <option value="free">Free (100 requests/day)</option>
                    <option value="pro">Pro (10,000 requests/day)</option>
                    <option value="enterprise">Enterprise (100,000 requests/day)</option>
                </select>
            </div>
            <button onclick="createKey()">Generate API Key</button>
            <div id="newKeyResult" style="margin-top: 15px; padding: 10px; background: #d4edda; border-radius: 4px; display: none;">
                <strong>New API Key Created:</strong><br>
                <code id="newKeyValue" style="background: #f8f9fa; padding: 5px; border-radius: 3px;"></code>
            </div>
        </div>

        <!-- Pricing Plans -->
        <div class="section">
            <h2>Pricing Plans</h2>
            <div class="pricing">
                <div class="plan">
                    <h3>Free</h3>
                    <div style="font-size: 24px; font-weight: bold;">$0/month</div>
                    <ul style="text-align: left;">
                        <li>100 requests/day</li>
                        <li>3,000 requests/month</li>
                        <li>Basic analytics</li>
                        <li>Community support</li>
                    </ul>
                </div>
                <div class="plan pro">
                    <h3>Pro</h3>
                    <div style="font-size: 24px; font-weight: bold;">$99/month</div>
                    <ul style="text-align: left;">
                        <li>10,000 requests/day</li>
                        <li>300,000 requests/month</li>
                        <li>Full analytics suite</li>
                        <li>Priority support</li>
                        <li>USD pricing data</li>
                    </ul>
                </div>
                <div class="plan enterprise">
                    <h3>Enterprise</h3>
                    <div style="font-size: 24px; font-weight: bold;">$499/month</div>
                    <ul style="text-align: left;">
                        <li>100,000 requests/day</li>
                        <li>3,000,000 requests/month</li>
                        <li>Custom analytics</li>
                        <li>Dedicated support</li>
                        <li>SLA guarantee</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- API Keys List -->
        <div class="section">
            <h2>Active API Keys</h2>
            <button onclick="loadKeys()">Refresh Keys</button>
            <div id="keysList" class="key-list">
                <p>Click "Refresh Keys" to load API keys...</p>
            </div>
        </div>

        <!-- Usage Instructions -->
        <div class="section">
            <h2>API Usage Instructions</h2>
            <p><strong>Authentication Methods:</strong></p>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
# Method 1: Header (Recommended)
curl -H "X-API-Key: your_api_key_here" https://zerog-node-rpc.onrender.com/api/price

# Method 2: Bearer Token
curl -H "Authorization: Bearer your_api_key_here" https://zerog-node-rpc.onrender.com/api/price

# Method 3: Query Parameter
curl "https://zerog-node-rpc.onrender.com/api/price?apikey=your_api_key_here"
            </pre>
            
            <p><strong>Available Endpoints:</strong></p>
            <ul>
                <li><code>/api/price</code> - Get 0G token price in USD</li>
                <li><code>/api/analytics/{token}</code> - Complete token analytics</li>
                <li><code>/api/trades/{token}?includeUSD=true</code> - Enhanced trades with USD</li>
                <li><code>/api/convert</code> - Convert 0G to USD</li>
                <li><code>/api/market/summary</code> - Multi-token market overview</li>
            </ul>
        </div>
    </div>

    <script>
        async function createKey() {
            const email = document.getElementById('email').value;
            const tier = document.getElementById('tier').value;
            
            if (!email) {
                alert('Please enter an email address');
                return;
            }
            
            try {
                const response = await fetch('/admin/create-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, tier })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('newKeyValue').textContent = result.apiKey;
                    document.getElementById('newKeyResult').style.display = 'block';
                    document.getElementById('email').value = '';
                    loadKeys(); // Refresh the keys list
                } else {
                    alert('Error creating key: ' + result.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
        
        async function loadKeys() {
            try {
                const response = await fetch('/admin/keys');
                const result = await response.json();
                
                if (result.success) {
                    displayKeys(result.keys);
                } else {
                    document.getElementById('keysList').innerHTML = '<p>Error loading keys: ' + result.error + '</p>';
                }
            } catch (error) {
                document.getElementById('keysList').innerHTML = '<p>Error: ' + error.message + '</p>';
            }
        }
        
        function displayKeys(keys) {
            if (keys.length === 0) {
                document.getElementById('keysList').innerHTML = '<p>No API keys found.</p>';
                return;
            }
            
            let html = '';
            keys.forEach(key => {
                const usage = key.usage;
                html += \`
                    <div class="key-item tier-\${key.tier}">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>\${key.email}</strong> - \${key.tier.toUpperCase()} Plan
                                <br><small>Key: \${key.key} | Created: \${key.created} | Last Used: \${key.lastUsed}</small>
                            </div>
                            <div style="text-align: right;">
                                <span style="color: \${key.active ? 'green' : 'red'};">\${key.active ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                        \${usage ? \`
                        <div class="usage-stats">
                            <div class="stat">
                                <strong>Daily Usage</strong><br>
                                \${usage.daily.used} / \${usage.daily.limit}<br>
                                <small>\${usage.daily.remaining} remaining</small>
                            </div>
                            <div class="stat">
                                <strong>Monthly Usage</strong><br>
                                \${usage.monthly.used} / \${usage.monthly.limit}<br>
                                <small>\${usage.monthly.remaining} remaining</small>
                            </div>
                            <div class="stat">
                                <strong>Total Requests</strong><br>
                                \${usage.total}
                            </div>
                        </div>
                        \` : ''}
                    </div>
                \`;
            });
            
            document.getElementById('keysList').innerHTML = html;
        }
        
        // Load keys on page load
        window.onload = function() {
            loadKeys();
        };
    </script>
</body>
</html>`;
    }
}

// Start the unified service
const service = new UnifiedOGService();
const server = service.createServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down Unified 0G Service...');
    server.close();
    service.wss.close();
    process.exit(0);
});

console.log('🎯 Unified 0G Service is ready!');
console.log('📚 RPC Proxy + Trade Streaming in one service');
console.log('🔴 WebSocket streaming available');
