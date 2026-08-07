import  { useState, useRef, useEffect } from 'react';
import { Send, Bot, Paperclip, FileText, File, Download, Image as ImageIcon, Briefcase, FileSignature, Files, ClipboardList, Plus, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAppStore } from '../store/useAppStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  fileUrl?: string;
  fileName?: string;
}

export default function CyberAgentView() {
  const { prompts, addPrompt } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    role: 'agent',
    text: 'Hello! I am your AI Cyber Agent. I can help you with filling government forms, formatting documents, resizing passport photos, and manipulating PDFs. What would you like to do today?'
  }]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskType, setActiveTaskType] = useState<string>('document_formatter');
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState('general');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      fileName: selectedFile?.name
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('prompt', input);
    formData.append('taskType', activeTaskType);
    
    // Add conversation history
    const history = messages.map(m => `${m.role}: ${m.text}`).join('\n');
    formData.append('history', history);
    
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await fetch('/api/agent/process', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'agent',
          text: data.text || "Task complete.",
          fileUrl: data.fileUrl
        }]);
        if (data.fileUrl) {
          setActivePreviewUrl(data.fileUrl);
        }
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'agent',
          text: `Error: ${data.error}`
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'agent',
        text: `Network Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="flex h-full bg-surface-bg overflow-hidden">
      {/* Sidebar: Chat */}
      <div className="w-1/3 min-w-[350px] border-r border-gray-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-text-primary font-semibold flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-brand-primary" /> AI Agent
          </h2>
          <p className="text-gray-600 text-xs mt-1">Automate tasks in seconds</p>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button 
              onClick={() => setActiveTaskType('document_formatter')}
              className={cn("px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 border transition-colors", activeTaskType === 'document_formatter' ? "bg-brand-primary/20 text-brand-primary border-brand-primary/30 text-brand-primary" : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200")}>
              <Briefcase className="w-3.5 h-3.5" /> Formatter
            </button>
            <button 
              onClick={() => setActiveTaskType('government_form')}
              className={cn("px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 border transition-colors", activeTaskType === 'government_form' ? "bg-brand-primary/20 text-brand-primary border-brand-primary/30 text-brand-primary" : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200")}>
              <FileSignature className="w-3.5 h-3.5" /> Forms
            </button>
            <button 
              onClick={() => setActiveTaskType('passport_photo')}
              className={cn("px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 border transition-colors", activeTaskType === 'passport_photo' ? "bg-brand-primary/20 text-brand-primary border-brand-primary/30 text-brand-primary" : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200")}>
              <ImageIcon className="w-3.5 h-3.5" /> Passport
            </button>
            <button 
              onClick={() => setActiveTaskType('pdf_toolkit')}
              className={cn("px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 border transition-colors", activeTaskType === 'pdf_toolkit' ? "bg-brand-primary/20 text-brand-primary border-brand-primary/30 text-brand-primary" : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200")}>
              <Files className="w-3.5 h-3.5" /> PDF Tools
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3 max-w-[90%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.role === 'user' ? "bg-blue-600" : "bg-brand-primary/10")}>
                {msg.role === 'user' ? <UserIcon /> : <Bot className="w-4 h-4 text-brand-primary" />}
              </div>
              <div className={cn("rounded-2xl p-3 text-sm shadow-sm", msg.role === 'user' ? "bg-blue-600 text-text-primary" : "bg-gray-100 border border-gray-200 text-gray-800")}>
                {msg.text}
                {msg.fileName && (
                  <div className="mt-2 flex items-center gap-2 bg-black/20 p-2 rounded text-xs">
                    <File className="w-4 h-4 text-gray-600" /> {msg.fileName}
                  </div>
                )}
                {msg.fileUrl && (
                  <button onClick={() => setActivePreviewUrl(msg.fileUrl!)} className="mt-2 text-brand-primary text-xs font-medium flex items-center gap-1 hover:underline">
                    <FileText className="w-3 h-3" /> View Generated File
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[90%]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-brand-primary/10">
                <Bot className="w-4 h-4 text-brand-primary animate-pulse" />
              </div>
              <div className="rounded-2xl p-3 text-sm bg-gray-100 border border-gray-200 text-gray-600 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Processing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 shrink-0 bg-surface-bg relative">
          {showPromptLibrary && (
            <div className="absolute bottom-[calc(100%+8px)] left-4 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-10 flex flex-col max-h-96">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-xs text-gray-800 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Prompt Library
                </h3>
                <button onClick={() => { setShowPromptLibrary(false); setIsCreatingPrompt(false); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {isCreatingPrompt ? (
                <div className="p-3 space-y-3 flex-1 overflow-y-auto bg-white">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Prompt Name</label>
                    <input type="text" value={newPromptName} onChange={e => setNewPromptName(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-primary" placeholder="e.g. Enhance Image" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Category</label>
                    <select value={newPromptCategory} onChange={e => setNewPromptCategory(e.target.value)} className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-primary bg-white">
                      <option value="general">General</option>
                      <option value="document_formatter">Document Formatter</option>
                      <option value="government_form">Government Forms</option>
                      <option value="passport_photo">Passport Photo</option>
                      <option value="pdf_toolkit">PDF Toolkit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Content</label>
                    <textarea value={newPromptContent} onChange={e => setNewPromptContent(e.target.value)} rows={3} className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-primary resize-none" placeholder="Enter the prompt template..." />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setIsCreatingPrompt(false)} className="flex-1 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Cancel</button>
                    <button 
                      onClick={() => {
                        if (newPromptName && newPromptContent) {
                          addPrompt({ name: newPromptName, content: newPromptContent, category: newPromptCategory, pinned: false });
                          setIsCreatingPrompt(false);
                          setNewPromptName('');
                          setNewPromptContent('');
                        }
                      }}
                      disabled={!newPromptName || !newPromptContent}
                      className="flex-1 py-1.5 text-xs text-white bg-brand-primary hover:bg-cyan-700 rounded-lg font-medium disabled:opacity-50"
                    >Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
                    {['all', 'document_formatter', 'government_form', 'passport_photo', 'pdf_toolkit'].map(cat => (
                       <button key={cat} onClick={() => setNewPromptCategory(cat)} className={cn("text-[10px] px-2 py-1 rounded-full whitespace-nowrap border transition-colors", newPromptCategory === cat ? "bg-brand-primary text-white border-brand-primary" : "bg-gray-50 text-gray-600 border-gray-200")}>
                         {cat === 'all' ? 'All' : cat.replace('_', ' ')}
                       </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[150px]">
                    {prompts.filter(p => newPromptCategory === 'all' || p.category === newPromptCategory).length === 0 ? (
                      <div className="text-center text-gray-400 text-xs py-6">No prompts found here.</div>
                    ) : (
                      prompts.filter(p => newPromptCategory === 'all' || p.category === newPromptCategory).map(prompt => (
                        <button key={prompt.id} onClick={() => { setInput(input + prompt.content); setShowPromptLibrary(false); }} className="w-full text-left p-2 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-lg transition-colors group">
                          <div className="font-medium text-xs text-gray-800">{prompt.name}</div>
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">{prompt.content}</div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-100 bg-gray-50">
                    <button onClick={() => { setIsCreatingPrompt(true); setNewPromptCategory(activeTaskType); }} className="w-full flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-200 hover:border-brand-primary text-brand-primary rounded-lg text-xs font-medium transition-colors">
                      <Plus className="w-3.5 h-3.5" /> New Prompt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedFile && (
            <div className="mb-2 flex items-center gap-2 bg-gray-100 p-2 rounded border border-gray-200 text-xs text-gray-800">
              <File className="w-4 h-4 text-brand-primary" />
              <span className="truncate">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="ml-auto text-gray-600 hover:text-white">✕</button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-gray-100 border border-gray-200 rounded-xl p-2 focus-within:border-brand-primary/50 transition-colors">
            <button onClick={() => setShowPromptLibrary(!showPromptLibrary)} className={cn("p-2 cursor-pointer transition-colors shrink-0 rounded-lg", showPromptLibrary ? "bg-brand-primary/10 text-brand-primary" : "text-gray-600 hover:text-brand-primary hover:bg-gray-200")}>
              <ClipboardList className="w-5 h-5" />
            </button>
            <label className="p-2 text-gray-600 hover:text-brand-primary cursor-pointer transition-colors shrink-0">
              <input 
                type="file" 
                className="hidden" 
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                accept={activeTaskType === 'passport_photo' ? 'image/*' : undefined}
              />
              <Paperclip className="w-5 h-5" />
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask the agent or upload a file..."
              className="flex-1 bg-transparent border-none focus:outline-none text-text-primary text-sm resize-none max-h-32 min-h-[40px] py-2"
              rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 1}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedFile)}
              className="p-2 bg-brand-primary text-white hover:bg-brand-primary text-white disabled:opacity-50 disabled:hover:bg-brand-primary text-white text-text-primary rounded-lg shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Area: Preview Canvas */}
      <div className="flex-1 bg-surface-card relative flex flex-col">
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-surface-bg">
          <h3 className="text-gray-800 font-medium">Preview Canvas</h3>
          {activePreviewUrl && (
            <a href={activePreviewUrl} download className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-gray-800 text-xs transition-colors">
              <Download className="w-3.5 h-3.5" /> Download Asset
            </a>
          )}
        </div>
        
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          {activePreviewUrl ? (
            activePreviewUrl.endsWith('.jpg') || activePreviewUrl.endsWith('.png') ? (
              <img src={activePreviewUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-sm border border-gray-200" />
            ) : (
              <iframe src={activePreviewUrl} className="w-full h-full bg-white rounded-sm shadow-2xl border border-gray-200" title="PDF Preview" />
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-text-primary/20">
              <ImagePlaceholder />
              <p className="mt-4 text-sm font-medium">Awaiting Agent Output</p>
              <p className="text-xs mt-1 max-w-xs text-center">Output documents, PDFs, and formatted images will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const ImagePlaceholder = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);
