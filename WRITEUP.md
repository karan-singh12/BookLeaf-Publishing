# BookLeaf Publishing — Executive Architectural Write-Up
**Engineering Leadership & Design Philosophy | Author Support & Operations Portal**

---

### 1. Approach & Product Philosophy

BookLeaf Publishing scales across **22,000+ titles** and **1,200+ monthly releases**, where quarterly royalty settlements and production milestones naturally trigger spikes in author queries. Our core design philosophy rests on three non-negotiables:

1. **Authors as Creative Partners, Not Support Queue Items**: Self-published authors entrust their life’s work to BookLeaf. Support interactions must demonstrate immediate empathy, transparency regarding net calculations (80/20 splits, printing/shipping deductions), and accountable timelines (e.g., 48-hour escalations for overdue royalties or ISBN mismatches).
2. **AI as an Augmentation Co-Pilot, Never an Unsupervised Black Box**: AI should eliminate administrative fatigue for support agents, not replace human judgment. The system classifies urgency, extracts financial facts, and drafts grounded replies, while keeping human operations in control via 1-click edits, priority overrides, and manual dispatch.
3. **Resilience First (Tickets Must Never Fail)**: An author must never be greeted with a 500 error or a spinning loader because an upstream LLM API timed out, hit a rate limit, or choked on JSON formatting. The system degrades gracefully to deterministic heuristics and pre-calibrated templates.

---

### 2. What We Prioritised

* **Sub-5ms Perceived Latency with Dual-Tier Triage**:
  When an author submits a query, an instant keyword/regex heuristic engine classifies the ticket and assigns an initial priority in `<5ms`. The HTTP `201 Created` response returns immediately. An asynchronous background worker then invokes **Gemini 2.0 Flash** with structured schema outputs to enrich and refine the classification. The author never waits for an external LLM call.
* **Strict Zero-Trust RBAC & Author Data Tenancy**:
  Authors must only ever access their own books and conversations. Probing an ID belonging to another author returns a clean `404 Not Found` (never `403 Forbidden`), completely eliminating resource enumeration. Internal notes (`visibility: internal`) and AI diagnostic metrics are pruned at the database query level, preventing accidental payload leakage.
* **Fact-Grounded Prompt Engineering & Token Economics**:
  Instead of redundantly transmitting the entire BookLeaf Knowledge Base (~8KB) on every generation, we implemented **category-sliced knowledge injection**. A royalty query receives only the Royalty Policy (80/20 split, ₹1,000 threshold, 45-day cycle) alongside live database financials (copies sold, pending royalties, calculated calendar quarters). Benchmarked via `npm run ai:cost`: classification prompt is **74% smaller** (602 vs 2,292 tokens), and draft prompts are **51% smaller** (1,231 vs 2,504 tokens), slashing API costs to just **$0.18 (~₹15) per 1,000 queries**. Stored `ticket.aiDraft` ensures zero repeat costs on ticket views.
* **Model Choice Justification**:
  Selected **Gemini 2.5 / 2.0 Flash** as primary for sub-400ms time-to-first-token, industry-lowest pricing ($0.10/M input), native structured JSON Schema enforcement, and zero-token thinking controls (`GEMINI_THINKING_BUDGET=0`). Supported via a unified, provider-agnostic router with an active 3-tier fallback chain: Gemini ➔ Grok ➔ OpenRouter (Meta Llama 3.3 70B free) ➔ Deterministic Templates.
* **Production-Grade Resilience & Circuit Breaking**:
  Integrated a 3-strike circuit breaker with exponential backoff and ordered fallback chains (Gemini 2.5 Flash → Grok → OpenRouter → deterministic category templates). If all LLM providers fail or rate-limit, a personalised template is generated without interruption, and the admin queue transparently highlights the fallback source.
* **Real-Time Sync via Server-Sent Events (SSE)**:
  Implemented unidirectional HTTP streaming (`/api/v1/realtime/stream`) with author-scoped event dispatching, automatic reconnection, heartbeat pings (25s), and browser tab isolation.

---

### 3. Strategic Trade-offs Made

| Decision | Chosen Approach | Alternative Considered | Rationale & Trade-off |
| :--- | :--- | :--- | :--- |
| **Real-time Protocol** | **Server-Sent Events (SSE)** | WebSockets (WS) | SSE operates over standard HTTP, traverses corporate firewalls/proxies without custom handshakes, supports native HTTP bearer authentication headers, and avoids duplex state overhead. Trade-off: SSE is server-to-client only; client messages use standard REST POST endpoints. |
| **Knowledge Grounding** | **Category-Sliced Injection** | Vector Embeddings (RAG) | For BookLeaf's curated 7-page policy manual, vector chunking and vector databases (Pinecone/Milvus) introduce indexing latency, embedding costs, and retrieval nondeterminism. Rule-based slicing is deterministic, delivers 0ms retrieval overhead, guarantees 100% relevant context, and avoids external vector infrastructure. |
| **Message Broker** | **In-Memory EventHub** | Redis Pub/Sub | For this single-service architecture, an in-process EventEmitter avoids external infrastructure dependencies during evaluation. Trade-off: Cross-instance scaling requires swapping the hub with a Redis pub/sub adapter. |
| **File Attachments** | **Metadata Simulation** | S3 / GCS Presigned URLs | The assignment brief marked file upload as UI-only/bonus. We validated file name, extensions, and a 10MB size cap on client and server while storing structured metadata, conserving cloud storage costs while validating the full schema flow. |

---

### 4. How We Would Evolve This into an Enterprise Production System

1. **Distributed Event Backplane (Redis Pub/Sub & BullMQ)**:
   Extract background AI classification and drafting tasks into a dedicated **BullMQ** worker queue backed by Redis with dead-letter retries. Replace the in-memory SSE hub with Redis Pub/Sub to support horizontal scaling across multi-region Kubernetes clusters.
2. **Hybrid Semantic RAG for Historical Resolves**:
   Index thousands of previously resolved author tickets using vector embeddings (Qdrant or pgvector). When an author submits a nuanced edge-case query, the AI draft engine retrieves top-3 historically approved admin resolutions for stylistic alignment and consistency.
3. **Automated Operational Webhook Integrations**:
   - **Distribution Sync**: Connect tickets classified under *Distribution & Availability* directly to Amazon SP-API and Flipkart Marketplace APIs to automatically trigger catalog re-syncs.
   - **Reprint Dispatch**: Connect *Printing & Quality* tickets (with verified photo attachments) to Repro India / Epitome Books API to initiate free reprint runs upon admin one-click approval.
4. **Human-in-the-Loop RLHF & Edit-Distance Telemetry**:
   Track the Levenshtein edit distance between the AI-generated draft and the final message sent by the admin. Calculate agent time saved, highlight frequently edited phrasing, and continuously fine-tune system prompts.
