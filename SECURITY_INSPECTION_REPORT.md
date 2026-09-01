# Security Inspection & Audit Report

This report documents the security audit findings for the codebase across ten critical security categories, adhering strictly to the constraint of **not modifying application logic** and **recommending minimal security fixes**.

---

## Executive Summary

The application codebase (`server.ts`, `src/`, `src/server/`, `src/lib/`, `src/components/`) was audited against the standard OWASP and cloud-native security principles across 10 security categories. Overall, the codebase leverages React's JSX auto-escaping, Firebase client-side Authentication, and avoids raw SQL/NoSQL queries, which eliminates several class-wide vulnerability vectors (such as traditional SQL Injection or direct raw HTML XSS).

However, key security risks were identified in API request validation, CORS/CSRF protections, middleware authentication placeholders, environment secret exposure, and token storage. Minimal, non-intrusive remediation recommendations are provided for each finding.

---

## Detailed Findings & Recommendations by Category

### 1. Cross-Site Scripting (XSS)
- **Status:** **PASS / LOW RISK**
- **Findings:**
  - Standard React JSX rendering is used across `src/components/`, which automatically escapes variables before DOM insertion.
  - No usages of `dangerouslySetInnerHTML`, `eval()`, or `document.write()` were found in client components or server scripts.
  - Markdown outputs (e.g. Gemini AI responses) are standard string renders or plain text formatting without executing unescaped HTML scripts.
- **Minimal Recommendation:**
  - Maintain the rule of avoiding `dangerouslySetInnerHTML`. If rendering rich HTML in future markdown components, ensure DOMPurify or a similar HTML sanitizer library is wrapped around raw HTML content before rendering.

---

## 2. SQL Injection (SQLi)
- **Status:** **PASS / NOT APPLICABLE**
- **Findings:**
  - The application does not connect to a relational database (e.g. MySQL, PostgreSQL, SQLite) using raw SQL strings.
  - Storage is managed on the client side via Zustand state and Firebase Firestore SDK.
- **Minimal Recommendation:**
  - If a relational SQL database is added in the future, enforce parameterization using prepared statements or ORM parameter binding (e.g. Prisma or Knex) rather than string concatenation.

---

## 3. NoSQL Injection
- **Status:** **PASS / LOW RISK**
- **Findings:**
  - Firebase Firestore SDK is used for NoSQL data operations.
  - Queries in `src/lib/firebase.ts` use strongly-typed Firebase SDK function calls (`doc()`, `getDoc()`, `setDoc()`) rather than MongoDB-style query object parsing (e.g., passing `$gt` or raw object payloads from Express `req.body` directly into database functions).
- **Minimal Recommendation:**
  - Ensure any server-side NoSQL database queries sanitize input parameters and reject non-string input objects for query fields.

---

## 4. Cross-Site Request Forgery (CSRF)
- **Status:** **MEDIUM RISK**
- **Findings:**
  - `server.ts` does not configure CORS restricted origins or CSRF token protection for state-changing POST requests (e.g. `/api/media/extract`, `/api/ytdl-core/info`, `/api/yt-dlp/info`, agent endpoints).
  - Cross-origin HTTP POST requests with JSON payloads from external sites could potentially hit exposed backend endpoints if ambient credentials or unauthenticated endpoints exist.
- **Minimal Recommendation:**
  - Implement Express `cors` middleware with an explicit allowed origin whitelist matching the trusted frontend domain (e.g., `origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000'`).
  - Require custom request headers (e.g., `X-Requested-With: XMLHttpRequest` or an API authorization header) for API POST requests to prevent simple cross-site form submissions.

---

## 5. Authentication Weaknesses
- **Status:** **MEDIUM RISK**
- **Findings:**
  - Client-side authentication uses Firebase Authentication (`signInWithEmailAndPassword`, `signInWithPopup`), which handles password hashing and session tokens securely.
  - However, in `server.ts`, the backend API authentication middleware `validateApiKey` is currently a stub that immediately calls `next()`, allowing unauthenticated requests to pass through:
    ```typescript
    const validateApiKey = (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      return next();
    };
    ```
- **Minimal Recommendation:**
  - Update `validateApiKey` to verify a shared secret or Bearer token passed in the `Authorization` header against an environment variable (e.g. `process.env.API_KEY`).
  - Example minimal fix:
    ```typescript
    const validateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
      }
      return next();
    };
    ```

---

## 6. Authorization Bypass
- **Status:** **MEDIUM RISK**
- **Findings:**
  - Frontend routes rely on client-side state (`user.role`) to toggle admin options and restricted tabs.
  - Backend endpoints (e.g. `/api/ytdl-core/info`, `/api/yt-dlp/info`, `/api/media/extract`) do not perform role-based authorization checks or Firebase ID Token verification to verify user identities on the backend.
- **Minimal Recommendation:**
  - Utilize Firebase Admin SDK on the server side (`firebase-admin`) to verify the Bearer ID token attached to request headers before allowing access to privileged server endpoints.

---

## 7. Exposed Secrets
- **Status:** **LOW RISK**
- **Findings:**
  - Environment variable placeholders are defined in `.env.example` without committing production secret keys to version control.
  - Default fallback secret string `'media_secret_secure_key_2026'` is present in `SearchEngineView.tsx` and `server.ts` for fallback media proxy tokens.
- **Minimal Recommendation:**
  - Remove fallback secret strings from client-side source code. Require `import.meta.env.VITE_MEDIA_PROXY_API_KEY` to be supplied via environment configuration in production builds.

---

## 8. Unsafe Storage
- **Status:** **PASS / LOW RISK**
- **Findings:**
  - `localStorage` is only used to persist user UI preference (`localStorage.getItem('theme')`).
  - Sensitive credentials, passwords, or raw access tokens are not stored in unencrypted `localStorage` or `sessionStorage`.
  - Firebase Authentication manages token persistence securely via IndexedDB / memory.
- **Minimal Recommendation:**
  - Maintain the existing design of storing non-sensitive UI settings in `localStorage` and keeping sensitive auth state in managed Firebase auth handlers.

---

## 9. Token Leaks
- **Status:** **LOW RISK**
- **Findings:**
  - Gemini API key (`VITE_GEMINI_API_KEY`) and Firebase public configuration (`VITE_FIREBASE_API_KEY`) are accessed via Vite client-side environment variables (`import.meta.env`).
  - Client-side API keys embedded in frontend bundles are inherently exposed to browser inspection.
- **Minimal Recommendation:**
  - Proxy Gemini API calls through the backend server (e.g., via Express endpoints in `server.ts`) so the secret Gemini API key stays server-side and is never exposed in client JS bundles.
  - For Firebase client API key, restrict the key usage in Google Cloud Console to authorized HTTP referrer domains.

---

## 10. Insecure API Endpoints
- **Status:** **MEDIUM RISK**
- **Findings:**
  - Endpoint `/api/media/extract` enforces IP rate-limiting (20 requests/minute), which is good practice.
  - Command execution endpoints in `server.ts` use `execFileAsync` with array argument passing rather than shell string concatenation, preventing shell command injection.
  - However, endpoints lack request body validation schemas (e.g. Zod or Joi) and explicit CORS controls.
- **Minimal Recommendation:**
  - Add request body input validation (ensure `url` is a valid HTTP/HTTPS URL string before processing).
  - Add explicit HTTP response security headers using the `helmet` middleware (`app.use(helmet())`).

---

## Summary of Actionable Minimal Fixes

| Priority | Risk / Category | Area | Minimal Fix |
| :--- | :--- | :--- | :--- |
| **High** | Authentication Weakness | `server.ts` (`validateApiKey`) | Check incoming API Key / Authorization header against `process.env.API_KEY`. |
| **Medium** | CSRF / CORS | `server.ts` | Add `cors` middleware with specified frontend origin whitelist. |
| **Medium** | Insecure API Endpoints | `server.ts` | Integrate `helmet` middleware for basic HTTP security headers. |
| **Low** | Token Leaks | `src/lib/gemini.ts` | Route Gemini prompt requests through Express server endpoints rather than calling directly from frontend bundle. |
| **Low** | Exposed Secrets | `SearchEngineView.tsx` | Ensure media proxy keys are strictly sourced from environment variables without default fallback string literals. |

---
*Report generated as part of security audit inspection task. Application logic remained untouched.*
