/**
 * JumpTrainingAI - Video Ingestion Worker
 * Cloudflare Worker for YouTube video metadata extraction and R2 storage
 * 
 * Phase 1: Basic ingestion with duplicate detection and metadata storage
 * 
 * Note: Cloudflare Workers use ES modules, not CommonJS.
 * Environment variables are passed via the `env` parameter in handlers.
 */

/**
 * Video metadata schema definition
 * This defines the structure of video data we store in R2
 */
const VideoMetadata = {
  videoId: '',           // YouTube video ID
  title: '',             // Video title
  description: '',       // Video description
  publishedAt: '',       // Publication date
  duration: '',          // Video duration (ISO 8601 format)
  viewCount: 0,          // View count
  likeCount: 0,          // Like count
  channelId: '',         // Channel ID
  channelTitle: '',      // Channel title
  thumbnails: {},        // Thumbnail URLs (default, medium, high, etc.)
  tags: [],              // Video tags/keywords
  categoryId: '',        // YouTube category ID
  defaultLanguage: '',   // Primary language
  captionsAvailable: false, // Whether captions exist
  processedAt: '',       // When we processed this video
  status: 'pending'      // Processing status: pending, processed, failed
};

/**
 * Processed videos tracking schema
 * This tracks which videos we've already ingested
 */
const ProcessedVideosSchema = {
  lastUpdated: '',       // ISO timestamp of last update
  totalVideos: 0,        // Total count of processed videos
  videos: {}             // Object with videoId as key, metadata as value
};

/**
 * Main Worker handler
 * Routes HTTP requests to appropriate handlers
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Add CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      // Route requests based on path
      switch (path) {
        case '/':
          return handleRoot(request, env);
        
        case '/health':
          return handleHealth(request, env);
        
        case '/ingest':
          return handleIngest(request, env, ctx);
        
        case '/status':
          return handleStatus(request, env);
        
        default:
          return new Response('Not Found', { 
            status: 404,
            headers: corsHeaders
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

/**
 * Root endpoint - serves basic info and trigger interface
 */
async function handleRoot(request, env) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JumpTrainingAI - Video Ingestion</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { background: #007bff; color: white; border: none; padding: 12px 24px; 
                     border-radius: 4px; cursor: pointer; font-size: 16px; margin: 10px 5px; }
            .button:hover { background: #0056b3; }
            .button:disabled { background: #6c757d; cursor: not-allowed; }
            .status { margin: 20px 0; padding: 10px; border-radius: 4px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
            .loading { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <h1>🏀 JumpTrainingAI - Video Ingestion Worker</h1>
        
        <div class="container">
            <h2>Phase 1: Basic Storage & Ingestion</h2>
            <p>This worker handles YouTube video metadata extraction and storage in R2.</p>
            
            <h3>Channel Input</h3>
            <div style="margin: 15px 0;">
                <input type="text" id="channelInput" 
                       placeholder="Enter channel: @TheHoopsProf, channel ID, or search term"
                       style="width: 400px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <input type="number" id="maxResults" value="5" min="1" max="50" 
                       style="width: 80px; padding: 8px; margin-left: 10px;">
                <label for="maxResults" style="margin-left: 5px;">videos</label>
            </div>
            
            <h3>Manual Triggers</h3>
            <button class="button" onclick="triggerIngestion()">
                🎬 Trigger Video Ingestion
            </button>
            <button class="button" onclick="checkStatus()">
                📊 Check Status
            </button>
            <button class="button" onclick="testHealth()">
                ❤️ Health Check
            </button>
            <button class="button" onclick="testKnownChannel()">
                🧪 Test with @YouTube
            </button>
        </div>
        
        <div class="container">
            <h3>💡 Channel Format Examples</h3>
            <ul>
                <li><strong>Handle:</strong> @TheHoopsProf, @YouTube, @GoogleDevelopers</li>
                <li><strong>Channel ID:</strong> UCxxxxxxxxxxxxxxxxxxxxxx (24 characters starting with UC)</li>
                <li><strong>Search:</strong> TheHoopsProf, "Isaiah Rivera basketball", etc.</li>
            </ul>
            <p><em>The system will try multiple lookup methods automatically.</em></p>
        </div>

        <div id="status-container"></div>

        <script>
            function showStatus(message, type = 'info') {
                const container = document.getElementById('status-container');
                const statusDiv = document.createElement('div');
                statusDiv.className = 'status ' + type;
                statusDiv.innerHTML = '<strong>' + new Date().toLocaleTimeString() + ':</strong> ' + message;
                container.insertBefore(statusDiv, container.firstChild);
                
                // Remove old status messages (keep last 5)
                while (container.children.length > 5) {
                    container.removeChild(container.lastChild);
                }
            }

            async function triggerIngestion() {
                const button = event.target;
                button.disabled = true;
                button.textContent = '⏳ Processing...';
                
                const channelInput = document.getElementById('channelInput').value.trim() || '@TheHoopsProf';
                const maxResults = parseInt(document.getElementById('maxResults').value) || 5;
                
                showStatus(\`Starting video ingestion for: \${channelInput}\`, 'loading');
                
                try {
                    const response = await fetch('/ingest', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            channelHandle: channelInput,
                            maxResults: maxResults 
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        showStatus('✅ Ingestion completed: ' + JSON.stringify(result, null, 2), 'success');
                    } else {
                        showStatus('❌ Ingestion failed: ' + result.error, 'error');
                    }
                } catch (error) {
                    showStatus('❌ Network error: ' + error.message, 'error');
                } finally {
                    button.disabled = false;
                    button.textContent = '🎬 Trigger Video Ingestion';
                }
            }

            async function checkStatus() {
                showStatus('Checking worker status...', 'loading');
                
                try {
                    const response = await fetch('/status');
                    const result = await response.json();
                    
                    showStatus('📊 Status: <pre>' + JSON.stringify(result, null, 2) + '</pre>', 'info');
                } catch (error) {
                    showStatus('❌ Status check failed: ' + error.message, 'error');
                }
            }

            async function testHealth() {
                showStatus('Running health check...', 'loading');
                
                try {
                    const response = await fetch('/health');
                    const result = await response.json();
                    
                    if (response.ok) {
                        showStatus('✅ Health check passed: ' + result.status, 'success');
                    } else {
                        showStatus('⚠️ Health check issues: ' + result.error, 'error');
                    }
                } catch (error) {
                    showStatus('❌ Health check failed: ' + error.message, 'error');
                }
            }

            async function testKnownChannel() {
                document.getElementById('channelInput').value = '@YouTube';
                document.getElementById('maxResults').value = '3';
                showStatus('🧪 Testing with known working channel @YouTube...', 'info');
                setTimeout(triggerIngestion, 500); // Small delay to show the message
            }

            // Show initial status
            showStatus('Worker ready - enter a channel and click a button to test', 'info');
        </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Health check endpoint
 * Verifies all required environment variables and R2 bucket access
 */
async function handleHealth(request, env) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0-phase1',
    checks: {}
  };

  try {
    // Check environment variables
    const requiredSecrets = [
      'YOUTUBE_API_KEY',
      'CLOUDFLARE_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY'
    ];

    for (const secret of requiredSecrets) {
      health.checks[secret] = env[secret] ? 'present' : 'missing';
    }

    // Test R2 bucket access
    try {
      await env.VIDEO_BUCKET.head('health-check');
      health.checks.r2_access = 'accessible';
    } catch (error) {
      // Head operation might fail if object doesn't exist, but that's ok
      // A permission error would be different
      health.checks.r2_access = error.message.includes('NoSuchKey') ? 'accessible' : 'error: ' + error.message;
    }

    // Check if any critical components are missing
    const missingSecrets = requiredSecrets.filter(secret => !env[secret]);
    if (missingSecrets.length > 0) {
      health.status = 'unhealthy';
      health.error = `Missing required secrets: ${missingSecrets.join(', ')}`;
    }

  } catch (error) {
    health.status = 'error';
    health.error = error.message;
  }

  const status = health.status === 'healthy' ? 200 : 500;
  
  return new Response(JSON.stringify(health, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Video ingestion endpoint
 * Fetches YouTube channel videos and stores metadata in R2
 */
async function handleIngest(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: 'Use POST to trigger ingestion'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const body = await request.json();
    const channelHandle = body.channelHandle || '@TheHoopsProf';
    const maxResults = body.maxResults || 10;

    console.log(`Starting ingestion for channel: ${channelHandle}`);

    // Step 1: Get processed videos list to check for duplicates
    const processedVideos = await getProcessedVideos(env);
    
    // Step 2: Fetch channel videos from YouTube API
    const newVideos = await fetchChannelVideos(env, channelHandle, maxResults);
    
    // Step 3: Filter out already processed videos
    const unprocessedVideos = newVideos.filter(video => 
      !processedVideos.videos[video.videoId]
    );

    console.log(`Found ${newVideos.length} total videos, ${unprocessedVideos.length} new videos to process`);

    if (unprocessedVideos.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No new videos to process',
        totalFound: newVideos.length,
        alreadyProcessed: newVideos.length
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Step 4: Store new video metadata in R2
    const results = await Promise.allSettled(
      unprocessedVideos.map(video => storeVideoMetadata(env, video))
    );

    // Step 5: Update processed videos list
    const successfulVideos = results.filter(r => r.status === 'fulfilled');
    const failedVideos = results.filter(r => r.status === 'rejected');

    for (const video of unprocessedVideos.slice(0, successfulVideos.length)) {
      processedVideos.videos[video.videoId] = {
        processedAt: new Date().toISOString(),
        title: video.title,
        status: 'processed'
      };
    }

    processedVideos.totalVideos = Object.keys(processedVideos.videos).length;
    processedVideos.lastUpdated = new Date().toISOString();

    await updateProcessedVideos(env, processedVideos);

    return new Response(JSON.stringify({
      success: true,
      message: 'Ingestion completed',
      processed: successfulVideos.length,
      failed: failedVideos.length,
      totalInDatabase: processedVideos.totalVideos,
      errors: failedVideos.map(r => r.reason?.message || 'Unknown error')
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Ingestion error:', error);
    return new Response(JSON.stringify({
      error: 'Ingestion failed',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Status endpoint
 * Returns current system status and statistics
 */
async function handleStatus(request, env) {
  try {
    const processedVideos = await getProcessedVideos(env);
    
    return new Response(JSON.stringify({
      status: 'operational',
      timestamp: new Date().toISOString(),
      stats: {
        totalVideosProcessed: processedVideos.totalVideos,
        lastUpdated: processedVideos.lastUpdated,
        recentVideos: Object.entries(processedVideos.videos)
          .sort(([,a], [,b]) => new Date(b.processedAt) - new Date(a.processedAt))
          .slice(0, 5)
          .map(([id, data]) => ({ videoId: id, ...data }))
      }
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get status',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Fetch channel videos from YouTube Data API
 * Supports multiple channel identifier formats: @handle, channelId, or search
 */
async function fetchChannelVideos(env, channelIdentifier, maxResults = 10) {
  const apiKey = env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured');
  }

  try {
    // Try to resolve channel ID using different methods
    const channelId = await resolveChannelId(apiKey, channelIdentifier);
    console.log(`Found channel ID: ${channelId} for identifier: ${channelIdentifier}`);

    // Now get the channel's videos
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`
    );

    if (!videosResponse.ok) {
      throw new Error(`YouTube API error fetching videos: ${videosResponse.status} ${videosResponse.statusText}`);
    }

    const videosData = await videosResponse.json();

    // Get detailed metadata for each video
    const videoIds = videosData.items.map(item => item.id.videoId).join(',');
    
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );

    if (!detailsResponse.ok) {
      throw new Error(`YouTube API error fetching video details: ${detailsResponse.status} ${detailsResponse.statusText}`);
    }

    const detailsData = await detailsResponse.json();

    // Transform to our video metadata format
    return detailsData.items.map(video => ({
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails.duration,
      viewCount: parseInt(video.statistics.viewCount || 0),
      likeCount: parseInt(video.statistics.likeCount || 0),
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      thumbnails: video.snippet.thumbnails,
      tags: video.snippet.tags || [],
      categoryId: video.snippet.categoryId,
      defaultLanguage: video.snippet.defaultLanguage || 'en',
      captionsAvailable: false, // Will be determined later in Phase 2
      processedAt: new Date().toISOString(),
      status: 'pending'
    }));

  } catch (error) {
    console.error('YouTube API error:', error);
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }
}

/**
 * Resolve channel identifier to YouTube channel ID
 * Tries multiple approaches: handle lookup, direct ID, search
 */
async function resolveChannelId(apiKey, identifier) {
  console.log(`Resolving channel identifier: ${identifier}`);
  
  // Method 1: Try as handle (if starts with @)
  if (identifier.startsWith('@')) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(identifier)}&key=${apiKey}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          console.log(`✅ Found via handle: ${data.items[0].snippet.title}`);
          return data.items[0].id;
        }
      }
    } catch (error) {
      console.log(`Handle lookup failed: ${error.message}`);
    }
  }
  
  // Method 2: Try as direct channel ID (if looks like UC...)
  if (identifier.startsWith('UC') && identifier.length === 24) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&id=${identifier}&key=${apiKey}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          console.log(`✅ Found via channel ID: ${data.items[0].snippet.title}`);
          return data.items[0].id;
        }
      }
    } catch (error) {
      console.log(`Channel ID lookup failed: ${error.message}`);
    }
  }
  
  // Method 3: Try as legacy username (without @)
  const usernameToTry = identifier.startsWith('@') ? identifier.substring(1) : identifier;
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forUsername=${encodeURIComponent(usernameToTry)}&key=${apiKey}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        console.log(`✅ Found via username: ${data.items[0].snippet.title}`);
        return data.items[0].id;
      }
    }
  } catch (error) {
    console.log(`Username lookup failed: ${error.message}`);
  }
  
  // Method 4: Search for the channel name
  try {
    console.log(`🔍 Searching for channel: ${identifier}`);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(identifier)}&type=channel&maxResults=5&key=${apiKey}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        // Return the first match
        const firstMatch = data.items[0];
        console.log(`✅ Found via search: ${firstMatch.snippet.title}`);
        console.log(`   Available channels found:`);
        data.items.forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.snippet.title} (${item.snippet.channelId})`);
        });
        return firstMatch.snippet.channelId;
      }
    }
  } catch (error) {
    console.log(`Search lookup failed: ${error.message}`);
  }
  
  // If all methods fail, provide helpful error message
  throw new Error(`Channel not found: ${identifier}. Tried handle lookup, direct ID, username, and search. Please check the channel exists and is public.`);
}

/**
 * Get the processed videos list from R2
 */
async function getProcessedVideos(env) {
  try {
    const object = await env.VIDEO_BUCKET.get('processed_videos.json');
    
    if (!object) {
      // Return empty structure if file doesn't exist
      return {
        lastUpdated: new Date().toISOString(),
        totalVideos: 0,
        videos: {}
      };
    }

    const data = await object.json();
    return data;
  } catch (error) {
    console.error('Error reading processed videos:', error);
    // Return empty structure on error
    return {
      lastUpdated: new Date().toISOString(),
      totalVideos: 0,
      videos: {}
    };
  }
}

/**
 * Update the processed videos list in R2
 */
async function updateProcessedVideos(env, processedVideos) {
  const content = JSON.stringify(processedVideos, null, 2);
  
  await env.VIDEO_BUCKET.put('processed_videos.json', content, {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'no-cache'
    }
  });
}

/**
 * Store individual video metadata in R2
 */
async function storeVideoMetadata(env, video) {
  const key = `videos/${video.videoId}/metadata.json`;
  const content = JSON.stringify(video, null, 2);

  await env.VIDEO_BUCKET.put(key, content, {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=3600' // Cache for 1 hour
    },
    customMetadata: {
      videoId: video.videoId,
      title: video.title.substring(0, 100), // Limit length for metadata
      processedAt: video.processedAt,
      channelId: video.channelId
    }
  });

  console.log(`Stored metadata for video: ${video.videoId} - ${video.title}`);
}
