# 🚀 0G Analytics API - Complete Client Guide

## 🔑 **Getting Started**

### **Your API Key**
You've received an API key that looks like this:
```
zg_free_abc123def456789...     (Free Plan)
zg_pro_xyz789uvw012345...      (Pro Plan)  
zg_enterprise_mno345pqr...     (Enterprise Plan)
```

### **Authentication**
Add your API key to every request using **any** of these methods:

```bash
# Method 1: Header (Recommended)
curl -H "X-API-Key: YOUR_API_KEY" https://zerog-node-rpc.onrender.com/api/price

# Method 2: Bearer Token  
curl -H "Authorization: Bearer YOUR_API_KEY" https://zerog-node-rpc.onrender.com/api/price

# Method 3: Query Parameter
curl "https://zerog-node-rpc.onrender.com/api/price?apikey=YOUR_API_KEY"
```

---

## 📊 **All Available Endpoints**

### **💰 1. Get 0G Token Price**
Get live 0G token price in USD with market data.

```bash
GET /api/price
```

**Example:**
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
    "eth": 0.0009758,
    "change24h": -4.75,
    "marketCap": 815455573.70,
    "volume24h": 279246728.21,
    "source": "CoinGecko",
    "lastUpdated": 1758883778643
  },
  "timestamp": 1758883778643
}
```

---

### **🧮 2. Convert 0G to USD**
Convert any amount of 0G tokens to USD.

```bash
POST /api/convert
```

**Example:**
```bash
curl -H "X-API-Key: YOUR_KEY" \
  -X POST https://zerog-node-rpc.onrender.com/api/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "from": "0G", "to": "USD"}'
```

**Response:**
```json
{
  "success": true,
  "amount": 10,
  "from": "0G",
  "to": "USD",
  "result": 37.90,
  "rate": 3.79,
  "timestamp": 1758883778643
}
```

---

### **📈 3. Get Token Trades**
Get recent trades for any token with optional USD pricing.

```bash
GET /api/trades/{tokenAddress}?limit=50&includeUSD=true
```

**Example:**
```bash
# Get PAI token trades with USD values
curl -H "X-API-Key: YOUR_KEY" \
  "https://zerog-node-rpc.onrender.com/api/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?limit=10&includeUSD=true"
```

**Response:**
```json
{
  "success": true,
  "token": {
    "address": "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
    "name": "PAI Token",
    "symbol": "PAI",
    "decimals": 18
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
      "pricePerToken": 0.0018265661883511734,
      "type": "BUY",
      "classification": "medium",
      "tokenSymbol": "PAI",
      "usdValue": 0.375,
      "pricePerTokenUSD": 0.00692,
      "ogPriceUSD": 3.79
    }
  ],
  "count": 1,
  "timestamp": 1758884410437
}
```

---

### **🎯 4. Complete Token Analytics**
Get comprehensive analytics for any token including FDV, volume, liquidity.

```bash
GET /api/analytics/{tokenAddress}
```

**Example:**
```bash
# Get complete PAI token analytics
curl -H "X-API-Key: YOUR_KEY" \
  "https://zerog-node-rpc.onrender.com/api/analytics/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C"
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "token": {
      "name": "PAI Token",
      "symbol": "PAI",
      "decimals": 18,
      "totalSupply": "1000000000000000000000000000"
    },
    "pricing": {
      "currentPriceUSD": 0.0068978,
      "priceIn0G": 0.00182,
      "priceChange24h": -5.2,
      "ogPriceUSD": 3.79
    },
    "fdv": {
      "fdvUSD": 6897800,
      "fdv0G": 1820000,
      "totalSupply": 1000000000,
      "marketCapRank": "Top 2000"
    },
    "timeframeAnalytics": {
      "1h": {
        "totalTrades": 15,
        "buys": 9,
        "sells": 6,
        "buyRatio": 60,
        "whaleActivity": 2
      },
      "6h": {
        "totalTrades": 89,
        "buys": 52,
        "sells": 37,
        "buyRatio": 58.4,
        "whaleActivity": 8
      },
      "24h": {
        "totalTrades": 234,
        "buys": 145,
        "sells": 89,
        "buyRatio": 62.0,
        "whaleActivity": 18
      }
    },
    "volumeAnalytics": {
      "1h": {
        "volume0G": 2.45,
        "volumeUSD": 9.29,
        "buyVolumeUSD": 5.76,
        "sellVolumeUSD": 3.52
      },
      "24h": {
        "volume0G": 45.89,
        "volumeUSD": 173.92,
        "buyVolumeUSD": 107.41,
        "sellVolumeUSD": 66.51
      }
    },
    "liquidityAnalytics": {
      "totalLiquidityUSD": 125000,
      "w0gLiquidityUSD": 62500,
      "quoteLiquidityUSD": 62500
    },
    "marketMetrics": {
      "uniqueTraders24h": 156,
      "volatilityPercent": 13.74,
      "highPrice24h": 0.009475,
      "lowPrice24h": 0.006898
    }
  }
}
```

---

### **🏪 5. Market Summary**
Get summary data for multiple tokens at once.

```bash
GET /api/market/summary?tokens=address1,address2,address3
```

**Example:**
```bash
# Get market summary for multiple tokens
curl -H "X-API-Key: YOUR_KEY" \
  "https://zerog-node-rpc.onrender.com/api/market/summary?tokens=0x59ef6F3943bBdFE2fB19565037Ac85071223E94C,0xAnotherTokenAddress"
```

**Response:**
```json
{
  "success": true,
  "tokens": [
    {
      "address": "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
      "success": true,
      "summary": {
        "name": "PAI Token",
        "symbol": "PAI",
        "priceUSD": 0.0068978,
        "priceChange24h": -5.2,
        "fdvUSD": 6897800,
        "volume24hUSD": 173.92,
        "trades24h": 234,
        "uniqueTraders24h": 156
      }
    }
  ],
  "count": 1,
  "timestamp": 1758884410437
}
```

---

### **🔴 6. Real-Time WebSocket Streaming**
Get live trade updates via WebSocket (no API key needed for WebSocket).

```javascript
const ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');

// Subscribe to live trades for a token
ws.send(JSON.stringify({
    type: 'subscribe_live_trades',
    tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
}));

// Listen for live trade updates
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'live_trades') {
        console.log('🔥 Live Trade:', data.trades);
    }
};
```

---

### **🔍 7. Standard RPC Calls**
Access standard Ethereum RPC methods (no API key required for basic RPC).

```bash
POST /
```

**Example:**
```bash
# Get latest block number
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }'

# Get wallet balance
curl -X POST https://zerog-node-rpc.onrender.com \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBalance",
    "params": ["0xYourWalletAddress", "latest"],
    "id": 1
  }'
```

---

## 📊 **Your Plan & Limits**

### **Rate Limits**
Your API responses include usage headers:
```
X-RateLimit-Tier: pro
X-RateLimit-Daily-Remaining: 9,847
X-RateLimit-Monthly-Remaining: 287,234
```

### **Plan Details**

| Plan | Daily Limit | Monthly Limit | Price | Features |
|------|-------------|---------------|-------|----------|
| **Free** | 100 requests | 3,000 requests | $0/month | Basic analytics, community support |
| **Pro** | 10,000 requests | 300,000 requests | $99/month | Full analytics, USD pricing, priority support |
| **Enterprise** | 100,000 requests | 3,000,000 requests | $499/month | Custom analytics, dedicated support, SLA |

---

## 🛠️ **Code Examples**

### **JavaScript/Node.js**
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
    
    // Get 0G price
    async getPrice() {
        return await this.request('/api/price');
    }
    
    // Get token analytics
    async getTokenAnalytics(tokenAddress) {
        return await this.request(`/api/analytics/${tokenAddress}`);
    }
    
    // Get token trades
    async getTrades(tokenAddress, limit = 50, includeUSD = true) {
        return await this.request(`/api/trades/${tokenAddress}?limit=${limit}&includeUSD=${includeUSD}`);
    }
    
    // Convert 0G to USD
    async convertToUSD(amount) {
        return await this.request('/api/convert', {
            method: 'POST',
            body: JSON.stringify({ amount, from: '0G', to: 'USD' })
        });
    }
}

// Usage
const api = new ZeroGAPI('your_api_key_here');

// Get current 0G price
const price = await api.getPrice();
console.log('0G Price:', price.price.usd);

// Get token analytics
const analytics = await api.getTokenAnalytics('0x59ef6F3943bBdFE2fB19565037Ac85071223E94C');
console.log('Token FDV:', analytics.analytics.fdv.fdvUSD);

// Get recent trades
const trades = await api.getTrades('0x59ef6F3943bBdFE2fB19565037Ac85071223E94C', 10);
console.log('Recent trades:', trades.trades.length);
```

### **Python**
```python
import requests
import json

class ZeroGAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://zerog-node-rpc.onrender.com'
        self.headers = {'X-API-Key': api_key, 'Content-Type': 'application/json'}
    
    def get_price(self):
        response = requests.get(f'{self.base_url}/api/price', headers=self.headers)
        return response.json()
    
    def get_token_analytics(self, token_address):
        response = requests.get(f'{self.base_url}/api/analytics/{token_address}', headers=self.headers)
        return response.json()
    
    def get_trades(self, token_address, limit=50, include_usd=True):
        params = {'limit': limit, 'includeUSD': include_usd}
        response = requests.get(f'{self.base_url}/api/trades/{token_address}', headers=self.headers, params=params)
        return response.json()
    
    def convert_to_usd(self, amount):
        data = {'amount': amount, 'from': '0G', 'to': 'USD'}
        response = requests.post(f'{self.base_url}/api/convert', headers=self.headers, json=data)
        return response.json()

# Usage
api = ZeroGAPI('your_api_key_here')

# Get 0G price
price = api.get_price()
print(f"0G Price: ${price['price']['usd']}")

# Get token analytics
analytics = api.get_token_analytics('0x59ef6F3943bBdFE2fB19565037Ac85071223E94C')
print(f"Token FDV: ${analytics['analytics']['fdv']['fdvUSD']:,}")
```

---

## ⚠️ **Error Handling**

### **Common Errors**

#### **401 - Invalid API Key**
```json
{
  "error": "Invalid API key",
  "code": 401,
  "message": "Invalid API key. Get your key at /admin"
}
```
**Solution:** Check your API key is correct and active.

#### **429 - Rate Limit Exceeded**
```json
{
  "error": "Daily rate limit exceeded",
  "code": 429,
  "message": "Rate limit exceeded. Upgrade your plan at /admin"
}
```
**Solution:** Wait until tomorrow or upgrade your plan.

#### **404 - Token Not Found**
```json
{
  "error": "Token not found",
  "code": 404
}
```
**Solution:** Check the token address is correct and has trading activity.

---

## 🎯 **Best Practices**

### **1. Monitor Your Usage**
- Check response headers for remaining requests
- Set up alerts when approaching limits
- Track usage patterns to optimize calls

### **2. Handle Rate Limits**
```javascript
async function makeAPICall(endpoint) {
    try {
        const response = await fetch(endpoint, {
            headers: { 'X-API-Key': 'your_key' }
        });
        
        if (response.status === 429) {
            // Rate limited - wait and retry
            await new Promise(resolve => setTimeout(resolve, 60000));
            return makeAPICall(endpoint);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
    }
}
```

### **3. Cache Results**
- Cache price data for 1-5 minutes
- Cache analytics data for 10-30 minutes
- Use WebSocket for real-time updates instead of polling

### **4. Batch Requests**
- Use `/api/market/summary` for multiple tokens
- Combine related data requests
- Use appropriate limits on trade queries

---

## 📞 **Support**

- **Free Plan**: Community support via documentation
- **Pro Plan**: Priority email support (response within 24 hours)
- **Enterprise**: Dedicated support with SLA (response within 4 hours)

---

## 🚀 **Start Building!**

You now have access to the most comprehensive 0G Chain analytics API. Start building amazing applications with:

- ✅ **Real-time token prices** in USD
- ✅ **Complete token analytics** (FDV, volume, liquidity)
- ✅ **Live trade streaming** via WebSocket
- ✅ **Historical trade data** with USD values
- ✅ **Market summaries** for multiple tokens
- ✅ **Standard RPC access** to 0G Chain

**Happy building!** 🎉
