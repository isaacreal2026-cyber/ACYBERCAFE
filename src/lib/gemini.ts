import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

function getClient() {
  if (!API_KEY) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY);
  return genAI;
}

export async function generateWithGemini(prompt: string, systemContext?: string): Promise<string> {
  const client = getClient();
  if (!client) {
    return simulateFallback(prompt);
  }
  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const fullPrompt = systemContext ? `${systemContext}\n\n${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini error:', err);
    return simulateFallback(prompt);
  }
}

export async function chatWithGemini(
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> {
  if (!messages || messages.length === 0) {
    return simulateFallback('');
  }
  const client = getClient();
  if (!client) {
    const lastUser = messages.filter(m => m.role === 'user').pop();
    return simulateFallback(lastUser?.parts?.[0]?.text || '');
  }
  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction:
        'You are a helpful AI assistant for a cyber cafe management platform in Kenya. You assist cyber attendants and customers with various tasks including KRA services, eCitizen, NTSA, CV writing, government applications, and general assistance.',
    });
    const chat = model.startChat({ history: messages.slice(0, -1) });
    const lastMsg = messages[messages.length - 1];
    const textToSend = lastMsg?.parts?.[0]?.text || '';
    const result = await chat.sendMessage(textToSend);
    return result.response.text();
  } catch (err) {
    console.error('Gemini chat error:', err);
    const lastUser = messages.filter(m => m.role === 'user').pop();
    return simulateFallback(lastUser?.parts?.[0]?.text || '');
  }
}

export function hasGeminiKey(): boolean {
  return !!API_KEY;
}

function simulateFallback(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('cv') || lower.includes('resume')) {
    return `# Professional CV\n\n**Name:** [Your Name]\n**Email:** email@example.com | **Phone:** +254 7XX XXX XXX\n\n## Professional Summary\nDynamic professional with proven experience in delivering results. Strong analytical skills combined with effective communication abilities.\n\n## Work Experience\n### Senior Position | Company Name | 2021–Present\n- Led key initiatives resulting in measurable improvements\n- Collaborated with cross-functional teams\n\n## Education\n**Bachelor's Degree** | University | 2020\n\n## Skills\nMS Office, Communication, Teamwork, Problem Solving\n\n*Add your GEMINI_API_KEY for AI-powered CV generation*`;
  }
  if (lower.includes('letter')) {
    return `Dear Sir/Madam,\n\nI am writing to formally request your consideration regarding the matter at hand. I believe my qualifications and experience make me an excellent candidate for this opportunity.\n\nI look forward to your positive response.\n\nYours faithfully,\n[Your Name]\n\n*Add your GEMINI_API_KEY for AI-powered letter generation*`;
  }
  if (lower.includes('essay') || lower.includes('article')) {
    return `## Introduction\nThis essay explores an important topic relevant to our daily lives and broader society.\n\n## Main Body\nThere are several key points to consider when examining this subject...\n\n## Conclusion\nIn conclusion, this topic requires careful consideration and ongoing attention.\n\n*Add your GEMINI_API_KEY for AI-powered essay generation*`;
  }
  const responses = [
    `Thank you for your message. I'm here to help with cyber cafe services including KRA filing, eCitizen applications, NTSA services, CV writing, and more. How can I assist you today?\n\n*Note: Add GEMINI_API_KEY in Secrets for real AI responses.*`,
    `I can help with that! For cyber cafe services, we offer printing, scanning, government service assistance, document creation, and AI-powered writing tools.\n\n*Note: Add GEMINI_API_KEY in Secrets for real AI responses.*`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
