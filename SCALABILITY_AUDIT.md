# Scalability Audit & Future Performance Report

## 1. Executive Summary

This audit evaluates the CyberPlus Operations & AI platform for future operational scalability, high-concurrency resilience, and architectural sustainability. The analysis covers the full stack—from client-side state management (`src/store/useAppStore.ts`, `src/App.tsx`) to server-side request handling (`server.ts`, `src/server/agent.ts`, `src/server/pdf-ai.ts`).

The application is currently designed as a lightweight, single-node application. While it offers high responsiveness under low traffic, scaling beyond a single server instance or handling high concurrent loads introduces significant bottlenecks due to:
1. In-memory client and server state without persistent storage or distributed caching.
2. Synchronous CPU-bound process spawns (Puppeteer browser instances, Node.js sandbox executions, image processing with `sharp`).
3. HTTP-bound synchronous execution of long-running workflows (PDF AI generation, multi-node scraper races, scraping via headless browsers).
4. Unbounded memory growth patterns in server-side Maps and disk-based upload directories.

All recommendations outlined in this report maintain **100% backwards compatibility** with existing APIs, component props, data models, and client routing interfaces.

---

## 2. Detailed Scalability Findings by Category

### 2.1 Database Bottlenecks
* **Current State**: The application lacks a persistent database layer. Client state (customers, tickets, transactions, documents) is held in memory via React `useState` (`useAppStore.ts`), while backend data (caches, rate limits, offline node tracking) is stored in native JavaScript `Map` structures in `server.ts`.
* **Bottlenecks & Impact**:
  * **Horizontal Scaling Impossibility**: Multiple backend server instances (e.g., behind an AWS ALB or Kubernetes ingress) cannot share state, rate-limit counters, or extraction caches without a shared database/cache.
  * **Data Volatility**: A server restart or crash wipes all in-memory caches, rate limits, and node health state.
  * **Linear Memory Footprint**: In-memory storage scales $O(N)$ with client data volume and active user count, bounding max capacity strictly to node RAM size.

### 2.2 Slow Queries & Unindexed Lookups
* **Current State**: Filtering and aggregation routines execute linear $O(N)$ scans over arrays in memory:
  * `transactions.reduce((sum, t) => sum + t.amount, 0)` on every render in `useAppStore.ts` and `DashboardView.tsx`.
  * `serviceTickets.filter(t => t.status === 'waiting')` and `notifications.filter(n => !n.read)` calculated synchronously.
* **Backend Traversal**:
  * PDF DOM scraping in `/api/scrape-exams` uses Cheerio selector matches (`$("a[href]")`) over raw HTML strings for every request without indexing or early termination.
  * Sequential API fallback cascades in `/api/media/search` iterate through up to 14 Invidious and 15 Piped instance endpoints sequentially when parallel racing fails.

### 2.3 Repeated Rendering & React Performance
* **Current State**:
  * **Unmemoized Store Context**: `useAppStore()` constructs and returns a new object containing state and callbacks on every execution. Any state update (such as receiving a chat message or ticking a notification) causes re-instantiation and re-renders of `App.tsx` and all active view components.
  * **Coarse-Grained View Switching**: `App.tsx` renders top-level views via a monolithic `switch` block. Child components (`DashboardView`, `FinanceView`, `ReportsView`) perform heavy re-computation of summary metrics on every re-render.
  * **Lack of `React.memo` / `useMemo`**: Complex UI views receive top-level array props without memoized selectors, re-filtering lists on every parent render.

### 2.4 Expensive Loops & Synchronous Blocking Operations
* **Current State**:
  * **PDF Parse Loop**: `pdf-parse` processes multi-page PDF buffers synchronously on the main Node.js event loop in `/api/pdf-extract` and `/api/pdf-ai/edit`.
  * **Periodic Eviction Scans**: `pdfExtractionCache` evicts expired items via a `setInterval` that iterates through all entries in the `Map` every hour.
  * **Synchronous Buffer Resizing**: `agent.ts` uses `sharp` to process and compose passport photo buffers synchronously on the Express main thread.

### 2.5 Unnecessary API Requests & Rate Limiting
* **Current State**:
  * **Instance Config Polling**: `getActiveInvidiousInstances()` and `getActivePipedInstances()` fetch external JSON files (`instances.json`, `data.json`) across the public internet on cache expiration without fallback stale-while-revalidate serving.
  * **Undebounced LLM Calls**: `/api/generate` and `/api/agent/process` trigger direct requests to external provider APIs (Gemini, Groq, OpenRouter) without client-side debouncing or request deduplication.
  * **Uncached Internet Archive Searches**: `/api/ia-search` proxies every query directly to `archive.org` without caching identical queries.

### 2.6 Caching Opportunities
* **Current State**:
  * `/api/media/extract` and `/api/yt/stream` utilize `extractionCache` with a 1-hour expiration. However, media search results (`/api/media/search`), Internet Archive queries (`/api/ia-search`), and LLM generation outputs (`/api/generate`) are not cached.
  * Static file outputs served from `/outputs` lack aggressive HTTP caching headers (`Cache-Control: public, max-age=31536000, immutable`).

### 2.7 Memory Growth & Resource Leaks
* **Current State**:
  * **Unbounded Server Cache**: `extractionCache` in `server.ts` does not enforce a maximum key limit or LRU eviction strategy. High traffic will result in unbounded heap memory growth.
  * **Orphaned File Accumulation**: Uploaded files in `/tmp/agent_uploads/` and `uploads/` (created via Multer) are unlinked on happy paths, but exception branches or unexpected process terminations leave orphaned files on disk.
  * **In-Memory Rate Limiting**: `extractRateLimits` and `streamRateLimits` Maps clear every 60 seconds via `setInterval`, but store client IP strings indefinitely during high-traffic bursts.

### 2.8 CPU Intensive Tasks
* **Current State**:
  * **Headless Browser Launching**: `/api/scrape-exams` and `/api/pdf-ai/generate` launch dedicated Puppeteer Chrome instances (`puppeteer.launch({ headless: true })`) per request. Launching Chrome consumes ~100–300MB RAM and significant CPU per process.
  * **Subprocess Execution**: `agent.ts` invokes `execAsync('node ' + scriptPath)` to execute AI-generated scripts in a new Node.js subprocess.
  * **Image Processing**: `sharp` image manipulation in `agent.ts` processes images synchronously on the server event loop thread.

### 2.9 Background Job Improvements
* **Current State**:
  * Long-running operations (PDF generation, web scraping, dynamic script execution, multi-node media resolution) run synchronously within the HTTP request/response cycle.
  * Requests that exceed gateway timeouts (e.g., 30s on Nginx/Cloudflare) fail with HTTP 504 errors, despite backend execution completing.

---

## 3. User Scale Risk Estimates & Failure Threshold Analysis

| Concurrency Tier | Expected Bottlenecks & Failure Modes | System Risk Level |
| :--- | :--- | :--- |
| **100 Concurrent Users** | • Minor CPU spikes during Puppeteer PDF generation.<br>• In-memory `extractionCache` remains within <100MB.<br>• Client UI remains responsive; main thread event loop latency <50ms. | **LOW** |
| **1,000 Concurrent Users** | • **Event Loop Lag**: Concurrent Puppeteer launches (10+ simultaneous) cause severe CPU throttling and 504 gateway timeouts.<br>• **Disk Exhaustion**: `/tmp/agent_uploads` and `uploads/` accumulate temporary files.<br>• **Downstream Rate Limits**: Un-debounced LLM requests exhaust Gemini/Groq API quotas. | **MEDIUM-HIGH** |
| **10,000 Concurrent Users** | • **Node.js Out-Of-Memory (OOM)**: Unbounded `extractionCache` and un-evicted `pdfExtractionCache` exceed default 1.4GB Node.js heap limit.<br>• **Puppeteer Crashes**: Spawning dozens of Chrome instances exhausts server RAM and crashes the host process.<br>• **Rate Limit Failures**: In-memory IP rate limiting maps consume excessive memory. | **CRITICAL** |
| **100,000 Concurrent Users** | • **Single-Node Collapse**: Unable to scale horizontally because state is tied to single-node RAM.<br>• **Upstream API Bans**: Media extraction proxy requests block host IP due to lack of proxy rotation across node clusters.<br>• **Client UI Freeze**: Unmemoized state in React causes drop to <15 FPS during frequent store updates. | **FATAL** |
| **1,000,000 Concurrent Users** | • **Total Service Disruption**: Architecture fails without distributed caching (Redis), persistent storage (Postgres/MongoDB), message queues (BullMQ), and load-balanced microservices. | **FATAL** |

---

## 4. Prioritized Action Plan (Impact vs. Effort)

```
+-------------------------------------------------------------------------+
|                              IMPACT MATRIX                              |
|                                                                         |
|  HIGH IMPACT                                                            |
|  [P0] Shared Redis Cache & Rate Limiter   [P1] Async Queue for Puppeteer |
|  [P0] LRU Bounds on Server Maps           [P1] Persistent Database Layer|
|                                                                         |
|  MEDIUM IMPACT                                                          |
|  [P2] React State Memoization              [P2] Static Output HTTP Headers|
|  [P2] Browser Pool Reuse                  [P3] Stale-While-Revalidate    |
|                                                                         |
|  LOW IMPACT                                                             |
|  [P3] Client Debouncing                   [P3] Clean Temporary Cleanup   |
|                                                                         |
|  LOW EFFORT ---------------------------------------------> HIGH EFFORT   |
+-------------------------------------------------------------------------+
```

### 4.1 Priority 0 (Critical - Immediate Scalability Blockers)
1. **Enforce Hard Limits & LRU Eviction on In-Memory Maps**:
   * Replace unbounded `Map` objects in `server.ts` (`extractionCache`, `pdfExtractionCache`) with bounded LRU caches (e.g., `lru-cache` with `max: 5000` items).
2. **Guaranteed File Cleanup on Exceptions**:
   * Wrap all Multer upload processing blocks in `try...finally` blocks to guarantee `fs.unlinkSync` executes even on error or timeout paths.

### 4.2 Priority 1 (High - High Concurrency Protection)
1. **Puppeteer Instance Reuse / Browser Pool**:
   * Transition from launching a new Puppeteer instance per request (`puppeteer.launch()`) to maintaining a managed browser instance pool or a single reusable browser process with fresh pages (`browser.newPage()`).
2. **Asynchronous Queue Integration for Long-Running Tasks**:
   * Decouple heavy operations (PDF AI generation, web scraping) from HTTP response cycles using a lightweight job queue pattern (`BullMQ` + Redis or `p-queue` in-process queue).

### 4.3 Priority 2 (Medium - Client & Server Efficiency)
1. **React State & View Memoization**:
   * Wrap heavy computed values (`todayRevenue`, `waitingTickets`, `activeJobs`) in `useMemo`.
   * Memoize view components (`DashboardView`, `FinanceView`, `ReportsView`) using `React.memo` to prevent unnecessary re-renders when unrelated store slices update.
2. **Distributed Cache & Persistence Abstraction**:
   * Introduce a repository interface for state and caching (e.g., Redis driver fallback with local in-memory fallback) to enable multi-node horizontal deployment.

### 4.4 Priority 3 (Low - Optimization & Hygiene)
1. **HTTP Cache Control Headers**:
   * Add `Cache-Control: public, max-age=31536000, immutable` for static outputs served under `/outputs`.
2. **Client-Side Request Debouncing**:
   * Debounce search inputs and AI prompt submission buttons to prevent accidental duplicate network requests.

---

## 5. Backwards-Compatible Implementation Roadmap

All proposed improvements can be introduced incrementally without breaking client APIs or user interfaces:

1. **Phase 1 (Server Safeguards)**: Add LRU bounds to server maps, ensure `try...finally` cleanup for uploaded files, and set static asset cache headers.
2. **Phase 2 (Resource Reuse)**: Implement a singleton browser pool for Puppeteer in `pdf-ai.ts` and `server.ts`.
3. **Phase 3 (Frontend Optimization)**: Add React memoization (`useMemo`, `React.memo`) to top-level views and store selectors.
4. **Phase 4 (Horizontal Preparedness)**: Abstract cache and state behind adapter interfaces to allow seamless drop-in of Redis and persistent database layers when user demand requires scaling across multiple servers.
