// Simple API Key Authentication System - MVP
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class APIAuth {
    constructor() {
        this.keysFile = path.join(__dirname, 'api-keys.json');
        this.usageFile = path.join(__dirname, 'usage-logs.json');
        this.keys = this.loadKeys();
        this.usage = this.loadUsage();
        
        // Rate limits per tier
        this.limits = {
            free: { daily: 100, monthly: 3000 },
            pro: { daily: 10000, monthly: 300000 },
            enterprise: { daily: 100000, monthly: 3000000 }
        };
    }

    // Load API keys from file
    loadKeys() {
        try {
            if (fs.existsSync(this.keysFile)) {
                return JSON.parse(fs.readFileSync(this.keysFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading API keys:', error);
        }
        return {};
    }

    // Load usage logs from file
    loadUsage() {
        try {
            if (fs.existsSync(this.usageFile)) {
                return JSON.parse(fs.readFileSync(this.usageFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading usage logs:', error);
        }
        return {};
    }

    // Save keys to file
    saveKeys() {
        try {
            fs.writeFileSync(this.keysFile, JSON.stringify(this.keys, null, 2));
        } catch (error) {
            console.error('Error saving API keys:', error);
        }
    }

    // Save usage to file
    saveUsage() {
        try {
            fs.writeFileSync(this.usageFile, JSON.stringify(this.usage, null, 2));
        } catch (error) {
            console.error('Error saving usage logs:', error);
        }
    }

    // Generate new API key
    generateKey(email, tier = 'free') {
        const keyId = crypto.randomBytes(16).toString('hex');
        const apiKey = `zg_${tier}_${keyId}`;
        
        this.keys[apiKey] = {
            email: email,
            tier: tier,
            created: Date.now(),
            active: true,
            lastUsed: null
        };
        
        this.usage[apiKey] = {
            daily: {},
            monthly: {},
            total: 0
        };
        
        this.saveKeys();
        this.saveUsage();
        
        return apiKey;
    }

    // Validate API key and check rate limits
    validateRequest(apiKey, endpoint) {
        // Check if key exists and is active
        if (!apiKey || !this.keys[apiKey] || !this.keys[apiKey].active) {
            return { valid: false, error: 'Invalid API key', code: 401 };
        }

        const keyData = this.keys[apiKey];
        const tier = keyData.tier;
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = today.substring(0, 7);

        // Initialize usage tracking
        if (!this.usage[apiKey]) {
            this.usage[apiKey] = { daily: {}, monthly: {}, total: 0 };
        }

        const usage = this.usage[apiKey];
        const dailyUsage = usage.daily[today] || 0;
        const monthlyUsage = usage.monthly[thisMonth] || 0;

        // Check rate limits
        if (dailyUsage >= this.limits[tier].daily) {
            return { valid: false, error: 'Daily rate limit exceeded', code: 429 };
        }

        if (monthlyUsage >= this.limits[tier].monthly) {
            return { valid: false, error: 'Monthly rate limit exceeded', code: 429 };
        }

        // Log the request
        this.logRequest(apiKey, endpoint, today, thisMonth);

        return { 
            valid: true, 
            tier: tier,
            usage: {
                daily: dailyUsage + 1,
                monthly: monthlyUsage + 1,
                dailyLimit: this.limits[tier].daily,
                monthlyLimit: this.limits[tier].monthly
            }
        };
    }

    // Log API request
    logRequest(apiKey, endpoint, today, thisMonth) {
        const usage = this.usage[apiKey];
        
        // Update daily usage
        usage.daily[today] = (usage.daily[today] || 0) + 1;
        
        // Update monthly usage
        usage.monthly[thisMonth] = (usage.monthly[thisMonth] || 0) + 1;
        
        // Update total usage
        usage.total = (usage.total || 0) + 1;
        
        // Update last used
        this.keys[apiKey].lastUsed = Date.now();
        
        // Save periodically (every 10 requests to reduce I/O)
        if (usage.total % 10 === 0) {
            this.saveKeys();
            this.saveUsage();
        }
    }

    // Get usage stats for a key
    getUsageStats(apiKey) {
        if (!this.keys[apiKey]) return null;
        
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = today.substring(0, 7);
        const usage = this.usage[apiKey];
        const tier = this.keys[apiKey].tier;
        
        return {
            tier: tier,
            daily: {
                used: usage.daily[today] || 0,
                limit: this.limits[tier].daily,
                remaining: this.limits[tier].daily - (usage.daily[today] || 0)
            },
            monthly: {
                used: usage.monthly[thisMonth] || 0,
                limit: this.limits[tier].monthly,
                remaining: this.limits[tier].monthly - (usage.monthly[thisMonth] || 0)
            },
            total: usage.total || 0
        };
    }

    // Middleware for Express/HTTP server
    middleware() {
        return (req, res, next) => {
            // Skip auth for health check and admin
            if (req.url === '/health' || req.url.startsWith('/admin')) {
                return next();
            }

            // Extract API key from header or query
            const apiKey = req.headers['x-api-key'] || 
                          req.headers['authorization']?.replace('Bearer ', '') ||
                          new URL(req.url, 'http://localhost').searchParams.get('apikey');

            const validation = this.validateRequest(apiKey, req.url);
            
            if (!validation.valid) {
                res.writeHead(validation.code, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: validation.error,
                    code: validation.code,
                    message: validation.code === 429 ? 
                        'Rate limit exceeded. Upgrade your plan or try again tomorrow.' :
                        'Invalid API key. Get your key at /admin'
                }));
                return;
            }

            // Add usage info to response headers
            res.setHeader('X-RateLimit-Tier', validation.tier);
            res.setHeader('X-RateLimit-Daily-Remaining', validation.usage.dailyLimit - validation.usage.daily);
            res.setHeader('X-RateLimit-Monthly-Remaining', validation.usage.monthlyLimit - validation.usage.monthly);
            
            next();
        };
    }

    // Get all keys (admin function)
    getAllKeys() {
        return Object.entries(this.keys).map(([key, data]) => ({
            key: key.substring(0, 20) + '...',
            email: data.email,
            tier: data.tier,
            created: new Date(data.created).toLocaleDateString(),
            lastUsed: data.lastUsed ? new Date(data.lastUsed).toLocaleDateString() : 'Never',
            active: data.active,
            usage: this.getUsageStats(key)
        }));
    }
}

module.exports = APIAuth;
