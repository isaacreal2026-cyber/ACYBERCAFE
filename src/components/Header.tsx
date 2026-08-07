import { Bell, Users, Zap, Clock } from 'lucide-react';
import { User, ToolCategory } from '../types';
import { cn } from '../utils/cn';
import GlobalSearch from './GlobalSearch';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  user: User;
  activeCategory: ToolCategory;
  unreadNotifications: number;
  waitingTickets: number;
  activeJobs: number;
  todayRevenue: number;
  setActiveCategory: (cat: ToolCategory) => void;
  onMenuClick?: () => void;
}

export default function Header({ user, activeCategory, unreadNotifications, waitingTickets, activeJobs, todayRevenue, setActiveCategory, onMenuClick }: HeaderProps) {
  const pageTitle: Record<ToolCategory, string> = {
    dashboard: 'Control', customers: 'Customers', services: 'Queue',
    government: 'Gov Service', documents: 'File Vault', printing: 'Printing',
    scanner: 'Scanner', design: 'Design', 'ai-chat': 'AI Chat', 'ai-writing': 'AI Writing',
    'ai-image': 'AI Image', 'ai-audio': 'AI Audio', 'ai-video': 'AI Video', 'ai-docs': 'AI Docs',
    'ai-code': 'AI Code', assets: 'Assets', finance: 'Finance', reports: 'Reports', staff: 'Staff',
    notifications: 'Alerts', settings: 'Settings', 'search-engine': 'Search Engine', 'help-faq': 'Help & FAQ',
  };

  return (
    <div className="h-13 flex items-center justify-between px-3 sm:px-4 border-b border-brand-primary/10 bg-surface-bg/90 backdrop-blur-sm flex-shrink-0 gap-2 sm:gap-4">
      {/* Left: Page title + search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-brand-primary hover:bg-gray-100 rounded-lg transition-all focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-1.5 min-w-0">
          <Zap className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
          <span className="text-gray-800 font-semibold text-xs sm:text-sm whitespace-nowrap truncate max-w-[75px] sm:max-w-none">{pageTitle[activeCategory] || 'Dashboard'}</span>
        </div>
        <GlobalSearch setActiveCategory={setActiveCategory} />
      </div>

      {/* Center: Live Stats */}
      <div className="hidden md:flex items-center gap-1">
        <button
          onClick={() => setActiveCategory('services')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border',
            waitingTickets > 0
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15'
              : 'bg-white/4 border-white/8 text-gray-600 hover:bg-white/8'
          )}
        >
          <Users className="w-3 h-3" />
          <span className="font-semibold">{waitingTickets}</span>
          <span className="text-gray-600">waiting</span>
        </button>
        <button
          onClick={() => setActiveCategory('services')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border',
            activeJobs > 0
              ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 text-brand-primary hover:bg-brand-primary/15 text-brand-primary'
              : 'bg-white/4 border-white/8 text-gray-600 hover:bg-white/8'
          )}
        >
          <Clock className="w-3 h-3" />
          <span className="font-semibold">{activeJobs}</span>
          <span className="text-gray-600">active</span>
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-green-500/10 border border-green-300 text-green-400">
          <span className="text-gray-600">KES</span>
          <span className="font-semibold">{todayRevenue.toLocaleString()}</span>
          <span className="text-gray-600">today</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setActiveCategory('notifications')}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Bell className="w-4 h-4" />
          </button>
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shadow-lg shadow-brand-primary/20">
          <span className="text-white text-[10px] font-bold">{user.avatar}</span>
        </div>
      </div>
    </div>
  );
}
