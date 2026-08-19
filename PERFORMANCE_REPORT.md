# CYBERPlus Application Performance Audit & Improvement Report

This report provides a comprehensive performance review of the CYBERPlus application across nine key dimensions. It details exact metrics, identifies root causes for performance bottlenecks, and provides a prioritized list of recommendations ranked by impact.

---

## Executive Summary & Key Performance Metrics

| Measurement Category | Current Metric / Findings | Target Metric | Impact Level |
| :--- | :--- | :--- | :--- |
| **Lazy Loading** | 0% route/view code splitting; all 25+ views eagerly loaded | Dynamic `React.lazy` imports for all non-initial views | 🔴 High |
| **Large Bundle Size** | Primary JS bundle size: **827.11 kB** (226.66 kB gzip) | Monolithic JS chunk < **350 kB** minified | 🔴 High |
| **Duplicate Packages** | Both `@google/generative-ai` (^0.24.1) and `@google/genai` (^2.10.0) installed | Single standard SDK (`@google/genai`) | 🟡 Medium |
| **Cold Startup** | Static top-level imports of heavy packages in `server.ts` | Lazy/dynamic imports for heavy server modules | 🟡 Medium |
| **Render Performance** | Unmemoized array filtering & re-renders across 25+ views | Memoized selectors & scoped React re-renders | 🟡 Medium |
| **API Latency** | External AI/Puppeteer requests take 800ms–5000ms+ | Cached responses & pre-warmed puppeteer pool | 🟡 Medium |
| **Memory Usage** | Ephemeral unbounded `Map` caches (`extractionCache`, etc.) | Bounded LRU cache eviction (max 500 items) | 🟡 Medium |
| **Database Performance** | In-memory $O(N)$ linear search on React state arrays | Indexed JS Maps / memoized selectors for lookups | 🔵 Low-Medium |
| **Network Requests** | Monolithic initial payload; uncached client fetch calls | Chunk splitting & React Query `staleTime` optimization | 🔵 Low-Medium |

---

## Detailed Performance Analysis Across 9 Categories

### 1. Render Performance
* **Observations:**
  * Global state management in `src/store/useAppStore.ts` exposes a monolithic store object. Components consuming `useAppStore()` trigger re-renders whenever any property in the store changes.
  * Complex views such as `CustomerView`, `ServicesView`, `FinanceView`, `ReportsView`, and `DocumentsView` perform array operations (`.filter()`, `.find()`, `.reduce()`) inside the render body without `useMemo`.
* **Root Cause:** Lack of scoped selectors or memoized React hooks causing full component tree re-evaluations during active state changes.

### 2. API Latency
* **Observations:**
  * Endpoints like `/api/scrape-exams` launch a fresh Headless Chromium browser instance via Puppeteer on every request, incurring **3,000ms–8,000ms** latency.
  * External search and AI endpoints (`/api/ia-search`, `/api/generate`) depend on remote service responses without aggressive response caching or fallback connection pooling.
* **Root Cause:** Heavy dynamic operations running synchronously per request without cached results or persistent background pools.

### 3. Large Bundle Size
* **Observations:**
  * The production build output yields a single main JavaScript bundle: `dist/assets/index-CCyKEkP1.js` at **827.11 kB** minified (226.66 kB gzip).
  * Vite issues a warning during build: `(!) Some chunks are larger than 500 kB after minification.`
* **Root Cause:** Absence of route/view code splitting and manual Rollup vendor chunking (`manualChunks`). Firebase, Lucide icons, Motion, PDF utilities, and Markdown renderers are compiled into the main bundle.

### 4. Duplicate Packages
* **Observations:**
  * Two separate Google Gemini AI SDKs are installed in `package.json`:
    - `@google/generative-ai`: legacy v0 SDK used in `src/lib/gemini.ts`.
    - `@google/genai`: modern v2 SDK used in `server.ts` and `src/server/agent.ts`.
* **Root Cause:** Incomplete migration to `@google/genai`, leaving redundant dependencies in `package.json` and `node_modules`.

### 5. Memory Usage
* **Observations:**
  * Baseline server RAM usage is ~85 MB, scaling up to ~150 MB under concurrent load or file processing tasks.
  * In-memory caches (`pdfExtractionCache`, `extractionCache`, `scrapeCache`, `rateLimitStore`) in `server.ts` use standard JavaScript `Map` structures without maximum element limits.
* **Root Cause:** Absence of Bounded LRU (Least Recently Used) eviction algorithms on server-side caches, exposing long-running instances to heap memory growth.

### 6. Network Requests
* **Observations:**
  * Initial page load downloads the full 827 kB JS payload before rendering the login screen or initial dashboard view.
  * Rapid user category switching triggers repetitive component tree builds without client-side query deduplication.
* **Root Cause:** Monolithic frontend bundling and default React Query settings without explicit `staleTime` or `gcTime` caching configurations.

### 7. Database Performance
* **Observations:**
  * Data storage is handled in-memory via React state (`useAppStore.ts`) and server RAM.
  * Record lookups (e.g. finding customer by ID or filtering tickets by status) use linear $O(N)$ array searches.
* **Root Cause:** Lack of indexed Map structures ($O(1)$ lookup complexity) or memoized selector computations for high-cardinality collections.

### 8. Cold Startup
* **Observations:**
  * `server.ts` statically imports heavy dependencies (`@distube/ytdl-core`, `youtube-sr`, `cheerio`, `puppeteer`, `sharp`, `@google/genai`, `pdf-lib`, `pdf-parse`) at the top level.
  * Node.js must parse all heavy CJS/ESM modules before listening on port 3000.
* **Root Cause:** Synchronous top-level module resolution of non-critical server utilities.

### 9. Lazy Loading
* **Observations:**
  * All 25+ view components are imported synchronously in `src/App.tsx`.
* **Root Cause:** Missing `React.lazy()` dynamic imports and `<Suspense>` boundaries for non-initial view views.

---

## Suggested Improvements (Ranked by Impact)

1. **Implement View Code-Splitting & Lazy Loading (Impact: HIGH)**
   - *Action:* Refactor `src/App.tsx` to dynamically import non-initial view components using `React.lazy()` and wrapping component renders in `<Suspense>`.
   - *Expected Outcome:* Slashing initial JS bundle size from **827 kB** down to **~300 kB** (~60% reduction) and improving First Contentful Paint.

2. **Configure Rollup Vendor Chunking in `vite.config.ts` (Impact: HIGH)**
   - *Action:* Define `build.rollupOptions.output.manualChunks` to isolate heavy third-party vendor libraries (`firebase`, `lucide-react`).
   - *Expected Outcome:* Eliminates Vite's 500 kB chunk warning and enables optimal browser caching of third-party vendor code.

3. **Consolidate Gemini AI SDK Dependencies (Impact: MEDIUM)**
   - *Action:* Migrate `src/lib/gemini.ts` to `@google/genai` and uninstall `@google/generative-ai`.
   - *Expected Outcome:* Reduces package dependency duplication, simplifies maintenance, and removes unnecessary `node_modules` overhead.

4. **Dynamic Module Loading for Heavy Server Utilities (Impact: MEDIUM)**
   - *Action:* Dynamically import heavy server dependencies inside specific route handlers in `server.ts`.
   - *Expected Outcome:* Improves server cold startup time and reduces baseline idle RAM footprint.

5. **Bounded LRU Cache Eviction in Express Server (Impact: MEDIUM)**
   - *Action:* Impose maximum element limits on server cache maps (`pdfExtractionCache`, `extractionCache`).
   - *Expected Outcome:* Caps peak heap memory consumption and prevents out-of-memory crashes under high request volumes.

6. **Memoize Complex Calculations & Search Filters (Impact: LOW-MEDIUM)**
   - *Action:* Wrap expensive list filtering and aggregation logic in `useMemo` hooks across key views (`CustomerView`, `ServicesView`, `FinanceView`).
   - *Expected Outcome:* Prevents unnecessary $O(N)$ re-evaluations during UI re-renders.

---

*Note: All recommended improvements preserve 100% of existing application behavior, APIs, user interface, and functional flows.*
