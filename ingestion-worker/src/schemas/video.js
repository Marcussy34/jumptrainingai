/**
 * Video metadata schema definitions
 * Defines the structure of video data we store in R2
 */

/**
 * Video metadata schema definition
 * This defines the structure of video data we store in R2
 */
export const VideoMetadata = {
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
  status: 'pending',     // Processing status: pending, processed, failed
  sourceType: 'channel', // Source type: 'channel' or 'playlist'
  sourceId: ''           // Source ID (channel ID or playlist ID)
};

/**
 * Processed videos tracking schema
 * This tracks which videos we've already ingested
 */
export const ProcessedVideosSchema = {
  lastUpdated: '',       // ISO timestamp of last update
  totalVideos: 0,        // Total count of processed videos
  videos: {}             // Object with videoId as key, metadata as value
};

/**
 * Create a video metadata object with default values
 */
export function createVideoMetadata(videoData) {
  return {
    videoId: videoData.id,
    title: videoData.snippet.title,
    description: videoData.snippet.description,
    publishedAt: videoData.snippet.publishedAt,
    duration: videoData.contentDetails.duration,
    viewCount: parseInt(videoData.statistics.viewCount || 0),
    likeCount: parseInt(videoData.statistics.likeCount || 0),
    channelId: videoData.snippet.channelId,
    channelTitle: videoData.snippet.channelTitle,
    thumbnails: videoData.snippet.thumbnails,
    tags: videoData.snippet.tags || [],
    categoryId: videoData.snippet.categoryId,
    defaultLanguage: videoData.snippet.defaultLanguage || 'en',
    captionsAvailable: false, // Will be determined later in Phase 2
    processedAt: new Date().toISOString(),
    status: 'pending',
    sourceType: videoData.sourceType || 'channel',
    sourceId: videoData.sourceId || ''
  };
}
