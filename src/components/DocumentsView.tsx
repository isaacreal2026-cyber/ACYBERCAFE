import { useState } from 'react';
import { FileText, Plus, Search, Download, Folder, File, X, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { StoredDocument } from '../types';
import { cn } from '../utils/cn';

interface DocumentsViewProps {
  documents: StoredDocument[];
  addDocument: (doc: Omit<StoredDocument, 'id' | 'createdAt'>) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cv: { label: 'CV/Resume', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  letter: { label: 'Letter', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  certificate: { label: 'Certificate', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  id: { label: 'ID Document', color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary' },
  receipt: { label: 'Receipt', color: 'text-green-400', bg: 'bg-green-500/10' },
  other: { label: 'Other', color: 'text-gray-600', bg: 'bg-gray-100' },
};

export default function DocumentsView({ documents, addDocument }: DocumentsViewProps) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [showScraper, setShowScraper] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'PDF', size: '', customerName: '', category: 'other' as StoredDocument['category'] });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedResults, setScrapedResults] = useState<{ title: string; download_url: string }[]>([]);

  const filtered = documents.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || (d.customerName || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || d.category === catFilter;
    return matchSearch && matchCat;
  });

  const handleCancelForm = () => {
    setForm({ name: '', type: 'PDF', size: '', customerName: '', category: 'other' });
    setError('');
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      setError('Please enter a valid File Name.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await addDocument({ name: form.name, type: form.type, size: form.size || '—', customerName: form.customerName, category: form.category });
      handleCancelForm();
    } catch (e) {
      setError('Failed to save document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScrape = async () => {
    if (!scrapeUrl) return;
    setIsScraping(true);
    setScrapedResults([]);
    try {
      const res = await fetch(`/api/scrape-exams?site_url=${encodeURIComponent(scrapeUrl)}`);
      const data = await res.json();
      if (data.results) {
        setScrapedResults(data.results);
      }
    } catch (e) {
      console.error("Failed to scrape", e);
    } finally {
      setIsScraping(false);
    }
  };

  const saveScrapedToVault = (item: { title: string; download_url: string }) => {
    addDocument({
      name: item.title + ".pdf",
      type: "PDF",
      size: "Online Link",
      customerName: "Web Source",
      category: "other",
      url: item.download_url
    });
  };

  return (
    <div className="h-full flex flex-col bg-surface-bg overflow-hidden">
      <div className="p-4 border-b border-white/8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary font-semibold flex items-center gap-2">
            <Folder className="w-4 h-4 text-green-400" /> Digital File Vault
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{documents.length} files</span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowScraper(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-brand-accent text-xs rounded-lg transition-all">
              <Globe className="w-3.5 h-3.5" /> Web PDF Link Extractor
            </button>
            <button onClick={() => { setError(''); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition-all">
              <Plus className="w-3.5 h-3.5" /> Add File
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..."
              className="w-full bg-gray-100 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-700 placeholder-white/25 focus:outline-none focus:border-green-500/50 transition-all" />
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setCatFilter('all')} className={cn('px-2.5 py-1 rounded-lg text-xs border transition-all', catFilter === 'all' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 text-brand-primary' : 'bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-600')}>All</button>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setCatFilter(k)} className={cn('px-2.5 py-1 rounded-lg text-xs border transition-all', catFilter === k ? cn(v.bg, 'border-transparent', v.color) : 'bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-600')}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(doc => {
            const cfg = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.other;
            return (
              <div key={doc.id} className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all group">
                <div className="flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                    <File className={cn('w-5 h-5', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 font-medium truncate">{doc.name}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{doc.type} · {doc.size}</div>
                    {doc.customerName && <div className="text-[10px] text-gray-600 mt-1">{doc.customerName}</div>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', cfg.color, cfg.bg)}>{cfg.label}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => doc.url && window.open(doc.url, '_blank')}
                      disabled={!doc.url}
                      className="p-1.5 text-gray-600 hover:text-brand-primary hover:bg-brand-primary/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                      title={doc.url ? "Download Document" : "No download available"}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <FileText className="w-10 h-10 text-text-primary/10 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">No documents found</p>
            </div>
          )}
        </div>
      </div>

      {showScraper && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-brand-accent rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h3 className="text-text-primary font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400" /> Web PDF Link Extractor</h3>
              <button onClick={() => setShowScraper(false)}><X className="w-5 h-5 text-text-secondary hover:text-text-primary" /></button>
            </div>
            
            <div className="p-5 flex gap-2 border-b border-gray-100 shrink-0">
              <input 
                value={scrapeUrl} 
                onChange={e => setScrapeUrl(e.target.value)} 
                placeholder="https://education-site.com/past-papers"
                className="flex-1 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-white/25 focus:outline-none focus:border-blue-500/50 transition-all" 
              />
              <button 
                onClick={handleScrape} 
                disabled={isScraping || !scrapeUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-text-primary rounded-lg text-sm font-medium transition-all flex items-center gap-2">
                {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Scan URLs
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-black/20">
              {scrapedResults.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 mb-3">Found {scrapedResults.length} matching PDF documents</div>
                  {scrapedResults.map((res, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-100 border border-gray-200 p-3 rounded-lg group">
                      <div className="min-w-0 pr-4">
                        <div className="text-sm font-medium text-text-primary/90 truncate" title={res.title}>{res.title}</div>
                        <a href={res.download_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400/70 hover:text-blue-400 flex items-center gap-1 mt-1 truncate">
                          {res.download_url} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <button 
                        onClick={() => saveScrapedToVault(res)}
                        className="shrink-0 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-text-primary text-xs rounded transition-all">
                        Save to Vault
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 py-10">
                  <Globe className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Enter a URL to scan for downloadable PDFs (exams, past papers)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-green-500/30 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h3 className="text-text-primary font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-green-400" /> Add Document</h3>
              <button onClick={handleCancelForm}><X className="w-5 h-5 text-text-secondary hover:text-text-primary" /></button>
            </div>
            <div className="p-5 space-y-3">
              {error && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
              {[
                { label: 'File Name *', key: 'name', placeholder: 'e.g. CV_John_Kamau.pdf' },
                { label: 'Customer Name', key: 'customerName', placeholder: 'Customer name' },
                { label: 'File Size', key: 'size', placeholder: 'e.g. 245 KB' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-text-secondary text-xs mb-1 block">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-green-500/50 transition-all" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">File Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-green-500/50 transition-all">
                    {['PDF', 'DOCX', 'JPG', 'PNG', 'XLSX', 'Other'].map(t => <option key={t} className="bg-surface-card text-text-primary">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-green-500/50 transition-all">
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-surface-card text-text-primary">{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={handleCancelForm} className="flex-1 py-2 border border-white/10 text-text-secondary hover:text-text-primary rounded-lg text-sm hover:bg-white/5 transition-all">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
