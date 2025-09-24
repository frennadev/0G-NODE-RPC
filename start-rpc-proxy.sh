#!/bin/bash

set -e

echo "🚀 Starting 0G RPC Proxy (No Sync Required!)"

# Set environment variables
export OFFICIAL_RPC="https://evmrpc.0g.ai/"
export TESTNET_RPC="https://evmrpc-testnet.0g.ai/"
export PROXY_PORT="${PORT:-26657}"

echo "📍 Proxy Configuration:"
echo "   Official RPC: $OFFICIAL_RPC"
echo "   Testnet RPC: $TESTNET_RPC"
echo "   Proxy Port: $PROXY_PORT"

# Create a simple Node.js proxy server
cat > proxy-server.js << 'EOF'
const http = require('http');
const https = require('https');
const url = require('url');

const OFFICIAL_RPC = process.env.OFFICIAL_RPC || 'https://evmrpc.0g.ai/';
const TESTNET_RPC = process.env.TESTNET_RPC || 'https://evmrpc-testnet.0g.ai/';
const PORT = process.env.PROXY_PORT || 26657;

// Default to mainnet, but allow switching via query param
function getTargetRPC(req) {
    const query = url.parse(req.url, true).query;
    return query.network === 'testnet' ? TESTNET_RPC : OFFICIAL_RPC;
}

const server = http.createServer((req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check endpoint
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            message: '0G RPC Proxy is running',
            mainnet_rpc: OFFICIAL_RPC,
            testnet_rpc: TESTNET_RPC,
            usage: {
                mainnet: `POST ${req.headers.host}/`,
                testnet: `POST ${req.headers.host}/?network=testnet`
            }
        }));
        return;
    }

    // Proxy RPC requests
    if (req.method === 'POST') {
        const targetRPC = getTargetRPC(req);
        const targetUrl = new URL(targetRPC);
        
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            const options = {
                hostname: targetUrl.hostname,
                port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
                path: targetUrl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            const protocol = targetUrl.protocol === 'https:' ? https : http;
            const proxyReq = protocol.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (err) => {
                console.error('Proxy error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    error: { code: -32603, message: 'Proxy error: ' + err.message },
                    id: null
                }));
            });

            proxyReq.write(body);
            proxyReq.end();
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Method not allowed. Use POST for RPC calls.'
        }));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 0G RPC Proxy running on port ${PORT}`);
    console.log(`📡 Proxying to: ${OFFICIAL_RPC}`);
    console.log(`🧪 Testnet available via: ?network=testnet`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down proxy server...');
    server.close(() => {
        console.log('✅ Proxy server stopped');
        process.exit(0);
    });
});
EOF

# Install Node.js if not available (for Ubuntu/Debian)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "⚡ Starting RPC Proxy Server..."
node proxy-server.js
