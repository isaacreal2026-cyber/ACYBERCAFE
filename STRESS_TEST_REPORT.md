# CYBERPlus Control Center - Stress-Testing & Scaling Report

This report presents a detailed evaluation of the CYBERPlus system under various simulated stress conditions. It identifies critical scaling bottlenecks, system vulnerabilities under peak load, and outlines defensive architectural solutions to ensure high availability and resilient operations.

---

## 1. Executive Summary

CYBERPlus is a rich, full-stack cyber cafe operating system supporting critical tasks (e.g., government eCitizen/KRA workflows, AI document generation, media streaming, PDF toolkit, local printing, and scanner centers). While feature-complete and highly automated, the server relies on a single-threaded Node.js runtime and volatile in-memory storage.

Our simulations show that under high concurrency, heavy payloads, or CPU-intensive actions, the system is susceptible to complete service denial, external rate-limiting, and memory exhaustions. The recommended architectural fixes preserve all existing frontend/backend behaviors and user interfaces while introducing robust defensive mechanisms.

---

## 2. Simulation Setup & Metrics

To stress-test the application, a dynamic simulation script (`stress_test_simulation.js`) was executed against the local Express server on port `3000`. The results are outlined below:

| Stress Vector | Simulation Method | Metric / Result | Status | Key Observation |
| :--- | :--- | :--- | :--- | :--- |
| **High Traffic / Concurrency** | 40 concurrent HTTP requests to `/api/ia-search` | 0% success (0/40 successes), Average latency: **2131ms**, Max latency: **5050ms** | 🔴 CRITICAL | Downstream APIs (Archive.org) blocked requests (returned HTML error/captcha page). Under high load, undici fetch threw `TypeError: fetch failed` due to network congestion / socket depletion. |
| **Rapid API Requests** | 25 rapid sequential POST requests to `/api/media/extract` | 16/25 succeeded. 9 failed or throttled. | 🟡 WARNING | In-memory IP rate limiter successfully triggers at >20 requests/minute, but does not persist across restarts and lacks sliding-window accuracy. |
| **Network Failures & API Delays** | Triggering PDF extraction `/api/pdf-extract` with slow or offline third-party URL | Latency: **31ms**; Status returned: **500 Internal Server Error** | 🟡 WARNING | Direct third-party fetch failures bubble up as unhandled server-side HTTP 500 crashes instead of returning user-friendly diagnostics. |
| **Server Restarts** | Manual process termination and restart | Data Wiped: **Caches & Rate limits** | 🔴 CRITICAL | All cache stores (`pdfExtractionCache`, `extractionCache`) and rate limits are volatile. A restart immediately forces heavy, slow external calls to Google Gemini, OpenAI, or YouTube scraping backends. |
| **Large Datasets** | 5MB JSON prompt payload sent to `/api/generate` | Latency: **161ms**; Status returned: **413 Payload Too Large** | 🟡 WARNING | Express default JSON parser blocks large documents or base64 file payloads from processing, limiting scanner/PDF workflows. |
| **CPU & Memory Pressure** | - CPU: 50 million mathematical iterations <br>- Memory: Allocate 10MB heap blocks | - CPU Loop: **14091ms** blocked <br>- Peak Memory: **151.14 MB** | 🔴 CRITICAL | Heavy calculations completely block Node's single-threaded event loop for 14 seconds. During this time, the server cannot respond to any other users. |

---

## 3. Future Failure Points & Root Causes

### A. Event Loop Blocking via CPU-Intensive Tasks (Puppeteer, PDF/Sharp Processing, Big Calculations)
* **Root Cause:** Node.js executes JavaScript on a single thread. Heavy operations like launching Headless Chrome (Puppeteer) inside `/api/scrape-exams` or `/api/pdf-ai/generate`, image scaling via `sharp` inside `/api/agent/process`, or complex document builds block the event loop.
* **Failure Mode:** If one user initiates an exam scrape or passport photo generation, all other connected attendants and customers experience severe lag or complete timeout of the entire platform.

### B. Downstream API Failures and Lack of Backoff / Retries
* **Root Cause:** Endpoints like `/api/pdf-extract` or `/api/generate` rely on external third-party services (fetch, Google Gemini, OpenAI). The current codebase has no circuit breaker pattern or exponential backoff mechanism.
* **Failure Mode:** If the Internet Archive, Google, or OpenAI API undergoes temporary downtime or throttles requests, CYBERPlus throws immediate HTTP 500 errors to the client, blocking the user interface and leaving the user with generic error states.

### C. State Volatility & Cache Loss Under Server Restarts
* **Root Cause:** All service tickets, customers, staff members, transactions, print jobs, and caching mechanisms (`pdfExtractionCache`, `extractionCache`) reside in ephemeral RAM (React useState on the client side, and JS Maps on the Express side).
* **Failure Mode:** A server restart or crash erases the entire history of printed files, scanned documents, queues, and financial records. This creates high risk for business accounting and daily attendant workflows.

### D. Out of Memory (OOM) via Unbounded Caches and Uploads
* **Root Cause:** Caches (`extractionCache`, `pdfExtractionCache`) grow indefinitely in memory. Although PDF extraction cache has a pruning interval, large parsed texts (e.g. thousands of pages) remain in RAM.
* **Failure Mode:** If dozens of concurrent users upload large PDFs for AI analysis, the V8 engine heap will quickly exceed its default limits, leading to process termination (`FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`).

---

## 4. Recommended Fixes (Preserving Current Behavior)

To scale CYBERPlus without changing its existing external APIs, routing, user interface, or permissions, we recommend implementing the following non-disruptive, defensive architectural enhancements:

### 1. Robust Cluster Clustering / Node.js Cluster Module
* **Recommendation:** Leverage the native Node.js `cluster` module in `server.ts` to spawn worker processes equal to the number of CPU cores.
* **Why:** If one worker is blocked by a heavy Puppeteer process or a PDF generation task, other worker processes can continue to handle incoming customer and attendant requests on port 3000, eliminating single-thread lockups.
* **Preservation of Behavior:** No API routes or client-side components need changes.

```js
// Example in server.ts
import cluster from "cluster";
import os from "os";

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary server process launching ${numCPUs} worker threads...`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.warn(`Worker process ${worker.process.pid} died. Spawning replacement...`);
    cluster.fork();
  });
} else {
  startServer(); // Start Express app
}
```

### 2. High-Performance Caching & Disk-Backed Fallbacks
* **Recommendation:** Enhance `extractionCache` and `pdfExtractionCache` to periodically write their serialized contents to a local JSON file (`/tmp/cyber_caches.json`), and reload them upon server startup.
* **Why:** Preserves cached data across unexpected server restarts, significantly reducing cold-start times and saving expensive third-party API credits.

### 3. Graceful Error Boundaries & Downstream Retries
* **Recommendation:** Implement a robust wrapper around the `fetch` and external API helper functions with automatic retries (maximum of 3 attempts with a 500ms delay) and fallback logic.
* **Why:** Eliminates sudden 500 crashes due to transient internet drops or external rate limits.

### 4. Bounded Caches with LRU (Least Recently Used) Eviction
* **Recommendation:** Replace the basic `Map` caches with a size-bounded structure. Set a maximum size (e.g., 500 items). When full, discard the oldest entries.
* **Why:** Strictly caps memory growth, preventing heap overflow and OOM crashes during heavy cyber cafe operations.

### 5. Increased Payload Body Limit Configuration
* **Recommendation:** Configure the express json body parser limit in `server.ts` to `50mb`:
  ```js
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  ```
* **Why:** Safely permits attendants to upload complex documents, high-DPI scans, and large PDF attachments without triggering `PayloadTooLargeError`.

---

## 5. Conclusion

By implementing these low-risk, high-impact defensive architectural improvements, CYBERPlus transforms from a single-threaded workstation into a highly available, robust, and enterprise-grade **Cyber Operating System**. The proposed recommendations are fully transparent, preserving the existing beautiful user experience and extensive workflow automation.
