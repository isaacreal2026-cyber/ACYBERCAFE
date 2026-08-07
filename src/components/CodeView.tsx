import { useState } from "react";
import {
  Code2,
  RefreshCw,
  Copy,
  CheckCircle2,
  Download,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { CHAT_MODELS } from "../data/models";
import { cn } from "../utils/cn";
import GitClientView from "./GitClientView";

const CODE_TOOLS = [
  {
    id: "code-generator",
    name: "Code Generator",
    icon: "⚡",
    description: "Generate code from natural language",
  },
  {
    id: "code-explainer",
    name: "Code Explainer",
    icon: "🔍",
    description: "Explain what code does",
  },
  {
    id: "code-debugger",
    name: "Code Debugger",
    icon: "🐛",
    description: "Find and fix bugs in your code",
  },
  {
    id: "code-refactor",
    name: "Code Refactorer",
    icon: "🔄",
    description: "Improve code quality and structure",
  },
  {
    id: "code-converter",
    name: "Code Converter",
    icon: "🔃",
    description: "Convert code between languages",
  },
  {
    id: "regex-generator",
    name: "Regex Generator",
    icon: "🎯",
    description: "Generate regular expressions",
  },
  {
    id: "sql-generator",
    name: "SQL Generator",
    icon: "🗄️",
    description: "Generate SQL queries from plain text",
  },
  {
    id: "test-generator",
    name: "Test Generator",
    icon: "✅",
    description: "Generate unit tests for your code",
  },
  {
    id: "code-snippets",
    name: "Code Snippets",
    icon: "✂️",
    description: "Manage your code snippets",
  },
  {
    id: "api-testing",
    name: "API Testing",
    icon: "🔌",
    description: "Test and debug APIs",
  },
  {
    id: "git-client",
    name: "Git Client",
    icon: "🐙",
    description: "Manage your version control",
  },
  {
    id: "bug-tracker",
    name: "Bug Tracker",
    icon: "🐞",
    description: "Track bugs (extension supported)",
  },
  {
    id: "dev-notes",
    name: "Dev Notes",
    icon: "📝",
    description: "Developer notes and scratchpad",
  },
  {
    id: "terminal-companion",
    name: "Terminal Companion",
    icon: "🖥️",
    description: "AI companion for terminal commands",
  },
  {
    id: "code-documentation",
    name: "Code Documentation",
    icon: "📚",
    description: "Generate code documentation",
  },
  {
    id: "prompt-manager",
    name: "Prompt Manager",
    icon: "📋",
    description: "Manage your LLM prompts",
  },
  {
    id: "ai-coding-assistant",
    name: "AI Coding Assistant",
    icon: "🤖",
    description: "Advanced AI coding companion",
  },
  {
    id: "developer-dashboard",
    name: "Developer Dashboard",
    icon: "📊",
    description: "Your main developer dashboard",
  },
];

const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
  "PHP",
  "Ruby",
  "HTML/CSS",
  "SQL",
  "Bash",
];

const generateCode = async (
  prompt: string,
  language: string,
  tool: string,
  model: string,
): Promise<string> => {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Language: ${language}\nTool: ${tool}\n\nTask:\n${prompt}`,
        type: "text",
        provider: model.includes("gemini")
          ? "gemini"
          : model.includes("llama")
            ? "groq"
            : "openrouter",
        model: model,
      }),
    });

    const data = await response.json();
    return response.ok && data.status === "success"
      ? data.text
      : data.error || "Generation failed";
  } catch (error) {
    console.error(error);
    return `// Error generating code: ${error}`;
  }
};

export default function CodeView() {
  const [activeTool, setActiveTool] = useState("code-generator");
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [outputLanguage, setOutputLanguage] = useState("Python");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const currentModel = CHAT_MODELS.find((m) => m.id === selectedModel);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await generateCode(
      prompt || inputCode,
      language,
      activeTool,
      selectedModel,
    );
    setCode(result);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext: Record<string, string> = {
      JavaScript: "js",
      TypeScript: "ts",
      Python: "py",
      Java: "java",
      "C++": "cpp",
      "C#": "cs",
      Go: "go",
      Rust: "rs",
      Swift: "swift",
      Kotlin: "kt",
      PHP: "php",
      Ruby: "rb",
      SQL: "sql",
      Bash: "sh",
    };
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext[language] || "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full bg-surface-bg flex overflow-hidden">
      {/* Left - Tools */}
      <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-700 font-semibold text-sm">
              AI Code Tools
            </span>
          </div>
          <div className="space-y-1">
            {CODE_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id);
                  setCode("");
                }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-all text-left",
                  activeTool === tool.id
                    ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-700",
                )}
              >
                <span>{tool.icon}</span>
                <div>
                  <div className="font-medium">{tool.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Model picker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5">
              Model
            </label>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 hover:border-yellow-500/30 transition-all"
            >
              <span>{currentModel?.icon}</span>
              <span className="flex-1 text-left">{currentModel?.name}</span>
              <ChevronDown className="w-3 h-3 text-gray-600" />
            </button>
            {showModelPicker && (
              <div className="mt-1 bg-surface-card border border-gray-200 rounded-lg overflow-hidden">
                {CHAT_MODELS.filter((m) => m.category.includes("code")).map(
                  (m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setShowModelPicker(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-gray-100",
                        selectedModel === m.id
                          ? "text-yellow-400"
                          : "text-gray-600",
                      )}
                    >
                      <span>{m.icon}</span>
                      <span>{m.name}</span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5">
              {activeTool === "code-converter" ? "From Language" : "Language"}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-surface-card">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {activeTool === "code-converter" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5">
                To Language
              </label>
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-yellow-500/50 transition-all"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} className="bg-surface-card">
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <Code2 className="w-4 h-4 text-yellow-400" />
          <h2 className="text-gray-800 font-semibold text-sm">
            {CODE_TOOLS.find((t) => t.id === activeTool)?.name || "Code Tool"}
          </h2>
          <span className="text-xs text-gray-600">{language}</span>
        </div>

        <div className="flex-1 flex gap-0 overflow-hidden">
          {activeTool === "git-client" ? (
            <GitClientView />
          ) : (
            <>
              {/* Input panel */}
              <div className="w-1/2 border-r border-gray-100 flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">
                    {activeTool === "code-generator" ||
                    activeTool === "sql-generator" ||
                    activeTool === "regex-generator"
                      ? "Prompt"
                      : "Input Code"}
                  </span>
                </div>
                <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
                  {activeTool === "code-generator" ||
                  activeTool === "sql-generator" ||
                  activeTool === "regex-generator" ? (
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        activeTool === "sql-generator"
                          ? "Get all users who signed up in the last 30 days with their total order count..."
                          : activeTool === "regex-generator"
                            ? "Match email addresses with optional subdomains..."
                            : "Describe what you want to build... e.g., A rate limiter class with sliding window algorithm"
                      }
                      className="flex-1 w-full bg-transparent text-gray-800 placeholder-gray-400 text-sm resize-none focus:outline-none font-mono min-h-[200px]"
                    />
                  ) : (
                    <textarea
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder={`// Paste your ${language} code here...`}
                      className="flex-1 w-full bg-transparent text-gray-800 placeholder-gray-400 text-xs resize-none focus:outline-none font-mono min-h-[200px] leading-relaxed"
                    />
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={
                      isGenerating || (!prompt.trim() && !inputCode.trim())
                    }
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all mt-auto",
                      isGenerating || (!prompt.trim() && !inputCode.trim())
                        ? "bg-yellow-500/20 text-gray-600 cursor-not-allowed"
                        : "bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20",
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
                        Generate Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output panel */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">
                    Output
                  </span>
                  {code && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-all"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-all"
                      >
                        <Download className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-600 text-sm">
                        Generating code...
                      </p>
                    </div>
                  ) : code ? (
                    <pre className="text-green-300 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      {code}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Code2 className="w-12 h-12 text-text-primary/10 mb-3" />
                      <p className="text-gray-600 text-sm">
                        Generated code will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
