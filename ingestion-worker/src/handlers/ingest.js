/**
 * Video ingestion handler
 * Handles both YouTube channel and playlist ingestion
 */

import { createJsonResponse, createErrorResponse } from '../utils/helpers.js';
import { fetchChannelVideos, fetchPlaylistVideos } from '../services/youtube.js';
import { getProcessedVideos, updateProcessedVideos, storeVideoMetadata } from '../services/storage.js';

export async function handleIngest(request, env, ctx) {
  if (request.method !== 'POST') {
    return createErrorResponse(
      'Method not allowed',
      'Use POST to trigger ingestion',
      405
    );
  }

  try {
    const body = await request.json();
    const maxResults = body.maxResults || 10;
    
    let newVideos;
    let sourceDescription;

    // Determine if we're processing a playlist or channel
    if (body.playlistUrl) {
      sourceDescription = `playlist: ${body.playlistUrl}`;
      console.log(`Starting ingestion for ${sourceDescription}`);
      newVideos = await fetchPlaylistVideos(env, body.playlistUrl, maxResults);
    } else {
      const channelHandle = body.channelHandle || 'Isaiah Rivera';
      sourceDescription = `channel: ${channelHandle}`;
      console.log(`Starting ingestion for ${sourceDescription}`);
      newVideos = await fetchChannelVideos(env, channelHandle, maxResults);
    }

    // Get processed videos list to check for duplicates
    const processedVideos = await getProcessedVideos(env);
    
    // Filter out already processed videos
    const unprocessedVideos = newVideos.filter(video => 
      !processedVideos.videos[video.videoId]
    );

    console.log(`Found ${newVideos.length} total videos, ${unprocessedVideos.length} new videos to process`);

    if (unprocessedVideos.length === 0) {
      return createJsonResponse({
        success: true,
        message: 'No new videos to process',
        source: sourceDescription,
        totalFound: newVideos.length,
        alreadyProcessed: newVideos.length
      });
    }

    // Store new video metadata in R2
    const results = await Promise.allSettled(
      unprocessedVideos.map(video => storeVideoMetadata(env, video))
    );

    // Update processed videos list
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

    return createJsonResponse({
      success: true,
      message: 'Ingestion completed',
      source: sourceDescription,
      processed: successfulVideos.length,
      failed: failedVideos.length,
      totalInDatabase: processedVideos.totalVideos,
      errors: failedVideos.map(r => r.reason?.message || 'Unknown error')
    });

  } catch (error) {
    console.error('Ingestion error:', error);
    return createErrorResponse('Ingestion failed', error.message);
  }
}
