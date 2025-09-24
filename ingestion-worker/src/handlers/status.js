/**
 * Status handler
 * Returns current system status and statistics
 */

import { createJsonResponse, createErrorResponse } from '../utils/helpers.js';
import { getProcessedVideos } from '../services/storage.js';

export async function handleStatus(request, env) {
  try {
    const processedVideos = await getProcessedVideos(env);
    
    const statusData = {
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
    };

    return createJsonResponse(statusData);
  } catch (error) {
    return createErrorResponse('Failed to get status', error.message);
  }
}
