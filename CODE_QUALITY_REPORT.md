# Code Quality & Technical Debt Report

This report presents a thorough evaluation of the CyberPlus codebase design, function complexity, component sizing, unused assets, architectural patterns, documentation, and technical debt. All recommended improvements carry **near-zero risk** and maintain existing runtime behavior, public APIs, database structures, and feature flows.

---

## 1. Duplicated Logic

### 1.1 Stream Redirection and Pipe Logic
- **Location:** `server.ts` (lines ~1923, 1955, 1986, 2015, 2046, 2080, 2110)
- **Finding:** Several media proxy and extraction fallbacks (Cobalt, Invidious, Piped, ytdl-core fallback) repeatedly invoke `pipeStreamWithRedirects(targetStreamUrl, res, req.headers.range, 4, 0, defaultContentType)` inside near-identical `try...catch` blocks.
- **Risk Profile:** High repetition across multi-tier proxy routes.
- **Near-Zero Risk Recommendation:** Wrap stream redirection calls in a reusable helper function `handleStreamProxy(res, reqHeaderRange, targetUrl, defaultType)` without altering header handling or stream response piping.

### 1.2 Programmatic DOM Anchor Download Triggering
- **Location:** `src/components/SearchEngineView.tsx` (lines 95, 110, 135) and `src/components/GlobalSearch.tsx` (lines 76, 91, 115)
- **Finding:** Programmatic file downloading via temporary DOM elements `<a href="..." download="...">` is repeated across multiple event handlers:
  ```typescript
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  ```
- **Risk Profile:** Inconvenient code duplication across client views.
- **Near-Zero Risk Recommendation:** Consolidate this logic into a pure utility helper `triggerFileDownload(url: string, filename: string)` inside `src/utils/` to be shared across components.

### 1.3 UI Modal Overlay and Card Layout Structure Duplication
- **Location:** `src/components/ServicesView.tsx`, `src/components/DocumentsView.tsx`, `src/components/HelpFaqView.tsx`
- **Finding:** Identical container structures, modal backdrops (`fixed inset-0 bg-black/50 z-50 flex items-center justify-center`), and action button groupings are declared inline repeatedly across multiple view components.
- **Risk Profile:** UI layout redundancy.
- **Near-Zero Risk Recommendation:** Extract a reusable `<ModalOverlay>` component to unify modal backdrop styling without modifying modal behavior or props.

---

## 2. Complex Functions

### 2.1 Media Stream Route Handler `/api/yt/stream`
- **Location:** `server.ts`
- **Finding:** The primary media streaming endpoint handler `/api/yt/stream` spans several hundred lines and contains sequential multi-level fallbacks (Cache -> `yt-dlp` local binary -> Cobalt API -> Invidious API -> Piped API -> `@distube/ytdl-core` native JS). It mixes URL validation, header parsing, socket timeouts, cache writes, and rate limit checks in a single function.
- **Risk Profile:** Elevated function complexity and maintenance overhead.
- **Near-Zero Risk Recommendation:** Extract each extraction tier into an isolated async resolver (e.g., `resolveLocalYtdlpStream`, `resolveCobaltStream`, `resolveInvidiousStream`) that returns a stream URL or null, leaving the main route handler as a clean pipeline orchestrator.

### 2.2 Global App Store State Handler `useAppStore`
- **Location:** `src/store/useAppStore.ts`
- **Finding:** `useAppStore` acts as a monolithic state container holding 20+ disparate domain actions (customers, tickets, transactions, notifications, AI chat history, system settings, print queue).
- **Risk Profile:** Increased state coupling and potential unnecessary re-renders when unrelated slices update.
- **Near-Zero Risk Recommendation:** Organize state actions into focused sub-slice hooks or domain getters without altering the top-level store interface or component consumer contracts.

### 2.3 Agent Sandbox Script Execution Handler
- **Location:** `src/server/agent.ts` (`/process` POST route)
- **Finding:** Manages file uploads, Sharp image cropping, Gemini prompt engineering, JSON response parsing, dynamic Node script writing to disk, asynchronous child process execution, error catching, and disk cleanup inside a single route handler.
- **Risk Profile:** High responsibility mixing in a single handler.
- **Near-Zero Risk Recommendation:** Isolate the dynamic script execution (`execAsync`) and file cleanup into a helper utility `runSandboxScript(scriptPath, outputPath)`.

---

## 3. Large Components

### 3.1 `server.ts` (2,793 lines)
- **Finding:** Combines Express app initialization, static asset serving, local binary management, media extraction APIs, agent proxy routes, search integrations, and scrapers in a single file.
- **Near-Zero Risk Recommendation:** Move route modules into `src/server/` sub-routers (e.g., `streamRouter.ts`, `searchRouter.ts`) while mounting them seamlessly in `server.ts`.

### 3.2 `src/components/DocsView.tsx` (698 lines)
- **Finding:** Embeds document drag-and-drop file uploaders, PDF rendering controls, Markdown chat interface, and design canvas iframe configurations.
- **Near-Zero Risk Recommendation:** Decompose `DocsView.tsx` into smaller presentation subcomponents:
  - `DocUploader.tsx` (drag-and-drop zone)
  - `DocChatPanel.tsx` (AI conversation history)
  - `DocPreviewArea.tsx` (PDF/document display frame)

### 3.3 `src/components/SearchEngineView.tsx` (613 lines) and `src/components/HelpFaqView.tsx` (570 lines)
- **Finding:** Contain massive static data collections (SVG icon sets, search engine metadata lists, FAQ category structures) directly embedded within the React component render tree.
- **Near-Zero Risk Recommendation:** Move static data arrays and SVG paths to dedicated JSON or asset files (e.g., `src/data/searchEngines.ts`, `src/data/faqContent.ts`).

---

## 4. Unused Code & Redundant Artifacts

### 4.1 Residual Root Build Scripts
- **Location:** `1786313670595-player-script.js` and `1786313670608-player-script.js` in root directory
- **Finding:** Large standalone JavaScript files (9,000+ lines each) present in the repository root that are not imported by `index.html`, `server.ts`, or any frontend module.
- **Near-Zero Risk Recommendation:** Archive or remove root leftover scripts after verifying they are not required for production deployment or automated tests.

### 4.2 Overlapping Extraction Dependencies
- **Location:** `package.json` (`@distube/ytdl-core`, `youtube-sr`, `cheerio`, local `yt-dlp` binary)
- **Finding:** Multiple external packages are installed to handle video metadata and extraction.
- **Near-Zero Risk Recommendation:** Maintain heavy dependencies strictly as dynamic `import()` calls inside route handlers to preserve fast server cold startup times.

---

## 5. Outdated Patterns

### 5.1 Global Mutable ID Counter in Store
- **Location:** `src/store/useAppStore.ts`
  ```typescript
  let idCounter = 0;
  export const generateId = () => `id_${++idCounter}_${Date.now()}`;
  ```
- **Finding:** Uses a module-scoped mutable variable (`idCounter`). In modern React/Node applications, module state counters can lead to hydration mismatches or non-unique IDs upon server restarts or concurrency.
- **Near-Zero Risk Recommendation:** Replace with `crypto.randomUUID()` or standard UUID generation available in all modern browsers and Node environments.

### 5.2 Synchronous File System Operations in Route Handlers
- **Location:** `src/server/agent.ts` and `src/server/pdf-ai.ts` (`fs.existsSync`, `fs.mkdirSync`, `fs.writeFileSync`)
- **Finding:** Synchronous file system calls block the single-threaded Node.js event loop during concurrent requests.
- **Near-Zero Risk Recommendation:** Transition to asynchronous `fs.promises` equivalents (`await fs.promises.access`, `await fs.promises.mkdir`, `await fs.promises.writeFile`) inside async route handlers.

---

## 6. Missing Documentation

### 6.1 AI & Generative Services Interface (`src/lib/gemini.ts`)
- **Finding:** Core Generative AI wrappers (`generateWithGemini`, `chatWithGemini`, `hasGeminiKey`) lack JSDoc headers, argument types, fallback triggers, and error behavior contracts.
- **Near-Zero Risk Recommendation:** Add comprehensive JSDoc comments describing param expectations, model configurations, and fallback behavior.

### 6.2 Express Sub-Routers API Contracts (`src/server/agent.ts`, `src/server/pdf-ai.ts`)
- **Finding:** Endpoint definitions lack documentation on expected request body format (e.g., multipart form parameters) and output JSON schema.
- **Near-Zero Risk Recommendation:** Add concise header comments detailing route purpose, input parameter schema, and expected HTTP responses.

---

## 7. Technical Debt

### 7.1 In-Memory Non-Persistent Caches & Rate Limiters
- **Location:** `server.ts` (`extractionCache = new Map()`, `extractRateLimits = new Map()`)
- **Finding:** Caching and rate limiting rely entirely on in-memory JS Maps without external persistence (such as Redis).
- **Near-Zero Risk Recommendation:** Maintain current in-memory Maps for low complexity, but document the architectural requirement to migrate to Redis or Express Rate Limit middleware when horizontally scaling across multiple worker instances.

### 7.2 In-Memory Frontend Application State
- **Location:** `src/store/useAppStore.ts`
- **Finding:** Customer records, service tickets, financial transactions, and notifications are held in-memory in React state and reset on page reload.
- **Near-Zero Risk Recommendation:** Add non-intrusive optional local storage persistence (`localStorage`) or state sync triggers to prevent inadvertent data reset during page refreshes.

### 7.3 Unenforced API Key Middleware Placeholder
- **Location:** `server.ts` (`validateApiKey`)
- **Finding:** The middleware function `validateApiKey` currently invokes `next()` directly without checking API authorization headers.
- **Near-Zero Risk Recommendation:** Keep as non-blocking for local dev, but document the security requirement to enforce API key validation when deployed to production.

---

*Report prepared by Jules — Senior Operations & Code Quality Engineer.*
