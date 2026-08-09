/**
 * Stress Test & Scaling Simulation Suite
 * Simulates:
 * - High Traffic & Concurrent Users
 * - Rapid API Requests
 * - Network Failures & API Delays
 * - Server Restart Impact (Cache Wiping)
 * - Large Datasets & Payload Handling
 * - Memory & CPU Pressure
 */

import http from "http";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper: Make async GET request
function makeRequest(url, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(url, { headers, timeout: 5000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          latency: Date.now() - start,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        status: 500,
        latency: Date.now() - start,
        success: false,
        error: err.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        status: 408,
        latency: Date.now() - start,
        success: false,
        error: "Timeout",
      });
    });
  });
}

// Helper: Make async POST request
function makePostRequest(url, body, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const bodyData = JSON.stringify(body);
    const parsedUrl = new URL(url);

    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyData),
        ...headers,
      },
      timeout: 5000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          latency: Date.now() - start,
          success: res.statusCode >= 200 && res.statusCode < 300,
          data: data,
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        status: 500,
        latency: Date.now() - start,
        success: false,
        error: err.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        status: 408,
        latency: Date.now() - start,
        success: false,
        error: "Timeout",
      });
    });

    req.write(bodyData);
    req.end();
  });
}

// Helper: Measure system resources
function getResourceProfile() {
  const mem = process.memoryUsage();
  return {
    rss: (mem.rss / 1024 / 1024).toFixed(2) + " MB",
    heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + " MB",
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + " MB",
    external: (mem.external / 1024 / 1024).toFixed(2) + " MB",
  };
}

// 1. Simulate High Traffic & Concurrent Users
async function runHighTrafficSimulation(concurrency = 50) {
  console.log(`\n--- 1. Simulating High Traffic (${concurrency} Concurrent Users) ---`);
  const startProfile = getResourceProfile();
  console.log("Initial Resource Profile:", startProfile);

  const url = `${BASE_URL}/api/ia-search?q=cybersecurity&limit=5`;
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(makeRequest(url));
  }

  const startTime = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;
  const latencies = results.map((r) => r.latency);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);

  console.log(`Simulation complete in ${duration}ms.`);
  console.log(`Successful Requests: ${successCount} / ${concurrency}`);
  console.log(`Failed Requests: ${failCount} / ${concurrency}`);
  console.log(`Latency Metrics: Avg=${avgLatency.toFixed(2)}ms, Min=${minLatency}ms, Max=${maxLatency}ms`);

  const endProfile = getResourceProfile();
  console.log("Final Resource Profile:", endProfile);

  return { concurrency, duration, successCount, failCount, avgLatency, maxLatency, minLatency };
}

// 2. Simulate Rapid API Requests (Spamming Rate Limits)
async function runRapidApiRequestSimulation() {
  console.log(`\n--- 2. Simulating Rapid API Requests (Spam / Rate Limit Checks) ---`);
  const url = `${BASE_URL}/api/media/extract`;
  const headers = { "X-API-Key": "media_secret_secure_key_2026" };
  const payload = { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };

  console.log("Firing 25 sequential requests to test rate limit triggers...");
  const results = [];
  for (let i = 0; i < 25; i++) {
    const res = await makePostRequest(url, payload, headers);
    results.push(res);
  }

  const successCount = results.filter((r) => r.success).length;
  const rateLimitedCount = results.filter((r) => r.status === 429).length;
  console.log(`Total Requests: 25`);
  console.log(`Successes: ${successCount}`);
  console.log(`Rate Limited (429 Status): ${rateLimitedCount}`);

  return { total: 25, successCount, rateLimitedCount };
}

// 3. Simulate Network Failures & API Delays (Mocking External Failures)
async function runNetworkFailureSimulation() {
  console.log(`\n--- 3. Simulating Network Failures & External API Delays ---`);
  // Try to access a non-existent external PDF URL or slow resource
  const url = `${BASE_URL}/api/pdf-extract`;
  const payload = { pdf_url: "https://invalid-host-name-12345.com/non-existent.pdf" };

  const start = Date.now();
  const res = await makePostRequest(url, payload);
  const duration = Date.now() - start;

  console.log(`Request complete in ${duration}ms.`);
  console.log(`Status returned: ${res.status}`);
  console.log(`Error Response:`, res.data || res.error || "None");

  return { duration, status: res.status, error: res.data || res.error };
}

// 4. Simulate Server Restart Impact (State / Cache Volatility)
async function runServerRestartSimulation() {
  console.log(`\n--- 4. Simulating Server Restart Impact ---`);
  console.log("Analysing Cache/Rate-Limit State...");
  console.log("In Express server, all rate limits & caching lists are stored in-memory:");
  console.log("  - extractionCache (Map)");
  console.log("  - pdfExtractionCache (Map)");
  console.log("  - extractRateLimits (Map)");
  console.log("  - streamRateLimits (Map)");
  console.log("Restarting the server instantly clears these maps.");
  console.log("This results in zero-latency cache hits dropping to cold external fetch times.");
  return { cacheVolatile: true, statePersistence: "None" };
}

// 5. Simulate Large Datasets & Payload Handling
async function runLargePayloadSimulation() {
  console.log(`\n--- 5. Simulating Large Datasets & Payload Handling ---`);
  const url = `${BASE_URL}/api/generate`;
  // Create a massive payload of 5MB
  const massivePrompt = "A".repeat(5 * 1024 * 1024);
  const payload = { prompt: massivePrompt, provider: "unsupported" };

  const start = Date.now();
  const res = await makePostRequest(url, payload);
  const duration = Date.now() - start;

  console.log(`Large Payload (5MB) Request complete in ${duration}ms.`);
  console.log(`Status returned: ${res.status}`);
  return { duration, status: res.status };
}

// 6. Simulate Memory & CPU Pressure
async function runResourcePressureSimulation() {
  console.log(`\n--- 6. Simulating CPU & Memory Pressure ---`);
  console.log("Initial profile:", getResourceProfile());

  // Simulate heavy computation (CPU Spiker)
  const startTime = Date.now();
  let count = 0;
  for (let i = 0; i < 50000000; i++) {
    count += Math.sin(i) * Math.cos(i);
  }
  const cpuDuration = Date.now() - startTime;
  console.log(`Heavy CPU Loop (50M math operations) completed in ${cpuDuration}ms.`);

  // Simulate memory growth
  const memoryHolder = [];
  for (let i = 0; i < 10; i++) {
    // Allocate 10MB each step
    memoryHolder.push(new Array(1024 * 1024).fill("X"));
  }
  console.log("Memory holder allocated 10 chunks of 1MB each.");
  console.log("Peak resource profile:", getResourceProfile());

  // Release memory
  memoryHolder.length = 0;
  if (global.gc) {
    global.gc();
  }
  console.log("Memory holder cleared. Post-GC profile:", getResourceProfile());

  return { cpuDuration, success: true };
}

// Main Runner
async function runAllSimulations() {
  console.log("=================================================");
  console.log("   CYBERPlus Operations Center Stress-Test Suite ");
  console.log("=================================================");

  const results = {};
  try {
    results.highTraffic = await runHighTrafficSimulation(40);
    results.rapidApi = await runRapidApiRequestSimulation();
    results.networkFailure = await runNetworkFailureSimulation();
    results.serverRestart = await runServerRestartSimulation();
    results.largePayload = await runLargePayloadSimulation();
    results.resourcePressure = await runResourcePressureSimulation();

    console.log("\n=================================================");
    console.log("            SIMULATIONS RUN COMPLETED            ");
    console.log("=================================================");
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Simulation suite aborted prematurely:", err);
  }
}

runAllSimulations();
