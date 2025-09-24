#!/usr/bin/env node

/**
 * YouTube API Debug Script
 * Helps find the correct channel handle and debug API calls
 */

const config = require('../shared/env-config');

async function debugYouTubeAPI() {
    console.log('🔍 YouTube API Debug Tool\n');
    
    const apiKey = config.get('YOUTUBE_API_KEY');
    if (!apiKey) {
        console.log('❌ YOUTUBE_API_KEY not found in config');
        return;
    }
    
    console.log('✅ YouTube API Key found\n');
    
    // Test different channel handle formats for THP
    const channelHandleVariations = [
        '@TheHoopsProf',
        '@thehoopsprof', 
        'TheHoopsProf',
        'thehoopsprof',
        '@IsaiahRivera',
        '@JohnEvans'
    ];
    
    // Also test with known working channels
    const testChannels = [
        '@YouTube',  // This should always work
        '@GoogleDevelopers',
        ...channelHandleVariations
    ];
    
    console.log('🧪 Testing channel handle variations...\n');
    
    for (const handle of testChannels) {
        await testChannelHandle(apiKey, handle);
    }
    
    console.log('\n🔍 Search for "TheHoopsProf" in YouTube...');
    await searchForChannel(apiKey, 'TheHoopsProf');
    await searchForChannel(apiKey, 'Isaiah Rivera jump training');
    await searchForChannel(apiKey, 'John Evans basketball training');
}

async function testChannelHandle(apiKey, handle) {
    try {
        console.log(`Testing: ${handle}`);
        
        // Try the forHandle parameter (newer API)
        let url = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const channel = data.items[0];
            console.log(`✅ Found: ${handle}`);
            console.log(`   Channel ID: ${channel.id}`);
            console.log(`   Title: ${channel.snippet.title}`);
            console.log(`   Subscribers: ${channel.statistics?.subscriberCount || 'Hidden'}`);
            
            // Test getting videos for this channel
            await testChannelVideos(apiKey, channel.id, channel.snippet.title);
            return;
        }
        
        console.log(`❌ Not found: ${handle}`);
        
    } catch (error) {
        console.log(`❌ Error testing ${handle}: ${error.message}`);
    }
}

async function testChannelVideos(apiKey, channelId, channelTitle) {
    try {
        console.log(`   📺 Getting videos for "${channelTitle}"...`);
        
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=5&order=date&type=video&key=${apiKey}`
        );
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            console.log(`   ✅ Found ${data.items.length} videos:`);
            data.items.forEach((video, i) => {
                console.log(`      ${i + 1}. ${video.snippet.title.substring(0, 60)}...`);
            });
        } else {
            console.log(`   ⚠️  No videos found for this channel`);
        }
        
    } catch (error) {
        console.log(`   ❌ Error getting videos: ${error.message}`);
    }
    
    console.log(''); // Add spacing
}

async function searchForChannel(apiKey, searchTerm) {
    try {
        console.log(`Searching for: "${searchTerm}"`);
        
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchTerm)}&type=channel&maxResults=5&key=${apiKey}`
        );
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            console.log(`✅ Found ${data.items.length} matching channels:`);
            data.items.forEach((channel, i) => {
                console.log(`   ${i + 1}. ${channel.snippet.title}`);
                console.log(`      Channel ID: ${channel.snippet.channelId}`);
                console.log(`      Description: ${channel.snippet.description.substring(0, 100)}...`);
            });
        } else {
            console.log(`❌ No channels found for "${searchTerm}"`);
        }
        
    } catch (error) {
        console.log(`❌ Search error: ${error.message}`);
    }
    
    console.log('');
}

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('❌ Script error:', error.message);
    process.exit(1);
});

// Run the debug
debugYouTubeAPI().catch((error) => {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
});
