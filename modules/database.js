const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dataPath = path.join(__dirname, '../data');
        this.ensureDataDirectory();
        
        // Initialize database collections
        this.collections = {
            users: 'users.json',
            guilds: 'guilds.json',
            registrations: 'registrations.json',
            levels: 'levels.json'
        };
        
        // Initialize collections
        Object.values(this.collections).forEach(file => {
            const filePath = path.join(this.dataPath, file);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');
            }
        });
    }
    
    ensureDataDirectory() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }
    
    async get(collection, id) {
        const collectionFile = this.collections[collection];
        if (!collectionFile) throw new Error(`Collection ${collection} does not exist`);
        
        const filePath = path.join(this.dataPath, collectionFile);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        return id ? data[id] || null : data;
    }
    
    async set(collection, id, value) {
        const collectionFile = this.collections[collection];
        if (!collectionFile) throw new Error(`Collection ${collection} does not exist`);
        
        const filePath = path.join(this.dataPath, collectionFile);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        data[id] = value;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        
        return value;
    }
    
    async delete(collection, id) {
        const collectionFile = this.collections[collection];
        if (!collectionFile) throw new Error(`Collection ${collection} does not exist`);
        
        const filePath = path.join(this.dataPath, collectionFile);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (data[id]) {
            delete data[id];
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        }
        
        return false;
    }
    
    async update(collection, id, updates) {
        const item = await this.get(collection, id);
        if (!item) return null;
        
        const updated = { ...item, ...updates };
        return this.set(collection, id, updated);
    }
    
    // Helper for guild settings
    async getGuildSettings(guildId) {
        const guild = await this.get('guilds', guildId);
        if (!guild) {
            // Default guild settings
            const defaultSettings = {
                prefix: '!',
                welcomeChannel: null,
                logChannel: null,
                roles: {
                    admin: [],
                    mod: [],
                    unregistered: null,
                    erkek: [],
                    kadin: [],
                    male: null,
                    female: null,
                    member: null
                },
                moderation: {
                    antiSpam: false,
                    antiRaid: false,
                    autoMod: false
                }
            };
            
            await this.set('guilds', guildId, defaultSettings);
            return defaultSettings;
        }
        
        return guild;
    }
    
    // Helper for user registrations
    async registerUser(guildId, userId, data) {
        const registrationId = `${guildId}-${userId}`;
        return this.set('registrations', registrationId, {
            userId,
            guildId,
            ...data,
            registeredAt: new Date().toISOString()
        });
    }
    
    // Helper for user data
    async getUserData(userId, guildId) {
        const userKey = guildId ? `${userId}-${guildId}` : userId;
        let userData = await this.get('users', userKey);
        
        if (!userData) {
            userData = {
                id: userId,
                guildId: guildId || null,
                xp: 0,
                level: 0,
                messageCount: 0,
                lastMessageAt: null,
                warnings: []
            };
            
            await this.set('users', userKey, userData);
        }
        
        return userData;
    }
    
    // Helper for levels
    async addXP(userId, guildId, xpAmount) {
        const userKey = `${userId}-${guildId}`;
        const userData = await this.getUserData(userId, guildId);
        
        userData.xp += xpAmount;
        userData.messageCount += 1;
        userData.lastMessageAt = new Date().toISOString();
        
        // Calculate level
        const oldLevel = userData.level;
        const newLevel = Math.floor(0.1 * Math.sqrt(userData.xp));
        userData.level = newLevel;
        
        await this.set('users', userKey, userData);
        
        return {
            userData,
            leveledUp: newLevel > oldLevel,
            newLevel
        };
    }
    
    // Get leaderboard
    async getLeaderboard(guildId, limit = 10) {
        const users = await this.get('users');
        
        // Filter users for this guild
        const guildUsers = Object.values(users).filter(user => 
            user.guildId === guildId || 
            (typeof user.guildId === 'object' && user.guildId?.includes(guildId))
        );
        
        // Sort by XP
        guildUsers.sort((a, b) => b.xp - a.xp);
        
        return guildUsers.slice(0, limit);
    }
    
    // Save user data (for compatibility with kayit.js)
    async saveUser(userData) {
        if (!userData.userId && userData.userID) {
            userData.userId = userData.userID;
        }
        
        if (!userData.guildId && userData.guildID) {
            userData.guildId = userData.guildID;
        }
        
        return this.registerUser(userData.guildId, userData.userId, userData);
    }
}

module.exports = new Database(); 