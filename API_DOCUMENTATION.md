# 0G Chain RPC API Documentation

🚀 **Live RPC Endpoint**: https://zerog-node-rpc.onrender.com/

## Overview

This is a fully functional 0G Chain RPC node providing access to blockchain data through standard Tendermint RPC endpoints. Use this API to build applications, query blockchain data, and interact with the 0G network.

### Network Information
- **Chain ID**: 16661
- **Network**: 0G Mainnet (Private)
- **Node Status**: ✅ Live and Syncing
- **Peers**: 10+ connected
- **Current Block**: 2,900+ (growing)

---

## Quick Start Examples

### JavaScript/Node.js
```javascript
// Get node status
const response = await fetch('https://zerog-node-rpc.onrender.com/status');
const data = await response.json();
console.log('Latest Block:', data.result.sync_info.latest_block_height);

// Get latest block
const blockResponse = await fetch('https://zerog-node-rpc.onrender.com/block');
const blockData = await blockResponse.json();
console.log('Block Hash:', blockData.result.block.header.hash);
```

### Python
```python
import requests

# Get node status
response = requests.get('https://zerog-node-rpc.onrender.com/status')
data = response.json()
print(f"Latest Block: {data['result']['sync_info']['latest_block_height']}")

# Search transactions
tx_response = requests.get('https://zerog-node-rpc.onrender.com/tx_search?query=tx.height=2900')
print(f"Transactions: {tx_response.json()}")
```

### cURL
```bash
# Get node health
curl https://zerog-node-rpc.onrender.com/health

# Get latest block
curl https://zerog-node-rpc.onrender.com/block

# Get specific block by height
curl "https://zerog-node-rpc.onrender.com/block?height=2900"
```

---

## Core API Endpoints

### 🏥 Health & Status

#### Check Node Health
```http
GET https://zerog-node-rpc.onrender.com/health
```
**Response**: `{"jsonrpc":"2.0","id":-1,"result":{}}`

#### Get Node Status
```http
GET https://zerog-node-rpc.onrender.com/status
```
**Returns**: Block height, sync status, node info, validator info

**Example Response**:
```json
{
  "result": {
    "sync_info": {
      "latest_block_height": "2932",
      "catching_up": true,
      "latest_block_time": "2025-08-23T01:39:54.024036444Z"
    }
  }
}
```

### 📦 Block Data

#### Get Latest Block
```http
GET https://zerog-node-rpc.onrender.com/block
```

#### Get Block by Height
```http
GET https://zerog-node-rpc.onrender.com/block?height=2900
```

#### Get Block by Hash
```http
GET https://zerog-node-rpc.onrender.com/block_by_hash?hash=BLOCK_HASH
```

#### Get Block Results
```http
GET https://zerog-node-rpc.onrender.com/block_results?height=2900
```

### 🔍 Transaction Queries

#### Search Transactions
```http
GET https://zerog-node-rpc.onrender.com/tx_search?query=tx.height=2900&page=1&per_page=30
```

**Query Examples**:
- `tx.height=2900` - Transactions in block 2900
- `tx.hash='TRANSACTION_HASH'` - Specific transaction
- `message.sender='ADDRESS'` - Transactions from address

#### Get Transaction by Hash
```http
GET https://zerog-node-rpc.onrender.com/tx?hash=TRANSACTION_HASH&prove=false
```

### 🌐 Network Information

#### Get Network Info
```http
GET https://zerog-node-rpc.onrender.com/net_info
```
**Returns**: Peer count, peer details, network connectivity

#### Get Genesis
```http
GET https://zerog-node-rpc.onrender.com/genesis
```

#### Get Validators
```http
GET https://zerog-node-rpc.onrender.com/validators?height=2900&page=1&per_page=30
```

---

## Advanced Endpoints

### 📊 Blockchain Queries

#### Get Blockchain Info
```http
GET https://zerog-node-rpc.onrender.com/blockchain?minHeight=2800&maxHeight=2900
```

#### Get Consensus Parameters
```http
GET https://zerog-node-rpc.onrender.com/consensus_params?height=2900
```

#### Get Consensus State
```http
GET https://zerog-node-rpc.onrender.com/consensus_state
```

### 🔄 Transaction Broadcasting

#### Broadcast Transaction (Async)
```http
GET https://zerog-node-rpc.onrender.com/broadcast_tx_async?tx=ENCODED_TRANSACTION
```

#### Broadcast Transaction (Sync)
```http
GET https://zerog-node-rpc.onrender.com/broadcast_tx_sync?tx=ENCODED_TRANSACTION
```

#### Broadcast Transaction (Commit)
```http
GET https://zerog-node-rpc.onrender.com/broadcast_tx_commit?tx=ENCODED_TRANSACTION
```

### 🔍 Mempool Operations

#### Check Transaction
```http
GET https://zerog-node-rpc.onrender.com/check_tx?tx=ENCODED_TRANSACTION
```

#### Get Unconfirmed Transactions
```http
GET https://zerog-node-rpc.onrender.com/unconfirmed_txs?limit=30
```

#### Count Unconfirmed Transactions
```http
GET https://zerog-node-rpc.onrender.com/num_unconfirmed_txs
```

---

## Programming Examples

### React/JavaScript Application
```javascript
import React, { useState, useEffect } from 'react';

function ZeroGBlockExplorer() {
  const [blockHeight, setBlockHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBlockHeight = async () => {
      try {
        const response = await fetch('https://zerog-node-rpc.onrender.com/status');
        const data = await response.json();
        setBlockHeight(data.result.sync_info.latest_block_height);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching block height:', error);
      }
    };

    fetchBlockHeight();
    const interval = setInterval(fetchBlockHeight, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>0G Chain Block Explorer</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <p>Latest Block Height: {blockHeight}</p>
      )}
    </div>
  );
}

export default ZeroGBlockExplorer;
```

### Python Data Analytics
```python
import requests
import pandas as pd
from datetime import datetime

class ZeroGAnalytics:
    def __init__(self):
        self.base_url = "https://zerog-node-rpc.onrender.com"
    
    def get_block_data(self, height):
        """Get block data for analysis"""
        response = requests.get(f"{self.base_url}/block?height={height}")
        return response.json()
    
    def get_transaction_count(self, start_height, end_height):
        """Get transaction count for a range of blocks"""
        tx_counts = []
        for height in range(start_height, end_height + 1):
            block_data = self.get_block_data(height)
            tx_count = len(block_data['result']['block']['data']['txs'])
            tx_counts.append({
                'height': height,
                'tx_count': tx_count,
                'timestamp': block_data['result']['block']['header']['time']
            })
        return pd.DataFrame(tx_counts)
    
    def get_network_stats(self):
        """Get current network statistics"""
        status = requests.get(f"{self.base_url}/status").json()
        net_info = requests.get(f"{self.base_url}/net_info").json()
        
        return {
            'latest_height': status['result']['sync_info']['latest_block_height'],
            'peer_count': net_info['result']['n_peers'],
            'catching_up': status['result']['sync_info']['catching_up']
        }

# Usage
analytics = ZeroGAnalytics()
stats = analytics.get_network_stats()
print(f"Network Stats: {stats}")
```

### Go Application
```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

type StatusResponse struct {
    Result struct {
        SyncInfo struct {
            LatestBlockHeight string `json:"latest_block_height"`
            CatchingUp        bool   `json:"catching_up"`
        } `json:"sync_info"`
    } `json:"result"`
}

func getZeroGStatus() (*StatusResponse, error) {
    resp, err := http.Get("https://zerog-node-rpc.onrender.com/status")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    var status StatusResponse
    err = json.Unmarshal(body, &status)
    return &status, err
}

func main() {
    status, err := getZeroGStatus()
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    fmt.Printf("Latest Block: %s\n", status.Result.SyncInfo.LatestBlockHeight)
    fmt.Printf("Syncing: %t\n", status.Result.SyncInfo.CatchingUp)
}
```

---

## Response Formats

All responses follow the JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": -1,
  "result": {
    // Response data here
  }
}
```

### Error Responses
```json
{
  "jsonrpc": "2.0",
  "id": -1,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "error details"
  }
}
```

---

## Rate Limits & Best Practices

### Rate Limits
- **No strict rate limits** currently enforced
- **Recommended**: Max 100 requests/minute per IP
- **Bulk queries**: Use pagination for large datasets

### Best Practices

1. **Cache Responses**: Cache block data that won't change
2. **Use Pagination**: For large result sets (transactions, validators)
3. **Handle Errors**: Always check for error responses
4. **Efficient Queries**: Use specific height parameters when possible
5. **Connection Pooling**: Reuse HTTP connections in production

### Example Error Handling
```javascript
async function safeApiCall(endpoint) {
  try {
    const response = await fetch(`https://zerog-node-rpc.onrender.com${endpoint}`);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API Error: ${data.error.message}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

---

## Use Cases

### 🏦 DeFi Applications
- Query account balances
- Monitor transaction history
- Track validator performance
- Analyze network activity

### 📊 Analytics & Monitoring
- Block time analysis
- Transaction volume tracking
- Network health monitoring
- Validator uptime statistics

### 🔍 Block Explorers
- Display blocks and transactions
- Search functionality
- Real-time updates
- Historical data browsing

### 🤖 Trading Bots
- Monitor mempool
- Track specific addresses
- Analyze transaction patterns
- Real-time price feeds integration

---

## Support & Resources

### 🔗 Links
- **Live RPC**: https://zerog-node-rpc.onrender.com/
- **GitHub Repo**: https://github.com/frennadev/0G-NODE-RPC
- **0G Documentation**: https://docs.0g.ai
- **Network Explorer**: https://chainscan.0g.ai

### 📧 Contact
- **Issues**: Create GitHub issue in the repository
- **Questions**: Use GitHub Discussions
- **Security**: security@0g.ai

---

## Example Applications

### Simple Block Monitor
```bash
#!/bin/bash
# Simple bash script to monitor new blocks

LAST_HEIGHT=0

while true; do
    CURRENT_HEIGHT=$(curl -s https://zerog-node-rpc.onrender.com/status | jq -r '.result.sync_info.latest_block_height')
    
    if [ "$CURRENT_HEIGHT" != "$LAST_HEIGHT" ]; then
        echo "New block: $CURRENT_HEIGHT at $(date)"
        LAST_HEIGHT=$CURRENT_HEIGHT
    fi
    
    sleep 5
done
```

### Transaction Tracker
```python
import requests
import time

def track_address_transactions(address):
    """Track transactions for a specific address"""
    last_checked_height = 0
    
    while True:
        # Get current height
        status = requests.get('https://zerog-node-rpc.onrender.com/status').json()
        current_height = int(status['result']['sync_info']['latest_block_height'])
        
        # Check new blocks
        for height in range(last_checked_height + 1, current_height + 1):
            txs = requests.get(f'https://zerog-node-rpc.onrender.com/tx_search?query=tx.height={height}').json()
            
            for tx in txs.get('result', {}).get('txs', []):
                # Process transaction data
                print(f"New transaction in block {height}: {tx['hash']}")
        
        last_checked_height = current_height
        time.sleep(10)

# Usage
# track_address_transactions("your_address_here")
```

---

**🎉 Your 0G Chain RPC node is ready for production use!**

*This API provides complete access to 0G Chain blockchain data. Build amazing applications with real-time blockchain data!*
