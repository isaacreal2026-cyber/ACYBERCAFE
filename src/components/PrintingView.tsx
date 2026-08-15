import { useState } from 'react';
import { Printer, Upload, Plus, CheckCircle, Clock, X, DollarSign } from 'lucide-react';
import { PrintJob } from '../types';
import { cn } from '../utils/cn';

interface PrintingViewProps {
  printJobs: PrintJob[];
  addPrintJob: (job: Omit<PrintJob, 'id' | 'createdAt' | 'status'>) => PrintJob;
}

const PRICE_BW = 5;
const PRICE_COLOR = 20;

export default function PrintingView({ printJobs, addPrintJob }: PrintingViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fileName: '', pages: '1', copies: '1', colorMode: 'black-white' as 'black-white' | 'color', paperSize: 'A4', customerName: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pagesNum = Math.max(1, Number(form.pages) || 1);
  const copiesNum = Math.max(1, Number(form.copies) || 1);
  const cost = pagesNum * copiesNum * (form.colorMode === 'color' ? PRICE_COLOR : PRICE_BW);

  const handleCancel = () => {
    setForm({ fileName: '', pages: '1', copies: '1', colorMode: 'black-white', paperSize: 'A4', customerName: '' });
    setError('');
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!form.fileName.trim() || !form.customerName.trim()) {
      setError('Please provide both File Name and Customer Name.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await addPrintJob({
        fileName: form.fileName, pages: pagesNum,
        copies: copiesNum, colorMode: form.colorMode,
        paperSize: form.paperSize, customerName: form.customerName, cost,
      });
      handleCancel();
    } catch (e) {
      setError('Failed to add print job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const queued = printJobs.filter(j => j.status === 'queued');
  const printing = printJobs.filter(j => j.status === 'printing');
  const completed = printJobs.filter(j => j.status === 'completed');

  return (
    <div className="h-full flex flex-col bg-surface-bg overflow-hidden">
      <div className="p-4 border-b border-white/8 flex items-center justify-between">
        <h2 className="text-text-primary font-semibold flex items-center gap-2">
          <Printer className="w-4 h-4 text-orange-400" /> Printing Center
        </h2>
        <button onClick={() => { setError(''); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-lg transition-all">
          <Plus className="w-3.5 h-3.5" /> New Print Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/8">
        {[
          { label: 'Queued', count: queued.length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Printing', count: printing.length, icon: Printer, color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary', border: 'border-brand-primary/20' },
          { label: 'Completed', count: completed.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-300' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('flex items-center gap-3 p-3 rounded-xl border', s.bg, s.border)}>
              <Icon className={cn('w-5 h-5', s.color)} />
              <div>
                <div className={cn('text-xl font-bold', s.color)}>{s.count}</div>
                <div className="text-text-secondary text-xs">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Price Guide */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-4 text-xs">
        <span className="text-text-secondary flex items-center gap-1"><DollarSign className="w-3 h-3 text-brand-primary" />Price guide:</span>
        <span className="text-text-secondary bg-surface-card border border-white/10 px-2 py-0.5 rounded">B&W: KES {PRICE_BW}/page</span>
        <span className="text-text-secondary bg-surface-card border border-white/10 px-2 py-0.5 rounded">Color: KES {PRICE_COLOR}/page</span>
      </div>

      {/* Jobs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {printJobs.length === 0 && <div className="py-16 text-center text-text-secondary text-sm">No print jobs yet</div>}
        {printJobs.map(job => (
          <div key={job.id} className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-center gap-4 hover:border-white/15 transition-all">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              job.status === 'printing' ? 'bg-brand-primary/10 text-brand-primary' : job.status === 'queued' ? 'bg-amber-500/10' : 'bg-green-500/10')}>
              <Printer className={cn('w-5 h-5',
                job.status === 'printing' ? 'text-brand-primary' : job.status === 'queued' ? 'text-amber-400' : 'text-green-400')} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary font-medium truncate">{job.fileName}</div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] text-text-secondary">{job.customerName}</span>
                <span className="text-[10px] text-text-secondary">{job.pages}p × {job.copies} copies</span>
                <span className="text-[10px] text-text-secondary">{job.colorMode === 'color' ? 'Color' : 'B&W'}</span>
                <span className="text-[10px] text-text-secondary">{job.paperSize}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm text-green-400 font-semibold">KES {job.cost}</div>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                job.status === 'printing' ? 'bg-brand-primary/10 text-brand-primary text-brand-primary' :
                  job.status === 'queued' ? 'bg-amber-500/10 text-amber-400' :
                    job.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-green-500/10 text-green-400')}>
                {job.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* New Print Job Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-orange-500/30 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h3 className="text-text-primary font-bold flex items-center gap-2"><Upload className="w-4 h-4 text-orange-400" /> New Print Job</h3>
              <button onClick={handleCancel}><X className="w-5 h-5 text-text-secondary hover:text-text-primary" /></button>
            </div>
            <div className="p-5 space-y-3">
              {error && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label className="text-text-secondary text-xs mb-1 block">File Name *</label>
                <input value={form.fileName} onChange={e => setForm(p => ({ ...p, fileName: e.target.value }))}
                  placeholder="e.g. CV_John_Kamau.pdf"
                  className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-orange-500/50 transition-all" />
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">Customer Name *</label>
                <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                  placeholder="Customer name"
                  className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-orange-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">Pages</label>
                  <input value={form.pages} onChange={e => setForm(p => ({ ...p, pages: e.target.value }))} type="number" min="1"
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-orange-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">Copies</label>
                  <input value={form.copies} onChange={e => setForm(p => ({ ...p, copies: e.target.value }))} type="number" min="1"
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-orange-500/50 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">Print Mode</label>
                  <select value={form.colorMode} onChange={e => setForm(p => ({ ...p, colorMode: e.target.value as any }))}
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-orange-500/50 transition-all">
                    <option value="black-white" className="bg-surface-card text-text-primary">Black & White</option>
                    <option value="color" className="bg-surface-card text-text-primary">Color</option>
                  </select>
                </div>
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">Paper Size</label>
                  <select value={form.paperSize} onChange={e => setForm(p => ({ ...p, paperSize: e.target.value }))}
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-orange-500/50 transition-all">
                    <option className="bg-surface-card text-text-primary">A4</option>
                    <option className="bg-surface-card text-text-primary">A3</option>
                    <option className="bg-surface-card text-text-primary">Letter</option>
                    <option className="bg-surface-card text-text-primary">Legal</option>
                  </select>
                </div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-center justify-between">
                <span className="text-text-secondary text-sm">Estimated Cost</span>
                <span className="text-orange-400 font-bold text-lg">KES {cost}</span>
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={handleCancel} className="flex-1 py-2 border border-white/10 text-text-secondary hover:text-text-primary rounded-lg text-sm hover:bg-white/5 transition-all">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-3.5 h-3.5" />
                {isSubmitting ? 'Adding...' : 'Add to Queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
