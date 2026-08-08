# Code Quality & Technical Debt Report

This report evaluates the current codebase design, complexity, architecture, patterns, documentation, and technical debt. It recommends only **near-zero risk** improvements that align with safety requirements and have zero potential for regression.

---

## 1. Duplicated Logic

### 1.1. Stream Redirection and Pipe Logic
In `server.ts`, several streaming routing endpoints and public fallbacks (e.g., Cobalt, Invidious, Piped, ytdl-core fallback) contain repeated blocks of stream pipe logic. Specifically, the pattern:
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
occurs at lines `1923`, `1955`, `1986`, `2015`, `2046`, `2080`, and `2110`.
- **Risk Profile:** High duplication across multiple fallback branches.
- **Near-Zero Risk Recommendation:** Encapsulate the wrapper function so that instead of repeating the block, you pass a promise or resolver string to a unified stream router.

### 1.2. Download Attachment Creation in Frontend Views
In `src/components/SearchEngineView.tsx` and `src/components/GlobalSearch.tsx`, a pattern for triggering programmatic link downloads is duplicated:
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
- **Risk Profile:** Harmless but violates DRY principles across search views.
- **Near-Zero Risk Recommendation:** Extract a small helper function `triggerDownload(url: string, filename: string)` inside `src/utils/` to share across client views.

---

## 2. Complex Functions

### 2.1. Server Media Stream Route `/api/yt/stream`
The streaming proxy route handler `/api/yt/stream` in `server.ts` is extremely complex, spanning hundreds of lines. It implements five sequential fallback attempts:
1. Cache lookup
2. Direct local `yt-dlp` extraction
3. Cobalt extraction
4. Invidious Node extraction
5. Piped Node extraction
6. Direct fallback to native `@distube/ytdl-core`

While robust, it manages socket configuration, content headers, rate limits, HTTP status codes, and exceptions in a single giant arrow function.
- **Risk Profile:** High maintenance complexity.
- **Near-Zero Risk Recommendation:** Separate each extraction strategy (e.g., `tryLocalYtdlp`, `tryCobalt`, `tryInvidious`, `tryPiped`) into its own typed helper function. Keep the route handler as an orchestrator.

### 2.2. React State Store `useAppStore.ts`
The custom state hook `useAppStore` in `src/store/useAppStore.ts` encapsulates state for nearly all cyber cafe features including chat, customers, ticketing, print jobs, and finance. It has over 20 functions inside a single hook.
- **Risk Profile:** React re-renders everything registered under this single context/hook whenever any small detail changes.
- **Near-Zero Risk Recommendation:** Divide state slices (e.g., Chat State, CRM/Customer State, Finance State) into distinct hooks, or use Zustand slice patterns to avoid bloated re-render cycles.

---

## 3. Large Components

### 3.1. `src/components/DocsView.tsx` (698 lines)
- **Problem:** Handles multiple concerns: Drag and Drop file uploading, PDF generator, HTML layout parsing, AI Chat window, and Canva-like iframe configurations.
- **Near-Zero Risk Recommendation:** Split `DocsView.tsx` into smaller presentation elements:
  - `DocSidebar.tsx` (tool list and upload zone)
  - `DocChatArea.tsx` (the ReactMarkdown list)
  - `StudioBanner.tsx` (the Canva-like studio link frame)

### 3.2. `src/components/SearchEngineView.tsx` (613 lines) and `src/components/HelpFaqView.tsx` (570 lines)
- **Problem:** Contains large embedded SVG collections, state trees, and static content that never changes.
- **Near-Zero Risk Recommendation:** Extract static content maps, help categories, and SVG sets into JSON mock modules or dedicated asset files inside `src/data/` or `src/components/icons/`.

---

## 4. Unused Code / Dependencies

### 4.1. Dual YouTube packages
- **Problem:** `package.json` specifies both `youtube-sr` and `@distube/ytdl-core` along with local yt-dlp binaries. While they are useful as backups, they represent heavy cold startup latency.
- **Near-Zero Risk Recommendation:** Keep them but ensure they are strictly dynamically imported.

---

## 5. Outdated Patterns

### 5.1. Global mutable counter in Store
```typescript
let idCounter = 0;
export const generateId = () => `id_${++idCounter}_${Date.now()}`;
```
- **Problem:** In React applications, mutable module-scope variables like `idCounter` are vulnerable to race conditions or duplicate IDs upon hydration and server/client state mismatches.
- **Near-Zero Risk Recommendation:** Use `crypto.randomUUID()` which is standard, highly secure, and supported across all modern browsers and Node runtimes.

---

## 6. Missing Documentation

### 6.1. Undocumented Library Files
- **Problem:** Critical files like `src/lib/gemini.ts` contain zero descriptive comments or JSDoc headers for functions interacting with generative models.
- **Near-Zero Risk Recommendation:** Add light JSDoc annotations outlining parameter expectations, return types, and expected exceptions for:
  - `chatWithGemini`
  - `analyzeImage`

---

## 7. Technical Debt

### 7.1. In-Memory Caches and Rate Limiting
In `server.ts`, simple memory structures are used:
```typescript
const extractionCache = new Map<...>();
const extractRateLimits = new Map<...>();
```
- **Problem:** This does not scale horizontally (in clustering or container environments) and grows unboundedly unless manual `setInterval` runs.
- **Near-Zero Risk Recommendation:** Keep them for now as zero-risk, but document that any future scale-out must migrate rate-limiting to Redis or Express Rate Limit middleware.

---

*Report prepared by Jules - Operations Center Tech Lead.*
