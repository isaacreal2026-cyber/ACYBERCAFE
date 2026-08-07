const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/118.0"
];

export class ProxyManager {
  private proxies: string[];
  private currentIndex: number;

  constructor(proxies: string[] = []) {
    this.proxies = proxies;
    this.currentIndex = 0;
  }

  addProxy(proxy: string) {
    if (!this.proxies.includes(proxy)) {
      this.proxies.push(proxy);
    }
  }

  addProxies(proxies: string[]) {
    proxies.forEach(proxy => this.addProxy(proxy));
  }

  removeProxy(proxy: string) {
    this.proxies = this.proxies.filter(p => p !== proxy);
  }

  getRandomProxy(): string | null {
    if (this.proxies.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.proxies.length);
    return this.proxies[randomIndex];
  }

  getNextProxy(): string | null {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }
  
  getProxyCount(): number {
    return this.proxies.length;
  }

  getProxies(): string[] {
    return [...this.proxies];
  }

  getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  getRandomHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      "User-Agent": this.getRandomUserAgent(),
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.google.com/",
      ...extraHeaders
    };
  }
}

// Global instance
export const globalProxyManager = new ProxyManager();
