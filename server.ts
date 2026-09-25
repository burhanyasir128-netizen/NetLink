import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Body parser for JSON payloads (with large limit for base64 form photos)
  app.use(express.json({ limit: '20mb' }));

  // Initialize Gemini AI
  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : new GoogleGenAI();

  /**
   * Helper: Generate content with automatic model fallback & retry for 503/429 spikes
   */
  async function generateContentWithFallback(requestConfig: any) {
    // Models to try in order of availability and stability for multimodal vision OCR
    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            ...requestConfig,
            model,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || JSON.stringify(err);
          const isOverloaded = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');

          console.warn(`[Gemini API] Model ${model} attempt ${attempt + 1} failed:`, errMsg);

          if (isOverloaded && attempt === 0) {
            // Short backoff before retrying
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          // If overloaded or failed on second attempt, break to next candidate model
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * API Route: Scan Manual Voter Form via Gemini Multimodal Vision OCR
   */
  app.post('/api/scan-form', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'No image provided for scanning' });
      }

      // Clean base64 string
      let mimeType = 'image/jpeg';
      let data = imageBase64;
      if (imageBase64.includes('data:')) {
        const parts = imageBase64.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
        data = parts[1];
      }

      const prompt = `You are an expert Document Analysis and OCR engine for the Election Commission of Pakistan (specifically for Urdu Bazar Lahore voter registrations).
Analyze this image of a handwritten or printed manual voter registration form, registration slip, CNIC, or trade association membership voucher.

Carefully identify and extract the following voter details:
1. Full Name (Voter Name / بنام ووٹر)
2. Firm or Shop Name (Business name / نام فرم یا دکان)
3. CNIC Number (13 digits, format: XXXXX-XXXXXXX-X)
4. Mobile Phone Number (11 digits, Pakistani format e.g. 03001234567 or 03XX-XXXXXXX)
5. Complete Address (دکان یا رہائشی پتہ)

Also, provide accurate Urdu translations/transliterations for English names, firm names, and addresses.

Respond ONLY with a valid JSON object in this exact schema without markdown backticks or commentary:
{
  "fullName": "Name in English or original",
  "fullNameUrdu": "Name in Urdu Nastaliq (e.g. محمد بلال)",
  "firmName": "Firm/Shop name in English or original",
  "firmNameUrdu": "Firm/Shop name in Urdu (e.g. سنگ میل پبلی کیشنز)",
  "cnic": "XXXXX-XXXXXXX-X",
  "mobile": "03XXXXXXXXX",
  "address": "Address in English or original",
  "addressUrdu": "Address in Urdu (e.g. دکان نمبر 24، سرکلر روڈ، اردو بازار، لاہور)",
  "confidence": "High" | "Medium" | "Low",
  "notes": "Any note about legibility or detected text"
}`;

      const response = await generateContentWithFallback({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text?.trim() || '{}';
      let parsed = {};
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        // Strip markdown fences if any
        const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      return res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error('Error in /api/scan-form:', error);
      let userFriendlyMsg = error.message || 'Failed to scan manual form';
      if (typeof userFriendlyMsg === 'string' && (userFriendlyMsg.includes('503') || userFriendlyMsg.includes('high demand') || userFriendlyMsg.includes('UNAVAILABLE'))) {
        userFriendlyMsg = 'AI سروس پر عارضی لوڈ ہے۔ براہ کرم دوبارہ "Retry Scan" پر کلک کریں یا کچھ سیکنڈ بعد کوشش کریں۔ (High server traffic spike, please click retry).';
      }

      return res.status(500).json({
        success: false,
        error: userFriendlyMsg,
      });
    }
  });

  /**
   * API Route: Convert English Entry to Urdu (Translation & Transliteration)
   */
  app.post('/api/translate-to-urdu', async (req, res) => {
    try {
      const { fullName, firmName, address } = req.body;

      const prompt = `You are a professional English-to-Urdu translator for Pakistani election and business records (Urdu Bazar Lahore).
Translate and transliterate the following English voter registration entries into high-quality Urdu:

Full Name: "${fullName || ''}"
Firm / Shop Name: "${firmName || ''}"
Address: "${address || ''}"

Return ONLY a valid JSON object in this exact schema without markdown backticks:
{
  "fullNameUrdu": "Urdu version of the name (e.g. Muhammad Bilal -> محمد بلال)",
  "firmNameUrdu": "Urdu version of firm name (e.g. Sang-e-Meel Publications -> سنگ میل پبلی کیشنز)",
  "addressUrdu": "Urdu version of the address (e.g. Shop # 24, Urdu Bazar Lahore -> دکان نمبر 24، اردو بازار، لاہور)"
}`;

      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text?.trim() || '{}';
      let parsed = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      return res.json({ success: true, data: parsed });
    } catch (error: any) {
      console.error('Error in /api/translate-to-urdu:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to translate to Urdu',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Official Voter Registration System API' });
  });

  // Mount Vite middlewares in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static production build
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
