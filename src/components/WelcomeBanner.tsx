import { Sparkles, ArrowRight, Zap, Image, Mic, Video, FileText, Code2 } from 'lucide-react';

const FEATURE_CARDS = [
  { icon: Sparkles, label: 'AI Chat', desc: 'Chat with GPT-4, Claude, Gemini & more', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-brand-accent' },
  { icon: Image, label: 'AI Image', desc: 'Generate stunning images with DALL-E, Midjourney', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: Mic, label: 'AI Audio', desc: 'Transcribe, translate and generate speech', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-300' },
  { icon: Video, label: 'AI Video', desc: 'Create videos from text with Luma, Runway', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { icon: FileText, label: 'AI Docs', desc: 'Chat with any PDF or document', color: 'text-brand-primary', bg: 'bg-brand-primary/10 text-brand-primary', border: 'border-brand-primary/20' },
  { icon: Code2, label: 'AI Code', desc: 'Generate, debug and explain code', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
];

export default function WelcomeBanner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/30">
        <Sparkles className="w-8 h-8 text-text-primary" />
      </div>
      <h1 className="text-4xl font-bold text-text-primary mb-3">
        Welcome to <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">CyberPlus</span>
      </h1>
      <p className="text-gray-600 text-lg mb-10 max-w-xl">
        Your all-in-one AI app powered by GPT-4, Claude, Gemini, and 20+ more models. Get more done in less time.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl mb-10">
        {FEATURE_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`flex items-start gap-3 p-4 rounded-xl border ${card.bg} ${card.border} text-left`}
            >
              <Icon className={`w-5 h-5 ${card.color} flex-shrink-0 mt-0.5`} />
              <div>
                <div className="font-semibold text-gray-800 text-sm">{card.label}</div>
                <div className="text-gray-600 text-xs mt-0.5 leading-relaxed">{card.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          450,000 free credits/month
        </div>
        <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">
          <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
          No credit card required
        </div>
      </div>
    </div>
  );
}
