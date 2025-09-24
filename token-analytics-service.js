const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const url = require('url');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://zerog-node-rpc.onrender.com/';
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Token Analytics Service
class TokenAnalyticsService {
    constructor() {
        this.trackedTokens = new Map();
        this.subscribers = new Map();
        this.priceCache = new Map();
        this.volumeCache = new Map();
        this.holderCache = new Map();
        
        // Initialize WebSocket server
        this.wss = new WebSocket.Server({ port: WS_PORT });
        this.setupWebSocketServer();
        
        console.log(`🚀 Token Analytics Service starting...`);
        console.log(`📊 API Server: http://localhost:${PORT}`);
        console.log(`🔴 WebSocket: ws://localhost:${WS_PORT}`);
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

            const req = https.request(RPC_URL, options, (res) => {
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
                address: tokenAddress,
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

    // Get recent transfers with buy/sell analysis
    async getTokenTransfers(tokenAddress, fromBlock = 'latest', toBlock = 'latest', limit = 100) {
        try {
            const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
            
            // Calculate block range for recent data
            if (fromBlock === 'latest') {
                const latestBlock = await this.rpcCall('eth_blockNumber');
                fromBlock = '0x' + (parseInt(latestBlock, 16) - 1000).toString(16); // Last 1000 blocks
            }

            const logs = await this.rpcCall('eth_getLogs', [{
                fromBlock: fromBlock,
                toBlock: toBlock,
                address: tokenAddress,
                topics: [transferTopic]
            }]);

            const tokenInfo = await this.getTokenInfo(tokenAddress);
            const transfers = [];

            for (const log of logs.slice(-limit)) {
                const transfer = await this.analyzeTransfer(log, tokenInfo);
                transfers.push(transfer);
            }

            return {
                token: tokenInfo,
                transfers: transfers,
                summary: this.calculateTradingSummary(transfers)
            };
        } catch (error) {
            throw new Error(`Failed to get transfers: ${error.message}`);
        }
    }

    // Analyze individual transfer for buy/sell patterns
    async analyzeTransfer(log, tokenInfo) {
        const from = '0x' + log.topics[1].slice(26);
        const to = '0x' + log.topics[2].slice(26);
        const amount = parseInt(log.data, 16);
        const readableAmount = amount / Math.pow(10, tokenInfo.decimals);

        // Get block details
        const block = await this.rpcCall('eth_getBlockByHash', [log.blockHash, false]);
        const timestamp = parseInt(block.timestamp, 16);

        // Classify transaction type
        let type = 'transfer';
        let classification = 'unknown';

        // Common patterns for buy/sell detection
        const zeroAddress = '0x0000000000000000000000000000000000000000';
        
        if (from === zeroAddress) {
            type = 'mint';
            classification = 'token_creation';
        } else if (to === zeroAddress) {
            type = 'burn';
            classification = 'token_destruction';
        } else {
            // Detect DEX patterns (simplified - would need DEX router addresses for accuracy)
            const isLargeTransfer = readableAmount > (tokenInfo.totalSupply / Math.pow(10, tokenInfo.decimals)) * 0.001; // 0.1% of supply
            
            if (isLargeTransfer) {
                classification = 'large_transfer';
                type = 'whale_movement';
            } else {
                classification = 'regular_transfer';
                type = 'transfer';
            }
        }

        return {
            transactionHash: log.transactionHash,
            blockNumber: parseInt(log.blockNumber, 16),
            timestamp: timestamp,
            from: from,
            to: to,
            amount: amount,
            readableAmount: readableAmount,
            type: type,
            classification: classification,
            logIndex: parseInt(log.logIndex, 16)
        };
    }

    // Calculate trading summary
    calculateTradingSummary(transfers) {
        const now = Math.floor(Date.now() / 1000);
        const oneHour = 3600;
        const oneDay = 86400;

        const recentTransfers = transfers.filter(t => (now - t.timestamp) < oneDay);
        const hourlyTransfers = transfers.filter(t => (now - t.timestamp) < oneHour);

        const totalVolume24h = recentTransfers.reduce((sum, t) => sum + t.readableAmount, 0);
        const totalVolumeHourly = hourlyTransfers.reduce((sum, t) => sum + t.readableAmount, 0);

        const uniqueHolders = new Set([
            ...recentTransfers.map(t => t.from),
            ...recentTransfers.map(t => t.to)
        ]).size;

        return {
            totalTransfers: transfers.length,
            transfers24h: recentTransfers.length,
            transfersHourly: hourlyTransfers.length,
            volume24h: totalVolume24h,
            volumeHourly: totalVolumeHourly,
            uniqueHolders24h: uniqueHolders,
            largeTransfers: transfers.filter(t => t.classification === 'large_transfer').length,
            whaleMovements: transfers.filter(t => t.type === 'whale_movement').length
        };
    }

    // Start tracking a token
    async startTracking(tokenAddress) {
        if (this.trackedTokens.has(tokenAddress)) {
            return this.trackedTokens.get(tokenAddress);
        }

        try {
            const tokenInfo = await this.getTokenInfo(tokenAddress);
            const trackingData = {
                ...tokenInfo,
                startTime: Date.now(),
                lastUpdate: Date.now(),
                subscribers: new Set()
            };

            this.trackedTokens.set(tokenAddress, trackingData);
            
            // Start monitoring for new transfers
            this.monitorToken(tokenAddress);
            
            console.log(`📊 Started tracking token: ${tokenInfo.symbol} (${tokenAddress})`);
            return trackingData;
        } catch (error) {
            throw new Error(`Failed to start tracking: ${error.message}`);
        }
    }

    // Monitor token for real-time updates
    async monitorToken(tokenAddress) {
        const pollInterval = 5000; // 5 seconds
        
        const poll = async () => {
            try {
                const latestBlock = await this.rpcCall('eth_blockNumber');
                const fromBlock = '0x' + (parseInt(latestBlock, 16) - 2).toString(16); // Last 2 blocks
                
                const transfers = await this.getTokenTransfers(tokenAddress, fromBlock, 'latest', 10);
                
                if (transfers.transfers.length > 0) {
                    // Broadcast to WebSocket subscribers
                    this.broadcastUpdate(tokenAddress, {
                        type: 'new_transfers',
                        data: transfers,
                        timestamp: Date.now()
                    });
                }
                
                // Update cache
                this.trackedTokens.get(tokenAddress).lastUpdate = Date.now();
                
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
                message: 'Connected to 0G Token Analytics WebSocket'
            }));
        });
    }

    // Handle WebSocket messages
    async handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                if (data.tokenAddress) {
                    await this.subscribeToToken(ws, data.tokenAddress);
                }
                break;
                
            case 'unsubscribe':
                if (data.tokenAddress) {
                    this.unsubscribeFromToken(ws, data.tokenAddress);
                }
                break;
                
            case 'get_token_info':
                if (data.tokenAddress) {
                    const info = await this.getTokenInfo(data.tokenAddress);
                    ws.send(JSON.stringify({
                        type: 'token_info',
                        data: info
                    }));
                }
                break;
                
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }));
        }
    }

    // Subscribe to token updates
    async subscribeToToken(ws, tokenAddress) {
        try {
            const token = await this.startTracking(tokenAddress);
            token.subscribers.add(ws.clientId);
            ws.subscribedTokens.add(tokenAddress);
            
            ws.send(JSON.stringify({
                type: 'subscribed',
                tokenAddress: tokenAddress,
                tokenInfo: token
            }));
            
            console.log(`📺 Client ${ws.clientId} subscribed to ${token.symbol}`);
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                message: `Failed to subscribe: ${error.message}`
            }));
        }
    }

    // Unsubscribe from token
    unsubscribeFromToken(ws, tokenAddress) {
        const token = this.trackedTokens.get(tokenAddress);
        if (token) {
            token.subscribers.delete(ws.clientId);
            ws.subscribedTokens.delete(tokenAddress);
            
            ws.send(JSON.stringify({
                type: 'unsubscribed',
                tokenAddress: tokenAddress
            }));
        }
    }

    // Broadcast update to subscribers
    broadcastUpdate(tokenAddress, update) {
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
        
        server.listen(PORT, () => {
            console.log(`🌐 Token Analytics API running on port ${PORT}`);
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
                    service: '0G Token Analytics API',
                    version: '1.0.0',
                    endpoints: {
                        '/token/{address}': 'Get token information',
                        '/token/{address}/transfers': 'Get token transfers',
                        '/token/{address}/analytics': 'Get trading analytics',
                        '/tracked': 'List tracked tokens',
                        '/health': 'Service health check'
                    },
                    websocket: `ws://localhost:${WS_PORT}`,
                    documentation: 'Real-time token analytics powered by 0G Chain'
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
                
            case '/tracked':
                const tracked = Array.from(this.trackedTokens.entries()).map(([address, token]) => ({
                    address,
                    symbol: token.symbol,
                    name: token.name,
                    subscribers: token.subscribers.size,
                    lastUpdate: token.lastUpdate
                }));
                
                res.writeHead(200);
                res.end(JSON.stringify({ trackedTokens: tracked }));
                break;
                
            default:
                if (path.startsWith('/token/')) {
                    await this.handleTokenAPI(req, res, path, query);
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Endpoint not found' }));
                }
        }
    }

    // Handle token-specific API requests
    async handleTokenAPI(req, res, path, query) {
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
                // Get token info
                const tokenInfo = await this.getTokenInfo(tokenAddress);
                res.writeHead(200);
                res.end(JSON.stringify(tokenInfo));
                break;
                
            case 'transfers':
                const fromBlock = query.fromBlock || 'latest';
                const toBlock = query.toBlock || 'latest';
                const limit = parseInt(query.limit) || 100;
                
                const transfers = await this.getTokenTransfers(tokenAddress, fromBlock, toBlock, limit);
                res.writeHead(200);
                res.end(JSON.stringify(transfers));
                break;
                
            case 'analytics':
                await this.startTracking(tokenAddress);
                const analytics = await this.getTokenTransfers(tokenAddress, 'latest', 'latest', 1000);
                res.writeHead(200);
                res.end(JSON.stringify({
                    token: analytics.token,
                    summary: analytics.summary,
                    recentActivity: analytics.transfers.slice(-10)
                }));
                break;
                
            default:
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Token endpoint not found' }));
        }
    }
}

// Start the service
const service = new TokenAnalyticsService();
const apiServer = service.createAPIServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down Token Analytics Service...');
    apiServer.close();
    service.wss.close();
    process.exit(0);
});

console.log('🎯 0G Token Analytics Service is ready!');
console.log('📚 API Documentation: http://localhost:3000/');
console.log('🔴 WebSocket: ws://localhost:3001');
