#!/bin/bash

echo "🔍 Geth Debug Script"
echo "==================="

# Add to the startup script to help debug
echo "📋 Geth process status:"
ps aux | grep geth || echo "No geth process found"

echo ""
echo "📋 Network connections on port 8545:"
netstat -tlnp | grep 8545 || echo "Port 8545 not listening"

echo ""
echo "📋 Geth log (last 20 lines):"
tail -20 /data/log/geth.log 2>/dev/null || echo "No geth.log found"

echo ""
echo "📋 Test internal RPC connection:"
curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' || echo "Internal RPC connection failed"

echo ""
echo "📋 Test localhost RPC connection:"
curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' || echo "Localhost RPC connection failed"

echo ""
echo "📋 Geth config file check:"
grep -A5 -B5 "HTTPEnabled\|HTTPHost\|HTTPPort" /app/geth-config.toml || echo "HTTP config not found"
