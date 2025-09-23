# JumpCoach AI - Testing Strategy

*Comprehensive testing approach for each implementation phase*

---

## 🎯 Testing Philosophy

Our testing strategy follows the **"Test Early, Test Often"** principle with:
- **Unit tests** for individual components
- **Integration tests** for service interactions  
- **End-to-end tests** for user workflows
- **Performance tests** against success metrics
- **Manual validation** for AI/content quality

---

## 📋 Phase-by-Phase Testing Approach

### Phase 0: Foundation & Setup
**Testing Focus: Environment & Configuration**

#### Automated Tests
```bash
# Environment validation script
./scripts/validate-env.sh
```

#### Manual Verification
- [ ] **API Connectivity Test**
  - Test each API key with a simple request
  - Verify rate limits and quotas
  - Document any setup issues

- [ ] **CLI Tools Test**
  - `wrangler whoami` - Cloudflare auth
  - `gcloud auth list` - GCP auth
  - Node/npm versions match requirements

#### Success Criteria
✅ All APIs respond successfully  
✅ Development tools functional  
✅ Project structure follows standards  

---

### Phase 1: Basic Storage & Ingestion  
**Testing Focus: Data Flow & Storage**

#### Unit Tests
```javascript
// tests/ingestion-worker/youtube-api.test.js
describe('YouTube API Integration', () => {
  test('extracts video metadata correctly', async () => {
    const videoId = 'SAMPLE_VIDEO_ID';
    const metadata = await extractVideoMetadata(videoId);
    expect(metadata).toHaveProperty('title');
    expect(metadata).toHaveProperty('duration');
  });
});
```

#### Integration Tests
```javascript
// tests/integration/r2-storage.test.js
describe('R2 Storage Integration', () => {
  test('stores and retrieves video metadata', async () => {
    const testMetadata = { videoId: 'test', title: 'Test Video' };
    await storeVideoMetadata(testMetadata);
    const retrieved = await getVideoMetadata('test');
    expect(retrieved).toEqual(testMetadata);
  });
});
```

#### Manual Testing Protocol
1. **Test Video Selection**
   - Use 3 specific THP videos (short, medium, long)
   - Include edge cases: special characters, very long titles

2. **Ingestion Testing**
   ```bash
   # Trigger ingestion for test videos
   curl -X POST "https://your-worker.workers.dev/ingest" \
     -d '{"videoIds": ["VIDEO_ID_1", "VIDEO_ID_2"]}'
   ```

3. **Storage Validation**
   - Check R2 bucket structure matches design
   - Verify `processed_videos.json` format
   - Test duplicate detection with same video

#### Performance Tests
- [ ] Measure ingestion latency for 10 videos
- [ ] Test concurrent ingestion requests  
- [ ] Verify R2 storage costs align with estimates

---

### Phase 2: Video Processing & STT
**Testing Focus: Content Quality & Accuracy**

#### Unit Tests
```javascript
// tests/transcription/caption-parser.test.js
describe('Caption Parser', () => {
  test('parses VTT format correctly', () => {
    const vttContent = `WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello world`;
    const parsed = parseVTT(vttContent);
    expect(parsed[0]).toEqual({
      start: 1000,
      end: 3000, 
      text: 'Hello world'
    });
  });
});
```

#### Integration Tests
```javascript
// tests/integration/assembly-ai.test.js
describe('AssemblyAI Integration', () => {
  test('transcribes audio with timestamps', async () => {
    const audioUrl = 'https://test-audio-url.com/sample.mp3';
    const transcript = await transcribeAudio(audioUrl);
    expect(transcript).toHaveProperty('words');
    expect(transcript.words[0]).toHaveProperty('start');
  });
}, 30000); // Long timeout for STT
```

#### Content Quality Tests
1. **Caption Accuracy Validation**
   - Select 5 videos with known good captions
   - Manually verify extracted timestamps
   - Check for formatting issues

2. **STT Quality Assessment**
   - Test with 3 videos requiring STT
   - Compare STT output to manual transcription
   - Measure word error rate (target <10%)

3. **Speaker Detection Test**
   - Test with videos containing multiple speakers
   - Verify speaker labels are preserved

#### Performance Tests  
- [ ] STT processing time vs video length
- [ ] Cost tracking for STT usage
- [ ] Error handling for failed transcriptions

---

### Phase 3: Embedding & Vector Storage
**Testing Focus: Search Quality & Vector Operations**

#### Unit Tests
```javascript
// tests/embedding/chunker.test.js
describe('Text Chunker', () => {
  test('creates 400-token chunks with 60-token overlap', () => {
    const longText = 'A'.repeat(2000); // ~500 tokens
    const chunks = chunkText(longText, 400, 60);
    expect(chunks).toHaveLength(2);
    expect(getTokenCount(chunks[0])).toBeLessThanOrEqual(400);
  });
});
```

#### Integration Tests
```javascript  
// tests/integration/pinecone.test.js
describe('Pinecone Integration', () => {
  test('upserts and queries vectors correctly', async () => {
    const testVector = {
      id: 'test-chunk-1',
      values: new Array(384).fill(0.1), // 384d vector
      metadata: { videoId: 'test', timestamp: 60 }
    };
    
    await upsertVector(testVector);
    const results = await queryVector(testVector.values, 1);
    expect(results[0].id).toBe('test-chunk-1');
  });
});
```

#### Semantic Search Quality Tests
1. **Similarity Search Validation**
   ```javascript
   // Test queries with expected results
   const testCases = [
     { query: "knee valgus", expectedVideoId: "THP_KNEE_VIDEO" },
     { query: "single leg jump", expectedVideoId: "THP_JUMP_VIDEO" }
   ];
   ```

2. **Embedding Quality Check**
   - Generate embeddings for duplicate content
   - Verify high similarity scores (>0.9)
   - Test with paraphrased content (similarity 0.7-0.9)

3. **Metadata Filtering Test**
   - Filter by speaker (Isaiah vs John)
   - Filter by video type (shorts vs long-form)
   - Filter by date ranges

#### Performance Tests
- [ ] Embedding generation rate (tokens/second)
- [ ] Pinecone query latency (target <500ms)
- [ ] Batch processing throughput

---

### Phase 4: RAG & LLM Integration  
**Testing Focus: Answer Quality & Relevance**

#### Unit Tests
```javascript
// tests/rag/prompt-builder.test.js
describe('Prompt Builder', () => {
  test('constructs context-aware prompts', () => {
    const context = [{ text: "Knee valgus occurs...", source: "video1" }];
    const question = "How do I fix knee valgus?";
    const prompt = buildPrompt(question, context);
    expect(prompt).toContain("Based on the following training content");
    expect(prompt).toContain("knee valgus occurs");
  });
});
```

#### Integration Tests
```javascript
// tests/integration/openai.test.js  
describe('OpenAI Integration', () => {
  test('generates relevant responses with citations', async () => {
    const question = "What causes knee valgus in jumping?";
    const response = await generateResponse(question);
    expect(response).toHaveProperty('answer');
    expect(response).toHaveProperty('sources');
    expect(response.sources).toBeInstanceOf(Array);
  });
});
```

#### Answer Quality Evaluation
1. **User Story Validation**
   ```javascript
   const userStoryTests = [
     {
       story: "U1: Novice athlete asks about knee-valgus",
       question: "How do I fix knee-valgus on take-off?",
       expectedElements: ["step-by-step", "cues", "THP content"]
     },
     {
       story: "U2: Coach requests drill compilation", 
       question: "Show all single-leg jump drills from Isaiah",
       expectedElements: ["multiple drills", "Isaiah", "exercise names"]
     }
   ];
   ```

2. **Citation Accuracy Test**
   - Verify source URLs point to correct videos
   - Check timestamp accuracy (±5 seconds tolerance)
   - Ensure citations support the claims made

3. **Response Relevance Scoring**
   - Manual evaluation of 50 Q&A pairs
   - Rate each response 1-5 for relevance
   - Target: 80% rated 4+ (acceptable)

#### Performance Tests
- [ ] Response latency (target <2s P95)
- [ ] Streaming response quality
- [ ] Concurrent query handling

---

### Phase 5: Frontend & User Experience
**Testing Focus: User Interaction & UI/UX**

#### Unit Tests
```javascript
// tests/frontend/chat.test.tsx
describe('Chat Component', () => {
  test('displays streaming messages correctly', () => {
    const { getByText } = render(<ChatComponent />);
    // Test streaming message updates
  });
});
```

#### Integration Tests  
```javascript
// tests/integration/api-frontend.test.js
describe('Frontend-API Integration', () => {
  test('chat messages flow end-to-end', async () => {
    // Submit question
    // Verify streaming response
    // Check source links
  });
});
```

#### User Experience Testing
1. **User Journey Tests**
   - Complete each user story end-to-end
   - Time each interaction
   - Note any friction points

2. **Cross-Browser Testing**
   - Chrome, Firefox, Safari, Edge  
   - Mobile browsers (iOS Safari, Android Chrome)
   - Responsive design validation

3. **Accessibility Testing**
   - Screen reader compatibility
   - Keyboard navigation
   - Color contrast validation
   - WCAG 2.1 AA compliance

#### Performance Tests
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s  
- [ ] Streaming response smoothness
- [ ] Mobile performance on 3G

---

### Phase 6: Production & Optimization
**Testing Focus: Production Readiness & Scale**

#### Load Testing
```bash
# API load testing with k6
k6 run --vus 50 --duration 5m load-test-chat.js
```

#### Security Testing  
```bash
# Security scan with OWASP ZAP
zap-baseline.py -t https://your-app.com
```

#### Production Validation
1. **End-to-End Production Test**
   - Full user journey in production environment
   - Test manual triggers work correctly
   - Verify monitoring and alerts

2. **Cost Validation**
   - Monitor actual costs for 1 week
   - Project monthly costs based on usage
   - Compare to budget targets

3. **Success Metrics Validation**
   | Metric | Test Method | Pass Criteria |
   |--------|-------------|---------------|
   | Cost | Monitor production usage | <$10/100h video |  
   | Latency | Load test P95 | <2s response time |
   | Accuracy | Manual Q&A evaluation | >80% acceptable |
   | Availability | Manual trigger test | <2min video availability |

---

## 🛠️ Testing Infrastructure

### Automated Test Execution
```bash
# Run all tests
npm run test:all

# Phase-specific testing  
npm run test:phase1
npm run test:integration
npm run test:e2e
```

### Test Data Management
- **Test Videos**: Curated set of 10 THP videos for consistent testing
- **Golden Responses**: Pre-approved Q&A pairs for regression testing
- **Performance Baselines**: Historical metrics for comparison

### Continuous Testing
- **Pre-deployment**: All tests must pass before deployment
- **Post-deployment**: Smoke tests verify production functionality
- **Regression**: Weekly full test suite execution

---

## 📊 Testing Metrics & Reporting

### Key Testing KPIs
- **Test Coverage**: >80% code coverage for all components
- **Pass Rate**: >95% automated tests passing
- **Response Quality**: >80% manual evaluation "acceptable" 
- **Performance**: All targets met in load testing

### Test Reporting
- Daily automated test results dashboard
- Weekly performance trends report
- Monthly quality assessment summary
- Post-deployment validation report

This comprehensive testing strategy ensures each phase delivers reliable, high-quality functionality while building toward your success metrics.
