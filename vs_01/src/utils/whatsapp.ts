/**
 * Utility for WhatsApp direct link opening in a new browser tab.
 * Example target: https://wa.me/19999011852
 */

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  // Strip spaces, dashes, parentheses, plus signs, and any non-numeric character
  let cleaned = phone.replace(/[^0-9]/g, "");

  // If starts with Mexican prefixes 521 or 52 with 10 following digits, strip them to get base 10 digits
  if (cleaned.startsWith("521") && cleaned.length === 13) {
    cleaned = cleaned.slice(3); // 10 digits
  } else if (cleaned.startsWith("52") && cleaned.length === 12) {
    cleaned = cleaned.slice(2); // 10 digits
  }

  // User specification: Always use prefix 1 (e.g. 9999011852 -> 19999011852 for https://wa.me/19999011852)
  if (cleaned.length === 10) {
    cleaned = `1${cleaned}`;
  } else if (cleaned.length > 11 && cleaned.startsWith("1")) {
    cleaned = cleaned.slice(0, 11);
  } else if (!cleaned.startsWith("1") && cleaned.length > 0) {
    cleaned = `1${cleaned}`;
  }

  return cleaned;
}

export function buildWhatsAppUrl(phone: string, message?: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return "";
  if (message && message.trim()) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message.trim())}`;
  }
  return `https://wa.me/${cleanPhone}`;
}

export function getWhatsAppDirectLink(phone: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return "";
  return `https://wa.me/${cleanPhone}`;
}

export function openWhatsAppInNewTab(phone: string, message?: string): boolean {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;

  try {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      // Fallback if popup blocker intercepted
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  } catch (err) {
    console.error("Error opening WhatsApp url:", err);
    window.location.href = url;
    return false;
  }
}
