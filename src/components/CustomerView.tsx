import { useState } from 'react';
import { Users, Plus, Search, Phone, Mail, CreditCard, Calendar, ChevronRight, X, User } from 'lucide-react';
import { Customer } from '../types';
import { cn } from '../utils/cn';

interface CustomerViewProps {
  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'totalVisits'>) => void;
}

export default function CustomerView({ customers, addCustomer }: CustomerViewProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', nationalId: '', notes: '' });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.nationalId.includes(search)
  );

  const handleAdd = () => {
    if (!form.name || !form.phone) return;
    addCustomer(form);
    setForm({ name: '', phone: '', email: '', nationalId: '', notes: '' });
    setShowForm(false);
  };

  return (
    <div className="h-full flex bg-surface-bg overflow-hidden">
      {/* List Panel */}
      <div className={cn('flex flex-col border-r border-white/8 transition-all', selected ? 'w-72 flex-shrink-0' : 'flex-1')}>
        <div className="p-4 border-b border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-text-primary font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-primary" /> Customers
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{customers.length}</span>
            </h2>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white hover:bg-brand-primary text-white text-text-primary text-xs rounded-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Customer
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, ID..."
              className="w-full bg-gray-100 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-700 placeholder-white/25 focus:outline-none focus:border-brand-primary/50 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left',
                selected?.id === c.id && 'bg-brand-primary text-white/8 border-r-2 border-r-cyan-500'
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-primary text-xs font-bold">{c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 font-medium truncate">{c.name}</div>
                <div className="text-xs text-gray-600 truncate">{c.phone}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-green-400 font-medium">KES {c.totalSpent.toLocaleString()}</div>
                <div className="text-[10px] text-gray-600">{c.totalVisits} visits</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-primary/20 flex-shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-600 text-sm">No customers found</div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-brand-primary/20 flex items-center justify-center">
                <span className="text-brand-primary text-lg font-bold">{selected.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              </div>
              <div>
                <h2 className="text-text-primary text-lg font-bold">{selected.name}</h2>
                <p className="text-gray-600 text-sm">Member since {selected.createdAt.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-700 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-white/3 rounded-xl border border-white/8 p-4 space-y-3">
              <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Contact Info</h3>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-gray-700">{selected.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-gray-700">{selected.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-gray-700">{selected.nationalId || '—'}</span>
              </div>
            </div>
            <div className="bg-white/3 rounded-xl border border-white/8 p-4 space-y-3">
              <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider">Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-300">
                  <div className="text-green-400 text-lg font-bold">KES {selected.totalSpent.toLocaleString()}</div>
                  <div className="text-gray-600 text-[10px]">Total Spent</div>
                </div>
                <div className="bg-brand-primary/10 text-brand-primary rounded-lg p-3 border border-brand-primary/20">
                  <div className="text-brand-primary text-lg font-bold">{selected.totalVisits}</div>
                  <div className="text-gray-600 text-[10px]">Total Visits</div>
                </div>
              </div>
            </div>
          </div>

          {selected.notes && (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
              <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-gray-600 text-sm">{selected.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Add Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-brand-primary/20 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h3 className="text-text-primary font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-brand-primary" /> New Customer
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'e.g. John Kamau' },
                { label: 'Phone *', key: 'phone', placeholder: '+254 7XX XXX XXX' },
                { label: 'Email', key: 'email', placeholder: 'email@example.com' },
                { label: 'National ID', key: 'nationalId', placeholder: '12345678' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-gray-600 text-xs mb-1 block">{field.label}</label>
                  <input
                    value={(form as any)[field.key]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-white/25 focus:outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="text-gray-600 text-xs mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes about this customer..."
                  rows={2}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-white/25 focus:outline-none focus:border-brand-primary/50 transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-all">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-brand-primary text-white hover:bg-brand-primary text-white text-text-primary rounded-lg text-sm font-medium transition-all">
                <Calendar className="w-3.5 h-3.5 inline mr-1.5" /> Add Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
