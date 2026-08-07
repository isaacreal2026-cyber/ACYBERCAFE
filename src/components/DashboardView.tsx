import { Users, Briefcase, Printer, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Zap, ArrowRight, Activity, ScanLine, Building2, FileText } from 'lucide-react';
import { ServiceTicket, PrintJob, Transaction, Notification } from '../types';
import { cn } from '../utils/cn';

interface DashboardViewProps {
  waitingTickets: number;
  activeJobs: number;
  todayRevenue: number;
  serviceTickets: ServiceTicket[];
  printJobs: PrintJob[];
  transactions: Transaction[];
  notifications: Notification[];
  setActiveCategory: (cat: any) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  waiting: { label: 'Waiting', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  processing: { label: 'Processing', color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary' },
  review: { label: 'Review', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/10' },
  delivered: { label: 'Delivered', color: 'text-violet-400', bg: 'bg-violet-500/10' },
};

export default function DashboardView({
  waitingTickets, activeJobs, todayRevenue, serviceTickets, printJobs, transactions, notifications, setActiveCategory
}: DashboardViewProps) {
  const completedToday = serviceTickets.filter(t => t.status === 'completed' || t.status === 'delivered').length;
  const printingJobs = printJobs.filter(p => p.status === 'printing' || p.status === 'queued').length;
  const unreadAlerts = notifications.filter(n => !n.read && n.type !== 'info').length;

  const stats = [
    { label: 'Customers Waiting', value: waitingTickets, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', action: () => setActiveCategory('services') },
    { label: 'Active Jobs', value: activeJobs, icon: Activity, color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary', border: 'border-brand-primary/20', action: () => setActiveCategory('services') },
    { label: 'Print Queue', value: printingJobs, icon: Printer, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-300', action: () => setActiveCategory('printing') },
    { label: "Today's Revenue", value: `KES ${todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-300', action: () => setActiveCategory('finance') },
    { label: 'Completed Today', value: completedToday, icon: CheckCircle, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', action: () => setActiveCategory('services') },
    { label: 'Alerts', value: unreadAlerts, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', action: () => setActiveCategory('notifications') },
  ];

  const quickActions = [
    { label: 'New Service', icon: Briefcase, color: 'bg-brand-primary text-white hover:bg-brand-primary text-white', action: () => setActiveCategory('services') },
    { label: 'Print Job', icon: Printer, color: 'bg-orange-600 hover:bg-orange-500', action: () => setActiveCategory('printing') },
    { label: 'KRA Services', icon: Building2, color: 'bg-emerald-600 hover:bg-emerald-500', action: () => setActiveCategory('government') },
    { label: 'AI Chat', icon: Zap, color: 'bg-violet-600 hover:bg-violet-500', action: () => setActiveCategory('ai-chat') },
    { label: 'Scan Document', icon: ScanLine, color: 'bg-yellow-600 hover:bg-yellow-500', action: () => setActiveCategory('scanner') },
    { label: 'File Vault', icon: FileText, color: 'bg-blue-600 hover:bg-blue-500', action: () => setActiveCategory('documents') },
  ];

  const recentTickets = serviceTickets.slice(0, 6);

  return (
    <div className="h-full overflow-y-auto bg-surface-bg p-5 space-y-5">
      {/* Header Banner */}
      <div className="relative rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border border-brand-primary/20 p-4 overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full opacity-5">
          <div className="absolute inset-0 bg-gradient-to-l from-cyan-400 to-transparent" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-primary/30">
              <Zap className="w-5 h-5 text-text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-text-primary font-bold text-lg truncate">CyberPlus Operations Center</h1>
              <p className="text-gray-600 text-xs flex items-center gap-1.5 mt-0.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse flex-shrink-0" />
                <span className="truncate">System Online — {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center shadow-sm">
              <Clock className="w-3 h-3 mr-1.5 text-brand-primary flex-shrink-0" />
              {new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <button
              key={i}
              onClick={stat.action}
              className={cn(
                'p-3 rounded-xl border transition-all text-left hover:scale-[1.02] active:scale-[0.98] group',
                stat.bg, stat.border, 'hover:border-opacity-50'
              )}
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', stat.bg)}>
                <Icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <div className={cn('text-xl font-bold', stat.color)}>{stat.value}</div>
              <div className="text-gray-600 text-[10px] mt-0.5 leading-tight">{stat.label}</div>
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-gray-600 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap className="w-3 h-3 text-brand-primary" /> Quick Launch
        </h2>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-2">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={action.action}
                className={cn(
                  'flex flex-col items-center gap-2 py-3 px-2 rounded-xl text-text-primary text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97] shadow-lg',
                  action.color
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-center leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Service Queue */}
        <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <h3 className="text-gray-800 text-sm font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand-primary" /> Service Queue
            </h3>
            <button onClick={() => setActiveCategory('services')} className="text-brand-primary text-xs hover:text-brand-primary flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {recentTickets.length === 0 ? (
              <div className="py-8 text-center text-gray-600 text-sm">No service tickets</div>
            ) : (
              recentTickets.map(ticket => {
                const s = STATUS_CONFIG[ticket.status];
                return (
                  <div key={ticket.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors">
                    <div className="text-[10px] text-gray-600 font-mono w-12 flex-shrink-0">{ticket.ticketNumber}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-800 font-medium truncate">{ticket.customerName}</div>
                      <div className="text-[10px] text-gray-600 truncate">{ticket.serviceType}</div>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', s.color, s.bg)}>{s.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <h3 className="text-gray-800 text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" /> Recent Revenue
            </h3>
            <button onClick={() => setActiveCategory('finance')} className="text-brand-primary text-xs hover:text-brand-primary flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {transactions.slice(0, 6).map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-800 font-medium truncate">{tx.customerName}</div>
                  <div className="text-[10px] text-gray-600 truncate">{tx.type}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-green-400 font-semibold">+KES {tx.amount}</div>
                  <div className="text-[10px] text-gray-600 capitalize">{tx.paymentMethod}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print Queue + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <h3 className="text-gray-800 text-sm font-semibold flex items-center gap-2">
              <Printer className="w-4 h-4 text-orange-400" /> Print Queue
            </h3>
            <button onClick={() => setActiveCategory('printing')} className="text-brand-primary text-xs hover:text-brand-primary flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {printJobs.slice(0, 4).map(job => (
              <div key={job.id} className="flex items-center gap-3 px-4 py-2.5">
                <Printer className="w-3.5 h-3.5 text-text-primary/20 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-800 truncate">{job.fileName}</div>
                  <div className="text-[10px] text-gray-600">{job.pages}p × {job.copies} — {job.colorMode === 'color' ? 'Color' : 'B&W'}</div>
                </div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                  job.status === 'printing' ? 'bg-brand-primary/10 text-brand-primary text-brand-primary' :
                    job.status === 'queued' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-green-500/10 text-green-400'
                )}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <h3 className="text-gray-800 text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" /> Notifications
            </h3>
            <button onClick={() => setActiveCategory('notifications')} className="text-brand-primary text-xs hover:text-brand-primary flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {notifications.slice(0, 4).map(n => (
              <div key={n.id} className={cn('flex items-start gap-3 px-4 py-2.5 transition-colors', !n.read && 'bg-white/2')}>
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                  n.type === 'success' ? 'bg-green-400' : n.type === 'warning' ? 'bg-amber-400' : n.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-800 font-medium">{n.title}</div>
                  <div className="text-[10px] text-gray-600 truncate">{n.message}</div>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary text-white mt-1.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
