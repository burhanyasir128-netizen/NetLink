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
   * Scan image of manual voter registration form or slip via Gemini Vision OCR
   */
  static async scanManualForm(imageBase64: string): Promise<{ success: boolean; data?: ScannedFormData; error?: string }> {
    try {
      const response = await fetch('/api/scan-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        let msg = `Server returned HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.error) {
            msg = typeof errJson.error === 'string' ? errJson.error : JSON.stringify(errJson.error);
          }
        } catch {
          const errorText = await response.text();
          if (errorText) msg = errorText;
        }
        throw new Error(msg);
      }

      const result = await response.json();
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'Failed to parse form content' };
    } catch (err: any) {
      console.error('OCR Scanning failed:', err);
      return { success: false, error: err.message || 'Scanning service unavailable' };
    }
  }

  /**
   * Convert English entries to proper Urdu text
   */
  static async translateToUrdu(params: { fullName: string; firmName: string; address: string }): Promise<{
    success: boolean;
    data?: TranslationData;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/translate-to-urdu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'Translation failed' };
    } catch (err: any) {
      console.error('Urdu translation failed:', err);
      return { success: false, error: err.message || 'Translation service unavailable' };
    }
  }
}
