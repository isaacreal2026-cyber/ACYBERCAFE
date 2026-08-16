import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';

const execAsync = promisify(exec);

const router = express.Router();
const upload = multer({ dest: '/tmp/agent_uploads/' });

// Ensure the upload directory exists
if (!fs.existsSync('/tmp/agent_uploads/')) {
  fs.mkdirSync('/tmp/agent_uploads/', { recursive: true });
}

// Endpoint to handle Agent Execution
router.post('/process', upload.single('file'), async (req, res) => {
  const file = req.file;
  try {
    const { taskType, prompt, history, fileContext } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let generatedFileUrl = null;
    let textResponse = '';

    // If it's a Passport Photo task, we can run rembg immediately
    if (taskType === 'passport_photo' && file) {
      const imgBuffer = fs.readFileSync(file.path);
      
      try {
        console.log('[Agent] Processing passport photo using sharp...');
        
        // Use sharp to composite it onto a white/blue background and crop to passport size (e.g., 2x2 inches or 600x600 px)
        const sharp = require('sharp');
        
        // Standard passport size: 600x600 pixels at 300 DPI, blue background (#0055A4 is common, or white)
        const bgColor = prompt?.toLowerCase().includes('white') ? '#FFFFFF' : '#0055A4';
        
        // Since background removal is disabled, we will just resize the image to passport size.
        const finalBuffer = await sharp(imgBuffer)
          .resize(600, 600, {
            fit: 'cover',
            position: 'top' // usually head is at the top
          })
          .jpeg()
          .toBuffer();
          
        const filename = `passport_${Date.now()}.jpg`;
        const outPath = path.join(process.cwd(), 'dist', 'outputs');
        if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
        
        fs.writeFileSync(path.join(outPath, filename), finalBuffer);
        generatedFileUrl = `/outputs/${filename}`;
        textResponse = `I have successfully processed your photo. Note: Background removal has been temporarily disabled due to server environment constraints. Your photo has been cropped to standard passport dimensions.`;

      } catch (err: any) {
        console.error('[Agent] sharp error:', err);
        return res.status(500).json({ error: "Failed to process photo: " + err.message });
      }
    } 
    // Document Formatting / Government Forms / PDF Toolkit via Code Generation
    else {
      // Create a temporary script file
      const scriptPath = path.join('/tmp/agent_uploads', `agent_script_${Date.now()}.js`);
      const outputFilename = `output_${Date.now()}.${taskType === 'document_formatter' ? 'docx' : 'pdf'}`;
      const outputPath = path.join(process.cwd(), 'dist', 'outputs');
      if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
      const fullOutputPath = path.join(outputPath, outputFilename);

      const filePathEscaped = file ? file.path.replace(/\\/g, '\\\\') : '';
      const outPathEscaped = fullOutputPath.replace(/\\/g, '\\\\');

      const systemPrompt = `You are a Senior Node.js Developer and AI Assistant Orchestrator. 
Your task is to evaluate the user's request and conversation history. 
If you need more information from the user to complete the task (e.g., missing name, ID, or content for a form/document), ask for it.
If you have all the necessary information, you must write a single, self-contained CommonJS Node.js script that will be executed to fulfill the user's request.

The script MUST be written in JavaScript (not Python) and use ONLY the following pre-installed packages: 'pdf-lib', 'docx', 'fs', 'path'.
The script MUST output the final file exactly to: "${outPathEscaped}"
${file ? `An input file is located at: "${filePathEscaped}". Read it using fs.readFileSync.` : ''}

Task Context: ${taskType}
User Request: ${prompt}
Conversation History: 
${history}
File Content/Context (if any): ${fileContext || 'none'}

IMPORTANT: 
- You MUST return a valid JSON object with the following schema:
{
  "needsInfo": boolean, // true if you are asking the user for more details, false if you are generating the script
  "chatResponse": string, // The message to show the user
  "code": string | null // The raw JavaScript code block if needsInfo is false, otherwise null
}

CODE REQUIREMENTS (if needsInfo is false):
- Always require modules using \`const fs = require('fs');\` format.
- Catch any errors and console.error them.
- If it's a PDF task (PDF Toolkit or Government Form), use \`pdf-lib\`.
- If it's a Document formatting task (Document Formatter), use \`docx\` to build a clean Word Document and write it to the output path.
- Remember to await promises correctly. Wrap top-level code in an async IIFE \`(async () => { ... })();\`.`;

      console.log('[Agent] Requesting decision/script generation from Gemini...');
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      try {
        const result = JSON.parse(response.text || '{}');
        textResponse = result.chatResponse || "I am processing your request.";
        
        if (result.needsInfo || !result.code) {
          // Send back the conversational response, no script execution
          return res.json({ text: textResponse, fileUrl: null });
        }

        let code = result.code;
        // Clean markdown tags if it accidentally included them
        code = code.replace(/```javascript/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();

        console.log('[Agent] Generated Script:\n', code);
        fs.writeFileSync(scriptPath, code);

        try {
          console.log('[Agent] Executing Sandbox Script...');
          const { stdout, stderr } = await execAsync(`node ${scriptPath}`, { timeout: 15000 });
          console.log('[Agent Script Stdout]:', stdout);
          if (stderr) console.error('[Agent Script Stderr]:', stderr);
          
          if (fs.existsSync(fullOutputPath)) {
            generatedFileUrl = `/outputs/${outputFilename}`;
            // Append success text
            textResponse += `\n\nI have completed the task successfully. You can view or download the generated file below.`;
          } else {
            textResponse += `\n\nI encountered an issue generating the file. The script executed but the output file was not found.`;
          }
        } catch (err: any) {
          console.error('[Agent Script Exec Error]:', err.message);
          textResponse = `There was an error executing the workflow: ${err.message}`;
        } finally {
          if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        }
      } catch (parseError: any) {
        console.error('[Agent JSON Parse Error]', parseError);
        textResponse = `I failed to understand the internal structure. Please try again.`;
      }
    }

    res.json({
      text: textResponse,
      fileUrl: generatedFileUrl
    });

  } catch (err: any) {
    console.error("[Agent Error]", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  } finally {
    if (file && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error('[Agent] Failed to unlink temp file:', e);
      }
    }
  }
});

export default router;
