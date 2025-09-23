# 0G Chain Geth-Only Node Dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy the entire aristotle package
COPY aristotle-v1.0.0/ ./

# Copy startup script
COPY start-proper-0g.sh ./
RUN chmod +x start-proper-0g.sh

# Set binary permissions
RUN chmod +x ./bin/geth ./bin/0gchaind

# Create data directory structure
RUN mkdir -p /data/0g-home/0gchaind-home/data \
    && mkdir -p /data/0g-home/0gchaind-home/config \
    && mkdir -p /data/0g-home/geth-home \
    && mkdir -p /data/0g-home/log

# Copy configuration to data directory
RUN cp -r 0g-home/* /data/0g-home/

# Expose both RPC ports
EXPOSE 8545 8546 26656 26657 30303

# Set environment variables
ENV DATA_DIR="/data"
ENV NODE_NAME="render-geth-node"

# Health check for both layers
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:26657/health && curl -f -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' || exit 1

# Start proper 0G node (both layers)
CMD ["./start-proper-0g.sh"]