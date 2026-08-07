import { Settings, Shield, Bell, Palette, Zap, Key, Info, ExternalLink } from 'lucide-react';
import { hasGeminiKey } from '../lib/gemini';

export default function SettingsView() {
  const geminiConnected = hasGeminiKey();

  return (
    <div className="h-full overflow-y-auto bg-surface-bg p-5 space-y-5">
      <h2 className="text-text-primary font-semibold flex items-center gap-2">
        <Settings className="w-4 h-4 text-slate-400" /> Settings
      </h2>

      {/* AI Integration Status */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-5">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-brand-primary" /> AI Integrations
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/3 rounded-xl border border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-800 font-medium">Google Gemini API</div>
                <div className="text-xs text-gray-600">Powers AI Chat, CV Builder, Essay Generator, and more</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${geminiConnected ? 'bg-green-500/10 text-green-400 border-green-300' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {geminiConnected ? '✓ Connected' : '✗ Not configured'}
              </span>
            </div>
          </div>
          {!geminiConnected && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 text-xs font-semibold mb-1">Set up Gemini API for real AI responses</p>
                  <p className="text-gray-600 text-xs leading-relaxed mb-3">
                    To enable real AI-powered chat, CV generation, essay writing, and government service guidance, add your Google Gemini API key to the project secrets.
                  </p>
                  <ol className="text-gray-600 text-xs space-y-1 list-decimal list-inside mb-3">
                    <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-brand-primary underline">Google AI Studio</a> and create a free API key</li>
                    <li>In Replit, click "Secrets" (lock icon) in the Tools panel</li>
                    <li>Add a secret named <code className="bg-gray-200 px-1 rounded">VITE_GEMINI_API_KEY</code></li>
                    <li>Paste your API key as the value and save</li>
                    <li>Restart the application</li>
                  </ol>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white hover:bg-brand-primary text-white text-text-primary text-xs rounded-lg transition-all">
                    <ExternalLink className="w-3.5 h-3.5" /> Get Free API Key
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* External Cloud Integrations */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-5">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 2.396L2.392 18.995h19.232L12.01 2.396zM4.793 18.004L12.01 5.586l7.217 12.418H4.793z"/></svg> Cloud Integrations
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/3 rounded-xl border border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 87.3 127.8"><path d="M57.6 127.8L0 27.6h46.7L104.3 128z" fill="#000" fillOpacity=".1"/><path d="M57.6 127.8H0l28.8-50.1 86.4.2z" fill="#000" fillOpacity=".1"/><path d="M86.4 77.9L57.6 127.8 0 27.6l28.8-50h57.6z" fill="#329243"/><path d="M0 27.6h57.6L28.8 77.7z" fill="#fbd600"/><path d="M115.2 27.6L86.4 77.9 28.8 77.7z" fill="#4486f4"/><path d="M115.2 27.6L57.6 127.8l-28.8-50.1z" fill="#000" fillOpacity=".05"/></svg>
              </div>
              <div>
                <div className="text-sm text-gray-800 font-medium">Google Drive</div>
                <div className="text-xs text-gray-600">Import/integrate files to your vault securely</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => alert("Google Drive integration initiated. Please follow the OAuth process.")}
                className="text-xs px-3 py-1.5 rounded-lg font-medium border bg-blue-500 text-white border-blue-600 hover:bg-blue-600 transition-colors"
              >
                Connect Drive
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-5">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-violet-400" /> Business Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Business Name', value: 'CyberPlus Operations' },
            { label: 'Location', value: 'Nairobi, Kenya' },
            { label: 'Phone', value: '+254 700 000 000' },
            { label: 'Email', value: 'info@cyberplus.co.ke' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-gray-600 text-xs mb-1 block">{f.label}</label>
              <input defaultValue={f.value}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-brand-primary/50 transition-all" />
            </div>
          ))}
        </div>
        <button className="mt-3 px-4 py-2 bg-brand-primary text-white/80 hover:bg-brand-primary text-white text-text-primary text-xs rounded-lg transition-all">Save Changes</button>
      </div>

      {/* Printing Settings */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-5">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-orange-400" /> Printing Prices (KES)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'B&W per page', value: '5' },
            { label: 'Color per page', value: '20' },
            { label: 'Scanning per page', value: '10' },
            { label: 'Scanning (color)', value: '20' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-gray-600 text-xs mb-1 block">{f.label}</label>
              <input defaultValue={f.value} type="number"
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-brand-primary/50 transition-all" />
            </div>
          ))}
        </div>
        <button className="mt-3 px-4 py-2 bg-brand-primary text-white/80 hover:bg-brand-primary text-white text-text-primary text-xs rounded-lg transition-all">Save Pricing</button>
      </div>

      {/* Notifications Settings */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-5">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-amber-400" /> Notification Preferences
        </h3>
        <div className="space-y-3">
          {[
            { label: 'New service requests', desc: 'Alert when a new ticket is created' },
            { label: 'Print job completed', desc: 'Alert when printing finishes' },
            { label: 'Low supply warnings', desc: 'Alert when paper/ink is low' },
            { label: 'Daily revenue summary', desc: 'End-of-day revenue report' },
          ].map((n, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/3 rounded-lg">
              <div>
                <div className="text-sm text-gray-700">{n.label}</div>
                <div className="text-xs text-text-primary/35">{n.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-checked:bg-brand-primary text-white rounded-full transition-all peer-checked:after:translate-x-4 after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-4">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400" /> System Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Platform Version', value: 'CyberPlus v2.0' },
            { label: 'Build', value: 'React + Vite' },
            { label: 'AI Engine', value: geminiConnected ? 'Gemini 1.5 Flash' : 'Simulation' },
            { label: 'Status', value: 'Operational' },
          ].map(s => (
            <div key={s.label} className="bg-white/3 rounded-lg p-3">
              <div className="text-[10px] text-gray-600 mb-1">{s.label}</div>
              <div className="text-xs text-gray-700 font-medium">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
