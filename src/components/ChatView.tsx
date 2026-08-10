import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Copy, ThumbsUp, ThumbsDown, RotateCcw,
  Paperclip, Mic, StopCircle, ChevronDown, Sparkles, Zap,
  CheckCircle2, Globe, BookOpen, Code2, Terminal
} from 'lucide-react';
import { Conversation, AIModel } from '../types';
import { CHAT_MODELS } from '../data/models';
import { cn } from '../utils/cn';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../store/useAppStore';
import { parseCavemanClipboard, generateCavemanTaskPrompt } from '../lib/caveman';

interface ChatViewProps {
  conversation: Conversation | undefined;
  onSendMessage: (msg: string, model?: string) => void;
  isLoading: boolean;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  onNewChat?: () => void;
}

const QUICK_PROMPTS = [
  { label: 'Write an article', icon: BookOpen, prompt: 'Write a comprehensive article about the future of artificial intelligence and its impact on society.' },
  { label: 'Generate code', icon: Code2, prompt: 'Write a Python function that sorts a list of dictionaries by multiple keys with support for ascending and descending order.' },
  { label: 'Translate text', icon: Globe, prompt: 'Translate the following text to French: "The future belongs to those who believe in the beauty of their dreams."' },
  { label: 'Creative story', icon: Sparkles, prompt: 'Write a short science fiction story about a world where AI and humans have achieved perfect symbiosis.' },
];

export default function ChatView({ conversation, onSendMessage, isLoading, selectedModel, setSelectedModel }: ChatViewProps) {
  const [input, setInput] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMultiModel, setIsMultiModel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const { pendingBoostPrompt, setPendingBoostPrompt } = useAppStore();

  const handleCavemanClipboardBoost = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        const entities = parseCavemanClipboard(clipText);
        setInput(generateCavemanTaskPrompt(entities));
        return;
      }
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
    const sample = 'SMS from KRA: PIN A001234567X for JOHN KAMAU MWANGI ID: 12345678. Nil returns due. Ref QKH9281X23 KES 200 paid.';
    const entities = parseCavemanClipboard(sample);
    setInput(generateCavemanTaskPrompt(entities));
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input, selectedModel);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentModel = CHAT_MODELS.find(m => m.id === selectedModel);
  const messages = conversation?.messages || [];

  const groupedModels = CHAT_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  return (
    <div className="flex flex-col h-full bg-surface-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <Bot className="w-5 h-5 text-violet-400" />
          <h2 className="text-text-primary font-semibold">AI Chat</h2>
          <span className="text-gray-600 text-sm">—</span>
          <span className="text-gray-600 text-sm truncate">{conversation?.title || 'New Conversation'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMultiModel(!isMultiModel)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
              isMultiModel
                ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                : 'text-gray-600 border-gray-200 hover:text-gray-600'
            )}
          >
            <Zap className="w-3 h-3" />
            Multi-AI
          </button>
          {/* Model Picker */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 transition-all"
            >
              <span>{currentModel?.icon || '🤖'}</span>
              <span className="max-w-24 truncate">{currentModel?.name || selectedModel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
            </button>
            {showModelPicker && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-surface-card border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Select AI Model</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {Object.entries(groupedModels).map(([provider, models]) => (
                    <div key={provider}>
                      <div className="px-3 py-2 text-xs text-gray-600 font-semibold uppercase tracking-wider bg-white/2">{provider}</div>
                      {models.map(model => (
                        <button
                          key={model.id}
                          onClick={() => { setSelectedModel(model.id); setShowModelPicker(false); }}
                          className={cn(
                            'flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-100 transition-colors text-left',
                            selectedModel === model.id && 'bg-violet-500/10'
                          )}
                        >
                          <span className="text-lg">{model.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-800 font-medium">{model.name}</div>
                            <div className="text-xs text-gray-600 truncate">{model.description}</div>
                          </div>
                          {selectedModel === model.id && <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6" onClick={() => setShowModelPicker(false)}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">What can I help with?</h3>
            <p className="text-gray-600 mb-8 max-w-md">
              I'm powered by {currentModel?.name || 'multiple AI models'}. Ask me anything!
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
              {QUICK_PROMPTS.map((qp) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={qp.label}
                    onClick={() => { setInput(qp.prompt); inputRef.current?.focus(); }}
                    className="flex items-start gap-3 text-left p-4 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-violet-500/30 rounded-xl transition-all group"
                  >
                    <Icon className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-800 font-medium group-hover:text-white transition-colors">{qp.label}</div>
                      <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{qp.prompt}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-4', msg.role === 'user' && 'flex-row-reverse')}>
              {/* Avatar */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-violet-500 to-blue-500'
                  : 'bg-gradient-to-br from-gray-700 to-gray-600'
              )}>
                {msg.role === 'user'
                  ? <User className="w-4 h-4 text-text-primary" />
                  : <Bot className="w-4 h-4 text-text-primary" />
                }
              </div>

              {/* Message bubble */}
              <div className={cn(
                'flex flex-col gap-1 max-w-3xl',
                msg.role === 'user' ? 'items-end' : 'items-start'
              )}>
                {msg.role === 'assistant' && msg.model && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs text-gray-600 font-medium">
                      {CHAT_MODELS.find(m => m.id === msg.model)?.name || msg.model}
                    </span>
                  </div>
                )}
                <div className={cn(
                  'rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-violet-600 text-text-primary rounded-tr-sm'
                    : 'bg-gray-100 text-text-primary/85 rounded-tl-sm border border-white/8'
                )}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isBlock = className?.includes('language-');
                            return isBlock ? (
                              <div className="relative mt-2 mb-2">
                                <div className="flex items-center justify-between bg-gray-100 rounded-t-lg px-3 py-1.5 border border-gray-200">
                                  <span className="text-xs text-gray-600 font-mono">{match ? match[1] : 'code'}</span>
                                  <button
                                    onClick={() => copyToClipboard(String(children), `code-${msg.id}`)}
                                    className="text-xs text-gray-600 hover:text-gray-700 transition-colors flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    {copiedId === `code-${msg.id}` ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                                <pre className="bg-black/40 rounded-b-lg p-3 overflow-x-auto border border-t-0 border-gray-200">
                                  <code className="text-green-300 text-xs font-mono" {...props}>{children}</code>
                                </pre>
                              </div>
                            ) : (
                              <code className="bg-gray-200 rounded px-1.5 py-0.5 text-violet-300 text-xs font-mono" {...props}>{children}</code>
                            );
                          },
                          h1: ({ children }) => <h1 className="text-xl font-bold text-text-primary mb-2 mt-3">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-bold text-text-primary mb-2 mt-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-semibold text-text-primary/90 mb-1 mt-2">{children}</h3>,
                          p: ({ children }) => <p className="text-gray-800 mb-2 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-gray-800">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-gray-800">{children}</ol>,
                          li: ({ children }) => <li className="text-gray-800">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
                          hr: () => <hr className="border-gray-200 my-3" />,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-violet-500 pl-3 italic text-gray-600">{children}</blockquote>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Message actions */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-all"
                    >
                      {copiedId === msg.id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button className="p-1.5 rounded-lg text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-all">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-all">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-all">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-text-primary" />
            </div>
            <div className="bg-gray-100 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100">
        {pendingBoostPrompt && (
          <div className="mb-3 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-400 truncate">Caveman Task Boost Active — Clipboard Entities Ready</div>
                <div className="text-[10px] text-gray-400 truncate">{pendingBoostPrompt.slice(0, 90)}...</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  onSendMessage(pendingBoostPrompt, selectedModel);
                  setPendingBoostPrompt(null);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md"
              >
                Send Caveman Boost
              </button>
              <button
                onClick={() => setPendingBoostPrompt(null)}
                className="px-2 py-1 text-gray-400 hover:text-white text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="relative bg-gray-100 border border-gray-200 rounded-2xl focus-within:border-violet-500/50 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message CyberPlus..."
            rows={1}
            className="w-full bg-transparent text-gray-800 placeholder-gray-400 text-sm px-4 py-3 pr-32 resize-none focus:outline-none min-h-[48px] max-h-40"
            style={{ lineHeight: '1.5' }}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCavemanClipboardBoost}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              title="Caveman Task Boost (Paste Clipboard & Extract PINs/IDs)"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Caveman Boost</span>
            </button>
            <button className="p-1.5 text-gray-600 hover:text-gray-600 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-gray-600 hover:text-gray-600 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                'p-2 rounded-xl transition-all',
                input.trim() && !isLoading
                  ? 'bg-violet-600 hover:bg-violet-500 text-text-primary'
                  : 'bg-gray-100 text-text-primary/20 cursor-not-allowed'
              )}
            >
              {isLoading ? <StopCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-text-primary/20 mt-2">
          CyberPlus can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
