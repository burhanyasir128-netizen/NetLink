/**
 * Client-side Image Compression via HTML5 Canvas
 * Enforces maximum width/height of 800px and 0.85 JPEG quality
 * to guarantee lightweight Base64 payloads for fast Google Drive uploads.
 */
export async function compressImage(fileOrBlob: File | Blob, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<{
  base64: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const originalSize = fileOrBlob.size;
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Fill with white background in case of transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image resized
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with specified quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

        // Estimate compressed size in bytes from Base64 string
        const base64Length = compressedBase64.length - (compressedBase64.indexOf(',') + 1);
        const compressedSize = Math.round((base64Length * 3) / 4);

        resolve({
          base64: compressedBase64,
          originalSize,
          compressedSize,
          width,
          height,
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Format bytes to readable string (KB, MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
