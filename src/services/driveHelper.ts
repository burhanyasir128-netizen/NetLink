/**
 * Google Drive URL Parser and Converter
 * Converts Google Drive share links into direct image viewing and thumbnail URLs
 */

export function extractDriveFileId(url: string): string | null {
  if (!url) return null;

  // Patterns for Google Drive file links
  const fileDPattern = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const idParamPattern = /[?&]id=([a-zA-Z0-9_-]+)/;
  const ucPattern = /\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/;
  const openPattern = /\/open\?(?:.*&)?id=([a-zA-Z0-9_-]+)/;
  const googleusercontentPattern = /googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/;

  let match = url.match(fileDPattern);
  if (match && match[1]) return match[1];

  match = url.match(idParamPattern);
  if (match && match[1]) return match[1];

  match = url.match(ucPattern);
  if (match && match[1]) return match[1];

  match = url.match(openPattern);
  if (match && match[1]) return match[1];

  match = url.match(googleusercontentPattern);
  if (match && match[1]) return match[1];

  return null;
}

export function getDirectImageUrl(urlOrBase64: string, size: 'thumb' | 'medium' | 'large' = 'medium'): string {
  if (!urlOrBase64) return '';

  // If already base64 data URL, return as-is
  if (urlOrBase64.startsWith('data:image')) {
    return urlOrBase64;
  }

  // Check if it's a Google Drive link
  const fileId = extractDriveFileId(urlOrBase64);
  if (fileId) {
    if (size === 'thumb') {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w150`;
    }
    if (size === 'medium') {
      return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
    }
    return `https://lh3.googleusercontent.com/d/${fileId}=w800`;
  }

  return urlOrBase64;
}

export const DEFAULT_AVATAR_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
