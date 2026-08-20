// Order number prefix
export const ORDER_PREFIX = 'AFY';

// Default currency
export const DEFAULT_CURRENCY = 'UGX';

// PesaPal environments
export const PESAPAL_SANDBOX_URL = 'https://cybqa.pesapal.com/pesapalv3';
export const PESAPAL_LIVE_URL = 'https://pay.pesapal.com/v3';

// WhatsApp message templates
export const WA_MESSAGES = {
  ORDER_RECEIVED: (pharmacyName: string, orderNumber: string) => 
    `Thank you.\n\nYour order has been received by\n${pharmacyName}.\n\nOrder ID:\n${orderNumber}\n\nThe pharmacy is reviewing your order.\n\nYou will receive the total shortly.`,
  
  ORDER_NOTIFICATION: (orderNumber: string, clinicName: string, clinicPhone: string, orderMessage: string) =>
    `🛒 NEW AFYA LINKS ORDER\nOrder: ${orderNumber}\n Clinic: ${clinicName}\n Phone: ${clinicPhone}\n\nOrder:\n${orderMessage}\n\nPlease review the order and reply:\nTOTAL <amount>`,
  
  PRICE_CONFIRMED: (orderNumber: string, pharmacyName: string, amount: string, paymentLink: string) =>
    `Order #${orderNumber}\n\n${pharmacyName} has confirmed your order.\n\nTotal:\n${amount}\n\nPlease complete payment here:\n\n${paymentLink}\n\nThank you for using Afya Links.`,
  
  PAYMENT_SUCCESS: (orderNumber: string, amount: string, pharmacyName: string) =>
    `Payment received ✓\n\nOrder #${orderNumber}\n\nAmount paid:\n${amount}\n\nPharmacy:\n${pharmacyName}\n\nYour payment has been confirmed.\n\nAfya Links\ngetafyalinks.com`,
  
  PAYMENT_FAILED: (orderNumber: string, paymentLink: string) =>
    `Payment could not be completed.\n\nOrder:\n${orderNumber}\n\nPlease try again using:\n\n${paymentLink}`,
};

// Status colors for UI
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'green',
  CONNECTED: 'green',
  COMPLETED: 'green',
  PAID: 'green',
  PENDING: 'yellow',
  CONNECTING: 'yellow',
  AWAITING_PRICE: 'yellow',
  PAYMENT_PENDING: 'yellow',
  PROCESSING: 'blue',
  RECEIVED: 'blue',
  SENT_TO_PHARMACY: 'blue',
  PRICE_RECEIVED: 'blue',
  DISPATCHED: 'blue',
  SUSPENDED: 'orange',
  DISCONNECTED: 'red',
  FAILED: 'red',
  CANCELLED: 'red',
  INACTIVE: 'gray',
  EXPIRED: 'gray',
  UNKNOWN: 'gray',
  REFUNDED: 'purple',
};

// Pharmacy statuses
export const PHARMACY_STATUSES = ['ACTIVE', 'SUSPENDED', 'PENDING', 'INACTIVE'] as const;

// Order statuses
export const ORDER_STATUSES = ['RECEIVED', 'SENT_TO_PHARMACY', 'AWAITING_PRICE', 'PRICE_RECEIVED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'DISPATCHED', 'COMPLETED', 'CANCELLED', 'EXPIRED'] as const;

// Payment statuses
export const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'UNKNOWN'] as const;
