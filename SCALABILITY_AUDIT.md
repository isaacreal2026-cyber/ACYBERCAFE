# CyberPlus Operational Platform - Scalability Audit Report

## Executive Summary
This document provides a comprehensive technical audit of the CyberPlus Operational Platform (Express backend + React/Vite frontend) to evaluate its performance, bottlenecks, resource consumption, and failure modes under increasing scale.

The audit identifies key architectural vulnerabilities and provides prioritized recommendations to ensure 100% backwards compatibility while expanding capacity from 100 to 1,000,000 active users.

---

## Technical Audit Categories

### 1. Database Bottlenecks
* **Current Implementation**: The application operates without a persistent database engine (PostgreSQL/MongoDB). Client-side domain data (customers, service tickets, print jobs, staff, transactions, notifications, stored documents, prompt items, saved assets) is stored purely in React state (`src/store/useAppStore.ts`). Server-side dynamic state (rate-limiting IP maps, stream rate limits, extraction caches, offline instance maps) is maintained in-memory in `server.ts`.
* **Bottleneck Identification**:
  * **Volatilization & Data Loss**: Any server restart or container re-deployment completely erases server-side rate limits and extraction caches. Any page refresh or client session termination completely clears user data unless persisted.
  * **Lack of Indexing & Query Optimization**: In-memory array lookups (`.find()`, `.filter()`, `.reduce()`) in `useAppStore.ts` execute linear $O(N)$ searches.
  * **Concurrency Invalidation**: Dual concurrent requests/updates in-memory lack ACID guarantees, locking, or transaction isolation, resulting in race conditions.

### 2. Slow Queries & Unoptimized Aggregations
* **In-Memory Filter Operations**:
  * `unreadNotifications`: Executed as `notifications.filter(n => !n.read).length` on every state update.
  * `waitingTickets` & `activeJobs`: Executed as `.filter(t => t.status === 'waiting')` and `.filter(t => t.status === 'processing')`.
  * `todayRevenue`: Executed as `transactions.reduce((sum, t) => sum + t.amount, 0)` across all transactions.
* **Server-Side External Request Blocking**:
  * `/api/media/search` sequentially falls back across local `yt-dlp` calls, `youtube-sr` parsing, dynamic Piped node iterations, and dynamic Invidious node iterations. Unresponsive external nodes introduce latency cascades up to 15–30 seconds per request.

### 3. Repeated Rendering & State Management
* **State Monolith in `useAppStore.ts`**:
  * All domain models (`customers`, `serviceTickets`, `printJobs`, `transactions`, `notifications`, `documents`, `prompts`, `assets`) reside in a single custom React hook (`useAppStore`).
  * Any state change (e.g., adding a single notification or ticking a status) causes top-level component re-renders across all consumer views that consume `useAppStore()`.
* **Missing Memoization**:
  * Derived state calculations (e.g., total revenue, filtered queues) are recomputed on every render pass rather than wrapped in `useMemo`.

### 4. Expensive Loops & Iterative Operations
* **Server-Side Node Iterations**:
  * `extractViaPublicCobalt`, `extractViaPublicInvidious`, and `extractViaPublicPiped` iterate through node list arrays sequentially or via `Promise.all` racing pools. When public nodes fail, iteration overhead blocks Event Loop ticks.
* **PDF Scraping & Link Parsing**:
  * `/api/scrape-exams` uses Puppeteer and `cheerio` to parse HTML DOM trees, selecting and inspecting all `<a>` tags via `$('a[href]').each()`. Large HTML pages cause $O(N)$ DOM parsing delays.

### 5. Unnecessary API Requests & Redundant External Calls
* **Uncached Media Resolution**:
  * Requests for identical video/audio URLs or queries trigger repeated external searches across YouTube/Invidious/Piped if the item expires or falls outside the 1-hour `extractionCache` window.
* **Invidious & Piped Instance List Refreshing**:
  * `getActiveInvidiousInstances()` and `getActivePipedInstances()` re-fetch external instance lists (`api.invidious.io`, `piped-instances.pages.dev`) every 15 minutes. Failure to cache responses on network errors forces repeated timeout attempts.

### 6. Caching Opportunities
* **Client-Side API Response Caching**:
  * Client app lacks `@tanstack/react-query` or `swr` query caching for external generation/search requests.
* **Server-Side Extended Edge Caching**:
  * In-memory `extractionCache` and `pdfExtractionCache` are process-bound. Distributed caching (e.g., Redis) is absent, forcing identical extractions across multiple server worker instances.

### 7. Memory Growth & Leak Vectors
* **Process-Bound Maps Without Hard Size Bounds**:
  * `extractionCache` and `pdfExtractionCache` evict based on time (`expiresAt`), but lack max item capacity bounds (LRU eviction). A flood of unique extraction requests can inflate V8 heap usage past container limits (e.g., 512MB / 1GB RAM).
* **Process Execution & Buffers**:
  * In `src/server/agent.ts`, AI agent code generation writes temporary Node scripts (`/tmp/agent_uploads/agent_script_*.js`) and output files (`dist/outputs/output_*`). Subprocess execution via `execAsync` buffers entire `stdout` and `stderr` streams into V8 memory.
  * Concurrent file uploads (`multer` destination `/tmp/agent_uploads/`) risk filling local disk space if uncleaned on errors.

### 8. CPU Intensive Tasks
* **Inline Subprocess Spawning (`execAsync`)**:
  * Local `yt-dlp` execution (`ensureLocalYtDlpBinary`, `extractViaLocalYtdlp`, `searchViaLocalYtdlp`) spawns external processes via shell execution, consuming CPU core cycles and thread pool slots.
* **PDF Parsing & AI Script Execution**:
  * `pdf-parse` in `/api/pdf-extract` parses multi-page PDF document streams in the main Node.js process thread.
  * Agent sandbox execution (`node scriptPath`) executes untrusted/generated JS code directly on the host machine.

### 9. Background Job & Queue Improvements
* **Synchronous Request Processing**:
  * Heavy operations (media extraction, Puppeteer crawling, PDF text extraction, AI agent script execution) execute synchronously inside Express request handler cycles.
  * Absence of a background job queue (e.g., BullMQ / Redis worker threads) means long-running requests block HTTP connections and lead to 504 Gateway Timeouts under high load.

---

## Future Risk Estimation by User Scale

### 100 Users
* **Expected Load**: ~1–5 concurrent requests.
* **Performance Impact**: Operational and responsive. In-memory arrays (<100 items) execute instantaneously.
* **Primary Risks**:
  * Transient external node failures (e.g., Cobalt or Invidious downtime) cause occasional 2–5 second request delays.
  * Server restarts cause loss of active session state.

### 1,000 Users
* **Expected Load**: ~20–50 concurrent requests.
* **Performance Impact**: Noticeable latency spikes during concurrent media extraction or AI generation requests.
* **Primary Risks**:
  * Concurrent `execAsync` child processes for `yt-dlp` max out single-core container CPU.
  * Memory usage grows due to concurrent `pdf-parse` Buffer allocations and V8 heap retention.
  * Client-side React re-renders become visible on low-end mobile devices when domain state arrays exceed 1,000 items.

### 10,000 Users
* **Expected Load**: ~200–500 concurrent requests.
* **Performance Impact**: Critical degradation.
* **Primary Risks**:
  * **Process Crashes**: Express Event Loop blockage due to concurrent child processes and CPU-heavy tasks.
  * **Disk Saturated**: `/tmp/agent_uploads/` and `dist/outputs/` fill disk storage.
  * **Rate Limiting Collisions**: In-memory rate limiting maps (`extractRateLimits`, `streamRateLimits`) consume memory and fail to coordinate across horizontal node replicas.
  * **Memory Exhaustion**: In-memory `extractionCache` without LRU bounds causes V8 Out-Of-Memory (OOM) process kills.

### 100,000 Users
* **Expected Load**: ~2,000–5,000 concurrent requests.
* **Performance Impact**: Complete service failure without architectural restructuring.
* **Primary Risks**:
  * **Single Point of Failure**: Lack of persistent database and distributed cache prevents horizontal scaling (multi-pod deployment).
  * **Client Store Degradation**: React state management in `useAppStore` freezes UI threads on large dataset updates ($O(N)$ filter operations on 100,000 array items).
  * **API Quota Exhaustion**: External AI provider keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`) hit upstream rate limits.

### 1,000,000 Users
* **Expected Load**: ~20,000–50,000 concurrent requests.
* **Performance Impact**: System unoperable under current monolithic structure.
* **Primary Risks**:
  * V8 process memory limits exceeded within seconds.
  * Network I/O saturated by media proxy streaming (`/api/yt/stream`).
  * Total state loss on container restart due to lack of persistent database layer.

---

## Prioritized Improvement Roadmap (Backwards Compatible)

### Priority 1: High Impact & Critical Resilience
1. **Implement LRU Capacity Bounds on In-Memory Caches**:
   * Wrap `extractionCache` and `pdfExtractionCache` with maximum element limits (e.g., 1,000 entries max) to prevent V8 heap OOM crashes.
2. **Asynchronous File Cleanup & Disk Guardrails**:
   * Add automated background cleanup cron/interval tasks to purge stale temporary files in `/tmp/agent_uploads/` and `dist/outputs/` older than 1 hour.
3. **Memoize Frontend Store Computations**:
   * Wrap derived store getters (`unreadNotifications`, `todayRevenue`, `waitingTickets`, `activeJobs`) with `useMemo` or selector functions to eliminate unnecessary re-renders.

### Priority 2: Medium Impact & Operational Scalability
4. **Introduce Background Job Queue**:
   * Offload long-running tasks (Puppeteer scraping, PDF parsing, AI agent code execution) to background worker queues (e.g., BullMQ with Redis fallback).
5. **Implement Redis / Distributed State Layer**:
   * Transition server rate-limiting maps and media extraction caches from process-bound `Map` objects to a Redis store to enable multi-instance horizontal scaling.
6. **Migrate Client State to Persistent Database**:
   * Introduce a persistent database layer (e.g., PostgreSQL with Prisma/Drizzle or Firebase Firestore) for domain entities (`customers`, `serviceTickets`, `transactions`) with proper indexing.

### Priority 3: Long-term Scale & Optimization
7. **CDN & Direct Storage Offloading**:
   * Offload generated output media and documents from local `dist/outputs` to S3-compatible cloud storage with CDN distribution.
8. **Fine-Grained React State Management**:
   * Modularize `useAppStore.ts` into isolated React contexts or Zustand slices to prevent global app re-renders on minor state changes.
