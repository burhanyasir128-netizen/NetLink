import { transliterateEnglishToUrdu } from '../utils/urduDictionary';

export interface ScannedFormData {
  fullName?: string;
  fullNameUrdu?: string;
  firmName?: string;
  firmNameUrdu?: string;
  cnic?: string;
  mobile?: string;
  address?: string;
  addressUrdu?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  notes?: string;
}

export interface TranslationData {
  fullNameUrdu?: string;
  firmNameUrdu?: string;
  addressUrdu?: string;
}

export class AiService {
  /**
   * Scan image of manual voter registration form or slip via Gemini Vision OCR (if available) or graceful guide
   */
  static async scanManualForm(imageBase64: string): Promise<{ success: boolean; data?: ScannedFormData; error?: string }> {
    try {
      const response = await fetch('/api/scan-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      const responseText = await response.text();
      let result: any = null;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = null;
      }

      if (!response.ok) {
        let msg = `Server returned HTTP ${response.status}`;
        if (result && result.error) {
          msg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
        } else if (responseText) {
          msg = responseText.slice(0, 200);
        }
        throw new Error(msg);
      }

      if (result && result.success && result.data) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result?.error || 'Failed to parse form content' };
    } catch (err: any) {
      console.error('OCR Scanning failed:', err);
      return { success: false, error: err.message || 'Scanning service unavailable' };
    }
  }

  /**
   * Convert English entries to proper Urdu text completely offline without requiring any external AI API
   */
  static async translateToUrdu(params: { fullName: string; firmName: string; address: string }): Promise<{
    success: boolean;
    data?: TranslationData;
    error?: string;
  }> {
    // 100% offline local conversion directly without external API dependency
    try {
      const fullNameUrdu = transliterateEnglishToUrdu(params.fullName || '');
      const firmNameUrdu = transliterateEnglishToUrdu(params.firmName || '');
      const addressUrdu = transliterateEnglishToUrdu(params.address || '');

      return {
        success: true,
        data: {
          fullNameUrdu,
          firmNameUrdu,
          addressUrdu,
        },
      };
    } catch (err: any) {
      console.error('Urdu translation failed:', err);
      return {
        success: false,
        error: err.message || 'Translation unavailable',
      };
    }
  }
}
