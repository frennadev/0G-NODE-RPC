# 🚀 0G Token Analytics Service

## 📋 Overview

A comprehensive real-time token analytics service built on top of your enhanced 0G RPC node. This service provides:

- **Real-time token tracking** with WebSocket streaming
- **Buy/sell pattern detection** and whale movement alerts  
- **Trading volume analytics** and holder statistics
- **RESTful API** for easy integration
- **Live dashboard** for monitoring token activity

## 🎯 Features

### ✅ **Real-time Data Streaming**
- WebSocket connections for live updates
- Instant transfer notifications
- Real-time trading metrics
- Whale movement detection

### ✅ **Comprehensive Analytics**
- 24-hour trading volume
- Transfer count and patterns
- Unique holder tracking
- Large transfer identification

### ✅ **API Endpoints**
- Token information retrieval
- Historical transfer data
- Trading analytics
- Health monitoring

### ✅ **Smart Classification**
- Regular transfers vs whale movements
- Mint/burn detection
- Large transfer alerts
- Trading pattern analysis

## 🌐 API Endpoints

### **Base URL**: `http://localhost:3000`

#### **Health Check**
```bash
GET /health
```
Returns service status and statistics.

#### **Token Information**
```bash
GET /token/{address}
```
Get basic token information (name, symbol, decimals, supply).

#### **Token Transfers**
```bash
GET /token/{address}/transfers?fromBlock=latest&toBlock=latest&limit=100
```
Get token transfer history with buy/sell analysis.

#### **Token Analytics**
```bash
GET /token/{address}/analytics
```
Get comprehensive trading analytics and recent activity.

#### **Tracked Tokens**
```bash
GET /tracked
```
List all currently tracked tokens.

## 🔴 WebSocket API

### **Connection**: `ws://localhost:3001`

#### **Subscribe to Token**
```javascript
ws.send(JSON.stringify({
    type: 'subscribe',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
}));
```

#### **Get Token Info**
```javascript
ws.send(JSON.stringify({
    type: 'get_token_info',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
}));
```

#### **Unsubscribe**
```javascript
ws.send(JSON.stringify({
    type: 'unsubscribe',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
}));
```

## 📊 Example Usage

### **1. Track Panda AI Token (PAI)**

```bash
# Get token information
curl "http://localhost:3000/token/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C"

# Get recent transfers
curl "http://localhost:3000/token/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C/transfers?limit=50"

# Get comprehensive analytics
curl "http://localhost:3000/token/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C/analytics"
```

### **2. Real-time Monitoring**

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = function() {
    // Subscribe to PAI token
    ws.send(JSON.stringify({
        type: 'subscribe',
        tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
    }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    if (data.type === 'new_transfers') {
        console.log('New transfers detected:', data.data.transfers);
        console.log('Trading summary:', data.data.summary);
    }
};
```

## 📈 Data Structure

### **Token Information**
```json
{
  "address": "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
  "name": "Panda AI",
  "symbol": "PAI",
  "decimals": 9,
  "totalSupply": 1000000000000000000
}
```

### **Transfer Data**
```json
{
  "transactionHash": "0x...",
  "blockNumber": 6630301,
  "timestamp": 1758714602,
  "from": "0x60bf98a11ea53912ac0c354a0c2d8e335502de9c",
  "to": "0x33ed828ac43f282a78620117cf65cd2d4163ba37",
  "amount": 1116372330000000,
  "readableAmount": 1116372.33,
  "type": "whale_movement",
  "classification": "large_transfer",
  "logIndex": 0
}
```

### **Trading Summary**
```json
{
  "totalTransfers": 34,
  "transfers24h": 34,
  "transfersHourly": 34,
  "volume24h": 16938037.96,
  "volumeHourly": 16938037.96,
  "uniqueHolders24h": 34,
  "largeTransfers": 5,
  "whaleMovements": 5
}
```

## 🚀 Deployment Options

### **Option 1: Local Development**
```bash
# Install dependencies
npm install

# Start the service
npm start

# Access dashboard
open http://localhost:3000
```

### **Option 2: Docker Deployment**
```bash
# Build image
docker build -f Dockerfile.analytics -t 0g-token-analytics .

# Run container
docker run -p 3000:3000 -p 3001:3001 \
  -e RPC_URL=https://zerog-node-rpc.onrender.com/ \
  0g-token-analytics
```

### **Option 3: Production Deployment**
```bash
# Using PM2 for production
npm install -g pm2
pm2 start token-analytics-service.js --name "0g-analytics"
pm2 startup
pm2 save
```

## 🎯 Use Cases

### **1. DeFi Trading Bots**
- Monitor whale movements for trading signals
- Track volume spikes and unusual activity
- Get real-time transfer notifications

### **2. Portfolio Management**
- Track token holdings across multiple addresses
- Monitor large transfers affecting price
- Analyze trading patterns and volume trends

### **3. Market Analysis**
- Identify emerging tokens with high activity
- Track holder distribution changes
- Monitor liquidity movements

### **4. Security Monitoring**
- Detect unusual transfer patterns
- Monitor for potential rug pulls
- Track large token movements

## 📊 Performance Metrics

Based on testing with Panda AI (PAI) token:

- **Response Time**: ~675ms average
- **Real-time Updates**: 5-second polling interval
- **Data Coverage**: 1,111+ transfers analyzed
- **Classification Accuracy**: Detects whale movements (>0.1% of supply)
- **Volume Tracking**: 24h volume: 16.9M+ PAI tokens

## 🔧 Configuration

### **Environment Variables**
```bash
RPC_URL=https://zerog-node-rpc.onrender.com/  # Your 0G RPC endpoint
PORT=3000                                      # API server port
WS_PORT=3001                                  # WebSocket server port
NODE_ENV=production                           # Environment mode
```

### **Customization Options**
- **Polling Interval**: Adjust real-time update frequency
- **Whale Threshold**: Configure large transfer detection
- **Block Range**: Set historical data depth
- **Cache Duration**: Optimize performance settings

## 🎉 **Success Metrics**

Your token analytics service provides:

✅ **Real-time Data**: Live transfer monitoring  
✅ **Smart Analysis**: Whale movement detection  
✅ **Volume Tracking**: 24h trading analytics  
✅ **API Integration**: RESTful endpoints  
✅ **WebSocket Streaming**: Live updates  
✅ **Dashboard UI**: Visual monitoring  

## 🚀 **Next Steps**

1. **Deploy to Production**: Use Docker or PM2 for production deployment
2. **Add More Tokens**: Track multiple tokens simultaneously  
3. **Enhanced Analytics**: Add price tracking, DEX integration
4. **Alerting System**: Email/SMS notifications for whale movements
5. **Database Integration**: Store historical data for trend analysis

Your 0G node now powers a comprehensive token analytics platform! 🎯
