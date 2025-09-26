# ⚡ 0G Analytics API - Quick Reference

## 🔑 **Authentication**
Add your API key to every request:
```bash
curl -H "X-API-Key: YOUR_API_KEY" https://zerog-node-rpc.onrender.com/api/price
```

## 🎯 **Essential Endpoints**

### **💰 Get 0G Price**
```bash
GET /api/price
# Returns: USD price, 24h change, market cap, volume
```

### **📊 Token Analytics**
```bash
GET /api/analytics/{tokenAddress}
# Returns: FDV, volume by timeframe, buy/sell counts, liquidity
```

### **💹 Token Trades**
```bash
GET /api/trades/{tokenAddress}?includeUSD=true&limit=50
# Returns: Recent trades with USD values and pricing
```

### **🧮 Convert 0G to USD**
```bash
POST /api/convert
Body: {"amount": 10, "from": "0G", "to": "USD"}
# Returns: USD equivalent and current rate
```

### **🏪 Market Summary**
```bash
GET /api/market/summary?tokens=address1,address2
# Returns: Summary data for multiple tokens
```

### **🔴 Live Streaming**
```javascript
const ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');
ws.send(JSON.stringify({
    type: 'subscribe_live_trades',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
}));
```

## 📈 **Rate Limits**
- **Free**: 100/day, 3K/month
- **Pro**: 10K/day, 300K/month  
- **Enterprise**: 100K/day, 3M/month

## ⚠️ **Common Errors**
- **401**: Invalid API key
- **429**: Rate limit exceeded
- **404**: Token/endpoint not found

## 🛠️ **Quick JavaScript Setup**
```javascript
const api = {
    key: 'YOUR_API_KEY',
    base: 'https://zerog-node-rpc.onrender.com',
    
    async call(endpoint) {
        const response = await fetch(`${this.base}${endpoint}`, {
            headers: { 'X-API-Key': this.key }
        });
        return await response.json();
    }
};

// Usage
const price = await api.call('/api/price');
const analytics = await api.call('/api/analytics/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C');
```

## 📞 **Support**
- **Free**: Documentation only
- **Pro**: Priority email support  
- **Enterprise**: Dedicated support + SLA

---
**🚀 Start building with 0G Chain's most comprehensive analytics API!**
