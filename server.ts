import express from "express";
import path from "path";
import dns from "dns";
import https from "https";
import http from "http";
import fs from "fs";
import ytdl from "@distube/ytdl-core";
import YouTube from "youtube-sr";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { exec } from "child_process";
import { promisify } from "util";
import agentRouter from "./src/server/agent";
import pdfAiRouter from "./src/server/pdf-ai";

const execAsync = promisify(exec);

// --- Anti-Detection / Scraping Modules (User Request Alignment) ---
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/118.0",
];

function getRandomHeaders(extraHeaders: any = {}) {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return {
    "User-Agent": userAgent,
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.google.com/",
    ...extraHeaders,
  };
}

// Minimal Proxy Pool structure - scalable later (currently defaults to no proxy unless populated)
const PROXY_POOL: string[] = [];

function getRandomProxy() {
  if (PROXY_POOL.length === 0) return null;
  return PROXY_POOL[Math.floor(Math.random() * PROXY_POOL.length)];
}

let workingYtDlpCmd: string | null = null;
let checkedYtDlp = false;

// Custom robust file downloader inside container that handles intermediate HTTP headers / redirects securely
function downloadFileWithRedirects(
  urlStr: string,
  destPath: string,
  maxRedirects = 5,
  currentRedirect = 0,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (currentRedirect >= maxRedirects) {
      reject(new Error("Too many redirects during yt-dlp binary download"));
      return;
    }

    const parsed = new URL(urlStr);
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;

    const request = client.get(
      urlStr,
      {
        headers: getRandomHeaders(),
        rejectUnauthorized: false,
      },
      (response) => {
        const statusCode = response.statusCode || 200;

        // Redirect cascades
        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          response.headers.location
        ) {
          let redirectUrl = response.headers.location;
          if (!redirectUrl.startsWith("http")) {
            redirectUrl = new URL(redirectUrl, urlStr).toString();
          }
          downloadFileWithRedirects(
            redirectUrl,
            destPath,
            maxRedirects,
            currentRedirect + 1,
          )
            .then(resolve)
            .catch(reject);
          return;
        }

        if (statusCode !== 200) {
          reject(new Error(`Server returned HTTP ${statusCode} for download`));
          return;
        }

        const fileStream = fs.createWriteStream(destPath);
        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });

        fileStream.on("error", (err) => {
          fs.unlink(destPath, () => {}); // clean up partial file
          reject(err);
        });
      },
    );

    request.on("error", (err) => {
      reject(err);
    });
  });
}

// Standalone self-contained Linux amd64 compiled binary manager to bypass Python context errors
async function ensureLocalYtDlpBinary(): Promise<string | null> {
  const binaryPath = "/tmp/yt-dlp";

  if (fs.existsSync(binaryPath)) {
    try {
      await execAsync(`chmod +x "${binaryPath}"`);
      const { stdout } = await execAsync(`"${binaryPath}" --version`, {
        timeout: 2500,
      });
      if (stdout && stdout.trim().length > 0) {
        console.log(
          `[Yt-Dlp Binary] Existing local executable verified successfully: version ${stdout.trim()}`,
        );
        workingYtDlpCmd = binaryPath;
        checkedYtDlp = true;
        return binaryPath;
      }
    } catch (e: any) {
      console.warn(
        `[Yt-Dlp Binary] Existing binary invalid/corrupt: ${e.message}. Downloading clean...`,
      );
    }
  }

  // Standalone high-performance compiled binary released by yt-dlp Core
  const downloadUrl =
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
  console.log(
    `[Yt-Dlp Binary] Downloading standalone compiled binary from ${downloadUrl}...`,
  );

  try {
    await downloadFileWithRedirects(downloadUrl, binaryPath);
    await execAsync(`chmod +x "${binaryPath}"`);
    console.log(
      `[Yt-Dlp Binary] Standing binary downloaded & marked executable.`,
    );

    const { stdout } = await execAsync(`"${binaryPath}" --version`, {
      timeout: 3500,
    });
    console.log(
      `[Yt-Dlp Binary] Download verified. Standalone version: ${stdout.trim()}`,
    );
    workingYtDlpCmd = binaryPath;
    checkedYtDlp = true;
    return binaryPath;
  } catch (err: any) {
    console.error(`[Yt-Dlp Binary Setup Failed]`, err.message);
    return null;
  }
}

async function getWorkingYtDlpCmd(): Promise<string | null> {
  if (workingYtDlpCmd) return workingYtDlpCmd;

  // 1. Standalone /tmp binary check first
  const binaryPath = "/tmp/yt-dlp";
  if (fs.existsSync(binaryPath)) {
    try {
      const { stdout } = await execAsync(`"${binaryPath}" --version`, {
        timeout: 1500,
      });
      if (stdout && stdout.trim().length > 0) {
        workingYtDlpCmd = binaryPath;
        checkedYtDlp = true;
        return workingYtDlpCmd;
      }
    } catch (e) {}
  }

  // 2. Sequential system commands check
  checkedYtDlp = true;
  const commands = ["yt-dlp", "python3 -m yt_dlp", "python -m yt_dlp"];
  for (const cmd of commands) {
    try {
      const { stdout } = await execAsync(`${cmd} --version`, { timeout: 1500 });
      if (stdout && stdout.trim().length > 0) {
        console.log(`[Yt-Dlp Detector] Found active system yt-dlp: ${cmd}`);
        workingYtDlpCmd = cmd;
        return workingYtDlpCmd;
      }
    } catch (e) {
      // Command or module not active
    }
  }
  console.log(`[Yt-Dlp Detector] No system yt-dlp active in this environment.`);
  return null;
}

// Resolve dual-stack IPv6 name resolution issues inside container environment by preferring IPv4
dns.setDefaultResultOrder("ipv4first");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // API proxy endpoint for Internet Archive Advanced Search
  app.get("/api/ia-search", async (req, res) => {
    try {
      // Capture the portion of the url after the base route to preserve arrays (like fl[]) perfectly
      const queryPart = req.url.substring(req.url.indexOf("?"));
      const iaUrl = `https://archive.org/advancedsearch.php${queryPart !== req.url ? queryPart : ""}`;

      const accessKey = process.env.IA_ACCESS_KEY;
      const secretKey = process.env.IA_SECRET_KEY;

      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      const hasValidKeys =
        accessKey &&
        secretKey &&
        accessKey !== "MY_IA_ACCESS_KEY" &&
        secretKey !== "MY_IA_SECRET_KEY" &&
        !accessKey.startsWith("YOUR_");

      // Add IA S3-style auth headers if both are valid
      if (hasValidKeys) {
        headers["Authorization"] = `LOW ${accessKey}:${secretKey}`;
      }

      console.log(`[IA Proxy] Fetching ${iaUrl}`);
      let response = await fetch(iaUrl, { headers });

      // Fallback on 401 Unauthorized status
      if (response.status === 401 && headers["Authorization"]) {
        console.warn(
          `[IA Proxy Warn] Authorized request failed with 401. Retrying anonymously...`,
        );
        delete headers["Authorization"];
        response = await fetch(iaUrl, { headers });
      }

      if (!response.ok && response.status !== 401) {
        console.warn(
          `[IA Proxy Warn] Server returned status ${response.status} for ${iaUrl}`,
        );
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error(
          `[IA Proxy Error] Failed to parse JSON from IA. Response snippet: ${text.slice(0, 200)}`,
        );
        return res
          .status(502)
          .json({ error: "Invalid response from Internet Archive" });
      }
      return res.json(data);
    } catch (error) {
      console.error("[IA Proxy Error]", error);
      res.status(500).json({ error: "Failed to fetch from Internet Archive" });
    }
  });

  // API proxy endpoint for YouTube media searching
  app.get("/api/media/search", async (req, res) => {
    const query = req.query.q;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing query" });
    }

    // 1. Primary Attempt: Fast/Native local yt-dlp search
    try {
      console.log(
        `[YouTube Scraper Search] Primary attempt using native local yt-dlp: ${query}`,
      );
      const searchResults = await searchViaLocalYtdlp(query, 15);
      if (searchResults && searchResults.length > 0) {
        const formatted = searchResults.map((video: any) => {
          const videoId = video.id;
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          return {
            id: `yt-${videoId}`,
            title: video.title || "YouTube Video",
            creator: video.channel?.name || "YouTube Creator",
            source: "YouTube (Local yt-dlp)",
            audioPreviewUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=audio`,
            videoPreviewUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`,
            mp3DownloadUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=audio`,
            mp4DownloadUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`,
          };
        });
        console.log(
          `[YouTube Scraper Search] Primary local yt-dlp search succeeded with ${formatted.length} results`,
        );
        return res.json(formatted);
      }
    } catch (localYtDlpErr: any) {
      console.warn(
        `[YouTube Scraper Search] Primary local yt-dlp search failed: ${localYtDlpErr?.message || String(localYtDlpErr)}`,
      );
    }

    // 2. Secondary Attempt: youtube-sr scraper
    try {
      console.log(
        `[YouTube Scraper Search] Secondary attempt using youtube-sr: ${query}`,
      );
      const yt = (YouTube as any).default || YouTube;
      const searchResults = await yt.search(query, {
        limit: 15,
        type: "video",
        requestOptions: {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
      });

      const formatted = searchResults.map((video: any) => {
        const videoId = video.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        return {
          id: `yt-${videoId}`,
          title: video.title || "YouTube Video",
          creator: video.channel?.name || "YouTube Creator",
          source: "YouTube",
          audioPreviewUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=audio`,
          videoPreviewUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`,
          mp3DownloadUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=audio`,
          mp4DownloadUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`,
        };
      });

      console.log(
        `[YouTube Scraper Search] Secondary youtube-sr search succeeded with ${formatted.length} results`,
      );
      return res.json(formatted);
    } catch (error: any) {
      console.warn(
        "[Media Search] youtube-sr parsing paused (YouTube structure change), cascading to public fallback node search engines.",
      );

      // 3. Fallback: Dynamic Active Piped nodes search
      try {
        console.log(
          `[YouTube Scraper Search Fallback] Falling back using dynamic/active public Piped nodes...`,
        );
        const instances = await getActivePipedInstances();

        for (const instance of instances) {
          try {
            // Ignore known defunct nodes
            if (
              instance.includes("colby.moe") ||
              instance.includes("darkness.services") ||
              instance.includes("piped.yt")
            ) {
              continue;
            }
            console.log(
              `[YouTube Scraper Search Fallback] Trying instance: ${instance}/search...`,
            );
            const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);

            const rawRes = await fetch(url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (rawRes.ok) {
              const data = await rawRes.json();
              const items = data.items || [];
              if (items.length > 0) {
                const formatted = items.map((video: any) => {
                  const videoId = video.url
                    ? video.url.split("watch?v=")[1]
                    : video.id;
                  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                  return {
                    id: `yt-${videoId}`,
                    title: video.title || "YouTube Video",
                    creator: video.uploaderName || "YouTube Creator",
                    source: "YouTube (Fallback Search)",
                    audioPreviewUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=audio`,
                    videoPreviewUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`,
                    mp3DownloadUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=audio`,
                    mp4DownloadUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`,
                  };
                });
                console.log(
                  `[YouTube Scraper Search Fallback] Fallback succeeded with ${formatted.length} entries`,
                );
                return res.json(formatted);
              }
            }
          } catch (innerErr) {
            // Keep logs absolutely clean of defunct connection errors
          }
        }
      } catch (fallbackError) {
        console.log(
          "[YouTube Scraper Search Fallback] Piped search nodes exhausted",
        );
      }

      // 4. Fallback: Dynamic Active Invidious nodes search
      try {
        console.log(
          `[YouTube Scraper Search Fallback] Falling back using dynamic/active public Invidious nodes...`,
        );
        const invidiousInstances = await getActiveInvidiousInstances();

        for (const instance of invidiousInstances) {
          try {
            console.log(
              `[YouTube Scraper Search Fallback] Trying Invidious instance: ${instance}/api/v1/search...`,
            );
            const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);

            const rawRes = await fetch(url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (rawRes.ok) {
              const items = await rawRes.json();
              if (Array.isArray(items) && items.length > 0) {
                const formatted = items.map((video: any) => {
                  const videoId = video.videoId;
                  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                  return {
                    id: `yt-${videoId}`,
                    title: video.title || "YouTube Video",
                    creator: video.author || "YouTube Creator",
                    source: "YouTube (Invidious Fallback Search)",
                    audioPreviewUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=audio`,
                    videoPreviewUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`,
                    mp3DownloadUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=audio`,
                    mp4DownloadUrl: `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`,
                  };
                });
                console.log(
                  `[YouTube Scraper Search Fallback] Invidious fallback succeeded with ${formatted.length} entries`,
                );
                return res.json(formatted);
              }
            }
          } catch (innerErr) {
            // Keep logs clean of defunct connection errors
          }
        }
      } catch (fallbackError) {
        console.log(
          "[YouTube Scraper Search Fallback] Invidious search nodes exhausted",
        );
      }

      return res.json([]);
    }
  });

  // Helper to extract the 11-character video ID from any YouTube URL format safely
  function getYouTubeID(url: string): string | null {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].trim().length === 11 ? match[2].trim() : null;
  }

  // Robust Native Request Helper to completely bypass undici fetch issues and provide secure SSL-ignoring queries
  function requestPromise(
    urlStr: string,
    method: "GET" | "POST",
    bodyObj?: any,
    headersObj: Record<string, string> = {},
    timeoutMs = 12000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(urlStr);
        const isHttps = url.protocol === "https:";
        const client = isHttps ? https : http;

        const options: https.RequestOptions = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: method,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "application/json",
            ...headersObj,
          },
          timeout: timeoutMs,
          rejectUnauthorized: false,
        };

        let bodyData: string | undefined;
        if (bodyObj) {
          bodyData = JSON.stringify(bodyObj);
          options.headers = {
            ...options.headers,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(bodyData),
          };
        }

        const req = client.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                resolve(data);
              }
            } else {
              reject(
                new Error(
                  `Status Code: ${res.statusCode}, Body: ${data.substring(0, 300)}`,
                ),
              );
            }
          });
        });

        req.on("error", (err) => {
          reject(err);
        });

        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request timed out"));
        });

        if (bodyData) {
          req.write(bodyData);
        }
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Keep track of instances that have failed recently to avoid wasting time on offline servers
  const offlineInstances = new Map<string, number>();

  // In-memory cache for fast media resource resolution and streaming routing acceleration
  const extractionCache = new Map<
    string,
    {
      videoUrl: string;
      audioUrl: string;
      expiresAt: number;
    }
  >();

  // Simple in-memory proxy pool for yt-dlp (populated via env, or default fallbacks)
  const proxyPoolStr = process.env.PROXY_POOL || "";
  const proxyPool = proxyPoolStr
    ? proxyPoolStr.split(",").map((p) => p.trim())
    : [];
  let currentProxyIndex = Math.floor(Math.random() * 100);

  // Helper to execute local yt-dlp binary if available
  async function extractViaLocalYtdlp(videoUrl: string): Promise<any | null> {
    const cmdBase = await getWorkingYtDlpCmd();
    if (!cmdBase) return null;

    const safeUrl = videoUrl.replace(/"/g, '\\"');
    const execCmd =
      cmdBase.includes("/") || cmdBase.includes("\\")
        ? `"${cmdBase}"`
        : cmdBase;

    // Use proxy if available
    let proxyArg = "";
    if (proxyPool.length > 0) {
      const proxy = proxyPool[++currentProxyIndex % proxyPool.length];
      proxyArg = `--proxy "${proxy}" `;
    }

    // Include PO Token or cookies via env, plus standard bot bypass strategies
    const poToken = process.env.PO_TOKEN || "MnQxU0xS..."; // Placeholder if missing
    const cookiesArg = process.env.YOUTUBE_COOKIES_FILE
      ? `--cookies "${process.env.YOUTUBE_COOKIES_FILE}" `
      : "";

    // High-fidelity extraction args for bot bypass
    const extractorArgs = `--extractor-args "youtube:player_client=ios,android,web;po_token=web+${poToken}"`;
    const formatArgs = `-f "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best"`;

    const fullCmd = `${execCmd} ${proxyArg}${cookiesArg}-j --no-warnings --skip-download ${formatArgs} ${extractorArgs} "${safeUrl}"`;

    try {
      console.log(`[Local yt-dlp] Running command: ${fullCmd}`);
      const { stdout } = await execAsync(fullCmd);
      if (stdout) {
        const info = JSON.parse(stdout);
        if (info) {
          console.log(
            `[Local yt-dlp] Successful extraction for title: ${info.title}`,
          );

          const formats = info.formats || [];

          // 1. Best audio-only stream (corresponds to user's Python logic)
          const audioFormats = formats.filter(
            (f: any) => f.vcodec === "none" && f.acodec !== "none" && f.url,
          );
          let audioDirectUrl = null;
          if (audioFormats.length > 0) {
            const sortedAudio = audioFormats.sort(
              (a: any, b: any) => (b.abr || 0) - (a.abr || 0),
            );
            audioDirectUrl = sortedAudio[0].url;
          }

          // 2. Best combined video+audio stream (usually up to 720p, corresponding to user's Python logic)
          const combinedFormats = formats.filter(
            (f: any) => f.vcodec !== "none" && f.acodec !== "none" && f.url,
          );
          let videoDirectUrl = null;
          if (combinedFormats.length > 0) {
            const sortedCombined = combinedFormats.sort(
              (a: any, b: any) => (b.height || 0) - (a.height || 0),
            );
            videoDirectUrl = sortedCombined[0].url;
          }

          // Fallbacks if no combined video+audio is found
          if (!videoDirectUrl) {
            const videoFormats = formats.filter(
              (f: any) => f.vcodec !== "none" && f.url,
            );
            if (videoFormats.length > 0) {
              const sortedVideo = videoFormats.sort(
                (a: any, b: any) => (b.height || 0) - (a.height || 0),
              );
              videoDirectUrl = sortedVideo[0].url;
            }
          }

          // If no audio-only remains, fall back to combined
          if (!audioDirectUrl && videoDirectUrl) {
            audioDirectUrl = videoDirectUrl;
          }

          return {
            ...info,
            audio_direct_url: audioDirectUrl,
            video_direct_url: videoDirectUrl,
          };
        }
      }
    } catch (err: any) {
      console.log(
        `[Local yt-dlp] Command failed: ${err?.message || String(err)}`,
      );
    }
    return null;
  }

  // Helper to search YouTube via local yt-dlp binary if available
  async function searchViaLocalYtdlp(
    query: string,
    limit: number = 15,
  ): Promise<any[] | null> {
    const cmdBase = await getWorkingYtDlpCmd();
    if (!cmdBase) return null;

    const safeQuery = query.replace(/"/g, '\\"');
    const fullCmd =
      cmdBase === "yt-dlp"
        ? `yt-dlp "ytsearch${limit}:${safeQuery}" --no-warnings --dump-single-json --flat-playlist --extractor-args "youtube:player_client=ios,android,web"`
        : `${cmdBase} "ytsearch${limit}:${safeQuery}" --no-warnings --dump-single-json --flat-playlist --extractor-args "youtube:player_client=ios,android,web"`;

    try {
      console.log(`[Local yt-dlp Search] Running command: ${fullCmd}`);
      const { stdout } = await execAsync(fullCmd);
      if (stdout) {
        const playlist = JSON.parse(stdout);
        const entries = playlist.entries || [];
        if (entries.length > 0) {
          console.log(
            `[Local yt-dlp Search] Successfully retrieved ${entries.length} items`,
          );
          return entries.map((entry: any) => ({
            id: entry.id || entry.url,
            title: entry.title || "YouTube Video",
            channel: {
              name: entry.uploader || entry.channel || "YouTube Creator",
            },
          }));
        }
      }
    } catch (err: any) {
      console.log(
        `[Local yt-dlp Search] Command failed: ${err?.message || String(err)}`,
      );
    }
    return null;
  }

  async function raceAll<T>(promises: Promise<T>[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let rejectedCount = 0;
      const errors: any[] = [];
      if (promises.length === 0) {
        return reject(new Error("No promises to race"));
      }
      promises.forEach((p) => {
        p.then(resolve).catch((err) => {
          errors.push(err);
          rejectedCount++;
          if (rejectedCount === promises.length) {
            reject(
              new Error(
                "All raced promises failed: " +
                  errors.map((e) => e.message).join(", "),
              ),
            );
          }
        });
      });
    });
  }

  // Helper for YouTube/media extraction via Cobalt API instances
  async function extractViaPublicCobalt(
    videoUrl: string,
    downloadMode: "video" | "audio" = "video",
  ): Promise<string | null> {
    const baseInstances = [
      "https://cobalt-api.lunes.host",
      "https://cobalt.inst.moe",
      "https://cobalt.kcom.moe",
      "https://cobalt.twst.ovh",
      "https://cobalt.synced.org.nz",
      "https://cobalt.pinter.io",
      "https://cobalt.sh",
      "https://cobalt.q69.de",
    ];

    const now = Date.now();
    const activeBases = baseInstances.filter((base) => {
      if (offlineInstances.has(base)) {
        const offlineTime = offlineInstances.get(base) || 0;
        if (now - offlineTime < 5 * 60 * 1000) {
          // 5-minute cooldown
          return false;
        } else {
          offlineInstances.delete(base);
        }
      }
      return true;
    });

    const attemptBase = async (base: string): Promise<string> => {
      // 1. Try modern Cobalt v10 POST request on root "/"
      try {
        const payloadV10 = {
          url: videoUrl,
          vQuality: "720",
          aFormat: "mp3",
          filenameStyle: "basic",
          downloadMode: downloadMode,
        };

        const data = await requestPromise(
          `${base}/`,
          "POST",
          payloadV10,
          {
            Accept: "application/json",
          },
          3500,
        );

        if (data && data.url) {
          return data.url;
        } else if (data && data.picker && data.picker.length > 0) {
          const bestItem =
            data.picker.find((p: any) => p.url) || data.picker[0];
          if (bestItem && bestItem.url) return bestItem.url;
        }
      } catch (err: any) {
        if (
          err?.message?.includes("ENOTFOUND") ||
          err?.message?.includes("ECONNREFUSED") ||
          err?.message?.includes("Request timed out") ||
          err?.message?.includes("jwt")
        ) {
          offlineInstances.set(base, Date.now());
        }
      }

      // 2. Fall back to legacy Cobalt v7 POST on "/api/json"
      try {
        const payloadV7 = {
          url: videoUrl,
          videoQuality: "720",
          audioFormat: "mp3",
          filenamePattern: "basic",
          isAudioOnly: downloadMode === "audio",
        };

        const data = await requestPromise(
          `${base}/api/json`,
          "POST",
          payloadV7,
          {
            Accept: "application/json",
          },
          3500,
        );

        if (data && data.url) {
          return data.url;
        } else if (data && data.picker && data.picker.length > 0) {
          const bestItem =
            data.picker.find((p: any) => p.url) || data.picker[0];
          if (bestItem && bestItem.url) return bestItem.url;
        }
      } catch (err: any) {
        if (
          err?.message?.includes("ENOTFOUND") ||
          err?.message?.includes("ECONNREFUSED") ||
          err?.message?.includes("Request timed out") ||
          err?.message?.includes("shut down")
        ) {
          offlineInstances.set(base, Date.now());
        }
      }

      throw new Error(`Node ${base} unavailable`);
    };

    const primaryPool = activeBases.slice(0, 4);
    const secondaryPool = activeBases.slice(4);

    if (primaryPool.length > 0) {
      try {
        const result = await raceAll(primaryPool.map(attemptBase));
        if (result) return result;
      } catch (e) {
        console.log(
          `[Cobalt Racer] Primary pool nodes were busy, checking backup secondary pool...`,
        );
      }
    }

    if (secondaryPool.length > 0) {
      try {
        const result = await raceAll(secondaryPool.map(attemptBase));
        if (result) return result;
      } catch (e) {
        console.log(`[Cobalt Racer] Secondary pool nodes occupied too.`);
      }
    }

    return null;
  }

  let cachedInvidiousInstances: string[] | null = null;
  let lastInvidiousFetchTime = 0;

  // Dynamically fetch and rank the healthiest public Invidious instances on demand to completely bypass node bans / rate-limitations
  async function getActiveInvidiousInstances(): Promise<string[]> {
    const now = Date.now();
    const defaultInstances = [
      "https://yewtu.be",
      "https://invidious.nerdvpn.de",
      "https://inv.zzls.xyz",
      "https://inv.nadeko.net",
      "https://invidious.lunar.icu",
      "https://invidious.flokinet.to",
      "https://invidious.projectsegfau.lt",
      "https://iv.melmac.space",
      "https://invidious.asir.dev",
      "https://invidious.privacydev.net",
      "https://invidious.slipfox.xyz",
      "https://invidious.esmailelbob.xyz",
      "https://invidious.tiekoetter.com",
      "https://invidious.backingman.fr",
    ];

    if (
      cachedInvidiousInstances &&
      now - lastInvidiousFetchTime < 15 * 60 * 1000
    ) {
      return cachedInvidiousInstances;
    }

    try {
      console.log(
        `[Dynamic Invidious Provider] Fetching live Invidious healthy nodes...`,
      );
      const data = await requestPromise(
        "https://api.invidious.io/instances.json",
        "GET",
        undefined,
        {
          Accept: "application/json",
        },
      );
      if (Array.isArray(data)) {
        const active = data
          .filter((item: any) => {
            if (!Array.isArray(item) || item.length < 2) return false;
            const details = item[1];
            return (
              details &&
              details.api === true &&
              details.type === "https" &&
              details.uri
            );
          })
          .sort((a: any, b: any) => {
            const healthA = a[1].stats?.health || 0;
            const healthB = b[1].stats?.health || 0;
            return healthB - healthA;
          })
          .map((item: any) => item[1].uri);

        if (active.length > 0) {
          console.log(
            `[Dynamic Invidious Provider] Retrieved ${active.length} active nodes successfully.`,
          );
          cachedInvidiousInstances = Array.from(
            new Set([...active, ...defaultInstances]),
          );
          lastInvidiousFetchTime = now;
          return cachedInvidiousInstances;
        }
      }
    } catch (e: any) {
      console.log(
        `[Dynamic Invidious Provider] Dynamic load unreached, falling back to static nodes pool`,
      );
    }

    if (!cachedInvidiousInstances) {
      cachedInvidiousInstances = defaultInstances;
      lastInvidiousFetchTime = now - 14 * 60 * 1000; // retry in one minute
    }
    return cachedInvidiousInstances;
  }

  let cachedPipedInstances: string[] | null = null;
  let lastPipedFetchTime = 0;

  // Dynamically fetch active public Piped nodes
  async function getActivePipedInstances(): Promise<string[]> {
    const now = Date.now();
    const defaultInstances = [
      "https://pipedapi.kavin.rocks",
      "https://api.piped.privacydev.net",
      "https://pipedapi.tokhmi.xyz",
      "https://pipedapi.leptons.xyz",
      "https://pipedapi.swg.rocks",
      "https://pipedapi.colby.wtf",
      "https://piped-api.lre.su",
      "https://pipedapi.projectsegfau.lt",
      "https://pipedapi.adminforge.de",
      "https://pipedapi.drgns.space",
      "https://piped-api.garudalinux.org",
      "https://pipedapi.comfortg.me",
      "https://api-piped.mha.fi",
      "https://pipedapi.mha.fi",
      "https://piped-api.riv.car",
    ];

    if (cachedPipedInstances && now - lastPipedFetchTime < 15 * 60 * 1000) {
      return cachedPipedInstances;
    }

    try {
      console.log(
        `[Dynamic Piped Provider] Fetching live Piped active nodes...`,
      );
      const data = await requestPromise(
        "https://piped-instances.pages.dev/data.json",
        "GET",
        undefined,
        {
          Accept: "application/json",
        },
      );
      let active: string[] = [];
      if (data) {
        if (Array.isArray(data)) {
          active = data
            .filter(
              (inst: any) => inst && inst.api && inst.api.startsWith("https"),
            )
            .map((inst: any) => inst.api);
        } else if (Array.isArray(data.instances)) {
          active = data.instances
            .filter(
              (inst: any) => inst && inst.api && inst.api.startsWith("https"),
            )
            .map((inst: any) => inst.api);
        }
      }
      if (active.length > 0) {
        console.log(
          `[Dynamic Piped Provider] Retrieved ${active.length} active nodes successfully.`,
        );
        cachedPipedInstances = Array.from(
          new Set([...active, ...defaultInstances]),
        );
        lastPipedFetchTime = now;
        return cachedPipedInstances;
      }
    } catch (e: any) {
      console.log(
        `[Dynamic Piped Provider] Dynamic load unreached, falling back to static nodes pool`,
      );
    }

    if (!cachedPipedInstances) {
      cachedPipedInstances = defaultInstances;
      lastPipedFetchTime = now - 14 * 60 * 1000; // retry in one minute
    }
    return cachedPipedInstances;
  }

  // Advanced Helper for YouTube extraction via Public Invidious Instances
  async function extractViaPublicInvidious(youtubeId: string): Promise<{
    title: string;
    creator: string;
    videoPreviewUrl: string;
    audioPreviewUrl: string;
    mp4DownloadUrl: string;
    mp3DownloadUrl: string;
  } | null> {
    const instances = await getActiveInvidiousInstances();

    const now = Date.now();
    const activeInstances = instances.filter((base) => {
      if (offlineInstances.has(base)) {
        const offlineTime = offlineInstances.get(base) || 0;
        if (now - offlineTime < 8 * 60 * 1000) {
          // 8-minute cooldown
          return false;
        } else {
          offlineInstances.delete(base);
        }
      }
      return true;
    });

    const attemptNode = async (base: string) => {
      try {
        const data = await requestPromise(
          `${base}/api/v1/videos/${youtubeId}`,
          "GET",
          undefined,
          {
            Accept: "application/json",
          },
          3500,
        );
        if (data && data.formatStreams && data.formatStreams.length > 0) {
          const videoStream =
            data.formatStreams.find(
              (s: any) => s.container === "mp4" && s.qualityLabel === "720p",
            ) ||
            data.formatStreams.find((s: any) => s.container === "mp4") ||
            data.formatStreams[0];

          let audioUrl = videoStream.url;
          if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
            const audioStream = data.adaptiveFormats.find(
              (s: any) => s.type && s.type.startsWith("audio/"),
            );
            if (audioStream && audioStream.url) {
              audioUrl = audioStream.url;
            }
          }

          return {
            title: data.title || "Invidious Media Stream",
            creator: data.author || "YouTube Channel",
            videoPreviewUrl: videoStream.url,
            audioPreviewUrl: audioUrl,
            mp4DownloadUrl: videoStream.url,
            mp3DownloadUrl: audioUrl,
          };
        }
        offlineInstances.set(base, Date.now());
      } catch (err) {
        offlineInstances.set(base, Date.now());
        throw err;
      }
      throw new Error(`Node ${base} returned invalid data layout`);
    };

    const primaryPool = activeInstances.slice(0, 4);
    const secondaryPool = activeInstances.slice(4);

    if (primaryPool.length > 0) {
      try {
        const result = await raceAll(primaryPool.map(attemptNode));
        if (result) return result;
      } catch (e) {
        console.log("[Invidious Racer] Primary pool nodes check complete.");
      }
    }

    if (secondaryPool.length > 0) {
      try {
        const result = await raceAll(secondaryPool.map(attemptNode));
        if (result) return result;
      } catch (e) {
        console.log("[Invidious Racer] Secondary pool nodes check complete.");
      }
    }

    return null;
  }

  // Advanced Helper for YouTube extraction via Public Piped Instances
  async function extractViaPublicPiped(youtubeId: string): Promise<{
    title: string;
    creator: string;
    videoPreviewUrl: string;
    audioPreviewUrl: string;
    mp4DownloadUrl: string;
    mp3DownloadUrl: string;
  } | null> {
    const instances = await getActivePipedInstances();

    const now = Date.now();
    const activeInstances = instances.filter((base) => {
      if (offlineInstances.has(base)) {
        const offlineTime = offlineInstances.get(base) || 0;
        if (now - offlineTime < 8 * 60 * 1000) {
          // 8-minute cooldown
          return false;
        } else {
          offlineInstances.delete(base);
        }
      }
      return true;
    });

    const attemptNode = async (base: string) => {
      try {
        const data = await requestPromise(
          `${base}/streams/${youtubeId}`,
          "GET",
          undefined,
          {
            Accept: "application/json",
          },
          3500,
        );
        if (data && data.videoStreams && data.videoStreams.length > 0) {
          const mp4Streams = data.videoStreams.filter(
            (s: any) => s.format === "MPEG_4" || s.extension === "mp4",
          );
          const videoStream =
            mp4Streams.find((s: any) => s.quality === "720p") ||
            mp4Streams[0] ||
            data.videoStreams[0];

          let audioUrl = videoStream.url;
          if (data.audioStreams && data.audioStreams.length > 0) {
            audioUrl = data.audioStreams[0].url;
          }

          return {
            title: data.title || "Piped Media Stream",
            creator: data.uploader || "YouTube Creator",
            videoPreviewUrl: videoStream.url,
            audioPreviewUrl: audioUrl,
            mp4DownloadUrl: videoStream.url,
            mp3DownloadUrl: audioUrl,
          };
        }
        offlineInstances.set(base, Date.now());
      } catch (err: any) {
        offlineInstances.set(base, Date.now());
        throw err;
      }
      throw new Error(`Node ${base} returned empty streams list`);
    };

    const primaryPool = activeInstances.slice(0, 4);
    const secondaryPool = activeInstances.slice(4);

    if (primaryPool.length > 0) {
      try {
        const result = await raceAll(primaryPool.map(attemptNode));
        if (result) return result;
      } catch (e) {
        console.log("[Piped Racer] Primary pool nodes check complete.");
      }
    }

    if (secondaryPool.length > 0) {
      try {
        const result = await raceAll(secondaryPool.map(attemptNode));
        if (result) return result;
      } catch (e) {
        console.log("[Piped Racer] Secondary pool nodes check complete.");
      }
    }

    return null;
  }

  // Simple, robust middleware to authenticate frontend-backend API requests
  const validateApiKey = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    return next();
  };

  // Simple in-memory rate limiting for extraction requests
  const extractRateLimits = new Map<string, number>();
  setInterval(() => extractRateLimits.clear(), 60000); // Reset every minute

  const extractRateLimitMiddleware = (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const count = extractRateLimits.get(ip) || 0;
    if (count > 20) {
      console.warn(
        `[Rate Limit] Blocked IP ${ip} for spamming extraction requests.`,
      );
      return res
        .status(429)
        .send("Too many extraction requests. Please wait a moment.");
    }
    extractRateLimits.set(ip, count + 1);
    next();
  };

  // Unified robust endpoint for handling client media extraction requests server-side
  app.post(
    "/api/media/extract",
    validateApiKey,
    extractRateLimitMiddleware,
    async (req, res) => {
      const { url } = req.body;
      if (!url) {
        return res
          .status(400)
          .json({ error: "Missing 'url' parameter in request body." });
      }

      const youtubeId = getYouTubeID(url);

      // 0. Cache Check for zero-latency retrieval
      const cached =
        extractionCache.get(url) ||
        (youtubeId ? extractionCache.get(youtubeId) : null);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`[Unified Media Extractor] Instant Cache Hit for: ${url}`);
        const rawVideo = cached.videoUrl;
        const rawAudio = cached.audioUrl;
        const proxiedVideo = rawVideo.startsWith("/api/yt/stream")
          ? rawVideo
          : `/api/yt/stream?url=${encodeURIComponent(rawVideo)}&format=video`;
        const proxiedAudio = rawAudio.startsWith("/api/yt/stream")
          ? rawAudio
          : `/api/yt/stream?url=${encodeURIComponent(rawAudio)}&format=audio`;
        return res.json({
          success: true,
          title: "Extracted Media Stream (Cached)",
          videoPreviewUrl: proxiedVideo,
          audioPreviewUrl: proxiedAudio,
          mp4DownloadUrl: proxiedVideo,
          mp3DownloadUrl: proxiedAudio,
          source: "YouTube (Cache)",
          creator: "Fast Retrieval Engine",
        });
      }

      // 1. Primary Attempt #1: Direct node-level static yt-dlp execution (Highest fidelity, up-to-date, IP-aligned)
      try {
        console.log(
          `[Unified Media Extractor] First Attempt: Direct local yt-dlp execution for URL: ${url}`,
        );
        const localInfo = await extractViaLocalYtdlp(url);
        if (localInfo) {
          const videoUrl = localInfo.video_direct_url;
          const audioUrl = localInfo.audio_direct_url;

          if (videoUrl || audioUrl) {
            console.log(
              `[Unified Media Extractor] Direct local yt-dlp extraction succeeded first-try!`,
            );

            const resolvedVideo = videoUrl || audioUrl;
            const resolvedAudio = audioUrl || videoUrl;

            // Populate cache with raw urls
            extractionCache.set(url, {
              videoUrl: resolvedVideo,
              audioUrl: resolvedAudio,
              expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour expiration
            });
            if (youtubeId) {
              extractionCache.set(youtubeId, {
                videoUrl: resolvedVideo,
                audioUrl: resolvedAudio,
                expiresAt: Date.now() + 60 * 60 * 1000,
              });
            }

            const proxiedVideo = `/api/yt/stream?url=${encodeURIComponent(resolvedVideo)}&format=video`;
            const proxiedAudio = `/api/yt/stream?url=${encodeURIComponent(resolvedAudio)}&format=audio`;

            return res.json({
              success: true,
              title: localInfo.title || "Extracted Video Stream",
              videoPreviewUrl: proxiedVideo,
              audioPreviewUrl: proxiedAudio,
              mp4DownloadUrl: proxiedVideo,
              mp3DownloadUrl: proxiedAudio,
              source: "YouTube (Local yt-dlp Engine)",
              creator: localInfo.uploader || "yt-dlp Engine",
            });
          }
        }
      } catch (localYtdlpErr: any) {
        console.warn(
          `[Unified Media Extractor] Primary local yt-dlp execution bypassed: ${localYtdlpErr?.message || String(localYtdlpErr)}`,
        );
      }

      // 2. Parallel Racing Extraction Pool (Cobalt, Invidious, Piped)
      const parallelPool: Promise<any>[] = [];

      // Promise A: Cobalt
      parallelPool.push(
        (async () => {
          const cobaltUrl = await extractViaPublicCobalt(url, "video");
          if (!cobaltUrl)
            throw new Error("Cobalt execution returned empty URL");
          return {
            videoUrl: cobaltUrl,
            audioUrl: cobaltUrl,
            title: "Extracted Media Stream",
            source: "YouTube (Cobalt)",
            creator: "Cobalt Public API",
          };
        })(),
      );

      if (youtubeId) {
        // Promise B: Invidious
        parallelPool.push(
          (async () => {
            const invidiousData = await extractViaPublicInvidious(youtubeId);
            if (!invidiousData)
              throw new Error("Invidious execution returned null");
            return {
              videoUrl: invidiousData.videoPreviewUrl,
              audioUrl: invidiousData.audioPreviewUrl,
              title: invidiousData.title,
              source: "YouTube (Invidious Fallback)",
              creator: invidiousData.creator,
            };
          })(),
        );

        // Promise C: Piped
        parallelPool.push(
          (async () => {
            const pipedData = await extractViaPublicPiped(youtubeId);
            if (!pipedData) throw new Error("Piped execution returned null");
            return {
              videoUrl: pipedData.videoPreviewUrl,
              audioUrl: pipedData.audioPreviewUrl,
              title: pipedData.title,
              source: "YouTube (Piped Fallback)",
              creator: pipedData.creator,
            };
          })(),
        );
      }

      try {
        console.log(
          `[Unified Media Extractor] Initiating parallel race extraction for URL: ${url}`,
        );
        const fastestResult = await raceAll(parallelPool);
        if (fastestResult) {
          console.log(
            `[Unified Media Extractor] Parallel race extraction succeeded via ${fastestResult.source}`,
          );
          // Populate cache with raw urls
          extractionCache.set(url, {
            videoUrl: fastestResult.videoUrl,
            audioUrl: fastestResult.audioUrl,
            expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour expiration
          });
          if (youtubeId) {
            extractionCache.set(youtubeId, {
              videoUrl: fastestResult.videoUrl,
              audioUrl: fastestResult.audioUrl,
              expiresAt: Date.now() + 60 * 60 * 1000,
            });
          }

          const proxiedVideo = `/api/yt/stream?url=${encodeURIComponent(fastestResult.videoUrl)}&format=video`;
          const proxiedAudio = `/api/yt/stream?url=${encodeURIComponent(fastestResult.audioUrl)}&format=audio`;

          return res.json({
            success: true,
            title: fastestResult.title,
            videoPreviewUrl: proxiedVideo,
            audioPreviewUrl: proxiedAudio,
            mp4DownloadUrl: proxiedVideo,
            mp3DownloadUrl: proxiedAudio,
            source: fastestResult.source,
            creator: fastestResult.creator,
          });
        }
      } catch (raceErr: any) {
        console.warn(
          `[Unified Media Extractor] Quick Parallel racing failed: ${raceErr?.message || String(raceErr)}. Advancing to sequential fallbacks...`,
        );
      }

      // 2. Sequential fallback: Direct native @distube/ytdl-core extraction
      try {
        console.log(
          `[Unified Media Extractor] Fallback: @distube/ytdl-core for URL: ${url}`,
        );
        const data = await ytdl.getInfo(url);
        if (
          data &&
          data.videoDetails &&
          data.formats &&
          data.formats.length > 0
        ) {
          const muxed =
            data.formats.find((f: any) => f.hasVideo && f.hasAudio) ||
            data.formats.find((f: any) => f.url && f.hasVideo) ||
            data.formats[0];

          const rawVideo = muxed.url;
          const rawAudio = muxed.url;

          console.log(
            `[Unified Media Extractor] @distube/ytdl-core extraction succeeded!`,
          );

          extractionCache.set(url, {
            videoUrl: rawVideo,
            audioUrl: rawAudio,
            expiresAt: Date.now() + 60 * 60 * 1000,
          });
          if (youtubeId) {
            extractionCache.set(youtubeId, {
              videoUrl: rawVideo,
              audioUrl: rawAudio,
              expiresAt: Date.now() + 60 * 60 * 1000,
            });
          }

          const proxiedVideo = `/api/yt/stream?url=${encodeURIComponent(rawVideo)}&format=video`;
          const proxiedAudio = `/api/yt/stream?url=${encodeURIComponent(rawAudio)}&format=audio`;

          return res.json({
            success: true,
            title: data.videoDetails.title,
            videoPreviewUrl: proxiedVideo,
            audioPreviewUrl: proxiedAudio,
            mp4DownloadUrl: proxiedVideo,
            mp3DownloadUrl: proxiedAudio,
            source: "YouTube (@distube/ytdl-core)",
            creator: data.videoDetails.author?.name || "YouTube Creator",
          });
        }
      } catch (ytdlError: any) {
        console.warn(
          `[Unified Media Extractor] native @distube/ytdl-core failed: ${ytdlError?.message || String(ytdlError)}`,
        );
      }

      // 3. Fallback: Direct Node-level yt-dlp subprocess execution
      try {
        console.log(
          `[Unified Media Extractor] Fallback: direct local yt-dlp execution for URL: ${url}`,
        );
        const localInfo = await extractViaLocalYtdlp(url);
        if (localInfo) {
          const formats = localInfo.formats || [];
          const bestMuxed =
            formats.find(
              (f: any) => f.vcodec !== "none" && f.acodec !== "none" && f.url,
            ) ||
            formats.find((f: any) => f.url && f.hasVideo) ||
            formats.find((f: any) => f.url);

          const bestAudio =
            formats
              .reverse()
              .find(
                (f: any) => f.acodec !== "none" && f.vcodec === "none" && f.url,
              ) || bestMuxed;

          const videoUrl = bestMuxed?.url || localInfo.url;
          const audioUrl = bestAudio?.url || videoUrl;

          if (videoUrl) {
            console.log(
              `[Unified Media Extractor] Direct local yt-dlp extraction succeeded!`,
            );

            extractionCache.set(url, {
              videoUrl: videoUrl,
              audioUrl: audioUrl,
              expiresAt: Date.now() + 60 * 60 * 1000,
            });
            if (youtubeId) {
              extractionCache.set(youtubeId, {
                videoUrl: videoUrl,
                audioUrl: audioUrl,
                expiresAt: Date.now() + 60 * 60 * 1000,
              });
            }

            const proxiedVideo = `/api/yt/stream?url=${encodeURIComponent(videoUrl)}&format=video`;
            const proxiedAudio = `/api/yt/stream?url=${encodeURIComponent(audioUrl)}&format=audio`;

            return res.json({
              success: true,
              title: localInfo.title || "Extracted Video Stream",
              videoPreviewUrl: proxiedVideo,
              audioPreviewUrl: proxiedAudio,
              mp4DownloadUrl: proxiedVideo,
              mp3DownloadUrl: proxiedAudio,
              source: "YouTube (Direct Local yt-dlp)",
              creator: localInfo.uploader || "yt-dlp Engine",
            });
          }
        }
      } catch (localYtdlpErr: any) {
        console.warn(
          `[Unified Media Extractor] Direct local yt-dlp execution failed: ${localYtdlpErr?.message || String(localYtdlpErr)}`,
        );
      }

      // 4. Fallback: Internal yt-dlp on port 5000 if active
      try {
        console.log(
          `[Unified Media Extractor] Fallback: yt-dlp fallback (internal:127.0.0.1:5000)`,
        );
        const ytdlpResponse = await fetch(
          "http://127.0.0.1:5000/api/yt-dlp/info",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          },
        );

        if (ytdlpResponse.ok) {
          const data = await ytdlpResponse.json();
          if (data && data.url) {
            console.log(
              `[Unified Media Extractor] yt-dlp internal extraction succeeded!`,
            );

            extractionCache.set(url, {
              videoUrl: data.url,
              audioUrl: data.url,
              expiresAt: Date.now() + 60 * 60 * 1000,
            });
            if (youtubeId) {
              extractionCache.set(youtubeId, {
                videoUrl: data.url,
                audioUrl: data.url,
                expiresAt: Date.now() + 60 * 60 * 1000,
              });
            }

            const proxiedVideo = `/api/yt/stream?url=${encodeURIComponent(data.url)}&format=video`;
            const proxiedAudio = `/api/yt/stream?url=${encodeURIComponent(data.url)}&format=audio`;

            return res.json({
              success: true,
              title: data.title || "Extracted Video Stream",
              videoPreviewUrl: proxiedVideo,
              audioPreviewUrl: proxiedAudio,
              mp4DownloadUrl: proxiedVideo,
              mp3DownloadUrl: proxiedAudio,
              source: "YouTube (yt-dlp)",
              creator: "yt-dlp Fallback Engine",
            });
          }
        }
      } catch (ytdlpError: any) {
        console.warn(
          `[Unified Media Extractor] yt-dlp failed: ${ytdlpError?.message || String(ytdlpError)}`,
        );
      }

      res.status(502).json({
        success: false,
        error:
          "All extraction backend servers and fallbacks failed to extract this address.",
      });
    },
  );

  // Helper to pipe stream with automatic redirect following, custom headers, and SSL evasion
  function pipeStreamWithRedirects(
    urlStr: string,
    res: any,
    clientRange?: string,
    maxRedirects = 4,
    currentRedirect = 0,
    defaultContentType = "audio/mpeg",
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!urlStr || typeof urlStr !== "string") {
        reject(new Error("Invalid stream URL pattern"));
        return;
      }

      // Guard: Prevent relative URL piping issues
      if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
        console.error(
          `[Stream Error] Non-HTTP stream URL requested: ${urlStr}`,
        );
        reject(new Error("Stream URL must be an absolute HTTP schema."));
        return;
      }

      if (currentRedirect >= maxRedirects) {
        console.error(
          `[Stream Redirect Follower] Max redirects reached (${maxRedirects})`,
        );
        reject(new Error("Max redirects exceeded"));
        return;
      }

      try {
        const parsed = new URL(urlStr);
        const isHttps = parsed.protocol === "https:";
        const client = isHttps ? https : http;

        const options: https.RequestOptions = {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: "GET",
          headers: getRandomHeaders({
            Connection: "keep-alive",
            ...(clientRange ? { Range: clientRange } : {}),
          }),
          rejectUnauthorized: false,
        };

        let activeRemoteRes: any = null;
        let cleanedUp = false;

        const req = client.request(options, (remoteRes) => {
          activeRemoteRes = remoteRes;
          const statusCode = remoteRes.statusCode || 200;

          // Check if redirect response (3xx)
          if (
            statusCode >= 300 &&
            statusCode < 400 &&
            remoteRes.headers.location
          ) {
            let redirectUrl = remoteRes.headers.location;
            if (!redirectUrl.startsWith("http")) {
              redirectUrl = new URL(redirectUrl, urlStr).toString();
            }
            console.log(
              `[Stream Redirect Follower] Following redirect (${currentRedirect + 1}): ${redirectUrl}`,
            );
            pipeStreamWithRedirects(
              redirectUrl,
              res,
              clientRange,
              maxRedirects,
              currentRedirect + 1,
              defaultContentType,
            )
              .then(resolve)
              .catch(reject);
            return;
          }

          if (statusCode >= 400) {
            console.warn(
              `[Stream Proxy Error] Extractor node returned status ${statusCode} for ${urlStr}`,
            );
            // Core: Evict this video from extractionCache so it obtains a fresh link next try!
            for (const [key, cachedVal] of extractionCache.entries()) {
              if (
                cachedVal.videoUrl === urlStr ||
                cachedVal.audioUrl === urlStr
              ) {
                extractionCache.delete(key);
                console.log(
                  `[Cache Evicted] Erased expired/blocked url key from cache: ${key}`,
                );
              }
            }
            reject(new Error(`Extractor node returned status ${statusCode}`));
            return;
          }

          // Handshake successful (200/206). We can now safely resolve to let the caller know streaming succeeded!
          resolve();

          // Set common response headers
          if (res.socket) {
            res.socket.setNoDelay(true);
          }

          const isRangeRequest = !!clientRange;
          let start = 0;
          let end: number | null = null;

          if (isRangeRequest && clientRange) {
            const parts = clientRange.replace(/bytes=/, "").split("-");
            start = parseInt(parts[0], 10) || 0;
            if (parts[1]) {
              end = parseInt(parts[1], 10);
            }
          }

          const contentType =
            remoteRes.headers["content-type"] || defaultContentType;
          res.setHeader("Content-Type", contentType);
          res.setHeader("Accept-Ranges", "bytes");

          // If the server answered 206, or it is a 200 but they didn't ask for a range, pipe directly
          if (statusCode === 206 || statusCode === 200) {
            let finalStatusCode = statusCode;

            // If the upstream returns a wildcard range (e.g. Cobalt chunked streams),
            // browsers (especially Safari and Chrome) will refuse to play it as a 206.
            // We must downgrade it to a 200 OK progressive download.
            const contentRange = remoteRes.headers["content-range"];
            if (
              finalStatusCode === 206 &&
              contentRange &&
              contentRange.includes("/*")
            ) {
              console.log(
                `[Stream Handler] Downgrading chunked 206 to 200 progressive. Original Range: ${contentRange}`,
              );
              finalStatusCode = 200;
              delete remoteRes.headers["content-range"];
            }

            if (remoteRes.headers["content-length"]) {
              res.setHeader(
                "Content-Length",
                remoteRes.headers["content-length"],
              );
            }
            if (remoteRes.headers["content-range"]) {
              res.setHeader(
                "Content-Range",
                remoteRes.headers["content-range"],
              );
            }
            res.writeHead(finalStatusCode);
            remoteRes.pipe(res);
          } else {
            // Other status codes (like 204 or 400+) shouldn't normally reach here due to the guards above
            res.writeHead(statusCode);
            remoteRes.pipe(res);
          }
        });

        const cleanup = () => {
          if (cleanedUp) return;
          cleanedUp = true;
          if (activeRemoteRes) {
            try {
              activeRemoteRes.destroy();
            } catch (e) {}
          }
          try {
            req.destroy();
          } catch (e) {}
        };

        res.on("close", cleanup);

        req.on("error", (err) => {
          console.error(
            `[Stream Pipe Error] Failed for ${urlStr}:`,
            err.message,
          );
          reject(err);
        });

        req.end();
      } catch (error: any) {
        console.error(`[Stream Pipe Exception]`, error.message);
        reject(error);
      }
    });
  }

  // Simple in-memory rate limiting for stream requests to prevent IP bans
  const streamRateLimits = new Map<string, number>();
  setInterval(() => streamRateLimits.clear(), 60000); // Reset every minute

  // Proxy stream endpoint to download and pipe audio/video streams directly to HTML5 media players
  app.get("/api/yt/stream", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const currentRequests = streamRateLimits.get(ip) || 0;

    if (currentRequests > 30) {
      console.warn(
        `[Rate Limit] Blocked IP ${ip} for spamming stream requests.`,
      );
      return res.status(429).send("Too many requests. Please wait a moment.");
    }
    streamRateLimits.set(ip, currentRequests + 1);

    const { url, format, download, filename } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("Missing url parameter");
    }

    if (res.socket) {
      res.socket.setNoDelay(true);
    }

    const isVideo = format === "video" || format === "mp4";
    const defaultContentType = isVideo ? "video/mp4" : "audio/mpeg";

    // Set Content-Disposition attachment if direct download is triggered
    if (download === "true") {
      const fn =
        typeof filename === "string"
          ? filename
          : isVideo
            ? "download.mp4"
            : "download.mp3";
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fn)}"`,
      );
    }

    try {
      console.log(
        `[Media Stream Proxy] Streaming media for url: ${url} (format: ${format || "audio"})`,
      );

      const youtubeId = getYouTubeID(url);

      // Fast cache check for zero-latency streaming resolution
      const cached =
        extractionCache.get(url) ||
        (youtubeId ? extractionCache.get(youtubeId) : null);
      if (cached && cached.expiresAt > Date.now()) {
        const targetStreamUrl = isVideo ? cached.videoUrl : cached.audioUrl;
        console.log(
          `[Media Stream Proxy] Cache Hit! Instantly streaming resolved stream to HTML5: ${targetStreamUrl}`,
        );
        try {
          await pipeStreamWithRedirects(
            targetStreamUrl,
            res,
            req.headers.range,
            4,
            0,
            defaultContentType,
          );
          return;
        } catch (err) {
          console.warn(
            `[Media Stream Proxy] Cached URL failed to stream, evicting and retrying fresh:`,
            err,
          );
          extractionCache.delete(url);
          if (youtubeId) extractionCache.delete(youtubeId);
        }
      }

      // Determine if it is a direct (CDN or third-party) media stream link
      const isDirectStream =
        url.includes("googlevideo.com") ||
        url.includes("manifest/media") ||
        (!url.includes("youtube.com") &&
          !url.includes("youtu.be") &&
          !url.includes("shorts/"));

      if (isDirectStream) {
        console.log(`[Media Stream Proxy] Sourcing direct stream: ${url}`);
        try {
          await pipeStreamWithRedirects(
            url,
            res,
            req.headers.range,
            4,
            0,
            defaultContentType,
          );
          return;
        } catch (err: any) {
          console.warn(
            `[Media Stream Proxy] Direct stream failed:`,
            err?.message || err,
          );
        }
      }

      if (youtubeId) {
        const downloadMode = isVideo ? "video" : "audio";

        // Attempt 1: Standalone Direct Local yt-dlp Extractor (Best fidelity, IP-aligned, zero proxy rate limits, handles status 500 errors gracefully)
        try {
          console.log(
            `[Media Stream Proxy] Attempt #1: Direct local yt-dlp extraction for ${url}...`,
          );
          const localInfo = await extractViaLocalYtdlp(url);
          const targetStreamUrl = isVideo
            ? localInfo?.video_direct_url
            : localInfo?.audio_direct_url;
          if (targetStreamUrl) {
            console.log(
              `[Media Stream Proxy] Local yt-dlp resolved stream hotlink successfully: ${targetStreamUrl}`,
            );
            await pipeStreamWithRedirects(
              targetStreamUrl,
              res,
              req.headers.range,
              4,
              0,
              defaultContentType,
            );
            return;
          }
        } catch (localYtdlpErr: any) {
          console.warn(
            `[Media Stream Proxy] Attempt #1: Local yt-dlp skipped/failed:`,
            localYtdlpErr?.message || localYtdlpErr,
          );
        }

        // Attempt 2: Cobalt (Previous Attempt 1)
        try {
          console.log(
            `[Media Stream Proxy] Attempt #2: Cobalt extraction for ${url} (mode: ${downloadMode})...`,
          );
          const streamUrl = await extractViaPublicCobalt(url, downloadMode);
          if (streamUrl) {
            console.log(
              `[Media Stream Proxy] Cobalt extraction succeeded: ${streamUrl}`,
            );
            await pipeStreamWithRedirects(
              streamUrl,
              res,
              req.headers.range,
              4,
              0,
              defaultContentType,
            );
            return;
          }
        } catch (e: any) {
          console.warn(
            `[Media Stream Proxy] Cobalt extraction failed:`,
            e?.message || e,
          );
        }

        // Attempt 2: Public Invidious Direct Proxy (local=true completely avoids IP-binding errors!)
        try {
          console.log(
            `[Media Stream Proxy] Secondary attempt: Direct Invidious local stream proxy for ${youtubeId} (mode: ${downloadMode})...`,
          );
          const instances = await getActiveInvidiousInstances();
          for (const base of instances.slice(0, 4)) {
            try {
              // Note: itag 18 is 360p mp4 (video+audio), itag 140 is 128kbps m4a (audio only)
              const itag = isVideo ? "18" : "140";
              const streamUrl = `${base}/latest_version?id=${youtubeId}&itag=${itag}&local=true`;
              console.log(
                `[Media Stream Proxy] Trying direct Invidious stream URL: ${streamUrl}`,
              );
              await pipeStreamWithRedirects(
                streamUrl,
                res,
                req.headers.range,
                4,
                0,
                defaultContentType,
              );
              return;
            } catch (innerE: any) {
              console.warn(
                `[Media Stream Proxy] Invidious local stream failed on ${base}:`,
                innerE?.message || innerE,
              );
            }
          }
        } catch (e: any) {
          console.warn(
            `[Media Stream Proxy] Secondary Invidious attempt failed:`,
            e?.message || e,
          );
        }

        // Attempt 3: Public Piped Parser Fallback
        try {
          console.log(
            `[Media Stream Proxy] Tertiary attempt: Piped extraction for ${youtubeId}...`,
          );
          const fallbackData = await extractViaPublicPiped(youtubeId);
          const targetStreamUrl = isVideo
            ? fallbackData?.videoPreviewUrl
            : fallbackData?.audioPreviewUrl;
          if (fallbackData && targetStreamUrl) {
            console.log(
              `[Media Stream Proxy] Tertiary Piped extraction succeeded: ${targetStreamUrl}`,
            );
            await pipeStreamWithRedirects(
              targetStreamUrl,
              res,
              req.headers.range,
              4,
              0,
              defaultContentType,
            );
            return;
          }
        } catch (e: any) {
          console.warn(
            `[Media Stream Proxy] Tertiary Piped extraction failed:`,
            e?.message || e,
          );
        }

        // Attempt 4: Public Invidious Parser Fallback
        try {
          console.log(
            `[Media Stream Proxy] Quaternary attempt: Invidious extraction for ${youtubeId}...`,
          );
          const fallbackData = await extractViaPublicInvidious(youtubeId);
          const targetStreamUrl = isVideo
            ? fallbackData?.videoPreviewUrl
            : fallbackData?.audioPreviewUrl;
          if (fallbackData && targetStreamUrl) {
            console.log(
              `[Media Stream Proxy] Quaternary Invidious extraction succeeded: ${targetStreamUrl}`,
            );
            await pipeStreamWithRedirects(
              targetStreamUrl,
              res,
              req.headers.range,
              4,
              0,
              defaultContentType,
            );
            return;
          }
        } catch (e: any) {
          console.warn(
            `[Media Stream Proxy] Quaternary Invidious extraction failed:`,
            e?.message || e,
          );
        }
      }

      // Final Attempt: Direct fallback to native @distube/ytdl-core stream (might be subject to bot validation)
      try {
        console.log(
          `[Media Stream Proxy] All public nodes exhausted. Running last-resort native @distube/ytdl-core (mode: ${isVideo ? "video" : "audio"})...`,
        );
        const stream = ytdl(url, {
          filter: isVideo ? "videoandaudio" : "audioonly",
          quality: isVideo ? "highestvideo" : "highestaudio",
          highWaterMark: 1 << 25,
        });

        stream.on("error", async (err: any) => {
          console.warn(
            "[Media Stream Proxy] Native last-resort ytdl-core stream error:",
            err?.message,
          );
          if (!res.headersSent) {
            res
              .status(502)
              .send("Streaming failed on native and public extractors.");
          }
        });

        res.setHeader("Content-Type", defaultContentType);
        res.setHeader("Accept-Ranges", "bytes");
        stream.pipe(res);
      } catch (ytdlInitErr: any) {
        console.warn(
          `[Media Stream Proxy] Last-resort native @distube/ytdl-core initialization failed:`,
          ytdlInitErr?.message,
        );
        if (!res.headersSent) {
          res.status(502).send("Streaming pipe exhausted.");
        }
      }
    } catch (err: any) {
      console.error("[Stream Route Error]", err?.message || String(err));
      if (!res.headersSent) {
        res.status(500).send("Internal Streaming Error");
      }
    }
  });

  // API proxy endpoint for ytdl-core info queries – using @distube/ytdl-core directly!
  app.post("/api/ytdl-core/info", validateApiKey, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res
          .status(400)
          .json({ error: "Missing 'url' parameter in request body." });
      }
      console.log(
        `[ytdl-core Native] Fetching info for url: ${url} using @distube/ytdl-core`,
      );
      const info = await ytdl.getInfo(url);

      // Process formats to include local proxied streaming links to ensure compatibility
      const formats = info.formats.map((f: any) => {
        if (f.hasAudio && !f.hasVideo) {
          return {
            ...f,
            url: `/api/yt/stream?url=${encodeURIComponent(url)}`,
          };
        }
        return f;
      });

      return res.json({
        videoDetails: info.videoDetails,
        title: info.videoDetails?.title || "Extracted Video Stream",
        formats,
      });
    } catch (error: any) {
      console.warn(
        "[ytdl-core Native Error]",
        error?.message || String(error),
        "Attempting fallback to port 5000 and Cobalt...",
      );

      // Direct Local yt-dlp fallback (Premium extraction)
      try {
        const videoUrl = req.body?.url;
        if (videoUrl) {
          const localInfo = await extractViaLocalYtdlp(videoUrl);
          if (localInfo) {
            const formats = localInfo.formats || [];
            return res.json({
              ...localInfo,
              title: localInfo.title || "Extracted Video Stream",
              formats: formats.map((f: any) => ({
                url: f.url,
                hasVideo: f.vcodec !== "none",
                hasAudio: f.acodec !== "none",
                qualityLabel: f.resolution || f.height || "720p",
                container: f.container || f.ext || "mp4",
              })),
            });
          }
        }
      } catch (localErr) {
        console.warn(
          "[ytdl-core Direct Local yt-dlp fallback failed]",
          localErr,
        );
      }

      // Port 5000 ytdl-core fallback
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/ytdl-core/info",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body),
          },
        );
        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        }
      } catch (tempErr) {
        console.warn("[ytdl-core native & port 5000 fallback failed]", tempErr);
      }

      // Public Cobalt fallback
      try {
        const videoUrl = req.body?.url;
        if (videoUrl) {
          const extractedUrl = await extractViaPublicCobalt(videoUrl, "video");
          if (extractedUrl) {
            return res.json({
              title: "Extracted Media Stream",
              formats: [
                {
                  url: `/api/yt/stream?url=${encodeURIComponent(extractedUrl)}`,
                  hasVideo: true,
                  hasAudio: true,
                  qualityLabel: "720p",
                  container: "mp4",
                },
              ],
            });
          }
        }
      } catch (fallbackError) {
        console.error("[ytdl-core Fallback Extra Error]", fallbackError);
      }

      // Final Invidious/Piped Scraper defense
      const youtubeId = getYouTubeID(url);
      if (youtubeId) {
        try {
          const invidiousData = await extractViaPublicInvidious(youtubeId);
          if (invidiousData) {
            return res.json({
              title: invidiousData.title,
              formats: [
                {
                  url: `/api/yt/stream?url=${encodeURIComponent(invidiousData.audioPreviewUrl)}`,
                  hasVideo: false,
                  hasAudio: true,
                  qualityLabel: "adaptive",
                  container: "mp4",
                },
              ],
            });
          }
        } catch (e2) {}
      }

      res.status(500).json({
        error:
          "Extraction backend failed: " + (error?.message || "Unknown error"),
      });
    }
  });

  // API proxy endpoint for yt-dlp info queries on port 5000 inside container
  app.post("/api/yt-dlp/info", validateApiKey, async (req, res) => {
    try {
      console.log(`[yt-dlp Proxy] Forwarding to internal port 5000`);
      const response = await fetch("http://127.0.0.1:5000/api/yt-dlp/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      if (!response.ok) {
        throw new Error(
          `Internal yt-dlp returned non-ok status: ${response.status}`,
        );
      }
      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.warn(
        "[yt-dlp Proxy Error/Down]",
        error?.message || String(error),
        "Attempting public extraction fallbacks...",
      );

      // Try Direct Local yt-dlp fallback (Premium extraction)
      try {
        const videoUrl = req.body?.url;
        if (videoUrl) {
          const localInfo = await extractViaLocalYtdlp(videoUrl);
          if (localInfo) {
            const formats = localInfo.formats || [];
            const bestMuxed =
              formats.find(
                (f: any) => f.vcodec !== "none" && f.acodec !== "none" && f.url,
              ) || formats.find((f: any) => f.url);
            return res.json({
              title: localInfo.title,
              url: bestMuxed?.url || localInfo.url || "",
              formats: formats.map((f: any) => ({
                format_id: f.format_id,
                ext: f.ext,
                resolution: f.resolution || f.height,
                url: f.url,
              })),
            });
          }
        }
      } catch (localErr) {
        console.warn("[yt-dlp Direct Local yt-dlp fallback failed]", localErr);
      }

      try {
        const videoUrl = req.body?.url;
        if (videoUrl) {
          const extractedUrl = await extractViaPublicCobalt(videoUrl, "video");
          if (extractedUrl) {
            return res.json({
              title: "Extracted Media Stream",
              url: extractedUrl,
            });
          }
        }
      } catch (fallbackError) {
        console.error("[yt-dlp Fallback Extra Error]", fallbackError);
      }
      res.status(500).json({
        error:
          "Fallback extraction backend failed: " +
          (error?.message || "Unknown error"),
      });
    }
  });

  // PDF Scraper API (Based on user python script & headless browsers)
  app.get("/api/scrape-exams", async (req, res) => {
    const siteUrl = req.query.site_url;
    if (!siteUrl || typeof siteUrl !== "string") {
      return res.status(400).json({ error: "Missing site_url" });
    }

    let browser = null;
    try {
      console.log(`[PDF Scraper] Fetching ${siteUrl} using Puppeteer`);
      const puppeteer = (await import("puppeteer")).default;
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
      });
      const page = await browser.newPage();

      const headers = getRandomHeaders();
      await page.setExtraHTTPHeaders({
        "Accept-Language": headers["Accept-Language"],
      });
      await page.setUserAgent(headers["User-Agent"]);

      // Navigate to page, wait until network is mostly idle
      await page.goto(siteUrl, { waitUntil: "networkidle2", timeout: 30000 });

      const html = await page.content();
      const $ = cheerio.load(html);
      const pdfResults: any[] = [];
      const keywords = [
        "kcse",
        "quiz",
        "exam",
        "paper",
        "past",
        "revision",
        "test",
        "notes",
        "syllabus",
        "book",
        "document",
        "pdf",
        "download",
        "file",
        "form",
      ];

      $("a[href]").each((i, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim().toLowerCase();
        const lowerHref = href.toLowerCase();

        // Match if it points to a PDF, OR the text implies downloading something document-like
        if (
          lowerHref.includes(".pdf") ||
          text.includes("download") ||
          text.includes("pdf")
        ) {
          let absoluteUrl = href;
          try {
            absoluteUrl = new URL(href, siteUrl).toString();
          } catch (e) {}

          pdfResults.push({
            title:
              $(el).text().trim() ||
              absoluteUrl.split("/").pop() ||
              "Download Document",
            download_url: absoluteUrl,
          });
        }
      });

      // Deduplicate by URL
      const uniqueResults = Array.from(
        new Map(pdfResults.map((item) => [item.download_url, item])).values(),
      );

      return res.json({ status: "success", results: uniqueResults });
    } catch (error: any) {
      console.error("[PDF Scraper Error]", error);
      res.status(500).json({
        error:
          "Failed to scrape PDF links: " + (error?.message || "Unknown error"),
      });
    } finally {
      if (browser) {
        await browser.close().catch(console.error);
      }
    }
  });

  const pdfExtractionCache = new Map<
    string,
    { text: string; expiresAt: number }
  >();
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of pdfExtractionCache.entries()) {
        if (value.expiresAt < now) {
          pdfExtractionCache.delete(key);
        }
      }
    },
    1000 * 60 * 60,
  );

  // PDF Extraction API
  app.post("/api/pdf-extract", async (req, res) => {
    const { pdf_url } = req.body;
    if (!pdf_url || typeof pdf_url !== "string") {
      return res.status(400).json({ error: "Missing pdf_url" });
    }

    // Check Cache
    const cached = pdfExtractionCache.get(pdf_url);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[PDF Extractor] Cache Hit for ${pdf_url}`);
      return res.json({ status: "success", text: cached.text, cached: true });
    }

    try {
      console.log(`[PDF Extractor] Downloading ${pdf_url}`);
      const response = await fetch(pdf_url, {
        headers: getRandomHeaders(),
      });

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ error: "Failed to download PDF" });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract text from the PDF using pdf-parse
      // We parse the first 3 pages as requested (max: 3)
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const data = await pdfParse(buffer, { max: 3 });

      // Save to cache
      pdfExtractionCache.set(pdf_url, {
        text: data.text,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      }); // 24 hours caching

      return res.json({ status: "success", text: data.text });
    } catch (error: any) {
      console.error("[PDF Extractor Error]", error);
      res.status(500).json({ error: "Failed to extract PDF text" });
    }
  });

  // Git Client API
  app.post("/api/git", express.json(), async (req, res) => {
    try {
      const { command, args } = req.body;
      if (!command) {
        return res.status(400).json({ error: "Git command is required" });
      }

      // Allowed commands for safety
      const allowedCommands = [
        "status",
        "log",
        "pull",
        "push",
        "commit",
        "add",
      ];
      if (!allowedCommands.includes(command)) {
        return res.status(400).json({ error: "Git command not allowed" });
      }

      let gitArgs = "";
      if (args && Array.isArray(args)) {
        gitArgs = args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ");
      }

      // Check if git is initialized
      const isGitInitialized = fs.existsSync(path.join(process.cwd(), ".git"));
      if (!isGitInitialized) {
        return res.status(400).json({ error: "Git repository not initialized" });
      }

      const { stdout, stderr } = await execAsync(`git ${command} ${gitArgs}`);

      return res.json({ status: "success", stdout, stderr });
    } catch (error: any) {
      console.error("[Git API Error]", error);
      return res
        .status(500)
        .json({
          error: error.message || "Git command failed",
          stdout: error.stdout,
          stderr: error.stderr,
        });
    }
  });

  // Universal Generation API
  app.post("/api/generate", express.json(), async (req, res) => {
    try {
      const { prompt, provider, model, type } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (type === "image") {
        // Handle 100% Free Image Generation using Pollinations AI (Flux)
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true&enhance=true`;
        return res.json({ status: "success", type: "image", url: imageUrl });
      }

      const selProvider = provider?.toLowerCase() || "gemini";
      let outputText = "";

      if (selProvider === "gemini") {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey)
          return res
            .status(500)
            .json({ error: "GEMINI_API_KEY not configured" });

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: model || "gemini-2.5-flash",
          contents: prompt,
        });
        outputText = response.text || "";
      } else if (selProvider === "groq") {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey)
          return res.status(500).json({ error: "GROQ_API_KEY not configured" });

        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: model || "llama-3.3-70b-versatile",
        });
        outputText = completion.choices[0]?.message?.content || "";
      } else if (selProvider === "openrouter") {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey)
          return res
            .status(500)
            .json({ error: "OPENROUTER_API_KEY not configured" });

        let openrouterModel = model || "google/gemini-2.0-flash-exp:free";
        if (model === "gpt-4o") openrouterModel = "openai/gpt-4o";
        if (model === "gpt-4-turbo") openrouterModel = "openai/gpt-4-turbo";
        if (model === "gpt-4") openrouterModel = "openai/gpt-4";
        if (model === "gpt-3.5-turbo") openrouterModel = "openai/gpt-3.5-turbo";
        if (model === "claude-3-5-sonnet")
          openrouterModel = "anthropic/claude-3.5-sonnet";
        if (model === "claude-3-opus")
          openrouterModel = "anthropic/claude-3-opus";
        if (model === "claude-3-sonnet")
          openrouterModel = "anthropic/claude-3-sonnet";
        if (model === "claude-3-haiku")
          openrouterModel = "anthropic/claude-3-haiku";
        if (model === "mistral-large")
          openrouterModel = "mistralai/mistral-large";
        if (model === "mistral-7b")
          openrouterModel = "mistralai/mistral-7b-instruct:free";

        let response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: openrouterModel,
              messages: [{ role: "user", content: prompt }],
            }),
          },
        );

        if (!response.ok) {
          // Fallback to free model if payment required or bad request
          console.warn(
            `OpenRouter failed for ${openrouterModel}. Falling back to free model.`,
          );
          response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.0-pro-exp-02-05:free",
                messages: [{ role: "user", content: prompt }],
              }),
            },
          );
        }

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        outputText = data.choices?.[0]?.message?.content || "";
      } else {
        return res.status(400).json({ error: "Unsupported provider" });
      }

      return res.json({ status: "success", text: outputText });
    } catch (error: any) {
      console.error("[Generate API Error]", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to generate text" });
    }
  });

  // Mount the Agent AI router
  app.use("/api/agent", agentRouter);

  // Mount the PDF AI router
  app.use("/api/pdf-ai", pdfAiRouter);

  // Serve generated output files
  app.use(
    "/outputs",
    express.static(path.join(process.cwd(), "dist", "outputs")),
  );

  const distPath = path.join(process.cwd(), "dist");

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      // Lazy load Vite to compile only when needed
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, falling back to static serving");
      app.use(express.static(distPath));
      app.get("*all", (req, res) =>
        res.sendFile(path.join(distPath, "index.html")),
      );
    }
  } else {
    // Serve static files in production
    console.log("Current working directory:", process.cwd());
    console.log("Serving static files from:", distPath);
    console.log(
      "File exists:",
      require("fs").existsSync(path.join(distPath, "index.html")),
    );
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
