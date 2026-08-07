import { Palette, ExternalLink, Layers, Image as ImageIcon, FileText, Award, LayoutTemplate, Plus, Check } from 'lucide-react';
import { useState } from 'react';

const TEMPLATES = [
  { id: 'poster', label: 'Poster', icon: ImageIcon, color: 'text-pink-400', bg: 'bg-pink-500/10', desc: 'Eye-catching posters for events & promotions' },
  { id: 'flyer', label: 'Flyer', icon: Layers, color: 'text-violet-400', bg: 'bg-violet-500/10', desc: 'Business and event flyers' },
  { id: 'certificate', label: 'Certificate', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10', desc: 'Professional certificates & awards' },
  { id: 'card', label: 'Business Card', icon: LayoutTemplate, color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Professional business cards' },
  { id: 'invitation', label: 'Invitation', icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Wedding & event invitations' },
  { id: 'banner', label: 'Banner', icon: ImageIcon, color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Digital and print banners' },
];

const AI_STUDIO_FEATURES = [
  'Image Generator', 'Multi AI Chat', 'Image Variator', 'Image Text Editor', 
  'Image Extender', 'Image Mask Editor', 'Image Remover', 'Sketch to Image', 
  '3D Generator', 'BG Remover', 'Logo Maker', 'BG Replacer', 'Face Swaper', 
  'Image Upscaler', 'Object Remover', 'Text/Watermark Remover', 'Grammar Check', 
  'Keyword Research', 'Brand Voice', 'Email Reply Generator', 'Content Expander', 
  'Content Translator', 'Rewriter', 'Paraphraser', 'Speech to Text', 
  'Voice Changer', 'Voice Clone', 'Voice Design', 'Audio Translator', 
  'Music Generator', 'Video Face Swap'
];

export default function DesignStudioView() {
  const [studioName, setStudioName] = useState('');
  const [studioDesc, setStudioDesc] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [savedStudios, setSavedStudios] = useState<{id: string, name: string, features: number}[]>([]);

  const toggleFeature = (feature: string) => {
    const next = new Set(selectedFeatures);
    if (next.has(feature)) next.delete(feature);
    else next.add(feature);
    setSelectedFeatures(next);
  };

  const handleCreateStudio = () => {
    if (!studioName) return;
    const newStudio = { id: Date.now().toString(), name: studioName, features: selectedFeatures.size };
    setSavedStudios(prev => [newStudio, ...prev]);
    alert(`Studio "${studioName}" created successfully and saved to Printing section!`);
    setStudioName('');
    setStudioDesc('');
    setSelectedFeatures(new Set());
  };

  const openPolotno = (template?: string) => {
    const url = template
      ? `https://studio.polotno.com/?template=${template}`
      : 'https://studio.polotno.com/';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-bg p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary font-semibold flex items-center gap-2">
          <Palette className="w-4 h-4 text-pink-400" /> Design Studio
        </h2>
        <button
          onClick={() => openPolotno()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-text-primary text-xs rounded-lg transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open Full Studio
        </button>
      </div>

      {/* Build your AI Studio */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-5">
        <div>
          <h3 className="text-text-primary font-bold text-lg">Build your AI Studio</h3>
          <p className="text-gray-500 text-sm">Configure a custom AI generation studio for specific tasks.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Studio Name</label>
            <input 
              type="text" 
              value={studioName}
              onChange={e => setStudioName(e.target.value)}
              placeholder="e.g. Universal Marketing Studio" 
              className="w-full bg-surface-card border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</label>
            <input 
              type="text" 
              value={studioDesc}
              onChange={e => setStudioDesc(e.target.value)}
              placeholder="Brief description of this studio's purpose..." 
              className="w-full bg-surface-card border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">Select Features</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {AI_STUDIO_FEATURES.map(feature => {
              const isSelected = selectedFeatures.has(feature);
              return (
                <button
                  key={feature}
                  onClick={() => toggleFeature(feature)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left border ${
                    isSelected 
                      ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' 
                      : 'bg-white/3 border-transparent text-gray-600 hover:bg-white/8 hover:text-gray-800'
                  }`}
                >
                  <div className={`flex-shrink-0 w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${
                    isSelected ? 'bg-brand-primary border-brand-primary' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="truncate">{feature}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            onClick={handleCreateStudio}
            disabled={!studioName}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-primary/20"
          >
            <Plus className="w-4 h-4" /> Save & Create Studio
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-pink-500/15 via-violet-500/10 to-blue-500/10 border border-pink-500/20 p-6 overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-48 opacity-10 bg-gradient-to-l from-pink-400 to-transparent" />
        <div className="relative">
          <h3 className="text-text-primary font-bold text-xl mb-2">Professional Design Center</h3>
          <p className="text-gray-600 text-sm max-w-lg leading-relaxed">
            Create stunning posters, flyers, certificates, business cards, and more for your customers using our integrated design studio powered by Polotno.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => openPolotno()} className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-text-primary text-sm rounded-xl transition-all font-medium shadow-lg shadow-pink-500/20">
              <Palette className="w-4 h-4" /> Start Designing
            </button>
            <span className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border border-gray-200 text-gray-600 text-xs rounded-xl">
              ✓ Free to use
            </span>
            <span className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border border-gray-200 text-gray-600 text-xs rounded-xl">
              ✓ PDF Export
            </span>
            <span className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border border-gray-200 text-gray-600 text-xs rounded-xl">
              ✓ Print Ready
            </span>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div>
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-widest mb-3">Quick Start Templates</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => openPolotno(t.id)}
                className="flex flex-col items-center gap-3 p-4 bg-white/3 rounded-xl border border-white/8 hover:border-gray-300 transition-all group text-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${t.bg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${t.color}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-800 font-medium">{t.label}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-5">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-4">Studio Features</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Drag & Drop', desc: 'Easy to use editor', emoji: '🎨' },
            { label: 'Templates', desc: 'Ready-made designs', emoji: '📐' },
            { label: 'Image Upload', desc: 'Use customer photos', emoji: '🖼️' },
            { label: 'PDF Export', desc: 'Print-ready output', emoji: '📄' },
          ].map(f => (
            <div key={f.label} className="bg-white/3 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">{f.emoji}</div>
              <div className="text-xs text-gray-700 font-medium">{f.label}</div>
              <div className="text-[10px] text-gray-600">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Studios */}
      {savedStudios.length > 0 && (
        <div className="bg-white/3 rounded-xl border border-white/8 p-5">
          <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3">Saved Custom Studios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedStudios.map(studio => (
              <div key={studio.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <h4 className="text-text-primary text-sm font-medium">{studio.name}</h4>
                  <p className="text-xs text-gray-500">{studio.features} features enabled</p>
                </div>
                <button className="px-3 py-1 bg-brand-primary/20 text-brand-primary text-xs rounded-lg hover:bg-brand-primary/30 transition-colors">
                  Open in Printing
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services guide */}
      <div className="bg-white/3 rounded-xl border border-white/8 p-5">
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3">Design Services & Pricing Guide</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { service: 'Simple Poster (A4)', price: '150–300' },
            { service: 'Funeral Program', price: '300–500' },
            { service: 'Wedding Invitation', price: '200–400' },
            { service: 'Business Card (50pcs)', price: '500–800' },
            { service: 'Certificate Design', price: '200–350' },
            { service: 'Event Banner', price: '400–700' },
          ].map(s => (
            <div key={s.service} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-600">{s.service}</span>
              <span className="text-xs text-green-400 font-semibold">KES {s.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
