# Code Quality & Technical Debt Report

This report evaluates the current codebase design, complexity, architecture, patterns, documentation, and technical debt. It presents comprehensive findings across all 7 requested code quality categories along with **near-zero risk** improvement recommendations.

---

## 1. Duplicated Logic

### 1.1. Stream Redirection and Pipe Logic in Express Handlers
In `server.ts`, multiple streaming routes and public fallback branches (e.g., Cobalt, Invidious, Piped, `@distube/ytdl-core` fallback) duplicate stream pipe invocation logic.
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
- **Occurrences:** Found 9 times across streaming handlers in `server.ts`.
- **Impact:** Maintenance overhead when modifying stream response headers, error handlers, or buffer limits.
- **Near-Zero Risk Recommendation:** Create a dedicated helper function `dispatchStreamPipe(url, res, headers, fallbackContentType)` to encapsulate stream routing without altering network behavior.

### 1.2. Programmatic DOM Download Link Creation
Across 5 frontend components (`src/components/SearchEngineView.tsx`, `src/components/CodeView.tsx`, `src/components/DocsView.tsx`, `src/components/GlobalSearch.tsx`, `src/components/WritingView.tsx`), the pattern for initiating browser file downloads is duplicated:
```typescript
const a = document.createElement("a");
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
a.remove();
```
- **Impact:** Minor DRY violation across presentation components.
- **Near-Zero Risk Recommendation:** Extract a shared, pure utility function `triggerFileDownload(url: string, filename: string)` into `src/utils/download.ts`.

---

## 2. Complex Functions

### 2.1. Media Proxy Stream Route `/api/yt/stream`
The primary streaming route in `server.ts` spans hundreds of lines in a single handler function. It handles 5 sequential fallback strategies:
1. Local extraction cache lookup
2. Direct local `yt-dlp` binary execution
3. Cobalt API proxy extraction
4. Invidious instance node extraction
5. Piped instance node extraction
6. Direct `@distube/ytdl-core` stream fallback

- **Impact:** High cognitive load, difficult isolated testing, and potential edge-case bug cascading.
- **Near-Zero Risk Recommendation:** Refactor extraction strategies into separate helper functions (e.g., `extractViaYtdlp`, `extractViaCobalt`, `extractViaInvidious`) that return standardized status results, keeping the endpoint handler as a clean orchestrator.

### 2.2. Monolithic Application State Store (`src/store/useAppStore.ts`)
The custom Zustand-like React state hook `useAppStore` encapsulates state and management logic for 8 disparate domain areas (Chat, Customers, Tickets, Print Jobs, Finance, Services, Government Assets, and Notifications) with 20+ action handlers in one hook.
- **Impact:** Unnecessary component re-renders when unrelated state slices update.
- **Near-Zero Risk Recommendation:** Split into domain-specific state slices using Zustand slice composition (`createChatSlice`, `createCustomerSlice`, `createTicketSlice`), preserving exact hook signatures for backwards compatibility.

---

## 3. Large Components (>300 lines)

The codebase contains several large frontend components and server files exceeding 300 lines of code:
1. `server.ts`: 2,793 lines
2. `src/components/DocsView.tsx`: 698 lines (handles PDF preview, drag-and-drop uploads, AI assistant, layout canvas)
3. `src/components/SearchEngineView.tsx`: 613 lines (combines search controls, result renders, embedded SVGs, download triggers)
4. `src/components/HelpFaqView.tsx`: 570 lines (contains inline static FAQ data arrays and UI rendering)
5. `src/data/writingTools.ts`: 568 lines
6. `src/components/GlobalSearch.tsx`: 495 lines
7. `src/components/AudioView.tsx`: 490 lines
8. `src/components/CodeView.tsx`: 482 lines
9. `src/components/ImageView.tsx`: 468 lines
10. `src/components/Sidebar.tsx`: 391 lines
11. `src/components/VideoView.tsx`: 379 lines
12. `src/components/CyberAgentView.tsx`: 348 lines
13. `src/components/ChatView.tsx`: 330 lines

- **Near-Zero Risk Recommendation:**
  - Separate inline static dataset arrays (e.g. FAQ items in `HelpFaqView.tsx`) into dedicated data files under `src/data/`.
  - Extract repetitive SVG icon groups into `src/components/icons/`.
  - Decompose `DocsView.tsx` into sub-components (`DocUploadZone.tsx`, `DocPreviewPanel.tsx`, `DocAiAssistant.tsx`).

---

## 4. Unused Code & Loose Types

### 4.1. Heavy Any-Type Usage (`: any`)
There are over 100 uses of `: any` throughout the codebase, with 82 occurrences in `server.ts` and 12 in `SearchEngineView.tsx`.
- **Impact:** Reduced TypeScript compile-time safety and loss of IDE autocompletion.
- **Near-Zero Risk Recommendation:** Define strict TypeScript interfaces for API responses (`GeminiApiResponse`, `YtdlpOutput`, `SearchResultItem`) to replace `: any` annotations incrementally without runtime changes.

### 4.2. Overlapping YouTube Dependencies
Both `youtube-sr` and `@distube/ytdl-core` are declared in `package.json` alongside direct `yt-dlp` binary invocation.
- **Impact:** Overhead in package bundle size and cold-start dynamic loading.
- **Near-Zero Risk Recommendation:** Maintain dynamic `import()` calls for media libraries and consider standardizing on `yt-dlp` binary execution for server-side extractions.

---

## 5. Outdated Patterns

### 5.1. Global Mutable Module Counters for Unique IDs
In `src/store/useAppStore.ts` and `src/components/ImageView.tsx`, unique IDs are generated using module-level mutable counters:
```typescript
let idCounter = 0;
export const generateId = () => `id_${++idCounter}_${Date.now()}`;
```
- **Impact:** Potential ID collision or SSR/hydration inconsistencies if state is re-initialized or parallel requests occur.
- **Near-Zero Risk Recommendation:** Use `crypto.randomUUID()` or standard UUID generation, supported natively in modern browsers and Node environments.

---

## 6. Missing Documentation

### 6.1. Undocumented Core Libraries
Key service integration modules lack function-level JSDoc documentation:
- `src/lib/gemini.ts` (`chatWithGemini`, `analyzeImage`)
- `src/lib/firebase.ts` (Firebase Auth initialization and helpers)
- `src/store/useAppStore.ts` (State actions and selectors)

- **Near-Zero Risk Recommendation:** Add comprehensive JSDoc annotations documenting function parameters, return shapes, and potential error conditions.

---

## 7. Technical Debt

### 7.1. In-Memory Rate Limiting and Caches
In `server.ts`, rate limiting and extraction caching rely on in-memory `Map` objects (`extractionCache`, `extractRateLimits`).
- **Impact:** Limits horizontal scaling across multi-instance or clustered server deployments.
- **Near-Zero Risk Recommendation:** Retain existing maps for standalone execution, but introduce an abstract cache interface to seamlessly support Redis backends when scaling horizontally.

### 7.2. Placeholder API Key Middleware
In `server.ts`, the `validateApiKey` middleware currently forwards all requests (`next()`) without checking valid API key headers.
- **Impact:** Unauthenticated access to server endpoints if exposed publicly without reverse-proxy authentication.
- **Near-Zero Risk Recommendation:** Enforce environment variable checks (`PROCESS.env.API_KEY`) when authentication headers are required.

---

*Report compiled by Jules — Code Quality Review.*
