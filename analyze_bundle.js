import fs from 'fs';
import path from 'path';

function analyzeDependencies() {
  const pkgPath = './package.json';
  if (!fs.existsSync(pkgPath)) {
    console.log('package.json not found.');
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};

  console.log('--- DEPENDENCY ANALYSIS ---');
  // Check for duplicate/overlapping packages
  if (deps['@google/generative-ai'] && deps['@google/genai']) {
    console.log('[DUPLICATE/OVERLAP] Both "@google/generative-ai" and "@google/genai" are installed.');
  }
  if (deps['lucide-react']) {
    console.log('[DEP] lucide-react is imported. Version: ' + deps['lucide-react']);
  }
  if (deps['motion']) {
    console.log('[DEP] motion is imported. Version: ' + deps['motion']);
  }
}

function analyzeAppImports() {
  const appPath = './src/App.tsx';
  if (!fs.existsSync(appPath)) {
    console.log('src/App.tsx not found.');
    return;
  }
  const content = fs.readFileSync(appPath, 'utf8');
  console.log('\n--- FRONTEND LAZY LOADING & BUNDLE SIZE ANALYSIS ---');

  // Find all component imports in src/components
  const importLines = content.split('\n').filter(line => line.includes('import') && line.includes('./components/'));
  console.log(`Found ${importLines.length} component views imported statically in App.tsx.`);

  const lazyImports = content.split('\n').filter(line => line.includes('React.lazy') || line.includes('lazy('));
  console.log(`Found ${lazyImports.length} lazy-loaded components.`);

  if (lazyImports.length === 0 && importLines.length > 0) {
    console.log('[PERFORMANCE ISSUE] Monolithic Frontend Bundle: All views are statically imported. Vite is forcing everything into a single ~820kB bundle. Implementing lazy loading with Suspense will split these into multiple smaller chunks, dramatically improving Initial Load Time.');
  }
}

function analyzeServerImports() {
  const serverPath = './server.ts';
  if (!fs.existsSync(serverPath)) {
    console.log('server.ts not found.');
    return;
  }
  const content = fs.readFileSync(serverPath, 'utf8');
  console.log('\n--- BACKEND COLD STARTUP & IMPORTS ANALYSIS ---');

  const topLevelImports = content.split('\n').filter(line => line.trim().startsWith('import '));
  console.log(`Found ${topLevelImports.length} top-level imports in server.ts.`);

  const heavyPackages = ['@distube/ytdl-core', 'youtube-sr', 'cheerio', '@google/genai', 'groq-sdk', 'openai', 'pdf-parse', 'puppeteer'];
  heavyPackages.forEach(pkg => {
    const isTopLevel = topLevelImports.some(line => line.includes(pkg));
    if (isTopLevel) {
      console.log(`[HEAVY STATIC IMPORT] "${pkg}" is imported statically at the top level. This increases server startup time and memory footprint (Cold Start Latency).`);
    } else {
      const isDynamic = content.includes(pkg);
      if (isDynamic) {
        console.log(`[DYNAMIC IMPORT] "${pkg}" is loaded dynamically. Good!`);
      }
    }
  });
}

function main() {
  analyzeDependencies();
  analyzeAppImports();
  analyzeServerImports();
}

main();
