# Environment Configuration Templates

This document provides the environment variable templates for each component of the JumpCoach AI system.

## 🔧 Setup Instructions

1. Copy the relevant template below for each component
2. Create a `.env.local` or `.env` file in the component directory  
3. Fill in your actual API keys and configuration values
4. **Never commit these files to git** - they're automatically ignored

---

## 🌐 Ingestion Worker Environment

Create `/ingestion-worker/.env.local`:

```bash
# Cloudflare Worker Environment Variables

# Cloudflare API credentials
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here

# Cloudflare R2 Storage
R2_BUCKET_NAME=jumptrainingai-videos
R2_ACCESS_KEY_ID=your_r2_access_key_here  
R2_SECRET_ACCESS_KEY=your_r2_secret_key_here

# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key_here

# AssemblyAI (for speech-to-text fallback)
ASSEMBLYAI_API_KEY=your_assemblyai_key_here

# Environment
ENVIRONMENT=development
```

---

## 🤖 Embedding Job Environment

Create `/embedding-job/.env.local`:

```bash
# Google Cloud Run Job Environment Variables

# Google Cloud Project
GCP_PROJECT_ID=your_gcp_project_id_here
GCP_REGION=us-central1

# Cloudflare R2 (for reading transcript data)
R2_BUCKET_NAME=jumptrainingai-videos
R2_ACCESS_KEY_ID=your_r2_access_key_here
R2_SECRET_ACCESS_KEY=your_r2_secret_key_here
R2_ENDPOINT=your_r2_endpoint_here

# OpenAI (for text-embedding-3-small)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=jumptrainingai-embeddings
PINECONE_ENVIRONMENT=gcp-starter

# Processing Configuration
CHUNK_SIZE=400
CHUNK_OVERLAP=60
BATCH_SIZE=100

# Environment
ENVIRONMENT=development
```

---

## 🖥️ Frontend Environment

Create `/frontend/.env.local`:

```bash
# Next.js Frontend Environment Variables

# API Endpoints
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8787/chat
NEXT_PUBLIC_INGESTION_API_URL=http://localhost:8787/ingest

# OpenAI (for RAG/chat responses)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Pinecone (for similarity search)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=jumptrainingai-embeddings

# LlamaIndex Cloud (optional)
LLAMAINDEX_API_KEY=your_llamaindex_api_key_here

# Analytics (optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id
NEXT_PUBLIC_VERCEL_ANALYTICS=true

# Environment
NODE_ENV=development
NEXT_PUBLIC_ENVIRONMENT=development
```

---

## 📦 Shared Configuration

Create `/shared/.env.local` (if needed):

```bash
# Shared Environment Variables
# Common configuration used across components

# Service URLs (for cross-component communication)
INGESTION_WORKER_URL=https://your-worker.your-subdomain.workers.dev
EMBEDDING_JOB_URL=https://your-embedding-job-hash-uc.a.run.app
FRONTEND_URL=https://your-app.vercel.app

# Common API Keys (if shared across services)
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here

# Monitoring & Analytics
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info

# Environment
NODE_ENV=development
```

---

## 🔑 Required API Keys & Accounts

Based on your implementation plan, you'll need accounts and API keys for:

### ✅ Required for Phase 0
- [ ] **Cloudflare**: Account + API token + R2 storage
- [ ] **Google Cloud**: Project with billing enabled
- [ ] **Pinecone**: Serverless Starter account
- [ ] **OpenAI**: API key for embeddings + GPT-4o mini
- [ ] **AssemblyAI**: Account for speech-to-text
- [ ] **Vercel**: Account for frontend deployment

### 📋 Setup Checklist
- [ ] All accounts created
- [ ] API keys obtained and stored securely
- [ ] Environment files created for each component
- [ ] Git configured to ignore environment files

---

## 🚨 Security Notes

- **Never commit environment files** - they contain sensitive API keys
- Use `.env.local` for local development (automatically ignored by git)
- Use secure secret management for production deployments
- Regularly rotate API keys as a security best practice
