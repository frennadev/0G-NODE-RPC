const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Unified 0G Service - RPC Proxy + Trade Streaming
class UnifiedOGService {
    constructor() {
        this.rpcUrl = process.env.OFFICIAL_RPC || 'https://evmrpc.0g.ai/';
        this.testnetRpcUrl = process.env.TESTNET_RPC || 'https://evmrpc-testnet.0g.ai/';
        this.port = process.env.PORT || process.env.PROXY_PORT || 26657;
        this.wsPort = process.env.WS_PORT || 26658;
        
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
        
        // Start real-time monitoring
        this.startRealTimeMonitoring();
        
        console.log(`🚀 Unified 0G Service starting...`);
        console.log(`📊 HTTP Server: http://localhost:${this.port}`);
        console.log(`🔴 WebSocket: ws://localhost:${this.wsPort}`);
        console.log(`⚡ Rate Limiting: ${this.maxRequestsPerSecond} RPS max`);
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

    // RPC call to 0G chain (now with rate limiting)
    async rpcCall(method, params = [], network = 'mainnet') {
        return new Promise((resolve, reject) => {
            // Add to queue for rate limiting
            this.requestQueue.push({
                method,
                params,
                network,
                resolve,
                reject,
                timestamp: Date.now()
            });
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
            }]);

            const trades = [];
            for (const log of logs.slice(-limit)) {
                const from = '0x' + log.topics[1].slice(26);
                const to = '0x' + log.topics[2].slice(26);
                const amount = parseInt(log.data, 16);
                
                // OPTIMIZED: Get ONLY transaction details for 0G amounts (1 API call instead of 3!)
                const txDetails = await this.rpcCall('eth_getTransactionByHash', [log.transactionHash]);
                
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
                    console.log(`🆕 New block detected: ${currentBlockNumber} (processing ${currentBlockNumber - lastProcessedBlock} new blocks)`);
                    
                    // Process new blocks
                    for (let blockNum = lastProcessedBlock + 1; blockNum <= currentBlockNumber; blockNum++) {
                        await this.processNewBlock(blockNum);
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
                }]);
                
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
                    
                    const newTrades = [];
                    
                    for (const log of logs) {
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
    
    // Process individual transfer log with 0G/ETH amounts (OPTIMIZED - Skip gas & block details)
    async processTransferLog(log, tokenInfo) {
        try {
            const from = '0x' + log.topics[1].slice(26);
            const to = '0x' + log.topics[2].slice(26);
            const amount = parseInt(log.data, 16);
            
            // Get ONLY transaction details for 0G amounts (1 API call instead of 3!)
            const txDetails = await this.rpcCall('eth_getTransactionByHash', [log.transactionHash]);
            
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
                if (req.method === 'POST' && path === '/') {
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
