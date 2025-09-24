/**
 * JumpTrainingAI - Video Ingestion Worker (Modular)
 * Main entry point - routes requests to appropriate handlers
 */

import { CORS_HEADERS, createErrorResponse } from './utils/helpers.js';
import { handleRoot } from './handlers/root.js';
import { handleHealth } from './handlers/health.js';
import { handleIngest } from './handlers/ingest.js';
import { handleStatus } from './handlers/status.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: CORS_HEADERS
      });
    }

    try {
      // Route requests to handlers
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
            headers: CORS_HEADERS
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return createErrorResponse('Internal server error', error.message);
    }
  }
};
