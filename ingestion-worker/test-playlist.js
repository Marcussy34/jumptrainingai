#!/usr/bin/env node

/**
 * Test script for playlist ingestion
 * Tests your specific jump training playlist
 */

const WORKER_URL = 'https://jumptrainingai-ingestion-worker.marcus-tanchiyau.workers.dev';
const YOUR_PLAYLIST = 'https://youtube.com/playlist?list=PLkuJUNfqNFGKj3DkG5xpmXsn9U5Nfthr9&si=nofTmajrAWchdorv';

async function testPlaylistIngestion() {
    console.log('🎯 Testing Your Jump Training Playlist\n');
    
    console.log('📋 Playlist:', YOUR_PLAYLIST);
    console.log('🔗 Extracted ID: PLkuJUNfqNFGKj3DkG5xpmXsn9U5Nfthr9\n');
    
    console.log('🚀 Starting playlist ingestion...');
    
    try {
        const response = await fetch(`${WORKER_URL}/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playlistUrl: YOUR_PLAYLIST,
                maxResults: 20  // Get more videos from your playlist
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Playlist ingestion successful!\n');
            console.log('📊 Results:');
            console.log(`  Source: ${result.source}`);
            console.log(`  Processed: ${result.processed} new videos`);
            console.log(`  Failed: ${result.failed} videos`);
            console.log(`  Total in database: ${result.totalInDatabase} videos`);
            
            if (result.errors && result.errors.length > 0) {
                console.log('\n⚠️  Errors:');
                result.errors.forEach(error => console.log(`    - ${error}`));
            }
            
        } else {
            console.log('❌ Playlist ingestion failed:');
            console.log(`  Error: ${result.error}`);
            console.log(`  Message: ${result.message}`);
        }
        
    } catch (error) {
        console.log('❌ Network/request error:', error.message);
    }
    
    console.log('\n🎬 Test your playlist in the web interface:');
    console.log(`  1. Visit: ${WORKER_URL}`);
    console.log('  2. Select "Playlist" radio button');
    console.log('  3. Click "🎯 Test Your Playlist" button');
    console.log('  4. Or manually enter your playlist URL');
}

// Run the test
testPlaylistIngestion().catch(console.error);
