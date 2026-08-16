import express from "express";
import { OpenAI } from "openai";
import multer from "multer";
import fs from "fs";


const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Generate PDF from prompt using OpenAI and Puppeteer
router.post("/generate", async (req, res) => {
  try {
    const { prompt, apiKey } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });

    const systemInstruction = `
      You are an expert document designer. Generate a clean, modern HTML document
      based on the user request. Include internal CSS styling inside <style> tags.
      Output ONLY raw HTML. Do not include markdown wraps like \`\`\`html.
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
    });

    let htmlContent =
      response.choices[0].message.content ||
      "<html><body>Error generating content</body></html>";
    // Clean up potential markdown formatting just in case
    htmlContent = htmlContent.replace(/^```html\s*/, "").replace(/```\s*$/, "");

    // Launch puppeteer to generate PDF
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="generated_doc.pdf"',
    );
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: error.message || "Failed to generate PDF" });
  }
});

// Edit PDF text
router.post("/edit", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    const { searchText, replaceText, apiKey } = req.body;

    if (!file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    if (!searchText || !replaceText) {
      return res
        .status(400)
        .json({ error: "searchText and replaceText are required" });
    }

    const client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });

    // Read the existing PDF
    const dataBuffer = fs.readFileSync(file.path);
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const parsedData = await pdfParse(dataBuffer);
    const fullText = parsedData.text;

    // Ask OpenAI to perform the text modification safely
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a precise document editor. Modify the text provided by the user exactly as instructed. Keep everything else intact.",
        },
        {
          role: "user",
          content: `In the following text, replace '${searchText}' with '${replaceText}':\n\n${fullText}`,
        },
      ],
    });

    const modifiedText = response.choices[0].message.content || "";

    // Wrap modified text back to HTML for a clean PDF rewrite
    const htmlLayout = `<html><body style='font-family: Arial; white-space: pre-wrap;'>${modifiedText.replace(/\n/g, "<br>")}</body></html>`;

    // Generate new PDF using puppeteer
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlLayout, { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="edited_doc.pdf"',
    );
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Error editing PDF:", error);
    res.status(500).json({ error: error.message || "Failed to edit PDF" });
  } finally {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error("Failed to cleanup PDF edit temp file:", e);
      }
    }
  }
});

export default router;
