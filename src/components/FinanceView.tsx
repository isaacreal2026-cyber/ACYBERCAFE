import { DollarSign, TrendingUp, ArrowUpRight, CreditCard, Smartphone, Banknote, Download, FileSpreadsheet } from 'lucide-react';
import { Transaction } from '../types';
import { cn } from '../utils/cn';

interface FinanceViewProps {
  transactions: Transaction[];
  todayRevenue: number;
}

export default function FinanceView({ transactions, todayRevenue }: FinanceViewProps) {
  const byService = transactions.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedServices = Object.entries(byService).sort((a, b) => b[1] - a[1]);
  const totalRevenue = transactions.reduce((s, t) => s + t.amount, 0);
  const mpesa = transactions.filter(t => t.paymentMethod === 'mpesa').reduce((s, t) => s + t.amount, 0);
  const cash = transactions.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.amount, 0);
  const card = transactions.filter(t => t.paymentMethod === 'card').reduce((s, t) => s + t.amount, 0);

  const maxService = Math.max(...Object.values(byService), 1);

  const handleExportBookkeeping = () => {
    const headers = ["ID", "Service Type", "Customer Name", "Amount (KES)", "Payment Method", "Timestamp"];
    const rows = transactions.map(t => [
      t.id,
      `"${t.type}"`,
      `"${t.customerName}"`,
      t.amount,
      t.paymentMethod.toUpperCase(),
      `"${new Date(t.createdAt).toLocaleString()}"`
    ]);
    const summaryRows = [
      [],
      ["SUMMARY REPORT"],
      ["Total Revenue (KES)", totalRevenue],
      ["M-Pesa Total (KES)", mpesa],
      ["Cash Total (KES)", cash],
      ["Card Total (KES)", card]
    ];
    const csvContent = [headers.join(","), ...rows.map(r => r.join(",")), ...summaryRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CyberPlus_Bookkeeping_Sheet_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-bg p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" /> Financial Dashboard
        </h2>
        <button
          onClick={handleExportBookkeeping}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-green-500/20"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Bookkeeping Sheet (.csv)</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Today's Revenue", value: `KES ${todayRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-300' },
          { label: 'Total Revenue', value: `KES ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary', border: 'border-brand-primary/20' },
          { label: 'Transactions', value: transactions.length, icon: ArrowUpRight, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
          { label: 'Avg. Transaction', value: `KES ${transactions.length ? Math.round(totalRevenue / transactions.length) : 0}`, icon: CreditCard, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-300' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={cn('p-4 rounded-xl border', card.bg, card.border)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-xs">{card.label}</span>
                <Icon className={cn('w-4 h-4', card.color)} />
              </div>
              <div className={cn('text-xl font-bold', card.color)}>{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue by Service */}
        <div className="bg-white/3 rounded-xl border border-white/8 p-4">
          <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4">Revenue by Service</h3>
          <div className="space-y-3">
            {sortedServices.map(([service, amount]) => (
              <div key={service}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-700 truncate flex-1">{service}</span>
                  <span className="text-xs text-green-400 font-semibold ml-2 flex-shrink-0">KES {amount.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${(amount / maxService) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {sortedServices.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No revenue data</div>}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white/3 rounded-xl border border-white/8 p-4">
          <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4">Payment Methods</h3>
          <div className="space-y-3">
            {[
              { label: 'M-Pesa', amount: mpesa, icon: Smartphone, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Cash', amount: cash, icon: Banknote, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Card', amount: card, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            ].map(method => {
              const Icon = method.icon;
              const pct = totalRevenue > 0 ? Math.round((method.amount / totalRevenue) * 100) : 0;
              return (
                <div key={method.label} className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', method.bg)}>
                    <Icon className={cn('w-4 h-4', method.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">{method.label}</span>
                      <span className="text-xs text-gray-600">{pct}% · KES {method.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/3 rounded-xl border border-white/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8">
          <h3 className="text-gray-800 text-sm font-semibold flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-green-400" /> Transaction History
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/2 transition-colors">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                tx.paymentMethod === 'mpesa' ? 'bg-green-500/10' : tx.paymentMethod === 'cash' ? 'bg-amber-500/10' : 'bg-blue-500/10')}>
                {tx.paymentMethod === 'mpesa' ? <Smartphone className="w-4 h-4 text-green-400" /> :
                  tx.paymentMethod === 'cash' ? <Banknote className="w-4 h-4 text-amber-400" /> :
                    <CreditCard className="w-4 h-4 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 font-medium">{tx.customerName}</div>
                <div className="text-xs text-gray-600">{tx.type}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-400 font-semibold">+KES {tx.amount}</div>
                <div className="text-xs text-gray-600 capitalize">{tx.paymentMethod}</div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <div className="py-10 text-center text-gray-600 text-sm">No transactions yet</div>}
        </div>
      </div>
    </div>
  );
}
