# 12-Month Predictive Maintenance & Risk Report

## Executive Summary

This report presents a 12-month predictive assessment for the CyberPlus platform codebase. The evaluation focuses on identifying latent vulnerabilities, maintenance overheads, architectural bottlenecks, and impending upstream ecosystem changes before they degrade service quality or cause application outages.

### Scope of Analysis
1. **Framework Updates** (React 19, Express 5, Tailwind CSS v4, Vite 7, TypeScript 5.9)
2. **Dependency Deprecations** (Google GenAI SDK fragmentation, `@distube/ytdl-core`, `pdf-parse`, `puppeteer`, `multer`)
3. **Browser Changes** (Storage partitioning/CHIPS, Web Audio autoplay policies, strict MIME & CSP headers)
4. **Mobile Compatibility** (Dynamic viewport height `dvh`, touch passive event listeners, Safari PWA restrictions)
5. **Security Changes** (Bypassed API key validation middleware, shell command sandbox, CORS policies, rate-limiting limits)
6. **Performance Growth** (In-memory application state growth, Node process memory leaks, main event loop starvation)
7. **Maintenance Costs** (YouTube scraping fragility, AI provider schema drift, lack of database persistence)

---

## 1. Framework Updates

### 1.1 React 19 & Client State Integration
- **Timeline**: 1–3 Months
- **Severity**: Medium
- **Root Cause**: `src/App.tsx` and `src/store/useAppStore.ts` rely on synchronous React 18-style client state management. React 19 introduces strict concurrency defaults, hook rules for `useActionState` and `useFormStatus`, and modified ref handling.
- **Predicted Issue**: Components wrapped with `React.lazy` without optimized `<Suspense>` boundary boundaries or using stale closure callbacks inside state setters (`useAppStore`) will encounter subtle re-rendering cascades or state desynchronization under high UI activity.
- **Preventative Work**:
  - Audit custom store hooks in `useAppStore.ts` to ensure state setters always use functional update forms (`set(prev => ...)`).
  - Add explicit error boundaries around lazy-loaded views (`AssetsView`, `CyberAgentView`, `AiServicesView`) to gracefully catch lazy component chunk loading errors without crashing the entire app shell.

### 1.2 Express 5 Route & Middleware Architecture
- **Timeline**: 3–6 Months
- **Severity**: High
- **Root Cause**: `server.ts` uses Express 5 (`^5.2.1`). Express 5 changes query string parsing behavior (using `qs` by default or modified extended options), string wildcard path matching (`*all`), and rejected promise handling in middleware.
- **Predicted Issue**: Deprecated wildcard syntax like `app.get("*all", ...)` in `server.ts` or unhandled rejections inside Express async sub-routers (`src/server/agent.ts`, `src/server/pdf-ai.ts`) will fail to pass errors to global error handlers or cause router mismatches when upgrading Express minor versions.
- **Preventative Work**:
  - Replace wildcard catch-all routes with standardized Express 5 path patterns (e.g., `app.get("*", ...)`).
  - Wrap all async middleware and sub-router handlers in standard `try ... catch` or explicit async error wrapping functions to ensure Express 5 error propagation.

### 1.3 Tailwind CSS v4 Vite Plugin Evolution
- **Timeline**: 6–12 Months
- **Severity**: Low
- **Root Cause**: The project uses `@tailwindcss/vite` (`4.1.17`). Tailwind v4 replaces `tailwind.config.js` with CSS-first configuration and `@import "tailwindcss";` directives.
- **Predicted Issue**: Minor version updates to `@tailwindcss/vite` may alter CSS theme variable injection or cause JIT class generation conflicts with dynamic class generation in components.
- **Preventative Work**:
  - Avoid dynamic string concatenation for Tailwind classes (e.g., `` bg-${color}-500 ``) in components; use complete class literals or lookup maps.

---

## 2. Dependency Deprecations

### 2.1 Dual Google AI SDK Duplication & Deprecation
- **Timeline**: 1–3 Months
- **Severity**: High
- **Root Cause**: `package.json` contains both `@google/genai` (^2.10.0) and legacy `@google/generative-ai` (^0.24.1). `server.ts` and `src/server/agent.ts` use `@google/genai`, whereas `src/lib/gemini.ts` uses `@google/generative-ai`.
- **Predicted Issue**: Google is phasing out `@google/generative-ai` in favor of the official unified `@google/genai` SDK. Having both libraries inflates bundle size, causes configuration confusion, and `@google/generative-ai` will receive deprecation notices or breaking endpoint shifts.
- **Preventative Work**:
  - Standardize all Gemini AI integrations across client and server onto `@google/genai`.
  - Remove `@google/generative-ai` from `package.json` to eliminate library redundancy and bundle bloat.

### 2.2 YouTube Extraction Libraries (`@distube/ytdl-core` & `youtube-sr`)
- **Timeline**: 1–3 Months
- **Severity**: Critical
- **Root Cause**: YouTube continuously updates its JS player ciphers, PO tokens (Proof of Origin), and bot detection heuristics. `server.ts` relies on `@distube/ytdl-core` and `youtube-sr`.
- **Predicted Issue**: Any YouTube cipher update instantly breaks `@distube/ytdl-core` and `youtube-sr` stream resolving, causing 502/500 errors on `/api/media/search` and `/api/yt/stream`.
- **Preventative Work**:
  - Maintain the local standalone compiled `yt-dlp` binary updater process in `ensureLocalYtDlpBinary` as the primary extraction fallback.
  - Implement automated daily binary update checks for `yt-dlp` in background startup routines to ensure instant cipher fix adoption.

### 2.3 `pdf-parse` & Buffer Deprecations
- **Timeline**: 6–12 Months
- **Severity**: Medium
- **Root Cause**: `pdf-parse` (^2.4.5) uses legacy Node.js `Buffer()` constructors and internal bindings that trigger Node 22+ deprecation warnings.
- **Predicted Issue**: Upgrading Node runtime environments will produce verbose runtime deprecation warnings or crash during binary PDF buffer parsing.
- **Preventative Work**:
  - Transition PDF parsing logic in `server.ts` and `src/server/pdf-ai.ts` to modern `pdf-lib` or native PDF extraction utilities.

---

## 3. Browser Changes

### 3.1 Third-Party Cookie & Storage Partitioning (CHIPS / ITP)
- **Timeline**: 3–6 Months
- **Severity**: High
- **Root Cause**: Modern browsers (Safari ITP, Chrome Privacy Sandbox, Firefox ETP) partition `localStorage`, `sessionStorage`, and `indexedDB` per top-level site context.
- **Predicted Issue**: Firebase Authentication state stored in `localStorage` inside embedded iframe contexts or cross-origin popups will fail to sync session state, forcing users to re-authenticate unexpectedly.
- **Preventative Work**:
  - Ensure Firebase Auth is configured with explicit `indexedDB` or in-memory persistence fallback handling in `src/lib/firebase.ts`.
  - Avoid reliance on cross-origin iframe authentication flows.

### 3.2 Web Audio & Media Autoplay Policies
- **Timeline**: 1–3 Months
- **Severity**: Medium
- **Root Cause**: Chrome 125+ and iOS Safari 18 enforce strict user interaction requirements before playing media elements or initializing Web Audio contexts.
- **Predicted Issue**: Media preview audio playback on `/api/yt/stream` will fail silently or throw `NotAllowedError: play() failed because the user didn't interact with the document first`.
- **Preventative Work**:
  - Ensure all HTML5 `<audio>` and `<video>` playback triggers are directly attached to explicit user click event handlers.
  - Catch and handle playback promise rejections gracefully with user-visible "Click to Play" feedback UI indicators.

---

## 4. Mobile Compatibility

### 4.1 Dynamic Viewport Height Shifts (`dvh` / `svh`)
- **Timeline**: 1–3 Months
- **Severity**: Medium
- **Root Cause**: Mobile browsers (Safari on iOS, Chrome on Android) dynamically adjust viewport height when top address bars and bottom navigation bars collapse on scroll.
- **Predicted Issue**: Views using legacy `min-h-screen` (`100vh`) suffer from layout overflow, cutting off primary action buttons or form submit inputs behind mobile browser toolbars.
- **Preventative Work**:
  - Update top-level container layout styles from `min-h-screen` to `min-h-dvh` (dynamic viewport height) across full-height view components.

### 4.2 Touch Event Passive Listener Warnings
- **Timeline**: 3–6 Months
- **Severity**: Low
- **Root Cause**: Mobile Safari and Android Chrome require touch listeners (`touchstart`, `touchmove`) to be passive by default to ensure smooth 60fps scrolling.
- **Predicted Issue**: Scroll blocking or touch gesture warnings in browser console, degrading mobile scroll fluidity.
- **Preventative Work**:
  - Ensure custom touch event listeners pass `{ passive: true }` options when attaching global gesture handlers.

---

## 5. Security Changes

### 5.1 Bypassed API Key Validation Middleware
- **Timeline**: Immediate / 1 Month
- **Severity**: Critical
- **Root Cause**: In `server.ts`, the `validateApiKey` middleware is currently a stub function:
  ```ts
  const validateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return next();
  };
  ```
- **Predicted Issue**: Any unauthenticated client or automated scraper can call high-cost backend endpoints (`/api/media/extract`, `/api/generate`, `/api/ytdl-core/info`, `/api/git`), leading to resource exhaustion, API cost spikes, or unauthorized Git status inspection.
- **Preventative Work**:
  - Implement real header token validation (e.g. `X-API-Key` or Bearer token checks) inside `validateApiKey` with environment variable enforcement (`PROCESS_ENV.API_KEY`).

### 5.2 Command Execution Surface in `/api/git`
- **Timeline**: 1–3 Months
- **Severity**: High
- **Root Cause**: `/api/git` executes commands using `execAsync(`git ${command} ${gitArgs}`)`.
- **Predicted Issue**: Although `command` is restricted to an allowed list (`status`, `log`, `pull`, `push`, `commit`, `add`), unescaped user input in `args` could expose command injection vectors or git option injection (`--exec`, `-C`).
- **Preventative Work**:
  - Replace shell execution (`execAsync`) with `execFileAsync('git', argsArray)` to prevent shell interpolation entirely.

---

## 6. Performance Growth

### 6.1 Unbounded In-Memory Client State
- **Timeline**: 3–6 Months
- **Severity**: High
- **Root Cause**: `src/store/useAppStore.ts` maintains all application data (customers, tickets, transactions, inventory) in React state arrays without pagination or client database indexing.
- **Predicted Issue**: As ticket and transaction counts grow past thousands of records, client memory consumption increases linearly, causing re-render lag during store updates.
- **Preventative Work**:
  - Introduce record caps or local pagination limits for client store arrays.
  - Implement virtualized list rendering for large data tables.

### 6.2 Server Memory Growth & Unbounded Caches
- **Timeline**: 3–6 Months
- **Severity**: High
- **Root Cause**: `server.ts` uses in-memory `Map` instances (`extractionCache`, `pdfExtractionCache`, `offlineInstances`) without explicit maximum size bounds (`maxSize`).
- **Predicted Issue**: Sustained heavy request volume will grow memory usage until the Node process encounters Out-Of-Memory (OOM) termination.
- **Preventative Work**:
  - Implement maximum capacity bounds (e.g., max 500 entries) or use an LRU cache wrapper for all server-side in-memory maps.

---

## 7. Maintenance Costs

### 7.1 YouTube Fallback Node Maintenance
- **Timeline**: Continuous (Ongoing)
- **Severity**: High
- **Root Cause**: `server.ts` maintains lists of hardcoded public Cobalt, Piped, and Invidious instances. Public nodes frequently go offline, get rate-limited, or shut down.
- **Predicted Issue**: Node failures increase latency as requests cycle through dead fallback nodes before succeeding or failing.
- **Preventative Work**:
  - Maintain dynamic instance status caching with automatic health pinging and quick exclusion of unresponsive nodes.

### 7.2 Lack of Persistent Database Storage Layer
- **Timeline**: 6–12 Months
- **Severity**: Critical
- **Root Cause**: Application business records (tickets, transactions, customers) reside in client browser memory and local storage.
- **Predicted Issue**: Clearing browser cache or switching devices results in permanent data loss for users, leading to severe customer dissatisfaction and high support overhead.
- **Preventative Work**:
  - Plan and implement a persistent database layer (e.g. PostgreSQL, Firebase Firestore, or SQLite) for business state persistence.

---

## Summary Matrix of Recommended Preventative Actions

| Domain | Issue Description | Priority | Recommended Preventative Action |
| :--- | :--- | :--- | :--- |
| **Security** | Stubbed `validateApiKey` middleware | Critical | Enforce API key header validation against `process.env.API_KEY`. |
| **Dependency** | YouTube cipher breakages | Critical | Maintain automated `yt-dlp` binary updates in `ensureLocalYtDlpBinary`. |
| **Dependency** | Dual Google AI SDKs | High | Consolidate Gemini calls to `@google/genai` and remove `@google/generative-ai`. |
| **Security** | Shell command execution in `/api/git` | High | Migrate `execAsync` to safe `execFileAsync('git', args)`. |
| **Performance** | Unbounded server cache memory | High | Add capacity caps and eviction bounds to all server `Map` caches. |
| **Mobile** | Viewport height clipping on mobile | Medium | Use `min-h-dvh` CSS utility classes across full-screen layouts. |
| **Maintenance**| Lack of persistent database | High | Introduce persistent server storage for user business data. |
