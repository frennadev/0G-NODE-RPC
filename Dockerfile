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
COPY start-geth-only.sh ./
RUN chmod +x start-geth-only.sh

# Set binary permissions
RUN chmod +x ./bin/geth

# Create data directory structure
RUN mkdir -p /data/geth-home

# Copy geth configuration
RUN cp -r 0g-home/geth-home/* /data/geth-home/ || true

# Expose Geth ports
EXPOSE 8545 8546 30303

# Set environment variables
ENV DATA_DIR="/data"
ENV NODE_NAME="render-geth-node"

# Health check for Geth
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' || exit 1

# Start Geth only
CMD ["./start-geth-only.sh"]