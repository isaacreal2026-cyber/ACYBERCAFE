# Code Quality & Technical Debt Report

This report evaluates the current codebase design, complexity, architecture, patterns, documentation, and technical debt across all major modules. It recommends only **near-zero risk** improvements that align with safety requirements and have zero potential for regression.

---

## 1. Duplicated Logic

### 1.1. Stream Redirection & Pipe Fallback Handler Block
In `server.ts`, several streaming fallback branches inside the `/api/yt/stream` route repeat near-identical streaming logic using `pipeStreamWithRedirects`:
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
- **Locations:** `server.ts` lines `1938`, `1968`, `2001`, `2028`, `2059`, `2095`, and `2125`.
- **Risk Profile:** Harmless runtime behavior, but increases maintenance overhead when adjusting default streaming headers or redirect depths.
- **Near-Zero Risk Recommendation:** Wrap the stream execution call in a helper function `streamFallbackUrl(targetUrl: string, res: Response, range?: string)` within `server.ts` without altering the fallback order or response structures.

### 1.2. Download Anchor Element Creation in Client Components
In `src/components/CodeView.tsx` (line 227) and `src/components/DocsView.tsx` (lines 114 and 187), programmatic link download creation is duplicated:
```typescript
const a = document.createElement("a");
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
a.remove();
```
- **Risk Profile:** Purely stylistic repetition of browser DOM manipulation.
- **Near-Zero Risk Recommendation:** Extract a shared helper function `triggerFileDownload(url: string, filename: string)` in a helper module for component reuse.

---

## 2. Complex Functions

### 2.1. Server Media Stream Proxy Handler (`/api/yt/stream` in `server.ts`)
The streaming handler in `server.ts` (spanning lines 1883 to 2145) manages 6 distinct extraction strategies sequentially (Cache, local `yt-dlp`, Cobalt API, Invidious Node, Piped Node, and `@distube/ytdl-core`).
- **Risk Profile:** High cognitive complexity and long function signature.
- **Near-Zero Risk Recommendation:** Keep existing extraction logic intact. Optionally extract individual extraction attempt blocks into non-export pure helper functions (`tryCobaltStream`, `tryInvidiousStream`, etc.) within `server.ts`.

### 2.2. Global React State Hook (`src/store/useAppStore.ts`)
`src/store/useAppStore.ts` encapsulates state and action handlers for 15+ sub-domains (Chat, Printing, Tickets, Customers, Notifications, Assets, Financials).
- **Risk Profile:** Centralized state pattern is working smoothly with memoized state getters (`unreadNotifications`, `waitingTickets`, `activeJobs`, `todayRevenue`), but contains many action definitions in a single custom hook.
- **Near-Zero Risk Recommendation:** Maintain the single state interface for component compatibility. Document slice interfaces or group related state actions via comments to improve readability without touching runtime state dispatch.

---

## 3. Large Components

### 3.1. High Line-Count View Components
The following component files exceed 500 lines of code:
1. `src/components/DocsView.tsx` (699 lines): Manages document editing, AI prompt input, canvas previews, and file conversion features.
2. `src/components/SearchEngineView.tsx` (614 lines): Integrates multi-provider search controls, tab switches, and embedded results rendering.
3. `src/components/HelpFaqView.tsx` (571 lines): Contains static embedded category items, search filter inputs, and help modal displays.
4. `src/data/writingTools.ts` (569 lines): Data definition array file containing preset writing templates.

- **Risk Profile:** Large file size increases initial file load in IDE and development navigation time.
- **Near-Zero Risk Recommendation:** Extract static content maps, help FAQ arrays, and template datasets into dedicated JSON or data constant files in `src/data/` without altering component props or JSX structures.

---

## 4. Unused Code & Bundled Artifacts

### 4.1. Large Root Script Artifacts
The root directory contains legacy player scripts:
- `1786313670595-player-script.js` (9,038 lines)
- `1786313670608-player-script.js` (9,038 lines)
- **Risk Profile:** These files are non-imported static script artifacts in the repository.
- **Near-Zero Risk Recommendation:** Safely archive or remove unreferenced player script files if they are not required by static public hosting.

---

## 5. Outdated Patterns

### 5.1. Global Mutable ID Counter in Store
In `src/store/useAppStore.ts` (lines 10-11):
```typescript
let idCounter = 0;
export const generateId = () => `id_${++idCounter}_${Date.now()}`;
```
- **Risk Profile:** Works for client-only state, but mutable module-scoped variables can produce unexpected collisions if store state is reset or standard UUIDs are expected by APIs.
- **Near-Zero Risk Recommendation:** Upgrade `generateId()` to use `window.crypto.randomUUID()` with fallback to timestamp strings, ensuring unique and unpredictable ID generation across re-renders.

---

## 6. Missing Documentation

### 6.1. AI Helper Module Annotations (`src/lib/gemini.ts`)
Functions such as `chatWithGemini` and `analyzeImage` in `src/lib/gemini.ts` handle Gemini API interactions but lack JSDoc comments describing parameters, fallback behaviors, and return schemas.
- **Risk Profile:** Purely documentation-level omission.
- **Near-Zero Risk Recommendation:** Add comprehensive JSDoc annotations outlining parameter types, error handling contracts, and return structures for developer clarity.

---

## 7. Technical Debt

### 7.1. In-Memory Caches & Process State (`server.ts`)
In-memory structures (`extractionCache`, `extractRateLimits`) are maintained directly in process memory in `server.ts`.
- **Risk Profile:** Optimal for single-instance deployments, but requires external store migration (e.g., Redis) if horizontal scaling across multiple Node cluster workers is implemented in the future.
- **Near-Zero Risk Recommendation:** Maintain in-memory maps while documenting scale-out guidelines in operational documentation.

---

*Report prepared by Jules - Tech Lead.*
