import { useState } from 'react';
import { ScanLine, Upload, FileText, Image, CheckCircle, Info, Download, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function ScannerView() {
  const store = useAppStore();
  const [isScanning, setIsScanning] = useState(false);
  const [docType, setDocType] = useState('National ID Card');
  const [resolution, setResolution] = useState('300 DPI (Standard)');
  const [customerName, setCustomerName] = useState('John Kamau');
  const [scannedDoc, setScannedDoc] = useState<{ name: string; customer: string; time: string; pages: number; type: string } | null>(null);
  const [history, setHistory] = useState([
    { name: 'National_ID_Grace.pdf', customer: 'Grace Njeri', time: '10:32 AM', pages: 1, type: 'ID Card' },
    { name: 'Certificate_Peter.pdf', customer: 'Peter Mwangi', time: '09:15 AM', pages: 2, type: 'Document' },
    { name: 'Receipt_John.jpg', customer: 'John Kamau', time: '08:50 AM', pages: 1, type: 'Photo' },
  ]);

  const handleStartScan = () => {
    setIsScanning(true);
    setScannedDoc(null);
    setTimeout(() => {
      const docName = `Scan_${docType.replace(/\s+/g, '_')}_${customerName.replace(/\s+/g, '_')}.pdf`;
      const newScan = {
        name: docName,
        customer: customerName || 'Walk-in Customer',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pages: 1,
        type: docType,
      };
      setScannedDoc(newScan);
      setHistory(prev => [newScan, ...prev]);
      setIsScanning(false);
    }, 1500);
  };

  const handleSaveToVault = () => {
    if (!scannedDoc) return;
    store.addDocument({
      name: scannedDoc.name,
      type: 'PDF',
      size: '380 KB',
      customerName: scannedDoc.customer,
      category: 'id',
    });
    alert(`Successfully saved ${scannedDoc.name} to Digital File Vault!`);
  };

  const handleDownloadPdf = () => {
    if (!scannedDoc) return;
    const blob = new Blob([`# Scanned Document: ${scannedDoc.name}\nCustomer: ${scannedDoc.customer}\nResolution: ${resolution}\nType: ${docType}\n\n[OCR EXTRACTED TEXT]\nREPUBLIC OF KENYA - NATIONAL IDENTIFICATION / OFFICIAL RECORD`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = scannedDoc.name;
    a.click();
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-bg p-5 space-y-5">
      <h2 className="text-text-primary font-semibold flex items-center gap-2">
        <ScanLine className="w-4 h-4 text-yellow-400" /> Scanner Center
      </h2>

      {/* Status */}
      <div className="flex items-center gap-3 p-4 bg-green-500/8 border border-green-300 rounded-xl">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <div>
          <div className="text-green-400 text-sm font-medium">Scanner Ready (SANE / Dynamic Web TWAIN Online)</div>
          <div className="text-gray-600 text-xs">Connected via USB — EPSON L3210 Series · OCR Engine Enabled</div>
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
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all"
              >
                <option>National ID Card</option>
                <option>Single Page Document</option>
                <option>Multi-Page Document</option>
                <option>Photo</option>
                <option>KRA / Government Certificate</option>
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-xs mb-1.5 block">Resolution</label>
              <select
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all"
              >
                <option>300 DPI (Standard)</option>
                <option>600 DPI (High Quality)</option>
                <option>150 DPI (Draft)</option>
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-xs mb-1.5 block">Output Format</label>
              <select className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all">
                <option>PDF (with OCR)</option>
                <option>JPEG</option>
                <option>PNG</option>
                <option>TIFF</option>
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-xs mb-1.5 block">Customer Name</label>
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-white/25 focus:outline-none focus:border-yellow-500/50 transition-all"
              />
            </div>
          </div>
          <button
            onClick={handleStartScan}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg shadow-yellow-500/20"
          >
            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
            {isScanning ? 'Scanning Document Bed...' : 'Start Scanning'}
          </button>
        </div>

        {/* Preview Area */}
        <div className="bg-white/3 rounded-xl border border-white/8 p-5 flex flex-col">
          <h3 className="text-gray-700 text-sm font-semibold mb-4">Scan Preview & OCR Output</h3>
          <div className="flex-1 flex items-center justify-center min-h-48 bg-white/2 rounded-xl border border-dashed border-gray-200 p-4 relative overflow-hidden">
            {isScanning ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-1 bg-yellow-400 animate-bounce mx-auto rounded-full shadow-lg shadow-yellow-400/50" />
                <p className="text-yellow-400 text-sm font-semibold">Scanning {docType} at {resolution}...</p>
                <p className="text-gray-600 text-xs">Performing OCR and automatic enhancement</p>
              </div>
            ) : scannedDoc ? (
              <div className="text-center space-y-3 w-full">
                <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center mx-auto text-green-400">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">{scannedDoc.name}</div>
                  <div className="text-xs text-gray-600 mt-1">OCR Text Extracted · Ready for Export</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-left text-xs text-gray-700 font-mono">
                  <div>[OCR SNIPPET]</div>
                  <div>REPUBLIC OF KENYA - NATIONAL RECORD</div>
                  <div>Customer: {scannedDoc.customer}</div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Image className="w-10 h-10 text-text-primary/10 mx-auto" />
                <p className="text-gray-600 text-sm">Scan preview will appear here</p>
                <p className="text-text-primary/20 text-xs">Place document on scanner bed and press Start</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleDownloadPdf}
              disabled={!scannedDoc}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 rounded-lg text-xs border border-gray-200 transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Save as PDF
            </button>
            <button
              onClick={handleSaveToVault}
              disabled={!scannedDoc}
              className="flex-1 py-2 bg-brand-primary hover:bg-brand-secondary disabled:opacity-50 text-white rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 font-medium shadow-md"
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
          {history.map((scan, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <ScanLine className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-700 font-medium truncate">{scan.name}</div>
                <div className="text-[10px] text-gray-600">{scan.customer} · {scan.type} · {scan.pages}p</div>
              </div>
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={() => {
                    const blob = new Blob([`# Scanned Document: ${scan.name}\nCustomer: ${scan.customer}\nType: ${scan.type}`], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = scan.name;
                    a.click();
                  }}
                  className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                  title="Save File"
                >
                  <Download className="w-4 h-4" />
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