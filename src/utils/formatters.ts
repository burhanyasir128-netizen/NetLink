/**
 * Format CNIC to standard Pakistani format: XXXXX-XXXXXXX-X
 */
export function formatCnic(value: string): string {
  // Strip non-digits
  const digits = value.replace(/\D/g, '').slice(0, 13);
  
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

export function isValidCnic(cnic: string): boolean {
  const digits = cnic.replace(/\D/g, '');
  return digits.length === 13;
}

/**
 * Format Mobile number: 03XXXXXXXXX (or 03XX-XXXXXXX)
 */
export function formatMobile(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) {
    return digits;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function isValidMobile(mobile: string): boolean {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('03');
}

/**
 * Format date for display
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}
