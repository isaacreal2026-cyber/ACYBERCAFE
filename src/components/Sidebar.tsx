import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Users, Briefcase, Building2, FileText, Printer, ScanLine,
  Palette, MessageSquare, PenTool, Image, Mic, Video, Code2, DollarSign,
  BarChart3, UserCheck, Bell, Settings, ChevronLeft, ChevronRight,
  ChevronDown, Plus, Trash2, Sparkles, Clock, Zap, Shield, HelpCircle, Bot,
  LogOut, CreditCard, Key
} from 'lucide-react';
import { ToolCategory, Conversation } from '../types';
import { cn } from '../utils/cn';

interface SidebarProps {
  activeCategory: ToolCategory;
  setActiveCategory: (cat: ToolCategory) => void;
  activeToolId: string;
  setActiveToolId: (id: string) => void;
  conversations: Conversation[];
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (v: boolean) => void;
  user: { name: string; email: string; avatar: string; plan: string; credits: number; maxCredits: number };
  unreadNotifications: number;
  waitingTickets: number;
  logout?: () => void;
}

type NavItem = {
  id: ToolCategory;
  label: string;
  icon: React.ElementType;
  color: string;
  badge?: number | string;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export default function Sidebar({
  activeCategory, setActiveCategory, setActiveToolId,
  conversations, activeConversationId, setActiveConversationId,
  createConversation, deleteConversation, isSidebarCollapsed, setIsSidebarCollapsed,
  user, unreadNotifications, waitingTickets, logout
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    control: true, operations: true, government: true, ai: false, management: false, system: false
  });
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSection = (s: string) =>
    setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }));

  const navigate = (cat: ToolCategory) => {
    setActiveCategory(cat);
    setActiveToolId(cat);
  };

  const NAV_SECTIONS: NavSection[] = [
    {
      id: 'control', label: 'Control Center',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-brand-primary' },
        { id: 'search-engine', label: 'Search Engines', icon: Sparkles, color: 'text-purple-400' },
      ]
    },
    {
      id: 'operations', label: 'Operations',
      items: [
        { id: 'customers', label: 'Customers', icon: Users, color: 'text-blue-400' },
        { id: 'services', label: 'Services', icon: Briefcase, color: 'text-violet-400', badge: waitingTickets > 0 ? waitingTickets : undefined },
        { id: 'printing', label: 'Printing Center', icon: Printer, color: 'text-orange-400' },
        { id: 'scanner', label: 'Scanner Center', icon: ScanLine, color: 'text-yellow-400' },
        { id: 'design', label: 'Design Studio', icon: Palette, color: 'text-pink-400' },
        { id: 'documents', label: 'File Vault', icon: FileText, color: 'text-green-400' },
        { id: 'assets', label: 'Digital Assets', icon: FileText, color: 'text-yellow-500' },
      ]
    },
    {
      id: 'government', label: 'Government Hub',
      items: [
        { id: 'government', label: 'Gov. Services', icon: Building2, color: 'text-emerald-400' },
      ]
    },
    {
      id: 'ai', label: 'AI Assistant',
      items: [
        { id: 'cyber-agent' as any, label: 'Cyber Agent', icon: Bot, color: 'text-brand-primary', badge: 'New' },
        { id: 'ai-chat', label: 'AI Chat', icon: MessageSquare, color: 'text-blue-400', badge: 'Hot' },
        { id: 'ai-writing', label: 'AI Writing', icon: PenTool, color: 'text-green-400' },
        { id: 'ai-image', label: 'AI Image', icon: Image, color: 'text-purple-400' },
        { id: 'ai-audio', label: 'AI Audio', icon: Mic, color: 'text-orange-400' },
        { id: 'ai-video', label: 'AI Video', icon: Video, color: 'text-red-400' },
        { id: 'ai-docs', label: 'AI Docs', icon: FileText, color: 'text-brand-primary' },
        { id: 'ai-code', label: 'AI Code', icon: Code2, color: 'text-yellow-400' },
      ]
    },
    {
      id: 'management', label: 'Management',
      items: [
        { id: 'finance', label: 'Finance', icon: DollarSign, color: 'text-green-400' },
        { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-blue-400' },
        { id: 'staff', label: 'Staff', icon: UserCheck, color: 'text-violet-400' },
      ]
    },
    {
      id: 'system', label: 'System',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-amber-400', badge: unreadNotifications > 0 ? unreadNotifications : undefined },
        { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-400' },
        { id: 'help-faq', label: 'Help & FAQ', icon: HelpCircle, color: 'text-brand-primary' },
      ]
    },
  ];

  return (
    <div className={cn(
      'flex flex-col h-full bg-surface-bg border-r border-brand-primary/10 transition-all duration-300 relative',
      isSidebarCollapsed ? 'w-64 lg:w-14' : 'w-64 lg:w-64'
    )}>
      {/* Logo / Team Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div 
          onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-4 border-b border-brand-primary/10 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-brand-primary/30">
            <Zap className="w-4 h-4 text-text-primary" />
          </div>
          <div className={cn(
            "flex-1 min-w-0 transition-opacity duration-300",
            isSidebarCollapsed ? "hidden lg:hidden" : "block",
            "lg:block"
          )}>
            <div className="flex items-center gap-1.5">
              <span className="text-text-primary font-bold text-base tracking-tight">Cyber<span className="text-brand-primary">Plus</span></span>
              <span className="text-[9px] bg-brand-primary/20 text-brand-primary text-brand-primary px-1 py-0.5 rounded font-semibold">v2.0</span>
            </div>
            <div className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              Operations Center
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarCollapsed(!isSidebarCollapsed);
            }}
            className="ml-auto text-text-primary/20 hover:text-brand-primary transition-colors hidden lg:block"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Dropdown Menu */}
        {isTeamDropdownOpen && !isSidebarCollapsed && (
          <div className="absolute top-full left-2 w-56 mt-1 bg-surface-card border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
            <div className="px-3 py-2 border-b border-white/5">
              <div className="text-sm font-semibold text-text-primary truncate">{user.name}</div>
              <div className="text-[10px] text-gray-500 truncate">{user.email}</div>
            </div>
            
            <div className="p-1 space-y-0.5 border-b border-white/5">
              <button className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-text-primary hover:bg-white/5 flex items-center gap-2 transition-colors">
                <Settings className="w-3.5 h-3.5" /> Account Settings
              </button>
              <button className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-text-primary hover:bg-white/5 flex items-center gap-2 transition-colors">
                <Building2 className="w-3.5 h-3.5" /> Team Settings
              </button>
              <button className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-text-primary hover:bg-white/5 flex items-center gap-2 transition-colors">
                <Users className="w-3.5 h-3.5" /> Members
              </button>
            </div>

            <div className="p-1 space-y-0.5 border-b border-white/5">
              <button className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-text-primary hover:bg-white/5 flex items-center gap-2 transition-colors">
                <BarChart3 className="w-3.5 h-3.5" /> Billing Usage
              </button>
              <button className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-text-primary hover:bg-white/5 flex items-center gap-2 transition-colors">
                <CreditCard className="w-3.5 h-3.5" /> Free Credits ({user.credits.toLocaleString()})
              </button>
              <button className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-text-primary hover:bg-white/5 flex items-center gap-2 transition-colors">
                <Key className="w-3.5 h-3.5" /> API Keys
              </button>
            </div>

            <div className="p-1 border-b border-white/5">
              <button className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-brand-primary hover:text-white hover:bg-brand-primary/20 flex items-center gap-2 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create a Team
              </button>
            </div>

            <div className="p-1">
              <button 
                onClick={() => { setIsTeamDropdownOpen(false); if(logout) logout(); }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick New Service */}
      <div className={cn('px-2 py-2.5 border-b border-gray-100', isSidebarCollapsed && 'px-2 lg:px-1.5')}>
        <button
          onClick={() => navigate('services')}
          className={cn(
            'flex items-center bg-brand-primary text-white/80 hover:bg-brand-primary text-white text-text-primary rounded-lg transition-all font-medium text-xs shadow-lg shadow-brand-primary/20 px-3 py-2 gap-2 w-full',
            isSidebarCollapsed && 'lg:justify-center lg:p-2 lg:gap-0'
          )}
        >
          <Plus className="w-3.5 h-3.5 flex-shrink-0" />
          <span className={cn(
            isSidebarCollapsed ? "hidden lg:hidden" : "block",
            "lg:block"
          )}>
            New Service
          </span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent py-2">
        {/* Expanded Navigation Menu (shown on mobile, and on desktop if not collapsed) */}
        <div className={cn("space-y-1", isSidebarCollapsed ? "block lg:hidden" : "block lg:block")}>
          {NAV_SECTIONS.map(section => (
            <div key={section.id} className="px-2 mb-1">
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center gap-1.5 w-full text-[10px] font-semibold text-text-primary/25 uppercase tracking-widest py-1.5 px-1 hover:text-gray-600 transition-colors"
              >
                <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', !expandedSections[section.id] && '-rotate-90')} />
                {section.label}
              </button>
              {expandedSections[section.id] && (
                <div className="space-y-0.5">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeCategory === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs transition-all',
                          isActive
                            ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-text-primary'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        )}
                      >
                        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? item.color : 'text-gray-600')} />
                        <span className="font-medium flex-1 text-left">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                            typeof item.badge === 'number'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-brand-primary/20 text-brand-primary text-brand-primary'
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Collapsed Navigation Icons (shown only on desktop when collapsed) */}
        <div className={cn("px-1 space-y-1", isSidebarCollapsed ? "hidden lg:block" : "hidden")}>
          {NAV_SECTIONS.flatMap(s => s.items).map(item => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                title={item.label}
                className={cn(
                  'relative flex items-center justify-center w-full p-2 rounded-lg transition-all',
                  isActive ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? item.color : '')} />
                {item.badge !== undefined && typeof item.badge === 'number' && (
                  <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-text-primary font-bold">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Recent AI Chats */}
        {(activeCategory === 'ai-chat') && (
          <div className={cn(
            "px-2 mt-2",
            isSidebarCollapsed ? "block lg:hidden" : "block"
          )}>
            <div className="flex items-center gap-1 px-1 py-1.5">
              <Clock className="w-2.5 h-2.5 text-text-primary/20" />
              <span className="text-[10px] font-semibold text-text-primary/25 uppercase tracking-widest">Recent Chats</span>
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onMouseEnter={() => setHoveredConv(conv.id)}
                  onMouseLeave={() => setHoveredConv(null)}
                  className={cn(
                    'group flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer',
                    activeConversationId === conv.id ? 'bg-white/8 text-text-primary' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-600'
                  )}
                  onClick={() => { setActiveConversationId(conv.id); navigate('ai-chat'); }}
                >
                  <MessageSquare className="w-3 h-3 flex-shrink-0 text-text-primary/20" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  {hoveredConv === conv.id && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                      className="opacity-0 group-hover:opacity-100 text-text-primary/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => { createConversation(); navigate('ai-chat'); }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-brand-primary/60 hover:text-brand-primary hover:bg-brand-primary text-white/5 transition-all"
              >
                <Plus className="w-3 h-3" />
                New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="border-t border-brand-primary/10 p-2">
        <div 
          onClick={() => navigate('settings')}
          className={cn(
          'flex items-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors justify-start gap-2',
          isSidebarCollapsed && 'lg:justify-center lg:gap-0'
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden border border-white/20">
            {user.avatar ? (
              <span className="text-white text-[10px] font-bold">{user.avatar}</span>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
          </div>
          <div className={cn(
            "flex-1 min-w-0",
            isSidebarCollapsed ? "block lg:hidden" : "block",
            "lg:block"
          )}>
            <div className="text-xs text-gray-800 font-medium truncate">{user.name}</div>
            <div className="text-[10px] text-gray-600 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-brand-primary" />
              <span className="capitalize">{user.plan} Plan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
