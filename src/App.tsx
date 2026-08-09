import { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { cn } from './utils/cn';
import { ThemeProvider } from './lib/theme';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import CustomerView from './components/CustomerView';
import ServicesView from './components/ServicesView';
import GovernmentServicesView from './components/GovernmentServicesView';
import PrintingView from './components/PrintingView';
import ScannerView from './components/ScannerView';
import DesignStudioView from './components/DesignStudioView';
import DocumentsView from './components/DocumentsView';
import FinanceView from './components/FinanceView';
import ReportsView from './components/ReportsView';
import StaffView from './components/StaffView';
import NotificationsView from './components/NotificationsView';
import SettingsView from './components/SettingsView';
import ChatView from './components/ChatView';
import WritingView from './components/WritingView';
import ImageView from './components/ImageView';
import AudioView from './components/AudioView';
import VideoView from './components/VideoView';
import DocsView from './components/DocsView';
import CodeView from './components/CodeView';
import SearchEngineView from './components/SearchEngineView';
import HelpFaqView from './components/HelpFaqView';
import CyberAgentView from './components/CyberAgentView';
import AuthView from './components/AuthView';
import AssetsView from './components/AssetsView';
import { auth, onAuthStateChanged } from './lib/firebase';

export default function App() {
  const store = useAppStore();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mockAuth') === 'true') {
      store.login('alex@example.com', 'Alex Johnson');
      setIsAuthChecking(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        store.login(user.email || '', user.displayName || user.email?.split('@')[0] || 'User');
      } else {
        store.logout();
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, [store.login, store.logout]);

  if (isAuthChecking) {
    return <div className="min-h-screen bg-[var(--color-surface-bg)] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (!store.isAuthenticated) {
    return <AuthView onLogin={store.login} />;
  }

  const renderContent = () => {
    switch (store.activeCategory) {
      case 'dashboard':
        return (
          <DashboardView
            waitingTickets={store.waitingTickets}
            activeJobs={store.activeJobs}
            todayRevenue={store.todayRevenue}
            serviceTickets={store.serviceTickets}
            printJobs={store.printJobs}
            transactions={store.transactions}
            notifications={store.notifications}
            setActiveCategory={store.setActiveCategory}
          />
        );
      case 'customers':
        return <CustomerView customers={store.customers} addCustomer={store.addCustomer} />;
      case 'services':
        return (
          <ServicesView
            serviceTickets={store.serviceTickets}
            customers={store.customers}
            addServiceTicket={store.addServiceTicket}
            updateTicketStatus={store.updateTicketStatus}
          />
        );
      case 'government':
        return <GovernmentServicesView />;
      case 'printing':
        return <PrintingView printJobs={store.printJobs} addPrintJob={store.addPrintJob} />;
      case 'scanner':
        return <ScannerView />;
      case 'design':
        return <DesignStudioView />;
      case 'documents':
        return <DocumentsView documents={store.documents} addDocument={store.addDocument} />;
      case 'assets':
        return (
          <AssetsView
            assets={store.assets}
            addAsset={store.addAsset}
            deleteAsset={store.deleteAsset}
          />
        );
      case 'finance':
        return <FinanceView transactions={store.transactions} todayRevenue={store.todayRevenue} />;
      case 'reports':
        return (
          <ReportsView
            serviceTickets={store.serviceTickets}
            transactions={store.transactions}
            customers={store.customers}
            todayRevenue={store.todayRevenue}
          />
        );
      case 'staff':
        return <StaffView staff={store.staff} />;
      case 'notifications':
        return (
          <NotificationsView
            notifications={store.notifications}
            markNotificationRead={store.markNotificationRead}
            markAllNotificationsRead={store.markAllNotificationsRead}
          />
        );
      case 'settings':
        return <SettingsView />;
      case 'cyber-agent' as any:
        return (
          <CyberAgentView
            prompts={store.prompts}
            addPrompt={store.addPrompt}
          />
        );
      case 'ai-chat':
        return (
          <ChatView
            conversation={store.activeConversation}
            onSendMessage={store.sendMessage}
            isLoading={store.isLoading}
            selectedModel={store.selectedModel}
            setSelectedModel={store.setSelectedModel}
            onNewChat={store.createConversation}
          />
        );
      case 'ai-writing':
        return <WritingView />;
      case 'ai-image':
        return (
          <ImageView
            generatedImages={store.generatedImages}
            addGeneratedImage={store.addGeneratedImage}
          />
        );
      case 'ai-audio':
        return <AudioView />;
      case 'ai-video':
        return <VideoView />;
      case 'ai-docs':
        return <DocsView />;
      case 'ai-code':
        return <CodeView />;
      case 'search-engine':
        return <SearchEngineView />;
      case 'help-faq':
        return (
          <HelpFaqView
            customers={store.customers}
            addServiceTicket={store.addServiceTicket}
            setActiveCategory={store.setActiveCategory}
          />
        );
      default:
        return (
          <DashboardView
            waitingTickets={store.waitingTickets}
            activeJobs={store.activeJobs}
            todayRevenue={store.todayRevenue}
            serviceTickets={store.serviceTickets}
            printJobs={store.printJobs}
            transactions={store.transactions}
            notifications={store.notifications}
            setActiveCategory={store.setActiveCategory}
          />
        );
    }
  };

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-[var(--color-surface-bg)] overflow-hidden relative text-[var(--color-text-primary)]">
        {/* Sidebar Backdrop Overlay on mobile/tablet */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar Navigation Frame */}
        <div className={cn(
          "flex-shrink-0 z-50 transition-transform lg:transition-all duration-300 bg-[var(--color-surface-card)] border-r border-gray-200",
          // Desktop positioning & dimensions
          store.isSidebarCollapsed ? "lg:w-14" : "lg:w-64",
          // Mobile positioning (drawer slide-over style with relative/absolute overlay rules)
          "fixed inset-y-0 left-0 lg:static lg:translate-x-0 h-full",
          isMobileSidebarOpen ? "translate-x-0 shadow-2xl shadow-brand-accent/10" : "-translate-x-full"
        )}>
          <Sidebar
            activeCategory={store.activeCategory}
            setActiveCategory={(cat) => {
              store.setActiveCategory(cat);
              setIsMobileSidebarOpen(false); // Auto-dismiss drawer once selected on mobile
            }}
            activeToolId={store.activeToolId}
            setActiveToolId={store.setActiveToolId}
            conversations={store.conversations}
            activeConversationId={store.activeConversationId}
            setActiveConversationId={store.setActiveConversationId}
            createConversation={store.createConversation}
            deleteConversation={store.deleteConversation}
            isSidebarCollapsed={store.isSidebarCollapsed}
            setIsSidebarCollapsed={store.setIsSidebarCollapsed}
            user={store.user}
            unreadNotifications={store.unreadNotifications}
            waitingTickets={store.waitingTickets}
            logout={store.logout}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            user={store.user}
            activeCategory={store.activeCategory}
            unreadNotifications={store.unreadNotifications}
            waitingTickets={store.waitingTickets}
            activeJobs={store.activeJobs}
            todayRevenue={store.todayRevenue}
            setActiveCategory={store.setActiveCategory}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
          />
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

