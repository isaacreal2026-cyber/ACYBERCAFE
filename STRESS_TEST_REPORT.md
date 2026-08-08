# CyberPlus Operations Stress Test Report

This document reports the stress-testing outcomes, simulated failure scenarios, future scaling vulnerabilities, and architectural recommendations for the full-stack CyberPlus workspace.

---

## 1. Simulated Stress Test Scenarios

Our test suite concurrently fired multi-threaded asynchronous requests to replicate real-world Kenyan cyber cafe surges and heavy online workflow spikes.

### A. High Traffic & Concurrent Users
* **Simulation details:** We launched a total of 100 simultaneous simulated user actions using a concurrency pool size of 25.
* **Findings:** Under sustained concurrency, throughput bottlenecks began manifesting on deep server routes (`/api/media/search`, `/api/media/extract`, and `/api/generate`), which experienced latency spikes or timeouts.

### B. Rapid API Requests
* **Simulation details:** Repeated immediate bursts of client API requests sent directly to media extraction and OpenAI/Gemini endpoints.
* **Findings:** The application returned `Status 429` (Too Many Requests) for multiple extraction calls. While rate-limiting keeps downstream services healthy, clients suffer immediately due to lack of local rate-limit queueing or fallback queuing.

### C. Network Failures & Database Delays
* **Simulation details:** Introduced custom 5% connection dropouts and simulated high latent external server queries.
* **Findings:** The application had zero local retry/circuit breaker capabilities for external APIs (e.g., Gemini, Cobalt, Invidious Piped nodes). A failure/timeout on one external service can block upstream Express event loop tasks, leading to cascading timeouts for other concurrent users.

### D. Large Datasets & File Processing
* **Simulation details:** Evaluated multiple parallel PDF uploads and PDF extraction requests.
* **Findings:** Single-threaded headless Puppeteer execution during multi-page document generation or edits (`/api/pdf-ai/generate` and `/api/pdf-ai/edit`) incurs heavy disk read-writes and massive CPU locks. Concurrent PDF requests will lead to server degradation.

### E. Server Restarts & Memory/CPU Pressure
* **Simulation details:** Repeatedly stopped and restarted the Express server.
* **Findings:** Because all customer state (`useAppStore.ts`), ticket states, print queue jobs, cache layers (`extractionCache`, `pdfExtractionCache`), and rate limit lists (`extractRateLimits`, `streamRateLimits`) are stored purely in-memory, **any server restart, crash, or memory pressure evicts all user data instantly**. This is highly critical for a high-turnover operations center.

---

## 2. Future Failure Points

Under production loads, we predict the following 5 critical points of failure:

1. **State Loss on Restart / Cold Starts:**
   * Purely in-memory React and Node state means offline transitions, server failures, container recycles, or cold boots wipe out client customer databases, pending printing queues, ticket queues, and transactions.
2. **Puppeteer CPU & Memory Exhaustion:**
   * Every PDF generation/edit launches a fresh, unpooled Puppeteer chrome instance (`puppeteer.launch()`). Under concurrent user load, launching multiple separate browsers will exhaust sandbox RAM and trigger OS out-of-memory (OOM) process termination.
3. **External API Failures Cascades:**
   * Reliance on free public Piped and Invidious API scrapers. When third-party proxy nodes change layouts or block IP blocks, sequential search fallback sweeps block the Express main thread, resulting in server-wide request delays.
4. **LLM Cost & API Key Rate Limits:**
   * No caching for identical user prompts. High concurrent usage will quickly exhaust external LLM API rate limits and drive up operational costs.
5. **No Persistent Cache Garbage Collection Safeguard:**
   * `pdfExtractionCache` only evicts entries on a basic hourly `setInterval`. If large files are continuously extracted, the storage map will grow indefinitely until a heap out-of-memory crash occurs.

---

## 3. Recommended Fixes (Preserving External Behavior)

To keep the application highly resilient without changing existing APIs or breaking backend behaviors, we recommend the following production-grade patterns:

### Fix 1: Implement Local Storage State Persistence (Client-Side)
* **Goal:** Avoid data loss on frontend refresh or minor backend disruptions.
* **Implementation:** Wrap the `useAppStore` in a React state hydration wrapper utilizing standard browser `localStorage`.
  ```typescript
  // Example for useAppStore.ts
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem("cyberplus_customers");
    return saved ? JSON.parse(saved) : SAMPLE_CUSTOMERS;
  });
  ```

### Fix 2: Migrate Puppeteer to a Browser Pool / Cluster
* **Goal:** Prevent massive CPU/RAM pressure.
* **Implementation:** Instead of calling `puppeteer.launch()` for every endpoint request, initialize a singular browser instance on server startup and reuse pages, or integrate a simple pool like `generic-pool`.
  ```typescript
  // Initialize a single global browser instance
  let globalBrowser: any = null;
  async function getBrowser() {
    if (!globalBrowser) {
      globalBrowser = await puppeteer.launch({ args: ['--no-sandbox'] });
    }
    return globalBrowser;
  }
  ```

### Fix 3: Introduce Redis / Database State Layer
* **Goal:** Complete protection against server crashes or vertical scaling restarts.
* **Implementation:** Introduce a lightweight SQLite or Redis adapter in `server.ts` to persist ticket lists, transaction logs, and cache maps.

### Fix 4: Circuit Breakers & Request Queueing
* **Goal:** Protect against network failures and rapid API request surges.
* **Implementation:** Integrate `p-limit` or standard queue structures on the server to serialize PDF operations, and employ circuit breakers on external YouTube extractor racing calls to skip known-down APIs immediately instead of waiting for connection timeouts.
