# 0G Chain Geth RPC Commands - Complete Reference

## 🌐 **Official Network Endpoints**

### **Mainnet (Primary Network)**
- **Primary RPC**: https://evmrpc.0g.ai/
- **Block Explorer**: https://chainscan.0g.ai

### **Testnet**
- **Testnet RPC**: https://evmrpc-testnet.0g.ai
- **Block Explorer**: https://chainscan.0g.ai (supports both networks)

### **Additional Services**
- **Pyth Price Feed**: https://hermes.pyth.network

### **Custom Node (Development)**
- **Custom RPC**: https://zerog-node-rpc.onrender.com/

---

## ⚠️ **Network Selection Guide**
- 🟢 **Use Mainnet** (`https://evmrpc.0g.ai/`) for production applications and real transactions
- 🟡 **Use Testnet** (`https://evmrpc-testnet.0g.ai`) for development, testing, and experimentation
- 🔧 **Use Custom Node** for local development or when running your own 0G node

## 📊 **Current Status**
- ✅ **Official Mainnet RPC**: Fully operational
- ✅ **Official Testnet RPC**: Fully operational  
- ❌ **Custom Node (Render)**: Execution layer not responding to eth_* methods

## 🔍 **Testing with Address: 0x8B598A7C136215A95ba0282b4d832B9f9801f2e2**

### **Current Test Results:**
```bash
# Test 1: eth_blockNumber
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Result: {"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"Method not found"}}

# Test 2: eth_getBalance for 0x8B598A7C136215A95ba0282b4d832B9f9801f2e2
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x8B598A7C136215A95ba0282b4d832B9f9801f2e2","latest"],"id":1}'

# Result: {"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"Method not found"}}
```

**Issue**: Geth execution layer is not running or not accessible through nginx proxy.

---

## 📚 **Complete Geth RPC Commands Reference**

### **🏦 Account & Balance Queries**

#### Get Account Balance
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x8B598A7C136215A95ba0282b4d832B9f9801f2e2","latest"],"id":1}'
```
**Returns**: Balance in wei (divide by 1e18 for ETH)

#### Get Transaction Count (Nonce)
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getTransactionCount","params":["0x8B598A7C136215A95ba0282b4d832B9f9801f2e2","latest"],"id":1}'
```
**Returns**: Number of transactions sent from address

#### Get Account Code
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x8B598A7C136215A95ba0282b4d832B9f9801f2e2","latest"],"id":1}'
```
**Returns**: Contract bytecode (0x if EOA)

---

### **📦 Block Information**

#### Get Latest Block Number
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### Get Block by Number
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x1b4","true"],"id":1}'
```

#### Get Block by Hash
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBlockByHash","params":["0xBLOCK_HASH","true"],"id":1}'
```

#### Get Block Transaction Count
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBlockTransactionCountByNumber","params":["latest"],"id":1}'
```

---

### **💸 Transaction Queries**

#### Get Transaction by Hash
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getTransactionByHash","params":["0xTX_HASH"],"id":1}'
```

#### Get Transaction Receipt
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["0xTX_HASH"],"id":1}'
```

#### Get Transaction by Block and Index
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getTransactionByBlockNumberAndIndex","params":["latest","0x0"],"id":1}'
```

---

### **🔧 Smart Contract Calls**

#### Call Contract Method (Read-Only)
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0xCONTRACT_ADDRESS","data":"0xMETHOD_SIGNATURE"},"latest"],"id":1}'
```

#### Estimate Gas
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_estimateGas","params":[{"to":"0x8B598A7C136215A95ba0282b4d832B9f9801f2e2","value":"0x9184e72a000"}],"id":1}'
```

#### Get Storage At Position
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getStorageAt","params":["0xCONTRACT_ADDRESS","0x0","latest"],"id":1}'
```

---

### **⛽ Gas & Fee Information**

#### Get Gas Price
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}'
```

#### Get Max Priority Fee (EIP-1559)
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_maxPriorityFeePerGas","params":[],"id":1}'
```

#### Get Fee History
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_feeHistory","params":["0x4","latest",["0.25","0.75"]],"id":1}'
```

---

### **🌐 Network Information**

#### Get Chain ID
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

#### Get Network ID
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
```

#### Get Peer Count
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```

#### Check Network Listening
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_listening","params":[],"id":1}'
```

---

### **📡 Transaction Broadcasting**

#### Send Raw Transaction
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_sendRawTransaction","params":["0xSIGNED_TX_DATA"],"id":1}'
```

---

### **📋 Logs & Events**

#### Get Logs
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{"fromBlock":"0x1","toBlock":"latest","address":"0x8B598A7C136215A95ba0282b4d832B9f9801f2e2"}],"id":1}'
```

#### Create New Block Filter
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_newBlockFilter","params":[],"id":1}'
```

#### Create Pending Transaction Filter
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_newPendingTransactionFilter","params":[],"id":1}'
```

#### Get Filter Changes
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getFilterChanges","params":["0xFILTER_ID"],"id":1}'
```

---

### **⛏️ Mining Information**

#### Get Coinbase
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_coinbase","params":[],"id":1}'
```

#### Check Mining Status
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_mining","params":[],"id":1}'
```

#### Get Hashrate
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_hashrate","params":[],"id":1}'
```

---

### **🔄 Sync Status**

#### Get Sync Status
```bash
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'
```

---

## 💻 **JavaScript Client for Address 0x8B598A7C136215A95ba0282b4d832B9f9801f2e2**

```javascript
class ZeroGAddressAnalyzer {
    constructor() {
        this.rpcUrl = 'https://zerog-node-rpc.onrender.com/';
        this.address = '0x8B598A7C136215A95ba0282b4d832B9f9801f2e2';
    }

    async rpcCall(method, params = []) {
        try {
            const response = await fetch(this.rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: method,
                    params: params,
                    id: 1
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`RPC Error: ${data.error.message}`);
            }
            
            return data.result;
        } catch (error) {
            console.error(`Failed to call ${method}:`, error);
            throw error;
        }
    }

    async getAddressInfo() {
        console.log(`🔍 Analyzing address: ${this.address}`);
        
        try {
            // Get balance
            const balanceWei = await this.rpcCall('eth_getBalance', [this.address, 'latest']);
            const balanceEth = parseInt(balanceWei, 16) / 1e18;
            
            // Get transaction count
            const txCount = await this.rpcCall('eth_getTransactionCount', [this.address, 'latest']);
            const txCountDecimal = parseInt(txCount, 16);
            
            // Get code (check if contract)
            const code = await this.rpcCall('eth_getCode', [this.address, 'latest']);
            const isContract = code !== '0x';
            
            return {
                address: this.address,
                balance: {
                    wei: balanceWei,
                    eth: balanceEth
                },
                transactionCount: txCountDecimal,
                isContract: isContract,
                code: isContract ? code : null
            };
            
        } catch (error) {
            console.error('❌ Error analyzing address:', error.message);
            return null;
        }
    }

    async getRecentTransactions(blockCount = 10) {
        console.log(`📋 Getting recent transactions for ${this.address}`);
        
        try {
            const latestBlock = await this.rpcCall('eth_blockNumber');
            const latestBlockNum = parseInt(latestBlock, 16);
            
            const transactions = [];
            
            for (let i = 0; i < blockCount; i++) {
                const blockNum = latestBlockNum - i;
                const block = await this.rpcCall('eth_getBlockByNumber', [`0x${blockNum.toString(16)}`, true]);
                
                if (block && block.transactions) {
                    const relevantTxs = block.transactions.filter(tx => 
                        tx.from.toLowerCase() === this.address.toLowerCase() ||
                        tx.to?.toLowerCase() === this.address.toLowerCase()
                    );
                    
                    transactions.push(...relevantTxs);
                }
            }
            
            return transactions;
            
        } catch (error) {
            console.error('❌ Error getting transactions:', error.message);
            return [];
        }
    }

    async analyzeComplete() {
        console.log('🚀 Starting complete address analysis...\n');
        
        // Basic info
        const addressInfo = await this.getAddressInfo();
        if (addressInfo) {
            console.log('📊 Address Information:');
            console.log(`   Balance: ${addressInfo.balance.eth} ETH`);
            console.log(`   Transaction Count: ${addressInfo.transactionCount}`);
            console.log(`   Type: ${addressInfo.isContract ? 'Contract' : 'EOA'}`);
            console.log('');
        }
        
        // Recent transactions
        const transactions = await this.getRecentTransactions();
        console.log(`📋 Found ${transactions.length} recent transactions`);
        
        return {
            addressInfo,
            transactions
        };
    }
}

// Usage
const analyzer = new ZeroGAddressAnalyzer();
analyzer.analyzeComplete();
```

---

## 🐍 **Python Client for Address Analysis**

```python
import requests
import json

class ZeroGAddressAnalyzer:
    def __init__(self):
        self.rpc_url = 'https://zerog-node-rpc.onrender.com/'
        self.address = '0x8B598A7C136215A95ba0282b4d832B9f9801f2e2'
    
    def rpc_call(self, method, params=None):
        if params is None:
            params = []
        
        payload = {
            'jsonrpc': '2.0',
            'method': method,
            'params': params,
            'id': 1
        }
        
        try:
            response = requests.post(self.rpc_url, json=payload)
            data = response.json()
            
            if 'error' in data:
                raise Exception(f"RPC Error: {data['error']['message']}")
            
            return data['result']
        except Exception as e:
            print(f"❌ Failed to call {method}: {e}")
            raise
    
    def get_address_info(self):
        print(f"🔍 Analyzing address: {self.address}")
        
        try:
            # Get balance
            balance_wei = self.rpc_call('eth_getBalance', [self.address, 'latest'])
            balance_eth = int(balance_wei, 16) / 1e18
            
            # Get transaction count
            tx_count = self.rpc_call('eth_getTransactionCount', [self.address, 'latest'])
            tx_count_decimal = int(tx_count, 16)
            
            # Get code
            code = self.rpc_call('eth_getCode', [self.address, 'latest'])
            is_contract = code != '0x'
            
            return {
                'address': self.address,
                'balance': {
                    'wei': balance_wei,
                    'eth': balance_eth
                },
                'transaction_count': tx_count_decimal,
                'is_contract': is_contract,
                'code': code if is_contract else None
            }
            
        except Exception as e:
            print(f"❌ Error analyzing address: {e}")
            return None
    
    def analyze_complete(self):
        print("🚀 Starting complete address analysis...\n")
        
        # Get address info
        address_info = self.get_address_info()
        if address_info:
            print("📊 Address Information:")
            print(f"   Balance: {address_info['balance']['eth']} ETH")
            print(f"   Transaction Count: {address_info['transaction_count']}")
            print(f"   Type: {'Contract' if address_info['is_contract'] else 'EOA'}")
            print("")
        
        return address_info

# Usage
analyzer = ZeroGAddressAnalyzer()
result = analyzer.analyze_complete()
```

---

## 🧪 **Test Commands for 0x8B598A7C136215A95ba0282b4d832B9f9801f2e2**

### **Quick Tests (Copy & Paste)**

```bash
# Test 1: Get balance
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x8B598A7C136215A95ba0282b4d832B9f9801f2e2","latest"],"id":1}'

# Test 2: Get transaction count
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getTransactionCount","params":["0x8B598A7C136215A95ba0282b4d832B9f9801f2e2","latest"],"id":1}'

# Test 3: Check if contract
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x8B598A7C136215A95ba0282b4d832B9f9801f2e2","latest"],"id":1}'

# Test 4: Get latest block number
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Test 5: Get chain ID
curl -X POST https://zerog-node-rpc.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

---

## 🚨 **Current Issue: Geth Not Responding**

**Problem**: All eth_* methods return "Method not found"

**Possible Causes**:
1. Geth process not starting in container
2. Nginx proxy not routing to Geth correctly
3. Geth configuration issues
4. Resource limits preventing Geth startup

**Next Steps**:
1. Check Render deployment logs
2. Verify both processes are running
3. Fix nginx routing configuration
4. Ensure proper JWT authentication between layers

---

**Once Geth is working, all these commands will return real data for address 0x8B598A7C136215A95ba0282b4d832B9f9801f2e2! 🚀**
