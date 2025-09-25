# ⚡ 0G Chain API - Quick Reference

## 🔥 **Most Used Endpoints**

### **Live Trade Streaming**
```bash
# WebSocket
wss://zerog-node-rpc.onrender.com/ws

# REST API  
GET https://zerog-node-rpc.onrender.com/api/trades/{tokenAddress}?limit=100
```

### **Wallet Balance**
```bash
curl -X POST https://zerog-node-rpc.onrender.com \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xWallet","latest"],"id":1}'
```

### **Token Info**
```bash
# Name: 0x06fdde03
# Symbol: 0x95d89b41  
# Decimals: 0x313ce567
# Total Supply: 0x18160ddd
# Balance: 0x70a08231 + wallet_address

curl -X POST https://zerog-node-rpc.onrender.com \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0xToken","data":"0x95d89b41"},"latest"],"id":1}'
```

### **Latest Block**
```bash
curl -X POST https://zerog-node-rpc.onrender.com \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### **Transfer Events**
```bash
curl -X POST https://zerog-node-rpc.onrender.com \
  -d '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{"fromBlock":"0x66A000","toBlock":"latest","address":"0xToken","topics":["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]}],"id":1}'
```

## 🎯 **Your Node URLs**
- **Main**: `https://zerog-node-rpc.onrender.com`
- **WebSocket**: `wss://zerog-node-rpc.onrender.com/ws`
- **Health**: `https://zerog-node-rpc.onrender.com/health`
- **Testnet**: Add `?network=testnet` to any call

## 📊 **Key Features**
- ✅ Real-time trade streaming
- ✅ 40 RPS rate limit
- ✅ Whale detection
- ✅ Price tracking
- ✅ Portfolio monitoring
- ✅ Event log analysis
