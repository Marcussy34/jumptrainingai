/**
 * Centralized Environment Configuration Loader
 * 
 * This utility loads environment variables from multiple sources:
 * 1. /shared/.env.local (common API keys)
 * 2. Service-specific .env.local (service-specific config)
 * 3. Process environment (production overrides)
 * 
 * Usage:
 *   const config = require('../shared/env-config');
 *   const apiKey = config.get('OPENAI_API_KEY');
 */

const path = require('path');
const fs = require('fs');

class EnvConfig {
    constructor() {
        this.config = {};
        this.loadEnvironmentVariables();
    }

    /**
     * Load environment variables from shared and service-specific files
     */
    loadEnvironmentVariables() {
        // 1. Load shared configuration first (lowest priority)
        this.loadEnvFile(path.join(__dirname, '.env.local'));
        
        // 2. Load service-specific configuration (medium priority)
        // Detect which service we're running from
        const serviceDir = this.detectServiceDirectory();
        if (serviceDir) {
            this.loadEnvFile(path.join(serviceDir, '.env.local'));
        }
        
        // 3. Process environment variables have highest priority
        Object.assign(this.config, process.env);
        
        console.log(`🔧 Loaded config from: shared + ${serviceDir ? path.basename(serviceDir) : 'unknown'} + process.env`);
    }

    /**
     * Detect which service directory we're running from
     */
    detectServiceDirectory() {
        const cwd = process.cwd();
        const possibleServices = ['ingestion-worker', 'embedding-job', 'frontend'];
        
        for (const service of possibleServices) {
            if (cwd.includes(service)) {
                return path.join(__dirname, '..', service);
            }
        }
        
        // If we can't detect, try to find .env.local in parent directories
        let currentDir = cwd;
        for (let i = 0; i < 3; i++) {
            const envPath = path.join(currentDir, '.env.local');
            if (fs.existsSync(envPath) && !currentDir.endsWith('shared')) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        
        return null;
    }

    /**
     * Load environment variables from a .env file
     */
    loadEnvFile(filePath) {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  Config file not found: ${filePath}`);
            return;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Skip empty lines and comments
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }
                
                // Parse KEY=VALUE format
                const equalIndex = trimmed.indexOf('=');
                if (equalIndex === -1) {
                    continue;
                }
                
                const key = trimmed.substring(0, equalIndex).trim();
                const value = trimmed.substring(equalIndex + 1).trim();
                
                // Remove quotes if present
                const cleanValue = value.replace(/^["']|["']$/g, '');
                
                // Only set if not already defined (respects priority order)
                if (!(key in this.config)) {
                    this.config[key] = cleanValue;
                }
            }
            
            console.log(`✅ Loaded config from: ${filePath}`);
        } catch (error) {
            console.error(`❌ Error loading config from ${filePath}:`, error.message);
        }
    }

    /**
     * Get an environment variable with optional default value
     */
    get(key, defaultValue = null) {
        const value = this.config[key];
        if (value === undefined || value === null || value === '') {
            if (defaultValue !== null) {
                return defaultValue;
            }
            console.warn(`⚠️  Environment variable '${key}' is not defined`);
            return null;
        }
        return value;
    }

    /**
     * Get a required environment variable (throws if missing)
     */
    getRequired(key) {
        const value = this.get(key);
        if (value === null) {
            throw new Error(`Required environment variable '${key}' is not defined`);
        }
        return value;
    }

    /**
     * Get all configuration as an object
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Check if a variable is defined
     */
    has(key) {
        return key in this.config && this.config[key] !== null && this.config[key] !== '';
    }

    /**
     * Debug: Print all loaded configuration (masks sensitive values)
     */
    debug() {
        console.log('\n🔍 Environment Configuration Debug:');
        const maskedConfig = {};
        
        for (const [key, value] of Object.entries(this.config)) {
            // Mask sensitive values
            if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET') || key.includes('PASSWORD')) {
                maskedConfig[key] = value ? `${value.substring(0, 8)}...` : value;
            } else {
                maskedConfig[key] = value;
            }
        }
        
        console.table(maskedConfig);
    }
}

// Create singleton instance
const envConfig = new EnvConfig();

// Export both the instance and the class
module.exports = envConfig;
module.exports.EnvConfig = EnvConfig;
