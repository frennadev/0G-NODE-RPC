# 0G Chain Node - Render Deployment

🚀 **One-click deployment of 0G Chain node to Render.com**

## Quick Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Overview

This repository contains everything needed to deploy a 0G Chain node on Render.com. The node provides access to on-chain data through RPC endpoints.

### Network Information
- **Chain ID**: 16661
- **Network**: 0G Mainnet (Private)
- **RPC**: http://evmrpc.0g.ai/
- **Explorer**: https://chainscan.0g.ai/

## Architecture

- **Consensus Layer**: 0gchaind (Tendermint-based)
- **Execution Layer**: Geth (Ethereum-compatible)
- **Container**: Ubuntu 22.04 with Docker
- **Storage**: Persistent disk for blockchain data

## Deployment Options

### Option 1: Deploy to Render (Recommended)

1. **Fork this repository** to your GitHub account
2. **Connect to Render**:
   - Go to [render.com](https://render.com)
   - Connect your GitHub account
   - Select this repository
3. **Configure deployment**:
   - Service Type: Web Service
   - Build Command: `docker build -t og-node .`
   - Start Command: `./start-node.sh`
   - Plan: **Pro or higher** (required for resources)
4. **Set environment variables**:
   - `NODE_NAME`: Your node name (optional)
   - `PORT`: 26657
5. **Configure resources**:
   - **Minimum**: 4 CPU cores, 16GB RAM, 100GB storage
   - **Recommended**: 8 CPU cores, 64GB RAM, 1TB storage

### Option 2: Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd 0g-chain-node

# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Endpoints

Once deployed, your node will expose:

- **Consensus RPC**: `https://your-app.onrender.com:26657`
- **Execution RPC**: `https://your-app.onrender.com:8545`
- **Health Check**: `https://your-app.onrender.com/health`

## Monitoring

### Check Node Status

```bash
# Sync status
curl https://your-app.onrender.com:26657/status | jq '.result.sync_info'

# Peer count
curl https://your-app.onrender.com:26657/net_info | jq '.result.n_peers'

# Latest block
curl https://your-app.onrender.com:26657/block | jq '.result.block.header.height'
```

### Example Queries

```bash
# Get latest block number (Execution layer)
curl -X POST https://your-app.onrender.com:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get account balance
curl -X POST https://your-app.onrender.com:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x...","latest"],"id":1}'
```

## Resource Requirements

### Minimum (Development)
- **CPU**: 4 cores
- **RAM**: 16 GB
- **Storage**: 100 GB
- **Plan**: Render Pro ($85/month)

### Recommended (Production)
- **CPU**: 8 cores
- **RAM**: 64 GB
- **Storage**: 1 TB
- **Plan**: Render Pro Plus or Custom

## Files Structure

```
├── Dockerfile              # Container configuration
├── docker-compose.yml      # Local development
├── render.yaml             # Render deployment config
├── start-node.sh           # Node startup script
├── aristotle-v1.0.0/       # 0G node binaries and config
│   ├── bin/
│   │   ├── geth            # Execution client
│   │   └── 0gchaind        # Consensus client
│   ├── geth-config.toml    # Geth configuration
│   ├── geth-genesis.json   # Genesis block
│   └── 0g-home/            # Default configuration
└── README.md               # This file
```

## Troubleshooting

### Node Not Syncing
- Check if ports are accessible
- Verify peer connectivity: `curl https://your-app.onrender.com:26657/net_info`
- Monitor logs in Render dashboard

### High Resource Usage
- Monitor CPU/RAM usage in Render dashboard
- Consider upgrading to higher plan
- Check sync progress: node uses more resources during initial sync

### Connection Issues
- Verify service is running: `curl https://your-app.onrender.com/health`
- Check Render service logs
- Ensure proper port configuration

## Security Notes

⚠️ **Important**:
- Node keys are auto-generated on first run
- Private keys are stored in persistent storage
- Only expose necessary ports
- Consider using environment variables for sensitive config

## Support

### 0G Network
- **Documentation**: https://docs.0g.ai
- **Explorer**: https://chainscan.0g.ai
- **Security**: security@0g.ai

### Render Support
- **Documentation**: https://render.com/docs
- **Support**: https://render.com/support

## Cost Estimation

### Render Pricing (Monthly)
- **Pro Plan**: $85/month (4 CPU, 16GB RAM, 100GB storage)
- **Pro Plus**: $340/month (8 CPU, 32GB RAM, 500GB storage)
- **Custom**: Contact Render for 64GB+ RAM requirements

### Additional Costs
- **Extra Storage**: $0.25/GB/month beyond plan limits
- **Bandwidth**: Usually included in plan
- **Backup**: Optional, additional cost

---

## Quick Start Commands

```bash
# 1. Fork this repo to your GitHub
# 2. Connect to Render and deploy
# 3. Wait for initial sync (may take hours)
# 4. Test your endpoints:

curl https://your-app.onrender.com:26657/status
curl https://your-app.onrender.com:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

🎉 **Your 0G Chain node is now live and accessible worldwide!**
