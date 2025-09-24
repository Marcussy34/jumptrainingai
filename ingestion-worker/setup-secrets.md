# Cloudflare Worker Secrets Setup

## ✅ Easy Way: Use Your Existing Configuration

Since you already have a centralized environment system, just run:

```bash
cd ingestion-worker/
node sync-secrets.js
```

This script will:
1. Read from your existing `shared/.env.local` and `ingestion-worker/.env.local` files
2. Automatically set all required Cloudflare secrets using `wrangler secret put`
3. Show you which secrets are available/missing

## 📚 Why This Is Needed

Your `env-config.js` system works perfectly for Node.js services but **Cloudflare Workers are different**:
- No filesystem access to read `.env.local` files
- No CommonJS support (`require()` doesn't work)
- Environment variables come through Cloudflare's platform

See `../docs/CLOUDFLARE_WORKERS_ENV.md` for technical details.

## 🔧 Manual Method (if needed)

If the sync script doesn't work, you can manually set secrets:

```bash
wrangler secret put YOUTUBE_API_KEY
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put ASSEMBLYAI_API_KEY
```

## ✨ Verification

After syncing secrets:

```bash
node test-worker.js  # Run automated tests
# OR visit your worker URL in browser
```

The health check should show all secrets as `"present"` instead of `"missing"`.
