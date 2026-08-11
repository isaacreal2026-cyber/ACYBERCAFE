# Scalability & Architectural Audit Report

This document presents a comprehensive scalability and architectural audit of the CyberPlus Operations Center full-stack TypeScript application. It evaluates potential bottlenecks, rendering performance, memory and CPU concerns, and details risks and mitigation plans from 100 to 1,000,000 users.

---

## 1. Executive Summary & Architecture Overview

The system is a full-stack TypeScript application consisting of:
- **Frontend:** A React 19 application built with Vite and Tailwind CSS.
- **Backend:** An Express backend running on Node.js, compiling to CommonJS (`dist/server.cjs`) via `esbuild`.
- **Integrations:** Third-party APIs including Firebase (authentication/config), Google Gemini APIs, OpenAI APIs, and other public scrapers/nodes (Invidious, Piped, Cobalt).

Currently, the application operates in a completely **stateless/volatile mode** with respect to persistence:
1. **Frontend State Management:** Managed entirely in-memory using React's `useState` inside a custom hook (`src/store/useAppStore.ts`). No local database or synchronization layer is used.
2. **Backend Cache & Rate Limits:** Managed entirely in-memory inside `server.ts` via standard ES6 `Map` instances (`extractionCache`, `pdfExtractionCache`, `offlineInstances`, `extractRateLimits`, `streamRateLimits`).
3. **No Database Layer:** The system lacks any structured, persistent relational or document database. All transactions, customer records, printing jobs, and ticket queues are generated as static mock data and mutated transiently in client-side state.

This architecture offers extreme agility for prototype/mock usage but presents immediate architectural boundaries when scaling.

---

## 2. Identification of Scaling Bottlenecks

### 2.1. Database Bottlenecks
- **Volatility & Zero Persistence:** Client-side state (customers, tickets, print jobs) is entirely wiped out on page reload.
- **No Shared State:** Since there is no database layer, multiple backend instances cannot share state. Horizontal scaling is impossible because cache state (`extractionCache`), rate-limit Maps, and offline instance lists are tied to a single Node.js process memory space.
- **Lack of Transactions & ACID compliance:** Mutating data (such as marking a ticket completed or creating transactions) in-memory in a React hook can lead to race conditions, inconsistent states, and data loss if multiple operators are performing tasks.

### 2.2. Slow Queries (External API Latency & Blocking Calls)
- **Puppeteer Headless Browser Spawning:** The `/api/scrape-exams` (exam scraper), `/api/pdf-ai/generate` (PDF generation), and `/api/pdf-ai/edit` (PDF editing) endpoints spawn headless Puppeteer/Chromium instances on-demand. Spawning and page-navigation takes **5 to 30+ seconds**, representing highly latent blocking actions.
- **Local yt-dlp Subprocess Spawning:** `/api/media/extract` and `/api/yt/stream` run the local `yt-dlp` binary synchronously using `exec` subprocesses. Initiating a new process shell takes 1–3 seconds minimum.
- **Sequential Routing Fallbacks:** Under `/api/media/search` and extraction routes, if a scraper fails, the application cascades through multiple public Invidious, Piped, and Cobalt nodes. Each failure path waits for connection or socket timeouts (up to 3.5 seconds per node), leading to highly latent HTTP requests for clients.
- **LLM API Calls:** Direct network calls to Gemini and OpenAI are highly latent (1 to 15 seconds) and run inside the request-response cycle.

### 2.3. Repeated Rendering
- **Monolithic Store State Hook (`useAppStore.ts`):**
  The store is structured as a single massive custom hook. It returns all state variables (`conversations`, `customers`, `serviceTickets`, `printJobs`, `notifications`, etc.) along with their set-state handlers.
  - Whenever *any* single piece of state is updated (e.g., adding a notification, collapsing the sidebar, or changing the selected LLM model), React forces a **full re-render** of every component that consumes `useAppStore`.
  - There is no selector-based subscription or slice-based subscription.
- **Monolithic Initial Bundle:**
  The application statically imports all view components inside `src/App.tsx`. The production build compiles into a monolithic bundle (~820kB). Because of static imports, Vite cannot perform route/view-level code splitting.
- **Unmemoized Direct Derivations:**
  Aggregated values such as `unreadNotifications`, `waitingTickets`, `activeJobs`, and `todayRevenue` are computed on every single render using unmemoized `.filter()` and `.reduce()` operations over the entire collection of notifications, tickets, and transactions.

### 2.4. Expensive Loops
- **In-Memory Cache Expiration Pruning Loops:**
  In `server.ts`, periodic `setInterval` loops run every hour to prune `pdfExtractionCache` entries. While Maps are highly optimized, a loop iterating over thousands of raw text objects blocking the main thread can cause garbage collection pauses.
- **Unmemoized Array Derivations on Frontend:**
  In many view components, complex filtering (e.g., searching customers by text, filtering active tickets) is executed directly in the body of render functions rather than utilizing `useMemo`. As the size of the arrays grows, this slows down render frames (UI lag).

### 2.5. Unnecessary API Requests
- **Redundant Extractor Node Searching:**
  If multiple users query identical YouTube links or search terms, the system repeats the same external node inquiries and subprocess executions because search results and successful nodes are not cached.
- **No Client-side Request Caching:**
  The React app relies on raw `fetch` requests inside `sendMessage`. Moving between views triggers repeated fetching of data, rather than using a caching manager like React Query's `useQuery` cache.
- **Lack of Polling Optimization:**
  If polling is implemented for tickets or print jobs, the absence of short-circuit headers (like `ETag` or `If-None-Match`) forces the server to process and send full payloads on every single poll.

### 2.6. Caching Opportunities
- **Distributed Caching (Redis):**
  Replacing in-memory Maps (`extractionCache`, `pdfExtractionCache`) with a distributed key-value store (like Redis) with proper Time-To-Live (TTL) is a massive scaling opportunity.
- **LLM Response Caching:**
  Caching LLM completions for identical prompts or tasks (such as passport photo processing or common document generations) would eliminate expensive third-party API costs and deliver sub-millisecond responses.
- **Static Asset Caching (CDN):**
  Serving generated outputs (e.g., PDFs, formatted documents, cropped photos) directly from an Object Storage bucket (AWS S3, Firebase Storage) via a CDN (Cloudflare) instead of serving them locally from the `dist/outputs` folder on the Express server.

### 2.7. Memory Growth
- **Leaking `extractionCache` Map:**
  Unlike `pdfExtractionCache`, the `extractionCache` Map in `server.ts` **has no periodic pruning loop** or Maximum Size boundary (no LRU/eviction policy). It grows indefinitely, storing massive strings of raw video URLs. Over time, under continuous use, this will result in a fatal **out-of-memory (OOM)** server crash.
- **Unbounded PDF Text Buffers:**
  The PDF parsing cache (`pdfExtractionCache`) stores full extracted text. If multiple multi-page PDFs are parsed, these massive strings occupy substantial heap space.
- **Disk Saturation via Uncleaned Temp Files:**
  While backend routers `/process` and `/edit` use `try...finally` blocks to delete uploaded files, a sudden crash or uncaught error inside executing sandboxed scripts can leave stray files in `/tmp/agent_uploads/` or `uploads/`, eventually saturating disk space.

### 2.8. CPU Intensive Tasks
- **Headless Browser Launching:**
  Spawning Chrome via Puppeteer utilizes substantial CPU cycles to initialize the sandbox environment and compile CSS layout styles. Spawning more than 5–10 concurrent browsers on standard VPS configurations will saturate CPU to 100%.
- **Sandboxed Script Execution via Subprocesses:**
  Spawning Node.js subprocesses inside `agentRouter` to execute generated workflow scripts (`node agent_script_*.js`) is highly CPU-intensive and susceptible to hangs (e.g., if the LLM generates an infinite loop, although restricted by a 15s timeout, it fully locks a CPU core during that duration).
- **Synchronous Image Processing:**
  Resizing images using `sharp` is performed on-the-fly inside the request-response thread.

### 2.9. Background Job Improvements
- **Synchronous Processing Architecture:**
  Currently, all heavy operations (such as Puppeteer scraping, LLM text/image generation, and PDF document formatting) are handled **synchronously** within the HTTP request-response cycle.
  - If a task takes longer than standard HTTP timeout limits (e.g., 30s for standard proxies like Cloudflare or Nginx), the connection is forcibly terminated.
  - The server holds socket connections open, exhausting the pool of available system file descriptors.

---

## 3. Prioritized Bottlenecks & Impact Level

| Priority | Bottleneck | Component | Impact Level | Actionable Solution |
|---|---|---|---|---|
| **1** | **CPU & RAM Exhaustion via On-Demand Puppeteer** | Backend (`pdf-ai.ts`, `server.ts`) | **CRITICAL** | Transition Puppeteer to a reusable browser-pool or serverless browser provider (e.g., Browserless.io) to avoid launching multiple Chromium instances concurrently. |
| **2** | **Memory Leak in `extractionCache`** | Backend (`server.ts`) | **HIGH** | Implement a maximum size constraint (e.g., LRU Cache) or implement a periodic eviction loop similar to the PDF cache to prevent bounded OOM crashes. |
| **3** | **Synchronous Task Execution** | Backend (`server.ts`, `agent.ts`) | **HIGH** | Offload Puppeteer, `yt-dlp` subprocesses, and AI workflow scripts to an asynchronous job queue (e.g., BullMQ backed by Redis). |
| **4** | **Monolithic React Store Re-renders** | Frontend (`useAppStore.ts`) | **MEDIUM** | Split the store into sliced contexts or convert to a lightweight state-management library like Zustand, allowing components to subscribe only to specific state slices. |
| **5** | **Lack of Centralized Database** | Full Stack | **MEDIUM** | Introduce a persistent, structured database layer (PostgreSQL or Firestore) to avoid volatile data loss and support scale. |
| **6** | **Monolithic Initial Bundle** | Frontend (`App.tsx`) | **LOW** | Implement React dynamic imports (`React.lazy` and `Suspense`) to split bundle delivery by view. |

---

## 4. User-Scale Risk Assessments

### 4.1. 100 Users
- **System Behavior:** Stable.
- **Frontend Risk:** Minimal. Unmemoized arrays and monolithic context re-renders are barely noticeable at this scale.
- **Backend Risk:** Spikes in Puppeteer calls (e.g., 5 concurrent requests) can cause minor CPU spikes but will complete successfully.
- **Memory Risk:** Cache sizes are small; memory leaks will not trigger crashes unless the process runs un-restarted for weeks.
- **Mitigation:** Integrate standard process managers (e.g., PM2) to auto-restart the backend on OOM or crash.

### 4.2. 1,000 Users
- **System Behavior:** Degraded under peak hours.
- **Frontend Risk:** Monolithic store starts slowing down input responsiveness (typing lag, slow modal loads) if customer/ticket tables grow to thousands of items.
- **Backend Risk:** Concurrency spikes will exhaust system resources. Spawning 10–20 Puppeteer instances or `yt-dlp` subprocesses concurrently will cause CPU saturation, leading to requests timing out (504 Gateway Timeout).
- **Memory Risk:** The lack of eviction in `extractionCache` begins to accumulate notable heap sizes, leading to OOM restarts every few days.
- **Mitigation:** Evict Map caches properly. Implement basic concurrency limiting on the Express server (e.g., using `express-rate-limit` and restricting Puppeteer concurrency).

### 4.3. 10,000 Users
- **System Behavior:** Frequent outages and data loss.
- **Frontend Risk:** Completely sluggish UI. Monolithic store state changes cause substantial rendering frame drops. All mock data (wiped on refresh) becomes a major product failure.
- **Backend Risk:** Single-threaded Node.js event loop blocks because of CPU-bound operations (Sharp resizing, subprocess spawn synchronization, synchronous loops). Express connections start dropping.
- **Memory Risk:** Frequent OOM crashes. The server starts restarting every few hours, losing rate-limiting states and offline node lists, which leads to scraping failures due to sudden rate limit bypasses.
- **Mitigation:** Transition to a database (PostgreSQL/Firestore) and a remote cache (Redis). Move all rendering routes to dynamic React lazy components.

### 4.4. 100,000 Users
- **System Behavior:** Total system failure under current architecture.
- **Frontend Risk:** Inoperable due to massive bundle sizes (~820kB monolithic initial load) and extreme memory overhead.
- **Backend Risk:** Puppeteer and `yt-dlp` cannot run locally. File descriptor limits will be exceeded, and OS-level memory limits will force-kill the node processes.
- **Background Jobs:** Keeping HTTP connections open for long-running scraper/LLM scripts will exhaust all socket capacity on proxy servers.
- **Mitigation:** Complete decoupling of architecture. Spawning chromium browsers locally must be entirely banned; scraping and extraction must be delegated to stateless workers or serverless edge functions.

### 4.5. 1,000,000 Users
- **System Behavior:** Impossible to host under standard monolithic server structures.
- **Mitigation Requirements:**
  1. **Global CDN Distribution:** All static assets, pre-built forms, and generated output documents must be stored in Object Storage and routed via CDNs.
  2. **Distributed Microservices:** Split the monolithic server into specialized microservices: an API Gateway, an AI Agent Runner Service, a Document Generation Service, and a Scraping Service.
  3. **Event-Driven Architecture:** Implement event streams (e.g., Apache Kafka, AWS SQS) to handle asynchronous job processing.
  4. **State Isolation:** Transition the frontend to an optimized state library (Zustand/Redux) paired with TanStack React Query for paginated, cached queries.

---

## 5. Actionable, Backwards-Compatible Recommendations

To ensure maximum scalability without disrupting any existing UI, APIs, database structures, or third-party integrations, the following backwards-compatible recommendations should be implemented:

### 5.1. Implement Bounded Map Eviction (Fixing the Memory Leak)
Introduce a size limit or periodic eviction loop for `extractionCache` in `server.ts` to prevent unbounded memory growth while keeping the Map's simple interface intact:

```typescript
// Backward-compatible memory growth prevention
const extractionCache = new Map<string, { videoUrl: string; audioUrl: string; expiresAt: number }>();
const MAX_CACHE_SIZE = 5000; // Hard-limit cache items

function setSafeCache(key: string, value: any) {
  if (extractionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = extractionCache.keys().next().value;
    if (oldestKey) extractionCache.delete(oldestKey);
  }
  extractionCache.set(key, value);
}
```

### 5.2. Transition Monolithic Views to Dynamic Lazy Loading
Modify `src/App.tsx` to dynamically load heavy subviews using `React.lazy` and `Suspense`. This breaks the single monolithic bundle into smaller chunks, drastically improving page-load performance while maintaining identical code structure:

```typescript
import React, { Suspense, lazy } from "react";

// Lazy-loaded views
const CyberAgentView = lazy(() => import("./components/CyberAgentView"));
const DesignStudioView = lazy(() => import("./components/DesignStudioView"));
const GitClientView = lazy(() => import("./components/GitClientView"));

// Usage inside App.tsx render:
<Suspense fallback={<div className="p-8 text-center text-gray-500">Loading component...</div>}>
  {activeCategory === "agent" && <CyberAgentView />}
  {activeCategory === "design" && <DesignStudioView />}
</Suspense>;
```

### 5.3. Puppeteer Browser Pool Management
Instead of launching a new browser on every request in `pdf-ai.ts` and `server.ts`, initialize a single, managed browser pool or reuse a single browser instance across requests. This maintains 100% API compatibility while reducing CPU/RAM overhead by up to **90%**:

```typescript
let globalBrowser: any = null;

async function getBrowserInstance() {
  const puppeteer = (await import("puppeteer")).default;
  if (!globalBrowser || !globalBrowser.connected) {
    globalBrowser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
  }
  return globalBrowser;
}

// Inside Express router:
const browser = await getBrowserInstance();
const page = await browser.newPage();
try {
  await page.setContent(htmlContent);
  const pdf = await page.pdf({ format: "A4" });
  res.send(pdf);
} finally {
  await page.close(); // Only close the page, keep browser running!
}
```

### 5.4. Memoization of Heavy Frontend State Derivations
Wrap heavy filter and reduction operations in `useAppStore` using memoized getters or memoized state selectors to prevent overhead during frequent rendering frames.

### 5.5. API-First Queue Integration (Decoupled Long-Running Jobs)
Keep the existing endpoint signatures but modify internal processing to support a job-based status structure. For instance, the client can poll `/api/agent/status/:jobId` instead of waiting for a single synchronous request to complete.
