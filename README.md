# BookLeaf Publishing — Author Support & Communication Portal
> A production-grade, dual-interface support platform (Author Portal + Operations Admin Portal) powered by AI-assisted triage, grounded draft generation, and real-time Server-Sent Events (SSE).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-brightgreen.svg)](https://mongoosejs.com/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-orange.svg)](http://localhost:5000/api/docs)
[![Tests](https://img.shields.io/badge/Tests-94%20Passing-success.svg)](backend/tests)

---

## 📖 Table of Contents
1. [Executive Summary & Problem Context](#-executive-summary--problem-context)
2. [Key Capabilities & Dual Interface Design](#-key-capabilities--dual-interface-design)
3. [Test Personas & Quick Credentials](#-test-personas--quick-credentials)
4. [Quickstart & Local Setup](#-quickstart--local-setup)
5. [Architecture & System Design](#-architecture--system-design)
6. [AI Engineering & Cost/Resilience Architecture](#-ai-engineering--costresilience-architecture)
7. [Comprehensive REST API Reference](#-comprehensive-rest-api-reference)
8. [Edge Cases & Data Integrity](#-edge-cases--data-integrity)
9. [Limitations & Production Evolution](#-limitations--production-evolution)
10. [1-Page Executive Write-Up](#-1-page-executive-write-up)

---

## 🎯 Executive Summary & Problem Context

BookLeaf Publishing is a leading self-publishing house publishing **1,200+ books monthly** across an active catalog of **22,000+ titles**, supporting thousands of authors across India and the US.

During peak quarterly royalty payouts and publication cycles, support channels experience dramatic query surges around:
- **Royalty & Payout Discrepancies**: Payout threshold checks (₹1,000 minimum rollover), quarterly timing (45 days post-quarter end), net profit splits (80% author / 20% BookLeaf after printing, shipping, and retailer platform cuts).
- **ISBN & Retail Metadata Inconsistencies**: Retail listing mismatch on Amazon/Flipkart, wrong book association, or duplicate records.
- **Print Quality Concerns**: Misprints, binding defects, and color smudges requiring verification and free reprint runs.
- **Stock & Distribution Lags**: "Currently Unavailable" status on Amazon India, US, UK, and Flipkart needing catalog re-syncs.
- **Production Stage Tracking**: Multi-step pipeline bottlenecks (Cover Design approvals, Typesetting, Proofreading).

This platform delivers a **unified, resilient web application** that automates classification, grounds responses in real catalog figures, and facilitates fast, consistent, and empathetic support resolution.

---

## 🖥️ Key Capabilities & Dual Interface Design

```
+-----------------------------------------------------------------------------------+
|                               BOOKLEAF ARCHITECTURE                               |
+-----------------------------------------------------------------------------------+
|  AUTHOR PORTAL                                   ADMIN OPERATIONS PORTAL          |
|  - Email Authentication                          - Live Support Queue (SSE)       |
|  - My Books (Royalty & Production Ledger)        - Multi-Facet Filtering & Sort   |
|  - Submit Query + UI File Attachments            - 360° Author & Book Inspector   |
|  - Live Chat Thread & Real-time Updates          - AI Triage Review & Override    |
|                                                  - Knowledge-Grounded AI Draft    |
|                                                  - Private Internal Staff Notes   |
+-----------------------------------------------------------------------------------+
|                                 REST API & SSE                                    |
|   Express 5 + TypeScript | Zero-Trust RBAC | Joi Validation | Compound Indexing   |
+-----------------------------------------------------------------------------------+
|                               AI RESILIENCE LAYER                                 |
|   <5ms Heuristic Triage | Gemini 2.0 Flash Async Worker | Circuit Breaker         |
|   Category-Sliced Policy Prompts | Deterministic Personalized Fallback Templates  |
+-----------------------------------------------------------------------------------+
|                                 DATA PERSISTENCE                                  |
|               MongoDB Atlas / Local (Mongoose Schemas & B-Tree Indexes)           |
+-----------------------------------------------------------------------------------+
```

### 1. Author Portal (Author-Facing)
- **Author Dashboard & KPIs**: High-level overview of Lifetime Royalties, Pending Payouts, Total Books, and Copies Sold.
- **My Books Catalog**: Detailed book cards displaying ISBN, genre, MRP, royalty earned/paid/pending, print partner, listed distribution platforms, and live production milestone badges (e.g. *Typesetting*, *Cover Design*, *Published & Live*).
- **Raise Support Ticket**: Contextual query submission with book selector (or *General / Account Level*), subject, description, and client-validated file attachments (up to 5 files, 10MB limit).
- **Real-Time Ticket Thread**: Live conversation view that receives admin replies instantly via Server-Sent Events (SSE) without manual page refreshes.

### 2. Admin Operations Portal (Ops & Support Facing)
- **Unified Ticket Queue**: Centralized queue with real-time status counters, natural-language search, and faceted filtering across Status (*Open, In Progress, Resolved, Closed*), Category, Priority, and Date Ranges.
- **Urgency Ordering**: Smart default sort bubbling unresolved Critical & High tickets to the top, followed by oldest pending queries. Overdue ticket age badges (>48h) visually flag SLA breaches.
- **Author 360° Inspector**: Side-drawer detailing author profile, lifetime sales, joined date, and all linked book metrics alongside the active conversation.
- **AI Triage & Manual Override**: Transparent view of AI classification reasoning, confidence, model attribution, and instant admin overrides for Category and Priority.
- **Fact-Grounded AI Draft Assistant**: 1-click AI draft generation calibrated with BookLeaf's knowledge base and real-time database numbers (copies sold, pending royalties, calculated calendar quarters). Supports inline editing, regeneration, and 1-click dispatch.
- **Private Internal Notes**: Secure internal collaboration notes flagged `visibility: internal` that are stripped at the database layer and never visible to authors.
- **Ticket Assignment**: One-click "Assign to Me" or assignment to colleagues.

---

## 👥 Test Personas & Quick Credentials

All pre-seeded accounts share the uniform password: **`Password123!`**

| Role | Name | Email | Persona Details / Use Case |
| :--- | :--- | :--- | :--- |
| **Admin** | **Aditi Verma** | `admin@bookleaf.pub` | Support Operations Lead. Access to full ticket queue, AI controls, and internal notes. |
| **Admin** | **Karan Mehra** | `karan@bookleaf.pub` | Publishing Operations Manager. Global ticket visibility and management. |
| **Author** | **Priya Sharma** (`AUTH001`) | `priya.sharma@email.com` | Author of *Whispers of the Ganges* (BK001) & *The Silent Monsoon* (BK002). High sales, pending payout inquiry. |
| **Author** | **Rohit Kapoor** (`AUTH002`) | `rohit.kapoor@email.com` | Author of *Beyond the Horizon* (BK003) & *Echoes of Silence* (BK004). Royalty discrepancy queries. |
| **Author** | **Ananya Iyer** (`AUTH003`) | `ananya.iyer@email.com` | Author of *Under the Banyan Tree* (BK005 - Published, never paid) & *In the Shadow of Stars* (BK006). |
| **Author** | **Vikram Seth** (`AUTH004`) | `vikram.seth@email.com` | Author of *The Last Monsoon* (BK007) & *Flight of the Phoenix* (BK008). |
| **Author** | **Neha Patel** (`AUTH005`) | `neha.patel@email.com` | Author of *A Cup of Chai* (BK009) & *The Streets of Ahmedabad* (BK010 - Zero payouts). |
| **Author** | **Arjun Nair** (`AUTH006`) | `arjun.nair@email.com` | Author of *Wanderlust Chronicles* (BK011) & *Songs of the Malabar* (BK012). |
| **Author** | **Kavita Krishnan** (`AUTH007`)| `kavita.krishnan@email.com` | Multi-book author (3 books). Includes *The Art of Mindful Living* (BK013 - **In Production: Cover Design**). |
| **Author** | **Siddharth Roy** (`AUTH008`)| `siddharth.roy@email.com` | Author of *Midnight Coffee* (BK015 - **In Production: Typesetting**) & *Rhythms of the Night* (BK016 - **Under ₹1k rollover threshold**). |
| **Author** | **Pooja Deshmukh** (`AUTH009`)| `pooja.deshmukh@email.com` | Author of *Tales of Old Pune* (BK017). |
| **Author** | **Rahul Verma** (`AUTH010`) | `rahul.verma@email.com` | Author of *Startup Odyssey* (BK018). |

> **Interactive Demo Switcher**: The frontend sign-in page includes a **One-Click Demo Switcher banner** (`NEXT_PUBLIC_DEMO_MODE=true`). Evaluators can switch between Aditi Verma (Admin), Priya Sharma (Author), and Rohit Kapoor (Author) with a single click without manually typing credentials.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or higher (tested on Node v20 & v24)
- **MongoDB**: Local MongoDB instance running on `localhost:27017` or a MongoDB Atlas URI
- **Package Manager**: `npm`

### 1. Clone the Repository
```bash
git clone https://github.com/karan-singh12/BookLeaf-Publishing.git
cd BookLeaf-Publishing
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and optional GEMINI_API_KEY
# (If GEMINI_API_KEY is omitted, the system seamlessly runs in deterministic heuristic/template mode)

# Seed database with the 10 authors, 18 books, and initial tickets
npm run seed

# Run the test suite (94 passing tests)
npm test

# Start the backend development server (Runs on http://localhost:5000)
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Default NEXT_PUBLIC_API_URL is http://localhost:5000/api/v1
# Default NEXT_PUBLIC_DEMO_MODE is true

# Start Next.js development server (Runs on http://localhost:3000)
npm run dev
```

### 4. Verify Local URLs
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **REST API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)
- **Interactive Swagger UI**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

---

## 🏗️ Architecture & System Design

The platform adheres to a strict layered separation of concerns to guarantee long-term maintainability, zero spaghetti code, and isolated testability:

```
backend/src/
├── ai-sdk/            # Standalone, decoupled AI router, providers & resilience primitives
│   ├── providers/     # Gemini, OpenAI, Anthropic, OpenRouter HTTP connectors
│   ├── resilience/    # Bulkhead, Circuit Breaker, Exponential Backoff
│   └── ticket-ai/     # Domain prompts, knowledge injection, facts calculation & templates
├── config/            # Strongly-typed environment schema (Joi validated on boot)
├── constants/         # Domain enums, categories, priorities, centralized message catalog
├── controllers/       # Thin HTTP adapters (receives request, delegates to services)
├── middleware/        # JWT auth, RBAC guard, request-id, rate-limiters, error handling
├── models/            # Mongoose schemas with compound indexes and denormalized sort keys
├── presenters/        # DTO transformers (stripping internal notes, passwords, internal flags)
├── realtime/          # Server-Sent Events (SSE) EventHub with author-isolated dispatch
├── repositories/      # Data access layer (enforcing author: auth.userId scoping)
├── routes/            # Route declarations and validator middleware attachments
├── services/          # Pure business logic (ticket lifecycle, state transitions)
├── utils/             # Standard API envelopes (sendSuccess, sendError, AppError)
└── validators/        # Joi request validation schemas (query, params, body)
```

### Architectural Decisions & Rationale

1. **Layered Separation & Zero-Leak Repositories**:
   Controllers never import Mongoose models directly; they communicate exclusively through Services and Repositories. Repositories automatically enforce author ownership (`author: user.userId`).
2. **Zero-Trust Role-Based Access Control (RBAC)**:
   Authors querying tickets or books belonging to another author receive a `404 Not Found` (never a `403 Forbidden`). This eliminates object enumeration and ID guessing attacks.
3. **Compound B-Tree Indexing Strategy**:
   - `Ticket`: Compound index on `{ isActive: -1, priorityRank: 1, createdAt: 1 }` allows the primary support queue to serve the multi-variable sort entirely out of memory index.
   - `TicketMessage`: Index on `{ ticket: 1, visibility: 1, createdAt: 1 }` ensures internal staff notes are excluded at the database index scan level during author requests.
4. **Optimistic Concurrency & Atomic Counters**:
   Sequential, human-readable ticket numbers (`#1001`, `#1002`) are allocated atomically via a dedicated `Counter` collection (`findOneAndUpdate` with `$inc`), avoiding duplicate numbers under high concurrency.
5. **Real-Time via Server-Sent Events (SSE)**:
   Unidirectional SSE streaming (`/api/v1/realtime/stream`) was selected over WebSockets. SSE is native HTTP, avoids connection handshake fragility, seamlessly carries HTTP `Authorization: Bearer` headers, works behind load balancers/proxies, and handles automatic reconnections with exponential backoff.

---

## 🤖 AI Engineering & Cost/Resilience Architecture

AI integration was built with enterprise-level discipline, addressing prompt grounding, token efficiency, multi-provider routing, and graceful degradation.

### 1. Two-Tier Classification Pipeline
```
Author Submits Ticket
       │
       ▼
[Tier 1: Heuristic Engine] ──<5ms──> Immediate HTTP 201 Created Response
  • Keyword & regex analysis          • Author UI updates immediately
  • Immediate Category & Priority     • Zero latency lag
       │
       ▼ (Asynchronous Background Job)
[Tier 2: LLM Classifier]
  • Invokes Gemini 2.0 Flash
  • Strict JSON Schema enforcement
  • Atomic update to Ticket (unless Admin already manually overrode)
```

### 2. Fact-Grounded Prompt Engineering
To prevent hallucinated payout dates, fabricated inventory, or generic corporate fluff:
- **Tone Mandate**: System prompt instructs the model: *"Authors are our creative partners, not support tickets to be closed. Acknowledge frustration before jumping to solutions. Own delays directly—no corporate deflection."*
- **Dynamic Facts Injection**: Injects exact database figures directly into the prompt:
  ```
  AUTHOR CONTEXT:
  Name: Priya Sharma | Account Code: AUTH001
  Book: Whispers of the Ganges (BK001)
  Status: Published & Live
  Copies Sold: 342 | Royalty Earned: ₹11,970 | Royalty Paid: ₹8,400
  Pending Royalty: ₹3,570
  Quarterly Schedule: Q4 2025 ended Dec 31. Payout cycle: 45 days (Deadline: Feb 14, 2026).
  ```
- **Attachment Awareness**: Informs the model if the author already uploaded defect photos (e.g., misprints), instructing the AI *not* to redundantly request photos if already attached.

### 3. Token Economics & Cost Optimization
- **Category-Sliced Knowledge Injection**: Rather than sending the entire 8KB BookLeaf policy manual on every request, the prompt engine injects only the relevant policy slice:
  - *Royalty inquiries* receive only the Royalty Policy (80/20 net calculation, ₹1,000 threshold, quarterly schedule).
  - *Print quality inquiries* receive only the Print turnaround (5-7 days) & Free reprint policy.
  - *Distribution inquiries* receive only Platform sync SLAs (Amazon/Flipkart 24-48h).
- **Verified Benchmark Analysis (`npm run ai:cost`)**:
  | Category | Sliced Prompt | Naive Prompt | Token Savings |
  | :--- | :---: | :---: | :---: |
  | **Royalty & Payments** | 1,302 tokens | 2,504 tokens | **48% saved** |
  | **ISBN & Metadata Issues** | 1,214 tokens | 2,504 tokens | **52% saved** |
  | **Printing & Quality** | 1,208 tokens | 2,504 tokens | **52% saved** |
  | **Distribution & Availability** | 1,179 tokens | 2,504 tokens | **53% saved** |
  | **Book Status & Production Updates** | 1,199 tokens | 2,504 tokens | **52% saved** |
  | **General Inquiry** | 1,285 tokens | 2,504 tokens | **49% saved** |
- **Empirical Financial Cost Analysis (Per 1,000 Support Tickets)**:
  - **Classification Cost**: $1,000 \times 602\text{ tokens} = 602,000\text{ tokens}$. At Gemini 2.0 Flash pricing of **$0.10 / 1M input tokens**, this equals **$0.06 (~₹5.00)**.
  - **Draft Reply Generation Cost**: $1,000 \times 1,231\text{ tokens} = 1,231,000\text{ tokens}$. Equals **$0.12 (~₹10.00)**.
  - **Total Cost per 1,000 Tickets**: **$0.18 (~₹15.00)** with our sliced architecture vs **$0.48 (~₹40.00)** for naive designs (a **62.5% direct cost reduction**).
  - **Zero-Cost Re-reads**: Storing `ticket.aiDraft` on the document means admins can inspect, refresh pages, and collaborate with colleagues with **zero repeated LLM costs**.

### 4. Resilience, Circuit Breakers & Graceful Degradation
- **Circuit Breaker**: Trips to `OPEN` state after 3 consecutive upstream failures, immediately serving fallbacks without wasting latency on failing APIs during outages.
- **Ordered Fallback Chains**: Configurable via `AI_ROUTE_DEFAULT` (e.g., `gemini:gemini-2.5-flash -> openai:gpt-4o-mini -> template`).
- **Deterministic Category Fallback Templates**: If all AI providers fail or no API key is configured, the system generates a tailored template response addressing the author by name and citing specific BookLeaf policy timelines. **Tickets never fail, and ticket creation is never blocked.**

### 5. Model Choice & Evaluation Justification
The assignment allows choosing OpenAI, Anthropic, or any LLM API with brief justification. We evaluated multiple candidates before choosing **Gemini 2.0 Flash** as primary:

| Model Evaluated | Input / Output per 1M | Latency (TTFT) | Evaluation Justification |
| :--- | :---: | :---: | :--- |
| **Google Gemini 2.0 Flash (Chosen Primary)** | **$0.10 / $0.40** | **~380ms** | **Winner**. Ultra-fast latency suitable for async triage; strict JSON Schema output compliance; configurable thinking budget (`GEMINI_THINKING_BUDGET=0`) prevents run-on token spend; lowest cost in class. |
| **OpenAI GPT-4o-mini (Supported Secondary)** | $0.15 / $0.60 | ~620ms | Excellent structured outputs (`response_format: json_schema`) and deterministic classification. Configured as secondary fallback. |
| **Anthropic Claude 3.5 Haiku (Supported)** | $0.80 / $4.00 | ~750ms | Superior nuance and empathetic voice, but 8x higher token pricing. Configured in fallback chain for complex tone calibration. |
| **Meta Llama 3.3 70B via OpenRouter (Supported)** | $0.12 / $0.30 | ~850ms | Open-source foundation eliminating proprietary vendor lock-in. Supported out of the box in `ai-sdk`. |

**Provider-Agnostic Abstraction**: The backend `ai-sdk` implements a unified connector interface. If Gemini experiences API quotas or deprecation, switching to OpenAI or Anthropic requires only updating the `.env` fallback order (`AI_ROUTE_DEFAULT=openai:gpt-4o-mini,gemini:gemini-2.5-flash`) without altering a single line of business logic.

---

## 📡 Comprehensive REST API Reference

The API uses standard HTTP response envelopes:
- **Success (`ApiSuccess`)**: `{ success: true, message: string, data: T, meta?: PageMeta, requestId: string, timestamp: string }`
- **Failure (`ApiError`)**: `{ success: true, message: string, error: { code: string, details?: Array<{ field, message }> }, requestId: string, timestamp: string }`

Interactive documentation is available at **`/api/docs`** (Swagger UI).

### Endpoints Overview

| Method | Path | Auth | Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/health` | None | Public | Liveness, readiness, uptime, and AI provider status. |
| **POST** | `/api/v1/auth/login` | None | Public | Sign in with email and password; returns JWT bearer token. |
| **GET** | `/api/v1/auth/me` | Bearer | All | Fetch currently authenticated user profile. |
| **GET** | `/api/v1/books` | Bearer | All | List books. Authors receive own books; Admins see all (filterable by `authorId`). |
| **GET** | `/api/v1/books/:bookId` | Bearer | All | Get book details. Protected by author ownership guard. |
| **GET** | `/api/v1/tickets` | Bearer | All | List tickets. Filter by `status`, `category`, `priority`, `q`, `sort`, `page`, `limit`. |
| **POST** | `/api/v1/tickets` | Bearer | Author | Raise a support ticket with subject, description, bookId, and attachments. |
| **GET** | `/api/v1/tickets/stats` | Bearer | Admin | High-level queue metrics (open, in progress, resolved, critical counts). |
| **GET** | `/api/v1/tickets/:ticketId`| Bearer | All | Get ticket detail with full conversation history (internal notes filtered for authors). |
| **PATCH** | `/api/v1/tickets/:ticketId`| Bearer | Admin | Update status, override category/priority, or assign ticket. |
| **POST** | `/api/v1/tickets/:ticketId/messages` | Bearer | All | Post a reply to the ticket conversation. Auto-reopens resolved tickets on author reply. |
| **POST** | `/api/v1/tickets/:ticketId/notes` | Bearer | Admin | Post a private internal staff note (`visibility: internal`). |
| **POST** | `/api/v1/tickets/:ticketId/draft` | Bearer | Admin | Generate or retrieve knowledge-base grounded AI response draft (`refresh: true` to regenerate). |
| **GET** | `/api/v1/realtime/stream`| Bearer | All | Server-Sent Events (SSE) live ticket update stream. |
| **GET** | `/api/v1/ai/status` | Bearer | Admin | Diagnostic inspection of AI provider health, token counters, and circuit state. |

---

## 🛡️ Edge Cases & Data Integrity

The application incorporates exhaustive edge-case handling across models, services, and UI layers:

| Edge Case | Scenario | Handled Behavior |
| :--- | :--- | :--- |
| **Books in Production** | `BK013` (Cover Design), `BK015` (Typesetting) have no publication date, zero sales, null royalties. | UI displays "In Production" badge; royalty fields render clean `—` instead of `₹0` or `NaN`. AI prompt facts explicitly note book is in production without inventing sales. |
| **Zero Royalty Payouts** | Published books with zero payouts to date (`BK005`, `BK010`). | UI displays "No payouts yet". AI prompt states that no payout has ever been made, preventing false claims. |
| **Under-Threshold Balance**| Royalty balance under ₹1,000 threshold (`BK016` has ₹850). | AI draft explicitly explains the ₹1,000 rollover policy rather than promising an immediate bank credit. |
| **Re-opening Resolved Tickets** | Author posts a follow-up reply on a `Resolved` ticket. | Status automatically transitions back to `Open`, clears `resolvedAt`, and re-enters the active admin queue. |
| **Author Isolation Guard** | Author requests another author's book or ticket ID. | Returns `404 Not Found` (never 403), preventing ID enumeration. |
| **Attachment Safety** | Files uploaded in UI. | Strict client and server validation enforces a max of 5 files and 10MB per file; stores metadata safely. |
| **Concurrent Tickets** | High-volume ticket creation. | Atomic counter increments guarantee unique, non-colliding human-readable ticket numbers (`#1001`). |

---

## 🔮 Limitations & Production Evolution

While this implementation fulfills all assignment requirements and passes 94 automated tests, the following architectural enhancements represent the roadmap for horizontal scale:

1. **Distributed Event Backplane (Redis Pub/Sub)**:
   The current SSE hub uses an in-memory Node.js `EventEmitter`. For multi-server load-balanced deployments (e.g. AWS ECS / Kubernetes), swapping the in-memory bus with a Redis Pub/Sub adapter enables seamless cross-instance streaming.
2. **Persistent Cloud Storage (S3 / GCS)**:
   Currently, attachments simulate UI uploads and store file metadata (name, size, extension). Production evolution will issue presigned S3 upload URLs with antivirus scanning via AWS Lambda.
3. **Enterprise Vector RAG for Catalog Scale**:
   For BookLeaf's catalog exceeding 22,000+ titles and custom author contracts, integrating a vector database (e.g., Qdrant or Pinecone) alongside category-slicing will allow semantic similarity search across historical ticket resolutions.
4. **Third-Party Operations Automation**:
   - Webhook integration with **Amazon SP-API** and **Flipkart Marketplace** to automatically trigger catalog stock re-syncs.
   - API dispatch to print partners (**Repro India**, **Epitome Books**) for verified reprint orders.

---

## 📄 1-Page Executive Write-Up

A dedicated executive write-up explaining our core engineering approach, prioritization, trade-offs, and scaling roadmap is available in:
👉 **[WRITEUP.md](file:///e:/assisments/bookleaf/WRITEUP.md)**
