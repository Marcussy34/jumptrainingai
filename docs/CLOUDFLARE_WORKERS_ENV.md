# Cloudflare Workers Environment Configuration

## Why Cloudflare Workers Are Different

Your centralized `env-config.js` system works perfectly for **Node.js services** (embedding-job, frontend) but **not for Cloudflare Workers** because:

### Node.js Services (✅ Works)
```javascript
// This works in embedding-job, frontend
const config = require('../shared/env-config');
const apiKey = config.get('OPENAI_API_KEY');
```

### Cloudflare Workers (❌ Different)
```javascript
// Workers get environment via the `env` parameter
export default {
  async fetch(request, env, ctx) {
    const apiKey = env.OPENAI_API_KEY; // From Cloudflare secrets
  }
};
```

## Technical Differences

| Feature | Node.js Services | Cloudflare Workers |
|---------|------------------|-------------------|
| **Filesystem** | ✅ Can read `.env.local` | ❌ No filesystem access |
| **Module System** | ✅ CommonJS require() | ❌ ES modules only |
| **Environment** | ✅ process.env + custom | ❌ Cloudflare platform only |

## Solution: Bridge Script

Instead of manually setting secrets, use the automated bridge:

```bash
cd ingestion-worker/
node sync-secrets.js  # Reads from your .env.local files
                      # Automatically sets Cloudflare secrets
```

## Architecture Overview

```
┌─────────────────────────┐    ┌──────────────────────────┐
│   Node.js Services      │    │   Cloudflare Worker      │
│  (embedding-job,        │    │  (ingestion-worker)      │
│   frontend)             │    │                          │
│                         │    │                          │
│  ┌─────────────────┐    │    │  ┌─────────────────┐     │
│  │ env-config.js   │    │    │  │ env parameter   │     │
│  │ + .env.local    │    │    │  │ + CF secrets    │     │
│  │                 │    │    │  │                 │     │
│  │ ✅ Direct       │    │    │  │ ❌ Requires     │     │
│  │    access       │    │    │  │    bridge       │     │
│  └─────────────────┘    │    │  └─────────────────┘     │
└─────────────────────────┘    └──────────────────────────┘
           │                              ▲
           │                              │
           └──── sync-secrets.js ─────────┘
           
"Bridge script reads from your centralized 
config and sets Cloudflare secrets"
```

## Environment Variable Flow

1. **You maintain**: `shared/.env.local` + `ingestion-worker/.env.local`
2. **Bridge reads**: Your centralized config using `env-config.js`
3. **Bridge sets**: Cloudflare secrets via `wrangler secret put`
4. **Worker gets**: Secrets via `env.SECRET_NAME` parameter

## Best Practices

### ✅ Do This
- Keep using your centralized system for Node.js services
- Use `sync-secrets.js` to bridge to Cloudflare Workers
- Store all secrets in your existing `.env.local` files

### ❌ Don't Do This
- Don't try to use `require('../shared/env-config')` in Workers
- Don't manually manage Cloudflare secrets when you have centralized config
- Don't duplicate secret storage across multiple systems

## Future Services

- **embedding-job** (GCP Cloud Run): ✅ Use `env-config.js` directly
- **frontend** (Next.js/Vercel): ✅ Use `env-config.js` directly  
- **Any new workers**: ❌ Need bridge scripts like this one

Your centralized system is perfect - we just need to bridge it to Cloudflare's platform!
