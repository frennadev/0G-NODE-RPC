# 🚀 0G Enhanced Node + Trade Streaming - Deployment Guide

## 📋 Overview

Your enhanced 0G node now includes **both** the RPC proxy and the complete trade streaming service in a single Docker container, optimized for your Render Pro plan.

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Render Pro Container                     │
├─────────────────────────────────────────────────────────────┤
│  PM2 Process Manager (6 processes total)                   │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │   RPC Proxy (4x)    │  │  Trade Streaming (2x)       │   │
│  │                     │  │                             │   │
│  │  Port: 26657        │  │  API Port: 6000             │   │
│  │  Monitor: 9615      │  │  WebSocket: 6001            │   │
│  │                     │  │                             │   │
│  │  ✅ Enhanced Proxy  │  │  ✅ Real-time Trades       │   │
│  │  ✅ Load Balanced   │  │  ✅ Complete History       │   │
│  │  ✅ Monitoring      │  │  ✅ Buy/Sell Detection     │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **Deployment Instructions**

### **Step 1: Push to GitHub**
```bash
# Commit all changes
git add .
git commit -m "🚀 Enhanced Node + Trade Streaming - Single Container Deployment"
git push origin main
```

### **Step 2: Deploy to Render**

1. **Go to your Render Dashboard**: https://dashboard.render.com
2. **Find your existing service**: `og-chain-node-enhanced`
3. **Trigger Manual Deploy** or wait for auto-deploy from GitHub

### **Step 3: Verify Deployment**

Once deployed, your service will be available at:
```
https://zerog-node-rpc.onrender.com/
```

## 🌐 **Service Endpoints**

### **🔗 RPC Proxy (Existing)**
```bash
# Main RPC endpoint
https://zerog-node-rpc.onrender.com/

# Health check
https://zerog-node-rpc.onrender.com/health

# Monitoring stats
https://zerog-node-rpc.onrender.com/stats
```

### **📊 Trade Streaming API (NEW)**
```bash
# Trade API base
https://zerog-node-rpc.onrender.com:6000/

# Health check
https://zerog-node-rpc.onrender.com:6000/health

# Get all trades for a token
https://zerog-node-rpc.onrender.com:6000/trades/{TOKEN_ADDRESS}

# Get trade summary
https://zerog-node-rpc.onrender.com:6000/trades/{TOKEN_ADDRESS}/summary

# WebSocket streaming
wss://zerog-node-rpc.onrender.com:6001/
```

### **🎯 Dashboard (NEW)**
```bash
# Professional trading dashboard
https://zerog-node-rpc.onrender.com:6000/public/
```

## 📝 **API Usage Examples**

### **1. Get Complete PAI Token Trade History**
```bash
curl "https://zerog-node-rpc.onrender.com:6000/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C/summary"
```

**Response:**
```json
{
  "token": {
    "name": "Panda AI",
    "symbol": "PAI",
    "decimals": 9
  },
  "summary": {
    "totalTrades": 1170,
    "totalBuys": 881,
    "totalSells": 196,
    "volume24h": 2311477119.27,
    "buyPressure": 81.8,
    "whaleTradesCount": 66
  }
}
```

### **2. Stream Live Trades via WebSocket**
```javascript
const ws = new WebSocket('wss://zerog-node-rpc.onrender.com:6001/');

ws.onopen = () => {
    // Subscribe to PAI token trades
    ws.send(JSON.stringify({
        type: 'subscribe_trades',
        tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'new_trades') {
        console.log(`🔥 ${data.trades.length} new trades detected!`);
        data.trades.forEach(trade => {
            console.log(`${trade.type.toUpperCase()}: ${trade.tokenAmountFormatted} PAI`);
        });
    }
};
```

### **3. Trading Bot Integration**
```javascript
// Monitor whale movements
const monitorWhales = async () => {
    const response = await fetch('https://zerog-node-rpc.onrender.com:6000/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C/recent?limit=10');
    const data = await response.json();
    
    const whales = data.trades.filter(trade => trade.classification === 'whale');
    whales.forEach(whale => {
        console.log(`🐋 WHALE ${whale.type.toUpperCase()}: ${whale.tokenAmountFormatted.toLocaleString()} PAI`);
        // Execute your trading strategy here
    });
};

setInterval(monitorWhales, 30000); // Check every 30 seconds
```

## 🔧 **Configuration**

### **Environment Variables (Already Set)**
```yaml
OFFICIAL_RPC: "https://evmrpc.0g.ai/"
TESTNET_RPC: "https://evmrpc-testnet.0g.ai/"
PROXY_PORT: "26657"
MONITORING_PORT: "9615"
TRADE_API_PORT: "6000"
TRADE_WS_PORT: "6001"
RPC_URL: "http://localhost:26657/"
NODE_ENV: "production"
PM2_INSTANCES: "4"
```

### **Resource Allocation**
- **CPU**: 4000m (Full Pro plan)
- **Memory**: 16Gi (Full Pro plan)
- **Processes**: 6 total (4 RPC proxy + 2 trade streaming)
- **Load Balancing**: Automatic with PM2

## 📊 **Monitoring & Health Checks**

### **Service Health**
```bash
# Check overall service health
curl https://zerog-node-rpc.onrender.com/health

# Check trade streaming health
curl https://zerog-node-rpc.onrender.com:6000/health
```

### **Performance Monitoring**
```bash
# RPC proxy statistics
curl https://zerog-node-rpc.onrender.com/stats

# Trade streaming statistics
curl https://zerog-node-rpc.onrender.com:6000/health
```

## 🎯 **Use Cases**

### **1. DeFi Trading Bots**
- Monitor whale movements in real-time
- Get buy/sell signals from trade patterns
- Track volume spikes and unusual activity

### **2. Portfolio Management**
- Track token holdings across addresses
- Monitor large transfers affecting prices
- Analyze trading patterns and trends

### **3. Market Analysis**
- Identify emerging tokens with high activity
- Track holder distribution changes
- Monitor liquidity movements

### **4. Security Monitoring**
- Detect unusual transfer patterns
- Monitor for potential rug pulls
- Track large token movements

## 🚀 **Performance Metrics**

### **Expected Performance:**
- **RPC Response Time**: <200ms average
- **Trade Detection**: Real-time (5-second polling)
- **WebSocket Latency**: <100ms
- **Concurrent Users**: 1000+ supported
- **Trade History**: Complete from token inception
- **Uptime**: 99.9% (Render Pro SLA)

## 🔥 **What's Included**

✅ **Enhanced RPC Proxy** - Your existing high-performance proxy  
✅ **Complete Trade Streaming** - Real-time buy/sell detection  
✅ **Professional Dashboard** - Visual trade monitoring interface  
✅ **WebSocket Streaming** - Live trade notifications  
✅ **Complete API** - RESTful endpoints for all data  
✅ **Whale Detection** - Automatic large trade identification  
✅ **Exchange Recognition** - Smart DEX/exchange pattern detection  
✅ **Load Balancing** - PM2 process management  
✅ **Health Monitoring** - Comprehensive service monitoring  

## 🎉 **Ready to Use!**

After deployment, you'll have:

1. **Your existing RPC proxy** at `https://zerog-node-rpc.onrender.com/`
2. **Complete trade streaming API** at `https://zerog-node-rpc.onrender.com:6000/`
3. **Real-time WebSocket stream** at `wss://zerog-node-rpc.onrender.com:6001/`
4. **Professional dashboard** at `https://zerog-node-rpc.onrender.com:6000/public/`

**All running in a single container on your existing Render Pro plan!** 🚀