import { useState } from 'react';
import { PenTool, Sparkles, Copy, Download, RefreshCw, ChevronRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { WRITING_TOOLS } from '../data/writingTools';
import { WritingTool } from '../types';
import { CHAT_MODELS } from '../data/models';
import { cn } from '../utils/cn';
import ReactMarkdown from 'react-markdown';

const generateWritingContent = async (tool: WritingTool, formData: Record<string, string>, model: string): Promise<string> => {
  try {
    const prompt = `Tool: ${tool.name}\nDescription: ${tool.description}\n\nInputs:\n${Object.entries(formData).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\nPlease generate the corresponding text based on these inputs.`;
    
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt: prompt, 
        type: "text",
        provider: model.includes("gemini") ? "gemini" : (model.includes("llama") ? "groq" : "openrouter"),
        model: model
      })
    });

    const data = await response.json();
    return response.ok && data.status === "success" ? data.text : (data.error || "Generation failed");
  } catch (error) {
    console.error(error);
    return `Error generating content: ${error}`;
  }
};

export default function WritingView() {
  const [selectedTool, setSelectedTool] = useState<WritingTool | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentModel = CHAT_MODELS.find(m => m.id === selectedModel);

  const filteredTools = WRITING_TOOLS.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerate = async () => {
    if (!selectedTool) return;
    setIsGenerating(true);
    setOutput('');
    const result = await generateWritingContent(selectedTool, formData, selectedModel);
    setOutput(result);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTool?.name || 'content'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDocx = async () => {
    if (!output || !selectedTool) return;
    try {
      const res = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTool.name,
          content: output,
          customerName: formData.fullName || formData.applicantName || 'CyberPlus Customer',
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTool.name.replace(/\s+/g, '_')}_${Date.now()}.docx`;
        a.click();
      }
    } catch (e) {
      console.error('DOCX export error:', e);
    }
  };

  const handleExportPdf = async () => {
    if (!output || !selectedTool) return;
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTool.name,
          content: output,
          customerName: formData.fullName || formData.applicantName || 'CyberPlus Customer',
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTool.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        a.click();
      }
    } catch (e) {
      console.error('PDF export error:', e);
    }
  };

  if (!selectedTool) {
    return (
      <div className="h-full bg-surface-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <PenTool className="w-6 h-6 text-green-400" />
              <h2 className="text-2xl font-bold text-text-primary">AI Writing</h2>
            </div>
            <p className="text-gray-600">Choose a writing tool to get started</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search writing tools..."
              className="w-full max-w-sm bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-500/50 transition-all"
            />
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => { setSelectedTool(tool); setFormData({}); setOutput(''); }}
                className="flex items-start gap-4 p-5 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-green-500/30 rounded-xl text-left transition-all group"
              >
                <span className="text-3xl">{tool.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-text-primary/90 group-hover:text-white transition-colors">{tool.name}</h3>
                    <ChevronRight className="w-4 h-4 text-text-primary/20 group-hover:text-green-400 transition-colors" />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{tool.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => { setSelectedTool(null); setOutput(''); }}
          className="flex items-center gap-2 text-gray-600 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedTool.icon}</span>
          <h2 className="text-text-primary font-semibold">{selectedTool.name}</h2>
        </div>
        {/* Model selector */}
        <div className="ml-auto">
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-green-500/50 transition-all"
          >
            {CHAT_MODELS.slice(0, 8).map(m => (
              <option key={m.id} value={m.id} className="bg-surface-card">{m.icon} {m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Input */}
        <div className="w-96 flex-shrink-0 border-r border-gray-100 overflow-y-auto">
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">{selectedTool.description}</p>
            {selectedTool.fields.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.id] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={5}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500/50 transition-all resize-none"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.id] || field.options?.[0] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-green-500/50 transition-all"
                  >
                    {field.options?.map(opt => (
                      <option key={opt} value={opt} className="bg-surface-card">{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData[field.id] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500/50 transition-all"
                  />
                )}
              </div>
            ))}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all',
                isGenerating
                  ? 'bg-green-600/50 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-text-primary'
              )}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {output ? (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600 font-medium">Generated Output</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                    title="Download raw .txt file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    TXT
                  </button>
                  <button
                    onClick={handleExportDocx}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-all shadow-sm hover-lift"
                    title="Export as Microsoft Word (.docx) file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    DOCX
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all shadow-sm hover-lift"
                    title="Export as PDF (.pdf) file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-2xl font-bold text-text-primary mb-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold text-text-primary/90 mb-2 mt-4">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold text-gray-800 mb-1 mt-3">{children}</h3>,
                      p: ({ children }) => <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-700">{children}</ol>,
                      li: ({ children }) => <li className="text-gray-700">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-text-primary/90">{children}</strong>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-green-500 pl-4 italic text-gray-600 my-3">{children}</blockquote>,
                      hr: () => <hr className="border-gray-200 my-4" />,
                      table: ({ children }) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse text-sm">{children}</table></div>,
                      th: ({ children }) => <th className="border border-gray-200 px-3 py-2 bg-gray-100 text-gray-700 text-left">{children}</th>,
                      td: ({ children }) => <td className="border border-gray-200 px-3 py-2 text-gray-600">{children}</td>,
                    }}
                  >
                    {output}
                  </ReactMarkdown>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-8">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
                  <p className="text-gray-600">Generating your content...</p>
                  <p className="text-xs text-gray-600">Powered by {currentModel?.name}</p>
                </div>
              ) : (
                <div>
                  <PenTool className="w-12 h-12 text-text-primary/20 mx-auto mb-4" />
                  <h3 className="text-gray-600 font-medium mb-2">Ready to generate</h3>
                  <p className="text-gray-600 text-sm">Fill in the fields on the left and click Generate</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
