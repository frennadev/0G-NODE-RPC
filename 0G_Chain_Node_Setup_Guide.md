# 0G Chain Node Setup Guide for On-Chain Data Access

## Overview

This guide provides step-by-step instructions for setting up a 0G Chain node to access on-chain data on the Aristotle v1.0.0 private mainnet. This setup will allow you to query blockchain data, monitor transactions, and interact with the 0G network.

## Network Information

### Core Parameters
- **Network Name**: 0G Mainnet
- **Chain ID**: 16661
- **Native Token**: 0G
- **Peak TPS**: 10,000
- **EVM Compatible**: Yes

### Public Endpoints
- **RPC**: http://evmrpc.0g.ai/
- **Explorer**: https://chainscan.0g.ai/
  - **Username**: `0g-private`
  - **Password**: `asd123!`
- **Storage Indexer**: https://indexer-storage-turbo.0g.ai
- **Storage Scan**: https://storagescan.0g.ai/
- **Documentation**: https://docs.0g.ai

## Prerequisites

### System Requirements
- **CPU**: 8 cores minimum
- **RAM**: 64 GB minimum
- **Storage**: 1 TB NVMe SSD
- **Network**: 1 Gbps connection
- **OS**: Linux (Ubuntu 20.04+ recommended)

### Required Files
- `aristotle-v1.0.0.tar.gz` (provided binary package)

## Installation Steps

### Step 1: Extract the Archive

Extract the Aristotle node package to your home directory:

```bash
cd ~
tar -xzvf aristotle-v1.0.0.tar.gz
```

### Step 2: Create Data Directory

Create a directory to store blockchain data and logs:

```bash
# Replace with your preferred data path
export DATA_DIR="/opt/0g-node"
mkdir -p $DATA_DIR
```

### Step 3: Copy Default Configuration

Copy the pre-configured 0g-home directory to your data path:

```bash
cd aristotle-v1.0.0/
cp -r 0g-home $DATA_DIR/
```

### Step 4: Set Binary Permissions

Grant execute permissions to the node binaries:

```bash
sudo chmod +x ./bin/geth
sudo chmod +x ./bin/0gchaind
```

### Step 5: Initialize Geth (Execution Layer)

Initialize the Geth execution client with the genesis configuration:

```bash
./bin/geth init --datadir $DATA_DIR/0g-home/geth-home ./geth-genesis.json
```

**Expected output**: "Successfully wrote genesis state"

### Step 6: Initialize 0gchaind (Consensus Layer)

Create a temporary initialization for generating node keys:

```bash
# Replace with your preferred node name
export NODE_NAME="my-0g-node"
./bin/0gchaind init $NODE_NAME --home $DATA_DIR/tmp
```

### Step 7: Copy Node Keys

Copy the generated node keys to the permanent directory:

```bash
cp $DATA_DIR/tmp/data/priv_validator_state.json $DATA_DIR/0g-home/0gchaind-home/data/
cp $DATA_DIR/tmp/config/node_key.json $DATA_DIR/0g-home/0gchaind-home/config/
cp $DATA_DIR/tmp/config/priv_validator_key.json $DATA_DIR/0g-home/0gchaind-home/config/
```

### Step 8: Generate JWT Authentication Token

Generate a JWT token for secure communication between Geth and 0gchaind:

```bash
./bin/0gchaind jwt generate --home $DATA_DIR/0g-home/0gchaind-home
cp -f $DATA_DIR/0g-home/0gchaind-home/config/jwt.hex ./
```

### Step 9: Configure Node Name

Update the node moniker in the configuration file:

```bash
sed -i "s/moniker = \"0G-mainnet-aristotle-node\"/moniker = \"$NODE_NAME\"/" $DATA_DIR/0g-home/0gchaind-home/config/config.toml
```

### Step 10: Verify Configuration Files

Ensure all required configuration files are present:

```bash
ls -la $DATA_DIR/0g-home/0gchaind-home/config/
```

**Should display**:
- `app.toml`
- `client.toml`
- `config.toml`
- `genesis.json`
- `jwt.hex`
- `node_key.json`
- `priv_validator_key.json`

## Starting the Node

### Step 11: Start 0gchaind (Consensus Layer)

Launch the 0gchaind consensus client as a background process:

```bash
cd ~/aristotle-v1.0.0

# Get your external IP address
export NODE_IP=$(curl -s ifconfig.me)

# Create log directory if it doesn't exist
mkdir -p $DATA_DIR/0g-home/log

nohup ./bin/0gchaind start \
    --rpc.laddr tcp://0.0.0.0:26657 \
    --chaincfg.kzg.trusted-setup-path=kzg-trusted-setup.json \
    --chaincfg.engine.jwt-secret-path=jwt.hex \
    --chaincfg.block-store-service.enabled \
    --home $DATA_DIR/0g-home/0gchaind-home \
    --p2p.external_address $NODE_IP:26656 > $DATA_DIR/0g-home/log/0gchaind.log 2>&1 &
```

### Step 12: Start Geth (Execution Layer)

Launch the Geth execution client as a background process:

```bash
nohup ./bin/geth \
    --config geth-config.toml \
    --nat extip:$NODE_IP \
    --datadir $DATA_DIR/0g-home/geth-home \
    --networkid 16661 > $DATA_DIR/0g-home/log/geth.log 2>&1 &
```

## Monitoring and Verification

### Check Node Status

Monitor the synchronization progress:

```bash
# Check 0gchaind logs
tail -f $DATA_DIR/0g-home/log/0gchaind.log

# Check geth logs
tail -f $DATA_DIR/0g-home/log/geth.log
```

### Verify Sync Status

Check if your node is synchronized:

```bash
# Check sync status (should show "catching_up": false when fully synced)
curl -s http://localhost:26657/status | jq '.result.sync_info | {latest_block_height, catching_up}'

# Check peer connectivity
curl http://localhost:26657/net_info | jq '.result.n_peers'
```

### Check Running Processes

Verify both services are running:

```bash
ps aux | grep 0gchaind
ps aux | grep geth
```

## Accessing On-Chain Data

### RPC Endpoints

Once your node is synchronized, you can access on-chain data through these endpoints:

#### Consensus Layer (Tendermint RPC)
- **Port**: 26657
- **Endpoint**: http://localhost:26657

#### Execution Layer (Ethereum JSON-RPC)
- **Port**: 8545 (default from geth-config.toml)
- **Endpoint**: http://localhost:8545

### Example Queries

#### Get Latest Block Information
```bash
# Consensus layer
curl http://localhost:26657/block

# Execution layer
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

#### Get Transaction by Hash
```bash
# Replace with actual transaction hash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getTransactionByHash","params":["0x..."],"id":1}' \
  http://localhost:8545
```

#### Get Account Balance
```bash
# Replace with actual address
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x...","latest"],"id":1}' \
  http://localhost:8545
```

## Process Management

### Stop Node Services
```bash
pkill 0gchaind
pkill geth
```

### Restart Services
```bash
# Restart 0gchaind
cd ~/aristotle-v1.0.0
nohup ./bin/0gchaind start \
    --rpc.laddr tcp://0.0.0.0:26657 \
    --chaincfg.kzg.trusted-setup-path=kzg-trusted-setup.json \
    --chaincfg.engine.jwt-secret-path=jwt.hex \
    --chaincfg.block-store-service.enabled \
    --home $DATA_DIR/0g-home/0gchaind-home \
    --p2p.external_address $NODE_IP:26656 > $DATA_DIR/0g-home/log/0gchaind.log 2>&1 &

# Restart Geth
nohup ./bin/geth \
    --config geth-config.toml \
    --nat extip:$NODE_IP \
    --datadir $DATA_DIR/0g-home/geth-home \
    --networkid 16661 > $DATA_DIR/0g-home/log/geth.log 2>&1 &
```

## Troubleshooting

### Node Not Syncing
- Ensure ports 26656 and 26657 are open in your firewall
- Check peer connectivity: `curl http://localhost:26657/net_info | jq '.result.n_peers'`
- Verify network connectivity to other 0G nodes

### RPC Not Responding
- Check if services are running: `ps aux | grep -E "(geth|0gchaind)"`
- Verify ports are not blocked by firewall
- Check logs for error messages

### Disk Space Issues
- Monitor disk usage: `df -h`
- Consider using archive pruning if running low on space
- Ensure at least 1TB of free space for full sync

## Security Considerations

⚠️ **Important Security Notes**:

- Keep your `priv_validator_key.json` secure - it contains your node's private key
- Only expose RPC ports if necessary for your use case
- Consider using a firewall to restrict RPC access to trusted IPs
- Regularly update your node software when new versions are released
- Use HTTPS/TLS for production RPC endpoints

## Performance Optimization

### For High-Performance Data Access

If you need to handle high-volume data queries, consider:

1. **Archive Node Setup**: Use the archive configuration for complete historical data
2. **SSD Storage**: Use high-performance NVMe SSDs
3. **Memory**: Increase RAM to 128GB+ for better caching
4. **Network**: Ensure low-latency, high-bandwidth connection

### Archive Node Configuration

For complete historical data access, modify the Geth startup command:

```bash
nohup ./bin/geth \
    --config geth-archive-config.toml \
    --state.scheme=hash \
    --syncmode=full \
    --gcmode=archive \
    --nat extip:$NODE_IP \
    --datadir $DATA_DIR/0g-home/geth-home \
    --networkid 16661 > $DATA_DIR/0g-home/log/geth.log 2>&1 &
```

## Support and Resources

### Documentation
- **Official Docs**: https://docs.0g.ai
- **Precompiles**: https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/precompiles/precompiles-overview

### Emergency Contacts
- **Security Team**: security@0g.ai

### Communication Channels
- **Emergency**: #emergency-mainnet
- **Coordination**: #validator-coordination
- **Public Updates**: #mainnet-announcements

## Sync Time Expectations

📝 **Important Notes**:

- Initial synchronization may take several hours to days depending on network size and your hardware
- Monitor `"catching_up": false` in status to confirm full sync
- Block height should continuously increase when synced
- Archive nodes require significantly more time and storage space

---

*This document is proprietary and confidential, created for AiForge & 0G Labs only. Unauthorized access, use, or distribution is prohibited and may result in legal action.*
