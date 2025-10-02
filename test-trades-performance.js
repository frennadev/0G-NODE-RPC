const https = require('https');

async function testTradesPerformance() {
    console.log('🧪 Testing trades endpoint performance...');
    
    const startTime = Date.now();
    
    try {
        const response = await makeRequest('http://localhost:26657/trades/0x59ef6F3943bBdFE2fB19565037Ac85071223E94C?limit=5', {
            'X-API-Key': 'zg_free_368f34327b1b292a31c810754f4911ac'
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ Response received in ${duration}ms`);
        console.log(`📊 Trades count: ${response.trades.length}`);
        console.log(`🔍 First trade:`, response.trades[0]);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const { URL } = require('url');
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: headers
        };
        
        const req = require('http').request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

testTradesPerformance();
