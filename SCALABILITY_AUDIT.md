# Scalability & Architectural Audit Report

This scalability and architectural audit evaluates the CYBERPlus system under various load conditions, identifying key performance bottlenecks across nine core areas. It provides risk estimations for major user scale milestones (from 100 to 1,000,000 users) and proposes high-impact, backward-compatible improvements to transition the codebase into an enterprise-grade Cyber Operating System.

---

## 1. Architectural Bottlenecks Identified

### 1.1. Database Bottlenecks
* **Current State:** CYBERPlus manages all client-side state (customers, tickets, transactions, etc.) in-memory on the frontend using React's `useState` inside `useAppStore.ts`. On the server side, caches and rate limits are stored in-memory using JavaScript `Map` structures in `server.ts`. There is no persistent database layer.
* **Bottlenecks:**
  1. **Data Volatility:** Since state resides in ephemeral RAM, any server restart or crash completely wipes out all queues, customer records, staff lists, printing jobs, and financial accounting histories.
  2. **Clustering Incompatibility:** Express cannot be scaled horizontally (using standard Node `cluster` or multiple container instances behind a load balancer) because state is not centralized. Workers would lack access to a shared database or state context.
  3. **High Frontend Overhead:** Serializing and maintaining large state objects in client memory degrades browser performance and increases tab crashes.

### 1.2. Slow Queries
* **Current State:** Because there is no database engine, there are no query indexes.
* **Bottlenecks:**
  1. **Linear Lookup Complexity ($O(N)$):** Frequent lookup operations in both frontend and backend (e.g., `serviceTickets.find(t => t.id === id)` or `.filter(t => t.status === 'waiting')`) perform full-table scans. At high numbers of customers, tickets, and transactions, lookup times will scale linearly, leading to frame drops in React.
  2. **Upstream API Latency:** Scraping endpoints, external searches (`/api/ia-search`), and parallel media extraction racing (hitting Cobalt, Invidious, and Piped) are highly network-bound. A single slow downstream node delays the entire request lifecycle.

### 1.3. Repeated Rendering
* **Current State:** A single custom React hook, `useAppStore`, encapsulates all feature states (chat, ticketing, print queue, notifications, assets, etc.).
* **Bottlenecks:**
  1. **Monolithic Store Re-renders:** Because all states are bundled inside one monolithic context/hook, any state change (such as typing a character in the ChatView, a ticket updating its queue position, or a notification arriving) triggers a full-tree re-render of the entire React tree.
  2. **Monolithic Bundle Sizes:** The application statically imports all views and sub-components in `src/App.tsx` instead of using dynamic `React.lazy` and `Suspense`. This forces a monolithic chunk download (~820KB) upon initial load, resulting in high Time to Interactive (TTI).

### 1.4. Expensive Loops
* **Current State:** Synchronous operations are executed directly on the main application threads.
* **Bottlenecks:**
  1. **Array Mutators:** Actions like `updateTicketStatus` or `sendMessage` iterate over arrays of conversations or tickets using `.map` or `.filter`. While fast for 5-10 records, these operations block user input when arrays scale to thousands of records.
  2. **Cache Pruning Sweeps:** The backend server actively prunes `pdfExtractionCache` via periodic `setInterval` loops. These synchronous sweeps block the single-threaded event loop if the cache contains a high volume of parsed entries.

### 1.5. Unnecessary API Requests
* **Current State:** Requests to generation and search APIs are triggered on-demand without deduplication.
* **Bottlenecks:**
  1. **Aggressive Parallel Racing:** The unified `/api/media/extract` endpoint parallel-races requests to multiple public Cobalt, Invidious, and Piped instances. This generates immense outbound network traffic, quickly exhausting socket pools and triggering upstream IP bans.
  2. **Missing Client-side Deduplication:** Switching back and forth between dashboard tabs triggers re-fetches or redundant operations because there is no client-side caching layer (like React Query / TanStack Query) to persist server-state locally.

### 1.6. Caching Opportunities
* **Current State:** Ephemeral Maps with simple interval-based garbage collection.
* **Bottlenecks:**
  1. **No Disk-Backed Caching:** All server-side extraction and scraping caches are cleared upon server restart, triggering high-cost cold starts and repetitive, slow external calls to Gemini, OpenAI, or YouTube scrape pipelines.
  2. **No LRU/LFU Eviction:** The `extractionCache` lacks an active eviction strategy beyond a raw 1,000 key cap. Large payload data remains in RAM until the cap is hit, risking Out Of Memory (OOM) situations under load.

### 1.7. Memory Growth
* **Current State:** Storage of heavy parsed text strings inside standard JS Maps.
* **Bottlenecks:**
  1. **Large Text Payloads:** `pdfExtractionCache` caches parsed text from PDF attachments (parsed using `pdf-parse` for up to 3 pages). Multiple concurrent uploads of heavily formatted documents lead to unbounded memory inflation in V8 heap space.
  2. **Partially Cleaned Uploads:** Uploaded temporary files from multer (e.g., in `uploads/` and `/tmp/agent_uploads/`) are processed in the `/process` and `/edit` routes. While cleanup is handled, failure of standard Node lifecycles or unexpected process exits can result in orphaned files filling up disk space.

### 1.8. CPU-Intensive Tasks
* **Current State:** Complex, synchronous computing operations are handled directly within Express route handlers.
* **Bottlenecks:**
  1. **Headless Browser Launches:** `puppeteer` is launched on-demand inside `/api/scrape-exams` and `/api/pdf-ai/generate` to render and capture documents. Spawning separate Chromium processes is highly CPU and RAM intensive, frequently locking the Node.js event loop for several seconds.
  2. **Sharp Image Processing:** Image scaling and composition (e.g. passport photos composited on blue backgrounds) within `agentRouter` block the main thread.
  3. **Runtime Script Evaluation:** Evaluated Javascript scripts (executed via `execAsync` under `/api/agent/process`) run arbitrary code in child processes, creating substantial host CPU overhead.

### 1.9. Background Job Improvements
* **Current State:** Long-running tasks are handled synchronously inside standard request-response lifecycles.
* **Bottlenecks:**
  1. **Lack of Queuing:** Scraping, document generation, and AI formatting run as inline, blocking HTTP requests. If a request times out, the work is aborted or orphaned. There is no job status tracking, retry strategy, or delayed execution.
  2. **Child Process Overhead:** Running shell scripts via `execAsync` spawns temporary shell wrappers on the host operating system, which is highly inefficient compared to worker pools.

---

## 2. Priority Recommendations (Backward-Compatible)

To ensure the codebase scales safely without altering existing APIs or user interfaces, we prioritize recommended fixes based on **business impact and architectural stability**:

| Priority | Recommendation | Target Area | Impact | Why |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Node.js Clustering** | CPU & Concurrency | 🔴 Critical | Spawn workers equal to CPU cores in `server.ts`. Eliminates thread blockages from Puppeteer / Sharp. |
| **2** | **Centralized / Persistent DB** | Database State | 🔴 Critical | Migrate state from RAM (`useAppStore.ts` and Express Maps) to a persistent DB (e.g. PostgreSQL or SQLite with Prisma). |
| **3** | **BullMQ / Redis Job Queue** | Background Jobs | 🟡 High | Offload Puppeteer PDF generations and heavy Agent workflows to background worker queues. |
| **4** | **Zustand / Slice State Split** | Rendering | 🟡 High | Split the monolithic `useAppStore` into modular feature slices (e.g., `useChatStore`, `useCRMStore`) to stop global re-renders. |
| **5** | **Vite Lazy Loading** | UI Performance | 🟡 High | Use `React.lazy()` and `Suspense` in `App.tsx` to split the frontend bundle into feature-based chunks. |
| **6** | **LRU Bound Caches** | Memory Growth | 🟢 Medium | Cap caches (`pdfExtractionCache`, `extractionCache`) using an active LRU (Least Recently Used) algorithm. |

---

## 3. Future Risk Estimations

### 3.1. Scale: 100 Users
* **Risk Level: Low**
* **System Behavior:** The server operates normally. Occasional minor lag may be felt if two users trigger Puppeteer PDF generations or exam-scraping requests simultaneously.
* **Critical Bottleneck:** High initial TTI due to the monolithic frontend bundle.

### 3.2. Scale: 1,000 Users
* **Risk Level: Moderate**
* **System Behavior:** RAM usage spikes as multiple concurrent customer conversations and ticket operations accumulate in-memory. The Express server begins dropping connections during heavy media streaming due to socket pool limits.
* **Critical Bottleneck:** Single-threaded Node event loop blocking during Puppeteer / Sharp execution, delaying unrelated simple dashboard requests.

### 3.3. Scale: 10,000 Users
* **Risk Level: High**
* **System Behavior:** Frequent Out Of Memory (OOM) crashes on the server as in-memory caches grow. State is completely wiped out on automatic process restarts, losing valuable customer transactions and printing data.
* **Critical Bottleneck:** Memory growth and state volatility. React application performance degrades significantly as monolithic stores trigger global re-renders for every small state change.

### 3.4. Scale: 100,000 Users
* **Risk Level: Extreme**
* **System Behavior:** Complete service denial. Downstream generative APIs block requests due to a lack of request pooling, retry-backoffs, and client-side caching. Linear $O(N)$ searches on in-memory customer and transaction datasets lock up the CPU.
* **Critical Bottleneck:** Database bottlenecks and lack of database indexing.

### 3.5. Scale: 1,000,000 Users
* **Risk Level: Catastrophic**
* **System Behavior:** The current architecture is incapable of serving 1M users. ephemerality of state, single-threaded processing, and un-queued background workloads will cause instant server failures.
* **Critical Bottleneck:** Monolithic architecture, lack of background workers, lack of persistent database clustering, and high memory exhaustion.

---

*Report compiled and audited by Jules - Operations Center Tech Lead.*
