# Comprehensive Security Audit Report

This security audit report provides an in-depth vulnerability assessment across 10 critical security domains for the **CyberPlus** operations center platform. For each domain, we identify potential vulnerability vectors, assess real-world impact, classify risks, highlight exact code snippets/proof-of-concepts, and recommend **minimal, near-zero-risk security fixes** that align with safety requirements and do not alter application logic or external behavior.

---

## Executive Summary of Vulnerabilities

| Domain | Vulnerability Found | Risk Level | Key Endpoint / File Affected | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **1. XSS** | Puppeteer Server-Side XSS (Local File Inclusion / SSRF) | **High** | `src/server/pdf-ai.ts` | Arbitrary HTML/JS executed inside Puppeteer headless browser can read local server files or query internal metadata endpoints. |
| **2. SQL Injection** | Not Applicable (N/A) | **None** | N/A | No database is used. Code only contains text generators for SQL. |
| **3. NoSQL Injection** | Not Applicable (N/A) | **None** | N/A | No NoSQL database is used. |
| **4. CSRF** | Not Applicable (N/A) | **None** | `server.ts` | Platform is a stateless API with no session or auth cookies. |
| **5. Auth Weaknesses** | Bypassable Placeholder Middleware | **High** | `server.ts` (`validateApiKey` middleware) | Unauthenticated clients can execute privileged and resource-intensive endpoints. |
| **6. Auth Bypass & RCE** | Git Command Argument Injection & AI Script RCE | **Critical** | `/api/git` (in `server.ts`), `/api/agent/process` (in `src/server/agent.ts`) | Direct command injection via arguments map, and prompt injection executing arbitrary script files. |
| **7. Exposed Secrets** | Hardcoded Fallback Secrets / Public Firebase Config | **Medium** | `src/components/SearchEngineView.tsx`, `firebase-applet-config.json` | Exposed placeholder API keys and hardcoded client fallbacks. |
| **8. Unsafe Storage** | Publicly Accessible Sensitive Output PDF/Docs | **High** | `dist/outputs/` directory | Filename guessing of generated documents lets anonymous users download KRA PINs, National IDs, and sensitive PII. |
| **9. Token Leaks** | Sending API Keys in GET Parameters to Third Parties | **Medium** | `src/components/SearchEngineView.tsx` | Referer headers or proxy logs could leak client-side API keys to third-party endpoints. |
| **10. Insecure API Endpoints** | Arbitrary SSRF / File Read via Puppeteer | **High** | `/api/scrape-exams` (in `server.ts`) | Attackers can scan local networks (SSRF) or read sensitive system files (e.g., `file:///etc/passwd`). |

---

## 1. XSS (Cross-Site Scripting)

### Vulnerability & Impact
While standard React escaping prevents frontend-level stored/reflected XSS, there is a **Server-Side XSS / Local File Inclusion** risk in the PDF generator and edit flows. The application uses Puppeteer to render HTML strings into PDF format on the server. If an attacker can inject malicious HTML tags (e.g. `<iframe src="file:///etc/passwd">` or scripts) into the generated layout, they can execute script execution inside the headless Chrome sandbox or read files on the host filesystem.

### Code Evidence
In `src/server/pdf-ai.ts`:
```typescript
// Sets un-sanitized, AI-generated or modified HTML directly in Puppeteer
await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
```

### Risk Level: **High**

### Recommended Minimal Fix
1. **Disable JavaScript Execution in Puppeteer:** Disable JS execution on the pages rendered solely for layout rendering.
2. **Restrict Navigation Protocol:** Block any navigation request that is not `http:` or `https:`.
```typescript
const page = await browser.newPage();
await page.setJavaScriptEnabled(false); // Only render CSS/HTML, disable JS execution
```

---

## 2. SQL Injection

### Vulnerability & Impact
**Not Applicable (N/A).** The application is entirely stateless on the backend and maintains no persistent SQL database layer. Features such as "SQL Generator" in `CodeView.tsx` generate queries purely as text in the frontend context and are never run on the server.

### Risk Level: **None**

### Recommended Minimal Fix
- If a SQL database (e.g., SQLite, PostgreSQL) is integrated in the future, strictly enforce parameterization or use ORMs (such as Prisma or Sequelize) to build queries instead of string concatenation.

---

## 3. NoSQL Injection

### Vulnerability & Impact
**Not Applicable (N/A).** The application does not use MongoDB, Redis, or any other NoSQL database. Caches are managed using standard Node `Map` objects.

### Risk Level: **None**

### Recommended Minimal Fix
- If integrating a NoSQL database in the future, avoid direct object construction from request parameters. Sanitize and validate inputs against structured schemas.

---

## 4. CSRF (Cross-Site Request Forgery)

### Vulnerability & Impact
**Not Applicable (N/A).** The backend is a stateless API. It does not use session cookies or cookie-based authentication, and therefore traditional CSRF attacks are not possible because no authentication credentials are automatically appended by the browser during cross-site requests.

### Risk Level: **None**

### Recommended Minimal Fix
- If session-based authentication using cookies is introduced in the future, implement robust anti-CSRF tokens (using standard Express middleware like `csurf`) or configure cookies with `SameSite=Strict; Secure; HttpOnly`.

---

## 5. Authentication Weaknesses

### Vulnerability & Impact
The authentication system has a critical weakness: the backend route verification relies on a completely bypassed placeholder middleware (`validateApiKey`). This allows anyone to issue requests to sensitive, resource-expensive API routes such as media extraction, YouTube downloading, and document generating.

### Code Evidence
In `server.ts`:
```typescript
// Bypasses validation entirely by immediately calling next()
const validateApiKey = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  return next();
};
```

### Risk Level: **High**

### Recommended Minimal Fix
Enforce basic/token verification in `validateApiKey` against a secure environment variable (e.g., `INTERNAL_API_KEY`):
```typescript
const validateApiKey = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const apiKeyHeader = req.headers["x-api-key"] || req.headers["authorization"];
  const expectedKey = process.env.VITE_MEDIA_PROXY_API_KEY || "media_secret_secure_key_2026";

  // Strip "Bearer " if present
  let providedKey = typeof apiKeyHeader === "string" ? apiKeyHeader : "";
  if (providedKey.startsWith("Bearer ")) {
    providedKey = providedKey.slice(7);
  }

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }
  next();
};
```

---

## 6. Authorization Bypass (And Remote Code Execution)

### Vulnerability & Impact
1. **Git Client Command Injection (RCE):** The `/api/git` route is entirely unauthenticated and exposes command execution. While it validates the primary command against an allow-list, it concatenates user-supplied arguments into a shell command after simply escaping double-quotes. An attacker can use backticks or `$()` substitution (which still expand inside double-quotes in Unix shells) to execute arbitrary commands under the application context.
2. **AI Script Execution RCE:** The `/api/agent/process` endpoint takes a prompt, generates Node.js code via Gemini, and executes it directly on the host using `execAsync`. This is insecure by design and highly susceptible to prompt injection attacks that compromise the server.

### Code Evidence
In `server.ts` (`/api/git`):
```typescript
let gitArgs = "";
if (args && Array.isArray(args)) {
  gitArgs = args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ");
}
// VULNERABLE: gitArgs can contain $(command) which runs in the shell!
const { stdout, stderr } = await execAsync(`git ${command} ${gitArgs}`);
```

### Risk Level: **Critical**

### Recommended Minimal Fix
1. **Secure Subprocess Spawning (No Shell):** Replace `execAsync` (which spawns a full shell) with safe argument passing via `execFile` or `spawn` where arguments are passed as an array, completely neutralizing shell metacharacter expansion.
```typescript
import { execFile } from "child_process";
// Use promisified execFile instead of exec
const execFileAsync = promisify(execFile);

// Within the route:
const { stdout, stderr } = await execFileAsync("git", [command, ...args], { timeout: 15000 });
```
2. **Apply Authentication:** Enforce the `validateApiKey` middleware on the `/api/git` and `/api/agent/process` routes.

---

## 7. Exposed Secrets

### Vulnerability & Impact
The repository contains hardcoded secrets and configuration files (such as a public Firebase applet configuration and fallback secret credentials). While public Firebase configuration keys are necessary for client-side Firebase Initialization, they can be restricted in the Google Cloud Console. The hardcoded proxy fallback secrets represent a risk if they are trusted for internal secure server-to-server operations.

### Code Evidence
1. In `src/components/SearchEngineView.tsx` and `src/components/GlobalSearch.tsx`:
   `const apiKey = (import.meta as any).env.VITE_MEDIA_PROXY_API_KEY || 'media_secret_secure_key_2026';`
2. Raw config file `firebase-applet-config.json` containing `apiKey: "AIzaSyA21gt4v..."` is checked into source control.

### Risk Level: **Medium**

### Recommended Minimal Fix
1. **Remove Hardcoded Fallbacks:** Eliminate string literals as fallback values for keys. If an environment variable is missing, throw a configuration error or display a placeholder instead of using a default key.
2. **Rotate Secrets:** Rotate any production credentials (such as Google API/Gemini keys) that were accidentally committed or exposed in git history.

---

## 8. Unsafe Storage

### Vulnerability & Impact
Generated documents containing highly sensitive customer PII (e.g., KRA PIN numbers, National IDs, physical addresses, full names, financial transactions) are written directly into a web-accessible static directory: `dist/outputs/output_[timestamp].[ext]`. Anyone can scan or guess the timestamp filename structure (e.g., sequentially or via dictionary attacks) to download other clients' sensitive files without any authentication.

### Code Evidence
In `src/server/agent.ts`:
```typescript
const outputFilename = `output_${Date.now()}.${taskType === 'document_formatter' ? 'docx' : 'pdf'}`;
const outputPath = path.join(process.cwd(), 'dist', 'outputs');
// ...
fs.writeFileSync(path.join(outputPath, filename), finalBuffer);
// VULNERABLE: Direct public URL with predictable filenames
generatedFileUrl = `/outputs/${outputFilename}`;
```

### Risk Level: **High**

### Recommended Minimal Fix
1. **Private Storage Location:** Save generated documents in a non-static, private directory outside the public root.
2. **Authenticated Delivery Route:** Define an authenticated download route `/api/outputs/:filename` that verifies the user's session before reading the file and piping the binary output to the response stream.

---

## 9. Token Leaks

### Vulnerability & Impact
The React frontend directly calls third-party APIs (such as Jamendo and Freesound) and embeds API keys as query strings in GET requests. This causes client-side API tokens to be sent over the wire, leaving them exposed in Referer headers, proxy loggers, and browser history.

### Code Evidence
In `src/components/SearchEngineView.tsx`:
```typescript
const fsUrl = `${API_ENDPOINTS.FREESOUND}?query=${encodeURIComponent(q)}&token=${API_KEYS.FREESOUND_API_KEY}&fields=...`;
```

### Risk Level: **Medium**

### Recommended Minimal Fix
- **Backend API Proxies:** Direct search and extraction requests through secure Express backend proxy routes. The backend should append secrets securely from server-side environment variables before forwarding the request, preventing client exposure of these API keys.

---

## 10. Insecure API Endpoints (Server-Side Request Forgery - SSRF)

### Vulnerability & Impact
The exam scraping endpoint `/api/scrape-exams` accepts an arbitrary `site_url` from the request query and navigates headless Puppeteer directly to it. Because there is no input validation on the protocol or hostname, an attacker can exploit this endpoint as an **SSRF** proxy to query internal server ports, access local cloud instance metadata endpoints (e.g., `http://169.254.169.254/latest/meta-data`), or read local server-side files using the file protocol (e.g., `file:///etc/passwd`).

### Code Evidence
In `server.ts`:
```typescript
app.get("/api/scrape-exams", async (req, res) => {
  const siteUrl = req.query.site_url;
  // ...
  // VULNERABLE: Arbitrary siteUrl parameter navigated directly in Puppeteer
  await page.goto(siteUrl, { waitUntil: "networkidle2", timeout: 30000 });
```

### Risk Level: **High**

### Recommended Minimal Fix
- **Restrict Schemes and Hosts:** Validate `site_url` to guarantee it begins strictly with `http://` or `https://`. Use a DNS validation utility or allow-list to ensure the target IP is public and does not point to localhost (`127.0.0.1`), private networks (`10.0.0.0/8`, `192.168.0.0/16`), or instance metadata configurations.
```typescript
const parsedUrl = new URL(siteUrl);
if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
  return res.status(400).json({ error: "Invalid protocol. Only http and https are allowed." });
}
if (["localhost", "127.0.0.1", "169.254.169.254"].includes(parsedUrl.hostname)) {
  return res.status(400).json({ error: "Access to private or local network hosts is blocked." });
}
```

---

*Report prepared by Jules - Operations Center Tech Lead & Principal Security Engineer.*
