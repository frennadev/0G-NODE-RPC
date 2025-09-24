module.exports = {
  apps: [
    {
      name: '0g-rpc-proxy',
      script: 'enhanced-proxy-server.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        OFFICIAL_RPC: 'https://evmrpc.0g.ai/',
        TESTNET_RPC: 'https://evmrpc-testnet.0g.ai/',
        PROXY_PORT: 26657,
        MONITORING_PORT: 9615
      },
      error_file: './logs/rpc-proxy-error.log',
      out_file: './logs/rpc-proxy-out.log',
      log_file: './logs/rpc-proxy-combined.log',
      time: true,
      max_memory_restart: '2G',
      node_args: '--max-old-space-size=2048'
    },
    {
      name: '0g-trade-stream',
      script: 'enhanced-trade-tracker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        RPC_URL: 'http://localhost:26657/',
        PORT: 6000,
        WS_PORT: 6001,
        MAX_TOKENS: 10,
        CACHE_SIZE: 1000
      },
      error_file: './logs/trade-stream-error.log',
      out_file: './logs/trade-stream-out.log',
      log_file: './logs/trade-stream-combined.log',
      time: true,
      max_memory_restart: '4G',
      node_args: '--max-old-space-size=4096',
      // Wait for RPC proxy to start first
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
