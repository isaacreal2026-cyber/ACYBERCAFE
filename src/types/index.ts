export type PromptItem = {
  id: string;
  name: string;
  content: string;
  category: string; // e.g., 'image', 'text', 'general'
  pinned: boolean;
};

export type SavedAsset = {
  id: string;
  type: 'document' | 'image' | 'link';
  name: string;
  url: string;
  tags: string[];
  createdAt: number;
};

export type ToolCategory =
  | 'dashboard' | 'customers' | 'services' | 'government'
  | 'documents' | 'printing' | 'scanner' | 'design' | 'assets'
  | 'ai-chat' | 'ai-writing' | 'ai-image' | 'ai-audio' | 'ai-video' | 'ai-docs' | 'ai-code'
  | 'finance' | 'reports' | 'staff' | 'notifications' | 'settings' | 'search-engine' | 'help-faq';

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  icon: string;
  color: string;
  description: string;
  category: string[];
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  image?: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WritingTool = {
  id: string;
  name: string;
  description: string;
  icon: string;
  placeholder: string;
  fields: WritingField[];
};

export type WritingField = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
};

export type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  model: string;
  timestamp: Date;
  size?: string;
  style?: string;
};

export type AudioFile = {
  id: string;
  name: string;
  transcript?: string;
  translation?: string;
  language?: string;
  timestamp: Date;
};

export type Tab = {
  id: string;
  label: string;
  icon: string;
};

export type UserPlan = 'free' | 'pro' | 'business';

export type User = {
  name: string;
  email: string;
  avatar: string;
  plan: UserPlan;
  credits: number;
  maxCredits: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  nationalId: string;
  notes: string;
  createdAt: Date;
  totalSpent: number;
  totalVisits: number;
};

export type ServiceStatus = 'waiting' | 'processing' | 'review' | 'completed' | 'delivered';

export type ServiceTicket = {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  serviceType: string;
  description: string;
  status: ServiceStatus;
  queuePosition: number;
  amount: number;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PrintJob = {
  id: string;
  fileName: string;
  pages: number;
  copies: number;
  colorMode: 'black-white' | 'color';
  paperSize: string;
  status: 'queued' | 'printing' | 'completed' | 'failed';
  cost: number;
  customerName: string;
  createdAt: Date;
};

export type StaffMember = {
  id: string;
  name: string;
  role: 'attendant' | 'manager' | 'owner';
  email: string;
  phone: string;
  avatar: string;
  status: 'active' | 'inactive' | 'break';
  servicesCompleted: number;
  revenue: number;
  joinedAt: Date;
};

export type Transaction = {
  id: string;
  type: string;
  customerName: string;
  amount: number;
  paymentMethod: 'cash' | 'mpesa' | 'card';
  createdAt: Date;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
};

export type StoredDocument = {
  id: string;
  name: string;
  type: string;
  size: string;
  customerId?: string;
  customerName?: string;
  category: 'cv' | 'letter' | 'certificate' | 'id' | 'receipt' | 'other';
  url?: string;
  createdAt: Date;
};
