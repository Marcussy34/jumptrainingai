#!/usr/bin/env node

/**
 * Test script for JumpTrainingAI Ingestion Worker
 * Run after setting up all required secrets
 */

const WORKER_URL = 'https://jumptrainingai-ingestion-worker.marcus-tanchiyau.workers.dev';

async function testWorker() {
    console.log('🧪 Testing JumpTrainingAI Ingestion Worker\n');
    
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    try {
        const response = await fetch(`${WORKER_URL}/health`);
        const health = await response.json();
        
        console.log(`Status: ${health.status}`);
        console.log('Checks:');
        for (const [check, status] of Object.entries(health.checks)) {
            const icon = status === 'present' || status === 'accessible' ? '✅' : '❌';
            console.log(`  ${icon} ${check}: ${status}`);
        }
        
        if (health.status !== 'healthy') {
            console.log('❌ Worker is not ready. Please set up the missing secrets first.');
            console.log('📝 Run the commands in setup-secrets.md\n');
            return;
        }
        
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return;
    }
    
    console.log('\n2️⃣ Testing Status Endpoint...');
    try {
        const response = await fetch(`${WORKER_URL}/status`);
        const status = await response.json();
        
        console.log('✅ Status endpoint working');
        console.log(`Total videos processed: ${status.stats?.totalVideosProcessed || 0}`);
        
    } catch (error) {
        console.log('❌ Status check failed:', error.message);
    }
    
    console.log('\n3️⃣ Testing Video Ingestion (Test Mode)...');
    try {
        const response = await fetch(`${WORKER_URL}/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channelHandle: '@TheHoopsProf',
                maxResults: 3  // Small test batch
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Ingestion test successful');
            console.log(`Processed: ${result.processed} videos`);
            console.log(`Failed: ${result.failed} videos`);
            console.log(`Total in database: ${result.totalInDatabase} videos`);
        } else {
            console.log('❌ Ingestion test failed:', result.error);
            console.log('Message:', result.message);
        }
        
    } catch (error) {
        console.log('❌ Ingestion test failed:', error.message);
    }
    
    console.log('\n✨ Worker testing complete!');
    console.log(`🌐 Visit ${WORKER_URL} to see the web interface`);
}

// Run the tests
testWorker().catch(console.error);
