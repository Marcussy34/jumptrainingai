#!/usr/bin/env node

/**
 * Sync secrets from centralized env-config to Cloudflare Worker
 * 
 * This script bridges the gap between your centralized Node.js environment system
 * and Cloudflare Workers' secret management system.
 */

const { spawn } = require('child_process');
const path = require('path');

// Load your centralized environment configuration
const config = require('../shared/env-config');

// Required secrets for the Cloudflare Worker
const REQUIRED_SECRETS = [
    'YOUTUBE_API_KEY',
    'CLOUDFLARE_ACCOUNT_ID', 
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'ASSEMBLYAI_API_KEY'  // For Phase 2
];

async function syncSecrets() {
    console.log('🔄 Syncing secrets from your centralized config to Cloudflare Worker...\n');
    
    // Check what secrets are available in your config
    console.log('📋 Checking available secrets in your centralized config:');
    const availableSecrets = {};
    const missingSecrets = [];
    
    for (const secretName of REQUIRED_SECRETS) {
        if (config.has(secretName)) {
            availableSecrets[secretName] = config.get(secretName);
            console.log(`✅ ${secretName}: Available`);
        } else {
            missingSecrets.push(secretName);
            console.log(`❌ ${secretName}: Missing from config`);
        }
    }
    
    if (missingSecrets.length > 0) {
        console.log(`\n⚠️  Missing secrets: ${missingSecrets.join(', ')}`);
        console.log('Please add these to your shared/.env.local or ingestion-worker/.env.local file\n');
    }
    
    if (Object.keys(availableSecrets).length === 0) {
        console.log('❌ No secrets found to sync. Please check your .env.local files.');
        return;
    }
    
    console.log(`\n🚀 Setting ${Object.keys(availableSecrets).length} secrets in Cloudflare Worker...`);
    
    // Set each secret using wrangler
    for (const [secretName, secretValue] of Object.entries(availableSecrets)) {
        try {
            console.log(`Setting ${secretName}...`);
            await setWranglerSecret(secretName, secretValue);
            console.log(`✅ ${secretName} set successfully`);
        } catch (error) {
            console.log(`❌ Failed to set ${secretName}: ${error.message}`);
        }
    }
    
    console.log('\n✨ Secret sync complete!');
    console.log('🧪 Run `node test-worker.js` to verify everything is working');
}

function setWranglerSecret(name, value) {
    return new Promise((resolve, reject) => {
        const wrangler = spawn('wrangler', ['secret', 'put', name], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
        });
        
        // Send the secret value to stdin
        wrangler.stdin.write(value);
        wrangler.stdin.end();
        
        let output = '';
        let errorOutput = '';
        
        wrangler.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        wrangler.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        wrangler.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`Wrangler exit code ${code}: ${errorOutput}`));
            }
        });
        
        wrangler.on('error', (error) => {
            reject(error);
        });
    });
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error('❌ Script error:', error.message);
    process.exit(1);
});

// Run the sync
syncSecrets().catch((error) => {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
});
