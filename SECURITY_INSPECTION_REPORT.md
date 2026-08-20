# CyberPlus Security Inspection & Audit Report

**Date:** August 2025
**Scope:** Full Application Codebase (`server.ts`, `src/server/agent.ts`, `src/server/pdf-ai.ts`, `src/lib/firebase.ts`, `src/lib/gemini.ts`, `src/lib/proxy.ts`, `src/store/useAppStore.ts`, and React components)
**Objective:** Comprehensive security assessment across 10 targeted security categories with minimal recommended security fixes without modifying application logic.

---

## Executive Summary

A security inspection of the CyberPlus codebase was conducted across 10 security domains:
1. XSS (Cross-Site Scripting)
2. SQL Injection
3. NoSQL Injection
4. CSRF (Cross-Site Request Forgery)
5. Authentication Weaknesses
6. Authorization Bypass
7. Exposed Secrets
8. Unsafe Storage
9. Token Leaks
10. Insecure API Endpoints

The system relies on React 19 for frontend rendering and Express for backend services. Key security strengths include the absence of raw SQL/NoSQL databases (preventing injection vectors), safe React JSX auto-escaping, and command parameterization for Git operations. Primary vulnerabilities stem from placeholder authentication middleware (`validateApiKey`), lack of authorization checks on sensitive backend routes, SSRF potential in scraper/extraction endpoints, and missing URL scheme validation.

---

## Detailed Inspection Findings by Category

### 1. XSS (Cross-Site Scripting)
* **Severity:** Low / Informational
* **Affected Files:** `src/components/ChatView.tsx`, `src/components/CyberAgentView.tsx`, `src/server/pdf-ai.ts`
* **Root Cause Analysis:**
  - Frontend components use standard React 19 JSX interpolation, which automatically escapes rendered variables. `dangerouslySetInnerHTML` or direct `innerHTML` modifications are not used anywhere in `src/`.
  - `react-markdown` is used for rendering AI chat responses without enabling raw HTML execution plugins.
  - In `src/server/pdf-ai.ts`, HTML generated from AI completion prompts is passed to Puppeteer (`page.setContent(htmlContent)`). Although rendered inside a headless browser solely to produce PDF attachments, unescaped prompt text could lead to DOM structure breakage or unexpected rendering.
* **Recommended Minimal Fix:**
  - Sanitize user-provided text inputs before injecting into HTML strings inside Puppeteer PDF generators.

### 2. SQL Injection
* **Severity:** None (N/A)
* **Affected Files:** N/A
* **Root Cause Analysis:**
  - The application does not use a relational database engine (PostgreSQL, MySQL, SQLite, or ORM).
  - All application state is stored in React state in-memory (`src/store/useAppStore.ts`) and server in-memory `Map` objects (`server.ts`).
* **Recommended Minimal Fix:**
  - No fix required. If relational databases are added in future iterations, use parameterized queries or an ORM.

### 3. NoSQL Injection
* **Severity:** None (N/A)
* **Affected Files:** N/A
* **Root Cause Analysis:**
  - No NoSQL databases (MongoDB, Mongoose, DynamoDB, CouchDB) are configured or queried on the server.
  - Firebase JS SDK is utilized exclusively on the client for authentication (`signInWithPopup`, `signOut`).
* **Recommended Minimal Fix:**
  - No fix required.

### 4. CSRF (Cross-Site Request Forgery)
* **Severity:** Medium
* **Affected Files:** `server.ts`, `src/server/agent.ts`, `src/server/pdf-ai.ts`
* **Root Cause Analysis:**
  - Backend API endpoints accept JSON body payloads or query parameters and do not use cookie-based session tracking (`express-session` is absent).
  - However, state-changing POST endpoints (`/api/generate`, `/api/agent/process`, `/api/pdf-ai/generate`, `/api/git`) do not validate request headers (`Origin` or `Referer`) or require CSRF anti-forgery tokens for cross-origin callers.
* **Recommended Minimal Fix:**
  - Enforce request origin validation for cross-origin POST requests or require an authorization header/token on API routes.

### 5. Authentication Weaknesses
* **Severity:** High
* **Affected Files:** `server.ts`
* **Root Cause Analysis:**
  - The backend authentication middleware `validateApiKey` in `server.ts` (lines 1264–1269) is a placeholder function that immediately invokes `next()` without performing key or token validation.
  - Unauthenticated remote clients can make API calls to resource-intensive AI services (`/api/generate`, `/api/agent/process`, `/api/pdf-ai/generate`) and git management endpoints (`/api/git`).
* **Recommended Minimal Fix:**
  - Implement token validation (e.g., verifying Firebase ID tokens or a configured backend secret header) within `validateApiKey`.

### 6. Authorization Bypass
* **Severity:** High
* **Affected Files:** `server.ts`, `src/server/agent.ts`, `src/server/pdf-ai.ts`
* **Root Cause Analysis:**
  - Because endpoint authentication middleware is a no-op, all server routes lack caller role/permission checks.
  - Any connected user or script can execute Git commands (`/api/git`), trigger local agent scripts (`/api/agent/process`), or call paid AI models without verifying if the caller holds administrator or attendant privileges.
* **Recommended Minimal Fix:**
  - Attach authorization checks to sensitive endpoints (specifically restricting `/api/git` and administrative workflows to authorized callers).

### 7. Exposed Secrets
* **Severity:** Low
* **Affected Files:** `src/lib/firebase.ts`
* **Root Cause Analysis:**
  - Firebase configuration in `src/lib/firebase.ts` hardcodes `apiKey: "AIzaSyA21gt4v..."`. While Firebase client keys are public by design, hardcoding keys directly in source code is bad practice.
  - Backend secrets (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `IA_ACCESS_KEY`, `IA_SECRET_KEY`) are properly loaded from `process.env`.
* **Recommended Minimal Fix:**
  - Externalize Firebase client keys to `import.meta.env.VITE_FIREBASE_API_KEY`.

### 8. Unsafe Storage
* **Severity:** Low
* **Affected Files:** `src/server/agent.ts`, `src/server/pdf-ai.ts`, `server.ts`
* **Root Cause Analysis:**
  - Client state stores settings and preferences in LocalStorage via `useAppStore.ts`. No authentication tokens or sensitive user credentials are saved in LocalStorage.
  - On the server, uploaded files are temporarily stored in `/tmp/agent_uploads/` and `uploads/`. Files are deleted after processing via `try...finally` or `fs.unlinkSync` blocks.
  - Generated media outputs are saved to `dist/outputs/` and served statically. Filenames use timestamp identifiers (`output_${Date.now()}.pdf`), but lack automated expiration or eviction policies.
* **Recommended Minimal Fix:**
  - Implement a scheduled background job (`setInterval`) to clean up files in `dist/outputs/` older than 24 hours.

### 9. Token Leaks
* **Severity:** Medium
* **Affected Files:** `src/server/pdf-ai.ts`
* **Root Cause Analysis:**
  - Endpoints `/api/pdf-ai/generate` and `/api/pdf-ai/edit` allow clients to supply an `apiKey` in the request body (`req.body.apiKey`). If sent over unencrypted HTTP, request bodies could be logged by intermediate proxies.
  - No authentication tokens or secret keys are exposed in URL query strings or server log outputs.
* **Recommended Minimal Fix:**
  - Require server-side environment variables (`process.env.OPENAI_API_KEY`) for AI API calls instead of receiving client keys in request bodies, or enforce HTTPS TLS transport.

### 10. Insecure API Endpoints
* **Severity:** High
* **Affected Files:** `server.ts`
* **Root Cause Analysis:**
  - SSRF Vulnerability in `/api/scrape-exams` (`req.query.site_url`) and `/api/pdf-extract` (`req.body.pdf_url`): User-supplied URLs are fetched or navigated to via Puppeteer/`fetch` without checking the URL scheme (`http:`/`https:`) or blocking internal loopback/private addresses (`127.0.0.1`, `localhost`, `169.254.169.254`).
  - `/api/git` command execution: Uses a command whitelist (`status`, `log`, `pull`, `push`, `commit`, `add`) and array parameter escaping, but is exposed without route authentication.
* **Recommended Minimal Fix:**
  - Validate URL schemes (`http:` and `https:`) and block private IP address ranges on all scraping/extraction endpoints.
  - Require strict authorization on `/api/git`.

---

## Summary of Minimal Security Recommendations

| Category | Finding | Severity | Minimal Security Fix |
| :--- | :--- | :--- | :--- |
| **XSS** | Prompt interpolation in Puppeteer PDF HTML | Low | Escape user inputs when rendering raw HTML for Puppeteer. |
| **SQL Injection** | No SQL database used | None | N/A |
| **NoSQL Injection** | No NoSQL database used | None | N/A |
| **CSRF** | Missing origin validation on state-changing POSTs | Medium | Validate `Origin` / `Referer` headers for POST API requests. |
| **Authentication** | `validateApiKey` is a no-op placeholder | High | Implement Firebase ID token or API key validation in `validateApiKey`. |
| **Authorization** | Missing role checks on sensitive routes | High | Enforce permission/role validation on administrative endpoints like `/api/git`. |
| **Exposed Secrets** | Hardcoded Firebase config in client code | Low | Move Firebase client config to `import.meta.env.VITE_FIREBASE_*`. |
| **Unsafe Storage** | `dist/outputs/` files accumulate on disk | Low | Add periodic scheduled eviction for static output files > 24 hours. |
| **Token Leaks** | Optional client key transmission in body | Medium | Rely on server-managed `process.env` API keys rather than request bodies. |
| **Insecure Endpoints** | Missing scheme/IP validation on URL scrapers | High | Validate URL scheme (`http:`/`https:`) and filter private IPs on extraction routes. |

---

## Verification & Build Compliance

All findings were verified against current source files without modifying application logic.
