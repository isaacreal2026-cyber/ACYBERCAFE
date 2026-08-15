# Security Audit Report

This report evaluates the codebase against ten critical security inspection areas: **XSS**, **SQL Injection**, **NoSQL Injection**, **CSRF**, **Authentication Weaknesses**, **Authorization Bypass**, **Exposed Secrets**, **Unsafe Storage**, **Token Leaks**, and **Insecure API Endpoints**.

In accordance with strict system directives, no application logic was modified. Only minimal, targeted security recommendations are provided below.

---

## 1. XSS (Cross-Site Scripting)
* **Findings:**
  * **Dynamic HTML Rendering in PDF Generation (`src/server/pdf-ai.ts`):** The PDF generation endpoints (`/api/pdf-ai/generate` and `/api/pdf-ai/edit`) accept unescaped text/HTML content generated via AI or user inputs and render it via Puppeteer (`page.setContent(htmlContent)`). If untrusted user input is rendered without sanitization, an attacker could inject malicious `<script>` tags or HTML payloads executed in the headless browser context.
  * **Frontend Markdown & Text Output:** `react-markdown` is used in client views. Standard React JSX escaping prevents DOM-based XSS for standard text bindings across components.
* **Minimal Recommended Fixes:**
  * Sanitize HTML generated for Puppeteer rendering using `DOMPurify` (or `sanitize-html`) before calling `page.setContent()`, or ensure Puppeteer runs with strict JavaScript execution controls where script execution is unnecessary.

---

## 2. SQL Injection
* **Findings:**
  * **No Relational Database Querying:** The application does not connect to or query relational databases (e.g., PostgreSQL, MySQL, SQLite) using SQL statements.
* **Minimal Recommended Fixes:**
  * If a SQL database is integrated in the future, enforce parameterization/prepared statements (or ORMs with parameterized bindings) and avoid string concatenation in SQL queries.

---

## 3. NoSQL Injection
* **Findings:**
  * **No Active NoSQL Datastore:** The server operates strictly using in-memory data structures (`Map`, array filters, JavaScript objects) and does not utilize NoSQL databases (e.g., MongoDB/Mongoose).
* **Minimal Recommended Fixes:**
  * If a NoSQL database is added, sanitize input objects to ensure query parameters (such as `$gt` or `$ne` operators) cannot be passed directly from untrusted `req.body` or `req.query`.

---

## 4. CSRF (Cross-Site Request Forgery)
* **Findings:**
  * **Missing CSRF Protections on State-Changing API Endpoints:** API endpoints (`POST /api/media/extract`, `POST /api/git`, `POST /api/generate`, `POST /api/agent/process`, `POST /api/pdf-ai/generate`) rely on standard JSON/form-data request bodies without CSRF tokens or SameSite cookie verification.
  * **CORS Settings:** Default `cors()` middleware in Express allows cross-origin requests unless specifically restricted.
* **Minimal Recommended Fixes:**
  * Restrict CORS origin parameters in `server.ts` to allowed application domains.
  * Implement CSRF token validation middleware (e.g., `csurf` or custom header checks like `X-Requested-With`) or enforce strict authorization header validation for state-changing endpoints.

---

## 5. Authentication Weaknesses
* **Findings:**
  * **Bypassed API Middleware (`validateApiKey` in `server.ts`):** The `validateApiKey` middleware currently immediately passes through via `next()`, allowing unauthenticated clients to invoke API routes.
  * **Firebase Auth Key Exposure:** `src/lib/firebase.ts` contains hardcoded Firebase client configuration keys. While public client keys are standard in Firebase, backend endpoints do not verify Firebase ID tokens (`Bearer` token verification via `firebase-admin`).
* **Minimal Recommended Fixes:**
  * Update `validateApiKey` (or implement Firebase Admin ID token validation) to verify incoming authorization headers (`Authorization: Bearer <token>`) before servicing sensitive routes.

---

## 6. Authorization Bypass
* **Findings:**
  * **Unrestricted Endpoint Access:** Endpoints such as `POST /api/git` execute system git commands (e.g., `git status`, `git add`, `git commit`, `git pull`, `git push`) without role-based or session-based access controls.
  * **File Access & Outputs:** Generated documents in `/outputs` are served publicly via `express.static` without access token checks or owner validation.
* **Minimal Recommended Fixes:**
  * Enforce role-based access control (RBAC) middleware on administrative endpoints (such as `/api/git`).
  * Implement session or signed token checks for output file downloads in `/outputs`.

---

## 7. Exposed Secrets
* **Findings:**
  * **Hardcoded Credentials & Default Keys:**
    * Internet Archive fallback keys check for placeholder strings (`MY_IA_ACCESS_KEY`, `MY_IA_SECRET_KEY`, `YOUR_`).
    * Firebase client configuration values exist in `src/lib/firebase.ts`.
    * Default PO Token fallback exists in `server.ts` (`process.env.PO_TOKEN || "MnQxU0xS..."`).
* **Minimal Recommended Fixes:**
  * Move all default/fallback credentials and tokens exclusively into environment variables (`.env`).
  * Ensure secrets are never hardcoded in source repository files.

---

## 8. Unsafe Storage
* **Findings:**
  * **In-Memory Volatility:** Application state (customers, tickets, transactions, rate limits, caches) is stored entirely in volatile JavaScript `Map` objects and React state.
  * **Temporary File Storage:** Uploaded files (`/tmp/agent_uploads/`, `uploads/`) and output artifacts (`dist/outputs/`) are stored on disk without encryption.
* **Minimal Recommended Fixes:**
  * Implement automated cleanup cron tasks/routines for temporary directory buffers (`/tmp/agent_uploads`, `uploads/`) to prevent disk exhaustion.
  * Store sensitive persistent data in an encrypted database or object store with restricted file system permissions.

---

## 9. Token Leaks
* **Findings:**
  * **Error Logs & Exception Details:** Error handling blocks in `server.ts`, `src/server/agent.ts`, and `src/server/pdf-ai.ts` log raw error objects and message strings to `console.error`. In some failure modes, downstream API error bodies or environment messages could be logged or returned to client responses.
* **Minimal Recommended Fixes:**
  * Redact sensitive tokens, headers, and API keys from error loggers.
  * Return generic error messages to API clients while logging sanitized details internally.

---

## 10. Insecure API Endpoints
* **Findings:**
  * **Command Shell Execution Risks:**
    * In `src/server/agent.ts`, dynamic Node.js code is written to disk and executed via `execAsync("node " + scriptPath)`.
    * In `server.ts`, `getWorkingYtDlpCmd` and `extractViaLocalYtdlp` build command strings passed to `execAsync`.
  * **Missing Strict Input Validation:** URL parameters in `/api/scrape-exams` and `/api/pdf-extract` fetch remote URLs. Although protocol validation exists, Server-Side Request Forgery (SSRF) checks against internal IP addresses (e.g., `127.0.0.1`, `169.254.169.254`, `localhost`) should be reinforced.
* **Minimal Recommended Fixes:**
  * Replace shell execution with `execFile` or sandbox script execution (e.g., Node `vm` module or containerized sandbox) for dynamic code execution.
  * Implement IP blacklisting (blocking private subnet ranges like `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1/8`) on all URL-fetching proxy endpoints to prevent SSRF against internal services.
