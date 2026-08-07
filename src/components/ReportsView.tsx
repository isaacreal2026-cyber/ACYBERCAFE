import { BarChart3, TrendingUp, Users, Printer, DollarSign, Award } from 'lucide-react';
import { ServiceTicket, Transaction, Customer } from '../types';
import { cn } from '../utils/cn';

interface ReportsViewProps {
  serviceTickets: ServiceTicket[];
  transactions: Transaction[];
  customers: Customer[];
  todayRevenue: number;
}

export default function ReportsView({ serviceTickets, transactions, customers, todayRevenue }: ReportsViewProps) {
  const totalRevenue = transactions.reduce((s, t) => s + t.amount, 0);
  const completedServices = serviceTickets.filter(t => t.status === 'completed' || t.status === 'delivered').length;

  const byService = transactions.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const topService = Object.entries(byService).sort((a, b) => b[1] - a[1])[0];

  const serviceTypeCounts = serviceTickets.reduce((acc, t) => {
    acc[t.serviceType] = (acc[t.serviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedServices = Object.entries(serviceTypeCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedServices[0]?.[1] || 1;

  const kpis = [
    { label: 'Total Revenue', value: `KES ${totalRevenue.toLocaleString()}`, sub: 'All time', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-300' },
    { label: "Today's Revenue", value: `KES ${todayRevenue.toLocaleString()}`, sub: 'Today', icon: TrendingUp, color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary', border: 'border-brand-primary/20' },
    { label: 'Total Customers', value: customers.length, sub: 'Registered', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { label: 'Completed Services', value: completedServices, sub: 'All time', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Total Transactions', value: transactions.length, sub: 'Recorded', icon: Printer, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-300' },
    { label: 'Top Service', value: topService ? topService[0] : '—', sub: topService ? `KES ${topService[1]}` : 'No data', icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-surface-bg p-5 space-y-5">
      <h2 className="text-text-primary font-semibold flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-400" /> Reports & Analytics
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className={cn('p-3 rounded-xl border', k.bg, k.border)}>
              <Icon className={cn('w-4 h-4 mb-2', k.color)} />
              <div className={cn('text-lg font-bold leading-tight', k.color)}>{k.value}</div>
              <div className="text-gray-600 text-[10px] mt-0.5">{k.label}</div>
              <div className="text-text-primary/25 text-[9px]">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Service Frequency */}
        <div className="bg-white/3 rounded-xl border border-white/8 p-4">
          <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Most Requested Services
          </h3>
          <div className="space-y-3">
            {sortedServices.slice(0, 7).map(([service, count]) => (
              <div key={service}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-700">{service}</span>
                  <span className="text-xs text-gray-600 font-semibold">{count}x</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
            {sortedServices.length === 0 && <p className="text-text-primary/25 text-xs text-center py-6">No service data yet</p>}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white/3 rounded-xl border border-white/8 p-4">
          <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" /> Revenue Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([service, amount]) => {
              const maxAmt = Math.max(...Object.values(byService), 1);
              return (
                <div key={service}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 truncate flex-1">{service}</span>
                    <span className="text-xs text-green-400 font-semibold ml-2">KES {amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                      style={{ width: `${(amount / maxAmt) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(byService).length === 0 && <p className="text-text-primary/25 text-xs text-center py-6">No revenue data yet</p>}
          </div>
        </div>
      </div>

      {/* Customer Stats */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-4">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-violet-400" /> Top Customers by Spending
        </h3>
        <div className="space-y-2">
          {customers.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-2.5 bg-white/2 rounded-lg">
              <span className="text-xs text-text-primary/20 w-4 text-center">{i + 1}</span>
              <div className="w-7 h-7 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-primary text-[10px] font-bold">{c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-700 font-medium">{c.name}</div>
                <div className="text-[10px] text-gray-600">{c.totalVisits} visits</div>
              </div>
              <div className="text-xs text-green-400 font-semibold flex-shrink-0">KES {c.totalSpent.toLocaleString()}</div>
            </div>
          ))}
          {customers.length === 0 && <p className="text-text-primary/25 text-xs text-center py-6">No customer data yet</p>}
        </div>
      </div>
    </div>
  );
}
