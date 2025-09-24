/**
 * Health check handler
 * Verifies all required environment variables and R2 bucket access
 */

import { createJsonResponse } from '../utils/helpers.js';
import { checkR2Access } from '../services/storage.js';

export async function handleHealth(request, env) {
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
    health.checks.r2_access = await checkR2Access(env);

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
  
  return createJsonResponse(health, status);
}
