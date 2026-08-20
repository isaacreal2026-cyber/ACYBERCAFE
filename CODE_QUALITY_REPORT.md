# Code Quality & Technical Debt Review Report

This report provides a comprehensive, low-risk evaluation of the codebase quality, covering complexity, architectural patterns, duplication, documentation, and technical debt. All recommended improvements carry **near-zero risk** and maintain existing external behavior, API contracts, and user functionality.

---

## 1. Duplicated Logic

### 1.1. Media Stream Piping and Redirection Logic
- **Location:** `server.ts` (lines ~1920–2120)
- **Observation:** The pattern invoking `pipeStreamWithRedirects(targetStreamUrl, res, req.headers.range, 4, 0, defaultContentType)` is repeated across multiple fallback branches (Local yt-dlp, Cobalt, Invidious, Piped, and @distube/ytdl-core).
- **Near-Zero Risk Recommendation:** Extract a lightweight helper function `streamResolvedUrl(res, req, targetUrl, contentType)` to standardize header setting and error handling across stream proxy branches without altering request/response behavior.

### 1.2. Client-Side Anchor Download Automation
- **Location:** `src/components/SearchEngineView.tsx`, `src/components/DocsView.tsx`, and `src/components/GlobalSearch.tsx`
- **Observation:** Programmatic file download via temporary anchor element creation (`document.createElement('a')`, setting `href`, `download`, `target`, appending to DOM, clicking, and removing) is duplicated across several components.
- **Near-Zero Risk Recommendation:** Extract a shared helper function `triggerFileDownload(url: string, filename: string)` in `src/utils/download.ts` to unify client file downloads across views.

### 1.3. In-Memory Rate Limiting Routines
- **Location:** `server.ts`
- **Observation:** `streamRateLimits` and `extractRateLimits` maintain identical Map-based tracking and 60-second cleanup timers (`setInterval(() => map.clear(), 60000)`).
- **Near-Zero Risk Recommendation:** Standardize with a small utility class or helper function `createRateLimiter(windowMs, maxRequests)` to manage rate limit Maps cleanly.

---

## 2. Complex Functions

### 2.1. Media Stream Route Handler (`/api/yt/stream`)
- **Location:** `server.ts`
- **Observation:** The route handler manages stream caching, rate limiting, header forwarding, five sequential fallback extraction strategies, and HTTP response piping in a single large function.
- **Near-Zero Risk Recommendation:** Encapsulate individual extraction strategies into distinct, pure helper functions (e.g., `tryExtractLocalYtdlp`, `tryExtractCobalt`, `tryExtractInvidious`, `tryExtractPiped`). Keep the main route handler as a clear orchestrator.

### 2.2. Unified Store `sendMessage` Action
- **Location:** `src/store/useAppStore.ts`
- **Observation:** Handles optimistic conversation updating, title truncation, provider mapping, HTTP fetch dispatching to `/api/generate`, response parsing, and error fallback within a single callback.
- **Near-Zero Risk Recommendation:** Separate API network calls into a dedicated service layer function `fetchAiGeneration(prompt, provider, model)` and keep `sendMessage` focused on React store state updates.

### 2.3. Search Engine Execution Logic (`handleSearch` & `searchMedia`)
- **Location:** `src/components/SearchEngineView.tsx`
- **Observation:** `handleSearch` and `searchMedia` manage regex video URL detection, backend extraction timeouts, and multi-provider searches across YouTube, Internet Archive, Jamendo, and Freesound.
- **Near-Zero Risk Recommendation:** Separate search provider adapters into distinct module functions (e.g., `fetchArchiveMedia`, `fetchJamendoMedia`) to simplify error tracking and readability.

---

## 3. Large Components

### 3.1. `src/components/DocsView.tsx` (698 lines)
- **Observation:** Contains file upload drag-and-drop state, mock response dictionaries (`DOC_RESPONSES`), PDF generator, PDF editor, and complex ReactMarkdown custom component trees.
- **Near-Zero Risk Recommendation:** Split into smaller presentation subcomponents:
  - `DocToolsSidebar.tsx` (tool list and upload dropzone)
  - `DocChatMessages.tsx` (Markdown message bubble list)
  - Extract static `DOC_RESPONSES` to `src/data/docResponses.ts`.

### 3.2. `src/components/SearchEngineView.tsx` (613 lines)
- **Observation:** Embeds API keys, external endpoint constants, audio/video player markup, and search result card rendering logic.
- **Near-Zero Risk Recommendation:** Extract media card item renderers into `MediaResultCard.tsx` and `PdfResultCard.tsx`.

### 3.3. `src/components/HelpFaqView.tsx` (570 lines)
- **Observation:** Houses static FAQ data arrays, service guides arrays, search filtering UI, support ticket form, and keyboard shortcut settings.
- **Near-Zero Risk Recommendation:** Move static `faqs` and `guides` data arrays to `src/data/faqData.ts` to trim component file size by ~200 lines.

---

## 4. Unused Code & Cleanliness

### 4.1. Unused Placeholders and Dormant Branches
- **Location:** `src/components/SearchEngineView.tsx`
- **Observation:** `API_KEYS.FREESOUND_API_KEY` and `API_KEYS.JAMENDO_CLIENT_ID` default placeholders trigger conditional checks that evaluate to false during standard execution.
- **Near-Zero Risk Recommendation:** Document environment variable expectations clearly or move placeholders to environment variable configuration.

### 4.2. Import Formatting
- **Location:** `src/components/HelpFaqView.tsx`
- **Observation:** Trailing comma in import list `import { Customer, } from '../types';`.
- **Near-Zero Risk Recommendation:** Clean up import formatting.

---

## 5. Outdated Patterns

### 5.1. Global Mutable ID Counter
- **Location:** `src/store/useAppStore.ts`
- **Observation:** Uses module-scoped `let idCounter = 0; export const generateId = () => ...`.
- **Near-Zero Risk Recommendation:** Upgrade to `crypto.randomUUID()` or `nanoid` for globally unique ID generation without mutable module state.

### 5.2. Untyped `import.meta.env` Access
- **Location:** `src/lib/gemini.ts` and `src/components/SearchEngineView.tsx`
- **Observation:** Accesses environment variables via `(import.meta as any).env.VITE_...`.
- **Near-Zero Risk Recommendation:** Add interface declarations in `src/vite-env.d.ts` for type-safe environment variable access.

### 5.3. Fixed Timeout Blob URL Revocation
- **Location:** `src/components/SearchEngineView.tsx`
- **Observation:** `setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)` uses arbitrary timing.
- **Near-Zero Risk Recommendation:** Use requestAnimationFrame or trigger object URL revocation after element unmount.

---

## 6. Missing Documentation

### 6.1. Gemini SDK Wrapper Utility (`src/lib/gemini.ts`)
- **Observation:** Core exported functions (`generateWithGemini`, `chatWithGemini`, `hasGeminiKey`) lack JSDoc headers explaining parameters, return types, and fallback behavior.
- **Near-Zero Risk Recommendation:** Add detailed JSDoc function headers.

### 6.2. Backend AI Routers (`src/server/agent.ts` & `src/server/pdf-ai.ts`)
- **Observation:** Route handlers lack request body payload schema descriptions and expected response type documentation.
- **Near-Zero Risk Recommendation:** Add OpenAPI or JSDoc route annotations.

---

## 7. Technical Debt

### 7.1. In-Memory State Caching & Rate Limiting
- **Location:** `server.ts`
- **Observation:** Caches (`extractionCache`, `pdfExtractionCache`) and rate limits are stored purely in process memory without Redis persistence, meaning state is lost on server restart or across clustered processes.
- **Near-Zero Risk Recommendation:** Maintain current in-memory implementation for single-node development, but document Redis migration path for production scaling.

### 7.2. Monolithic Application Store Hook
- **Location:** `src/store/useAppStore.ts`
- **Observation:** Combines state for all operational modules (chat, customers, tickets, print jobs, staff, finance, notifications, documents, prompts, assets) in a single React state hook. Any state modification triggers re-renders across all subscribing views.
- **Near-Zero Risk Recommendation:** Split store into dedicated sub-hooks or Zustand slices (e.g., `useCustomerStore`, `useTicketStore`, `useChatStore`) for better state isolation and performance optimization.

---

*Report prepared by Jules — Senior Software Engineer*
