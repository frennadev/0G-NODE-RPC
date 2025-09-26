# 🚀 0G Chain Live Data Endpoints - Complete API Reference

## 📡 **Your Live 0G Node Endpoints**
- **Base URL**: `https://zerog-node-rpc.onrender.com`
- **WebSocket**: `wss://zerog-node-rpc.onrender.com/ws`
- **Health Check**: `https://zerog-node-rpc.onrender.com/health`

---

## 🔥 **Live Trade Streaming (Custom APIs)**

### **📊 Token Trade Data**
```bash
# Get recent trades for any token
GET https://zerog-node-rpc.onrender.com/api/trades/{tokenAddress}?limit=100

# Examples
curl "https://zerog-node-rpc.onrender.com/api/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?limit=50"
curl "https://zerog-node-rpc.onrender.com/api/trades/0xYourTokenAddress?limit=100"
```

**Response Format:**
```json
{
  "token": {
    "address": "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
    "name": "PAI Token",
    "symbol": "PAI",
    "decimals": 18,
    "totalSupply": "1000000000000000000000000000"
  },
  "trades": [
    {
      "transactionHash": "0xabc123...",
      "blockNumber": 6741500,
      "timestamp": 1727140923,
      "from": "0x1234...",
      "to": "0x5678...",
      "amount": "54200061641000000000",
      "amountFormatted": "54.200061641",
      "ethValue": "99000000000000000",
      "ethValueFormatted": 0.099,
      "totalCost": 0.099,
      "pricePerToken": 0.0018265661883511734,
      "type": "BUY",
      "classification": "medium",
      "tokenSymbol": "PAI"
    }
  ],
  "summary": {
    "totalTrades": 156,
    "totalVolume": 12.45,
    "avgPrice": 0.00182,
    "whaleCount": 3,
    "buyCount": 89,
    "sellCount": 67
  }
}
```

### **🔴 Real-Time WebSocket Streaming**
```javascript
const ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');

// Subscribe to live trades
ws.send(JSON.stringify({
    type: 'subscribe_live_trades',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
}));

// Get historical trades via WebSocket
ws.send(JSON.stringify({
    type: 'get_token_trades',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C',
    limit: 100
}));
```

---

## ⚡ **Standard 0G RPC Endpoints (Proxied)**

### **🏦 Wallet & Balance Information**

#### **Get Wallet Balance**
```bash
# Get 0G balance for any wallet
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBalance",
    "params": ["0xYourWalletAddress", "latest"],
    "id": 1
  }'
```

#### **Get Transaction Count (Nonce)**
```bash
# Get transaction count for wallet
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getTransactionCount",
    "params": ["0xYourWalletAddress", "latest"],
    "id": 1
  }'
```

### **🪙 Token Information**

#### **Get Token Details (ERC-20)**
```bash
# Get token name
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "0xTokenAddress",
      "data": "0x06fdde03"
    }, "latest"],
    "id": 1
  }'

# Get token symbol
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "0xTokenAddress", 
      "data": "0x95d89b41"
    }, "latest"],
    "id": 1
  }'

# Get token decimals
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "0xTokenAddress",
      "data": "0x313ce567"
    }, "latest"],
    "id": 1
  }'

# Get token total supply
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "0xTokenAddress",
      "data": "0x18160ddd"
    }, "latest"],
    "id": 1
  }'

# Get token balance for wallet
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "0xTokenAddress",
      "data": "0x70a08231000000000000000000000000YourWalletAddress"
    }, "latest"],
    "id": 1
  }'
```

### **📦 Block & Transaction Data**

#### **Get Latest Block**
```bash
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }'
```

#### **Get Block Details**
```bash
# Get block by number
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBlockByNumber",
    "params": ["0x66A1B2", true],
    "id": 1
  }'

# Get block by hash
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBlockByHash",
    "params": ["0xBlockHash", true],
    "id": 1
  }'
```

#### **Get Transaction Details**
```bash
# Get transaction by hash
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getTransactionByHash",
    "params": ["0xTransactionHash"],
    "id": 1
  }'

# Get transaction receipt
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getTransactionReceipt",
    "params": ["0xTransactionHash"],
    "id": 1
  }'
```

### **📋 Event Logs & Transfers**

#### **Get Token Transfer Events**
```bash
# Get all transfers for a token in recent blocks
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [{
      "fromBlock": "0x66A000",
      "toBlock": "latest",
      "address": "0xTokenAddress",
      "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
    }],
    "id": 1
  }'

# Get transfers involving specific wallet
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [{
      "fromBlock": "0x66A000",
      "toBlock": "latest",
      "topics": [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x000000000000000000000000YourWalletAddress"
      ]
    }],
    "id": 1
  }'
```

### **⛽ Gas & Network Info**

#### **Get Gas Information**
```bash
# Current gas price
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_gasPrice",
    "params": [],
    "id": 1
  }'

# Gas fee history
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_feeHistory",
    "params": ["0x14", "latest", [25, 50, 75]],
    "id": 1
  }'

# Estimate gas for transaction
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_estimateGas",
    "params": [{
      "from": "0xFromAddress",
      "to": "0xToAddress",
      "value": "0x9184e72a000",
      "data": "0x"
    }],
    "id": 1
  }'
```

#### **Network Status**
```bash
# Chain ID
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_chainId",
    "params": [],
    "id": 1
  }'

# Network version
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "net_version",
    "params": [],
    "id": 1
  }'

# Peer count
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "net_peerCount",
    "params": [],
    "id": 1
  }'

# Sync status
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_syncing",
    "params": [],
    "id": 1
  }'
```

---

## 🎯 **Specialized Use Cases**

### **🐋 Whale Tracking**
```javascript
// Monitor large transfers in real-time
const ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'live_trades') {
        const whaleTrades = data.trades.filter(t => t.classification === 'whale');
        if (whaleTrades.length > 0) {
            console.log('🐋 WHALE ALERT:', whaleTrades);
        }
    }
};
```

### **💰 Portfolio Tracking**
```bash
# Track multiple tokens for a wallet
WALLET="0xYourWalletAddress"

# Get 0G balance
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$WALLET\",\"latest\"],\"id\":1}"

# Get PAI balance
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"0x59ef6F3943bBdFE2fB19565037Ac85071223E94C\",\"data\":\"0x70a08231000000000000000000000000${WALLET:2}\"}],\"id\":1}"
```

### **📈 Price Monitoring**
```javascript
// Get real-time price updates
const ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');
ws.send(JSON.stringify({
    type: 'subscribe_live_trades',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
}));

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'live_trades') {
        data.trades.forEach(trade => {
            console.log(`${trade.tokenSymbol} Price: ${trade.pricePerToken} 0G per token`);
        });
    }
};
```

### **🔍 Contract Analysis**
```bash
# Get contract code
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getCode",
    "params": ["0xContractAddress", "latest"],
    "id": 1
  }'

# Check if address is contract
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getCode",
    "params": ["0xAddress", "latest"],
    "id": 1
  }' | jq -r '.result' | grep -q "^0x$" && echo "EOA" || echo "Contract"
```

---

## 🚀 **JavaScript SDK Examples**

### **Complete Token Tracker**
```javascript
class ZeroGTokenTracker {
    constructor() {
        this.ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');
        this.rpcUrl = 'https://zerog-node-rpc.onrender.com';
    }
    
    // Subscribe to live trades
    subscribeToToken(tokenAddress) {
        this.ws.send(JSON.stringify({
            type: 'subscribe_live_trades',
            tokenAddress: tokenAddress
        }));
    }
    
    // Get token info
    async getTokenInfo(tokenAddress) {
        const response = await fetch(`${this.rpcUrl}/api/trades/${tokenAddress}?limit=1`);
        const data = await response.json();
        return data.token;
    }
    
    // Get wallet balance
    async getBalance(walletAddress) {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [walletAddress, 'latest'],
                id: 1
            })
        });
        const data = await response.json();
        return parseInt(data.result, 16) / Math.pow(10, 18);
    }
}

// Usage
const tracker = new ZeroGTokenTracker();
tracker.subscribeToToken('0x59ef6F3943bBdFE2fB19565037Ac85071223E94C');
```

---

## 📊 **Rate Limits & Performance**

- **Rate Limit**: 40 requests per second
- **WebSocket**: Unlimited connections
- **Real-time Latency**: <2 seconds from blockchain
- **Historical Data**: Last 1000 blocks per request
- **Uptime**: 99.9% (PM2 clustering with auto-restart)

---

## 🔧 **Network Switching**

### **Testnet Access**
Add `?network=testnet` to any RPC call:
```bash
curl -X POST "https://zerog-node-rpc.onrender.com?network=testnet" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## 💰 **USD Price Data (NEW!)**

### **🔥 Get 0G Token Price in USD**
```bash
# Get current 0G price with market data
GET https://zerog-node-rpc.onrender.com/api/price

# Response
{
  "usd": 3.79,
  "eth": 0.0009758,
  "change24h": -4.75,
  "marketCap": 815455573.70,
  "volume24h": 279246728.21,
  "source": "CoinGecko",
  "lastUpdated": 1758883778643,
  "cacheAge": 0
}
```

### **💹 Enhanced Trade Data with USD Values**
All trade endpoints now include USD pricing:
```bash
# Get trades with USD values
curl "https://zerog-node-rpc.onrender.com/api/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?limit=10&includeUSD=true"
```

**Enhanced Response Format:**
```json
{
  "trades": [
    {
      "transactionHash": "0xabc123...",
      "amount": "54.200061641",
      "ethValueFormatted": 0.099,
      "pricePerToken": 0.00182,
      "usdValue": 0.375,
      "pricePerTokenUSD": 0.00692,
      "ogPriceUSD": 3.79,
      "ogChange24h": -4.75,
      "priceSource": "CoinGecko",
      "type": "BUY"
    }
  ]
}
```

### **🧮 USD Conversion Utilities**
```javascript
// Convert any 0G amount to USD
const response = await fetch('https://zerog-node-rpc.onrender.com/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 10.5, from: '0G', to: 'USD' })
});
// Returns: { "amount": 10.5, "usdValue": 39.795, "rate": 3.79 }
```

---

## 🎉 **Your Complete 0G Data Arsenal**

✅ **Live Trade Streaming** - Real-time buy/sell detection  
✅ **Wallet Tracking** - Balance and transaction monitoring  
✅ **Token Analytics** - Price, volume, whale detection  
✅ **Block Monitoring** - Latest blocks and transactions  
✅ **Event Logs** - Transfer and contract events  
✅ **Gas Tracking** - Current prices and fee history  
✅ **Network Status** - Chain health and peer info  
✅ **Contract Analysis** - Code and interaction data  

**Your node provides everything needed for comprehensive 0G Chain analysis and real-time monitoring!** 🚀

