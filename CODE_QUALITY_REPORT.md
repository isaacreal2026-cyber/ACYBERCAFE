# Code Quality & Technical Debt Report

This report presents a thorough evaluation of the codebase design, complexity, architecture, patterns, documentation, and technical debt. As requested, no refactoring was applied; only **near-zero risk** improvements are recommended.

---

## 1. Duplicated Logic

### 1.1. Stream Pipe & Proxy Redirection Pattern
- **File:** `server.ts` (lines ~1920 to ~2130)
- **Finding:** In the media streaming routes (`/api/yt/stream`), multiple sequential fallback handlers (Cobalt, Invidious, Piped, ytdl-core fallback) repeat identical stream piping error-handling and header piping blocks:
  ```typescript
  await pipeStreamWithRedirects(
    targetStreamUrl,
    res,
    req.headers.range,
    4,
    0,
    defaultContentType
  );
  return;
  ```
- **Near-Zero Risk Recommendation:** Extract a helper function `proxyStreamToResponse(targetUrl, res, rangeHeader, contentType)` to standardize response stream piping without altering stream execution behavior.

### 1.2. Programmatic Download Link Creation
- **Files:** `src/components/SearchEngineView.tsx` and `src/components/GlobalSearch.tsx`
- **Finding:** DOM anchor creation for file downloads is duplicated across components:
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
- **Near-Zero Risk Recommendation:** Move this DOM snippet to a shared utility function `downloadFile(url: string, filename: string)` inside `src/utils/download.ts`.

---

## 2. Complex Functions

### 2.1. Server Streaming Orchestrator `/api/yt/stream`
- **File:** `server.ts`
- **Finding:** The media stream endpoint handler is a multi-hundred-line monolithic arrow function handling cache checking, rate limits, socket connection limits, dynamic headers, yt-dlp binary invocation, 4 external API provider fallbacks, and ytdl-core fallbacks all within a single try-catch scope.
- **Near-Zero Risk Recommendation:** Modularize each provider strategy into pure helper functions (`extractWithYtdlp`, `extractWithCobalt`, `extractWithInvidious`, `extractWithPiped`) while retaining the main endpoint handler solely as an orchestrator.

### 2.2. Monolithic Application Store Hook `useAppStore`
- **File:** `src/store/useAppStore.ts`
- **Finding:** `useAppStore` encapsulates state for chat conversations, service tickets, print jobs, transactions, notifications, customer CRM, staff, documents, prompts, and assets within a single custom hook. Any update to any state slice triggers potential re-evaluations for components consuming the store.
- **Near-Zero Risk Recommendation:** Modularize the store state into distinct Zustand slices or localized sub-hooks (e.g., `useTicketStore`, `useChatStore`, `useCRMStore`) to optimize component re-render boundaries.

---

## 3. Large Components

### 3.1. `src/components/DocsView.tsx` (698 lines)
- **Finding:** Combines multiple distinct responsibilities: drag-and-drop document upload, AI chat panel, canvas studio embed, PDF generation form, and markdown parsing.
- **Near-Zero Risk Recommendation:** Break down `DocsView.tsx` into sub-components (`DocUploader.tsx`, `DocChatPanel.tsx`, `DocPdfGenerator.tsx`).

### 3.2. `src/components/SearchEngineView.tsx` (613 lines) and `src/components/HelpFaqView.tsx` (570 lines)
- **Finding:** Large file sizes driven by extensive inline data dictionaries, static SVG icon sets, and fixed help item lists embedded directly inside JSX component rendering trees.
- **Near-Zero Risk Recommendation:** Extract static content maps, FAQ items, and SVG icons into external data files in `src/data/` or `src/components/icons/`.

---

## 4. Unused Code & Package Redundancy

### 4.1. Dual YouTube Extraction Dependencies
- **Files:** `package.json`, `server.ts`
- **Finding:** The project includes both `@distube/ytdl-core` and `youtube-sr` alongside native `yt-dlp` binary support. While functional as multi-tier fallbacks, static imports of heavy extraction packages increase startup footprint.
- **Near-Zero Risk Recommendation:** Maintain dynamic imports (`await import(...)`) inside fallback blocks so heavy libraries are loaded into memory only when lower-level fallbacks fail.

---

## 5. Outdated Patterns

### 5.1. Global Mutable Module Counter for Unique ID Generation
- **File:** `src/store/useAppStore.ts`
- **Finding:**
  ```typescript
  let idCounter = 0;
  export const generateId = () => `id_${++idCounter}_${Date.now()}`;
  ```
  Using module-scoped mutable state like `idCounter` can risk non-unique or unpredictable IDs in concurrent SSR or dynamic module re-evaluations.
- **Near-Zero Risk Recommendation:** Replace custom counter-based ID generators with standard browser/Node native `crypto.randomUUID()`.

---

## 6. Missing Documentation

### 6.1. AI Helper Library `src/lib/gemini.ts`
- **File:** `src/lib/gemini.ts`
- **Finding:** Key exported functions (`generateWithGemini`, `chatWithGemini`, `hasGeminiKey`) lack JSDoc docstrings explaining parameters, expected return structure, system context defaults, and fallback simulation behavior.
- **Near-Zero Risk Recommendation:** Add comprehensive JSDoc annotations to `src/lib/gemini.ts` for improved developer ergonomics and IDE auto-completion clarity.

---

## 7. Technical Debt

### 7.1. In-Memory Caching & Local Rate Limiting
- **File:** `server.ts`
- **Finding:** `extractionCache` and `extractRateLimits` are maintained in node process memory (`Map`). Process restarts invalidate cache state, and memory will scale linearly with unique video IDs unless bounded strictly.
- **Near-Zero Risk Recommendation:** Add an explicit TTL-based automatic eviction policy for expired keys, and document Redis/Memcached as the production upgrade path for multi-instance deployments.

---

*Report generated by Jules - Technical Audit Lead.*
