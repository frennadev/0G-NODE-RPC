module.exports = {
  apps: [
    {
      name: '0g-unified-service',
      script: 'unified-service.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        OFFICIAL_RPC: 'https://evmrpc.0g.ai/',
        TESTNET_RPC: 'https://evmrpc-testnet.0g.ai/',
        PORT: 26657,
        WS_PORT: 26658,
        PROXY_PORT: 26657
      },
      error_file: './logs/unified-service-error.log',
      out_file: './logs/unified-service-out.log',
      log_file: './logs/unified-service-combined.log',
      time: true,
      max_memory_restart: '4G',
      node_args: '--max-old-space-size=4096'
    }
  ]
};
