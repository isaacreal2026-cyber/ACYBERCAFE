# Code Quality & Technical Debt Audit Report

This report provides a comprehensive review of code quality across the codebase. It covers:
1. **Duplicated Logic**
2. **Complex Functions**
3. **Large Components**
4. **Unused Code & Artifacts**
5. **Outdated Patterns**
6. **Missing Documentation**
7. **Technical Debt**

All recommended improvements are evaluated to ensure **near-zero risk**, maintaining absolute stability, backwards compatibility, and zero functional regression.

---

## 1. Duplicated Logic

### 1.1. Stream Redirection and Pipe Logic (`server.ts`)
In `server.ts` (lines 1923, 1955, 1986, 2015, 2046, 2080, and 2110), the streaming proxy handler contains identical stream piping logic across seven distinct fallback branches:
```typescript
await pipeStreamWithRedirects(
  targetStreamUrl,
  res,
  req.headers.range,
  4,
  0,
  defaultContentType
);
```
- **Affected File:** `server.ts` (lines 1920–2130)
- **Impact:** Repeated error catching and stream forwarding parameters increase maintenance overhead when stream handling logic changes.
- **Near-Zero Risk Recommendation:** Extract a helper method `streamToClient(targetUrl: string, res: Response, rangeHeader?: string, contentType?: string)` in `server.ts` to centralize stream forwarding calls.

### 1.2. DOM Anchor Download Logic (`src/components/SearchEngineView.tsx` & `src/components/GlobalSearch.tsx`)
In `SearchEngineView.tsx` (lines 95, 110, 135) and `GlobalSearch.tsx` (lines 76, 91, 115), programmatic file download anchor creation is repeated 6 times:
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
- **Affected Files:** `src/components/SearchEngineView.tsx`, `src/components/GlobalSearch.tsx`
- **Impact:** Duplicated imperative DOM logic across search components.
- **Near-Zero Risk Recommendation:** Move this snippet to a shared utility function `triggerFileDownload(url: string, filename: string)` inside `src/utils/download.ts`.

### 1.3. Ticket Status Update & Notification Dispatches (`src/store/useAppStore.ts`)
When updating ticket statuses, adding service tickets, or creating print jobs in `useAppStore.ts`, notification object creation is duplicated with minor variations:
```typescript
setNotifications(prev => [{
  id: generateId(),
  title: '...',
  message: '...',
  type: 'info' | 'success',
  read: false,
  createdAt: new Date(),
}, ...prev]);
```
- **Affected File:** `src/store/useAppStore.ts` (lines 200–240)
- **Impact:** Notification creation structure is re-written in multiple callbacks.
- **Near-Zero Risk Recommendation:** Add an internal helper `pushNotification(title, message, type)` inside `useAppStore.ts`.

---

## 2. Complex Functions

### 2.1. Media Streaming Handler `/api/yt/stream` (`server.ts`)
The streaming route handler `/api/yt/stream` in `server.ts` spans ~300 lines and orchestrates 6 fallback mechanisms:
1. Extraction cache check
2. Direct stream detection
3. Local `yt-dlp` execution
4. Cobalt proxy API lookup
5. Invidious / Piped Node fallback
6. `@distube/ytdl-core` stream fallback

- **Affected File:** `server.ts` (lines ~1880–2150)
- **Impact:** High cognitive complexity, deeply nested `try...catch` blocks, and mixed socket event listeners.
- **Near-Zero Risk Recommendation:** Decompose each extraction fallback into isolated helper functions (`tryCachedStream`, `tryDirectStream`, `tryLocalYtdlpStream`, `tryThirdPartyStream`), leaving the route handler as a clean orchestrator pipeline.

### 2.2. Monolithic Application Store Hook `useAppStore()` (`src/store/useAppStore.ts`)
The `useAppStore` hook manages state for all 24 application views, defining 20+ functions and state updates within a single functional component scope.
- **Affected File:** `src/store/useAppStore.ts` (lines 100–290)
- **Impact:** Any component invoking `useAppStore()` re-evaluates all state actions upon any state mutation.
- **Near-Zero Risk Recommendation:** Annotate store selectors or decompose state into focused sub-hooks (e.g. `useTicketStore`, `useChatStore`, `useCustomerStore`) while maintaining a unified wrapper hook for backwards compatibility.

### 2.3. AI Assistance Handler `chatWithGemini` (`src/lib/gemini.ts`)
Handles client initialization, prompt formatting, chat history slicing, API call execution, and manual fallback generation.
- **Affected File:** `src/lib/gemini.ts` (lines 27–52)
- **Impact:** Mixed responsibilities (API orchestration vs mock fallback generation).
- **Near-Zero Risk Recommendation:** Separate the AI API client call from the offline fallback mock router into `geminiApi.ts` and `geminiFallback.ts`.

---

## 3. Large Components

### 3.1. `server.ts` (2,793 lines)
- **Problem:** Functions as a monolithic entry point combining express middleware, YouTube extractors, streaming proxies, static file serving, scrape routers, rate limiters, and uncaught exception handlers.
- **Near-Zero Risk Recommendation:** Modularize route groups into dedicated Express routers under `src/server/` (e.g. `src/server/yt.ts`, `src/server/scrape.ts`, `src/server/git.ts`), following the existing pattern used by `src/server/agent.ts` and `src/server/pdf-ai.ts`.

### 3.2. `src/components/DocsView.tsx` (698 lines)
- **Problem:** Handles drag-and-drop file uploading, HTML parsing, PDF document creation, AI chat window, and design studio iframe integration.
- **Near-Zero Risk Recommendation:** Extract sub-components: `DocsEditorToolbar.tsx`, `DocsChatSidebar.tsx`, `DocsPdfGenerator.tsx`.

### 3.3. `src/components/SearchEngineView.tsx` (613 lines) & `src/components/HelpFaqView.tsx` (570 lines)
- **Problem:** Embedded static datasets (search templates, SVG icon definitions, FAQ lists) mixed directly inside rendering functions.
- **Near-Zero Risk Recommendation:** Move static data objects into `src/data/searchCategories.ts` and `src/data/faqContent.ts`.

### 3.4. Static Artifact Files (`1786313670595-player-script.js` & `1786313670608-player-script.js`, 9,038 lines each)
- **Problem:** Oversized static scripts present in root directory without clear references in `server.ts` or `index.html`.
- **Near-Zero Risk Recommendation:** Audit usage and document whether these are compiled fallback artifacts or legacy scripts; move to `assets/` or `dist/` if retained.

---

## 4. Unused Code & Dependencies

### 4.1. Dual YouTube Libraries (`package.json`)
- **Problem:** Both `@distube/ytdl-core` and `youtube-sr` are included in `package.json` alongside local `yt-dlp` binary execution.
- **Near-Zero Risk Recommendation:** Maintain dynamic imports (`await import(...)`) inside request handlers to ensure zero impact on cold startup latency.

### 4.2. Standalone Utility Scripts (`fix_ts.sh`, `fix_ts2.sh`, `replace-theme.mjs`)
- **Problem:** Root directory contains single-use helper scripts with no documentation or package.json script references.
- **Near-Zero Risk Recommendation:** Document script purposes in a `scripts/README.md` or archive unused temporary maintenance scripts.

---

## 5. Outdated Patterns

### 5.1. Global Mutable Counter for Unique IDs (`src/store/useAppStore.ts`)
```typescript
let idCounter = 0;
export const generateId = () => `id_${++idCounter}_${Date.now()}`;
```
- **Problem:** Uses a module-scoped mutable counter variable, which can lead to collisions or non-deterministic IDs in testing / SSR environments.
- **Near-Zero Risk Recommendation:** Replace with `crypto.randomUUID()` (supported natively in modern browsers and Node.js 16+).

### 5.2. Imperative DOM Manipulation in React Components
- **Problem:** Components manually append and remove `<a>` elements (`document.body.appendChild(a)`) directly within click handlers.
- **Near-Zero Risk Recommendation:** Encapsulate imperative DOM side effects inside clean helper functions or standard React refs.

---

## 6. Missing Documentation

### 6.1. AI Service Interface (`src/lib/gemini.ts`)
- **Problem:** Functions (`generateWithGemini`, `chatWithGemini`, `hasGeminiKey`) lack JSDoc headers explaining parameters, expected return shapes, and fallback behavior.
- **Near-Zero Risk Recommendation:** Add comprehensive JSDoc comments to all exported functions in `src/lib/gemini.ts`.

### 6.2. App Store State Contracts (`src/store/useAppStore.ts`)
- **Problem:** Actions like `updateTicketStatus` automatically trigger background transactions and notifications, but these side-effects are undocumented in the interface.
- **Near-Zero Risk Recommendation:** Document state actions and side-effects using JSDoc annotations on the return type of `useAppStore`.

---

## 7. Technical Debt

### 7.1. In-Memory State & Rate Limiters
- **Problem:** `extractionCache` and `extractRateLimits` in `server.ts` use in-memory JS `Map` instances without Redis persistence or horizontal clustering support.
- **Near-Zero Risk Recommendation:** Retain in-memory maps for current single-instance deployment, but document scale-out requirements in `SCALABILITY_REPORT.md` for future multi-instance deployments.

### 7.2. Global Store Re-render Overhead
- **Problem:** Because `useAppStore` returns a single flat object created on every render, components listening to store state re-render frequently.
- **Near-Zero Risk Recommendation:** Memoize exported action handlers with `useCallback` (already partially done) and recommend Zustand or React Context selector patterns for future performance refactoring.

### 7.3. Lack of Automated Unit Tests for Business Logic
- **Problem:** Core business logic (ticket state transition rules, revenue calculation, rate limit enforcement) lacks unit test coverage.
- **Near-Zero Risk Recommendation:** Add lightweight Vitest / Jest unit tests targeting `src/store/useAppStore.ts` and core server utility functions.

---

*Report prepared by Jules - Tech Lead.*
