# 🔧 0G Chain Node Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

### **Issue 1: Geth RPC Not Responding**
**Symptoms**: `{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"Method not found"}}`

**Causes & Solutions**:

#### **A. Port Conflict**
- **Problem**: Geth trying to use port 26657 (Tendermint port)
- **Solution**: Use port 8545 for Geth
```bash
# Wrong (conflicts with Tendermint)
--http.port 26657

# Correct
--http.port 8545
```

#### **B. Missing JWT Authentication**
- **Problem**: Geth needs JWT to communicate with consensus layer
- **Solution**: Add JWT authentication
```bash
# Add these flags to Geth startup
--authrpc.jwtsecret jwt.hex
--authrpc.addr 0.0.0.0
--authrpc.port 8551
--engine
--engine.addr 0.0.0.0
--engine.port 8551
--engine.jwtsecret jwt.hex
```

#### **C. Wrong Startup Order**
- **Problem**: Geth starting before consensus layer is ready
- **Solution**: Start Geth after 0gchaind is responding
```bash
# Wait for consensus layer
curl -s http://localhost:26657/status > /dev/null

# Then start Geth
./bin/geth [flags...]
```

### **Issue 2: Process Not Starting**
**Symptoms**: `❌ Geth process not found!`

**Solutions**:

#### **A. Check Logs**
```bash
# Check Geth logs
tail -f /data/0g-home/log/geth.log

# Check 0gchaind logs
tail -f /data/0g-home/log/0gchaind.log
```

#### **B. Verify Dependencies**
```bash
# Check if binaries exist and are executable
ls -la /app/bin/
chmod +x /app/bin/*

# Check if JWT file exists
ls -la jwt.hex
```

#### **C. Check Port Availability**
```bash
# Check if ports are free
netstat -tlnp | grep -E "(26657|8545|8551)"
```

### **Issue 3: Sync Issues**
**Symptoms**: Node not syncing or stuck

**Solutions**:

#### **A. Reset Database**
```bash
# Stop processes
pkill -f geth
pkill -f 0gchaind

# Remove old data
rm -rf /data/0g-home/geth-home/geth
rm -rf /data/0g-home/0gchaind-home/data

# Reinitialize
./bin/geth init --datadir /data/0g-home/geth-home ./geth-genesis.json
./bin/0gchaind init node-name --home /data/0g-home/0gchaind-home
```

#### **B. Check Network Connectivity**
```bash
# Test external connectivity
curl -s ifconfig.me

# Test peer connections
curl -s http://localhost:26657/net_info | jq '.result.n_peers'
```

### **Issue 4: RPC Timeout**
**Symptoms**: Requests timing out after 3 seconds

**Solutions**:

#### **A. Increase Timeout**
```bash
# In your application, increase timeout
--timeout 10000  # 10 seconds instead of 3
```

#### **B. Check Resource Usage**
```bash
# Check CPU and memory usage
top -p $(pgrep geth)
top -p $(pgrep 0gchaind)

# Check disk space
df -h /data
```

## 🧪 **Testing Commands**

### **Test Consensus Layer**
```bash
# Basic health check
curl http://localhost:26657/status

# Get latest block
curl http://localhost:26657/block

# Get network info
curl http://localhost:26657/net_info
```

### **Test Execution Layer**
```bash
# Get block number
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get sync status
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'

# Get network ID
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
```

### **Test Token Operations**
```bash
# Get token name
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x59ef6F3943bBdFE2fB19565037Ac85071223E94C","data":"0x06fdde03"},"latest"],"id":1}'

# Get transfer events
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{"fromBlock":"latest","toBlock":"latest","topics":["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]}],"id":1}'
```

## 🔍 **Debugging Steps**

### **Step 1: Check Process Status**
```bash
# Check if processes are running
ps aux | grep -E "(geth|0gchaind)"

# Check process IDs
pgrep -f geth
pgrep -f 0gchaind
```

### **Step 2: Check Ports**
```bash
# Check listening ports
netstat -tlnp | grep -E "(26657|8545|8551)"

# Test port connectivity
telnet localhost 26657
telnet localhost 8545
```

### **Step 3: Check Logs**
```bash
# Follow logs in real-time
tail -f /data/0g-home/log/geth.log
tail -f /data/0g-home/log/0gchaind.log

# Search for errors
grep -i error /data/0g-home/log/*.log
grep -i fail /data/0g-home/log/*.log
```

### **Step 4: Verify Configuration**
```bash
# Check JWT file
cat jwt.hex

# Check genesis file
cat geth-genesis.json | jq '.config.chainId'

# Check network ID
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' | jq '.result'
```

## 🚀 **Quick Fixes**

### **Restart Everything**
```bash
# Kill all processes
pkill -f geth
pkill -f 0gchaind

# Wait a moment
sleep 5

# Start with fixed script
./start-fixed-0g.sh
```

### **Reset and Reinitialize**
```bash
# Stop everything
pkill -f geth
pkill -f 0gchaind

# Clean data
rm -rf /data/0g-home/*

# Run fixed startup
./start-fixed-0g.sh
```

### **Test Both Layers**
```bash
# Run comprehensive test
./test-0g-node.sh
```

## 📞 **Still Having Issues?**

If you're still experiencing problems:

1. **Check the logs** in `/data/0g-home/log/`
2. **Run the test script** with `./test-0g-node.sh`
3. **Verify your configuration** matches the examples above
4. **Check resource usage** (CPU, memory, disk space)
5. **Ensure network connectivity** to 0G network

The most common issue is the **port conflict** between Tendermint (26657) and Geth trying to use the same port. Make sure Geth uses port 8545!
