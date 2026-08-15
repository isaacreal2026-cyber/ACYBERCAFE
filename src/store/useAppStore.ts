import { useState, useCallback } from 'react';
import {
  Conversation, Message, GeneratedImage, User, ToolCategory,
  Customer, ServiceTicket, PrintJob, StaffMember, Transaction, Notification, StoredDocument,
  PromptItem, SavedAsset
} from '../types';
import { firebaseSignOut, auth } from '../lib/firebase';

let idCounter = 0;
export const generateId = () => `id_${++idCounter}_${Date.now()}`;

const DEFAULT_USER: User = {
  name: 'Alex Johnson',
  email: 'alex@example.com',
  avatar: 'AJ',
  plan: 'free',
  credits: 387500,
  maxCredits: 450000,
};

const SAMPLE_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'John Kamau', phone: '+254 712 345 678', email: 'jkamau@gmail.com', nationalId: '12345678', notes: 'Regular customer', createdAt: new Date('2024-01-15'), totalSpent: 4500, totalVisits: 23 },
  { id: 'c2', name: 'Mary Wanjiru', phone: '+254 722 456 789', email: 'mwanjiru@gmail.com', nationalId: '23456789', notes: 'Needs KRA help frequently', createdAt: new Date('2024-02-10'), totalSpent: 2800, totalVisits: 14 },
  { id: 'c3', name: 'Peter Mwangi', phone: '+254 733 567 890', email: 'pmwangi@gmail.com', nationalId: '34567890', notes: '', createdAt: new Date('2024-03-05'), totalSpent: 1200, totalVisits: 8 },
  { id: 'c4', name: 'Grace Njeri', phone: '+254 744 678 901', email: 'gnjeri@gmail.com', nationalId: '45678901', notes: 'CV creation client', createdAt: new Date('2024-04-01'), totalSpent: 3600, totalVisits: 18 },
  { id: 'c5', name: 'David Ochieng', phone: '+254 755 789 012', email: 'dochieng@gmail.com', nationalId: '56789012', notes: '', createdAt: new Date('2024-05-12'), totalSpent: 950, totalVisits: 5 },
];

const SAMPLE_TICKETS: ServiceTicket[] = [
  { id: 't1', ticketNumber: 'TK-001', customerId: 'c1', customerName: 'John Kamau', serviceType: 'KRA Nil Returns', description: 'File nil returns for 2023', status: 'processing', queuePosition: 1, amount: 200, assignedTo: 'Attendant', createdAt: new Date(), updatedAt: new Date() },
  { id: 't2', ticketNumber: 'TK-002', customerId: 'c2', customerName: 'Mary Wanjiru', serviceType: 'CV Creation', description: 'Create professional CV', status: 'waiting', queuePosition: 2, amount: 500, assignedTo: '', createdAt: new Date(), updatedAt: new Date() },
  { id: 't3', ticketNumber: 'TK-003', customerId: 'c3', customerName: 'Peter Mwangi', serviceType: 'Printing', description: '5 pages - documents', status: 'completed', queuePosition: 0, amount: 50, assignedTo: 'Attendant', createdAt: new Date(), updatedAt: new Date() },
  { id: 't4', ticketNumber: 'TK-004', customerId: 'c4', customerName: 'Grace Njeri', serviceType: 'eCitizen Application', description: 'Good conduct application', status: 'waiting', queuePosition: 3, amount: 100, assignedTo: '', createdAt: new Date(), updatedAt: new Date() },
  { id: 't5', ticketNumber: 'TK-005', customerId: 'c5', customerName: 'David Ochieng', serviceType: 'Scanning', description: 'Scan 3 ID documents', status: 'delivered', queuePosition: 0, amount: 60, assignedTo: 'Attendant', createdAt: new Date(), updatedAt: new Date() },
];

const SAMPLE_PRINT_JOBS: PrintJob[] = [
  { id: 'p1', fileName: 'CV_John_Kamau.pdf', pages: 2, copies: 1, colorMode: 'black-white', paperSize: 'A4', status: 'completed', cost: 20, customerName: 'John Kamau', createdAt: new Date() },
  { id: 'p2', fileName: 'Application_Letter.docx', pages: 1, copies: 3, colorMode: 'black-white', paperSize: 'A4', status: 'printing', cost: 30, customerName: 'Mary Wanjiru', createdAt: new Date() },
  { id: 'p3', fileName: 'NHIF_Form.pdf', pages: 2, copies: 1, colorMode: 'color', paperSize: 'A4', status: 'queued', cost: 40, customerName: 'Peter Mwangi', createdAt: new Date() },
];

const SAMPLE_STAFF: StaffMember[] = [
  { id: 's1', name: 'Alex Johnson', role: 'manager', email: 'alex@cyberplus.com', phone: '+254 712 000 001', avatar: 'AJ', status: 'active', servicesCompleted: 342, revenue: 68400, joinedAt: new Date('2023-01-10') },
  { id: 's2', name: 'Betty Wangari', role: 'attendant', email: 'betty@cyberplus.com', phone: '+254 722 000 002', avatar: 'BW', status: 'active', servicesCompleted: 215, revenue: 43000, joinedAt: new Date('2023-06-15') },
  { id: 's3', name: 'Collins Mwenda', role: 'attendant', email: 'collins@cyberplus.com', phone: '+254 733 000 003', avatar: 'CM', status: 'break', servicesCompleted: 178, revenue: 35600, joinedAt: new Date('2024-01-20') },
];

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: 'tr1', type: 'CV Creation', customerName: 'John Kamau', amount: 500, paymentMethod: 'mpesa', createdAt: new Date() },
  { id: 'tr2', type: 'Printing', customerName: 'Mary Wanjiru', amount: 30, paymentMethod: 'cash', createdAt: new Date() },
  { id: 'tr3', type: 'KRA Services', customerName: 'Peter Mwangi', amount: 200, paymentMethod: 'mpesa', createdAt: new Date() },
  { id: 'tr4', type: 'Scanning', customerName: 'Grace Njeri', amount: 60, paymentMethod: 'cash', createdAt: new Date() },
  { id: 'tr5', type: 'eCitizen', customerName: 'David Ochieng', amount: 100, paymentMethod: 'mpesa', createdAt: new Date() },
];

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Print Job Complete', message: 'CV_John_Kamau.pdf is ready for collection', type: 'success', read: false, createdAt: new Date() },
  { id: 'n2', title: 'New Service Request', message: 'Grace Njeri submitted eCitizen application request', type: 'info', read: false, createdAt: new Date() },
  { id: 'n3', title: 'Low Paper Supply', message: 'A4 paper is running low. Please restock.', type: 'warning', read: true, createdAt: new Date() },
];

const SAMPLE_DOCUMENTS: StoredDocument[] = [
  { id: 'd1', name: 'CV_John_Kamau.pdf', type: 'PDF', size: '245 KB', customerId: 'c1', customerName: 'John Kamau', category: 'cv', createdAt: new Date() },
  { id: 'd2', name: 'Application_Letter_Mary.docx', type: 'DOCX', size: '120 KB', customerId: 'c2', customerName: 'Mary Wanjiru', category: 'letter', createdAt: new Date() },
  { id: 'd3', name: 'National_ID_Peter.jpg', type: 'JPG', size: '1.2 MB', customerId: 'c3', customerName: 'Peter Mwangi', category: 'id', createdAt: new Date() },
];

export function useAppStore() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('dashboard');
  const [activeToolId, setActiveToolId] = useState<string>('dashboard');

  // AI Chat
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv_1', title: 'Welcome Chat',
      messages: [{ id: 'msg_1', role: 'assistant', content: 'Hello! I\'m your AI assistant for CyberPlus Operations Center. I can help with KRA services, eCitizen applications, CV writing, and more. How can I assist you today?', timestamp: new Date(), model: 'gemini-2.5-flash' }],
      model: 'gemini-2.5-flash', createdAt: new Date(), updatedAt: new Date(),
    }
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv_1');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [user] = useState<User>(DEFAULT_USER);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback((_email: string, _name: string) => {
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
  }, []);

  // Cyber Cafe Data
  const [customers, setCustomers] = useState<Customer[]>(SAMPLE_CUSTOMERS);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>(SAMPLE_TICKETS);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>(SAMPLE_PRINT_JOBS);
  const [staff] = useState<StaffMember[]>(SAMPLE_STAFF);
  const [transactions, setTransactions] = useState<Transaction[]>(SAMPLE_TRANSACTIONS);
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [documents, setDocuments] = useState<StoredDocument[]>(SAMPLE_DOCUMENTS);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [assets, setAssets] = useState<SavedAsset[]>([]);

  const addPrompt = useCallback((prompt: Omit<PromptItem, 'id'>) => {
    setPrompts(prev => [...prev, { ...prompt, id: generateId() }]);
  }, []);

  const deletePrompt = useCallback((id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
  }, []);

  const togglePinPrompt = useCallback((id: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p));
  }, []);

  const addAsset = useCallback((asset: Omit<SavedAsset, 'id' | 'createdAt'>) => {
    setAssets(prev => [...prev, { ...asset, id: generateId(), createdAt: Date.now() }]);
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const waitingTickets = serviceTickets.filter(t => t.status === 'waiting').length;
  const activeJobs = serviceTickets.filter(t => t.status === 'processing').length;
  const todayRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);

  const createConversation = useCallback((model: string = 'gemini-2.5-flash') => {
    const newConv: Conversation = {
      id: generateId(), title: 'New Chat', messages: [], model,
      createdAt: new Date(), updatedAt: new Date(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    return newConv.id;
  }, []);

  const sendMessage = useCallback(async (content: string, model?: string) => {
    const convId = activeConversationId;
    const msgModel = model || selectedModel;

    const userMsg: Message = { id: generateId(), role: 'user', content, timestamp: new Date() };

    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      const newTitle = c.messages.length === 0 ? content.slice(0, 40) + (content.length > 40 ? '...' : '') : c.title;
      return { ...c, title: newTitle, messages: [...c.messages, userMsg], updatedAt: new Date() };
    }));

    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: content, 
          type: "text",
          provider: msgModel.includes("gemini") ? "gemini" : (msgModel.includes("llama") ? "groq" : "openrouter"),
          model: msgModel
        })
      });

      const data = await response.json();
      const responseText = response.ok && data.status === "success" ? data.text : (data.error || "Generation failed");

      const assistantMsg: Message = { id: generateId(), role: 'assistant', content: responseText, timestamp: new Date(), model: msgModel };

      setConversations(prev => prev.map(c => {
        if (c.id !== convId) return c;
        return { ...c, messages: [...c.messages, assistantMsg], updatedAt: new Date() };
      }));
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, selectedModel]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (id === activeConversationId && filtered.length > 0) setActiveConversationId(filtered[0].id);
      return filtered;
    });
  }, [activeConversationId]);

  const addGeneratedImage = useCallback((image: GeneratedImage) => {
    setGeneratedImages(prev => [image, ...prev]);
  }, []);

  const addCustomer = useCallback((customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'totalVisits'>) => {
    const newCustomer: Customer = { ...customer, id: generateId(), createdAt: new Date(), totalSpent: 0, totalVisits: 0 };
    setCustomers(prev => [newCustomer, ...prev]);
  }, []);

  const addServiceTicket = useCallback((ticket: Omit<ServiceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'queuePosition'>) => {
    const waitingCount = serviceTickets.filter(t => t.status === 'waiting').length;
    const newTicket: ServiceTicket = {
      ...ticket, id: generateId(),
      ticketNumber: `TK-${String(serviceTickets.length + 1).padStart(3, '0')}`,
      queuePosition: waitingCount + 1,
      createdAt: new Date(), updatedAt: new Date(),
    };
    setServiceTickets(prev => [...prev, newTicket]);
    setNotifications(prev => [{
      id: generateId(), title: 'New Service Request',
      message: `${ticket.customerName} - ${ticket.serviceType}`,
      type: 'info', read: false, createdAt: new Date(),
    }, ...prev]);
    return newTicket;
  }, [serviceTickets]);

  const updateTicketStatus = useCallback((id: string, status: ServiceTicket['status']) => {
    const targetTicket = serviceTickets.find(t => t.id === id);
    setServiceTickets(prev => prev.map(t => t.id === id ? { ...t, status, updatedAt: new Date() } : t));
    if (status === 'completed' && targetTicket) {
      const newTx: Transaction = {
        id: generateId(), type: targetTicket.serviceType,
        customerName: targetTicket.customerName, amount: targetTicket.amount,
        paymentMethod: 'cash', createdAt: new Date(),
      };
      setTransactions(prev => [newTx, ...prev]);
      setNotifications(prev => [{
        id: generateId(), title: 'Service Completed',
        message: `${targetTicket.serviceType} for ${targetTicket.customerName} completed`,
        type: 'success', read: false, createdAt: new Date(),
      }, ...prev]);
    }
  }, [serviceTickets]);

  const addPrintJob = useCallback((job: Omit<PrintJob, 'id' | 'createdAt' | 'status'>) => {
    const newJob: PrintJob = { ...job, id: generateId(), status: 'queued', createdAt: new Date() };
    setPrintJobs(prev => [newJob, ...prev]);
    return newJob;
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addDocument = useCallback((doc: Omit<StoredDocument, 'id' | 'createdAt'>) => {
    const newDoc: StoredDocument = { ...doc, id: generateId(), createdAt: new Date() };
    setDocuments(prev => [newDoc, ...prev]);
  }, []);

  return {
    activeCategory, setActiveCategory,
    activeToolId, setActiveToolId,
    conversations, activeConversation, activeConversationId,
    setActiveConversationId, createConversation, sendMessage, deleteConversation,
    generatedImages, addGeneratedImage,
    user, isSidebarCollapsed, setIsSidebarCollapsed,
    selectedModel, setSelectedModel,
    isLoading,
    isAuthenticated, login, logout,
    customers, addCustomer,
    serviceTickets, addServiceTicket, updateTicketStatus,
    printJobs, addPrintJob,
    staff,
    transactions,
    notifications, markNotificationRead, markAllNotificationsRead,
    documents, addDocument,
    prompts, addPrompt, deletePrompt, togglePinPrompt,
    assets, addAsset, deleteAsset,
    unreadNotifications, waitingTickets, activeJobs, todayRevenue,
  };
}
