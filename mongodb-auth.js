// MongoDB API Key Authentication System
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

class MongoDBAuth {
    constructor() {
        this.mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://0gadmin:henryadmin0g@0g-tg-bot.txhptqg.mongodb.net/apikeys?retryWrites=true&w=majority&appName=0G-TG-BOT';
        this.client = null;
        this.db = null;
        this.keysCollection = null;
        this.usageCollection = null;
        this.connected = false;
        this.connecting = false;
        
        // Rate limits per tier
        this.limits = {
            free: { daily: 100, monthly: 3000 },
            pro: { daily: 10000, monthly: 300000 },
            enterprise: { daily: 100000, monthly: 3000000 }
        };
        
        // Initialize connection
        this.connectPromise = this.connect();
    }

    // Connect to MongoDB
    async connect() {
        if (this.connecting || this.connected) return;
        this.connecting = true;
        
        try {
            console.log('🔌 Connecting to MongoDB...');
            this.client = new MongoClient(this.mongoUrl);
            await this.client.connect();
            
            this.db = this.client.db('apikeys');
            this.keysCollection = this.db.collection('keys');
            this.usageCollection = this.db.collection('usage');
            
            // Create indexes for better performance
            await this.keysCollection.createIndex({ "email": 1 });
            await this.keysCollection.createIndex({ "tier": 1 });
            await this.keysCollection.createIndex({ "created": 1 });
            await this.usageCollection.createIndex({ "keyId": 1 });
            await this.usageCollection.createIndex({ "date": 1 });
            
            this.connected = true;
            this.connecting = false;
            console.log('✅ MongoDB connected successfully');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            this.connecting = false;
            this.connected = false;
            throw error;
        }
    }

    // Ensure connection before operations
    async ensureConnection() {
        if (!this.connected && !this.connecting) {
            await this.connect();
        } else if (this.connecting) {
            await this.connectPromise;
        }
    }

    // Generate new API key
    async generateKey(email, tier = 'free') {
        try {
            await this.ensureConnection();
            const keyId = crypto.randomBytes(16).toString('hex');
            const apiKey = `zg_${tier}_${keyId}`;
            
            const keyDoc = {
                _id: apiKey,
                email: email,
                tier: tier,
                created: new Date(),
                active: true,
                lastUsed: null
            };
            
            const usageDoc = {
                keyId: apiKey,
                daily: {},
                monthly: {},
                total: 0
            };
            
            await this.keysCollection.insertOne(keyDoc);
            await this.usageCollection.insertOne(usageDoc);
            
            console.log(`🔑 Created API key for ${email} (${tier})`);
            return apiKey;
        } catch (error) {
            console.error('Error generating API key:', error);
            throw error;
        }
    }

    // Validate API key and check rate limits
    async validateRequest(apiKey, endpoint) {
        try {
            await this.ensureConnection();
            if (!apiKey) {
                return { valid: false, error: 'API key required', code: 401 };
            }

            // Get key info
            const keyDoc = await this.keysCollection.findOne({ _id: apiKey });
            if (!keyDoc || !keyDoc.active) {
                return { valid: false, error: 'Invalid API key', code: 401 };
            }

            const tier = keyDoc.tier;
            const today = new Date().toISOString().split('T')[0];
            const thisMonth = today.substring(0, 7);

            // Get usage info
            let usageDoc = await this.usageCollection.findOne({ keyId: apiKey });
            if (!usageDoc) {
                // Create usage doc if it doesn't exist
                usageDoc = {
                    keyId: apiKey,
                    daily: {},
                    monthly: {},
                    total: 0
                };
                await this.usageCollection.insertOne(usageDoc);
            }

            const dailyUsage = usageDoc.daily[today] || 0;
            const monthlyUsage = usageDoc.monthly[thisMonth] || 0;

            // Check rate limits
            if (dailyUsage >= this.limits[tier].daily) {
                return { valid: false, error: 'Daily rate limit exceeded', code: 429 };
            }

            if (monthlyUsage >= this.limits[tier].monthly) {
                return { valid: false, error: 'Monthly rate limit exceeded', code: 429 };
            }

            // Log the request
            await this.logRequest(apiKey, endpoint, today, thisMonth);

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
        } catch (error) {
            console.error('Error validating request:', error);
            return { valid: false, error: 'Internal server error', code: 500 };
        }
    }

    // Log API request
    async logRequest(apiKey, endpoint, today, thisMonth) {
        try {
            await this.ensureConnection();
            // Update usage counters
            await this.usageCollection.updateOne(
                { keyId: apiKey },
                { 
                    $inc: { 
                        [`daily.${today}`]: 1,
                        [`monthly.${thisMonth}`]: 1,
                        total: 1
                    }
                }
            );

            // Update last used timestamp
            await this.keysCollection.updateOne(
                { _id: apiKey },
                { $set: { lastUsed: new Date() } }
            );
        } catch (error) {
            console.error('Error logging request:', error);
        }
    }

    // Get usage stats for a key
    async getUsageStats(apiKey) {
        try {
            await this.ensureConnection();
            const keyDoc = await this.keysCollection.findOne({ _id: apiKey });
            if (!keyDoc) return null;
            
            const usageDoc = await this.usageCollection.findOne({ keyId: apiKey });
            if (!usageDoc) return null;
            
            const today = new Date().toISOString().split('T')[0];
            const thisMonth = today.substring(0, 7);
            const tier = keyDoc.tier;
            
            return {
                tier: tier,
                daily: {
                    used: usageDoc.daily[today] || 0,
                    limit: this.limits[tier].daily,
                    remaining: this.limits[tier].daily - (usageDoc.daily[today] || 0)
                },
                monthly: {
                    used: usageDoc.monthly[thisMonth] || 0,
                    limit: this.limits[tier].monthly,
                    remaining: this.limits[tier].monthly - (usageDoc.monthly[thisMonth] || 0)
                },
                total: usageDoc.total || 0
            };
        } catch (error) {
            console.error('Error getting usage stats:', error);
            return null;
        }
    }

    // Get all keys (admin function)
    async getAllKeys() {
        try {
            await this.ensureConnection();
            const keys = await this.keysCollection.find({}).sort({ created: -1 }).toArray();
            
            const result = [];
            for (const key of keys) {
                const usage = await this.getUsageStats(key._id);
                result.push({
                    key: key._id.substring(0, 20) + '...',
                    email: key.email,
                    tier: key.tier,
                    created: key.created.toLocaleDateString(),
                    lastUsed: key.lastUsed ? key.lastUsed.toLocaleDateString() : 'Never',
                    active: key.active,
                    usage: usage
                });
            }
            
            return result;
        } catch (error) {
            console.error('Error getting all keys:', error);
            return [];
        }
    }

    // Deactivate API key
    async deactivateKey(apiKey) {
        try {
            await this.keysCollection.updateOne(
                { _id: apiKey },
                { $set: { active: false } }
            );
            return true;
        } catch (error) {
            console.error('Error deactivating key:', error);
            return false;
        }
    }

    // Get analytics data
    async getAnalytics() {
        try {
            const totalKeys = await this.keysCollection.countDocuments();
            const activeKeys = await this.keysCollection.countDocuments({ active: true });
            const tierCounts = await this.keysCollection.aggregate([
                { $group: { _id: '$tier', count: { $sum: 1 } } }
            ]).toArray();
            
            // Get usage stats for last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentUsage = await this.usageCollection.aggregate([
                { $match: { total: { $gt: 0 } } },
                { $group: { _id: null, totalRequests: { $sum: '$total' } } }
            ]).toArray();
            
            return {
                totalKeys,
                activeKeys,
                tierCounts: tierCounts.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                totalRequests: recentUsage[0]?.totalRequests || 0
            };
        } catch (error) {
            console.error('Error getting analytics:', error);
            return null;
        }
    }

    // Close connection
    async close() {
        if (this.client) {
            await this.client.close();
            console.log('📴 MongoDB connection closed');
        }
    }
}

module.exports = MongoDBAuth;
