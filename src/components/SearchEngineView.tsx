import { useState, useCallback } from 'react';
import { Search, Download, Music, Video, BookOpen, Filter, PlayCircle, Loader2, Sparkles } from 'lucide-react';

/* =========================================================================
 * EXTERNAL API ENDPOINTS & CONFIGURATION
 * =========================================================================
 * 
 * 1. Freesound API
 *    - Base URL: https://freesound.org/apiv2/
 *    - Docs: https://freesound.org/docs/api/
 *    - Auth: Requires a free API key (Token API_KEY).
 * 
 * 2. Jamendo API
 *    - Base URL: https://api.jamendo.com/v3.0/
 *    - Docs: https://developer.jamendo.com/v3.0
 *    - Auth: Requires a free Client ID.
 * 
 * 3. Internet Archive API (Advanced Search)
 *    - Base URL: https://archive.org/advancedsearch.php
 *    - Auth: No API key required for free public metadata queries.
 * 
 * 4. Open Library API
 *    - Base URL: https://openlibrary.org/search.json
 *    - Auth: No API key required.
 * ========================================================================= */

const API_KEYS = {
  FREESOUND_API_KEY: 'YOUR_FREESOUND_API_KEY_HERE', // Free API Key placeholder
  JAMENDO_CLIENT_ID: 'YOUR_JAMENDO_CLIENT_ID_HERE', // Free Client ID placeholder
};

const API_ENDPOINTS = {
  FREESOUND: 'https://freesound.org/apiv2/search/text/',
  JAMENDO: 'https://api.jamendo.com/v3.0/tracks/',
  INTERNET_ARCHIVE: '/api/ia-search',
  OPEN_LIBRARY: 'https://openlibrary.org/search.json',
};

type SearchMode = 'media' | 'pdf';

interface MediaResult {
  id: string;
  title: string;
  creator: string;
  source: string;
  audioPreviewUrl?: string;
  videoPreviewUrl?: string; // For MP4 if available
  mp3DownloadUrl?: string;
  mp4DownloadUrl?: string;
}

interface PdfResult {
  id: string;
  title: string;
  author: string;
  year: string;
  downloadUrl: string;
  webUrl: string;
  source: string;
}

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export default function SearchEngineView() {
  const [mode, setMode] = useState<SearchMode>('media');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mediaResults, setMediaResults] = useState<MediaResult[]>([]);
  const [pdfResults, setPdfResults] = useState<PdfResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Directly downloads a file via client-side javascript to circumvent new tab browsing for blobs and ensure a 'save file' prompt
  const handleDownload = async (url: string, filename: string) => {
    // For our secure streaming proxy, append the custom server disposition parameters and download directly
    if (url.startsWith('/api/yt/stream') || url.includes('/api/yt/stream')) {
      const delimiter = url.includes('?') ? '&' : '?';
      const downloadUrl = `${url}${delimiter}download=true&filename=${encodeURIComponent(filename)}`;
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    // For large streaming sites or cross-origin URLs, download/view directly in a new tab to avoid CORS/abort and memory exhaustion
    const isExternalStream = url.includes('googlevideo.com') || url.includes('archive.org') || url.includes('jamendo.com') || url.includes('freesound.org');
    
    if (isExternalStream) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (err: any) {
      console.warn('CORS or storage download rejected, triggering native browser action...', err?.message || String(err));
      // Fallback: Open in new tab or use literal download attribute
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const searchMedia = async (q: string) => {
    const results: MediaResult[] = [];
    
    // 0. Primary YouTube Scraper via Backend Proxy
    try {
      const response = await fetch(`/api/media/search?q=${encodeURIComponent(q)}`);
      if (response.ok) {
        const ytData = await response.json();
        if (Array.isArray(ytData)) {
          ytData.forEach((item: any) => {
            results.push({
              id: item.id,
              title: item.title,
              creator: item.creator,
              source: item.source || 'YouTube',
              audioPreviewUrl: item.audioPreviewUrl,
              videoPreviewUrl: item.videoPreviewUrl,
              mp3DownloadUrl: item.mp3DownloadUrl,
              mp4DownloadUrl: item.mp4DownloadUrl
            });
          });
        }
      }
    } catch (e: any) {
      console.warn('YouTube Search through backend failed:', e?.message || String(e));
    }

    // 1. Internet Archive API (Audio/Video format)
    try {
      // Formulate query correctly, and encode the entire parameter to prevent illegal spaces/characters in request URLs
      const iaQuery = `(${q}) AND (mediatype:audio OR mediatype:movies)`;
      const iaUrl = `${API_ENDPOINTS.INTERNET_ARCHIVE}?q=${encodeURIComponent(iaQuery)}&fl[]=identifier,title,creator,mediatype,format&rows=15&output=json`;
      const iaRes = await fetch(iaUrl);
      const iaData = await iaRes.json();
      
      const docs = iaData.response?.docs || [];
      for (const doc of docs) {
        const isAudio = doc.mediatype === 'audio';
        const isVideo = doc.mediatype === 'movies';
        
        let mp3Url, mp4Url, previewUrl;
        
        if (isAudio) {
          mp3Url = `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`;
          previewUrl = mp3Url; 
        }
        
        if (isVideo) {
          mp4Url = `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp4`;
        }

        results.push({
          id: `ia-${doc.identifier}`,
          title: doc.title || 'Unknown Title',
          creator: Array.isArray(doc.creator) ? doc.creator[0] : (doc.creator || 'Internet Archive'),
          source: 'Internet Archive',
          audioPreviewUrl: isAudio ? previewUrl : undefined,
          mp3DownloadUrl: isAudio ? mp3Url : undefined,
          mp4DownloadUrl: isVideo ? mp4Url : undefined
        });
      }
    } catch (e: any) {
      console.error('IA Media Search Error:', e?.message || String(e));
    }

    // 2. Jamendo API (if client ID is modified from placeholder)
    if (API_KEYS.JAMENDO_CLIENT_ID !== 'YOUR_JAMENDO_CLIENT_ID_HERE') {
        try {
            const jUrl = `${API_ENDPOINTS.JAMENDO}?client_id=${API_KEYS.JAMENDO_CLIENT_ID}&format=json&search=${encodeURIComponent(q)}&limit=10`;
            const jRes = await fetch(jUrl);
            const jData = await jRes.json();
            
            if (jData.results) {
                jData.results.forEach((track: any) => {
                    results.push({
                        id: `jamendo-${track.id}`,
                        title: track.name,
                        creator: track.artist_name,
                        source: 'Jamendo',
                        audioPreviewUrl: track.audio,
                        mp3DownloadUrl: track.audiodownload
                    });
                });
            }
        } catch (e: any) {
            console.error('Jamendo Search Error:', e?.message || String(e));
        }
    }

    // 3. Freesound API (if API Key is modified from placeholder)
    if (API_KEYS.FREESOUND_API_KEY !== 'YOUR_FREESOUND_API_KEY_HERE') {
        try {
            const fsUrl = `${API_ENDPOINTS.FREESOUND}?query=${encodeURIComponent(q)}&token=${API_KEYS.FREESOUND_API_KEY}&fields=id,name,username,previews,download`;
            const fsRes = await fetch(fsUrl);
            const fsData = await fsRes.json();

            if (fsData.results) {
                fsData.results.forEach((sound: any) => {
                    results.push({
                        id: `fs-${sound.id}`,
                        title: sound.name,
                        creator: sound.username,
                        source: 'Freesound',
                        audioPreviewUrl: sound.previews?.['preview-hq-mp3'],
                        mp3DownloadUrl: sound.previews?.['preview-hq-mp3'] // API actual download requires oauth, preview serves as public mp3
                    });
                });
            }
        } catch (e: any) {
            console.error('Freesound Search Error:', e?.message || String(e));
        }
    }

    return results;
  };

  const searchPdf = async (q: string) => {
    const results: PdfResult[] = [];
    
    // 1. Internet Archive API (texts & pdf)
    try {
      // Filter out borrow-only and restricted printdisabled volumes to avoid 401 error screens
      const iaQuery = `(${q}) AND mediatype:texts AND format:pdf AND -collection:inlibrary AND -collection:printdisabled`;
      const iaUrl = `${API_ENDPOINTS.INTERNET_ARCHIVE}?q=${encodeURIComponent(iaQuery)}&fl[]=identifier,title,creator,year&rows=20&output=json`;
      const iaRes = await fetch(iaUrl);
      const iaData = await iaRes.json();
      
      const docs = iaData.response?.docs || [];
      for (const doc of docs) {
        results.push({
          id: `ia-${doc.identifier}`,
          title: doc.title || 'Untitled Document',
          author: Array.isArray(doc.creator) ? doc.creator.join(', ') : (doc.creator || 'Unknown Author'),
          year: doc.year ? String(doc.year) : 'N/A',
          downloadUrl: `https://archive.org/download/${doc.identifier}/${doc.identifier}.pdf`,
          webUrl: `https://archive.org/details/${doc.identifier}`,
          source: 'Internet Archive'
        });
      }
    } catch (e: any) {
      console.error('IA PDF Search Error:', e?.message || String(e));
    }

    // 2. Open Library API (books)
    try {
        const olUrl = `${API_ENDPOINTS.OPEN_LIBRARY}?q=${encodeURIComponent(q)}&limit=15`;
        const olRes = await fetch(olUrl);
        const olData = await olRes.json();

        const docs = olData.docs || [];
        for (const doc of docs) {
            // Check if full public access is available. OpenLibrary linking to IA.
            if (doc.public_scan_b === true && doc.ia && doc.ia.length > 0) {
                const iaIdentifier = doc.ia[0];
                results.push({
                    id: `ol-${doc.key}`,
                    title: doc.title,
                    author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : 'Unknown Author',
                    year: doc.first_publish_year ? String(doc.first_publish_year) : 'N/A',
                    downloadUrl: `https://archive.org/download/${iaIdentifier}/${iaIdentifier}.pdf`,
                    webUrl: `https://archive.org/details/${iaIdentifier}`,
                    source: 'Open Library'
                });
            }
        }
    } catch (e: any) {
        console.error('Open Library Search Error:', e?.message || String(e));
    }

    // Filter duplicates by identifier substring
    const unique = new Map<string, PdfResult>();
    for (const r of results) {
        // Simple distinct identifier
        const matchIds = r.downloadUrl.match(/download\/([^\/]+)/);
        const coreId = matchIds && matchIds[1] ? matchIds[1] : r.id;
        if (!unique.has(coreId)) {
            unique.set(coreId, r);
        }
    }
    
    return Array.from(unique.values());
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    setMediaResults([]);
    setPdfResults([]);
    
    try {
      if (mode === 'media') {
        // 1. Detect if the input is a standard search phrase or a direct video URL
        const isVideoUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|instagram\.com|tiktok\.com|facebook\.com|twitch\.tv|twitter\.com|x\.com)\/.+$/i.test(query.trim()) || 
                           query.includes('watch?v=') || 
                           query.includes('youtu.be/');

        if (isVideoUrl) {
          try {
            const apiKey = (import.meta as any).env.VITE_MEDIA_PROXY_API_KEY || 'media_secret_secure_key_2026';
            const response = await fetchWithTimeout('/api/media/extract', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
              },
              body: JSON.stringify({ url: query.trim() })
            }, 18000); // Unified cascade execution timeout up to 18 seconds

            if (!response.ok) {
              throw new Error(`Unified extractor failed with status: ${response.status}`);
            }

            const data = await response.json();
            if (data && data.videoPreviewUrl) {
              setMediaResults([{
                id: `extracted-${Date.now()}`,
                title: data.title || 'Extracted Video Stream',
                creator: data.creator || 'Media Extractor',
                source: data.source || 'YouTube Extraction Contacts',
                videoPreviewUrl: data.videoPreviewUrl,
                audioPreviewUrl: data.audioPreviewUrl,
                mp4DownloadUrl: data.mp4DownloadUrl,
                mp3DownloadUrl: data.mp3DownloadUrl
              }]);
              return;
            }
            throw new Error('No valid stream links returned by proxy.');
          } catch (extractErr: any) {
            console.error('Unified media extraction failed:', extractErr?.message || String(extractErr));
            setError('Failed to extract video. Both the internal server handlers and secure public proxies timed out or failed.');
          }
        } else {
          // 4. If normal search phrase, let existing search function handle it.
          const results = await searchMedia(query);
          setMediaResults(results);
        }
      } else {
        const results = await searchPdf(query);
        setPdfResults(results);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching public records.');
    } finally {
      setIsSearching(false);
    }
  }, [query, mode]);

  const formatExists = (formats: string[], ...checks: string[]) => {
      const lowered = formats.map(f => typeof f === 'string' ? f.toLowerCase() : '');
      return checks.some(check => lowered.some(l => l.includes(check.toLowerCase())));
  };

  return (
    <div className="h-full bg-surface-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 flex-shrink-0 bg-surface-bg/80 backdrop-blur-md">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-text-primary font-semibold">Universal Discovery Engine</h2>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-6xl mx-auto w-full">
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
             <div className="flex bg-surface-card border border-white/10 p-1 rounded-xl">
               <button 
                 onClick={() => setMode('media')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${mode === 'media' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
               >
                 <PlayCircle className="w-4 h-4" />
                 Media Search Engine
               </button>
               <button 
                 onClick={() => setMode('pdf')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${mode === 'pdf' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
               >
                 <BookOpen className="w-4 h-4" />
                 Educational PDFs / Books
               </button>
             </div>
             <div className="flex items-center gap-2 text-text-secondary text-xs">
                <Filter className="w-3.5 h-3.5" />
                <span>Searching {mode === 'media' ? 'Freesound, Jamendo, Archive' : 'Archive, Open Library'}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="text"
                  placeholder={mode === 'media' ? "Search for music, sound effects, or video..." : "Search for school books, research papers, educational texts..."}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-surface-card border border-white/10 rounded-xl pl-12 pr-4 py-4 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-brand-primary/50 shadow-inner"
                />
             </div>
             <button
               onClick={handleSearch}
               disabled={isSearching || !query.trim()}
               className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg transition-all flex items-center gap-2"
             >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Discover
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl mb-4">
                   {error}
                </div>
            )}
            
            {mode === 'media' && (
                <div className="grid gap-3.5">
                    {mediaResults.map((res) => (
                        <div key={res.id} className="bg-surface-card border border-white/10 rounded-2xl p-4 sm:p-5 hover:border-purple-500/25 hover:bg-white/5 transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group shadow-md">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                               {/* Rotating Disc / Media Art placeholder */}
                               <div className="relative shrink-0 w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-purple-500/30 transition-all shadow-inner">
                                  {res.mp4DownloadUrl || res.videoPreviewUrl ? (
                                    <Video className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                                  ) : (
                                    <div className="relative flex items-center justify-center w-full h-full">
                                      <Music className="w-5 h-5 text-purple-400 z-10 animate-[spin_8s_linear_infinite]" />
                                      <div className="absolute inset-2 border border-dashed border-purple-500/20 rounded-full animate-[spin_12s_linear_infinite]" />
                                    </div>
                                  )}
                               </div>

                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase tracking-widest">{res.source}</span>
                                  </div>
                                  <h3 className="text-base font-semibold text-text-primary/95 truncate leading-snug mb-0.5 group-hover:text-purple-300 transition-colors" title={res.title}>{res.title}</h3>
                                  <p className="text-xs text-text-secondary truncate">By {res.creator}</p>
                                  
                                  {res.videoPreviewUrl ? (
                                      <div className="mt-3 bg-black/60 rounded-xl overflow-hidden max-w-full sm:max-w-md aspect-video border border-gray-200 relative shadow-inner">
                                         <video 
                                            controls 
                                            playsInline
                                            preload="metadata"
                                            className="w-full h-full object-contain bg-black/90 rounded-xl outline-none"
                                            onError={(e) => console.log('Video player exception swallowed', e)}
                                         >
                                            <source src={res.videoPreviewUrl} type="video/mp4" />
                                            <source src={res.videoPreviewUrl} type="video/webm" />
                                            Your browser does not support the video tag.
                                         </video>
                                      </div>
                                  ) : res.audioPreviewUrl ? (
                                      <div className="mt-3 bg-black/30 rounded-lg p-1.5 inline-block max-w-[280px] sm:max-w-[320px] border border-gray-100">
                                         <audio 
                                            controls 
                                            preload="metadata"
                                            className="h-8 max-w-full outline-none [&::-webkit-media-controls-panel]:bg-transparent" 
                                            onError={() => console.debug('Audio element warning swallowed smoothly')}
                                         >
                                            <source src={res.audioPreviewUrl} type="audio/mpeg" />
                                            <source src={res.audioPreviewUrl} type="audio/mp3" />
                                            <source src={res.audioPreviewUrl} type="audio/m4a" />
                                            <source src={res.audioPreviewUrl} type="audio/mp4" />
                                         </audio>
                                      </div>
                                  ) : null}
                               </div>
                            </div>
                            
                            <div className="flex flex-row items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                               {res.mp3DownloadUrl && (
                                   <button 
                                      onClick={() => handleDownload(res.mp3DownloadUrl!, `${res.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`)}
                                      className="flex-1 md:flex-initial px-4 py-2.5 bg-[#22aa55]/20 hover:bg-[#22aa55] text-green-700 hover:text-white border border-[#22aa55]/20 hover:border-[#22aa55] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-[#22aa55]/10"
                                   >
                                      <Download className="w-3.5 h-3.5" />
                                      MP3 Audio
                                   </button>
                               )}
                               {res.mp4DownloadUrl && (
                                   <button 
                                      onClick={() => handleDownload(res.mp4DownloadUrl!, `${res.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`)}
                                      className="flex-1 md:flex-initial px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-brand-accent hover:border-blue-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                                   >
                                      <Download className="w-3.5 h-3.5" />
                                      MP4 Video
                                   </button>
                               )}
                               {!res.mp3DownloadUrl && !res.mp4DownloadUrl && (
                                   <div className="px-4 py-2 text-xs text-text-secondary italic">Preview Mode Only</div>
                               )}
                            </div>
                        </div>
                    ))}
                    {!isSearching && query && mediaResults.length === 0 && !error && (
                        <div className="text-center py-20 text-text-secondary flex flex-col items-center">
                            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg">No media found for your discovery intent.</p>
                            <p className="text-sm mt-2">Try broader terms or verify API connection.</p>
                        </div>
                    )}
                </div>
            )}

            {mode === 'pdf' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                    {pdfResults.map((res) => (
                        <div key={res.id} className="bg-surface-card border border-white/10 rounded-2xl p-4 sm:p-5 hover:border-brand-primary/25 hover:bg-white/5 transition-all flex flex-col justify-between shadow-md group">
                            <div>
                               <div className="flex justify-between items-start gap-4 mb-3">
                                  <div className="flex-1 min-w-0">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-primary/20 text-brand-primary uppercase tracking-widest mb-2 inline-block">{res.source}</span>
                                      <h3 className="text-sm font-semibold text-text-primary/95 line-clamp-2 leading-snug group-hover:text-brand-primary transition-colors" title={res.title}>{res.title}</h3>
                                  </div>
                                  <div className="shrink-0 w-10 h-10 bg-surface-card rounded-lg flex items-center justify-center border border-white/10 group-hover:border-brand-primary/20 transition-all">
                                      <BookOpen className="w-4.5 h-4.5 text-brand-primary/50" />
                                  </div>
                                </div>
                               
                               <div className="mb-4 space-y-1 bg-black/20 rounded-xl p-3 border border-white/10 text-xs font-mono">
                                  <p className="text-text-secondary truncate flex items-center gap-2">
                                     <span className="text-text-secondary w-14">Author:</span>
                                     <span className="font-semibold text-text-primary truncate">{res.author}</span>
                                  </p>
                                  <p className="text-text-secondary truncate flex items-center gap-2">
                                     <span className="text-text-secondary w-14">Year:</span>
                                     <span className="font-semibold text-text-primary">{res.year}</span>
                                  </p>
                               </div>
                            </div>
                            
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => handleDownload(res.downloadUrl, `${res.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)}
                                 className="flex-1 py-2.5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                 title="Download PDF directly"
                               >
                                  <Download className="w-3.5 h-3.5" />
                                  Download PDF
                               </button>
                               <a 
                                 href={res.webUrl}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="flex-1 py-2.5 bg-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white border border-brand-primary/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center"
                                 title="View or borrow on Internet Archive"
                               >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  Web Reader
                               </a>
                            </div>
                        </div>
                    ))}
                    {!isSearching && query && pdfResults.length === 0 && !error && (
                        <div className="col-span-full text-center py-20 text-text-secondary flex flex-col items-center">
                            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg">No educational PDFs found.</p>
                            <p className="text-sm mt-2">Try different subject matter or verify terminology.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
