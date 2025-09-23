// 0G Chain Swap Transaction Analyzer
// Transaction: 0x6f2653877a1029f8a57874f800063fc26fea1972c9d95d0b3eb60af198740519

const RPC_URL = 'https://zerog-node-rpc.onrender.com/';

class ZeroGSwapAnalyzer {
    constructor() {
        this.rpcUrl = RPC_URL;
        this.txHash = '0x6f2653877a1029f8a57874f800063fc26fea1972c9d95d0b3eb60af198740519';
    }

    async rpcCall(method, params = []) {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: 1
            })
        });
        
        const data = await response.json();
        if (data.error) {
            throw new Error(`RPC Error: ${data.error.message}`);
        }
        return data.result;
    }

    async getTransaction() {
        console.log('🔍 Getting transaction details...');
        try {
            const tx = await this.rpcCall('eth_getTransactionByHash', [this.txHash]);
            return tx;
        } catch (error) {
            console.error('❌ Transaction not found:', error.message);
            return null;
        }
    }

    async getTransactionReceipt() {
        console.log('📋 Getting transaction receipt...');
        try {
            const receipt = await this.rpcCall('eth_getTransactionReceipt', [this.txHash]);
            return receipt;
        } catch (error) {
            console.error('❌ Receipt not found:', error.message);
            return null;
        }
    }

    async analyzeSwapTransaction() {
        console.log('🚀 Starting Swap Transaction Analysis');
        console.log('Transaction Hash:', this.txHash);
        console.log('');

        // Get transaction details
        const tx = await this.getTransaction();
        if (!tx) {
            console.log('⏳ Node is still syncing. Try again later when indexing is complete.');
            return;
        }

        console.log('📊 Transaction Details:');
        console.log('  From:', tx.from);
        console.log('  To:', tx.to, '(DEX Router/Pool)');
        console.log('  Value:', parseInt(tx.value, 16) / 1e18, 'ETH');
        console.log('  Gas Used:', parseInt(tx.gas, 16));
        console.log('  Gas Price:', parseInt(tx.gasPrice, 16) / 1e9, 'Gwei');
        console.log('');

        // Get transaction receipt for logs
        const receipt = await this.getTransactionReceipt();
        if (receipt) {
            console.log('📋 Transaction Receipt:');
            console.log('  Status:', receipt.status === '0x1' ? '✅ Success' : '❌ Failed');
            console.log('  Block Number:', parseInt(receipt.blockNumber, 16));
            console.log('  Gas Used:', parseInt(receipt.gasUsed, 16));
            console.log('  Logs Count:', receipt.logs.length);
            console.log('');

            // Analyze logs for swap events
            this.analyzeLogs(receipt.logs);
        }

        // Analyze input data
        if (tx.input && tx.input !== '0x') {
            this.analyzeInputData(tx.input);
        }

        return { transaction: tx, receipt: receipt };
    }

    analyzeLogs(logs) {
        console.log('🔍 Analyzing Event Logs:');
        
        logs.forEach((log, index) => {
            console.log(`  Log ${index + 1}:`);
            console.log(`    Address: ${log.address} (Contract)`);
            console.log(`    Topics: ${log.topics.length} topics`);
            
            // Common DEX event signatures
            const eventSignatures = {
                '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822': 'Swap',
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer',
                '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval',
                '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1': 'Sync',
                '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f': 'Mint',
                '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496': 'Burn'
            };

            if (log.topics.length > 0) {
                const signature = log.topics[0];
                const eventName = eventSignatures[signature] || 'Unknown';
                console.log(`    Event: ${eventName} (${signature})`);
                
                if (eventName === 'Swap') {
                    console.log('    🔄 This is a SWAP event!');
                    console.log('    📊 Pool Address:', log.address);
                }
            }
            console.log('');
        });
    }

    analyzeInputData(inputData) {
        console.log('🔍 Analyzing Input Data:');
        console.log('  Length:', inputData.length, 'characters');
        console.log('  Method Signature:', inputData.slice(0, 10));
        
        // Common DEX method signatures
        const methodSignatures = {
            '0x7ff36ab5': 'swapExactETHForTokens',
            '0x18cbafe5': 'swapExactTokensForETH',
            '0x38ed1739': 'swapExactTokensForTokens',
            '0x8803dbee': 'swapTokensForExactTokens',
            '0xfb3bdb41': 'swapETHForExactTokens',
            '0x4a25d94a': 'swapTokensForExactETH',
            '0x02751cec': 'removeLiquidity',
            '0xf305d719': 'addLiquidityETH',
            '0xe8e33700': 'addLiquidity'
        };

        const methodSig = inputData.slice(0, 10);
        const methodName = methodSignatures[methodSig] || 'Unknown';
        console.log('  Method:', methodName);
        console.log('');
    }

    // Extract pool information from swap transaction
    async extractPoolData(tx, receipt) {
        console.log('🏊 Extracting Pool Data:');
        
        if (!receipt || !receipt.logs) return;

        const poolAddresses = new Set();
        const tokenAddresses = new Set();

        receipt.logs.forEach(log => {
            // Pool address is usually the contract that emitted the log
            poolAddresses.add(log.address);
            
            // For Transfer events, extract token addresses
            if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                tokenAddresses.add(log.address);
            }
        });

        console.log('  Pool Addresses Found:', Array.from(poolAddresses));
        console.log('  Token Addresses Found:', Array.from(tokenAddresses));

        // For each pool, get reserves
        for (const poolAddress of poolAddresses) {
            await this.getPoolReserves(poolAddress);
        }
    }

    async getPoolReserves(poolAddress) {
        console.log(`\n🔍 Getting reserves for pool: ${poolAddress}`);
        
        try {
            // Call getReserves() function (standard Uniswap V2 interface)
            const reserves = await this.rpcCall('eth_call', [
                {
                    to: poolAddress,
                    data: '0x0902f1ac' // getReserves() function signature
                },
                'latest'
            ]);

            if (reserves && reserves !== '0x') {
                console.log('  Raw Reserves:', reserves);
                // Decode reserves (3 uint112 values)
                const reserve0 = parseInt(reserves.slice(2, 66), 16);
                const reserve1 = parseInt(reserves.slice(66, 130), 16);
                const timestamp = parseInt(reserves.slice(130, 194), 16);

                console.log('  Reserve 0:', reserve0);
                console.log('  Reserve 1:', reserve1);
                console.log('  Last Update:', new Date(timestamp * 1000));
            }
        } catch (error) {
            console.log('  ❌ Could not get reserves:', error.message);
        }
    }
}

// Usage example
async function analyzeSwap() {
    const analyzer = new ZeroGSwapAnalyzer();
    await analyzer.analyzeSwapTransaction();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZeroGSwapAnalyzer;
}

console.log('🔧 0G Chain Swap Analyzer Ready!');
console.log('📝 Usage: await analyzeSwap()');
console.log('⏳ Note: Node must be synced to analyze transactions');
