import { useState } from 'react';
import {
  HelpCircle, Search, ChevronDown, ChevronUp, BookOpen, Clock, Shield,
  FileText, Printer, Briefcase, Key, ArrowRight,
  MessageSquare, User, Send, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Customer, } from '../types';

interface HelpFaqProps {
  customers: Customer[];
  addServiceTicket: (ticket: any) => void;
  setActiveCategory?: (category: any) => void;
}

type FAQCategory = 'all' | 'general' | 'gov' | 'printing' | 'ai' | 'payments';

interface FAQ {
  question: string;
  answer: string;
  category: FAQCategory;
  tags: string[];
}

interface ServiceGuide {
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
  steps: string[];
}

export default function HelpFaqView({ customers, addServiceTicket, setActiveCategory }: HelpFaqProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'faq' | 'guides' | 'ticket' | 'shortcuts'>('faq');
  const [activeSubCategory, setActiveSubCategory] = useState<FAQCategory>('all');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Ticket Form state
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]?.id || '');
  const [serviceType, setServiceType] = useState('General Consultation');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(100);
  const [ticketStatus, setTicketStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const faqs: FAQ[] = [
    {
      question: 'What are your operating hours?',
      answer: 'Acybercafe is open from Monday to Saturday from 7:00 AM to 9:00 PM, and on Sundays from 10:00 AM to 6:00 PM (EAT). Services submitted online during after-hours will be prioritized first thing on the next business day.',
      category: 'general',
      tags: ['time', 'schedule', 'opening', 'hours', 'sunday']
    },
    {
      question: 'What payment options are accepted?',
      answer: 'We accept cashless payments through M-PESA (via Paybill or Lipa na M-PESA), most major Credit/Debit Cards (Visa/Mastercard), and Direct Cash. All online services must be fully paid or deposit-secured to begin processing.',
      category: 'payments',
      tags: ['charges', 'payment', 'money', 'mpesa', 'cash', 'card']
    },
    {
      question: 'How do I submit documents for printing remotely?',
      answer: 'You can submit documents directly using the "Printing Center" operational view by uploading your file (PDF, Word doc, images), setting color preferences, and clicking submit. Alternatively, send files via email to print@acybercafe.co.ke with instructions.',
      category: 'printing',
      tags: ['print', 'upload', 'pdf', 'remote', 'email']
    },
    {
      question: 'How can I file KRA Nil Returns?',
      answer: 'Navigate to "Gov. Services", select "KRA Nil Returns", provide your KRA PIN and password. If you forgot your password, submit a retrieval request under the support tickets tab, and our operations staff will perform KRA PIN/password recovery for you.',
      category: 'gov',
      tags: ['kra', 'tax', 'returns', 'nil', 'itax']
    },
    {
      question: 'What is required for a Certificate of Good Conduct Application?',
      answer: 'You require: 1) A registered eCitizen account, 2) Your national ID card scan, and 3) Payment of the government fee (KES 1,050) plus our standard facilitation fee of KES 150. You can initiate this easily under "Gov. Services".',
      category: 'gov',
      tags: ['ecitizen', 'good conduct', 'police', 'cid']
    },
    {
      question: 'How does the AI Assistant credits system work?',
      answer: 'Every account is provisioned with a daily credit allowance (e.g. up to 450,000 credits). Generation tools consume credits based on compute needs: e.g., AI Chat and custom AI Code tools consume ~500 credits per message, while AI image/video helpers consume upwards of 2,000 credits per render.',
      category: 'ai',
      tags: ['credits', 'ai', 'co-pilot', 'tokens', 'gemini']
    },
    {
      question: 'How secure is the File Vault (Documents) storage?',
      answer: 'Your personal data security is our absolute priority. Files uploaded to the File Vault are securely isolated, fully encrypted in transit, and are strictly deleted from primary servers 24 hours after their corresponding service tickets are delivered/closed.',
      category: 'printing',
      tags: ['safe', 'vault', 'privacy', 'security', 'data', 'delete']
    },
    {
      question: 'Can I request custom design and branding services?',
      answer: 'Yes! Our custom "Design Studio" tab enables you to generate custom collateral, create layouts, and submit logo/flyer drafts. Our in-house designers then polish and print the physical files for you on glossy, cardstock, or matte papers.',
      category: 'printing',
      tags: ['design', 'studio', 'branding', 'logo', 'cards']
    }
  ];

  const guides: ServiceGuide[] = [
    {
      title: 'Printing & Photocopying Services',
      icon: Printer,
      color: 'text-orange-400 bg-orange-500/10 border-orange-300',
      description: 'Step-by-step procedure to send PDFs or documents to our network printers.',
      steps: [
        'Move to the "Printing Center" tab in the sidebar operations rail.',
        'Choose local documents or drag and drop files from your desktop/device.',
        'Customize options: specify number of copies, paper size (A4/A3), and color mode (Color vs Black & White).',
        'Review the dynamically calculated price quote.',
        'Submit the job. It will automatically queue on our central multi-function print console.'
      ]
    },
    {
      title: 'KRA iTax and Tax Clearance',
      icon: FileText,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'How to file annual KRA returns, apply for PINs, or request Tax Compliance Certificates.',
      steps: [
        'Open the "Gov. Services" area of current interface.',
        'Choose "KRA Nil Returns" or "PIN Registration/TCC Request".',
        'Upload your current KRA credentials or National Identity card details.',
        'Select the customer profile to assign the task from the customer directory or create a new one.',
        'Submit. Our experienced back-office agents process the application and return the KRA acknowledgment stub directly to your File Vault profile.'
      ]
    },
    {
      title: 'eCitizen & Passport Administration',
      icon: Briefcase,
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      description: 'Official application services for good conduct certificates, business registrations, or passports.',
      steps: [
        'Under "Gov. Services", select "eCitizen applications" and select the exact government service required.',
        'Fill in the accurate biographical data requested.',
        'Our state-of-the-art backend prompts verification codes secure channel integration directly with eCitizen portal.',
        'Complete payments securely through our MPESA billing gateway.',
        'The official receipts, appointment slips, or PDF downloads will be generated and notified to you instantly.'
      ]
    },
    {
      title: 'Leveraging AI Suite (Chat, Writing & Imagery)',
      icon: Key,
      color: 'text-brand-primary bg-brand-primary/10 text-brand-primary border-brand-primary/20',
      description: 'Gain ultimate productivity using high-speed Gemini-powered creative suite.',
      steps: [
        'Access the dedicated tools under the "AI Assistant" section in your sidebar.',
        'Use "AI Chat" to ask questions, check business ideas, or design resumes.',
        'Utilize "AI Writing" to input quick parameters and draft covers, letters, or reports instantly.',
        'Convert prompt descriptions into visually stunning creative assets with "AI Image".',
        'Rest assured: your prompt history is preserved locally to maximize your workflow convenience.'
      ]
    }
  ];

  // Filtering FAQ logic
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = activeSubCategory === 'all' || faq.category === activeSubCategory;

    return matchesSearch && matchesCategory;
  });

  // Category buttons
  const categories: { id: FAQCategory; label: string }[] = [
    { id: 'all', label: 'All Questions' },
    { id: 'general', label: 'General Usage' },
    { id: 'gov', label: 'Gov & Tax' },
    { id: 'printing', label: 'Printing & Vault' },
    { id: 'payments', label: 'Payments' },
    { id: 'ai', label: 'AI Assistants' }
  ];

  // Handle support ticket creation
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setTicketStatus({ type: 'error', message: 'Please select a customer or define a guest profile.' });
      return;
    }
    if (!description.trim()) {
      setTicketStatus({ type: 'error', message: 'Please specify the assistance details required.' });
      return;
    }

    const customerObj = customers.find(c => c.id === selectedCustomer);
    const customerName = customerObj ? customerObj.name : 'Walk-in Customer';

    addServiceTicket({
      customerId: selectedCustomer,
      customerName,
      serviceType,
      description,
      status: 'waiting',
      amount: Number(amount),
      assignedTo: 'Attendant'
    });

    setTicketStatus({
      type: 'success',
      message: `Support Ticket created successfully! Queue position allocated. Check 'Services' view to track.`
    });

    // Reset Form
    setDescription('');
    setTimeout(() => setTicketStatus(null), 6000);
  };

  return (
    <div id="help_faq_root" className="h-full overflow-y-auto bg-surface-bg p-4 md:p-6 space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-brand-primary/10 pb-5 gap-4">
        <div>
          <h2 className="text-text-primary text-lg font-bold flex items-center gap-2 tracking-tight">
            <HelpCircle className="w-5 h-5 text-brand-primary" /> Need Help & Support?
          </h2>
          <p className="text-xs text-gray-600 mt-1">Get immediate answers, master the cyber cafe workflows, or request attendant assistance.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 border border-gray-200 p-0.5 rounded-lg text-xs self-start md:self-auto">
          {[
            { id: 'faq', label: 'FAQs', icon: HelpCircle },
            { id: 'guides', label: 'Service Manuals', icon: BookOpen },
      { id: 'shortcuts', label: 'Shortcuts', icon: Key },
      { id: 'ticket', label: 'Submit Ticket', icon: MessageSquare }
    ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white text-text-primary shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'faq' && (
        <div className="space-y-6">
          {/* Search bar & statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-600" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search queries, tags, keywords (e.g. 'KRA', 'invoice', 'mpesa')..."
                className="w-full bg-white/3 border border-white/8 hover:border-white/12 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder-gray-400 focus:outline-none focus:border-brand-primary/50 transition-all shadow-inner"
              />
            </div>
            
            <div className="bg-gradient-to-br from-cyan-950/20 to-blue-950/20 border border-brand-primary/10 rounded-xl p-3 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] text-brand-primary font-semibold uppercase tracking-wider">Fast-track Response</span>
              <span className="text-text-primary text-xs mt-1 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-primary" /> Avg. Ticket: &lt; 4 mins
              </span>
            </div>
          </div>

          {/* Sub-categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveSubCategory(cat.id);
                  setExpandedFaqIndex(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeSubCategory === cat.id
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30 text-brand-primary'
                    : 'bg-white/3 border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQs List */}
          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => {
                const isExpanded = expandedFaqIndex === index;
                return (
                  <div
                    key={index}
                    className={`bg-white/3 border border-white/8 rounded-xl transition-all overflow-hidden ${
                      isExpanded ? 'ring-1 ring-brand-primary/20 bg-white/[0.04]' : 'hover:border-white/12'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left gap-4"
                    >
                      <span className="text-sm text-text-primary/90 font-medium">{faq.question}</span>
                      <span className="text-gray-600 bg-gray-100 hover:bg-gray-200 p-1 rounded-md transition-colors flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-brand-primary" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/3">
                          <span className="text-[9px] bg-cyan-950/30 text-brand-primary border border-brand-primary/10 rounded px-1.5 py-0.5 capitalize">
                            Category: {faq.category}
                          </span>
                          {faq.tags.map(tag => (
                            <span key={tag} className="text-[9px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white/3 border border-gray-100 rounded-xl">
                <AlertCircle className="w-8 h-8 text-text-primary/20 mx-auto mb-3" />
                <p className="text-gray-700 text-sm">No FAQs match your search query.</p>
                <p className="text-gray-600 text-xs mt-1">Try seeking a different keyword or view the service manuals.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'guides' && (
        <div className="space-y-6">
          <div className="border border-gray-100 bg-gradient-to-br from-cyan-950/10 to-blue-950/10 rounded-xl p-4 flex gap-3">
            <BookOpen className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-text-primary">How-to Service Guides</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Step-by-step documentation for performing tasks as an operator or guiding customers. 
                Select a protocol below to discover requirements.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {guides.map((guide, gIdx) => {
              const Icon = guide.icon;
              return (
                <div key={gIdx} className="bg-white/3 border border-white/8 rounded-xl p-5 hover:border-white/12 transition-all flex flex-col h-full">
                  <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-gray-100">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${guide.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm text-text-primary font-semibold">{guide.title}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{guide.description}</p>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    {guide.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-950 text-brand-primary border border-brand-primary/20 flex items-center justify-center text-[10px] font-bold">
                          {sIdx + 1}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed flex-1 pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ticket' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Request Form */}
          <div className="lg:col-span-2 bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-sm text-text-primary font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-primary" /> Create Attendant Support Ticket
              </h4>
              <p className="text-xs text-gray-600 mt-1">Submit technical assistance queries directly to our physical cyber desk operators.</p>
            </div>

            {ticketStatus && (
              <div className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                ticketStatus.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border-green-300'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {ticketStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{ticketStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-1">Select Customer Profile</label>
                  <select
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    className="w-full bg-surface-bg border border-gray-200 rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary/50"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-1">Service category</label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    className="w-full bg-surface-bg border border-gray-200 rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary/50"
                  >
                    <option value="KRA Nil Returns">KRA Nil Returns filing</option>
                    <option value="eCitizen Applications">eCitizen Facilitation</option>
                    <option value="Design & Print">Design Studio Printing</option>
                    <option value="General Consultation">General PC Consultation</option>
                    <option value="ID/Passport Photocopy">Biometric/National ID Services</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-1">Service Fee Quote (KES)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    min={0}
                    className="w-full bg-surface-bg border border-gray-200 rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-1">Assigned Support Desk</label>
                  <input
                    type="text"
                    disabled
                    value="General Cyber Operations"
                    className="w-full bg-white/3 border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-1">Support Instruction Details</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what help you require. E.g., Forgot KRA iTax Password, please retrieve PIN online, verify status..."
                  rows={4}
                  className="w-full bg-surface-bg border border-gray-200 rounded-lg p-3 text-xs text-text-primary placeholder-white/20 focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-brand-primary text-white hover:bg-brand-primary text-white active:bg-cyan-700 text-text-primary text-xs font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Ticket to Queue
                </button>
              </div>
            </form>
          </div>

          {/* Quick info panel on hand */}
          <div className="space-y-4">
            <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-3">
              <h5 className="text-text-primary text-xs font-semibold uppercase tracking-wider text-brand-primary">Desk Operations</h5>
              <div className="space-y-3.5 mt-2 text-xs">
                <div className="flex gap-2.5">
                  <User className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-800 font-medium">Remote Support</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Reach desk operator instantly via local network queue tracking codes.</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-800 font-medium">Automatic Alerts</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Get live toast notifications when your ticket status updates to complete.</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <Shield className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-800 font-medium">Encrypted Stubs</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Official acknowledgments generated by KRA and eCitizen portals are signed with Secure SSL stubs.</p>
                  </div>
                </div>
              </div>
            </div>

            {setActiveCategory && (
              <div className="bg-gradient-to-br from-cyan-950/20 to-blue-950/20 border border-brand-primary/10 rounded-xl p-5 text-center space-y-3.5">
                <HelpCircle className="w-6 h-6 text-brand-primary mx-auto" />
                <div>
                  <h6 className="text-xs text-text-primary font-semibold">Still Having Issues?</h6>
                  <p className="text-[11px] text-gray-600 mt-1">Chat in real-time with our trained multi-modal AI Helper assistant!</p>
                </div>
                <button
                  onClick={() => setActiveCategory('ai-chat')}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-text-primary text-xs font-semibold rounded-lg border border-gray-200 hover:border-white/15 transition-all flex items-center justify-center gap-1.5"
                >
                  Launch AI Chat
                  <ArrowRight className="w-3.5 h-3.5 text-brand-primary" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'shortcuts' && (
        <div className="space-y-6">
          <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-4">
            <h4 className="text-sm text-text-primary font-semibold flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-primary" /> Keyboard Shortcuts Customization
            </h4>
            <p className="text-xs text-gray-600">Customize the command shortcuts used throughout the application.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { label: 'Global Search', defaultKey: 'Ctrl + K' },
                { label: 'New Ticket', defaultKey: 'Ctrl + T' },
                { label: 'AI Chat', defaultKey: 'Ctrl + Shift + A' },
                { label: 'Print Center', defaultKey: 'Ctrl + P' }
              ].map((shortcut, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-surface-bg">
                  <span className="text-xs font-medium text-gray-700">{shortcut.label}</span>
                  <input 
                    type="text" 
                    defaultValue={shortcut.defaultKey} 
                    className="bg-white border border-gray-200 text-xs px-2 py-1 rounded text-center focus:outline-brand-primary w-24 text-gray-600"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <button className="bg-brand-primary text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all">
                Save Shortcuts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
