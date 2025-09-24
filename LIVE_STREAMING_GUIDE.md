# 🚀 0G Chain Live Trade Streaming - Developer Guide

## Quick Start - Get Live Token Trades in 30 Seconds

### 📡 **WebSocket Connection**
```javascript
const ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');

ws.onopen = function() {
    console.log('✅ Connected to 0G Live Stream');
    
    // Subscribe to live trades for any token
    ws.send(JSON.stringify({
        type: 'subscribe_live_trades',
        tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C' // PAI token example
    }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    if (data.type === 'live_trades') {
        data.trades.forEach(trade => {
            console.log(`🔥 ${trade.type}: ${trade.amountFormatted} ${trade.tokenSymbol}`);
            console.log(`💰 Cost: ${trade.ethValueFormatted} 0G + ${trade.gasFee} gas = ${trade.totalCost} 0G total`);
            console.log(`📈 Price: ${trade.pricePerToken} 0G per token`);
        });
    }
};
```

### 🌐 **REST API - Get Historical Trades**
```bash
# Get last 100 trades for any token
curl "https://zerog-node-rpc.onrender.com/api/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?limit=100"
```

```javascript
// JavaScript fetch example
const response = await fetch('https://zerog-node-rpc.onrender.com/api/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?limit=50');
const trades = await response.json();

trades.forEach(trade => {
    console.log(`${trade.type}: ${trade.amountFormatted} ${trade.tokenSymbol} for ${trade.totalCost} 0G`);
});
```

## 📊 **What You Get - Complete Trade Data**

Each trade includes:
```json
{
    "type": "BUY",
    "tokenAddress": "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
    "tokenSymbol": "PAI",
    "amount": "226470723642000000000",
    "amountFormatted": "226.470723642",
    "ethValue": "495000000000000000",
    "ethValueFormatted": 0.495,
    "gasFee": 0.02,
    "totalCost": 0.515,
    "pricePerToken": 0.0021857129788770634,
    "from": "0x1234...",
    "to": "0x5678...",
    "transactionHash": "0xabc123...",
    "blockNumber": 6686309,
    "timestamp": 1727140923,
    "classification": "small"
}
```

## 🎯 **Use Cases**

### **Trading Bot**
```javascript
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'live_trades') {
        data.trades.forEach(trade => {
            if (trade.classification === 'whale' && trade.type === 'BUY') {
                // Whale bought! Execute your strategy
                executeBuyStrategy(trade);
            }
        });
    }
};
```

### **Price Alerts**
```javascript
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'live_trades') {
        data.trades.forEach(trade => {
            if (trade.pricePerToken > 0.003) {
                sendAlert(`🚨 PAI price spike: ${trade.pricePerToken} 0G per token!`);
            }
        });
    }
};
```

### **Volume Tracking**
```javascript
let hourlyVolume = 0;
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'live_trades') {
        data.trades.forEach(trade => {
            hourlyVolume += trade.totalCost;
        });
    }
};
```

## 🔧 **Advanced Features**

### **Multiple Token Monitoring**
```javascript
const tokens = [
    '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C', // PAI
    '0xYourToken1...',
    '0xYourToken2...'
];

tokens.forEach(tokenAddress => {
    ws.send(JSON.stringify({
        type: 'subscribe_live_trades',
        tokenAddress: tokenAddress
    }));
});
```

### **Historical Analysis**
```javascript
// Get trades from specific block range
const response = await fetch('https://zerog-node-rpc.onrender.com/api/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?fromBlock=6680000&toBlock=6690000');
```

## 📈 **Performance**
- **Real-time**: 1-second block monitoring
- **Latency**: <2 seconds from blockchain to your app
- **Reliability**: Auto-reconnect WebSocket with PM2 clustering
- **Scale**: Handles 1000+ concurrent connections

## 🛠 **Error Handling**
```javascript
ws.onerror = function(error) {
    console.error('WebSocket error:', error);
};

ws.onclose = function() {
    console.log('Connection closed, reconnecting...');
    // Implement reconnection logic
    setTimeout(() => {
        connectToStream();
    }, 5000);
};
```

## 🌍 **Endpoints**
- **WebSocket**: `wss://zerog-node-rpc.onrender.com/ws`
- **REST API**: `https://zerog-node-rpc.onrender.com/api/trades/{tokenAddress}`
- **Health Check**: `https://zerog-node-rpc.onrender.com/health`

## 💡 **Pro Tips**
1. **Buffer trades** for batch processing to avoid rate limits
2. **Use classification** field to filter whale vs retail trades  
3. **Monitor pricePerToken** for arbitrage opportunities
4. **Track totalCost** for volume-based strategies
5. **Store historical data** for backtesting strategies

---

**🚀 Start streaming live 0G Chain trades in under 1 minute!**

*Need help? Check the full API docs or create an issue.*
