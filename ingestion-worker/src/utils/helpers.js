/**
 * Utility helper functions
 */

/**
 * Standard CORS headers for all responses
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Create a JSON response with CORS headers
 */
export function createJsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

/**
 * Create an error response with CORS headers
 */
export function createErrorResponse(error, message, status = 500) {
  return createJsonResponse({
    error,
    message
  }, status);
}

/**
 * Extract playlist ID from various YouTube playlist URL formats
 */
export function extractPlaylistId(input) {
  // Remove any whitespace
  const cleanInput = input.trim();
  
  // If it already looks like a playlist ID (starts with PL)
  if (cleanInput.startsWith('PL') && cleanInput.length > 10) {
    return cleanInput;
  }
  
  // Extract from various YouTube URL formats
  const patterns = [
    /[?&]list=([^&]+)/,           // ?list=PLxxx or &list=PLxxx
    /youtube\.com\/playlist\?list=([^&]+)/, // youtube.com/playlist?list=PLxxx
    /youtu\.be\/.*[?&]list=([^&]+)/        // youtu.be/xxx?list=PLxxx
  ];
  
  for (const pattern of patterns) {
    const match = cleanInput.match(pattern);
    if (match && match[1]) {
      return match[1].split('&')[0]; // Remove any additional parameters
    }
  }
  
  throw new Error(`Invalid playlist format: ${input}. Expected playlist URL or ID starting with 'PL'`);
}
