// Format currency
export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

// Generate order number: AFY-2026-000123
export function generateOrderNumber(year: number, sequence: number): string {
  return `AFY-${year}-${String(sequence).padStart(6, '0')}`;
}

// Parse TOTAL response from pharmacy
export function parseTotalResponse(message: string): number | null {
  const match = message.trim().match(/^TOTAL[:\s]+?(\d+)$/i);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  if (isNaN(amount) || amount <= 0) return null;
  return amount;
}

// Format phone number for display
export function formatPhone(phone: string): string {
  if (phone.startsWith('+256')) {
    return `+256 ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
  return phone;
}

// Truncate string
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

// Relative time (e.g., "2 min ago")
export function relativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return then.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
