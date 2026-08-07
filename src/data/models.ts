import { AIModel } from '../types';

export const AI_MODELS: AIModel[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', icon: '🤖', color: '#10a37f', description: 'Most capable OpenAI model', category: ['chat', 'writing', 'code', 'docs'] },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', icon: '⚡', color: '#10a37f', description: 'Fast and powerful', category: ['chat', 'writing', 'code'] },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', icon: '🤖', color: '#10a37f', description: 'Advanced reasoning', category: ['chat', 'writing', 'code'] },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', icon: '💨', color: '#10a37f', description: 'Fast and efficient', category: ['chat', 'writing'] },
  // Anthropic
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', icon: '🎭', color: '#d97757', description: 'Best for analysis & writing', category: ['chat', 'writing', 'code', 'docs'] },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', icon: '🎭', color: '#d97757', description: 'Highly capable', category: ['chat', 'writing', 'code'] },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', icon: '🎭', color: '#d97757', description: 'Balanced performance', category: ['chat', 'writing'] },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', icon: '🎭', color: '#d97757', description: 'Fast responses', category: ['chat'] },
  // Google
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', icon: '✨', color: '#4285f4', description: 'Google\'s most capable model', category: ['chat', 'writing', 'code', 'docs'] },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'Google', icon: '✨', color: '#4285f4', description: 'Google\'s flagship model', category: ['chat', 'writing'] },
  // Meta
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Meta', icon: '🦙', color: '#0866ff', description: 'Open source powerhouse', category: ['chat', 'writing', 'code'] },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', provider: 'Meta', icon: '🦙', color: '#0866ff', description: 'Fast and lightweight', category: ['chat'] },
  // Cohere
  { id: 'command-r-plus', name: 'Command R+', provider: 'Cohere', icon: '🔮', color: '#39594d', description: 'Best for RAG tasks', category: ['chat', 'docs'] },
  { id: 'command-r', name: 'Command R', provider: 'Cohere', icon: '🔮', color: '#39594d', description: 'Retrieval augmented', category: ['chat'] },
  // Mistral
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', icon: '🌪️', color: '#ff7000', description: 'Top-tier reasoning', category: ['chat', 'writing', 'code'] },
  { id: 'mistral-7b', name: 'Mistral 7B', provider: 'Mistral', icon: '🌪️', color: '#ff7000', description: 'Efficient model', category: ['chat'] },
  // Image Models
  { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI', icon: '🎨', color: '#10a37f', description: 'High quality images', category: ['image'] },
  { id: 'dall-e-2', name: 'DALL-E 2', provider: 'OpenAI', icon: '🎨', color: '#10a37f', description: 'Creative image generation', category: ['image'] },
  { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'StabilityAI', icon: '🖼️', color: '#7c3aed', description: 'Open source image gen', category: ['image'] },
  { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney', icon: '🎨', color: '#000000', description: 'Artistic image generation', category: ['image'] },
  { id: 'leonardo', name: 'Leonardo AI', provider: 'Leonardo', icon: '🎨', color: '#ff6b35', description: 'Creative AI art', category: ['image'] },
  // Audio Models
  { id: 'whisper-1', name: 'Whisper', provider: 'OpenAI', icon: '🎤', color: '#10a37f', description: 'Speech to text', category: ['audio'] },
  { id: 'tts-1', name: 'TTS', provider: 'OpenAI', icon: '🔊', color: '#10a37f', description: 'Text to speech', category: ['audio'] },
  { id: 'tts-1-hd', name: 'TTS HD', provider: 'OpenAI', icon: '🔊', color: '#10a37f', description: 'High quality TTS', category: ['audio'] },
  // Video Models
  { id: 'luma-ai', name: 'Luma AI', provider: 'Luma', icon: '🎬', color: '#6366f1', description: 'AI video generation', category: ['video'] },
  { id: 'runway-ml', name: 'Runway ML', provider: 'Runway', icon: '🎬', color: '#e11d48', description: 'Creative video AI', category: ['video'] },
];

export const IMAGE_MODELS = AI_MODELS.filter(m => m.category.includes('image'));
export const CHAT_MODELS = AI_MODELS.filter(m => m.category.includes('chat'));
export const AUDIO_MODELS = AI_MODELS.filter(m => m.category.includes('audio'));
export const VIDEO_MODELS = AI_MODELS.filter(m => m.category.includes('video'));
