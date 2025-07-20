
# JumpCoach AI – Cloud‑native RAG Chatbot
*A virtual jump‑training coach that speaks with the insight of Isaiah Rivera & John Evans (THP).*

---

## 1️⃣ Goal
Build a self‑updating chatbot that:
1. Continuously ingests new THP YouTube videos and shorts.
2. Transcribes or re‑uses auto‑generated captions.
3. Embeds, stores, and indexes the text for semantic search.
4. Answers user questions using **OpenAI GPT‑4o mini** with retrieval‑augmented generation (RAG).
5. Runs 100  % in the cloud and costs **< USD 10 per 100 h of new video**.

---

## 2️⃣ Success Metrics
| Metric | Target |
| ------ | ------ |
| 💸 **Monthly infra cost** | ≤ USD 10 for 100 h of new video |
| ⏱️ **End‑to‑end latency** | ≤ 2 s P95 on one‑sentence questions |
| 📈 **Answer correctness** (manual eval) | ≥ 80 % "acceptable" |
| 🆕 **New video availability** | Available within minutes after manual ingestion trigger |

---

## 3️⃣ Non‑Goals
* Real‑time video frame analysis or form‑check (v2).
* Full public redistribution of transcripts (fair‑use only).

---

## 4️⃣ User Stories
| ID | As a… | I want to… | So that I can… |
|----|-------|-----------|----------------|
| U1 | Novice athlete | ask “How do I fix knee‑valgus on take‑off?” | get step‑by‑step cues from THP content |
| U2 | Coach | request “Show all single‑leg jump drills from Isaiah” | plan tomorrow’s session |
| U3 | Power user | type “/source” | jump to the exact THP video timestamp |

---

## 5️⃣ System Overview

```mermaid
graph TD
  A[Manual Trigger Button] -->|user click| B[Cloudflare Worker: Video Ingestion]
  B -->|yt-dlp + captions| C[R2: raw storage]
  C -->|manual trigger| D[GCP Cloud Run Job: Chunk + Embed]
  D -->|OpenAI text-embedding-3-small| E[Pinecone: Serverless Starter]
  E -->|top-k search| F[LlamaIndex Cloud: RAG Endpoint]
  F -->|GPT-4o mini| G[Vercel Next.js Chat UI]
```
---

## 6️⃣ Component Requirements

| # | Component | Functional Requirements | Key Tech / Limits |
| --- | -------- | ----------------------- | ----------------- |
| C1 | **Ingestion Worker** | • Triggered manually via button click<br/>• Save `.vtt` captions when present<br/>• If no captions → send audio URL to STT queue | Cloudflare Worker (free ≤ 100 k req/day) |
| C2 | **Storage** | • Store raw captions & transcripts ≤ 10 GB<br/>• Track processed videos in `processed_videos.json`<br/>• Support timestamp-based incremental processing | Cloudflare R2 free tier (10 GB / 1 M Class‑A ops) |
| C3 | **STT** | • Transcribe audio (< 30 % of videos)<br/>• Return JSON with timestamps | AssemblyAI v3 ($50 free credits, then ≈ $0.12/h) |
| C4 | **Embedding Job** | • Chunk 400 tokens + 60 token overlap<br/>• Embed with OpenAI `text-embedding-3-small` (384 d) at $0.000 02 / k tokens<br/>• Skip already-processed videos using metadata checks | Google Cloud Run Job (scales to 0) |
| C5 | **Vector DB** | • Upsert & filter by `video_id`, `speaker`, `type`<br/>• 1 M read / 2 M write units free | Pinecone Serverless Starter |
| C6 | **RAG Service** | • Query top‑k (k = 4) & re‑rank inside GPT prompt<br/>• Stream responses | LlamaIndex Cloud free tier (10 k credits/mo) |
| C7 | **LLM** | • Use `gpt-4o-mini` (USD 0.15 / M input, 0.60 / M output) | OpenAI Chat Completions |
| C8 | **Front‑end** | • Chat with streaming SSE<br/>• "Open source" button → YouTube link + timestamp<br/>• Manual trigger buttons for video ingestion & embedding | Next.js on Vercel Hobby (free) |

---

## 7️⃣ Cost Model (100 h new video per month)

| Stage | Units | Cost |
| ----- | ----- | ---- |
| Cloudflare R2 storage | 6 GB | $0 |
| AssemblyAI STT (30 h) | 30 h | $0 (promo) → $3.60 afterwards |
| Embeddings | 1 M tokens | $0.02 |
| Pinecone storage & ops | ~0.4 GB + 0.5 M RU | $0 |
| GPT‑4o mini answers (2 k Q&A, 750 tokens each) | 1.5 M in / 0.5 M out | $0.34 |
| **Total** | | **≈ $0.36 → $4.0** once Assembly credits expire |

---

## 8️⃣ Operational Flows
1. **Manual button click** in UI triggers *Ingestion Worker*.
2. Worker calls **YouTube Data API** → new video IDs.
3. **Duplicate check**: Query R2 for existing `processed_videos.json` to skip already-ingested videos.
4. For each **new** video ID:  
   4.1 `yt-dlp --write-auto-sub` → captions exist → store to R2.  
   4.2 *If no captions* → enqueue audio for STT (AssemblyAI).  
   4.3 Update `processed_videos.json` with video ID + timestamp.
5. **Manual trigger** (button or API call) starts Cloud Run Job:
   5.1 Load **only new** `.vtt` files from R2 (compare timestamps).
   5.2 Chunk & embed new content, then upsert to Pinecone.
   5.3 Use video_id as metadata to prevent duplicate embeddings.
6. **LlamaIndex Cloud** exposes `/chat` endpoint:  
   *Retriever → similarity_top_k = 4 → GPT‑4o mini prompt*  
7. **Vercel UI** streams completions to the browser.

---

## 9️⃣ Security & Compliance
* All API keys stored in Cloudflare Secrets, GCP Secret Manager, and Vercel environment variables.
* Buckets are private; access via signed URLs only.
* Respect YouTube ToS: store transcripts for personal use, do not redistribute full video content.

---

## 🔟 Phase‑0 Setup Checklist
```bash
# 0. Clone starter repo
git clone https://github.com/YOURHANDLE/jumpcoach-cloud
cd jumpcoach-cloud && cp .env.example .env

# 1. Cloudflare: Worker + R2
npm i -g wrangler
wrangler secret put YT_API_KEY
wrangler publish

# 2. Google Cloud: Cloud Run Job
gcloud auth login
gcloud run deploy embedder --source embedder/ --region us-central1

# 3. Pinecone
#    – create "Starter" project → copy ENV + KEY to .env

# 4. Vercel UI
vercel --prod
```

---

## 1️⃣1️⃣ Risks & Mitigations

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| YouTube auto‑captions are inaccurate | Medium | Add Whisper fallback (OpenAI `audio-transcription-3` at $0.006/min). |
| Pinecone free RU limit hit | Low | Upgrade to “Standard”; cost is still low. |
| AssemblyAI credit exhausted | High | Switch to OpenAI Whisper or set $5 budget cap. |

---

## 1️⃣2️⃣ Future Extensions
* Pose‑estimation form check.
* Auto‑clip drill library with video snippets.
* Fine‑tune GPT‑4o mini on curated Q&A pairs (OpenAI free 2 M training tokens/day).

---

*Last updated: 21 July 2025 (Asia/Kuala_Lumpur).*
