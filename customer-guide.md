# 🚀 0G Analytics API - Customer Quick Start Guide

## 🔑 **Your API Key**
You've been provided with an API key that looks like this:
```
zg_free_abc123def456...    (Free Plan - 100 requests/day)
zg_pro_xyz789uvw012...     (Pro Plan - 10,000 requests/day)
zg_enterprise_mno345...    (Enterprise Plan - 100,000 requests/day)
```

## 📡 **How to Use Your API Key**

### **Method 1: Header (Recommended)**
```bash
curl -H "X-API-Key: YOUR_API_KEY_HERE" \
  https://zerog-node-rpc.onrender.com/api/price
```

### **Method 2: Bearer Token**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  https://zerog-node-rpc.onrender.com/api/price
```

### **Method 3: Query Parameter**
```bash
curl "https://zerog-node-rpc.onrender.com/api/price?apikey=YOUR_API_KEY_HERE"
```

## 🎯 **Available Endpoints**

### **💰 Get 0G Token Price**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  https://zerog-node-rpc.onrender.com/api/price
```
**Response:**
```json
{
  "success": true,
  "price": {
    "usd": 3.79,
    "change24h": -4.75,
    "marketCap": 815455573.70,
    "volume24h": 279246728.21
  }
}
```

### **📊 Complete Token Analytics**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  "https://zerog-node-rpc.onrender.com/api/analytics/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C"
```
**Get:** FDV, volume by timeframe, buy/sell counts, liquidity data

### **💹 Enhanced Trades with USD**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  "https://zerog-node-rpc.onrender.com/api/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?includeUSD=true"
```
**Get:** Trade history with USD values and pricing

### **🧮 Convert 0G to USD**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  -X POST https://zerog-node-rpc.onrender.com/api/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "from": "0G", "to": "USD"}'
```

## 📈 **Rate Limits & Usage**

Your API responses include usage headers:
```
X-RateLimit-Tier: pro
X-RateLimit-Daily-Remaining: 9,847
X-RateLimit-Monthly-Remaining: 287,234
```

### **Plan Limits:**
- **Free**: 100 requests/day, 3,000/month
- **Pro**: 10,000 requests/day, 300,000/month  
- **Enterprise**: 100,000 requests/day, 3,000,000/month

## 🔴 **Real-Time WebSocket**
```javascript
const ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');

// Subscribe to live trades (no API key needed for WebSocket)
ws.send(JSON.stringify({
    type: 'subscribe_live_trades',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
}));

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Live trade:', data);
};
```

## ⚠️ **Common Errors**

### **401 - Invalid API Key**
```json
{
  "error": "Invalid API key",
  "message": "Invalid API key. Get your key at /admin"
}
```
**Fix:** Check your API key is correct

### **429 - Rate Limit Exceeded**
```json
{
  "error": "Daily rate limit exceeded",
  "message": "Rate limit exceeded. Upgrade your plan at /admin"
}
```
**Fix:** Wait until tomorrow or upgrade your plan

## 🚀 **JavaScript Example**
```javascript
class ZeroGAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://zerog-node-rpc.onrender.com';
    }
    
    async request(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        return await response.json();
    }
    
    async getPrice() {
        return await this.request('/api/price');
    }
    
    async getTokenAnalytics(tokenAddress) {
        return await this.request(`/api/analytics/${tokenAddress}`);
    }
    
    async getTrades(tokenAddress, includeUSD = true) {
        return await this.request(`/api/trades/${tokenAddress}?includeUSD=${includeUSD}`);
    }
}

// Usage
const api = new ZeroGAPI('your_api_key_here');
const price = await api.getPrice();
console.log('0G Price:', price.price.usd);
```

## 📞 **Support**
- **Free Plan**: Community support
- **Pro Plan**: Priority email support
- **Enterprise**: Dedicated support with SLA

## 💳 **Billing**
- **Free**: No charges
- **Pro**: $99/month
- **Enterprise**: $499/month
- **Overages**: $0.01 per request over limit

---

**Start building with 0G Chain's most comprehensive analytics API!** 🎉
