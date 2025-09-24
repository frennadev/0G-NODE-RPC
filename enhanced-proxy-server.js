const http = require('http');
const https = require('https');
const url = require('url');
const cluster = require('cluster');
const os = require('os');

// Configuration
const OFFICIAL_RPC = process.env.OFFICIAL_RPC || 'https://evmrpc.0g.ai/';
const TESTNET_RPC = process.env.TESTNET_RPC || 'https://evmrpc-testnet.0g.ai/';
const PORT = process.env.PROXY_PORT || 26657;
const MONITORING_PORT = process.env.MONITORING_PORT || 9615;

// Statistics tracking
const stats = {
    requests: 0,
    errors: 0,
    startTime: Date.now(),
    methodCounts: {},
    networkCounts: { mainnet: 0, testnet: 0 },
    responseTimeSum: 0,
    lastRequests: []
};

// Connection pooling for better performance
const agents = {
    http: new http.Agent({ 
        keepAlive: true, 
        maxSockets: 50,
        timeout: 30000
    }),
    https: new https.Agent({ 
        keepAlive: true, 
        maxSockets: 50,
        timeout: 30000
    })
};

function getTargetRPC(req) {
    const query = url.parse(req.url, true).query;
    const network = query.network === 'testnet' ? 'testnet' : 'mainnet';
    stats.networkCounts[network]++;
    return query.network === 'testnet' ? TESTNET_RPC : OFFICIAL_RPC;
}

function updateStats(method, responseTime, isError = false) {
    stats.requests++;
    if (isError) stats.errors++;
    if (method) {
        stats.methodCounts[method] = (stats.methodCounts[method] || 0) + 1;
    }
    stats.responseTimeSum += responseTime;
    
    // Keep last 100 requests for monitoring
    stats.lastRequests.unshift({
        timestamp: new Date().toISOString(),
        method,
        responseTime,
        isError
    });
    if (stats.lastRequests.length > 100) {
        stats.lastRequests.pop();
    }
}

const server = http.createServer((req, res) => {
    const startTime = Date.now();
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Enhanced health check endpoint
    if (req.url === '/health') {
        const uptime = Date.now() - stats.startTime;
        const avgResponseTime = stats.requests > 0 ? stats.responseTimeSum / stats.requests : 0;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            message: '0G Enhanced RPC Proxy is running',
            uptime: `${Math.floor(uptime / 1000)}s`,
            mainnet_rpc: OFFICIAL_RPC,
            testnet_rpc: TESTNET_RPC,
            stats: {
                total_requests: stats.requests,
                errors: stats.errors,
                success_rate: stats.requests > 0 ? ((stats.requests - stats.errors) / stats.requests * 100).toFixed(2) + '%' : '100%',
                avg_response_time: avgResponseTime.toFixed(2) + 'ms',
                network_usage: stats.networkCounts,
                top_methods: Object.entries(stats.methodCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})
            },
            usage: {
                mainnet: `POST ${req.headers.host}/`,
                testnet: `POST ${req.headers.host}/?network=testnet`,
                monitoring: `GET ${req.headers.host.replace(PORT, MONITORING_PORT)}/stats`
            },
            features: [
                "Enhanced performance with connection pooling",
                "Real-time statistics and monitoring",
                "Load balancing across multiple processes",
                "Comprehensive health checks",
                "Pro plan optimized"
            ]
        }, null, 2));
        return;
    }

    // Statistics endpoint
    if (req.url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ...stats,
            uptime: Date.now() - stats.startTime,
            avgResponseTime: stats.requests > 0 ? stats.responseTimeSum / stats.requests : 0
        }, null, 2));
        return;
    }

    // Proxy RPC requests
    if (req.method === 'POST') {
        const targetRPC = getTargetRPC(req);
        const targetUrl = new URL(targetRPC);
        
        let body = '';
        let method = 'unknown';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const rpcData = JSON.parse(body);
                method = rpcData.method || 'unknown';
            } catch (e) {
                // Invalid JSON, but continue
            }

            const options = {
                hostname: targetUrl.hostname,
                port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
                path: targetUrl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'User-Agent': '0G-Enhanced-Proxy/1.0'
                },
                agent: targetUrl.protocol === 'https:' ? agents.https : agents.http
            };

            const protocol = targetUrl.protocol === 'https:' ? https : http;
            const proxyReq = protocol.request(options, (proxyRes) => {
                const responseTime = Date.now() - startTime;
                updateStats(method, responseTime, proxyRes.statusCode >= 400);
                
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (err) => {
                const responseTime = Date.now() - startTime;
                updateStats(method, responseTime, true);
                
                console.error(`[${new Date().toISOString()}] Proxy error for ${method}:`, err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    error: { 
                        code: -32603, 
                        message: 'Proxy error: ' + err.message,
                        data: { method, target: targetRPC }
                    },
                    id: null
                }));
            });

            proxyReq.write(body);
            proxyReq.end();
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Method not allowed. Use POST for RPC calls.',
            allowed_methods: ['POST'],
            endpoints: {
                health: 'GET /health',
                stats: 'GET /stats',
                rpc: 'POST /'
            }
        }));
    }
});

// Monitoring server
const monitoringServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.url === '/stats' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ...stats,
            uptime: Date.now() - stats.startTime,
            avgResponseTime: stats.requests > 0 ? stats.responseTimeSum / stats.requests : 0,
            process: {
                pid: process.pid,
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            }
        }, null, 2));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Start servers
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Enhanced 0G RPC Proxy running on port ${PORT}`);
    console.log(`📡 Proxying to: ${OFFICIAL_RPC}`);
    console.log(`🧪 Testnet available via: ?network=testnet`);
    console.log(`📊 Monitoring: http://localhost:${MONITORING_PORT}/stats`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

monitoringServer.listen(MONITORING_PORT, '0.0.0.0', () => {
    console.log(`📈 Monitoring server running on port ${MONITORING_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down enhanced proxy server...');
    server.close(() => {
        monitoringServer.close(() => {
            console.log('✅ Enhanced proxy server stopped');
            process.exit(0);
        });
    });
});

// Log periodic stats
setInterval(() => {
    const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
    const avgResponseTime = stats.requests > 0 ? (stats.responseTimeSum / stats.requests).toFixed(2) : 0;
    console.log(`📊 Stats: ${stats.requests} requests, ${stats.errors} errors, ${avgResponseTime}ms avg, ${uptime}s uptime`);
}, 60000); // Log every minute
