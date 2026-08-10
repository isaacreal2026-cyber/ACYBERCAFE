import { useState } from 'react';
import { Building2, ChevronRight, CheckCircle, AlertCircle, Loader2, ExternalLink, FileText, Car, Shield, Sparkles, Code2, Copy, X, Terminal, Globe, Plus } from 'lucide-react';
import { generateWithGemini } from '../lib/gemini';
import { cn } from '../utils/cn';

type Service = { id: string; name: string; agency: string; description: string; icon: React.ElementType; color: string; bg: string; fields: Field[] };
type Field = { id: string; label: string; type: 'text' | 'select'; placeholder?: string; options?: string[] };

const SERVICES: Service[] = [
  {
    id: 'kra-nil', name: 'KRA Nil Returns', agency: 'KRA', description: 'File nil income tax returns for individuals with no income',
    icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
    fields: [
      { id: 'pin', label: 'KRA PIN', type: 'text', placeholder: 'A001234567X' },
      { id: 'password', label: 'iTax Password', type: 'text', placeholder: 'Enter password' },
      { id: 'year', label: 'Tax Year', type: 'select', options: ['2024', '2023', '2022', '2021', '2020'] },
    ]
  },
  {
    id: 'kra-tcc', name: 'KRA TCC Verification', agency: 'KRA', description: 'Apply for or verify Tax Compliance Certificate (TCC)',
    icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
    fields: [
      { id: 'pin', label: 'KRA PIN Number', type: 'text', placeholder: 'A001234567X' },
      { id: 'nationalId', label: 'National ID Number', type: 'text', placeholder: '12345678' },
      { id: 'tccNumber', label: 'TCC Number (for lookup)', type: 'text', placeholder: 'KRA202400123...' },
    ]
  },
  {
    id: 'kra-status', name: 'KRA Tax Status Lookup', agency: 'KRA', description: 'Verify KRA PIN obligations and compliance status',
    icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
    fields: [
      { id: 'pin', label: 'KRA PIN Number', type: 'text', placeholder: 'A001234567X' },
      { id: 'nationalId', label: 'National ID Number', type: 'text', placeholder: '12345678' },
    ]
  },
  {
    id: 'kra-pin', name: 'KRA PIN Registration', agency: 'KRA', description: 'Register for a new KRA PIN number',
    icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
    fields: [
      { id: 'nationalId', label: 'National ID Number', type: 'text', placeholder: '12345678' },
      { id: 'fullName', label: 'Full Name (as on ID)', type: 'text', placeholder: 'JOHN KAMAU MWANGI' },
      { id: 'dob', label: 'Date of Birth', type: 'text', placeholder: 'DD/MM/YYYY' },
      { id: 'phone', label: 'Phone Number', type: 'text', placeholder: '+254 7XX XXX XXX' },
    ]
  },
  {
    id: 'ecitizen-goodconduct', name: 'Good Conduct Certificate', agency: 'eCitizen', description: 'Apply for Certificate of Good Conduct from DCI',
    icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10',
    fields: [
      { id: 'nationalId', label: 'National ID Number', type: 'text', placeholder: '12345678' },
      { id: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Kamau' },
      { id: 'phone', label: 'Phone Number', type: 'text', placeholder: '+254 7XX XXX XXX' },
      { id: 'purpose', label: 'Purpose of Application', type: 'select', options: ['Employment', 'Travel', 'Education', 'Business', 'Other'] },
    ]
  },
  {
    id: 'ecitizen-passport', name: 'Passport Application', agency: 'eCitizen', description: 'Apply for or renew a Kenyan passport',
    icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10',
    fields: [
      { id: 'type', label: 'Application Type', type: 'select', options: ['New Passport', 'Renewal', 'Replacement'] },
      { id: 'nationalId', label: 'National ID Number', type: 'text', placeholder: '12345678' },
      { id: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Kamau' },
      { id: 'phone', label: 'Phone Number', type: 'text', placeholder: '+254 7XX XXX XXX' },
    ]
  },
  {
    id: 'ntsa-license', name: 'Driving License Check', agency: 'NTSA', description: 'Check driving license status and validity',
    icon: Car, color: 'text-orange-400', bg: 'bg-orange-500/10',
    fields: [
      { id: 'licenseNo', label: 'License Number', type: 'text', placeholder: 'A1234567' },
      { id: 'nationalId', label: 'National ID Number', type: 'text', placeholder: '12345678' },
    ]
  },
  {
    id: 'ntsa-vehicle', name: 'Vehicle Status Check', agency: 'NTSA', description: 'Check vehicle registration and ownership status',
    icon: Car, color: 'text-orange-400', bg: 'bg-orange-500/10',
    fields: [
      { id: 'plate', label: 'Number Plate', type: 'text', placeholder: 'KCA 123A' },
    ]
  },
];

const AGENCY_COLORS: Record<string, string> = {
  KRA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  eCitizen: 'bg-blue-500/10 text-blue-400 border-brand-accent',
  NTSA: 'bg-orange-500/10 text-orange-400 border-orange-300',
};

export default function GovernmentServicesView() {
  const [selected, setSelected] = useState<Service | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [customServices, setCustomServices] = useState<Service[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', agency: 'Custom', description: '', contactLine: '', websiteLink: '' });

  // Smart URL Scraper & Caveman Autofill State
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapedFields, setScrapedFields] = useState<Field[]>([]);
  const [showCavemanModal, setShowCavemanModal] = useState<boolean>(false);
  const [cavemanCopied, setCavemanCopied] = useState<boolean>(false);

  const getDefaultUrl = (service: Service) => {
    return (
      (service as any).websiteLink ||
      (service.agency === 'KRA'
        ? 'https://itax.kra.go.ke'
        : service.agency === 'eCitizen'
          ? 'https://ecitizen.go.ke'
          : service.agency === 'NTSA'
            ? 'https://tims.ntsa.go.ke'
            : 'https://www.e-services.go.ke')
    );
  };

  const agencies = ['all', 'KRA', 'eCitizen', 'NTSA', 'Custom'];
  const allServices = [...SERVICES, ...customServices];
  const filtered = allServices.filter(s => agencyFilter === 'all' || s.agency === agencyFilter);

  const handleAddCustomService = () => {
    if (!customForm.name) return;
    const newService: Service = {
      id: `custom-${Date.now()}`,
      name: customForm.name,
      agency: 'Custom',
      description: `${customForm.description} - Contact: ${customForm.contactLine}`,
      icon: Building2,
      color: 'text-brand-primary',
      bg: 'bg-brand-primary/10',
      fields: [
        { id: 'notes', label: 'Additional Notes', type: 'text', placeholder: 'Any notes...' }
      ]
    };
    if (customForm.websiteLink) {
      (newService as any).websiteLink = customForm.websiteLink;
    }
    setCustomServices(prev => [...prev, newService]);
    setShowAddCustom(false);
    setCustomForm({ name: '', agency: 'Custom', description: '', contactLine: '', websiteLink: '' });
  };

  const handleScrapePortal = async () => {
    if (!customUrl) return;
    setIsScraping(true);
    setScrapedFields([]);
    try {
      const res = await fetch('/api/analyze-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: customUrl, serviceName: selected?.name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.detectedFields) {
          setScrapedFields(data.detectedFields);
        }
      }
    } catch (e) {
      console.error('Scraping error:', e);
    } finally {
      setIsScraping(false);
    }
  };

  const handleMergeScrapedFields = () => {
    if (!selected || scrapedFields.length === 0) return;
    const existingIds = new Set(selected.fields.map(f => f.id));
    const newFields = scrapedFields.filter(f => !existingIds.has(f.id));
    if (newFields.length > 0) {
      selected.fields.push(...newFields);
    }
    setScrapedFields([]);
    alert(`Successfully merged ${newFields.length} smart detected fields into the Customer Details form!`);
  };

  const generateCavemanScript = () => {
    const cleanData: Record<string, string> = {};
    Object.entries(formData).forEach(([k, v]) => {
      if (v && v.trim() !== '') cleanData[k] = v.trim();
    });
    return `javascript:(function(){
  console.log('[CyberPlus Caveman] Starting smart DOM autofill...');
  const data = ${JSON.stringify(cleanData, null, 2)};
  let count = 0;
  const aliasMap = {
    pin: ['pin', 'kra_pin', 'taxpayer', 'id_number', 'nationalid'],
    nationalId: ['id', 'nationalid', 'id_no', 'idnumber', 'serial'],
    fullName: ['name', 'fullname', 'first_name', 'applicant_name', 'client_name'],
    phone: ['phone', 'mobile', 'tel', 'contact', 'msisdn'],
    email: ['email', 'mail', 'user_email'],
    licenseNo: ['license', 'licence', 'plate', 'reg_no'],
    dob: ['dob', 'birth', 'date_of_birth']
  };
  for (const [key, value] of Object.entries(data)) {
    const aliases = aliasMap[key] || [key];
    for (const alias of aliases) {
      const el = document.querySelector(
        'input[name*="' + alias + '" i], input[id*="' + alias + '" i], input[placeholder*="' + alias + '" i], select[name*="' + alias + '" i]'
      );
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.style.border = '2px solid #10b981';
        el.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
        count++;
        break;
      }
    }
  }
  alert('[CyberPlus Caveman Autofill] Successfully filled ' + count + ' matching fields on this portal! Please review and submit.');
})();`;
  };

  const handleProcess = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    const fieldSummary = selected.fields.map(f => `${f.label}: ${formData[f.id] || 'not provided'}`).join(', ');
    const prompt = `You are a Kenyan cyber cafe assistant helping with ${selected.agency} ${selected.name}. 
The customer has provided: ${fieldSummary}.
Provide a step-by-step guide for completing this service, any requirements checklist, estimated processing time, and fees involved. Keep it practical and specific to Kenya.`;
    const response = await generateWithGemini(prompt, `You assist Kenyan citizens with government services at a cyber cafe. Be specific, helpful, and accurate about Kenyan government processes.`);
    setResult(response);
    setLoading(false);
  };

  return (
    <div className="h-full flex bg-surface-bg overflow-hidden">
      {/* Services List */}
      <div className={cn('flex flex-col border-r border-white/8', selected ? 'w-72 flex-shrink-0' : 'flex-1')}>
        <div className="p-4 border-b border-white/8 space-y-3">
          <h2 className="text-text-primary font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" /> Government Services Hub
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {agencies.map(a => (
              <button key={a} onClick={() => setAgencyFilter(a)}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all capitalize',
                  agencyFilter === a ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 text-brand-primary' : 'bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-700')}>
                {a === 'all' ? 'All Services' : a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map(service => {
            const Icon = service.icon;
            const agencyCls = AGENCY_COLORS[service.agency] || '';
            const isActive = selected?.id === service.id;
            return (
              <button
                key={service.id}
                onClick={() => {
                  setSelected(service);
                  setFormData({});
                  setResult(null);
                  setCustomUrl(getDefaultUrl(service));
                  setScrapedFields([]);
                  setShowCavemanModal(false);
                }}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:border-white/15',
                  isActive ? 'bg-brand-primary text-white/8 border-brand-primary/20' : 'bg-white/3 border-white/8'
                )}
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', service.bg)}>
                  <Icon className={cn('w-4 h-4', service.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 font-medium">{service.name}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">{service.description}</div>
                  <span className={cn('inline-block text-[9px] px-1.5 py-0.5 rounded border mt-1.5 font-semibold', agencyCls)}>{service.agency}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-primary/20 mt-1 flex-shrink-0" />
              </button>
            );
          })}
          
          <button 
            onClick={() => setShowAddCustom(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:text-brand-primary hover:border-brand-primary/50 transition-all text-sm font-medium"
          >
            + Add Custom Service
          </button>
        </div>
      </div>

      {showAddCustom && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-2xl w-full max-w-md p-6 border border-gray-200 shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary mb-4">Add Custom Service</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Service Name</label>
                <input value={customForm.name} onChange={e => setCustomForm(p => ({...p, name: e.target.value}))} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800" placeholder="e.g., NHIF Registration" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Upload Icon/Image (Optional)</label>
                <input type="file" className="text-xs text-gray-600 w-full" accept="image/*" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Description</label>
                <input value={customForm.description} onChange={e => setCustomForm(p => ({...p, description: e.target.value}))} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800" placeholder="Short description" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Contact/Reach Line</label>
                <input value={customForm.contactLine} onChange={e => setCustomForm(p => ({...p, contactLine: e.target.value}))} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800" placeholder="e.g., +254..." />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Website Link</label>
                <input value={customForm.websiteLink} onChange={e => setCustomForm(p => ({...p, websiteLink: e.target.value}))} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800" placeholder="https://" />
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowAddCustom(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleAddCustomService} className="flex-1 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium">Add Service</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Form & Smart URL Scraper */}
      {selected && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/2">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', selected.bg)}>
                <selected.icon className={cn('w-5 h-5', selected.color)} />
              </div>
              <div>
                <h3 className="text-text-primary font-bold text-base">{selected.name}</h3>
                <p className="text-gray-600 text-xs">{selected.description}</p>
              </div>
            </div>
            <span className={cn('inline-block text-[10px] px-2.5 py-1 rounded-full border font-semibold ml-auto sm:ml-0', AGENCY_COLORS[selected.agency] || 'bg-brand-primary/10 text-brand-primary border-brand-primary/20')}>
              {selected.agency} Portal
            </span>
          </div>

          {/* Smart Custom Portal URL Bar */}
          <div className="p-3 border-b border-white/8 bg-surface-card/60 flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <Globe className="w-4 h-4 text-brand-primary flex-shrink-0" />
              <input
                type="url"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="Enter or customize target portal link (e.g. https://itax.kra.go.ke or custom county/scholarship link)..."
                className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={customUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-all shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Portal</span>
              </a>
              <button
                onClick={handleScrapePortal}
                disabled={isScraping || !customUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary border border-brand-primary/30 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                title="AI Scrape URL to detect form fields automatically"
              >
                {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isScraping ? 'Scraping Portal...' : 'AI Scrape Form'}</span>
              </button>
              <button
                onClick={() => setShowCavemanModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-all shadow-sm"
                title="Caveman Browser Extension / Bookmarklet Autofill Helper"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Caveman Autofill</span>
              </button>
            </div>
          </div>

          {/* Smart Scraped Fields Banner */}
          {scrapedFields.length > 0 && (
            <div className="p-3 bg-brand-primary/10 border-b border-brand-primary/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-primary flex-shrink-0 animate-pulse" />
                <span className="text-xs text-text-primary font-semibold">
                  Smart Scraper Result: Found {scrapedFields.length} Form Fields from {customUrl}
                </span>
              </div>
              <button
                onClick={handleMergeScrapedFields}
                className="flex items-center gap-1 px-3 py-1 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-semibold rounded-lg transition-all shadow"
              >
                <Plus className="w-3 h-3" />
                <span>Add Detected Fields to Form</span>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Form */}
            <div className="bg-white/3 rounded-xl border border-white/8 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Customer Details</h4>
                <button
                  onClick={() => setShowCavemanModal(true)}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Code2 className="w-3 h-3" /> Get Caveman Autofill Script
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selected.fields.map(field => (
                  <div key={field.id}>
                    <label className="text-gray-600 text-xs mb-1 block">{field.label}</label>
                    {field.type === 'select' ? (
                      <select value={formData[field.id] || ''} onChange={e => setFormData(p => ({ ...p, [field.id]: e.target.value }))}
                        className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-brand-primary/50 transition-all">
                        <option value="">Select...</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={formData[field.id] || ''} onChange={e => setFormData(p => ({ ...p, [field.id]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-white/25 focus:outline-none focus:border-brand-primary/50 transition-all" />
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleProcess} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-text-primary text-sm rounded-lg transition-all font-medium">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {loading ? 'Processing...' : 'Get AI Guidance'}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div className="bg-white/3 rounded-xl border border-emerald-500/20 p-4">
                <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" /> AI Service Guide
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result}</div>
              </div>
            )}

            {!result && !loading && (
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 text-xs font-semibold mb-1">How to use</p>
                    <p className="text-gray-600 text-xs leading-relaxed">Fill in the customer's details above and click "Get AI Guidance" to receive a step-by-step guide for this service, including requirements, fees, and processing times.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Caveman Browser Extension & Bookmarklet Autofill Modal */}
      {showCavemanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-emerald-500/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Caveman Browser Extension & Bookmarklet Autofill</h3>
                  <p className="text-xs text-gray-400">Production-Safe DOM Autofill Algorithm for Government Portals & Custom Links</p>
                </div>
              </div>
              <button onClick={() => setShowCavemanModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Production Brainstorming & Architecture Blueprint */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Why a "Caveman" Algorithm is Superior in Production</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  In live production, government portals (<code className="text-cyan-300">itax.kra.go.ke</code>, <code className="text-cyan-300">ecitizen.go.ke</code>) actively block server-side bots, cloud scrapers, and headless automation using CAPTCHAs, Cloudflare, and OTP sessions.
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  The <strong className="text-white">Caveman Browser Extension / Bookmarklet</strong> solves this by running <strong>client-side inside your own authenticated browser tab</strong>. It inherits your existing login session, IP reputation, and cookies, using fuzzy DOM matching (<code className="text-cyan-300">name*="..."</code>, <code className="text-cyan-300">id*="..."</code>, <code className="text-cyan-300">placeholder</code>) to autofill customer data and fire real DOM <code className="text-cyan-300">input</code> / <code className="text-cyan-300">change</code> events without any server-side blocking or altering business logic.
                </p>
              </div>

              {/* 3-Step Production Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-xs font-bold text-cyan-400 mb-1">1. Copy Caveman Script</div>
                  <p className="text-[11px] text-gray-400">Click the button below to copy the auto-generated script containing this customer&apos;s details.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-xs font-bold text-cyan-400 mb-1">2. Open Target Portal</div>
                  <p className="text-[11px] text-gray-400">Click &quot;Open Portal&quot; to open the target website (<code className="text-emerald-300">{customUrl || 'Govt Portal'}</code>) in your browser tab.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-xs font-bold text-cyan-400 mb-1">3. Run &amp; Autofill</div>
                  <p className="text-[11px] text-gray-400">Open Browser DevTools (<code className="text-white">F12</code> &rarr; Console) or run as Bookmarklet &rarr; matching fields are filled instantly!</p>
                </div>
              </div>

              {/* Live Copyable Script */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Generated Javascript Script (Fuzzy DOM Matcher)
                  </span>
                  {cavemanCopied && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Copied to Clipboard!
                    </span>
                  )}
                </div>
                <div className="relative">
                  <pre className="bg-[#0f111a] border border-white/10 rounded-xl p-3 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-52">
                    <code>{generateCavemanScript()}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-white/2 flex gap-2 justify-end">
              <button
                onClick={() => setShowCavemanModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-medium transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateCavemanScript());
                  setCavemanCopied(true);
                  setTimeout(() => setCavemanCopied(false), 3000);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Caveman Script</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
