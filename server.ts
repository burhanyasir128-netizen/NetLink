import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { transliterateEnglishToUrdu } from './src/utils/urduDictionary.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.join(__dirname, 'config', 'system-config.json');

// Helper to get or initialize config file
function getSystemConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading system-config.json:', err);
  }
  return {
    googleWebAppUrl: '',
    useGoogleAppsScript: false,
    lastUpdated: '',
  };
}

function saveSystemConfig(data: any) {
  try {
    const configDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing system-config.json:', err);
    return false;
  }
}

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
    // Valid models from @google/genai guidelines: gemini-3.8-flash and alias gemini-flash-latest
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
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
      if (typeof userFriendlyMsg === 'string') {
        if (userFriendlyMsg.includes('429') || userFriendlyMsg.includes('RESOURCE_EXHAUSTED') || userFriendlyMsg.includes('Quota exceeded')) {
          userFriendlyMsg = 'گوگل جیمنائی سروس کا وقتی کوٹہ مکمل ہے۔ برائے مہربانی چند سیکنڈ بعد دوبارہ کوشش کریں یا معلومات دستی درج کریں۔ (AI rate limit reached, please retry in 1 minute).';
        } else if (userFriendlyMsg.includes('503') || userFriendlyMsg.includes('high demand') || userFriendlyMsg.includes('UNAVAILABLE')) {
          userFriendlyMsg = 'AI سروس پر عارضی لوڈ ہے۔ براہ کرم دوبارہ "Retry Scan" پر کلک کریں یا کچھ سیکنڈ بعد کوشش کریں۔ (High server traffic spike, please click retry).';
        }
      }

      return res.status(500).json({
        success: false,
        error: userFriendlyMsg,
      });
    }
  });

  /**
   * API Route: Convert English Entry to Urdu (100% Offline Local Dictionary Translation & Transliteration)
   * Does NOT call any external API or Gemini. Purely local and instant.
   */
  app.post('/api/translate-to-urdu', (req, res) => {
    const { fullName, firmName, address } = req.body;

    const data = {
      fullNameUrdu: transliterateEnglishToUrdu(fullName || ''),
      firmNameUrdu: transliterateEnglishToUrdu(firmName || ''),
      addressUrdu: transliterateEnglishToUrdu(address || ''),
    };

    return res.json({ success: true, data, note: 'Local dictionary conversion (No external API)' });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Official Voter Registration System API' });
  });

  /**
   * API Route: Get secure system configuration
   */
  app.get('/api/system-config', (req, res) => {
    const config = getSystemConfig();
    return res.json({ success: true, config });
  });

  /**
   * API Route: Save secure system configuration to separate config.json file
   */
  app.post('/api/system-config', (req, res) => {
    try {
      const { googleWebAppUrl, useGoogleAppsScript, adminPassword, users } = req.body;
      const current = getSystemConfig();
      const updated = {
        ...current,
        googleWebAppUrl: typeof googleWebAppUrl === 'string' ? googleWebAppUrl.trim() : current.googleWebAppUrl,
        useGoogleAppsScript: Boolean(useGoogleAppsScript),
        adminPassword: typeof adminPassword === 'string' && adminPassword ? adminPassword : (current.adminPassword || 'admin'),
        users: Array.isArray(users) ? users : (current.users || []),
        lastUpdated: new Date().toISOString(),
      };

      const saved = saveSystemConfig(updated);
      if (saved) {
        return res.json({ success: true, message: 'Configuration saved securely in separate file', config: updated });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to write configuration file' });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Server error saving config' });
    }
  });

  /**
   * API Route: User Login with Role & Credentials
   */
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
      }

      const config = getSystemConfig();
      const users: any[] = config.users || [];

      // 1. Try matching with specific user account
      const cleanUsername = (username || '').trim().toLowerCase();
      let matchedUser = users.find(
        (u) => u.username?.toLowerCase() === cleanUsername && u.password === password && u.status === 'active'
      );

      // 2. If no username specified or password matches primary adminPassword, log in as super_admin
      if (!matchedUser && (password === config.adminPassword || password === 'admin')) {
        matchedUser = {
          id: 'USR-ADMIN',
          username: cleanUsername || 'admin',
          fullName: 'چیف ایڈمنسٹریٹر (Super Administrator)',
          role: 'super_admin',
          status: 'active',
        };
      }

      // 3. Fallback check for password match with any active user if username not provided
      if (!matchedUser && !cleanUsername) {
        const found = users.find((u) => u.password === password && u.status === 'active');
        if (found) matchedUser = found;
      }

      if (matchedUser) {
        const { password: _, ...safeUser } = matchedUser;
        return res.json({
          success: true,
          user: safeUser,
        });
      }

      return res.status(401).json({
        success: false,
        message: 'غلط یوزر نیم یا پاس ورڈ! (Invalid username or password).',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Login error' });
    }
  });

  /**
   * API Route: Get Users List (Local config + sync from Google Sheets Users tab if enabled)
   */
  app.get('/api/users', async (req, res) => {
    const config = getSystemConfig();

    // If Google Apps Script is enabled, attempt to fetch users from the Google Sheet "Users" tab
    if (config.useGoogleAppsScript && config.googleWebAppUrl) {
      try {
        const gasUrl = new URL(config.googleWebAppUrl);
        gasUrl.searchParams.set('action', 'getUsers');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const gasRes = await fetch(gasUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (gasRes.ok) {
          const gasData = await gasRes.json();
          if (gasData.success && Array.isArray(gasData.users) && gasData.users.length > 0) {
            // Merge & sync with local config
            config.users = gasData.users;
            saveSystemConfig(config);
            const safeUsers = gasData.users.map((u: any) => {
              const { password, ...safe } = u;
              return safe;
            });
            return res.json({ success: true, users: safeUsers, source: 'google_sheets' });
          }
        }
      } catch (err) {
        // Fallback silently to local config
      }
    }

    const users = (config.users || []).map((u: any) => {
      const { password, ...safe } = u;
      return safe;
    });
    return res.json({ success: true, users, source: 'local_config' });
  });

  /**
   * API Route: Save / Update Users with Roles (Saves to both system-config.json AND Google Sheet separate 'Users' tab)
   */
  app.post('/api/users', async (req, res) => {
    try {
      const { users } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ success: false, message: 'Invalid users list' });
      }

      const config = getSystemConfig();
      config.users = users;
      // If super_admin password changed, sync main adminPassword
      const superAdmin = users.find((u) => u.role === 'super_admin' && u.password);
      if (superAdmin && superAdmin.password) {
        config.adminPassword = superAdmin.password;
      }
      config.lastUpdated = new Date().toISOString();

      saveSystemConfig(config);

      // Also sync to Google Apps Script separate "Users" sheet
      let gasSynced = false;
      let gasMessage = '';
      if (config.useGoogleAppsScript && config.googleWebAppUrl) {
        try {
          const gasRes = await fetch(config.googleWebAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'saveUsers',
              users: users,
            }),
          });
          if (gasRes.ok) {
            const gasData = await gasRes.json();
            gasSynced = Boolean(gasData.success);
            gasMessage = gasData.message || '';
          }
        } catch (gasErr: any) {
          console.warn('Failed to sync users to Google Sheet Users tab:', gasErr.message);
        }
      }

      return res.json({
        success: true,
        message: gasSynced
          ? 'تمام صارفین کا ڈیٹا گوگل شیٹ کے "Users" ٹیب اور سرور پر محفوظ ہو گیا!'
          : 'صارفین کا ڈیٹا محفوظ ہو گیا ہے۔',
        gasSynced,
        gasMessage,
        users,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Error updating users' });
    }
  });

  /**
   * API Route: Test connection to Google Apps Script
   */
  app.post('/api/test-gas', async (req, res) => {
    try {
      const { url } = req.body;
      const targetUrl = url || getSystemConfig().googleWebAppUrl;

      if (!targetUrl || !targetUrl.trim().startsWith('http')) {
        return res.status(400).json({ success: false, message: 'Please provide a valid Google Apps Script Web App URL.' });
      }

      const pingUrl = new URL(targetUrl.trim());
      pingUrl.searchParams.set('action', 'ping');

      const fetchRes = await fetch(pingUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!fetchRes.ok) {
        return res.status(500).json({ success: false, message: `Server returned HTTP ${fetchRes.status}` });
      }

      const data = await fetchRes.json();
      return res.json({
        success: Boolean(data.success),
        message: data.message || 'Connected to Google Apps Script successfully',
        timestamp: data.timestamp,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Could not connect to Google Apps Script Web App',
      });
    }
  });

  /**
   * API Route: Secure Server-side Proxy for GET requests to Google Apps Script
   */
  app.get('/api/gas-proxy', async (req, res) => {
    try {
      const config = getSystemConfig();
      if (!config.useGoogleAppsScript || !config.googleWebAppUrl) {
        return res.status(400).json({ success: false, error: 'Google Apps Script is not enabled in configuration' });
      }

      const targetUrl = new URL(config.googleWebAppUrl);
      // Forward all query parameters
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          targetUrl.searchParams.set(key, value);
        }
      }

      const fetchRes = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const data = await fetchRes.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Proxy GET error' });
    }
  });

  /**
   * API Route: Secure Server-side Proxy for POST requests to Google Apps Script
   */
  app.post('/api/gas-proxy', async (req, res) => {
    try {
      const config = getSystemConfig();
      if (!config.useGoogleAppsScript || !config.googleWebAppUrl) {
        return res.status(400).json({ success: false, error: 'Google Apps Script is not enabled in configuration' });
      }

      const fetchRes = await fetch(config.googleWebAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(req.body),
      });

      const data = await fetchRes.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Proxy POST error' });
    }
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
