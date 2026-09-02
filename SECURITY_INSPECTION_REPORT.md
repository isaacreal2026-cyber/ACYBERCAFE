# Security Inspection & Vulnerability Audit Report

## Overview
This security inspection report presents a comprehensive audit of the application codebase across 10 critical security vectors:
1. Cross-Site Scripting (XSS)
2. SQL Injection
3. NoSQL Injection
4. Cross-Site Request Forgery (CSRF)
5. Authentication Weaknesses
6. Authorization Bypass
7. Exposed Secrets
8. Unsafe Storage
9. Token Leaks
10. Insecure API Endpoints

Per instructions, **no application logic has been modified**, and only **minimal, high-impact security recommendations** are provided.

---

## Findings by Risk Category

---

### 1. Cross-Site Scripting (XSS)
- **Severity**: High
- **Affected Files / Lines**:
  - `src/server/pdf-ai.ts`: Lines 22–45 (`/generate` endpoint)
  - `src/server/pdf-ai.ts`: Lines 80–110 (`/edit` endpoint)
- **Root Cause**:
  In `src/server/pdf-ai.ts`, unescaped prompt outputs and user-provided search/replace text are embedded directly into raw HTML strings before passing them to Puppeteer's `page.setContent(htmlContent)`.
- **Impact**:
  An attacker can inject malicious `<script>` or HTML tags into the text prompt or PDF replacement text, executing JavaScript within the headless Chromium browser context. This could enable Server-Side XSS or local resource read via file protocol/IFRAMEs.
- **Minimal Recommended Fix**:
  Sanitize AI output and user inputs with a lightweight HTML sanitizer (e.g., `sanitize-html` or basic entity escaping) before rendering in `page.setContent()`.

---

### 2. SQL Injection
- **Severity**: Low / Info
- **Affected Files / Lines**: Entire Codebase
- **Root Cause**:
  The application does not use a SQL database or raw SQL query construction. State is managed via Zustand (`useAppStore.ts`) in-memory state and Firebase Firestore.
- **Impact**:
  No direct SQL injection risk exists in the current architecture.
- **Minimal Recommended Fix**:
  If a SQL database (PostgreSQL, MySQL, SQLite) is introduced in the future, strictly use parameterized queries or an ORM (e.g., Prisma, Kysely) rather than string interpolation.

---

### 3. NoSQL Injection
- **Severity**: Low
- **Affected Files / Lines**:
  - `src/lib/firebase.ts`
  - `server.ts`
- **Root Cause**:
  Firestore queries in `src/lib/firebase.ts` use hardcoded field references or typed store objects without dynamic operator injection.
- **Impact**:
  Current Firestore usage is resistant to standard NoSQL operator injection (such as `$gt` or `$ne` payload injections).
- **Minimal Recommended Fix**:
  Ensure user-supplied input is never passed directly as query object keys or operator filters in Firestore calls.

---

### 4. Cross-Site Request Forgery (CSRF)
- **Severity**: Medium
- **Affected Files / Lines**:
  - `server.ts`: Middleware chain
- **Root Cause**:
  The Express server accepts state-changing `POST` requests (such as `/api/generate`, `/api/git`, `/api/media/extract`, `/api/pdf-extract`) without validating CSRF tokens or restricting cross-site requests via SameSite cookie / Origin headers.
- **Impact**:
  A malicious third-party website visited by an authenticated user could issue forged HTTP POST requests against the backend server.
- **Minimal Recommended Fix**:
  Implement custom origin header checking (`req.headers.origin` validation) or standard CSRF middleware for state-changing endpoint routes (`POST`, `PUT`, `DELETE`).

---

### 5. Authentication Weaknesses
- **Severity**: High
- **Affected Files / Lines**:
  - `server.ts`: Lines 1279–1284 (`validateApiKey` middleware)
- **Root Cause**:
  The `validateApiKey` middleware is a placeholder function that immediately calls `next()`, bypassing all API key checks:
  ```typescript
  const validateApiKey = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    return next();
  };
  ```
- **Impact**:
  All protected API endpoints using `validateApiKey` (including `/api/media/extract`, `/api/ytdl-core/info`, `/api/yt-dlp/info`) are exposed to unauthenticated public access and potential resource exhaustion.
- **Minimal Recommended Fix**:
  Enforce API key validation in `validateApiKey` by comparing an incoming header (e.g., `X-API-Key` or `Authorization`) against `process.env.API_KEY`.

---

### 6. Authorization Bypass
- **Severity**: High
- **Affected Files / Lines**:
  - `server.ts`: Lines 2574–2618 (`/api/git` endpoint)
  - `src/server/agent.ts`: Lines 18–180 (`/process` endpoint)
- **Root Cause**:
  The `/api/git` and `/api/agent/process` routes do not perform authorization or session checks on callers. Anyone who reaches the endpoint can execute commands or generate/run scripts on the host system.
- **Impact**:
  Unprivileged users or external callers can invoke high-privilege system operations (Git status/log/add/commit, dynamic code execution).
- **Minimal Recommended Fix**:
  Add user authentication and role-based authorization middleware to privileged endpoints before executing system commands.

---

### 7. Exposed Secrets
- **Severity**: Medium
- **Affected Files / Lines**:
  - `.env.example`
  - `server.ts`: Lines 239–241
- **Root Cause**:
  `server.ts` contains fallback checks for placeholder secret keys (e.g. `MY_IA_SECRET_KEY`, `MY_IA_ACCESS_KEY`). If environment variables are omitted or misconfigured, fallback strings could lead to accidental exposure or logic confusion.
- **Impact**:
  Potential leakage or misuse of default keys if deployed without strict environment variable validation.
- **Minimal Recommended Fix**:
  Ensure environment variables (`IA_ACCESS_KEY`, `IA_SECRET_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`) are required at server startup, and reject requests when keys are absent rather than using default strings.

---

### 8. Unsafe Storage
- **Severity**: Medium
- **Affected Files / Lines**:
  - `src/server/agent.ts`: Lines 13, 20 (`/tmp/agent_uploads/`)
  - `src/server/pdf-ai.ts`: Lines 9, 65 (`uploads/`)
- **Root Cause**:
  Uploaded files are written to local disk directories (`/tmp/agent_uploads/` and `uploads/`) without explicit file extension validation, size caps, or automatic lifecycle cleanup on all failure paths.
- **Impact**:
  Malicious or oversized file uploads could cause local storage exhaustion (Denial of Service) or residual temporary file leaks.
- **Minimal Recommended Fix**:
  Set file size limits in Multer (`limits: { fileSize: 10 * 1024 * 1024 }`), restrict allowed file MIME types/extensions, and ensure file cleanup inside `try ... finally` blocks.

---

### 9. Token Leaks
- **Severity**: Medium
- **Affected Files / Lines**:
  - `src/server/pdf-ai.ts`: Lines 18, 70 (`req.body.apiKey`)
  - `src/lib/firebase.ts`: Lines 4–15
- **Root Cause**:
  Client requests to `/api/pdf-ai/generate` and `/api/pdf-ai/edit` allow passing raw API keys in the request body (`req.body.apiKey`). These keys could be logged in HTTP server access logs or proxy logs.
- **Impact**:
  API keys sent via request bodies or headers can be intercepted or recorded in plaintext server access logs.
- **Minimal Recommended Fix**:
  Manage API keys strictly on the server side via environment variables (`process.env`) rather than accepting API keys directly from client request bodies.

---

### 10. Insecure API Endpoints
- **Severity**: High
- **Affected Files / Lines**:
  - `server.ts`: Lines 2605 (`git ${command} ${gitArgs}`)
  - `src/server/agent.ts`: Line 140 (`node ${scriptPath}`)
- **Root Cause**:
  In `server.ts`, arguments passed to the `/api/git` route are formatted into command strings and passed to `exec`:
  ```typescript
  const { stdout, stderr } = await execAsync(`git ${command} ${gitArgs}`);
  ```
  Although `execAsync` is safe if arguments are strictly controlled, passing dynamic parameters to `exec` carries command injection risks if sanitization is bypassed.
- **Impact**:
  An attacker manipulating the `args` parameter could execute arbitrary shell commands on the server.
- **Minimal Recommended Fix**:
  Use `execFile` or `spawn` with an array of arguments rather than shell string execution via `exec`.

---

## Summary of Minimal Recommendations

| Vector | Risk Level | Minimal Non-Disruptive Recommendation |
| :--- | :--- | :--- |
| **XSS** | High | Escape/sanitize HTML before rendering in Puppeteer (`pdf-ai.ts`). |
| **SQL Injection** | Low | N/A (Maintain parameterized queries if SQL added later). |
| **NoSQL Injection** | Low | Sanitize object keys in Firestore queries. |
| **CSRF** | Medium | Validate `Origin` header on state-changing `POST` routes. |
| **Authentication** | High | Replace blank `validateApiKey` pass-through with header key check. |
| **Authorization** | High | Require auth middleware on `/api/git` and `/api/agent/process`. |
| **Exposed Secrets** | Medium | Fail fast on missing env keys instead of hardcoded fallbacks. |
| **Unsafe Storage** | Medium | Add Multer file size limits and guarantee `unlink` cleanup in `finally`. |
| **Token Leaks** | Medium | Use server-side `process.env` keys instead of client body keys. |
| **Insecure Endpoints** | High | Use `execFile` with argument arrays instead of shell command strings. |
