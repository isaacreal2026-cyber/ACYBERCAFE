import { useState } from 'react';
import { Briefcase, Plus, Clock, CheckCircle, X, Search, ChevronDown, AlertCircle } from 'lucide-react';
import { ServiceTicket, ServiceStatus, Customer } from '../types';
import { cn } from '../utils/cn';

interface ServicesViewProps {
  serviceTickets: ServiceTicket[];
  customers: Customer[];
  addServiceTicket: (t: Omit<ServiceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'queuePosition'>) => ServiceTicket;
  updateTicketStatus: (id: string, status: ServiceStatus) => void;
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bg: string; border: string }> = {
  waiting: { label: 'Waiting', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  processing: { label: 'Processing', color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary', border: 'border-brand-primary/20' },
  review: { label: 'Review', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-brand-accent' },
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-300' },
  delivered: { label: 'Delivered', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
};

const SERVICE_TYPES = [
  'CV Creation', 'Cover Letter', 'KRA Nil Returns', 'KRA PIN Registration', 'eCitizen Application',
  'NTSA Services', 'Printing', 'Scanning', 'Passport Photo', 'Document Typing', 'Research Assistance',
  'Design/Poster', 'Email Setup', 'Other'
];

const STATUS_ORDER: ServiceStatus[] = ['waiting', 'processing', 'review', 'completed', 'delivered'];

export default function ServicesView({ serviceTickets, customers, addServiceTicket, updateTicketStatus }: ServicesViewProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ServiceStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerName: '', customerId: '', serviceType: 'CV Creation', description: '', amount: '', assignedTo: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = serviceTickets.filter(t => {
    const matchSearch = t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.serviceType.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const groupedByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filtered.filter(t => t.status === status);
    return acc;
  }, {} as Record<ServiceStatus, ServiceTicket[]>);

  const handleCancel = () => {
    setForm({ customerName: '', customerId: '', serviceType: 'CV Creation', description: '', amount: '', assignedTo: '' });
    setCustomerSearch('');
    setError('');
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!form.customerName.trim() || !form.serviceType.trim()) {
      setError('Please provide a Customer Name and Service Type.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await addServiceTicket({
        customerId: form.customerId, customerName: form.customerName,
        serviceType: form.serviceType, description: form.description,
        status: 'waiting', amount: Number(form.amount) || 0, assignedTo: form.assignedTo,
      });
      handleCancel();
    } catch (e) {
      setError('Failed to create ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStatus: Record<ServiceStatus, ServiceStatus | null> = {
    waiting: 'processing', processing: 'review', review: 'completed', completed: 'delivered', delivered: null
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 5);

  return (
    <div className="h-full flex flex-col bg-surface-bg overflow-hidden">
      {/* Top Bar */}
      <div className="p-4 border-b border-white/8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary font-semibold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand-primary" /> Service Queue
          </h2>
          <button
            onClick={() => { setError(''); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white hover:bg-brand-primary/90 text-xs rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="w-full bg-surface-card border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-brand-primary/50 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as ServiceStatus | 'all')}
              className="appearance-none bg-surface-card border border-white/10 rounded-lg pl-3 pr-7 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary/50 transition-all cursor-pointer"
            >
              <option value="all" className="bg-surface-card text-text-primary">All Status</option>
              {STATUS_ORDER.map(s => <option key={s} value={s} className="bg-surface-card text-text-primary">{STATUS_CONFIG[s].label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary pointer-events-none" />
          </div>
        </div>
        {/* Status counters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_ORDER.map(s => {
            const count = serviceTickets.filter(t => t.status === s).length;
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all flex-shrink-0', cfg.bg, cfg.border, cfg.color, filterStatus === s && 'ring-1 ring-brand-primary/50')}
              >
                {count > 0 && s === 'waiting' && <AlertCircle className="w-3 h-3" />}
                {s === 'completed' || s === 'delivered' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                <span>{cfg.label}</span>
                <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban/List */}
      <div className="flex-1 overflow-auto p-4">
        {filterStatus === 'all' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 h-full">
            {STATUS_ORDER.map(status => {
              const tickets = groupedByStatus[status];
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className="flex flex-col gap-2 min-w-[180px]">
                  <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold', cfg.bg, cfg.color)}>
                    <span>{cfg.label}</span>
                    <span className="ml-auto font-bold">{tickets.length}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {tickets.map(ticket => (
                      <TicketCard key={ticket.id} ticket={ticket} nextStatus={nextStatus} updateTicketStatus={updateTicketStatus} />
                    ))}
                    {tickets.length === 0 && (
                      <div className="text-center py-6 text-text-primary/20 text-xs border border-gray-100 rounded-lg border-dashed">Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} nextStatus={nextStatus} updateTicketStatus={updateTicketStatus} fullWidth />
            ))}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-text-secondary text-sm">No tickets found</div>
            )}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-brand-primary/20 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h3 className="text-text-primary font-bold flex items-center gap-2"><Briefcase className="w-4 h-4 text-brand-primary" /> New Service Ticket</h3>
              <button onClick={handleCancel}><X className="w-5 h-5 text-text-secondary hover:text-text-primary" /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
              {/* Customer */}
              <div>
                <label className="text-text-secondary text-xs mb-1 block">Customer Name *</label>
                <div className="relative">
                  <input
                    value={form.customerName}
                    onChange={e => { setForm(p => ({ ...p, customerName: e.target.value, customerId: '' })); setCustomerSearch(e.target.value); }}
                    placeholder="Type customer name..."
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-brand-primary/50 transition-all"
                  />
                  {customerSearch && filteredCustomers.length > 0 && !form.customerId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-white/10 rounded-lg overflow-hidden z-10">
                      {filteredCustomers.map(c => (
                        <button key={c.id} onClick={() => { setForm(p => ({ ...p, customerName: c.name, customerId: c.id })); setCustomerSearch(''); }}
                          className="w-full px-3 py-2 text-xs text-left text-text-primary hover:bg-white/5 transition-colors">
                          {c.name} — {c.phone}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">Service Type *</label>
                <select
                  value={form.serviceType}
                  onChange={e => setForm(p => ({ ...p, serviceType: e.target.value }))}
                  className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 transition-all"
                >
                  {SERVICE_TYPES.map(s => <option key={s} value={s} className="bg-surface-card text-text-primary">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Details about this service..." rows={2}
                  className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-brand-primary/50 transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">Amount (KES)</label>
                  <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    type="number" placeholder="0"
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-brand-primary/50 transition-all" />
                </div>
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">Assigned To</label>
                  <input value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                    placeholder="Staff name"
                    className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-brand-primary/50 transition-all" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={handleCancel} className="flex-1 py-2 border border-white/10 text-text-secondary hover:text-text-primary rounded-lg text-sm hover:bg-white/5 transition-all">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-brand-primary text-white hover:bg-brand-primary/90 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, nextStatus, updateTicketStatus, fullWidth = false }: {
  ticket: ServiceTicket;
  nextStatus: Record<ServiceStatus, ServiceStatus | null>;
  updateTicketStatus: (id: string, status: ServiceStatus) => void;
  fullWidth?: boolean;
}) {
  const cfg = STATUS_CONFIG[ticket.status];
  const next = nextStatus[ticket.status];
  return (
    <div className={cn('bg-white/3 border border-white/8 rounded-xl p-3 space-y-2 hover:border-white/15 transition-all', fullWidth && 'flex items-center gap-4')}>
      <div className={cn(fullWidth ? 'flex-1' : '')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] text-text-secondary font-mono">{ticket.ticketNumber}</div>
            <div className="text-xs text-text-primary font-medium mt-0.5">{ticket.customerName}</div>
            <div className="text-[10px] text-text-secondary mt-0.5">{ticket.serviceType}</div>
          </div>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', cfg.color, cfg.bg)}>{cfg.label}</span>
        </div>
        {ticket.description && !fullWidth && (
          <p className="text-[10px] text-text-secondary mt-1 line-clamp-2">{ticket.description}</p>
        )}
      </div>
      <div className={cn('flex items-center justify-between gap-2', fullWidth && 'flex-shrink-0')}>
        {ticket.amount > 0 && <span className="text-xs text-green-400 font-medium">KES {ticket.amount}</span>}
        {next && (
          <button
            onClick={() => updateTicketStatus(ticket.id, next)}
            className="text-[10px] px-2 py-1 bg-brand-primary text-white hover:bg-brand-primary/90 rounded-lg transition-all"
          >
            → {STATUS_CONFIG[next].label}
          </button>
        )}
      </div>
    </div>
  );
}
