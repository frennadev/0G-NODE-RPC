# 0G Chain Node Dockerfile
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
COPY start-node.sh ./
RUN chmod +x start-node.sh

# Set binary permissions
RUN chmod +x ./bin/geth ./bin/0gchaind

# Create data directory
RUN mkdir -p /data/0g-home/log

# Copy configuration to data directory
RUN cp -r 0g-home/* /data/0g-home/

# Expose ports
EXPOSE 8545 8546 26656 26657 30303

# Set environment variables
ENV DATA_DIR="/data"
ENV NODE_NAME="render-0g-node"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:26657/health || exit 1

# Start the node
CMD ["./start-node.sh"]
