#!/usr/bin/env python3
"""
0G Chain RPC Proxy Server
Forwards requests to official 0G RPC endpoints without requiring local sync
"""

import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request
import urllib.error
from datetime import datetime

class RPCProxyHandler(BaseHTTPRequestHandler):
    
    OFFICIAL_RPC = os.getenv('OFFICIAL_RPC', 'https://evmrpc.0g.ai/')
    TESTNET_RPC = os.getenv('TESTNET_RPC', 'https://evmrpc-testnet.0g.ai/')
    
    def log_message(self, format, *args):
        """Custom logging with timestamps"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests (health check)"""
        if self.path in ['/', '/health']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            
            response = {
                "status": "healthy",
                "message": "0G RPC Proxy is running",
                "mainnet_rpc": self.OFFICIAL_RPC,
                "testnet_rpc": self.TESTNET_RPC,
                "usage": {
                    "mainnet": f"POST {self.headers.get('Host', 'localhost')}/",
                    "testnet": f"POST {self.headers.get('Host', 'localhost')}/?network=testnet"
                },
                "features": [
                    "No sync required",
                    "Instant access to 0G data",
                    "Mainnet and testnet support",
                    "Full RPC compatibility"
                ]
            }
            
            self.wfile.write(json.dumps(response, indent=2).encode())
        else:
            self.send_error(404, "Not Found")
    
    def do_POST(self):
        """Handle POST requests (RPC calls)"""
        try:
            # Parse query parameters
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            # Determine target RPC
            network = query_params.get('network', ['mainnet'])[0]
            target_rpc = self.TESTNET_RPC if network == 'testnet' else self.OFFICIAL_RPC
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            request_body = self.rfile.read(content_length)
            
            # Log the request
            try:
                rpc_data = json.loads(request_body.decode())
                method = rpc_data.get('method', 'unknown')
                self.log_message(f"Proxying {method} to {network} ({target_rpc})")
            except:
                self.log_message(f"Proxying request to {network}")
            
            # Forward request to target RPC
            req = urllib.request.Request(
                target_rpc,
                data=request_body,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': '0G-RPC-Proxy/1.0'
                }
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = response.read()
                
                # Send response back to client
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(response_data)
                
        except urllib.error.HTTPError as e:
            self.log_message(f"HTTP Error: {e.code} - {e.reason}")
            self.send_error(e.code, f"Upstream error: {e.reason}")
            
        except urllib.error.URLError as e:
            self.log_message(f"URL Error: {e.reason}")
            self.send_error(502, f"Bad Gateway: {e.reason}")
            
        except Exception as e:
            self.log_message(f"Proxy Error: {str(e)}")
            self.send_error(500, f"Internal Server Error: {str(e)}")
    
    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

def main():
    port = int(os.getenv('PROXY_PORT', 26657))
    
    print("🚀 Starting 0G Chain RPC Proxy Server")
    print(f"📡 Mainnet RPC: {RPCProxyHandler.OFFICIAL_RPC}")
    print(f"🧪 Testnet RPC: {RPCProxyHandler.TESTNET_RPC}")
    print(f"🌐 Listening on port: {port}")
    print("✨ No sync required - instant access to 0G data!")
    
    try:
        server = HTTPServer(('0.0.0.0', port), RPCProxyHandler)
        print(f"🎯 Server ready at http://0.0.0.0:{port}")
        print("💡 Health check: GET /health")
        print("📞 RPC calls: POST / (mainnet) or POST /?network=testnet")
        server.serve_forever()
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down proxy server...")
        server.shutdown()
        print("✅ Proxy server stopped")

if __name__ == '__main__':
    main()
