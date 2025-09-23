# JumpCoach AI - Implementation Phases Plan

*A structured step-by-step approach to building the cloud-native RAG chatbot*

---

## 🎯 Implementation Strategy

This plan breaks down the JumpCoach AI system into **6 phases** that build incrementally, allowing for testing and validation at each stage. Each phase has clear deliverables, success criteria, and testing approaches.

---

## 📋 Phase Overview

| Phase | Focus | Duration | Dependencies |
|-------|-------|----------|-------------|
| **Phase 0** | Foundation & Setup | 1-2 days | None |
| **Phase 1** | Basic Storage & Ingestion | 2-3 days | Phase 0 |
| **Phase 2** | Video Processing & STT | 3-4 days | Phase 1 |
| **Phase 3** | Embedding & Vector Storage | 3-4 days | Phase 2 |
| **Phase 4** | RAG & LLM Integration | 2-3 days | Phase 3 |
| **Phase 5** | Frontend & User Experience | 3-4 days | Phase 4 |
| **Phase 6** | Production & Optimization | 2-3 days | Phase 5 |

**Total Estimated Duration: 16-23 days**

---

## 🚀 Phase 0: Foundation & Setup
*Duration: 1-2 days*

### Objectives
- Set up development environment and accounts
- Configure basic infrastructure
- Establish project structure

### Tasks
1. **Account Setup**
   - [ ] Create Cloudflare account and get API keys
   - [ ] Set up Google Cloud Project with billing
   - [ ] Register for Pinecone Serverless Starter
   - [ ] Set up OpenAI API account
   - [ ] Create AssemblyAI account
   - [ ] Set up Vercel account

2. **Development Environment**
   - [ ] Install Node.js, npm/yarn
   - [ ] Install Wrangler CLI (`npm i -g wrangler`)
   - [ ] Install Google Cloud CLI
   - [ ] Set up git repository structure

3. **Project Structure**
   ```
   jumptrainingai/
   ├── ingestion-worker/     # Cloudflare Worker
   ├── embedding-job/        # GCP Cloud Run Job  
   ├── frontend/            # Next.js app
   ├── shared/              # Common utilities/types
   └── docs/               # Documentation
   ```

4. **Environment Configuration**
   - [ ] Create `.env.example` templates for each component
   - [ ] Set up environment-specific configurations

### Success Criteria
- [ ] All accounts created and API keys obtained
- [ ] Development tools installed and functional
- [ ] Project structure established
- [ ] Environment configurations ready

### Testing
- [ ] Verify CLI tools work (`wrangler whoami`, `gcloud auth list`)
- [ ] Test API key connectivity for each service

---

## 📦 Phase 1: Basic Storage & Ingestion
*Duration: 2-3 days | Dependencies: Phase 0*

### Objectives
- Implement Cloudflare R2 storage
- Create basic video ingestion worker
- Establish data flow foundation

### Tasks
1. **Cloudflare R2 Setup**
   - [ ] Create R2 bucket for video data storage
   - [ ] Configure bucket policies and CORS
   - [ ] Test upload/download operations

2. **Basic Ingestion Worker (C1)**
   - [ ] Create Cloudflare Worker project
   - [ ] Implement YouTube Data API integration
   - [ ] Add video metadata extraction
   - [ ] Create `processed_videos.json` tracking system
   - [ ] Add duplicate detection logic

3. **Data Models**
   - [ ] Define video metadata schema
   - [ ] Create processed videos tracking format
   - [ ] Design storage path conventions

4. **Basic UI Trigger**
   - [ ] Simple HTML page with ingestion trigger button
   - [ ] Basic status feedback system

### Success Criteria
- [ ] Can trigger video metadata ingestion via button
- [ ] Video metadata saved to R2 correctly
- [ ] Duplicate detection prevents re-processing
- [ ] `processed_videos.json` updates properly

### Testing
- [ ] Test with 2-3 THP videos
- [ ] Verify duplicate detection works
- [ ] Confirm R2 storage structure is correct
- [ ] Test error handling for invalid video URLs

---

## 🎬 Phase 2: Video Processing & STT
*Duration: 3-4 days | Dependencies: Phase 1*

### Objectives
- Implement video caption extraction
- Integrate AssemblyAI for speech-to-text
- Create complete transcript processing pipeline

### Tasks
1. **Caption Extraction**
   - [ ] Integrate `yt-dlp` for caption download
   - [ ] Implement VTT caption parsing
   - [ ] Add caption quality assessment

2. **STT Integration (C3)**
   - [ ] Set up AssemblyAI integration
   - [ ] Create audio extraction pipeline (for videos without captions)
   - [ ] Implement timestamp preservation
   - [ ] Add STT result storage to R2

3. **Transcript Processing**
   - [ ] Create unified transcript format
   - [ ] Add speaker detection (when available)
   - [ ] Implement timestamp normalization
   - [ ] Add content cleaning/preprocessing

4. **Enhanced Ingestion Worker**
   - [ ] Extend worker to handle caption extraction
   - [ ] Add STT fallback logic
   - [ ] Implement processing status tracking

### Success Criteria
- [ ] Successfully extracts captions when available
- [ ] Falls back to STT for videos without captions
- [ ] Preserves accurate timestamps
- [ ] Stores clean, structured transcripts in R2

### Testing
- [ ] Test with videos that have auto-captions
- [ ] Test with videos requiring STT
- [ ] Verify timestamp accuracy
- [ ] Test error handling for failed transcriptions

---

## 🧠 Phase 3: Embedding & Vector Storage
*Duration: 3-4 days | Dependencies: Phase 2*

### Objectives
- Implement transcript chunking and embedding
- Set up Pinecone vector database
- Create embedding processing pipeline

### Tasks
1. **Embedding Job Setup (C4)**
   - [ ] Create Google Cloud Run Job project
   - [ ] Set up OpenAI embedding integration (`text-embedding-3-small`)
   - [ ] Implement R2 to Cloud Run data pipeline

2. **Text Processing Pipeline**
   - [ ] Implement 400-token chunking with 60-token overlap
   - [ ] Add metadata preservation (video_id, timestamps, speaker)
   - [ ] Create embedding batch processing

3. **Pinecone Integration (C5)**
   - [ ] Set up Pinecone Serverless index (384 dimensions)
   - [ ] Implement vector upsert operations
   - [ ] Add metadata filtering capabilities
   - [ ] Create duplicate embedding prevention

4. **Processing Orchestration**
   - [ ] Add trigger mechanism for embedding job
   - [ ] Implement progress tracking
   - [ ] Add error handling and retry logic

### Success Criteria
- [ ] Transcripts are properly chunked with overlap
- [ ] Embeddings generated successfully using OpenAI
- [ ] Vectors stored in Pinecone with correct metadata
- [ ] Duplicate processing is prevented
- [ ] Processing can be triggered manually

### Testing
- [ ] Process 10+ video transcripts
- [ ] Verify embedding quality with similarity searches
- [ ] Test metadata filtering in Pinecone
- [ ] Confirm no duplicate embeddings

---

## 🔍 Phase 4: RAG & LLM Integration
*Duration: 2-3 days | Dependencies: Phase 3*

### Objectives
- Implement RAG retrieval system
- Integrate GPT-4o mini for responses
- Create question-answering pipeline

### Tasks
1. **RAG Service Setup (C6)**
   - [ ] Set up LlamaIndex Cloud integration
   - [ ] Configure Pinecone as vector store
   - [ ] Implement similarity search (top-k=4)

2. **LLM Integration (C7)**
   - [ ] Set up OpenAI GPT-4o mini integration
   - [ ] Design prompts for jump training context
   - [ ] Implement context-aware response generation

3. **Query Processing**
   - [ ] Create query preprocessing
   - [ ] Implement retrieval pipeline
   - [ ] Add source citation with timestamps
   - [ ] Implement streaming responses

4. **API Endpoint**
   - [ ] Create `/chat` endpoint
   - [ ] Add query validation
   - [ ] Implement response streaming
   - [ ] Add error handling

### Success Criteria
- [ ] Can answer jump training questions accurately
- [ ] Retrieves relevant context from vector database
- [ ] Provides source citations with video timestamps
- [ ] Streams responses for better UX
- [ ] Handles edge cases gracefully

### Testing
- [ ] Test with questions from your user stories
- [ ] Verify source attribution accuracy
- [ ] Test response quality and relevance
- [ ] Performance test with concurrent queries

---

## 🖥️ Phase 5: Frontend & User Experience
*Duration: 3-4 days | Dependencies: Phase 4*

### Objectives
- Create polished chat interface
- Implement manual trigger controls
- Add source navigation features

### Tasks
1. **Next.js App Setup (C8)**
   - [ ] Create Next.js project with TypeScript
   - [ ] Set up Tailwind CSS for styling
   - [ ] Configure Vercel deployment

2. **Chat Interface**
   - [ ] Implement streaming chat UI
   - [ ] Add message history
   - [ ] Create typing indicators
   - [ ] Add error state handling

3. **Manual Trigger UI**
   - [ ] Create video ingestion trigger interface
   - [ ] Add embedding job trigger controls
   - [ ] Implement status monitoring dashboard
   - [ ] Add progress indicators

4. **Enhanced Features**
   - [ ] Implement "Open source" button → YouTube + timestamp
   - [ ] Add search suggestions/autocomplete
   - [ ] Create recent questions history
   - [ ] Add mobile responsiveness

5. **User Experience Polish**
   - [ ] Add loading states and animations
   - [ ] Implement proper error messaging
   - [ ] Add keyboard shortcuts
   - [ ] Create help/onboarding flow

### Success Criteria
- [ ] Intuitive chat interface with streaming responses
- [ ] Manual trigger controls work reliably
- [ ] Source links navigate to correct YouTube timestamps
- [ ] Mobile-friendly responsive design
- [ ] Professional, polished appearance

### Testing
- [ ] Test full user journeys from your user stories
- [ ] Test on multiple devices and browsers
- [ ] Verify YouTube timestamp links work correctly
- [ ] Performance test UI responsiveness

---

## 🚀 Phase 6: Production & Optimization
*Duration: 2-3 days | Dependencies: Phase 5*

### Objectives
- Optimize for production deployment
- Implement monitoring and analytics
- Fine-tune performance and costs

### Tasks
1. **Production Deployment**
   - [ ] Deploy all services to production
   - [ ] Configure proper environment variables
   - [ ] Set up custom domains and SSL
   - [ ] Implement proper CORS policies

2. **Monitoring & Analytics**
   - [ ] Add logging across all services
   - [ ] Implement error tracking (Sentry)
   - [ ] Set up usage analytics
   - [ ] Create cost monitoring alerts

3. **Performance Optimization**
   - [ ] Optimize embedding job performance
   - [ ] Add caching layers where appropriate
   - [ ] Tune vector search parameters
   - [ ] Optimize API response times

4. **Security & Compliance**
   - [ ] Audit API key management
   - [ ] Implement rate limiting
   - [ ] Add input validation and sanitization
   - [ ] Review YouTube ToS compliance

5. **Documentation & Maintenance**
   - [ ] Create operational runbook
   - [ ] Document deployment procedures
   - [ ] Create troubleshooting guide
   - [ ] Set up automated backups

### Success Criteria
- [ ] All services deployed and stable in production
- [ ] Meets success metrics from README (latency, cost, accuracy)
- [ ] Comprehensive monitoring and alerting
- [ ] Proper security practices implemented
- [ ] Complete documentation for maintenance

### Testing
- [ ] End-to-end production testing
- [ ] Load testing to verify performance targets
- [ ] Security testing and vulnerability scanning
- [ ] Cost verification against budget targets

---

## 📊 Success Metrics Validation

After Phase 6, validate against your original success metrics:

| Metric | Target | Validation Method |
|--------|--------|------------------|
| 💸 **Monthly infra cost** | ≤ USD 10 for 100h video | Monitor actual costs for 1 month |
| ⏱️ **End-to-end latency** | ≤ 2s P95 on one-sentence questions | Load testing with monitoring |
| 📈 **Answer correctness** | ≥ 80% "acceptable" | Manual evaluation with test questions |
| 🆕 **New video availability** | Available within minutes after trigger | End-to-end timing tests |

---

## 🎯 Risk Mitigation Strategy

- **YouTube caption accuracy**: Implement Whisper fallback early in Phase 2
- **Pinecone RU limits**: Monitor usage closely, plan upgrade path
- **AssemblyAI credits**: Set up OpenAI Whisper as backup in Phase 2
- **Cost overruns**: Implement monitoring and alerts in Phase 1

---

## 🔄 Iteration & Feedback

After each phase:
1. **Review and Test**: Validate all success criteria
2. **User Feedback**: Test with real jump training questions
3. **Performance Check**: Measure against targets
4. **Adjust Plan**: Modify subsequent phases based on learnings

This plan balances rapid progress with thorough validation, ensuring each component works reliably before adding complexity.
