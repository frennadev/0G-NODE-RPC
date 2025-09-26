const WebSocket = require('ws');

// Test WebSocket connection to our live service
console.log('🧪 Testing 0G Live Trade Stream WebSocket...');

const ws = new WebSocket('wss://zerog-node-rpc.onrender.com/ws');

ws.on('open', function() {
    console.log('✅ Connected to 0G Trade Stream!');
    
    // Subscribe to PAI token live trades
    const subscribeMessage = {
        type: 'subscribe_live_trades',
        tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C'
    };
    
    console.log('📊 Subscribing to PAI token live trades...');
    ws.send(JSON.stringify(subscribeMessage));
    
    // Also test getting historical trades
    setTimeout(() => {
        const historyMessage = {
            type: 'get_token_trades',
            tokenAddress: '0x59ef6F3943bBdFE2fB19565037Ac85071223E94C',
            limit: 10
        };
        
        console.log('📈 Requesting historical trades...');
        ws.send(JSON.stringify(historyMessage));
    }, 2000);
});

ws.on('message', function(data) {
    const message = JSON.parse(data);
    console.log('\n📨 Received message:', message.type);
    
    switch (message.type) {
        case 'connected':
            console.log('🎉', message.message);
            break;
            
        case 'subscribed':
            console.log('📺', message.message);
            break;
            
        case 'live_trades':
            console.log('💰 LIVE TRADES DETECTED!');
            console.log(`   Block: ${message.blockNumber}`);
            console.log(`   Trades: ${message.trades.length}`);
            message.trades.forEach((trade, i) => {
                console.log(`   Trade ${i + 1}:`);
                console.log(`     Type: ${trade.type.toUpperCase()}`);
                console.log(`     Amount: ${trade.amountFormatted} ${trade.tokenSymbol}`);
                console.log(`     0G Spent: ${trade.ethValueFormatted || 0} 0G`);
                console.log(`     Total Cost: ${trade.totalCost || 0} 0G (optimized - no gas tracking)`);
                console.log(`     Price: ${trade.pricePerToken || 0} 0G per token`);
                console.log(`     Classification: ${trade.classification}`);
            });
            break;
            
        case 'token_trades':
            console.log('📊 HISTORICAL TRADES:');
            if (message.data.trades.length > 0) {
                console.log(`   Found: ${message.data.trades.length} trades`);
                message.data.trades.slice(0, 3).forEach((trade, i) => {
                    console.log(`   Trade ${i + 1}:`);
                    console.log(`     Type: ${trade.type.toUpperCase()}`);
                    console.log(`     Amount: ${trade.amountFormatted} ${trade.tokenSymbol}`);
                    console.log(`     0G Spent: ${trade.ethValueFormatted || 0} 0G`);
                    console.log(`     Total Cost: ${trade.totalCost || 0} 0G (optimized - no gas tracking)`);
                    console.log(`     Price: ${trade.pricePerToken || 0} 0G per token`);
                });
            } else {
                console.log('   No recent trades found in current block range');
            }
            break;
            
        case 'error':
            console.log('❌ Error:', message.message);
            break;
            
        default:
            console.log('📄 Unknown message type:', message.type);
    }
});

ws.on('close', function() {
    console.log('🔌 WebSocket connection closed');
});

ws.on('error', function(error) {
    console.log('❌ WebSocket error:', error.message);
});

// Keep the connection alive for 2 minutes to monitor for live trades
console.log('🚀 Testing OPTIMIZED Live Stream - monitoring for 5 minutes...');

// Show periodic status updates
let statusInterval = setInterval(() => {
    console.log(`🔄 Still monitoring... (${new Date().toLocaleTimeString()})`);
}, 15000); // Every 15 seconds

setTimeout(() => {
    console.log('⏰ 5-minute test complete, closing connection');
    clearInterval(statusInterval);
    ws.close();
    process.exit(0);
}, 300000); // 5 minutes
