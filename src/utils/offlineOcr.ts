import { transliterateEnglishToUrdu } from './urduDictionary';
import { formatCnic, formatMobile } from './formatters';
import { ScannedFormData } from '../services/aiService';
import Tesseract from 'tesseract.js';

/**
 * Perform 100% offline OCR and pattern extraction directly in the browser using Tesseract.js and BarcodeDetector
 */
export async function scanDocumentOffline(imageBase64: string): Promise<ScannedFormData> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;

        if (!ctx) {
          return resolve(getFallbackData('Canvas context unavailable'));
        }

        ctx.drawImage(img, 0, 0, w, h);

        // 1. Check browser native BarcodeDetector for QR codes or Barcodes
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix', 'pdf417'],
            });

            const barcodes = await barcodeDetector.detect(canvas);
            if (barcodes && barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue || '';
              const parsed = parseRawVoterSlipString(rawVal);
              if (parsed.cnic || parsed.fullName || parsed.mobile) {
                parsed.notes = 'Scanned via offline QR/Barcode.';
                return resolve(parsed);
              }
            }
          } catch {
            // Ignore barcode errors and proceed to Tesseract OCR
          }
        }

        // 2. Run 100% Offline Tesseract OCR
        try {
          const tesseractResult = await Tesseract.recognize(canvas, 'eng', {
            logger: () => {},
          });
          const text = tesseractResult.data.text || '';
          const parsed = parseRawVoterSlipString(text);
          parsed.notes = 'Scanned 100% offline using browser OCR.';
          return resolve(parsed);
        } catch (ocrErr: any) {
          return resolve(getFallbackData('OCR extraction failed: ' + ocrErr.message));
        }
      } catch (err: any) {
        resolve(getFallbackData(err.message));
      }
    };

    img.onerror = () => {
      resolve(getFallbackData('Image failed to load'));
    };

    img.src = imageBase64;
  });
}

function parseRawVoterSlipString(raw: string): ScannedFormData {
  // Extract CNIC (13 digits with or without hyphens)
  const cnicMatch = raw.match(/\b\d{5}[-\s]?\d{7}[-\s]?\d\b/) || raw.match(/\b\d{13}\b/);
  // Extract Mobile (03XXXXXXXXX)
  const mobileMatch = raw.match(/\b03\d{2}[-\s]?\d{7}\b/) || raw.match(/\b03\d{9}\b/);

  const cnic = cnicMatch ? formatCnic(cnicMatch[0]) : '';
  const mobile = mobileMatch ? formatMobile(mobileMatch[0]) : '';

  let fullName = '';
  let firmName = '';
  let address = '';

  // Check JSON format if encoded
  if (raw.trim().startsWith('{') && raw.trim().endsWith('}')) {
    try {
      const j = JSON.parse(raw);
      fullName = j.fullName || j.name || '';
      firmName = j.firmName || j.firm || '';
      address = j.address || '';
    } catch {
      // Not JSON
    }
  }

  // Extract lines and heuristic parsing
  const lines = raw.split(/[\r\n,|;]+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!fullName && !line.includes(cnic) && !line.includes(mobile) && line.length > 2 && !line.toLowerCase().includes('election') && !line.toLowerCase().includes('commission')) {
      fullName = line;
    } else if (!firmName && line.length > 2 && line !== fullName && !line.includes(cnic)) {
      firmName = line;
    } else if (!address && line.length > 4 && (line.toLowerCase().includes('bazar') || line.toLowerCase().includes('shop') || line.toLowerCase().includes('lahore'))) {
      address = line;
    }
  }

  const fullNameUrdu = fullName ? transliterateEnglishToUrdu(fullName) : '';
  const firmNameUrdu = firmName ? transliterateEnglishToUrdu(firmName) : '';
  const addressUrdu = address ? transliterateEnglishToUrdu(address) : '';

  return {
    fullName,
    fullNameUrdu,
    firmName,
    firmNameUrdu,
    cnic,
    mobile,
    address,
    addressUrdu,
    confidence: cnic ? 'High' : 'Medium',
    notes: '100% offline OCR parsed successfully.',
  };
}

function getFallbackData(reason?: string): ScannedFormData {
  return {
    fullName: '',
    fullNameUrdu: '',
    firmName: '',
    firmNameUrdu: '',
    cnic: '',
    mobile: '',
    address: '',
    addressUrdu: '',
    confidence: 'Low',
    notes: reason || 'Offline scan fallback',
  };
}
