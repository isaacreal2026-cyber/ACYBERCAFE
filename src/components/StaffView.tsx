import { UserCheck, Activity, DollarSign, Award } from 'lucide-react';
import { StaffMember } from '../types';
import { cn } from '../utils/cn';

interface StaffViewProps {
  staff: StaffMember[];
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/10', dot: 'bg-green-400' },
  inactive: { label: 'Off Duty', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-300' },
  break: { label: 'On Break', color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
};

const ROLE_CONFIG = {
  owner: { label: 'Owner', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  manager: { label: 'Manager', color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary' },
  attendant: { label: 'Attendant', color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export default function StaffView({ staff }: StaffViewProps) {
  const totalRevenue = staff.reduce((s, m) => s + m.revenue, 0);
  const totalServices = staff.reduce((s, m) => s + m.servicesCompleted, 0);
  const activeCount = staff.filter(m => m.status === 'active').length;

  return (
    <div className="h-full overflow-y-auto bg-surface-bg p-5 space-y-5">
      <h2 className="text-text-primary font-semibold flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-violet-400" /> Staff Management
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Active Staff', value: activeCount, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-300' },
          { label: 'Total Services', value: totalServices, icon: Award, color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary', border: 'border-brand-primary/20' },
          { label: 'Total Revenue', value: `KES ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
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

      {/* Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map(member => {
          const statusCfg = STATUS_CONFIG[member.status];
          const roleCfg = ROLE_CONFIG[member.role];
          const revenueShare = totalRevenue > 0 ? Math.round((member.revenue / totalRevenue) * 100) : 0;
          return (
            <div key={member.id} className="bg-white/3 rounded-xl border border-white/8 p-5 space-y-4 hover:border-white/15 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-primary font-bold text-sm">{member.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 font-semibold">{member.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', roleCfg.color, roleCfg.bg)}>{roleCfg.label}</span>
                    <span className={cn('flex items-center gap-1 text-[10px]', statusCfg.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/3 rounded-lg p-2.5 text-center">
                  <div className="text-brand-primary font-bold text-base">{member.servicesCompleted}</div>
                  <div className="text-gray-600 text-[10px]">Services</div>
                </div>
                <div className="bg-white/3 rounded-lg p-2.5 text-center">
                  <div className="text-green-400 font-bold text-base">KES {(member.revenue / 1000).toFixed(1)}K</div>
                  <div className="text-gray-600 text-[10px]">Revenue</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-[10px]">Revenue Share</span>
                  <span className="text-gray-600 text-[10px]">{revenueShare}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" style={{ width: `${revenueShare}%` }} />
                </div>
              </div>

              <div className="text-[10px] text-text-primary/25">
                Joined {member.joinedAt.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })} · {member.email}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
