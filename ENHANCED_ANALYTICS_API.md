# 🚀 Enhanced Token Analytics API - Complete Reference

## 📡 **Base URL**: `https://zerog-node-rpc.onrender.com`

---

## 💰 **Price & Market Data**

### **🔥 Get 0G Token Price**
```bash
GET /api/price
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
    "lastUpdated": 1758883778643,
    "cacheAge": 0
  },
  "timestamp": 1758883778643
}
```

### **🧮 Convert 0G to USD**
```bash
POST /api/convert
Content-Type: application/json

{
  "amount": 10.5,
  "from": "0G",
  "to": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "amount": 10.5,
  "from": "0G",
  "to": "USD",
  "result": 39.795,
  "rate": 3.79,
  "timestamp": 1758883778643
}
```

---

## 📊 **Comprehensive Token Analytics**

### **🎯 Get Complete Token Analytics**
```bash
GET /api/analytics/{tokenAddress}?includeHistorical=true
```

**Example:**
```bash
curl "https://zerog-node-rpc.onrender.com/api/analytics/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C"
```

**Response Structure:**
```json
{
  "success": true,
  "token": "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
  "analytics": {
    "token": {
      "address": "0x59ef6F3943bBdFE2fB19565037Ac85071223E94C",
      "name": "PAI Token",
      "symbol": "PAI",
      "decimals": 18,
      "totalSupply": "1000000000000000000000000000"
    },
    "pricing": {
      "currentPriceUSD": 0.0068978,
      "priceIn0G": 0.00182,
      "priceChange24h": -5.2,
      "ogPriceUSD": 3.79,
      "lastTradeTime": 1758880810
    },
    "fdv": {
      "fdvUSD": 6897800,
      "fdv0G": 1820000,
      "totalSupply": 1000000000,
      "currentPrice": 0.0068978,
      "marketCapRank": "Top 2000"
    },
    "timeframeAnalytics": {
      "1h": {
        "totalTrades": 15,
        "buys": 9,
        "sells": 6,
        "transfers": 0,
        "buyRatio": 60,
        "sellRatio": 40,
        "whaleActivity": 2,
        "largeActivity": 4
      },
      "6h": {
        "totalTrades": 89,
        "buys": 52,
        "sells": 37,
        "transfers": 0,
        "buyRatio": 58.4,
        "sellRatio": 41.6,
        "whaleActivity": 8,
        "largeActivity": 15
      },
      "24h": {
        "totalTrades": 234,
        "buys": 145,
        "sells": 89,
        "transfers": 0,
        "buyRatio": 62.0,
        "sellRatio": 38.0,
        "whaleActivity": 18,
        "largeActivity": 42
      }
    },
    "volumeAnalytics": {
      "1h": {
        "volume0G": 2.45,
        "volumeUSD": 9.2855,
        "buyVolume0G": 1.52,
        "buyVolumeUSD": 5.7608,
        "sellVolume0G": 0.93,
        "sellVolumeUSD": 3.5247,
        "tokenVolume": 1247.8,
        "avgTradeSize0G": 0.163,
        "avgTradeSizeUSD": 0.619
      },
      "6h": {
        "volume0G": 15.67,
        "volumeUSD": 59.3893,
        "buyVolume0G": 9.23,
        "buyVolumeUSD": 34.9817,
        "sellVolume0G": 6.44,
        "sellVolumeUSD": 24.4076,
        "tokenVolume": 8456.2,
        "avgTradeSize0G": 0.176,
        "avgTradeSizeUSD": 0.667
      },
      "24h": {
        "volume0G": 45.89,
        "volumeUSD": 173.9231,
        "buyVolume0G": 28.34,
        "buyVolumeUSD": 107.4086,
        "sellVolume0G": 17.55,
        "sellVolumeUSD": 66.5145,
        "tokenVolume": 24567.9,
        "avgTradeSize0G": 0.196,
        "avgTradeSizeUSD": 0.743
      }
    },
    "liquidityAnalytics": {
      "estimated": true,
      "totalLiquidityUSD": 125000,
      "w0gLiquidityUSD": 62500,
      "quoteLiquidityUSD": 62500,
      "liquidityRatio": 0.5,
      "majorPairs": ["0G/PAI (estimated)"],
      "lastUpdated": 1758884410437,
      "note": "Estimated from trading patterns"
    },
    "marketMetrics": {
      "uniqueTraders24h": 156,
      "avgPrice24h": 0.007971,
      "volatility24h": 0.001095,
      "volatilityPercent": 13.74,
      "highPrice24h": 0.009475,
      "lowPrice24h": 0.006898,
      "priceRange24h": 0.002577
    },
    "lastUpdated": 1758884410437,
    "dataSource": "0G Chain + CoinGecko"
  },
  "timestamp": 1758884410437,
  "version": "2.0"
}
```

---

## 💹 **Enhanced Trade Data**

### **🔥 Get Trades with USD Values**
```bash
GET /api/trades/{tokenAddress}?limit=50&includeUSD=true
```

**Example:**
```bash
curl "https://zerog-node-rpc.onrender.com/api/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?limit=10&includeUSD=true"
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
      "ogPriceUSD": 3.79,
      "ogChange24h": -4.75,
      "priceSource": "CoinGecko"
    }
  ],
  "count": 1,
  "includeUSD": true,
  "timestamp": 1758884410437
}
```

---

## 📈 **Market Summary**

### **🎯 Get Multi-Token Market Summary**
```bash
GET /api/market/summary?tokens=address1,address2,address3
```

**Example:**
```bash
curl "https://zerog-node-rpc.onrender.com/api/market/summary?tokens=0x59ef6F3943bBdFE2fB19565037Ac85071223E94C,0xAnotherToken"
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

## 🎯 **What Each Endpoint Provides**

### **📊 Token Analytics (`/api/analytics/{token}`):**
- ✅ **Token prices in USD** - Real-time pricing with 0G conversion
- ✅ **FDV (Fully Diluted Valuation)** - Market cap if all tokens were in circulation
- ✅ **Buy/sell counts by timeframe** - 1hr, 6hr, 24hr breakdowns
- ✅ **Volume by timeframe** - USD and 0G volume analysis
- ✅ **Liquidity analysis** - Pool values in USD (estimated)
- ✅ **Market metrics** - Volatility, price ranges, unique traders
- ✅ **Whale activity** - Large transaction tracking

### **💹 Enhanced Trades (`/api/trades/{token}?includeUSD=true`):**
- ✅ **USD trade values** - Every trade shows USD equivalent
- ✅ **Token prices in USD** - Price per token in USD
- ✅ **0G price context** - Current 0G/USD rate and 24h change
- ✅ **Enhanced metadata** - Price source and timing

### **🔥 Price Data (`/api/price`):**
- ✅ **Live 0G price** - Real-time USD pricing
- ✅ **Market data** - 24h change, volume, market cap
- ✅ **Multiple sources** - CoinGecko integration with fallbacks

### **🧮 Conversion (`/api/convert`):**
- ✅ **0G to USD conversion** - Any amount conversion
- ✅ **Current rates** - Live exchange rates
- ✅ **Batch processing** - Multiple conversions

---

## 📋 **Query Parameters**

| Parameter | Endpoint | Description | Default |
|-----------|----------|-------------|---------|
| `includeHistorical` | `/api/analytics/{token}` | Include historical analysis | `true` |
| `limit` | `/api/trades/{token}` | Number of trades to return | `100` |
| `includeUSD` | `/api/trades/{token}` | Add USD values to trades | `false` |
| `tokens` | `/api/market/summary` | Comma-separated token addresses | Required |

---

## 🚀 **JavaScript SDK Example**

```javascript
class ZeroGAnalytics {
    constructor() {
        this.baseUrl = 'https://zerog-node-rpc.onrender.com';
    }
    
    // Get comprehensive token analytics
    async getTokenAnalytics(tokenAddress) {
        const response = await fetch(`${this.baseUrl}/api/analytics/${tokenAddress}`);
        return await response.json();
    }
    
    // Get 0G price
    async get0GPrice() {
        const response = await fetch(`${this.baseUrl}/api/price`);
        return await response.json();
    }
    
    // Get enhanced trades with USD
    async getTradesWithUSD(tokenAddress, limit = 50) {
        const response = await fetch(`${this.baseUrl}/api/trades/${tokenAddress}?limit=${limit}&includeUSD=true`);
        return await response.json();
    }
    
    // Convert 0G to USD
    async convertToUSD(amount) {
        const response = await fetch(`${this.baseUrl}/api/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, from: '0G', to: 'USD' })
        });
        return await response.json();
    }
    
    // Get market summary for multiple tokens
    async getMarketSummary(tokenAddresses) {
        const tokens = tokenAddresses.join(',');
        const response = await fetch(`${this.baseUrl}/api/market/summary?tokens=${tokens}`);
        return await response.json();
    }
}

// Usage
const analytics = new ZeroGAnalytics();

// Get PAI token analytics
const paiAnalytics = await analytics.getTokenAnalytics('0x59ef6F3943bBdFE2fB19565037Ac85071223E94C');
console.log('PAI FDV:', paiAnalytics.analytics.fdv.fdvUSD);
console.log('24h Volume:', paiAnalytics.analytics.volumeAnalytics['24h'].volumeUSD);

// Convert 10 0G to USD
const conversion = await analytics.convertToUSD(10);
console.log('10 0G =', conversion.result, 'USD');
```

---

## 🎉 **Complete Analytics Suite**

Your 0G node now provides:

✅ **Token Prices in USD** - Live pricing for any token  
✅ **FDV Calculations** - Fully diluted valuations  
✅ **Timeframe Analytics** - 1hr, 6hr, 24hr breakdowns  
✅ **Volume Analysis** - USD and 0G volume tracking  
✅ **Liquidity Tracking** - Pool values and ratios  
✅ **Market Metrics** - Volatility, ranges, trader counts  
✅ **Whale Detection** - Large transaction monitoring  
✅ **Real-time Updates** - Live data with caching  

**Professional-grade token analytics powered by your 0G node!** 🚀
