# CyberPlus System Scalability & Architectural Audit Report

## Executive Summary
This report provides a comprehensive future-scalability evaluation of the CyberPlus platform architecture across both client-side React frontend (`src/store/useAppStore.ts`, `src/App.tsx`, view components) and Express backend server (`server.ts`, `src/server/agent.ts`, `src/server/pdf-ai.ts`).

---

## 1. Core Technical Categories Audit

### 1. Database Bottlenecks
- **Current State:** The application operates without a persistent database layer (PostgreSQL, MongoDB, or Firestore).
  - Client state (Customers, Service Tickets, Print Jobs, Staff, Transactions, Notifications, Documents, Prompts, Assets) lives entirely in browser memory managed by `useAppStore.ts`.
  - Backend state (In-memory caches, rate limit trackers, offline node logs) lives in Node.js process memory (`Map` instances).
- **Bottlenecks & Architectural Risks:**
  - **Single-Node Lock:** Multiple server instances cannot share state or caches without an external distributed store (e.g., Redis).
  - **Data Volatility:** Server restarts or worker crashes wipe all cached media streams and rate limits; browser refreshes erase active user state unless saved locally or re-fetched.
  - **Concurrency & Race Conditions:** Concurrent updates to tickets or queues across multiple attendants will suffer from race conditions without ACID transactional locks or optimistic concurrency controls.

### 2. Slow Queries & Unindexed Array Searches
- **Current State:** Data querying occurs in-memory via JavaScript array methods (`filter()`, `map()`, `find()`, `reduce()`) in React components and `useAppStore.ts`.
- **Bottlenecks & Architectural Risks:**
  - `serviceTickets.find(...)` and `notifications.filter(...)` run on every render or state dispatch.
  - Linear $O(N)$ lookup time per query. As customer, transaction, and ticket lists grow into thousands of records, searching and filtering block the single-threaded React UI loop, causing UI jank and typing latency.

### 3. Repeated Rendering & State Granularity
- **Current State:** `useAppStore` returns a single, monolithic object containing all application state and action callbacks.
- **Bottlenecks & Architectural Risks:**
  - Any state change (e.g., typing a character in AI Chat, incrementing a prompt, or ticking a notification) triggers a re-render of `App.tsx` and all active view components listening to `useAppStore()`.
  - Lack of atomic state slices, Zustand selectors, or `React.memo` wrappers across table components (`CustomerView`, `FinanceView`, `ServicesView`).
  - Tables and queue lists render all DOM items at once without list virtualization (`react-window` or `@tanstack/react-virtual`).

### 4. Expensive Loops & Synchronous CPU Iterations
- **Current State:**
  - Backend Cheerio scraping (`/api/scrape-exams` in `server.ts`) iterates over all DOM `a[href]` links, running string lower-casing and regex pattern matches sequentially.
  - Image manipulation in `src/server/agent.ts` uses Sharp synchronously in the request handler (`sharp(imgBuffer).resize(600, 600)`).
  - Document & PDF editing in `src/server/pdf-ai.ts` performs full-text regex string replacements (`fullText.replace(...)`) and HTML formatting on raw buffers.

### 5. Unnecessary API Requests & Unbatched Calls
- **Current State:**
  - YouTube media extraction in `server.ts` executes parallel racing pools (`Cobalt`, `Invidious`, `Piped`), spawning 8 to 14 outbound HTTP connections per search or stream request.
  - Active node list endpoints (`https://api.invidious.io/instances.json` and `https://piped-instances.pages.dev/data.json`) are fetched periodically on cache expiry without outbound HTTP request batching or fallback circuit breakers.
  - Pollinations AI image generation queries trigger fresh external fetches per prompt without debouncing or client-side request deduplication.

### 6. Caching Opportunities
- **Current State:**
  - `extractionCache` in `server.ts` is bounded to 500 items with a 1-hour TTL in Node memory.
  - `pdfExtractionCache` is bounded to 100 items with a 24-hour TTL in Node memory.
- **Opportunities:**
  - **Distributed Caching:** Replace Node memory maps with a centralized Redis instance to share resolved stream URLs across multi-container deployments.
  - **Static Asset HTTP Caching:** Add HTTP `Cache-Control` headers (e.g. `public, max-age=31536000, immutable`) and ETag headers to `/outputs/` static file routes.
  - **Document Hashing:** Hash document contents (SHA-256) for PDF text extraction to reuse parsed text across identical file uploads.

### 7. Memory Growth & Leak Risks
- **Current State:**
  - Rate limiting maps (`extractRateLimits`, `streamRateLimits`) are cleared every 60 seconds via `setInterval`. Under heavy DDoS traffic, thousands of IP keys allocate memory between cleanup intervals.
  - Disk growth: `dist/outputs` and `/tmp/agent_uploads/` accumulate generated files (`.jpg`, `.pdf`, `.docx`) without an automated background file lifecycle garbage collector, leading to eventual disk exhaustion.
  - Stream piping in `/api/yt/stream`: Aborted client connections call `req.destroy()`, but unhandled edge-case stream proxies could leave dangling sockets if upstream servers hang.

### 8. CPU Intensive Tasks
- **Current State:**
  - Headless Puppeteer browser instances (`puppeteer.launch()`) are spawned directly inside request handlers for `/api/scrape-exams` and `/api/pdf-ai/generate` on the main Node event loop thread. Spawning Puppeteer takes ~200ms–800ms and 100MB–300MB RAM per request.
  - Code sandbox execution in `src/server/agent.ts`: Spawns sub-processes via `execAsync('node scriptPath')`, consuming CPU and process handles per user submission.

### 9. Background Job Improvements
- **Current State:** All long-running tasks (Puppeteer PDF rendering, media scraping, script generation, and AI file processing) run synchronously inside the HTTP request-response cycle.
- **Architectural Bottlenecks:** Requests taking longer than 15-30 seconds risk HTTP gateway timeouts (504 Gateway Timeout).
- **Improvements:** Transition to an asynchronous background worker model using a task queue (e.g., BullMQ + Redis or AWS SQS + Lambda / Worker instances) with WebSockets or Server-Sent Events (SSE) for job progress updates.

---

## 2. Priority Improvements Matrix (By Impact)

| Priority | Area | Proposed Improvement | Impact | Backwards Compatible |
| :--- | :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Data Persistence & Caching | Introduce PostgreSQL + Redis for shared state, persistent session storage, and distributed media/stream URL caching. | Eliminates data loss, enables multi-node auto-scaling, and reduces external API latency. | Yes |
| **P1 (High)** | Async Job Processing | Offload Puppeteer PDF builds, AI script sandboxes, and file formatting to BullMQ background workers with SSE/WebSocket updates. | Prevents HTTP request timeouts (504s), eliminates main thread CPU blocking. | Yes |
| **P2 (High)** | Frontend Render Virtualization & Zustand Selectors | Wrap large data tables (`CustomerView`, `ServicesView`, `FinanceView`) with `@tanstack/react-virtual` and slice `useAppStore` selectors. | Prevents UI frame drops and typing jank when operating on 1,000+ items. | Yes |
| **P3 (Medium)** | Automated Disk GC | Implement an automated background cron task to sweep `/dist/outputs` and `/tmp/agent_uploads` for files older than 1 hour. | Prevents server disk space exhaustion under heavy usage. | Yes |
| **P4 (Medium)** | Circuit Breakers & Outbound Request Deduplication | Add circuit breaker pattern for external scrapers (Piped/Invidious/Cobalt) to restrict failed endpoint retries under outage conditions. | Protects backend from socket starvation and rate-limit bans. | Yes |

---

## 3. Risk Estimations Across User Scale Tiers

### 100 Users
- **System Impact:** Current single-instance Node server handles traffic comfortably.
- **Bottlenecks:** Minor CPU spikes during concurrent Puppeteer PDF generations or Sharp image resizes.
- **User Experience:** Fast response times (<200ms API, 60fps UI).
- **Risk Level:** **Low**

### 1,000 Users
- **System Impact:** Single Node event loop saturation begins during peak hours.
- **Bottlenecks:**
  - Concurrent Puppeteer launches cause memory spikes up to ~1.5GB–2GB RAM.
  - In-memory `dist/outputs` directory fills up without GC.
  - React UI array iterations (`filter`, `map`) cause minor typing delay on low-end mobile devices.
- **Risk Level:** **Moderate**

### 10,000 Users
- **System Impact:** Single-process server fails under peak concurrency; multi-node deployment required.
- **Bottlenecks:**
  - Multi-instance deployment impossible without shared database / Redis cache (sessions and caches out of sync).
  - External public scraper APIs (Piped/Invidious/Cobalt) rate-limit server IP addresses, resulting in 502/429 errors.
  - In-memory client arrays (>10,000 records) freeze browser UI event loop during updates.
- **Risk Level:** **High**

### 100,000 Users
- **System Impact:** Architecture completely unviable without distributed database, message queues, and microservices.
- **Bottlenecks:**
  - Synchronous HTTP PDF and script generation causes widespread HTTP 504 Gateway Timeouts.
  - Lack of CDN edge caching causes server network interface saturation on media proxying.
  - Database lock contention and lack of indexed queries cause database crashes.
- **Risk Level:** **Critical**

### 1,000,000 Users
- **System Impact:** Requires enterprise distributed cloud architecture.
- **Architecture Requirements:**
  - Horizontally auto-scaled Kubernetes / Serverless microservice clusters.
  - Multi-region read-replica PostgreSQL cluster + Redis Cluster tier.
  - Cloudflare CDN / AWS CloudFront edge stream proxying.
  - Dedicated asynchronous worker fleets for Puppeteer, AI code sandboxes, and document processing.
- **Risk Level:** **Existential (Without Architecture Overhaul)**

---

## 4. Summary & Backwards Compatibility Guarantee
All recommended scalability improvements preserve 100% backwards compatibility with existing API routes, React component interfaces, data structures, and client state hooks.
