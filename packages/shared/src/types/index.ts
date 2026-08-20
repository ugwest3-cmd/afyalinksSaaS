// Pharmacy
export type PharmacyStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE';

export interface Pharmacy {
  id: string;
  name: string;
  legal_name: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  status: PharmacyStatus;
  whatsapp_number: string | null;
  whatsapp_session_id: string | null;
  pesapal_status: string | null;
  created_at: string;
  updated_at: string;
}

// Clinic
export interface Clinic {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  facility_type: string | null;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// WhatsApp Account
export type WhatsAppStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'PENDING';

export interface WhatsAppAccount {
  id: string;
  pharmacy_id: string;
  phone_number: string;
  session_id: string;
  status: WhatsAppStatus;
  last_connected_at: string | null;
  last_disconnected_at: string | null;
  created_at: string;
  updated_at: string;
}

// Payment Account
export type PaymentEnvironment = 'SANDBOX' | 'LIVE';
export type PaymentAccountStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface PaymentAccount {
  id: string;
  pharmacy_id: string;
  provider: string;
  consumer_key_encrypted: string;
  consumer_secret_encrypted: string;
  status: PaymentAccountStatus;
  environment: PaymentEnvironment;
  created_at: string;
  updated_at: string;
}

// Order
export type OrderStatus = 'RECEIVED' | 'SENT_TO_PHARMACY' | 'AWAITING_PRICE' | 'PRICE_RECEIVED' | 'PAYMENT_PENDING' | 'PAID' | 'PROCESSING' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type PaymentStatusType = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'UNKNOWN';

export interface Order {
  id: string;
  order_number: string;
  pharmacy_id: string;
  clinic_id: string | null;
  whatsapp_account_id: string;
  customer_phone: string;
  original_message: string;
  amount: number | null;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatusType | null;
  pesapal_tracking_id: string | null;
  payment_link: string | null;
  created_at: string;
  updated_at: string;
  pharmacy?: { id: string; name: string };
}

// Order Attachment
export interface OrderAttachment {
  id: string;
  order_id: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

// Order Timeline
export interface OrderTimeline {
  id: string;
  order_id: string;
  event: string;
  details: string | null;
  timestamp: string;
}

// Payment
export interface Payment {
  id: string;
  order_id: string;
  pharmacy_id: string;
  provider: string;
  merchant_reference: string;
  pesapal_tracking_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatusType;
  payment_method: string | null;
  raw_status: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// Audit Log
export type AuditAction = 'ADMIN_CREATED_PHARMACY' | 'ADMIN_UPDATED_PHARMACY' | 'ADMIN_DELETED_PHARMACY' | 'WHATSAPP_CONNECTED' | 'WHATSAPP_DISCONNECTED' | 'ORDER_RECEIVED' | 'ORDER_SENT_TO_PHARMACY' | 'PRICE_SUBMITTED' | 'PAYMENT_CREATED' | 'PAYMENT_CONFIRMED' | 'PAYMENT_FAILED' | 'ORDER_CANCELLED' | 'PESAPAL_ERROR' | 'ADMIN_LOGIN' | 'ADMIN_LOGOUT';

export interface AuditLog {
  id: string;
  actor: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  ip_address: string | null;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalPharmacies: number;
  activeWhatsappNumbers: number;
  ordersToday: number;
  pendingOrders: number;
  paymentsToday: number;
  successfulPayments: number;
  totalPaymentsAmountToday: number;
}

// Create/Update DTOs
export interface CreatePharmacyDTO {
  name: string;
  legal_name?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  whatsapp_number?: string;
  pesapal_consumer_key?: string;
  pesapal_consumer_secret?: string;
  pesapal_environment?: PaymentEnvironment;
}

export interface UpdatePharmacyDTO extends Partial<CreatePharmacyDTO> {
  status?: PharmacyStatus;
}
