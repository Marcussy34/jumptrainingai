/**
 * YouTube Data API service
 * Handles all interactions with YouTube API for channels and playlists
 */

import { createVideoMetadata } from '../schemas/video.js';
import { extractPlaylistId } from '../utils/helpers.js';

/**
 * Fetch channel videos from YouTube Data API
 * Supports multiple channel identifier formats: @handle, channelId, or search
 */
export async function fetchChannelVideos(env, channelIdentifier, maxResults = 10) {
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
    return detailsData.items.map(video => createVideoMetadata({
      ...video,
      sourceType: 'channel',
      sourceId: channelId
    }));

  } catch (error) {
    console.error('YouTube API error:', error);
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }
}

/**
 * Fetch videos from a YouTube playlist
 * Supports playlist URLs or direct playlist IDs
 */
export async function fetchPlaylistVideos(env, playlistInput, maxResults = 10) {
  const apiKey = env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured');
  }

  try {
    // Extract playlist ID from URL or use directly if it's already an ID
    const playlistId = extractPlaylistId(playlistInput);
    console.log(`Processing playlist ID: ${playlistId}`);

    // Get playlist items from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`YouTube API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const playlistData = await response.json();

    if (!playlistData.items || playlistData.items.length === 0) {
      throw new Error(`No videos found in playlist: ${playlistId}`);
    }

    console.log(`Found ${playlistData.items.length} videos in playlist`);

    // Get video IDs for detailed metadata
    const videoIds = playlistData.items.map(item => item.snippet.resourceId.videoId).join(',');
    
    // Fetch detailed video information
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );

    if (!detailsResponse.ok) {
      throw new Error(`YouTube API error fetching video details: ${detailsResponse.status} ${detailsResponse.statusText}`);
    }

    const detailsData = await detailsResponse.json();

    // Transform to our video metadata format
    return detailsData.items.map(video => createVideoMetadata({
      ...video,
      sourceType: 'playlist',
      sourceId: playlistId
    }));

  } catch (error) {
    console.error('YouTube Playlist API error:', error);
    throw new Error(`Failed to fetch playlist videos: ${error.message}`);
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
