import { WritingTool } from "../types";

export const WRITING_TOOLS: WritingTool[] = [
  {
    id: "blog-article",
    name: "Blog Article Generator",
    description:
      "Generate a full blog article with introduction, body, and conclusion",
    icon: "📝",
    placeholder: "Enter your topic...",
    fields: [
      {
        id: "topic",
        label: "Topic",
        type: "text",
        placeholder: "e.g., The future of AI in healthcare",
      },
      {
        id: "tone",
        label: "Tone",
        type: "select",
        options: [
          "Professional",
          "Casual",
          "Informative",
          "Persuasive",
          "Humorous",
        ],
      },
      {
        id: "length",
        label: "Length",
        type: "select",
        options: [
          "Short (300-500 words)",
          "Medium (500-800 words)",
          "Long (800-1500 words)",
          "Detailed (1500+ words)",
        ],
      },
      {
        id: "keywords",
        label: "Keywords (optional)",
        type: "text",
        placeholder: "e.g., AI, machine learning, healthcare",
      },
    ],
  },
  {
    id: "summarizer",
    name: "Summarizer",
    description: "Summarize long texts into concise summaries",
    icon: "📋",
    placeholder: "Enter text to summarize...",
    fields: [
      {
        id: "text",
        label: "Text to Summarize",
        type: "textarea",
        placeholder: "Paste your text here...",
      },
      {
        id: "length",
        label: "Summary Length",
        type: "select",
        options: [
          "Brief (1-2 sentences)",
          "Short (1 paragraph)",
          "Medium (2-3 paragraphs)",
          "Detailed (4+ paragraphs)",
        ],
      },
      {
        id: "format",
        label: "Format",
        type: "select",
        options: ["Paragraph", "Bullet Points", "Numbered List"],
      },
    ],
  },
  {
    id: "paraphraser",
    name: "Paraphraser",
    description: "Rewrite text in different words while preserving meaning",
    icon: "🔄",
    placeholder: "Enter text to paraphrase...",
    fields: [
      {
        id: "text",
        label: "Original Text",
        type: "textarea",
        placeholder: "Paste your text here...",
      },
      {
        id: "style",
        label: "Style",
        type: "select",
        options: [
          "Standard",
          "Fluency",
          "Formal",
          "Academic",
          "Simple",
          "Creative",
        ],
      },
    ],
  },
  {
    id: "grammar-checker",
    name: "Grammar Checker",
    description: "Check and fix grammar, spelling, and punctuation errors",
    icon: "✅",
    placeholder: "Enter text to check...",
    fields: [
      {
        id: "text",
        label: "Text",
        type: "textarea",
        placeholder: "Paste your text here...",
      },
    ],
  },
  {
    id: "content-expander",
    name: "Content Expander",
    description: "Expand short text into detailed, comprehensive content",
    icon: "📈",
    placeholder: "Enter text to expand...",
    fields: [
      {
        id: "text",
        label: "Text to Expand",
        type: "textarea",
        placeholder: "Enter your brief text...",
      },
      {
        id: "length",
        label: "Target Length",
        type: "select",
        options: ["2x longer", "3x longer", "5x longer", "10x longer"],
      },
    ],
  },
  {
    id: "content-shortener",
    name: "Content Shortener",
    description: "Shorten long text while keeping key information",
    icon: "📉",
    placeholder: "Enter text to shorten...",
    fields: [
      {
        id: "text",
        label: "Text to Shorten",
        type: "textarea",
        placeholder: "Paste your text here...",
      },
      {
        id: "target",
        label: "Target Length",
        type: "select",
        options: ["25% of original", "50% of original", "75% of original"],
      },
    ],
  },
  {
    id: "rewriter",
    name: "Rewriter",
    description: "Rewrite content in a completely different way",
    icon: "✍️",
    placeholder: "Enter text to rewrite...",
    fields: [
      {
        id: "text",
        label: "Original Text",
        type: "textarea",
        placeholder: "Paste your text here...",
      },
      {
        id: "tone",
        label: "Tone",
        type: "select",
        options: ["Professional", "Casual", "Formal", "Creative", "Academic"],
      },
    ],
  },
  {
    id: "linkedin-comment",
    name: "LinkedIn Comment",
    description: "Generate engaging LinkedIn comments",
    icon: "💼",
    placeholder: "Enter LinkedIn post to comment on...",
    fields: [
      {
        id: "post",
        label: "LinkedIn Post",
        type: "textarea",
        placeholder: "Paste the LinkedIn post content...",
      },
      {
        id: "tone",
        label: "Comment Tone",
        type: "select",
        options: [
          "Agreeable",
          "Thoughtful",
          "Insightful",
          "Question",
          "Supportive",
        ],
      },
    ],
  },
  {
    id: "facebook-comment",
    name: "Facebook Comment",
    description: "Generate engaging Facebook comments",
    icon: "📘",
    placeholder: "Enter Facebook post to comment on...",
    fields: [
      {
        id: "post",
        label: "Facebook Post",
        type: "textarea",
        placeholder: "Paste the Facebook post content...",
      },
      {
        id: "tone",
        label: "Comment Tone",
        type: "select",
        options: [
          "Friendly",
          "Funny",
          "Informative",
          "Encouraging",
          "Question",
        ],
      },
    ],
  },
  {
    id: "email-generator",
    name: "Email Generator",
    description: "Generate professional email drafts",
    icon: "📧",
    placeholder: "Describe the email you need...",
    fields: [
      {
        id: "purpose",
        label: "Email Purpose",
        type: "text",
        placeholder: "e.g., Follow up after meeting",
      },
      {
        id: "tone",
        label: "Tone",
        type: "select",
        options: ["Professional", "Formal", "Casual", "Friendly", "Urgent"],
      },
      {
        id: "details",
        label: "Key Points",
        type: "textarea",
        placeholder: "Key points to include in the email...",
      },
    ],
  },
  {
    id: "brand-voice",
    name: "Brand Voice Generator",
    description: "Create consistent brand voice guidelines",
    icon: "🎯",
    placeholder: "Describe your brand...",
    fields: [
      {
        id: "brand",
        label: "Brand Name",
        type: "text",
        placeholder: "Your brand name",
      },
      {
        id: "description",
        label: "Brand Description",
        type: "textarea",
        placeholder: "Describe what your brand does and stands for...",
      },
      {
        id: "audience",
        label: "Target Audience",
        type: "text",
        placeholder: "Who is your target audience?",
      },
    ],
  },
  {
    id: "keyword-generator",
    name: "Keyword Generator",
    description: "Generate SEO keywords for your content",
    icon: "🔑",
    placeholder: "Enter your topic or niche...",
    fields: [
      {
        id: "topic",
        label: "Topic/Niche",
        type: "text",
        placeholder: "e.g., digital marketing for small businesses",
      },
      {
        id: "count",
        label: "Number of Keywords",
        type: "select",
        options: ["10 keywords", "20 keywords", "30 keywords", "50 keywords"],
      },
      {
        id: "type",
        label: "Keyword Type",
        type: "select",
        options: ["Short-tail", "Long-tail", "Mixed", "Question-based"],
      },
    ],
  },
];

export const IMAGE_TOOLS = [
  {
    id: "image-generator",
    name: "Image Generator",
    description: "Generate images from text prompts",
    icon: "🖼️",
  },
  {
    id: "image-variator",
    name: "Image Variator",
    description: "Create variations of existing images",
    icon: "🎨",
  },
  {
    id: "image-upscaler",
    name: "Image Upscaler",
    description: "Enhance image quality and resolution",
    icon: "🔍",
  },
  {
    id: "background-remover",
    name: "Background Remover",
    description: "Remove image backgrounds instantly",
    icon: "✂️",
  },
  {
    id: "background-replacer",
    name: "Background Replacer",
    description: "Replace image backgrounds with AI",
    icon: "🔄",
  },
  {
    id: "image-to-prompt",
    name: "Image to Prompt",
    description: "Generate prompts from existing images",
    icon: "💬",
  },
  {
    id: "text-remover",
    name: "Text Remover",
    description: "Remove text from images",
    icon: "🗑️",
  },
  {
    id: "image-text-editor",
    name: "Image Text Editor",
    description: "Add and edit text in images",
    icon: "✏️",
  },
  {
    id: "object-replacer",
    name: "Object Replacer",
    description: "Replace objects in images with AI",
    icon: "🔄",
  },
  {
    id: "chat-with-image",
    name: "Chat with Image",
    description: "Ask questions about any image",
    icon: "💬",
  },
];

export const AUDIO_TOOLS = [
  {
    id: "transcribe",
    name: "Transcribe Audio",
    description: "Convert speech to text accurately",
    icon: "🎤",
  },
  {
    id: "translate-audio",
    name: "Translate Audio",
    description: "Transcribe and translate audio",
    icon: "🌐",
  },
  {
    id: "text-to-speech",
    name: "Text to Speech",
    description: "Convert text to natural sounding speech",
    icon: "🔊",
  },
  {
    id: "voice-changer",
    name: "Voice Changer",
    description: "Change voice style and characteristics",
    icon: "🎙️",
  },
  {
    id: "room-voice-notes",
    name: "Room Voice Notes",
    description: "Record and organize voice notes",
    icon: "🗣️",
  },
];

export const VIDEO_TOOLS = [
  {
    id: "text-to-video",
    name: "Text to Video",
    description: "Generate videos from text prompts",
    icon: "🎬",
  },
  {
    id: "image-to-video",
    name: "Image to Video",
    description: "Animate static images into videos",
    icon: "▶️",
  },
  {
    id: "video-summarizer",
    name: "Video Summarizer",
    description: "Summarize video content quickly",
    icon: "📝",
  },
];

export const DOC_TOOLS = [
  {
    id: "chat-with-doc",
    name: "Chat with Document",
    description: "Ask questions about any document",
    icon: "📄",
  },
  {
    id: "multi-doc-chat",
    name: "Multi-Doc Chat",
    description: "Chat with multiple documents at once",
    icon: "📚",
  },
  {
    id: "doc-summarizer",
    name: "Document Summarizer",
    description: "Summarize long documents quickly",
    icon: "📋",
  },
  {
    id: "doc-extractor",
    name: "Data Extractor",
    description: "Extract structured data from documents",
    icon: "📊",
  },
  {
    id: "pdf-editor",
    name: "AI PDF Editor",
    description: "Canva-like PDF editor with AI extraction & tools",
    icon: "✨",
  },
  {
    id: "pdf-generator",
    name: "AI PDF Generator",
    description: "Generate brand new PDFs from text prompts",
    icon: "📝",
  },
  {
    id: "pdf-text-editor",
    name: "AI PDF Text Editor",
    description: "Modify specific text in a PDF document",
    icon: "✏️",
  },
  {
    id: "digital-notebook",
    name: "Digital Notebook",
    description: "Organize your thoughts and notes",
    icon: "📓",
  },
  {
    id: "second-brain",
    name: "Second Brain",
    description: "Your personal knowledge management system",
    icon: "🧠",
  },
  {
    id: "personal-wiki",
    name: "Personal Wiki",
    description: "Create and connect personal wiki pages",
    icon: "🔗",
  },
  {
    id: "research-organizer",
    name: "Research Organizer",
    description: "Organize research papers and notes",
    icon: "🔬",
  },
  {
    id: "knowledge-base",
    name: "Knowledge Base",
    description: "Centralize your team or personal knowledge",
    icon: "🏛️",
  },
  {
    id: "pdf-scanner",
    name: "PDF Scanner",
    description: "Scan physical documents to PDF",
    icon: "🖨️",
  },
  {
    id: "ocr-scanner",
    name: "OCR Scanner",
    description: "Extract text from scanned documents",
    icon: "👁️",
  },
  {
    id: "document-manager",
    name: "Document Manager",
    description: "Organize and manage your documents",
    icon: "🗂️",
  },
  {
    id: "file-organizer",
    name: "File Organizer",
    description: "Organize your files efficiently",
    icon: "📁",
  },
  {
    id: "google-drive-sync",
    name: "Cloud Storage",
    description: "Connect to Google Drive",
    icon: "☁️",
  },
  {
    id: "digital-signature",
    name: "Digital Signature",
    description: "Sign documents digitally",
    icon: "✍️",
  },
  {
    id: "resume-builder",
    name: "Resume Builder",
    description: "Build professional resumes",
    icon: "👔",
  },
  {
    id: "form-creator",
    name: "Form Creator",
    description: "Create custom forms and surveys",
    icon: "📝",
  },
  {
    id: "document-converter",
    name: "Document Converter",
    description: "Convert between different document formats",
    icon: "🔄",
  },
];
