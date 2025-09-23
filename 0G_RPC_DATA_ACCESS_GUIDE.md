# 0G Chain RPC - Complete Data Access Guide

🚀 **Live RPC Endpoint**: https://zerog-node-rpc.onrender.com/

## 📋 **ALL Available Endpoints**

### 🏥 **Health & Status**
```bash
# Node health check
curl https://zerog-node-rpc.onrender.com/health

# Node status (sync info, latest block, validator info)
curl https://zerog-node-rpc.onrender.com/status

# Network information (peers, connectivity)
curl https://zerog-node-rpc.onrender.com/net_info

# Consensus state
curl https://zerog-node-rpc.onrender.com/consensus_state

# Dump consensus state
curl https://zerog-node-rpc.onrender.com/dump_consensus_state
```

### 📦 **Block Data**
```bash
# Get latest block
curl https://zerog-node-rpc.onrender.com/block

# Get block by height
curl "https://zerog-node-rpc.onrender.com/block?height=2900"

# Get block by hash
curl "https://zerog-node-rpc.onrender.com/block_by_hash?hash=BLOCK_HASH"

# Get block results (transaction execution results)
curl "https://zerog-node-rpc.onrender.com/block_results?height=2900"

# Get block header only
curl "https://zerog-node-rpc.onrender.com/header?height=2900"

# Get header by hash
curl "https://zerog-node-rpc.onrender.com/header_by_hash?hash=BLOCK_HASH"

# Get blockchain info (range of blocks)
curl "https://zerog-node-rpc.onrender.com/blockchain?minHeight=2800&maxHeight=2900"

# Search blocks
curl "https://zerog-node-rpc.onrender.com/block_search?query=block.height>2900&page=1&per_page=30&order_by=desc"
```

### 🔍 **Transaction Data**
```bash
# Get transaction by hash
curl "https://zerog-node-rpc.onrender.com/tx?hash=TRANSACTION_HASH&prove=false"

# Search transactions by height
curl "https://zerog-node-rpc.onrender.com/tx_search?query=tx.height=2900&page=1&per_page=30"

# Search transactions by hash
curl "https://zerog-node-rpc.onrender.com/tx_search?query=tx.hash='TRANSACTION_HASH'"

# Search transactions by sender
curl "https://zerog-node-rpc.onrender.com/tx_search?query=message.sender='ADDRESS'"

# Search transactions by recipient
curl "https://zerog-node-rpc.onrender.com/tx_search?query=transfer.recipient='ADDRESS'"

# Search transactions by amount
curl "https://zerog-node-rpc.onrender.com/tx_search?query=transfer.amount='1000000'"

# Search transactions in block range
curl "https://zerog-node-rpc.onrender.com/tx_search?query=tx.height>=2800%20AND%20tx.height<=2900"
```

### 🔄 **Transaction Broadcasting**
```bash
# Broadcast transaction (async - returns immediately)
curl "https://zerog-node-rpc.onrender.com/broadcast_tx_async?tx=ENCODED_TRANSACTION"

# Broadcast transaction (sync - waits for mempool)
curl "https://zerog-node-rpc.onrender.com/broadcast_tx_sync?tx=ENCODED_TRANSACTION"

# Broadcast transaction (commit - waits for block inclusion)
curl "https://zerog-node-rpc.onrender.com/broadcast_tx_commit?tx=ENCODED_TRANSACTION"

# Check transaction before broadcasting
curl "https://zerog-node-rpc.onrender.com/check_tx?tx=ENCODED_TRANSACTION"
```

### 🏛️ **Validators & Consensus**
```bash
# Get validators
curl "https://zerog-node-rpc.onrender.com/validators?height=2900&page=1&per_page=30"

# Get consensus parameters
curl "https://zerog-node-rpc.onrender.com/consensus_params?height=2900"

# Get commit information
curl "https://zerog-node-rpc.onrender.com/commit?height=2900"
```

### 🌐 **Network & Genesis**
```bash
# Get genesis file
curl https://zerog-node-rpc.onrender.com/genesis

# Get genesis in chunks (for large genesis files)
curl "https://zerog-node-rpc.onrender.com/genesis_chunked?chunk=0"

# Get ABCI info
curl https://zerog-node-rpc.onrender.com/abci_info

# Query ABCI application
curl "https://zerog-node-rpc.onrender.com/abci_query?path=_&data=_&height=_&prove=false"
```

### 🔄 **Mempool Operations**
```bash
# Get unconfirmed transactions
curl "https://zerog-node-rpc.onrender.com/unconfirmed_txs?limit=30"

# Count unconfirmed transactions
curl https://zerog-node-rpc.onrender.com/num_unconfirmed_txs
```

### 📡 **WebSocket Subscriptions**
```bash
# Subscribe to new blocks
curl "https://zerog-node-rpc.onrender.com/subscribe?query=tm.event='NewBlock'"

# Subscribe to new transactions
curl "https://zerog-node-rpc.onrender.com/subscribe?query=tm.event='Tx'"

# Subscribe to validator set updates
curl "https://zerog-node-rpc.onrender.com/subscribe?query=tm.event='ValidatorSetUpdates'"

# Unsubscribe from query
curl "https://zerog-node-rpc.onrender.com/unsubscribe?query=tm.event='NewBlock'"

# Unsubscribe from all
curl https://zerog-node-rpc.onrender.com/unsubscribe_all
```

### 🔍 **Evidence & Security**
```bash
# Broadcast evidence of misbehavior
curl "https://zerog-node-rpc.onrender.com/broadcast_evidence?evidence=EVIDENCE_DATA"
```

---

## 💻 **JavaScript Examples**

### Basic Data Fetching
```javascript
// Get current status
async function getNodeStatus() {
    const response = await fetch('https://zerog-node-rpc.onrender.com/status');
    const data = await response.json();
    return {
        blockHeight: data.result.sync_info.latest_block_height,
        catchingUp: data.result.sync_info.catching_up,
        peers: data.result.sync_info.latest_block_time
    };
}

// Get latest block
async function getLatestBlock() {
    const response = await fetch('https://zerog-node-rpc.onrender.com/block');
    const data = await response.json();
    return {
        height: data.result.block.header.height,
        hash: data.result.block.header.hash,
        time: data.result.block.header.time,
        txCount: data.result.block.data.txs.length
    };
}

// Search transactions
async function searchTransactions(query, page = 1, perPage = 30) {
    const url = `https://zerog-node-rpc.onrender.com/tx_search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.result.txs;
}

// Get validators
async function getValidators(height = null) {
    const url = height 
        ? `https://zerog-node-rpc.onrender.com/validators?height=${height}`
        : 'https://zerog-node-rpc.onrender.com/validators';
    const response = await fetch(url);
    const data = await response.json();
    return data.result.validators;
}

// Get network info
async function getNetworkInfo() {
    const response = await fetch('https://zerog-node-rpc.onrender.com/net_info');
    const data = await response.json();
    return {
        peerCount: data.result.n_peers,
        listening: data.result.listening,
        peers: data.result.peers
    };
}
```

### Advanced Analytics
```javascript
// Block time analysis
async function analyzeBlockTimes(startHeight, endHeight) {
    const blockTimes = [];
    
    for (let height = startHeight; height <= endHeight; height++) {
        const response = await fetch(`https://zerog-node-rpc.onrender.com/block?height=${height}`);
        const data = await response.json();
        
        blockTimes.push({
            height: height,
            time: new Date(data.result.block.header.time),
            txCount: data.result.block.data.txs.length
        });
    }
    
    return blockTimes;
}

// Transaction volume analysis
async function getTransactionVolume(startHeight, endHeight) {
    let totalTxs = 0;
    const blockData = [];
    
    for (let height = startHeight; height <= endHeight; height++) {
        const txs = await searchTransactions(`tx.height=${height}`);
        totalTxs += txs.length;
        blockData.push({
            height: height,
            txCount: txs.length
        });
    }
    
    return {
        totalTransactions: totalTxs,
        averagePerBlock: totalTxs / (endHeight - startHeight + 1),
        blockData: blockData
    };
}

// Monitor new blocks
async function monitorNewBlocks(callback) {
    let lastHeight = 0;
    
    setInterval(async () => {
        const status = await getNodeStatus();
        const currentHeight = parseInt(status.blockHeight);
        
        if (currentHeight > lastHeight) {
            const block = await fetch(`https://zerog-node-rpc.onrender.com/block?height=${currentHeight}`);
            const blockData = await block.json();
            callback(blockData.result.block);
            lastHeight = currentHeight;
        }
    }, 5000); // Check every 5 seconds
}
```

---

## 🐍 **Python Examples**

### Basic Data Access
```python
import requests
import json
from datetime import datetime

class ZeroGRPC:
    def __init__(self):
        self.base_url = "https://zerog-node-rpc.onrender.com"
    
    def get_status(self):
        """Get node status"""
        response = requests.get(f"{self.base_url}/status")
        return response.json()['result']
    
    def get_block(self, height=None):
        """Get block by height (latest if None)"""
        url = f"{self.base_url}/block"
        if height:
            url += f"?height={height}"
        response = requests.get(url)
        return response.json()['result']['block']
    
    def search_transactions(self, query, page=1, per_page=30):
        """Search transactions"""
        url = f"{self.base_url}/tx_search?query={query}&page={page}&per_page={per_page}"
        response = requests.get(url)
        return response.json()['result']['txs']
    
    def get_validators(self, height=None):
        """Get validators"""
        url = f"{self.base_url}/validators"
        if height:
            url += f"?height={height}"
        response = requests.get(url)
        return response.json()['result']['validators']
    
    def get_network_info(self):
        """Get network information"""
        response = requests.get(f"{self.base_url}/net_info")
        return response.json()['result']

# Usage examples
rpc = ZeroGRPC()

# Get current status
status = rpc.get_status()
print(f"Latest Block: {status['sync_info']['latest_block_height']}")
print(f"Catching Up: {status['sync_info']['catching_up']}")

# Get latest block
block = rpc.get_block()
print(f"Block Hash: {block['header']['hash']}")
print(f"Transaction Count: {len(block['data']['txs'])}")

# Search transactions in specific block
txs = rpc.search_transactions("tx.height=2900")
print(f"Transactions in block 2900: {len(txs)}")

# Get validators
validators = rpc.get_validators()
print(f"Validator Count: {len(validators)}")

# Get network info
net_info = rpc.get_network_info()
print(f"Connected Peers: {net_info['n_peers']}")
```

### Advanced Analytics
```python
import pandas as pd
import matplotlib.pyplot as plt

class ZeroGAnalytics(ZeroGRPC):
    def analyze_block_times(self, start_height, end_height):
        """Analyze block times and transaction counts"""
        data = []
        
        for height in range(start_height, end_height + 1):
            block = self.get_block(height)
            data.append({
                'height': height,
                'time': block['header']['time'],
                'tx_count': len(block['data']['txs']),
                'proposer': block['header']['proposer_address']
            })
        
        df = pd.DataFrame(data)
        df['time'] = pd.to_datetime(df['time'])
        return df
    
    def get_transaction_stats(self, start_height, end_height):
        """Get transaction statistics"""
        total_txs = 0
        block_count = 0
        
        for height in range(start_height, end_height + 1):
            txs = self.search_transactions(f"tx.height={height}")
            total_txs += len(txs)
            block_count += 1
        
        return {
            'total_transactions': total_txs,
            'total_blocks': block_count,
            'avg_txs_per_block': total_txs / block_count if block_count > 0 else 0
        }
    
    def monitor_network(self, duration_minutes=60):
        """Monitor network for specified duration"""
        import time
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        monitoring_data = []
        
        while time.time() < end_time:
            status = self.get_status()
            net_info = self.get_network_info()
            
            monitoring_data.append({
                'timestamp': datetime.now(),
                'block_height': status['sync_info']['latest_block_height'],
                'catching_up': status['sync_info']['catching_up'],
                'peer_count': net_info['n_peers']
            })
            
            time.sleep(30)  # Check every 30 seconds
        
        return pd.DataFrame(monitoring_data)

# Usage
analytics = ZeroGAnalytics()

# Analyze recent blocks
df = analytics.analyze_block_times(2800, 2900)
print(f"Average transactions per block: {df['tx_count'].mean():.2f}")

# Get transaction statistics
stats = analytics.get_transaction_stats(2800, 2900)
print(f"Transaction Stats: {stats}")
```

---

## 🔧 **Go Examples**

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
    "strconv"
)

type ZeroGRPC struct {
    BaseURL string
}

type StatusResponse struct {
    Result struct {
        SyncInfo struct {
            LatestBlockHeight string `json:"latest_block_height"`
            CatchingUp        bool   `json:"catching_up"`
            LatestBlockTime   string `json:"latest_block_time"`
        } `json:"sync_info"`
    } `json:"result"`
}

type BlockResponse struct {
    Result struct {
        Block struct {
            Header struct {
                Height string `json:"height"`
                Hash   string `json:"hash"`
                Time   string `json:"time"`
            } `json:"header"`
            Data struct {
                Txs []string `json:"txs"`
            } `json:"data"`
        } `json:"block"`
    } `json:"result"`
}

func NewZeroGRPC() *ZeroGRPC {
    return &ZeroGRPC{
        BaseURL: "https://zerog-node-rpc.onrender.com",
    }
}

func (z *ZeroGRPC) GetStatus() (*StatusResponse, error) {
    resp, err := http.Get(z.BaseURL + "/status")
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

func (z *ZeroGRPC) GetBlock(height int) (*BlockResponse, error) {
    url := z.BaseURL + "/block"
    if height > 0 {
        url += "?height=" + strconv.Itoa(height)
    }

    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    var block BlockResponse
    err = json.Unmarshal(body, &block)
    return &block, err
}

func main() {
    rpc := NewZeroGRPC()

    // Get status
    status, err := rpc.GetStatus()
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    fmt.Printf("Latest Block: %s\n", status.Result.SyncInfo.LatestBlockHeight)
    fmt.Printf("Catching Up: %t\n", status.Result.SyncInfo.CatchingUp)

    // Get latest block
    block, err := rpc.GetBlock(0)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    fmt.Printf("Block Hash: %s\n", block.Result.Block.Header.Hash)
    fmt.Printf("Transaction Count: %d\n", len(block.Result.Block.Data.Txs))
}
```

---

## 🔍 **Query Examples**

### Transaction Search Queries
```bash
# Transactions in specific block
tx.height=2900

# Transactions by hash
tx.hash='TRANSACTION_HASH'

# Transactions by sender
message.sender='cosmos1...'

# Transactions by recipient
transfer.recipient='cosmos1...'

# Transactions with specific amount
transfer.amount='1000000'

# Transactions in block range
tx.height>=2800 AND tx.height<=2900

# Transactions by message type
message.action='send'

# Failed transactions
tx.code!=0

# Successful transactions
tx.code=0
```

### Block Search Queries
```bash
# Blocks by height range
block.height>2900

# Blocks by proposer
block.proposer='cosmosvaloper1...'

# Blocks with transactions
block.num_txs>0

# Empty blocks
block.num_txs=0
```

---

## 📊 **Response Formats**

All responses follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": -1,
  "result": {
    // Response data here
  }
}
```

### Error Response
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

## 🚀 **Quick Test Commands**

```bash
# Test node health
curl https://zerog-node-rpc.onrender.com/health

# Get current block height
curl -s https://zerog-node-rpc.onrender.com/status | jq '.result.sync_info.latest_block_height'

# Get peer count
curl -s https://zerog-node-rpc.onrender.com/net_info | jq '.result.n_peers'

# Get latest block hash
curl -s https://zerog-node-rpc.onrender.com/block | jq '.result.block.header.hash'

# Count transactions in latest block
curl -s https://zerog-node-rpc.onrender.com/block | jq '.result.block.data.txs | length'
```

---

## 📈 **Rate Limits & Best Practices**

- **Recommended**: Max 100 requests/minute
- **Use pagination** for large datasets
- **Cache responses** that don't change
- **Handle errors** gracefully
- **Use specific heights** when possible for better performance

---

**🎯 This is EVERYTHING your 0G Chain RPC node can do! Copy and use any of these examples to access blockchain data.**
