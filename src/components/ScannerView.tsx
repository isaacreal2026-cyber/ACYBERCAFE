import { useState } from 'react';
import { ScanLine, Upload, FileText, Image, CheckCircle, Info, Loader2 } from 'lucide-react';

export default function ScannerView() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleStartScan = () => {
    setIsScanning(true);
    setScanned(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanned(true);
      showNotice("Document scanned successfully!");
    }, 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-bg p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary font-semibold flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-yellow-400" /> Scanner Center
        </h2>
        {notice && (
          <div className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-lg animate-fade-in">
            {notice}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 p-4 bg-green-500/8 border border-green-300 rounded-xl">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <div>
          <div className="text-green-400 text-sm font-medium">Scanner Ready</div>
          <div className="text-gray-600 text-xs">Connected via USB — EPSON L3210 Series</div>
        </div>
        <span className="ml-auto text-xs bg-green-500/10 text-green-400 border border-green-300 px-2 py-1 rounded-lg">Online</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Scan Controls */}
        <div className="bg-white/3 rounded-xl border border-white/8 p-5 space-y-4">
          <h3 className="text-gray-700 text-sm font-semibold">Scan Document</h3>
          <div className="space-y-3">
            <div>
              <label className="text-gray-600 text-xs mb-1.5 block">Document Type</label>
              <select className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all">
                <option>Single Page</option>
                <option>Multi-Page Document</option>
                <option>Photo</option>
                <option>ID Card (Both Sides)</option>
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-xs mb-1.5 block">Resolution</label>
              <select className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all">
                <option>300 DPI (Standard)</option>
                <option>600 DPI (High Quality)</option>
                <option>150 DPI (Draft)</option>
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-xs mb-1.5 block">Output Format</label>
              <select className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all">
                <option>PDF</option>
                <option>JPEG</option>
                <option>PNG</option>
                <option>TIFF</option>
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-xs mb-1.5 block">Customer Name</label>
              <input placeholder="Enter customer name" className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-white/25 focus:outline-none focus:border-yellow-500/50 transition-all" />
            </div>
          </div>
          <button
            onClick={handleStartScan}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Scanning Document...</>
            ) : (
              <><ScanLine className="w-5 h-5" /> Start Scanning</>
            )}
          </button>
        </div>

        {/* Preview Area */}
        <div className="bg-white/3 rounded-xl border border-white/8 p-5 flex flex-col">
          <h3 className="text-gray-700 text-sm font-semibold mb-4">Scan Preview</h3>
          <div className="flex-1 flex items-center justify-center min-h-48 bg-white/2 rounded-xl border border-dashed border-white/10">
            {scanned ? (
              <div className="text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
                <p className="text-text-primary text-sm font-medium">Scanned_Document_Preview.pdf</p>
                <p className="text-green-400 text-xs">Ready to save or export</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Image className="w-10 h-10 text-text-secondary mx-auto" />
                <p className="text-text-secondary text-sm">Scan preview will appear here</p>
                <p className="text-text-secondary/50 text-xs">Place document on scanner bed and press Start</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              disabled={!scanned}
              onClick={() => showNotice("PDF saved to local storage.")}
              className="flex-1 py-2 bg-surface-card hover:bg-white/5 text-text-primary rounded-lg text-xs border border-white/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" /> Save as PDF
            </button>
            <button
              disabled={!scanned}
              onClick={() => showNotice("Document successfully added to Digital File Vault.")}
              className="flex-1 py-2 bg-surface-card hover:bg-white/5 text-text-primary rounded-lg text-xs border border-white/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" /> Save to Vault
            </button>
          </div>
        </div>
      </div>

      {/* Scanning Services & Pricing */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-5">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3">Scanning Services & Pricing</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { service: 'Single Page (B&W)', price: '10' },
            { service: 'Single Page (Color)', price: '20' },
            { service: 'ID Card (Both sides)', price: '30' },
            { service: 'Per Photo Scan', price: '20' },
          ].map(s => (
            <div key={s.service} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-600">{s.service}</span>
              <span className="text-xs text-yellow-400 font-semibold">KES {s.price}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-gray-600 text-xs leading-relaxed">
          For full scanner integration with automatic scanning, OCR, and direct file saving, connect your scanner hardware. This interface supports SANE (Linux) and Dynamic Web TWAIN protocols. Current preview shows scanner control panel.
        </p>
      </div>

      {/* Recent Scans */}
      <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8">
          <h3 className="text-gray-700 text-sm font-semibold">Recent Scans</h3>
        </div>
        <div className="divide-y divide-white/5">
          {[
            { name: 'National_ID_Grace.pdf', customer: 'Grace Njeri', time: '10:32 AM', pages: 1, type: 'ID Card' },
            { name: 'Certificate_Peter.pdf', customer: 'Peter Mwangi', time: '09:15 AM', pages: 2, type: 'Document' },
            { name: 'Receipt_John.jpg', customer: 'John Kamau', time: '08:50 AM', pages: 1, type: 'Photo' },
          ].map((scan, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <ScanLine className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-700 font-medium truncate">{scan.name}</div>
                <div className="text-[10px] text-gray-600">{scan.customer} · {scan.type} · {scan.pages}p</div>
              </div>
              <div className="flex items-center gap-2 mr-2">
                <button className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors" title="Save File">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                <button className="p-1.5 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors" title="Send to Printing">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </button>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-600">{scan.time}</div>
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] text-green-400">Done</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
