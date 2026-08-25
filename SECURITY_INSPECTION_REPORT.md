# Comprehensive Security Inspection Report

This security audit evaluates the codebase across ten critical web security categories: **XSS**, **SQL Injection**, **NoSQL Injection**, **CSRF**, **Authentication Weaknesses**, **Authorization Bypass**, **Exposed Secrets**, **Unsafe Storage**, **Token Leaks**, and **Insecure API Endpoints**.

Per instructions, **no application logic has been modified**. Only minimal, high-confidence security fix recommendations are provided.

---

## 1. XSS (Cross-Site Scripting)

- **Status:** Low Risk / Clean (Frontend & Backend)
- **Affected Files:** `src/components/*.tsx`, `src/server/pdf-ai.ts`
- **Findings:**
  - React JSX handles text node encoding automatically across all components, mitigating Reflected and Stored XSS risks. No `dangerouslySetInnerHTML` directives are present in application source code.
  - In `src/server/pdf-ai.ts` (lines `38-40` and `118-120`), AI-generated HTML content is rendered into headless Puppeteer pages (`page.setContent(htmlContent)`). Because this occurs inside a sandboxed headless browser context solely for PDF generation without session cookies or local DOM access, client-side XSS exploitation is non-functional.
- **Root Cause / Context:** Dynamic HTML construction for PDF rendering.
- **Minimal Recommended Fix:** Sanitise AI-generated HTML using `sanitize-html` or `DOMPurify` before passing to `page.setContent()` if untrusted inputs are included.

---

## 2. SQL Injection

- **Status:** Not Applicable (No SQL Database Engine)
- **Affected Files:** N/A
- **Findings:**
  - The application does not connect to or query any relational SQL databases (e.g., PostgreSQL, MySQL, SQLite). Client state is managed in-memory via React state hooks (`src/store/useAppStore.ts`) and temporary server-side caches.
- **Minimal Recommended Fix:** If a relational database is introduced in the future, use parameterized queries or an ORM (e.g., Prisma, Knex) to prevent string interpolation.

---

## 3. NoSQL Injection

- **Status:** Not Applicable (No Document Database Engine)
- **Affected Files:** N/A
- **Findings:**
  - The application does not connect to any NoSQL database engines (e.g., MongoDB, CouchDB).
- **Minimal Recommended Fix:** If MongoDB/Mongoose is integrated in the future, sanitize query inputs against operator injection (`$gt`, `$ne`, `$where`).

---

## 4. CSRF (Cross-Site Request Forgery)

- **Status:** Medium Risk
- **Affected Files:** `server.ts`, `src/server/agent.ts`, `src/server/pdf-ai.ts`
- **Findings:**
  - State-changing API endpoints (`POST /api/media/extract`, `POST /api/git`, `POST /api/generate`, `POST /api/agent/process`, `POST /api/pdf-ai/generate`) rely on JSON body payloads and standard CORS headers. While cross-origin browser requests cannot easily forge arbitrary `application/json` payloads with custom headers, there is no explicit CSRF token protection or Strict `SameSite` cookie policy configured.
- **Root Cause / Context:** Stateless API architecture without CSRF token verification middleware.
- **Minimal Recommended Fix:** For cookie-based authenticated sessions in the future, implement double-submit CSRF tokens or configure `SameSite=Strict` / `SameSite=Lax` cookie attributes.

---

## 5. Authentication Weaknesses

- **Status:** Medium Risk
- **Affected Files:** `server.ts`, `src/lib/firebase.ts`
- **Findings:**
  - In `server.ts` (lines `1280-1285`), the `validateApiKey` middleware is a non-functional placeholder:
    ```typescript
    const validateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      return next();
    };
    ```
    This bypasses API key authentication for protected endpoints such as `/api/media/extract`, `/api/ytdl-core/info`, and `/api/yt-dlp/info`.
  - Frontend client authentication relies on Firebase Auth (`src/lib/firebase.ts`), but server routes do not verify Firebase ID tokens in request headers.
- **Root Cause / Context:** `validateApiKey` middleware allows all incoming requests through without validating credentials.
- **Minimal Recommended Fix:** Update `validateApiKey` to check incoming `x-api-key` or `Authorization: Bearer <token>` headers against `process.env.API_KEY` or Firebase Admin SDK `verifyIdToken()`.

---

## 6. Authorization Bypass

- **Status:** High Risk
- **Affected Files:** `server.ts` (lines `2574-2618`)
- **Findings:**
  - The `/api/git` endpoint accepts arbitrary git subcommands (such as `commit`, `add`, `pull`, `push`, `status`, `log`) from any caller without verifying caller identity or administrative permissions:
    ```typescript
    app.post("/api/git", express.json(), async (req, res) => {
      const { command, args } = req.body;
      ...
    ```
  - Any unauthenticated client can trigger local repository git modifications.
- **Root Cause / Context:** Lack of role-based authorization check on administrative endpoints.
- **Minimal Recommended Fix:** Require administrative authentication (`validateApiKey` or admin role check) prior to executing any `/api/git` command.

---

## 7. Exposed Secrets

- **Status:** Low Risk
- **Affected Files:** `src/lib/firebase.ts`, `firebase-applet-config.json`
- **Findings:**
  - Firebase public configuration parameters (including `apiKey`) are hardcoded in `src/lib/firebase.ts` and `firebase-applet-config.json`.
  - *Note:* Firebase client API keys are designed to be public identifiers for client web apps, provided Firebase Security Rules enforce read/write access controls. However, hardcoding them directly in code makes key rotation more difficult.
- **Root Cause / Context:** Client-side Firebase configuration defaults.
- **Minimal Recommended Fix:** Move Firebase client config options into environment variables (e.g., `VITE_FIREBASE_API_KEY`) loaded from `.env`.

---

## 8. Unsafe Storage

- **Status:** Low Risk / Clean
- **Affected Files:** `src/lib/theme.tsx`
- **Findings:**
  - Browser `localStorage` is used only for persisting user theme preference (`localStorage.getItem('theme')` / `localStorage.setItem('theme', theme)`).
  - No sensitive authentication tokens, passwords, or personally identifiable information (PII) are stored in client-side storage.
- **Minimal Recommended Fix:** Maintain current practice of avoiding sensitive data storage in `localStorage` or `sessionStorage`.

---

## 9. Token Leaks

- **Status:** Low Risk / Clean
- **Affected Files:** `server.ts`, `src/server/agent.ts`
- **Findings:**
  - Backend API integrations with Google Gemini (`@google/genai`), Groq (`groq-sdk`), and OpenAI pass API keys securely via environment variables (`process.env.GEMINI_API_KEY`, `process.env.GROQ_API_KEY`, `process.env.OPENAI_API_KEY`) or request headers.
  - Server logs do not print secret keys or bearer tokens to `console.log`.
- **Minimal Recommended Fix:** Ensure loggers continue to suppress or sanitize request header objects before printing debug messages.

---

## 10. Insecure API Endpoints

- **Status:** Medium Risk
- **Affected Files:** `server.ts` (lines `2394`, `2526`), `src/server/agent.ts` (lines `25`, `133`)
- **Findings:**
  - **Server-Side Request Forgery (SSRF) Risk:** In `server.ts`, endpoints `/api/scrape-exams` (line `2394`) and `/api/pdf-extract` (line `2526`) accept target URLs (`site_url`, `pdf_url`) from client requests and fetch them on behalf of the client. There is no host validation or private IP filtering (e.g., preventing access to `127.0.0.1`, `169.254.169.254`, or internal private subnets `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - **Arbitrary Code Execution in Sandbox:** In `src/server/agent.ts` (line `133`), AI-generated Node.js code is written to a temporary script file and executed via `execAsync('node ' + scriptPath)`. If Gemini returns untrusted or modified code, it runs directly in the server process environment.
- **Root Cause / Context:** Lack of URL scheme/hostname validation for outgoing SSRF proxies, and direct execution of AI-generated scripts in host Node environment.
- **Minimal Recommended Fix:**
  1. Add hostname validation and restrict SSRF proxy requests to public `http:` / `https:` schemes, blocking local loopback (`127.0.0.1`, `localhost`) and metadata IPs.
  2. For `agent.ts` script execution, execute scripts within an isolated VM or container sandbox (e.g., using `isolated-vm` or restricted child process environment variables) with strict timeouts.

---

## Summary Table

| Security Category | Risk Rating | Status / Core Finding | Recommended Minimal Fix |
| :--- | :--- | :--- | :--- |
| **XSS** | Low | Clean | Optional HTML sanitization for Puppeteer PDF generator. |
| **SQL Injection** | N/A | No SQL database present | Use ORM / parameterized queries if DB added. |
| **NoSQL Injection** | N/A | No NoSQL database present | Sanitize query operators if Mongo added. |
| **CSRF** | Medium | Stateless JSON API without tokens | Add CSRF token headers / SameSite cookies for session routes. |
| **Authentication Weaknesses** | Medium | `validateApiKey` middleware bypasses check | Check `x-api-key` or Bearer token against `process.env.API_KEY`. |
| **Authorization Bypass** | High | `/api/git` endpoint accessible unauthenticated | Enforce admin auth middleware on `/api/git`. |
| **Exposed Secrets** | Low | Hardcoded client Firebase config | Move Firebase client key config to `.env` variables. |
| **Unsafe Storage** | Low | Clean (only theme setting in localStorage) | Continue avoiding sensitive data in client storage. |
| **Token Leaks** | Low | Clean | Keep API key logging suppressed. |
| **Insecure API Endpoints** | Medium | SSRF risk on URL scrapers; script execution in `agent.ts` | Validate proxy URLs against private IPs; restrict script sandbox environment. |
