import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Music, Video, BookOpen, LayoutDashboard, Loader2, Download, X, AlertCircle } from 'lucide-react';
import { ToolCategory } from '../types';

type SearchTab = 'music' | 'video' | 'pdf' | 'internal';

interface GlobalSearchProps {
  setActiveCategory: (cat: ToolCategory) => void;
}

const API_ENDPOINTS = {
  ARCHIVE: '/api/ia-search',
};

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

export default function GlobalSearch({ setActiveCategory }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<SearchTab>('music');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setTab('music');
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

  const performSearch = useCallback(async () => {
    if (!query.trim()) return;
    setError(null);

    if (tab === 'internal') {
      const internalRoutes: {id: ToolCategory; label: string; icon: any; desc: string}[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview of operations and main stats' },
        { id: 'search-engine', label: 'Search Engines', icon: Search, desc: 'Direct discovery engine tab' },
      ];
      setResults(internalRoutes.filter(r => r.label.toLowerCase().includes(query.toLowerCase())));
      return;
    }

    setIsSearching(true);
    setResults([]);
    
    try {
      // Direct URL check
      const isVideoUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|instagram\.com|tiktok\.com|facebook\.com|twitch\.tv|twitter\.com|x\.com)\/.+$/i.test(query.trim()) || 
                         query.includes('watch?v=') || 
                         query.includes('youtu.be/');

      if (isVideoUrl && (tab === 'music' || tab === 'video')) {
        try {
          const apiKey = (import.meta as any).env.VITE_MEDIA_PROXY_API_KEY || 'media_secret_secure_key_2026';
          const response = await fetchWithTimeout('/api/media/extract', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-API-Key': apiKey
            },
            body: JSON.stringify({ url: query.trim() })
          }, 18000);

          if (!response.ok) throw new Error(`Status error: ${response.status}`);
          const data = await response.json();
          if (data && data.videoPreviewUrl) {
            setResults([{
              id: `extracted-${Date.now()}`,
              title: data.title || 'Extracted Video Stream',
              creator: data.creator || 'Media Extractor',
              audioUrl: data.audioPreviewUrl,
              videoUrl: data.videoPreviewUrl,
              year: 'XTube',
              source: data.source || 'Extraction Proxy'
            }]);
            return;
          }
          throw new Error('No formats or titles returned');
        } catch (err: any) {
          console.error('Unified media extraction failed in global search:', err?.message || String(err));
          setError('Failed to extract direct media link. Internal backend handlers and external proxies timed out or failed.');
        }
      } else {
        let combinedResults: any[] = [];

        if (tab === 'music' || tab === 'video') {
          try {
            const ytResponse = await fetch(`/api/media/search?q=${encodeURIComponent(query)}`);
            if (ytResponse.ok) {
              const ytData = await ytResponse.json();
              if (Array.isArray(ytData)) {
                ytData.forEach((item: any) => {
                  combinedResults.push({
                    id: item.id,
                    title: item.title,
                    creator: item.creator,
                    audioUrl: item.audioPreviewUrl,
                    videoUrl: item.videoPreviewUrl,
                    webUrl: `https://www.youtube.com/watch?v=${item.id.replace('yt-', '')}`,
                    year: 'YouTube',
                    source: item.source || 'YouTube'
                  });
                });
              }
            }
          } catch (e: any) {
            console.warn('YouTube search failed in GlobalSearch', e?.message || e);
          }
        }

        // Query Internet Archive proxy
        let q = '';
        if (tab === 'music') {
          q = `(${query}) AND mediatype:audio`;
        } else if (tab === 'video') {
          q = `(${query}) AND mediatype:movies`;
        } else if (tab === 'pdf') {
          q = `(${query}) AND mediatype:texts AND format:pdf AND -collection:inlibrary AND -collection:printdisabled`;
        }
        
        const iaUrl = `${API_ENDPOINTS.ARCHIVE}?q=${encodeURIComponent(q)}&fl[]=identifier,title,creator,mediatype,format,year&rows=15&output=json`;
        const res = await fetch(iaUrl);
        const data = await res.json();
        const docs = data.response?.docs || [];
        
        const parsed = docs.map((doc: any) => {
          const isAudio = doc.mediatype === 'audio';
          const isVideo = doc.mediatype === 'movies';
          const isPdf = tab === 'pdf';
          
          let audioUrl, videoUrl, pdfUrl;
          if (isAudio) audioUrl = `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`;
          if (isVideo) videoUrl = `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp4`;
          if (isPdf) pdfUrl = `https://archive.org/download/${doc.identifier}/${doc.identifier}.pdf`;

          return {
            id: doc.identifier,
            title: doc.title || 'Unknown Title',
            creator: Array.isArray(doc.creator) ? doc.creator[0] : (doc.creator || 'Archive'),
            audioUrl,
            videoUrl,
            pdfUrl,
            webUrl: `https://archive.org/details/${doc.identifier}`,
            year: doc.year,
            source: 'Archive'
          };
        });
        setResults([...combinedResults, ...parsed]);
      }
    } catch (e: any) {
      console.error('Global search catch error:', e?.message || String(e));
      setError(e.message || 'An error occurred during search.');
    } finally {
      setIsSearching(false);
    }
  }, [query, tab]);

  const triggerSearchType = (type: SearchTab) => {
    setTab(type);
    setIsOpen(true);
    setResults([]);
    setQuery('');
    setError(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="relative flex items-center gap-1.5 sm:gap-2" ref={containerRef}>
      {/* Sleek Input trigger */}
      <div 
        onClick={() => setIsOpen(true)}
        className="relative w-24 xs:w-32 sm:w-52 cursor-text group flex-shrink"
      >
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 group-hover:text-brand-primary transition-colors" />
        <input
          type="text"
          readOnly
          placeholder="Search..."
          className="bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-600 placeholder-gray-400 focus:outline-none focus:border-brand-primary/50 w-full transition-all cursor-pointer truncate"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 font-mono hidden sm:block border border-gray-200 rounded px-1 bg-gray-100">⌘K</kbd>
      </div>

      {/* Sleek Category Search Shortcuts beside search input */}
      <div className="hidden sm:flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); triggerSearchType('music'); }}
          title="Search Music"
          className={`p-1.5 rounded-lg border transition-all ${isOpen && tab === 'music' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-gray-100 text-gray-600 border-gray-100 hover:text-white/90 hover:bg-gray-200 hover:border-gray-200'}`}
        >
          <Music className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); triggerSearchType('video'); }}
          title="Search Videos"
          className={`p-1.5 rounded-lg border transition-all ${isOpen && tab === 'video' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-100 text-gray-600 border-gray-100 hover:text-white/90 hover:bg-gray-200 hover:border-gray-200'}`}
        >
          <Video className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); triggerSearchType('pdf'); }}
          title="Search PDFs"
          className={`p-1.5 rounded-lg border transition-all ${isOpen && tab === 'pdf' ? 'bg-brand-primary/20 text-brand-primary text-brand-primary border-brand-primary/30' : 'bg-gray-100 text-gray-600 border-gray-100 hover:text-white/90 hover:bg-gray-200 hover:border-gray-200'}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Global Search Popover */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-12 sm:-right-4 w-auto sm:w-[500px] max-h-[85vh] flex flex-col bg-surface-card border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-[9999] transform origin-top shadow-black/90 animate-in fade-in zoom-in-95 duration-150">
          
          <div className="p-4 border-b border-gray-100 bg-gray-100">
             <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input 
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                  placeholder={
                    tab === 'music' ? "Enter song/artist OR YouTube URL..." :
                    tab === 'video' ? "Enter video keywords OR direct URL..." :
                    tab === 'pdf' ? "Search school textbooks & free PDFs..." : "Type key system route name..."
                  }
                  className="w-full bg-surface-bg border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-text-primary placeholder-gray-400 focus:outline-none focus:border-brand-primary/50 shadow-inner"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
                  </div>
                )}
                {!isSearching && query && (
                  <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-600">
                     <X className="w-4 h-4" />
                  </button>
                )}
             </div>

             <div className="flex items-center gap-1 p-1 bg-black/40 rounded-lg">
                {[
                  { id: 'music', label: 'Music', icon: Music },
                  { id: 'video', label: 'Video', icon: Video },
                  { id: 'pdf', label: 'PDFs', icon: BookOpen },
                  { id: 'internal', label: 'Internal', icon: LayoutDashboard },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id as SearchTab); setResults([]); setQuery(''); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t.id ? 'bg-brand-primary text-white/25 text-brand-primary shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto w-full p-2.5 space-y-2 max-h-[420px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
             {error && (
                 <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                     {error}
                 </div>
             )}

             {isSearching ? (
                 <div className="flex flex-col items-center justify-center py-16 opacity-70">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-3" />
                    <span className="text-xs font-mono text-brand-primary uppercase tracking-widest animate-pulse">Scanning Global Repository...</span>
                 </div>
             ) : results.length > 0 ? (
                 <div className="space-y-1.5">
                   {tab === 'internal' ? (
                      results.map(r => (
                        <button key={r.id} onClick={() => { setActiveCategory(r.id); setIsOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 text-left transition-colors border border-transparent hover:border-gray-100 group">
                           <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20 group-hover:scale-110 transition-transform">
                              <r.icon className="w-4 h-4 text-brand-primary" />
                           </div>
                           <div>
                              <span className="text-sm font-medium text-text-primary block">{r.label}</span>
                              <span className="text-[10px] text-gray-600">{r.desc}</span>
                           </div>
                        </button>
                      ))
                   ) : (
                      <div className="flex flex-col gap-2">
                        {/* High-density playlist styling (Tubidy format) */}
                        {results.map(r => (
                           <div key={r.id} className="relative bg-surface-card border border-gray-100 rounded-xl p-3 hover:border-brand-primary/20 transition-all flex flex-col gap-2.5">
                               <div className="flex items-center gap-3 justify-between">
                                  {/* Left Art / Format Badge */}
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                     <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${tab === 'music' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : tab === 'video' ? 'bg-blue-500/10 border-brand-accent text-blue-400' : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 text-brand-primary'} shrink-0`}>
                                        {tab === 'music' ? <Music className="w-4 h-4" /> : tab === 'video' ? <Video className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                     </div>
                                     <div className="min-w-0">
                                        <h4 className="text-xs font-semibold text-text-primary truncate leading-tight">{r.title}</h4>
                                        <p className="text-[10px] text-gray-600 truncate mt-0.5">By {r.creator} {r.year ? `• ${r.year}` : ''}</p>
                                     </div>
                                  </div>

                                  {/* Right side download pills */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                     {tab === 'music' && r.audioUrl && (
                                       <button 
                                          onClick={() => handleDownload(r.audioUrl, `${r.title.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.mp3`)} 
                                          title="Download High Quality Audio File"
                                          className="flex items-center gap-1 px-2.5 py-1 bg-[#22aa55]/20 hover:bg-[#22aa55] border border-[#22aa55]/20 hover:border-[#22aa55] text-green-700 hover:text-white rounded-md text-[10px] font-bold transition-all"
                                       >
                                          <Download className="w-2.5 h-2.5" />
                                          MP3
                                       </button>
                                     )}
                                     {tab === 'video' && r.videoUrl && (
                                       <button 
                                          onClick={() => handleDownload(r.videoUrl, `${r.title.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.mp4`)} 
                                          title="Download Native Video Link"
                                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500 border border-brand-accent hover:border-blue-400 text-blue-300 hover:text-white rounded-md text-[10px] font-bold transition-all"
                                       >
                                          <Download className="w-2.5 h-2.5" />
                                          MP4
                                       </button>
                                     )}
                                     {tab === 'pdf' && r.pdfUrl && (
                                       <button 
                                          onClick={() => handleDownload(r.pdfUrl, `${r.title.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.pdf`)} 
                                          title="Download Free Educational PDF"
                                          className="flex items-center gap-1 px-2.5 py-1 bg-brand-primary/20 text-brand-primary hover:bg-brand-primary text-white border border-brand-primary/20 hover:border-cyan-400 text-brand-primary hover:text-white rounded-md text-[10px] font-bold transition-all"
                                       >
                                          <Download className="w-2.5 h-2.5" />
                                          PDF
                                       </button>
                                     )}
                                  </div>
                               </div>

                               {/* Compact inline preview row if available */}
                               {tab === 'music' && r.audioUrl && (
                                 <div className="bg-black/30 rounded-lg p-1.5 border border-gray-100">
                                    <audio 
                                       preload="metadata"
                                       controls 
                                       className="h-6 w-full outline-none [&::-webkit-media-controls-panel]:bg-transparent"
                                       onError={() => console.debug('Audio preview load or abort event handled gracefully')} 
                                    >
                                       <source src={r.audioUrl} type="audio/mpeg" />
                                       <source src={r.audioUrl} type="audio/mp4" />
                                    </audio>
                                 </div>
                               )}
                               {tab === 'video' && r.videoUrl && (
                                 <div className="bg-black/30 rounded-lg p-1.5 border border-gray-100">
                                    <video 
                                       preload="metadata"
                                       controls 
                                       className="max-h-28 w-full rounded-md"
                                       onError={(e) => console.debug('Video preview load or abort event handled gracefully', e)} 
                                    >
                                       <source src={r.videoUrl} type="video/mp4" />
                                       <source src={r.videoUrl} type="video/webm" />
                                    </video>
                                 </div>
                               )}
                           </div>
                        ))}
                      </div>
                   )}
                 </div>
             ) : (
                 query && !isSearching && (
                    <div className="py-12 text-center text-xs text-gray-600">
                       No results found. Feel free to search with other terms or check input.
                    </div>
                 )
             )}
             {!query && (
                 <div className="py-12 text-center text-xs text-gray-600 flex flex-col items-center gap-3">
                    <div className="relative">
                      <Search className="w-8 h-8 opacity-20" />
                      {tab === 'music' && <Music className="w-4 h-4 text-purple-500/40 absolute -bottom-1 -right-1" />}
                      {tab === 'video' && <Video className="w-4 h-4 text-blue-500/40 absolute -bottom-1 -right-1" />}
                      {tab === 'pdf' && <BookOpen className="w-4 h-4 text-brand-primary/40 absolute -bottom-1 -right-1" />}
                    </div>
                    <p className="font-semibold text-gray-600">Universal Discovery Platform</p>
                    <p className="max-w-[280px] text-text-primary/20 mx-auto text-[11px]">
                       {tab === 'music' && "Search and download high-quality public tracks, audio files, sound effects, or input direct URLs!"}
                       {tab === 'video' && "Analyze video files, stream media instantly, download clips, or process URL links!"}
                       {tab === 'pdf' && "Retrieve public-domain research documents, school materials, textbooks and PDFs!"}
                       {tab === 'internal' && "Search across system options, tools, settings, lists and modules!"}
                    </p>
                 </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
