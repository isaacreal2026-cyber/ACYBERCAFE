# Comprehensive Predictive Maintenance & Risks Report (12-Month Outlook)

This report provides a thorough, technical 12-month outlook on potential failure points, dependency risks, architectural growth bottlenecks, and maintenance challenges for the **CyberPlus** platform.

All recommendations outlined in this report are preventative in nature. No working application code has been modified.

---

## 1. Framework Updates

### 1.1 React 19 (`react` v19.2.6, `react-dom` v19.2.6)
* **Predicted Issue:**
  - React 19 enforces strict async transitions, deprecates legacy callback refs, and enforces stricter hydration checks when server-rendered HTML mismatches client DOM.
  - Third-party UI components (e.g., legacy markdown renderers or syntax highlighters) that rely on un-memoized DOM mutations during render phases may throw runtime hydration errors or warning cascades under React 19 Strict Mode.
* **Preventative Recommendations:**
  - Standardize state updater callbacks in `src/store/useAppStore.ts` using functional state update patterns (`setServiceTickets(prev => ...)`).
  - Wrap dynamically imported React components in explicit `<Suspense fallback={...}>` boundaries with error boundaries (`ErrorBoundary`).
  - Audit custom hooks to ensure no direct DOM manipulation occurs inside render logic.

### 1.2 Tailwind CSS v4 (`tailwindcss` v4.1.17, `@tailwindcss/vite` v4.1.17)
* **Predicted Issue:**
  - Tailwind CSS v4 moves away from JavaScript-based configuration (`tailwind.config.js`) toward CSS-native `@theme` declarations.
  - Future minor v4 releases will deprecate legacy utility classes and JavaScript plugin extensions (`@tailwindcss/forms`, `@tailwindcss/typography`).
* **Preventative Recommendations:**
  - Define custom theme tokens (colors, font scales, breakpoints) directly in `src/index.css` using CSS variables and `@theme` directives.
  - Avoid creating external `tailwind.config.js` files that conflict with `@tailwindcss/vite`.

### 1.3 Vite 7 (`vite` v7.3.2, `@vitejs/plugin-react` v5.1.1)
* **Predicted Issue:**
  - Vite 7 targets ES2022+ module output and strict ES module (ESM) resolution.
  - Legacy CommonJS import patterns or ambient environment variable access will throw build-time errors in future Vite releases.
* **Preventative Recommendations:**
  - Maintain explicit Rollup chunk splitting in `vite.config.ts` (`manualChunks`) to keep core client JS bundles under 350kB.
  - Ensure all environment variable references strictly use `import.meta.env` rather than Node-style global checks in frontend code.

### 1.4 Express 5 (`express` v5.2.1)
* **Predicted Issue:**
  - Express 5 uses `path-to-regexp` v8 for route matching. Catch-all wildcard syntax like `app.get("*all", ...)` in `server.ts` will throw `TypeError` route parsing errors in future Express 5 minor releases.
* **Preventative Recommendations:**
  - Standardize wildcard catch-all route handlers in `server.ts` to use standard Express 5 parameter syntax: `app.get("*", ...)` or `app.get("/:splat*", ...)`.

---

## 2. Dependency Deprecations

### 2.1 Google Gemini SDK Consolidation (`@google/generative-ai` v0.24.1 vs `@google/genai` v2.10.0)
* **Predicted Issue:**
  - `package.json` contains both `@google/generative-ai` and `@google/genai`.
  - Client utility `src/lib/gemini.ts` imports `@google/generative-ai`, while server files (`server.ts`, `src/server/agent.ts`) import `@google/genai`.
  - Google has formally deprecated `@google/generative-ai` in favor of `@google/genai`. Over the next 12 months, legacy REST endpoints used by `@google/generative-ai` will sunset, causing client-side AI calls (`generateWithGemini`, `chatWithGemini`) to fail.
* **Preventative Recommendations:**
  - Refactor `src/lib/gemini.ts` to use `@google/genai` exclusively.
  - Uninstall `@google/generative-ai` from `package.json` to eliminate duplicate package overhead and avoid endpoint sunsetting breakage.

### 2.2 YouTube Extraction & Search Libraries (`@distube/ytdl-core` v4.16.12, `youtube-sr` v4.3.12)
* **Predicted Issue:**
  - YouTube regularly updates its innerTube client player JavaScript, Proof of Origin (PO) tokens, and cipher decryption algorithms.
  - npm packages like `@distube/ytdl-core` and `youtube-sr` break whenever YouTube updates player signatures, resulting in HTTP 410 / HTTP 403 errors on `/api/ytdl-core/info` and `/api/media/search`.
* **Preventative Recommendations:**
  - Retain and harden the standalone `yt-dlp` binary manager (`ensureLocalYtDlpBinary()`) in `server.ts`, as `yt-dlp` is updated far more frequently by its active maintainers.
  - Implement periodic background health checks that test extraction capabilities and automatically fall back to local `yt-dlp` before calling node-level ytdl libraries.

### 2.3 PDF Parsing Library (`pdf-parse` v2.4.5)
* **Predicted Issue:**
  - `pdf-parse` uses an older, unmaintained build of PDF.js that lacks support for PDF 2.0 specs, modern ES module exports, and encrypted document streams.
* **Preventative Recommendations:**
  - Plan migration of PDF text extraction in `src/server/pdf-ai.ts` and `server.ts` to `pdf-lib` or a modern, actively maintained wrapper around `@mozilla/pdfjs-dist`.

### 2.4 Headless Browser Management (`puppeteer` v25.2.1)
* **Predicted Issue:**
  - Puppeteer updates Chromium revisions rapidly. In server/container environments without pinned Chrome binaries or required OS shared libraries (`libnss3`, `libatk-bridge2.0-0`), Puppeteer will fail to launch browser processes (`Failed to launch the browser process!`).
* **Preventative Recommendations:**
  - Configure Puppeteer to utilize system-installed Chromium (`executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'`).
  - Wrap Puppeteer PDF rendering inside isolated worker pools with explicit browser instance reuse and disposal.

---

## 3. Browser Changes

### 3.1 Third-Party Cookie Deprecation & Storage Partitioning (CHIPS / FedCM)
* **Predicted Issue:**
  - Modern browsers (Chrome, Safari, Firefox) are enforcing third-party storage partitioning and blocking third-party cookies in cross-site iFrames.
  - In `src/lib/firebase.ts`, Google authentication via `signInWithPopup` relies on third-party OAuth popups and cross-origin iframe storage access, which will fail or trigger mandatory FedCM (Federated Credential Management) prompts.
* **Preventative Recommendations:**
  - Transition client authentication to redirect-based flows (`signInWithRedirect`) or implement custom backend OAuth token verification.

### 3.2 Media Streaming & HTTP Range Header Strictness
* **Predicted Issue:**
  - Safari 18+ and Chrome 124+ strictly validate HTTP 206 Partial Content responses and CORS headers for `<audio>` and `<video>` elements.
  - Returning wildcard `Content-Range: bytes /*` headers or omitting `Accept-Ranges` headers causes iOS Safari to reject media stream playback.
* **Preventative Recommendations:**
  - Ensure the `/api/yt/stream` route in `server.ts` calculates precise byte ranges for 206 responses, removes wildcard ranges, and supplies explicit CORS headers.

### 3.3 Web App Manifest & PWA Installability Criteria
* **Predicted Issue:**
  - Chromium installability guidelines require PWA manifests to declare an explicit `id`, compliant icons, standardized screenshot aspect ratios, and active service worker registration.
* **Preventative Recommendations:**
  - Update `public/manifest.json` with required PWA metadata fields and register a lightweight service worker for offline caching.

---

## 4. Mobile Compatibility

### 4.1 Dynamic Viewport Height Units on iOS Safari (`100vh` vs `100dvh` / `100svh`)
* **Predicted Issue:**
  - Mobile Safari dynamically expands and contracts address bars during user scrolling.
  - Layouts using fixed CSS height classes like `h-screen` or `min-h-screen` (`100vh`) suffer from layout shifts and clipped action buttons on mobile screens.
* **Preventative Recommendations:**
  - Replace `100vh` styling with CSS dynamic viewport units (`100dvh` / `100svh`) or Tailwind's `h-dvh` / `min-h-dvh` utilities across top-level layout containers.

### 4.2 Touch Target Sizes & WCAG 2.2 Accessibility
* **Predicted Issue:**
  - Mobile accessibility standards (WCAG 2.2 AA) require interactive elements to maintain a minimum touch target area of 44x44px.
  - Dense data tables and icon buttons across view components (`TicketsView`, `POSView`, `CyberAgentView`) may cause accidental touches on mobile touchscreens.
* **Preventative Recommendations:**
  - Audit interactive elements and apply minimum padding (`p-2.5` / `min-h-[44px]`) to all touch targets.

### 4.3 Mobile Device Safe Area Insets
* **Predicted Issue:**
  - Modern smartphones with hardware notches and gesture bars clip top navigation bars and bottom action buttons when running in web-app or PWA modes.
* **Preventative Recommendations:**
  - Add CSS `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` padding utilities to fixed header and bottom navigation containers.

---

## 5. Security Changes

### 5.1 API Key Authorization Placeholder (`validateApiKey`)
* **Predicted Issue:**
  - In `server.ts`, `validateApiKey` is currently a placeholder middleware function that calls `next()` unconditionally.
  - Any unauthenticated external request can invoke backend endpoints (`/api/media/extract`, `/api/generate`, `/api/git`).
* **Preventative Recommendations:**
  - Implement genuine API key validation checking secret headers (`x-api-key`) against environment variables before passing requests to route handlers.

### 5.2 Code Execution Sandboxing in AI Agent (`src/server/agent.ts`)
* **Predicted Issue:**
  - `src/server/agent.ts` executes LLM-generated Node.js code via `execAsync('node /tmp/agent_uploads/agent_script_*.js')`.
  - If prompt injection occurs or malicious code is generated, the Node process executes with full server system privileges.
* **Preventative Recommendations:**
  - Replace direct `node` process execution with a sandboxed JavaScript runtime (such as `isolated-vm` or a restricted child process worker) that restricts filesystem and network access.

### 5.3 Executable Binary Download Integrity (`/tmp/yt-dlp`)
* **Predicted Issue:**
  - `ensureLocalYtDlpBinary()` in `server.ts` downloads an executable binary directly from GitHub releases to `/tmp/yt-dlp` and marks it executable (`chmod +x`) without verifying cryptographic SHA-256 hashes.
* **Preventative Recommendations:**
  - Store expected binary SHA-256 checksums in configuration and verify file integrity prior to execution.

### 5.4 SSRF (Server-Side Request Forgery) Guarding
* **Predicted Issue:**
  - Endpoints `/api/scrape-exams` and `/api/pdf-extract` fetch arbitrary URLs provided in request parameters (`site_url`, `pdf_url`).
  - Attackers could provide internal loopback addresses (`http://127.0.0.1:3000` or `http://169.254.169.254`) to probe internal network services.
* **Preventative Recommendations:**
  - Implement strict URL parsing, scheme restriction (`http:` / `https:`), and IP blocklists to reject requests targeting private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8).

---

## 6. Performance Growth

### 6.1 Server Heap Memory Saturation from In-Memory Caches
* **Predicted Issue:**
  - In-memory maps in `server.ts` (`extractionCache`, `pdfExtractionCache`, `offlineInstances`, `extractRateLimits`, `streamRateLimits`) store data directly in the Node.js process heap.
  - Under sustained traffic, unbounded growth of cache keys could trigger Node.js out-of-memory (OOM) crashes.
* **Preventative Recommendations:**
  - Enforce explicit capacity bounds (e.g., maximum 500 entries) with LRU eviction strategies or back server caches using Redis/Keyv.

### 6.2 Data Volatility from Lack of Database Persistence
* **Predicted Issue:**
  - Client state (`customers`, `tickets`, `transactions`) is stored purely in client memory via Zustand/React state in `useAppStore.ts`.
  - Page reloads or browser restarts clear application data, limiting scaling and multi-user collaboration.
* **Preventative Recommendations:**
  - Integrate a persistent database layer (such as PostgreSQL / SQLite via Prisma or Firestore) backed by IndexedDB client caching.

### 6.3 Client Bundle Expansion
* **Predicted Issue:**
  - Adding feature views without lazy loading increases initial JavaScript bundle size, degrading cold load times on slower mobile connections.
* **Preventative Recommendations:**
  - Ensure non-initial view components in `src/App.tsx` are dynamic imports loaded via `React.lazy` and `<Suspense>`.

---

## 7. Maintenance Costs

### 7.1 Third-Party Scraping Node Volatility
* **Predicted Issue:**
  - YouTube extraction relies on public third-party instances (Cobalt, Invidious, Piped) that frequently go offline, block cloud IP ranges, or modify API schemas.
  - Hardcoded node lists (`baseInstances`, `defaultInstances`) require ongoing manual maintenance as nodes go down.
* **Preventative Recommendations:**
  - Automate node health checking and dynamic discovery using public instance APIs (`api.invidious.io`, `piped-instances.pages.dev`) with automated temporary cooldown rotation.

### 7.2 AI Provider Model Version Deprecations
* **Predicted Issue:**
  - AI providers regularly deprecate specific model identifiers (e.g. `gemini-2.5-flash`, `llama-3.3-70b-versatile`, `gpt-4o`). Hardcoded model strings across codebase files will return 404 errors when model versions sunset.
* **Preventative Recommendations:**
  - Centralize AI model name configuration into environment variables (`MODEL_GEMINI_DEFAULT`, `MODEL_GROQ_DEFAULT`, `MODEL_OPENAI_DEFAULT`).

### 7.3 Absence of Automated Test Suite
* **Predicted Issue:**
  - The repository currently lacks automated unit or integration tests. Every dependency upgrade or feature addition requires manual verification across 20+ feature views.
* **Preventative Recommendations:**
  - Set up Vitest for store and helper unit tests and Playwright for core end-to-end user flow verification.

---

## Summary Preventative Roadmap

| Priority | Category | Preventative Measure | Primary File(s) Affected |
| :--- | :--- | :--- | :--- |
| **High** | Security | Implement real authorization check in `validateApiKey` | `server.ts` |
| **High** | Deprecation | Consolidate Gemini AI SDK to `@google/genai` | `src/lib/gemini.ts`, `package.json` |
| **High** | Security | Sandbox dynamic Node.js script execution | `src/server/agent.ts` |
| **High** | Performance | Enforce bounded LRU limits on in-memory server maps | `server.ts` |
| **Medium** | Mobile | Replace `100vh` CSS classes with `100dvh` / `min-h-dvh` | `src/App.tsx`, `src/index.css` |
| **Medium** | Security | Restrict proxy fetch URLs to prevent SSRF | `server.ts` |
| **Medium** | Maintenance | Centralize AI model identifiers into environment config | `server.ts`, `src/server/agent.ts` |
| **Low** | Testing | Set up Vitest and Playwright automated testing suites | Root config / `package.json` |
