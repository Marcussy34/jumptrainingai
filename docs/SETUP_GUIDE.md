# JumpCoach AI - Setup & Implementation Guide

*Detailed step-by-step instructions to get you started*

---

## 🚀 Quick Start Checklist

Before diving into Phase 0, complete this quick checklist:

- [ ] **Prerequisites**: Node.js 18+, Git, Code editor
- [ ] **Accounts**: GitHub, Cloudflare, Google Cloud, OpenAI, AssemblyAI, Pinecone, Vercel  
- [ ] **Payment**: Add billing to GCP, verify API credits/limits
- [ ] **Domain**: (Optional) Custom domain for production

---

## 📁 Project Structure Setup

Create your project structure to match the planned architecture:

```bash
mkdir jumptrainingai && cd jumptrainingai

# Initialize git repository
git init
git remote add origin https://github.com/YOURUSERNAME/jumptrainingai.git

# Create phase-based directory structure  
mkdir -p {ingestion-worker,embedding-job,frontend,shared,scripts,docs,tests}

# Create configuration files
touch .gitignore .env.example package.json README.md
```

### Directory Structure
```
jumptrainingai/
├── .env.example              # Environment template
├── .gitignore               # Git ignore rules
├── package.json             # Root package config
├── IMPLEMENTATION_PLAN.md   # Phase plan (created)
├── TESTING_STRATEGY.md      # Testing guide (created)
├── SETUP_GUIDE.md          # This file
├── ingestion-worker/        # Phase 1: Cloudflare Worker
│   ├── src/
│   ├── wrangler.toml
│   └── package.json
├── embedding-job/           # Phase 3: GCP Cloud Run Job
│   ├── src/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # Phase 5: Next.js App
│   ├── src/
│   ├── public/
│   └── package.json
├── shared/                 # Common utilities
│   ├── types/
│   └── utils/
├── scripts/               # Development & deployment scripts
│   ├── setup-env.sh
│   └── validate-env.sh
├── tests/                # Test suites by phase
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/                 # Additional documentation
    ├── api/
    └── deployment/
```

---

## 🔧 Phase 0: Detailed Setup Instructions

### 1. Account Creation & API Keys

#### Cloudflare Account
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Verify login
wrangler whoami
```

**Required:** 
- Account ID (from dashboard)
- API Token with Worker and R2 permissions
- YouTube Data API v3 key

#### Google Cloud Platform
```bash
# Install Google Cloud CLI
# macOS: brew install google-cloud-sdk
# Linux: See https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### OpenAI API
- Visit https://platform.openai.com/api-keys
- Create new API key
- Note pricing: $0.0001/1K tokens (embeddings), $0.15/1M input tokens (GPT-4o mini)

#### AssemblyAI  
```bash
# Sign up at https://www.assemblyai.com/
# Get $50 in free credits
# API key from dashboard
```

#### Pinecone
```bash
# Sign up at https://www.pinecone.io/
# Create "Starter" project (free)
# Note: API key and Environment
```

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login
```

### 2. Environment Configuration

Create your master `.env.example`:

```bash
# .env.example

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_R2_BUCKET_NAME=jumpcoach-storage

# YouTube
YOUTUBE_API_KEY=

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_REGION=us-central1

# OpenAI  
OPENAI_API_KEY=

# AssemblyAI
ASSEMBLYAI_API_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=jumpcoach-vectors

# LlamaIndex (if using separately)
LLAMAINDEX_API_KEY=

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

Copy and fill your actual values:
```bash
cp .env.example .env
# Edit .env with your actual API keys
```

### 3. Validation Script

Create `scripts/validate-env.sh`:

```bash
#!/bin/bash
# scripts/validate-env.sh

echo "🔍 Validating environment setup..."

# Source environment variables
source .env

# Test Cloudflare
echo "Testing Cloudflare..."
if wrangler whoami > /dev/null 2>&1; then
    echo "✅ Cloudflare CLI authenticated"
else
    echo "❌ Cloudflare authentication failed"
fi

# Test Google Cloud  
echo "Testing Google Cloud..."
if gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null 2>&1; then
    echo "✅ Google Cloud authenticated"
else
    echo "❌ Google Cloud authentication failed"
fi

# Test API keys with simple requests
echo "Testing API keys..."

# OpenAI
if curl -s -H "Authorization: Bearer $OPENAI_API_KEY" \
    https://api.openai.com/v1/models > /dev/null; then
    echo "✅ OpenAI API key valid"
else
    echo "❌ OpenAI API key invalid"
fi

# YouTube Data API
if curl -s "https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=test&key=$YOUTUBE_API_KEY" > /dev/null; then
    echo "✅ YouTube API key valid"
else
    echo "❌ YouTube API key invalid"
fi

# AssemblyAI
if curl -s -H "authorization: $ASSEMBLYAI_API_KEY" \
    https://api.assemblyai.com/v2/account > /dev/null; then
    echo "✅ AssemblyAI API key valid"
else
    echo "❌ AssemblyAI API key invalid"
fi

echo "🎉 Environment validation complete!"
```

Make it executable and run:
```bash
chmod +x scripts/validate-env.sh
./scripts/validate-env.sh
```

---

## 📦 Phase 1: Ingestion Worker Implementation

### Cloudflare Worker Setup

```bash
cd ingestion-worker

# Initialize Worker project
wrangler generate jumpcoach-ingestion
cd jumpcoach-ingestion

# Install dependencies
npm install

# Create wrangler.toml
```

#### `wrangler.toml` Configuration
```toml
name = "jumpcoach-ingestion"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
r2_buckets = [
  { binding = "STORAGE", bucket_name = "jumpcoach-storage" }
]

[vars]
ENVIRONMENT = "production"

[[env.production.kv_namespaces]]
binding = "PROCESSED_VIDEOS"
id = "your-kv-namespace-id"
```

#### Basic Worker Implementation
```javascript
// src/index.js
import { handleIngest } from './handlers/ingest.js';
import { handleStatus } from './handlers/status.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response;
      
      switch (path) {
        case '/ingest':
          if (request.method !== 'POST') {
            throw new Error('Method not allowed');
          }
          response = await handleIngest(request, env);
          break;
          
        case '/status':
          response = await handleStatus(request, env);
          break;
          
        default:
          response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }
  }
};
```

#### Ingest Handler
```javascript  
// src/handlers/ingest.js
export async function handleIngest(request, env) {
  const { videoIds, channelId } = await request.json();
  
  // Validate input
  if (!videoIds && !channelId) {
    throw new Error('Either videoIds or channelId required');
  }

  const results = [];
  
  if (channelId) {
    // Fetch recent videos from channel
    const videos = await fetchChannelVideos(channelId, env.YOUTUBE_API_KEY);
    results.push(...await processVideos(videos, env));
  }
  
  if (videoIds) {
    // Process specific video IDs
    results.push(...await processVideos(videoIds, env));
  }

  return new Response(JSON.stringify({ 
    processed: results.length,
    results 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function fetchChannelVideos(channelId, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/search?` +
    `channelId=${channelId}&part=id&type=video&order=date&maxResults=50&key=${apiKey}`;
    
  const response = await fetch(url);
  const data = await response.json();
  
  return data.items.map(item => item.id.videoId);
}

async function processVideos(videoIds, env) {
  const results = [];
  
  for (const videoId of videoIds) {
    try {
      // Check if already processed
      const existing = await env.PROCESSED_VIDEOS.get(videoId);
      if (existing) {
        results.push({ videoId, status: 'already_processed' });
        continue;
      }

      // Fetch video metadata
      const metadata = await fetchVideoMetadata(videoId, env.YOUTUBE_API_KEY);
      
      // Store metadata in R2
      await env.STORAGE.put(
        `metadata/${videoId}.json`,
        JSON.stringify(metadata)
      );
      
      // Mark as processed
      await env.PROCESSED_VIDEOS.put(videoId, JSON.stringify({
        processedAt: new Date().toISOString(),
        status: 'metadata_extracted'
      }));
      
      results.push({ videoId, status: 'processed', metadata });
      
    } catch (error) {
      console.error(`Error processing ${videoId}:`, error);
      results.push({ videoId, status: 'error', error: error.message });
    }
  }
  
  return results;
}

async function fetchVideoMetadata(videoId, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/videos?` +
    `id=${videoId}&part=snippet,contentDetails&key=${apiKey}`;
    
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.items?.length) {
    throw new Error('Video not found');
  }
  
  const video = data.items[0];
  return {
    videoId,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: video.snippet.publishedAt,
    duration: video.contentDetails.duration,
    channelTitle: video.snippet.channelTitle,
    extractedAt: new Date().toISOString()
  };
}
```

### Deploy and Test

```bash
# Deploy worker
wrangler publish

# Test deployment
curl -X POST "https://jumpcoach-ingestion.YOUR_USERNAME.workers.dev/ingest" \
  -H "Content-Type: application/json" \
  -d '{"videoIds": ["SAMPLE_VIDEO_ID"]}'
```

---

## 🎬 Phase 2: Video Processing Enhancement

### YouTube-DL Integration

Add to your ingestion worker:

```javascript
// src/handlers/captions.js
export async function extractCaptions(videoId) {
  // Note: yt-dlp needs to run in a different environment
  // This would typically be a separate Cloud Run service
  
  const ytDlpUrl = `${env.YTDLP_SERVICE_URL}/extract`;
  
  const response = await fetch(ytDlpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      videoId,
      extractCaptions: true,
      audioFallback: true 
    })
  });
  
  return await response.json();
}
```

### Cloud Run Service for YT-DLP

Create `embedding-job/yt-dlp-service/`:

#### Dockerfile
```dockerfile
# embedding-job/yt-dlp-service/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install yt-dlp
RUN pip install yt-dlp

COPY . .

EXPOSE 8080

CMD ["python", "main.py"]
```

#### Python Service
```python
# embedding-job/yt-dlp-service/main.py
import os
import json
from flask import Flask, request, jsonify
import yt_dlp
from google.cloud import storage

app = Flask(__name__)

@app.route('/extract', methods=['POST'])
def extract_video_content():
    data = request.get_json()
    video_id = data['videoId']
    
    try:
        # Configure yt-dlp
        ydl_opts = {
            'writeautomaticsub': True,
            'writesubtitles': True,
            'subtitleslangs': ['en'],
            'skip_download': True,
            'outtmpl': f'/tmp/{video_id}.%(ext)s'
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info and captions
            info = ydl.extract_info(f'https://youtube.com/watch?v={video_id}', download=False)
            
            # Try to download captions
            try:
                ydl.download([f'https://youtube.com/watch?v={video_id}'])
                captions = read_captions_file(video_id)
            except:
                captions = None
        
        result = {
            'videoId': video_id,
            'captions': captions,
            'info': {
                'title': info.get('title'),
                'duration': info.get('duration'),
                'uploader': info.get('uploader')
            }
        }
        
        # If no captions, we'll need STT
        if not captions:
            result['needsSTT'] = True
            result['audioUrl'] = info.get('url')  # Direct audio URL
            
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def read_captions_file(video_id):
    vtt_path = f'/tmp/{video_id}.en.vtt'
    if os.path.exists(vtt_path):
        with open(vtt_path, 'r') as f:
            return parse_vtt(f.read())
    return None

def parse_vtt(vtt_content):
    # Simple VTT parser
    lines = vtt_content.split('\n')
    captions = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if '-->' in line:
            # Parse timestamp line
            start_time, end_time = line.split(' --> ')
            start_ms = parse_timestamp(start_time)
            end_ms = parse_timestamp(end_time)
            
            # Get caption text
            text_lines = []
            i += 1
            while i < len(lines) and lines[i].strip():
                text_lines.append(lines[i].strip())
                i += 1
            
            if text_lines:
                captions.append({
                    'start': start_ms,
                    'end': end_ms,
                    'text': ' '.join(text_lines)
                })
        i += 1
    
    return captions

def parse_timestamp(timestamp):
    # Convert VTT timestamp to milliseconds
    parts = timestamp.split(':')
    hours = int(parts[0]) if len(parts) == 3 else 0
    minutes = int(parts[-2])
    seconds = float(parts[-1])
    
    return int((hours * 3600 + minutes * 60 + seconds) * 1000)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
```

Deploy this service:
```bash
cd embedding-job/yt-dlp-service

# Deploy to Cloud Run
gcloud run deploy yt-dlp-service \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --timeout 600
```

---

## 🧠 Phase 3: Embedding Pipeline

### Cloud Run Job for Embeddings

```python
# embedding-job/src/main.py
import os
import json
import openai
from google.cloud import storage
import pinecone
from typing import List, Dict

class EmbeddingProcessor:
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=os.environ['OPENAI_API_KEY'])
        
        # Initialize Pinecone
        pinecone.init(
            api_key=os.environ['PINECONE_API_KEY'],
            environment=os.environ['PINECONE_ENVIRONMENT']
        )
        self.index = pinecone.Index(os.environ['PINECONE_INDEX_NAME'])
        
        # GCS client for R2 (using S3 compatibility)
        self.storage_client = storage.Client()
        
    def process_new_transcripts(self):
        """Main processing function"""
        print("🚀 Starting embedding processing...")
        
        # Get list of unprocessed transcripts
        transcripts = self.get_unprocessed_transcripts()
        
        for transcript_info in transcripts:
            try:
                self.process_transcript(transcript_info)
                print(f"✅ Processed {transcript_info['videoId']}")
            except Exception as e:
                print(f"❌ Error processing {transcript_info['videoId']}: {e}")
    
    def get_unprocessed_transcripts(self):
        # Implementation depends on your storage structure
        # Return list of transcript files to process
        pass
    
    def process_transcript(self, transcript_info):
        """Process a single transcript"""
        video_id = transcript_info['videoId']
        
        # Load transcript content
        transcript = self.load_transcript(video_id)
        
        # Chunk the transcript
        chunks = self.chunk_transcript(transcript, video_id)
        
        # Generate embeddings
        embeddings = self.generate_embeddings(chunks)
        
        # Upsert to Pinecone
        self.upsert_embeddings(embeddings, chunks)
        
        # Mark as processed
        self.mark_processed(video_id)
    
    def chunk_transcript(self, transcript: List[Dict], video_id: str) -> List[Dict]:
        """Chunk transcript with 400 token limit and 60 token overlap"""
        chunks = []
        current_chunk = ""
        current_tokens = 0
        current_start_time = None
        chunk_id = 0
        
        for segment in transcript:
            segment_text = segment['text']
            segment_tokens = self.estimate_tokens(segment_text)
            
            if current_tokens + segment_tokens > 400 and current_chunk:
                # Create chunk
                chunks.append({
                    'id': f"{video_id}_chunk_{chunk_id}",
                    'text': current_chunk.strip(),
                    'metadata': {
                        'videoId': video_id,
                        'startTime': current_start_time,
                        'endTime': segment.get('start', 0),
                        'chunkId': chunk_id
                    }
                })
                
                # Start new chunk with overlap
                overlap_text = self.get_overlap_text(current_chunk, 60)
                current_chunk = overlap_text + " " + segment_text
                current_tokens = self.estimate_tokens(current_chunk)
                chunk_id += 1
            else:
                if not current_chunk:
                    current_start_time = segment.get('start', 0)
                current_chunk += " " + segment_text
                current_tokens += segment_tokens
        
        # Add final chunk
        if current_chunk:
            chunks.append({
                'id': f"{video_id}_chunk_{chunk_id}",
                'text': current_chunk.strip(),
                'metadata': {
                    'videoId': video_id,
                    'startTime': current_start_time,
                    'endTime': transcript[-1].get('end', 0) if transcript else 0,
                    'chunkId': chunk_id
                }
            })
        
        return chunks
    
    def generate_embeddings(self, chunks: List[Dict]) -> List[List[float]]:
        """Generate embeddings for text chunks"""
        texts = [chunk['text'] for chunk in chunks]
        
        response = self.openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=texts
        )
        
        return [embedding.embedding for embedding in response.data]
    
    def upsert_embeddings(self, embeddings: List[List[float]], chunks: List[Dict]):
        """Upsert embeddings to Pinecone"""
        vectors = []
        
        for embedding, chunk in zip(embeddings, chunks):
            vectors.append({
                'id': chunk['id'],
                'values': embedding,
                'metadata': chunk['metadata']
            })
        
        # Batch upsert
        self.index.upsert(vectors=vectors)
    
    def estimate_tokens(self, text: str) -> int:
        """Rough token estimation (more accurate would use tiktoken)"""
        return len(text.split()) * 1.3  # Approximation
    
    def get_overlap_text(self, text: str, target_tokens: int) -> str:
        """Get last N tokens worth of text for overlap"""
        words = text.split()
        target_words = int(target_tokens / 1.3)
        return ' '.join(words[-target_words:])

if __name__ == "__main__":
    processor = EmbeddingProcessor()
    processor.process_new_transcripts()
```

---

## 📚 Next Steps

You now have a solid foundation to start implementation! Here's your immediate action plan:

### Week 1: Phase 0 + Phase 1
1. **Day 1-2**: Complete account setup and environment validation
2. **Day 3-5**: Implement and test ingestion worker
3. **Day 6-7**: Set up R2 storage and test full metadata pipeline

### Week 2: Phase 2
1. **Day 8-10**: Implement YT-DLP service and caption extraction  
2. **Day 11-12**: Add AssemblyAI STT integration
3. **Day 13-14**: Test complete transcript processing pipeline

### Week 3: Phase 3 + Phase 4  
1. **Day 15-17**: Implement embedding processing job
2. **Day 18-19**: Set up Pinecone and test vector operations
3. **Day 20-21**: Create RAG endpoint and test question-answering

Ready to start? Run the environment validation script and begin with Phase 0! 

**Remember**: Each phase builds on the previous one, so don't skip ahead. Test thoroughly at each stage to ensure a solid foundation.

For questions or issues during implementation, refer to:
- `IMPLEMENTATION_PLAN.md` for high-level phase guidance
- `TESTING_STRATEGY.md` for testing approaches  
- Your original `README.md` for system requirements and success metrics

Good luck building JumpCoach AI! 🚀
