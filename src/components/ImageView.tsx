import { useState, useRef } from 'react';
import {
  Image, Sparkles, Download, RefreshCw,
  Wand2, Scissors, Upload, X, Info
} from 'lucide-react';
import { IMAGE_TOOLS } from '../data/writingTools';
import { IMAGE_MODELS } from '../data/models';
import { GeneratedImage } from '../types';
import { cn } from '../utils/cn';
import { generateId } from '../store/useAppStore';

const IMAGE_STYLES = [
  'Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Sketch',
  'Anime', 'Comic Book', 'Cinematic', '3D Render', 'Abstract',
  'Minimalist', 'Vintage', 'Futuristic', 'Fantasy', 'Dark Fantasy'
];

const IMAGE_SIZES = [
  { label: '1:1 Square', value: '1024x1024' },
  { label: '3:2 Landscape', value: '1536x1024' },
  { label: '2:3 Portrait', value: '1024x1536' },
  { label: '16:9 Wide', value: '1792x1024' },
  { label: '9:16 Tall', value: '1024x1792' },
];

const SAMPLE_IMAGES = [
  { prompt: 'Futuristic cyberpunk city at night', style: 'Cinematic', model: 'dall-e-3', gradient: 'from-blue-900 via-purple-900 to-black' },
  { prompt: 'Serene mountain lake at sunrise', style: 'Photorealistic', model: 'stable-diffusion-xl', gradient: 'from-orange-400 via-pink-400 to-purple-500' },
  { prompt: 'Abstract digital art with vibrant colors', style: 'Abstract', model: 'dall-e-3', gradient: 'from-green-400 via-cyan-500 to-blue-600' },
  { prompt: 'Portrait of a warrior in fantasy armor', style: 'Fantasy', model: 'midjourney', gradient: 'from-gray-700 via-amber-800 to-red-900' },
  { prompt: 'Minimalist geometric pattern in black and gold', style: 'Minimalist', model: 'dall-e-3', gradient: 'from-yellow-400 via-amber-500 to-orange-600' },
  { prompt: 'Mystical forest with glowing mushrooms', style: 'Fantasy', model: 'stable-diffusion-xl', gradient: 'from-emerald-900 via-green-800 to-teal-900' },
];

interface ImageViewProps {
  generatedImages: GeneratedImage[];
  addGeneratedImage: (img: GeneratedImage) => void;
}

export default function ImageView({ generatedImages, addGeneratedImage }: ImageViewProps) {
  const [activeTool, setActiveTool] = useState('image-generator');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Photorealistic');
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [selectedModel, setSelectedModel] = useState('dall-e-3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [quality, setQuality] = useState('hd');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = (url: string, filename: string) => {
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
      })
      .catch(err => {
        console.error('Failed to download image:', err);
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      alert(`File uploaded: ${e.target.files[0].name}. Ready for processing!`);
    }
  };

  const activeToolData = IMAGE_TOOLS.find(t => t.id === activeTool);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: prompt + (negativePrompt ? ` (Avoid: ${negativePrompt})` : ""), 
          type: "image",
          provider: "pollinations",
          model: selectedModel
        })
      });

      const data = await response.json();
      
      if (response.ok && data.status === "success" && data.url) {
        const newImage: GeneratedImage = {
          id: generateId(),
          url: data.url, // Uses real returned image URL
          prompt,
          model: selectedModel,
          timestamp: new Date(),
          size: selectedSize,
          style: selectedStyle,
        };
        addGeneratedImage(newImage);
      } else {
        alert(data.error || "Failed to generate image.");
      }
    } catch (error) {
      console.error(error);
      alert("Error generating image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const allImages = [
    ...generatedImages,
    ...SAMPLE_IMAGES.map((img, i) => ({
      id: `sample_${i}`,
      url: `gradient:${img.gradient}:${img.prompt}`,
      prompt: img.prompt,
      model: img.model,
      timestamp: new Date(Date.now() - i * 3600000),
      style: img.style,
    } as GeneratedImage))
  ];

  return (
    <div className="h-full bg-surface-bg flex overflow-hidden">
      {/* Left panel - Tools & Settings */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
        {/* Tool tabs */}
        <div className="p-3 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-1">
            {IMAGE_TOOLS.slice(0, 4).map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all text-left',
                  activeTool === tool.id
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-600'
                )}
              >
                <span>{tool.icon}</span>
                <span className="truncate">{tool.name.replace('Image ', '')}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1">
            {IMAGE_TOOLS.slice(4).map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTool === tool.id
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-600'
                )}
              >
                <span>{tool.icon}</span>
                <span className="truncate">{tool.name.split(' ').slice(-1)[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">AI Model</label>
            </div>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-purple-500/50 transition-all"
            >
              {IMAGE_MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-surface-card">{m.icon} {m.name}</option>
              ))}
            </select>
          </div>

          {activeTool === 'image-generator' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="A majestic dragon soaring over a medieval castle at sunset, cinematic lighting, 8K resolution..."
                  rows={4}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Negative Prompt</label>
                <textarea
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  placeholder="blurry, low quality, distorted..."
                  rows={2}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Style</label>
                <div className="grid grid-cols-3 gap-1">
                  {IMAGE_STYLES.slice(0, 9).map(style => (
                    <button
                      key={style}
                      onClick={() => setSelectedStyle(style)}
                      className={cn(
                        'px-2 py-1.5 rounded-lg text-xs font-medium transition-all border',
                        selectedStyle === style
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-600'
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Size</label>
                <div className="space-y-1">
                  {IMAGE_SIZES.map(size => (
                    <button
                      key={size.value}
                      onClick={() => setSelectedSize(size.value)}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs transition-all border',
                        selectedSize === size.value
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'text-gray-600 border-gray-100 hover:bg-gray-100'
                      )}
                    >
                      <span>{size.label}</span>
                      <span className="text-gray-600">{size.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Quality</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['standard', 'hd'].map(q => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={cn(
                        'py-2 rounded-lg text-xs font-medium capitalize transition-all border',
                        quality === q
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'text-gray-600 border-gray-100 hover:bg-gray-100'
                      )}
                    >
                      {q === 'hd' ? '✨ HD' : '⚡ Standard'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />

          {activeTool === 'image-variator' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Upload Image</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-purple-500/30 transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB</p>
              </div>
            </div>
          )}

          {activeTool === 'background-remover' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Upload Image</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-purple-500/30 transition-colors cursor-pointer"
              >
                <Scissors className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Upload image to remove background</p>
              </div>
              <div className="mt-3 p-3 bg-blue-500/10 border border-brand-accent rounded-lg flex gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-400">AI will automatically detect and remove the background from your image</p>
              </div>
            </div>
          )}

          {activeTool !== 'image-variator' && activeTool !== 'background-remover' && activeTool !== 'image-generator' && (
            <div className="text-center py-6">
              <span className="text-4xl">{activeToolData?.icon}</span>
              <p className="text-sm text-gray-600 mt-3">{activeToolData?.description}</p>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 mt-4 hover:border-purple-500/30 transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Upload image to get started</p>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || (activeTool === 'image-generator' && !prompt.trim())}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
              isGenerating || (activeTool === 'image-generator' && !prompt.trim())
                ? 'bg-purple-600/30 text-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-text-primary shadow-lg shadow-purple-500/20'
            )}
          >
            {isGenerating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</>
            ) : (
              <><Wand2 className="w-4 h-4" />{activeToolData?.name || 'Generate'}</>
            )}
          </button>
        </div>
      </div>

      {/* Right panel - Gallery */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <Image className="w-5 h-5 text-purple-400" />
          <h2 className="text-text-primary font-semibold">Image Gallery</h2>
          <span className="text-gray-600 text-sm ml-2">{allImages.length} images</span>
        </div>

        {isGenerating && (
          <div className="mx-6 mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border-2 border-purple-500 border-t-transparent animate-spin" />
            <div>
              <p className="text-sm text-purple-300 font-medium">Generating image...</p>
              <p className="text-xs text-purple-400/60">This may take a few seconds</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {allImages.map(img => {
              const isGradient = img.url.startsWith('gradient:');
              const parts = img.url.split(':');
              const gradient = isGradient ? (parts[1] || 'from-gray-800 to-gray-900') : null;
              const promptText = img.prompt;

              return (
                <div
                  key={img.id}
                  className="group relative rounded-xl overflow-hidden cursor-pointer aspect-square border border-gray-100 hover:border-purple-500/30 transition-all"
                  onClick={() => setSelectedImage(img)}
                >
                  <div className={cn('w-full h-full flex items-end relative bg-cover bg-center', isGradient && `bg-gradient-to-br ${gradient}`)}>
                    {!isGradient && (
                      <img src={img.url} alt={img.prompt} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                    
                    {/* Image placeholder content (only for gradients) */}
                    {isGradient && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-text-primary/20" />
                      </div>
                    )}

                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform z-20">
                      <p className="text-text-primary text-xs font-medium line-clamp-2">{promptText}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-300 text-xs">{img.style || 'Auto'}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); }}
                          className="text-gray-300 hover:text-white transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Image detail modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-surface-card rounded-2xl overflow-hidden max-w-2xl w-full border border-gray-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-text-primary font-semibold">Image Details</h3>
              <button onClick={() => setSelectedImage(null)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {(() => {
              const isGradient = selectedImage.url.startsWith('gradient:');
              const parts = selectedImage.url.split(':');
              const gradient = isGradient ? (parts[1] || 'from-gray-800 to-gray-900') : null;
              return (
                <div className={cn('w-full aspect-square flex items-center justify-center relative bg-black/10', isGradient && `bg-gradient-to-br ${gradient}`)}>
                  {!isGradient && (
                    <img src={selectedImage.url} alt={selectedImage.prompt} className="absolute inset-0 w-full h-full object-contain" />
                  )}
                  {isGradient && <Sparkles className="w-16 h-16 text-text-primary/20" />}
                </div>
              );
            })()}
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium uppercase tracking-wider">Prompt</label>
                <p className="text-gray-800 text-sm mt-1">{selectedImage.prompt}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-600 font-medium uppercase tracking-wider">Model</label>
                  <p className="text-gray-700 text-sm mt-1">{selectedImage.model}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium uppercase tracking-wider">Style</label>
                  <p className="text-gray-700 text-sm mt-1">{selectedImage.style || 'Auto'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium uppercase tracking-wider">Size</label>
                  <p className="text-gray-700 text-sm mt-1">{selectedImage.size || '1024x1024'}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => handleDownload(selectedImage.url, 'generated-image.jpg')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-text-primary rounded-xl text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
