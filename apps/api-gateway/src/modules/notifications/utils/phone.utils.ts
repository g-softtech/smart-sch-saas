/**
 * Normalizes a Nigerian phone number for WhatsApp Cloud API.
 * The API requires the format: 2348030000000 (no +, no leading 0)
 */
export function normalizeWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Strip all non-digit characters (including +, spaces, hyphens)
  let cleaned = phone.replace(/\D/g, '');

  if (!cleaned) return null;

  // If it starts with 0 and has 11 digits (e.g., 08030000000), replace 0 with 234
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.substring(1);
  }

  // Basic sanity check: Nigerian WhatsApp numbers should start with 234 and be 13 digits long.
  // We allow some flexibility in case of non-Nigerian numbers starting with other country codes,
  // but if it's too short (less than 10 digits) or too long (more than 15), it's probably invalid.
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}
