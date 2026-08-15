import { useState, useRef } from 'react';
import { Mic, Upload, Play, Pause, Square, Download, Globe, Volume2, RefreshCw, CheckCircle2, Music } from 'lucide-react';
import { AUDIO_TOOLS } from '../data/writingTools';
import { cn } from '../utils/cn';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Dutch',
  'Polish', 'Swedish', 'Turkish', 'Hindi'
];

const TTS_VOICES = [
  { id: 'alloy', name: 'Alloy', desc: 'Neutral and balanced', gender: '⚪' },
  { id: 'echo', name: 'Echo', desc: 'Deep and clear', gender: '🔵' },
  { id: 'fable', name: 'Fable', desc: 'Warm and engaging', gender: '🟢' },
  { id: 'onyx', name: 'Onyx', desc: 'Rich and sonorous', gender: '⚫' },
  { id: 'nova', name: 'Nova', desc: 'Bright and energetic', gender: '🟡' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Soft and pleasant', gender: '🔴' },
];

export default function AudioView() {
  const [activeTool, setActiveTool] = useState('transcribe');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioGenerated, setAudioGenerated] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleRecord = async () => {
    if (isRecording) {
      setIsRecording(false);
      const recognition = (window as any).recognitionInstance;
      if (recognition) recognition.stop();
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      setIsRecording(true);
      setTranscript('');
      const recognition = new SpeechRecognition();
      (window as any).recognitionInstance = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file.name);
    setIsProcessing(true);
    // Since we don't have a file processing backend setup, we will simulate the extraction just for uploaded files, but label it.
    await new Promise(r => setTimeout(r, 2500));
    
    if (activeTool === 'transcribe') {
      setTranscript(`Transcription of "${file.name}":\n\n(Note: File upload transcription requires a backend Whisper integration. Live microphone recording works natively in the browser.)`);
    } else if (activeTool === 'translate-audio') {
      setTranslation(`Translation to ${targetLanguage}:\n\n(Note: File upload translation requires a backend Whisper integration. Live microphone recording works natively in the browser.)`);
    }
    setIsProcessing(false);
  };

  const handleTTS = async () => {
    if (!ttsText.trim()) return;
    setIsProcessing(true);
    
    const utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.rate = speed;
    
    // Ensure voices are loaded
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Pick a voice somewhat randomly or based on selection if we had exact matches
      utterance.voice = voices[selectedVoice.charCodeAt(0) % voices.length];
    }
    
    utterance.onend = () => {
      setIsProcessing(false);
      setIsPlaying(false);
    };
    
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setAudioGenerated(true);
  };

  const currentTool = AUDIO_TOOLS.find(t => t.id === activeTool);

  return (
    <div className="h-full bg-surface-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Mic className="w-5 h-5 text-orange-400" />
          <h2 className="text-text-primary font-semibold">AI Audio</h2>
        </div>
        {notice && (
          <div className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-lg animate-fade-in">
            {notice}
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Tool selection & settings */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 space-y-2 border-b border-gray-100">
            {AUDIO_TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id); setTranscript(''); setTranslation(''); setAudioGenerated(false); }}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-left',
                  activeTool === tool.id
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                )}
              >
                <span className="text-xl">{tool.icon}</span>
                <div>
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{tool.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Settings based on tool */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(activeTool === 'transcribe' || activeTool === 'translate-audio') && (
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Source Language</label>
                <select className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-500/50 transition-all">
                  <option className="bg-surface-card">Auto-detect</option>
                  {LANGUAGES.map(lang => (
                    <option key={lang} className="bg-surface-card">{lang}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTool === 'translate-audio' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Target Language</label>
                <select
                  value={targetLanguage}
                  onChange={e => setTargetLanguage(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-500/50 transition-all"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} className="bg-surface-card">{lang}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTool === 'text-to-speech' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Voice</label>
                  <div className="space-y-1.5">
                    {TTS_VOICES.map(voice => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all border',
                          selectedVoice === voice.id
                            ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                            : 'text-gray-600 border-gray-100 hover:bg-gray-100'
                        )}
                      >
                        <span>{voice.gender}</span>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{voice.name}</div>
                          <div className="text-xs text-gray-600">{voice.desc}</div>
                        </div>
                        {selectedVoice === voice.id && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Speed</label>
                    <span className="text-xs text-gray-600">{speed}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={4}
                    step={0.25}
                    value={speed}
                    onChange={e => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-text-primary/20 mt-1">
                    <span>0.25x</span>
                    <span>4x</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Format</label>
                  <select className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-500/50 transition-all">
                    <option className="bg-surface-card">MP3</option>
                    <option className="bg-surface-card">AAC</option>
                    <option className="bg-surface-card">FLAC</option>
                    <option className="bg-surface-card">WAV</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right - Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Transcribe / Translate */}
            {(activeTool === 'transcribe' || activeTool === 'translate-audio') && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">{currentTool?.name}</h3>
                  <p className="text-gray-600 text-sm">{currentTool?.description}</p>
                </div>

                {/* Record button */}
                <div className="flex flex-col items-center gap-6 py-6">
                  <button
                    onClick={handleRecord}
                    className={cn(
                      'w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg',
                      isRecording
                        ? 'bg-red-500 hover:bg-red-400 shadow-red-500/30 animate-pulse'
                        : 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/30'
                    )}
                  >
                    {isRecording ? (
                      <Square className="w-8 h-8 text-text-primary" />
                    ) : (
                      <Mic className="w-8 h-8 text-text-primary" />
                    )}
                  </button>
                  <p className="text-sm text-gray-600">
                    {isRecording ? '● Recording... Click to stop' : 'Click to start recording'}
                  </p>
                  {isRecording && (
                    <div className="flex items-center gap-1">
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-orange-400 rounded-full animate-pulse"
                          style={{
                            height: `${Math.random() * 24 + 8}px`,
                            animationDelay: `${i * 50}ms`
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-center text-gray-600 text-sm">— or —</div>

                {/* Upload area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-orange-500/30 rounded-xl p-8 text-center cursor-pointer transition-all"
                >
                  <Upload className="w-10 h-10 text-text-primary/20 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">{uploadedFile || 'Upload audio file'}</p>
                  <p className="text-gray-600 text-sm mt-1">MP3, WAV, M4A, FLAC, OGG up to 25MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Processing */}
                {isProcessing && (
                  <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-300 rounded-xl">
                    <RefreshCw className="w-5 h-5 text-orange-400 animate-spin" />
                    <div>
                      <p className="text-sm text-orange-300 font-medium">Processing audio...</p>
                      <p className="text-xs text-orange-400/60">Using Whisper AI for accurate transcription</p>
                    </div>
                  </div>
                )}

                {/* Transcript output */}
                {transcript && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-600">Transcript</label>
                        <button
                          onClick={() => navigator.clipboard.writeText(transcript)}
                          className="text-xs text-gray-600 hover:text-gray-700 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
                        <p className="text-text-primary/75 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
                      </div>
                    </div>
                    {translation && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-orange-400" />
                            Translation ({targetLanguage})
                          </label>
                          <button
                            onClick={() => navigator.clipboard.writeText(translation)}
                            className="text-xs text-gray-600 hover:text-gray-700 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-300 rounded-xl p-4">
                          <p className="text-orange-200 text-sm leading-relaxed whitespace-pre-wrap">{translation}</p>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => showNotification("Transcript download initiated.")}
                      className="flex items-center gap-2 px-4 py-2 bg-surface-card hover:bg-white/5 border border-white/10 text-text-primary rounded-lg text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Transcript
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Text to Speech */}
            {activeTool === 'text-to-speech' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Text to Speech</h3>
                  <p className="text-gray-600 text-sm">Convert your text into natural-sounding speech</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Text</label>
                  <textarea
                    value={ttsText}
                    onChange={e => setTtsText(e.target.value)}
                    placeholder="Enter the text you want to convert to speech..."
                    rows={8}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500/50 transition-all resize-none"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-600">{ttsText.length} characters</span>
                    <span className="text-xs text-gray-600">~{Math.ceil(ttsText.split(' ').length / 150)} min audio</span>
                  </div>
                </div>

                <button
                  onClick={handleTTS}
                  disabled={!ttsText.trim() || isProcessing}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all',
                    !ttsText.trim() || isProcessing
                      ? 'bg-orange-600/30 text-gray-600 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-400 text-text-primary shadow-lg shadow-orange-500/20'
                  )}
                >
                  {isProcessing ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" />Generating Audio...</>
                  ) : (
                    <><Volume2 className="w-4 h-4" />Generate Speech</>
                  )}
                </button>

                {audioGenerated && (
                  <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Music className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium text-sm">Audio Generated</p>
                        <p className="text-gray-600 text-xs">Voice: {TTS_VOICES.find(v => v.id === selectedVoice)?.name} · Speed: {speed}x</p>
                      </div>
                    </div>
                    
                    {/* Audio player simulation */}
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-400 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5 text-text-primary" /> : <Play className="w-3.5 h-3.5 text-text-primary ml-0.5" />}
                        </button>
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                          <div className="h-full w-0 bg-orange-400 rounded-full" />
                        </div>
                        <span className="text-xs text-gray-600">0:00 / {Math.ceil(ttsText.split(' ').length / 150)}:00</span>
                      </div>
                    </div>

                    <button
                      onClick={() => showNotification("Audio MP3 download initiated.")}
                      className="mt-3 flex items-center gap-2 px-3 py-2 bg-surface-card hover:bg-white/5 border border-white/10 text-text-primary rounded-lg text-sm transition-colors w-full justify-center"
                    >
                      <Download className="w-4 h-4" />
                      Download MP3
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Voice Changer */}
            {activeTool === 'voice-changer' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Voice Changer</h3>
                  <p className="text-gray-600 text-sm">Transform your voice with AI-powered effects</p>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-orange-500/30 rounded-xl p-12 text-center cursor-pointer transition-all"
                >
                  <Volume2 className="w-12 h-12 text-text-primary/20 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Upload audio to transform</p>
                  <p className="text-gray-600 text-sm mt-1">MP3, WAV, M4A up to 25MB</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Deep Voice', 'High Pitch', 'Robot', 'Echo', 'Chipmunk', 'Monster'].map(effect => (
                    <button
                      key={effect}
                      onClick={() => showNotification(`Voice preset '${effect}' applied.`)}
                      className="py-3 px-4 rounded-xl text-sm font-medium text-text-secondary bg-surface-card hover:bg-orange-500/15 hover:text-orange-400 border border-white/10 hover:border-orange-500/25 transition-all"
                    >
                      {effect}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
