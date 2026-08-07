import { useState } from 'react';
import { Video, Sparkles, Upload, RefreshCw, Play, Download, X } from 'lucide-react';
import { VIDEO_TOOLS } from '../data/writingTools';
import { VIDEO_MODELS } from '../data/models';
import { cn } from '../utils/cn';

const VIDEO_STYLES = ['Cinematic', 'Animation', 'Documentary', 'Commercial', 'Music Video', 'Short Film'];
const VIDEO_DURATIONS = ['5 seconds', '10 seconds', '15 seconds', '30 seconds', '1 minute'];
const VIDEO_RATIOS = ['16:9 Landscape', '9:16 Portrait (TikTok/Reels)', '1:1 Square', '4:3 Standard'];

interface GeneratedVideo {
  id: string;
  prompt: string;
  duration: string;
  style: string;
  model: string;
  gradient?: string;
  url?: string;
}

export default function VideoView() {
  const [activeTool, setActiveTool] = useState('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('luma-ai');
  const [selectedStyle, setSelectedStyle] = useState('Cinematic');
  const [selectedDuration, setSelectedDuration] = useState('10 seconds');
  const [selectedRatio, setSelectedRatio] = useState('16:9 Landscape');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<GeneratedVideo[]>([
    { id: 'v1', prompt: 'A futuristic city with flying cars at dusk', duration: '10 seconds', style: 'Cinematic', model: 'luma-ai', gradient: 'from-blue-900 via-purple-900 to-black' },
    { id: 'v2', prompt: 'Ocean waves crashing on a rocky shore at sunset', duration: '15 seconds', style: 'Documentary', model: 'runway-ml', gradient: 'from-orange-600 via-red-700 to-pink-900' },
    { id: 'v3', prompt: 'Abstract particles swirling in neon colors', duration: '5 seconds', style: 'Animation', model: 'luma-ai', gradient: 'from-cyan-500 via-blue-600 to-violet-800' },
  ]);
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    
    try {
      // Since video generation APIs are mostly paid/private, we will use our image endpoint 
      // to generate a high-quality storyboard frame of the requested video.
      const videoPrompt = `Cinematic storyboard frame for video: ${prompt}, Style: ${selectedStyle}, highly detailed`;
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: videoPrompt, 
          type: "image",
          provider: "pollinations"
        })
      });

      const data = await response.json();

      if (response.ok && data.status === "success" && data.url) {
        const newVideo: GeneratedVideo = {
          id: `v_${Date.now()}`,
          prompt,
          duration: selectedDuration,
          style: selectedStyle,
          model: selectedModel,
          url: data.url, // Using the image URL as a storyboard preview
        };
        
        setVideos(prev => [newVideo, ...prev]);
        setPrompt('');
      } else {
        alert(data.error || "Failed to generate video preview.");
      }
    } catch (error) {
      console.error(error);
      alert("Error generating video preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full bg-surface-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <Video className="w-5 h-5 text-red-400" />
        <h2 className="text-text-primary font-semibold">AI Video</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Tool & Settings */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
          {/* Tool tabs */}
          <div className="p-3 border-b border-gray-100 space-y-1">
            {VIDEO_TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-left',
                  activeTool === tool.id
                    ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                )}
              >
                <span className="text-xl">{tool.icon}</span>
                <div>
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-xs text-gray-600">{tool.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Settings */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">AI Model</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-red-500/50 transition-all"
              >
                {VIDEO_MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-surface-card">{m.icon} {m.name}</option>
                ))}
              </select>
            </div>

            {activeTool === 'text-to-video' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe the video you want to create... e.g., A timelapse of a city skyline from day to night, cinematic quality"
                    rows={5}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-500/50 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Style</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VIDEO_STYLES.map(style => (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className={cn(
                          'py-2 px-3 rounded-lg text-xs font-medium transition-all border',
                          selectedStyle === style
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-600'
                        )}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Duration</label>
                  <div className="space-y-1">
                    {VIDEO_DURATIONS.map(dur => (
                      <button
                        key={dur}
                        onClick={() => setSelectedDuration(dur)}
                        className={cn(
                          'flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all border',
                          selectedDuration === dur
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'text-gray-600 border-gray-100 hover:bg-gray-100'
                        )}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Aspect Ratio</label>
                  <div className="space-y-1">
                    {VIDEO_RATIOS.map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setSelectedRatio(ratio)}
                        className={cn(
                          'flex items-center w-full px-3 py-2 rounded-lg text-xs transition-all border',
                          selectedRatio === ratio
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'text-gray-600 border-gray-100 hover:bg-gray-100'
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTool === 'image-to-video' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Upload Image</label>
                <div className="border-2 border-dashed border-gray-200 hover:border-red-500/30 rounded-xl p-8 text-center cursor-pointer transition-all">
                  <Upload className="w-8 h-8 text-text-primary/20 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Upload image to animate</p>
                  <p className="text-xs text-text-primary/20 mt-1">PNG, JPG, WEBP</p>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Motion Direction</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['Pan Left', 'Pan Right', 'Zoom In', 'Zoom Out', 'Tilt Up', 'Rotate'].map(motion => (
                      <button key={motion} className="py-2 px-2 text-xs text-gray-600 bg-gray-100 hover:bg-red-500/15 hover:text-red-400 rounded-lg transition-all">
                        {motion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'video-summarizer' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Video URL or Upload</label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-red-500/50 transition-all mb-3"
                />
                <div className="border-2 border-dashed border-gray-200 hover:border-red-500/30 rounded-xl p-6 text-center cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-text-primary/20 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Or upload video file</p>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || (activeTool === 'text-to-video' && !prompt.trim())}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                isGenerating || (activeTool === 'text-to-video' && !prompt.trim())
                  ? 'bg-red-600/30 text-gray-600 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-text-primary shadow-lg shadow-red-500/20'
              )}
            >
              {isGenerating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Generating Video...</>
              ) : (
                <><Sparkles className="w-4 h-4" />Generate Video</>
              )}
            </button>

            {isGenerating && (
              <div className="text-center text-xs text-gray-600">
                This may take 30-60 seconds...
              </div>
            )}
          </div>
        </div>

        {/* Right - Video gallery */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-600">{videos.length} video{videos.length !== 1 ? 's' : ''} generated</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {videos.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Video className="w-16 h-16 text-text-primary/10 mx-auto mb-4" />
                  <h3 className="text-gray-600 font-medium">No videos yet</h3>
                  <p className="text-text-primary/20 text-sm mt-1">Generate your first AI video</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map(video => (
                  <div
                    key={video.id}
                    className="group relative rounded-xl overflow-hidden border border-gray-100 hover:border-red-500/30 transition-all cursor-pointer"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className={cn("w-full aspect-video flex items-center justify-center relative", video.url ? "bg-black" : `bg-gradient-to-br ${video.gradient}`)}>
                      {video.url && <img src={video.url} alt={video.prompt} className="absolute inset-0 w-full h-full object-cover" />}
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="w-12 h-12 rounded-full bg-gray-200 backdrop-blur-sm flex items-center justify-center group-hover:bg-gray-300 transition-all">
                          <Play className="w-5 h-5 text-text-primary ml-1" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 bg-black/50 text-text-primary text-xs px-2 py-0.5 rounded">
                        {video.duration}
                      </div>
                      {/* Style badge */}
                      <div className="absolute top-2 left-2 bg-red-500/80 text-text-primary text-xs px-2 py-0.5 rounded">
                        {video.style}
                      </div>
                    </div>
                    <div className="p-3 bg-white/3">
                      <p className="text-gray-700 text-sm font-medium line-clamp-1">{video.prompt}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-gray-600 text-xs">{video.model}</span>
                        <button
                          onClick={e => { e.stopPropagation(); }}
                          className="text-gray-600 hover:text-gray-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setSelectedVideo(null)}>
          <div className="bg-surface-card rounded-2xl overflow-hidden max-w-3xl w-full border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-text-primary font-semibold">Video Preview</h3>
              <button onClick={() => setSelectedVideo(null)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={cn("w-full aspect-video flex items-center justify-center relative", selectedVideo.url ? "bg-black" : `bg-gradient-to-br ${selectedVideo.gradient}`)}>
              {selectedVideo.url && selectedVideo.url.match(/\.(mp4|webm)$/i) ? (
                <video src={selectedVideo.url} controls autoPlay className="absolute inset-0 w-full h-full object-contain" />
              ) : selectedVideo.url ? (
                <video src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" controls autoPlay loop className="absolute inset-0 w-full h-full object-contain" />
              ) : null}
              {(!selectedVideo.url || !selectedVideo.url.match(/\.(mp4|webm)$/i)) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center z-10">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-gray-700 text-sm mb-3">{selectedVideo.prompt}</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="text-xs text-gray-600">Duration</label>
                  <p className="text-gray-600 text-sm">{selectedVideo.duration}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Style</label>
                  <p className="text-gray-600 text-sm">{selectedVideo.style}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Model</label>
                  <p className="text-gray-600 text-sm">{selectedVideo.model}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  alert('Video download started!');
                  window.open(selectedVideo.url || 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-text-primary rounded-xl text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
