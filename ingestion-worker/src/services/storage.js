/**
 * R2 Storage service
 * Handles all interactions with Cloudflare R2 bucket
 */

/**
 * Get the processed videos list from R2
 */
export async function getProcessedVideos(env) {
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
export async function updateProcessedVideos(env, processedVideos) {
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
export async function storeVideoMetadata(env, video) {
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

/**
 * Check R2 bucket accessibility for health checks
 */
export async function checkR2Access(env) {
  try {
    await env.VIDEO_BUCKET.head('health-check');
    return 'accessible';
  } catch (error) {
    // Head operation might fail if object doesn't exist, but that's ok
    // A permission error would be different
    return error.message.includes('NoSuchKey') ? 'accessible' : 'error: ' + error.message;
  }
}
