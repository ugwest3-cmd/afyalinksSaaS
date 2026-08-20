-- ============================================================
-- AFYA LINKS — Initial Database Schema
-- Multi-Pharmacy Wholesale Ordering Platform
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE pharmacy_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING', 'INACTIVE');
CREATE TYPE whatsapp_status AS ENUM ('CONNECTED', 'DISCONNECTED', 'CONNECTING', 'PENDING');
CREATE TYPE payment_account_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
CREATE TYPE payment_environment AS ENUM ('SANDBOX', 'LIVE');
CREATE TYPE order_status AS ENUM (
  'RECEIVED', 'SENT_TO_PHARMACY', 'AWAITING_PRICE', 'PRICE_RECEIVED',
  'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'DISPATCHED',
  'COMPLETED', 'CANCELLED', 'EXPIRED'
);
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'UNKNOWN');

-- ============================================================
-- 1. PHARMACIES
-- ============================================================

CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'Uganda',
  status pharmacy_status NOT NULL DEFAULT 'PENDING',
  whatsapp_number TEXT,
  whatsapp_session_id TEXT,
  pesapal_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pharmacies_status ON pharmacies(status);
CREATE INDEX idx_pharmacies_name ON pharmacies(name);

-- ============================================================
-- 2. CLINICS
-- ============================================================

CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  facility_type TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clinics_phone ON clinics(phone);

-- ============================================================
-- 3. WHATSAPP ACCOUNTS
-- ============================================================

CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL UNIQUE,
  status whatsapp_status NOT NULL DEFAULT 'PENDING',
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_accounts_pharmacy ON whatsapp_accounts(pharmacy_id);
CREATE INDEX idx_whatsapp_accounts_phone ON whatsapp_accounts(phone_number);
CREATE INDEX idx_whatsapp_accounts_session ON whatsapp_accounts(session_id);

-- ============================================================
-- 4. PAYMENT ACCOUNTS (PesaPal Credentials)
-- ============================================================

CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pesapal',
  consumer_key_encrypted TEXT NOT NULL,
  consumer_secret_encrypted TEXT NOT NULL,
  status payment_account_status NOT NULL DEFAULT 'PENDING',
  environment payment_environment NOT NULL DEFAULT 'SANDBOX',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_accounts_pharmacy ON payment_accounts(pharmacy_id);

-- ============================================================
-- 5. ORDERS
-- ============================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id),
  clinic_id UUID REFERENCES clinics(id),
  whatsapp_account_id UUID NOT NULL REFERENCES whatsapp_accounts(id),
  customer_phone TEXT NOT NULL,
  original_message TEXT NOT NULL,
  amount NUMERIC(15, 2),
  currency TEXT NOT NULL DEFAULT 'UGX',
  status order_status NOT NULL DEFAULT 'RECEIVED',
  payment_status payment_status,
  pesapal_tracking_id TEXT,
  payment_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_pharmacy ON orders(pharmacy_id);
CREATE INDEX idx_orders_clinic ON orders(clinic_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);

-- ============================================================
-- 6. ORDER ATTACHMENTS
-- ============================================================

CREATE TABLE order_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_attachments_order ON order_attachments(order_id);

-- ============================================================
-- 7. ORDER TIMELINE
-- ============================================================

CREATE TABLE order_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_timeline_order ON order_timeline(order_id);
CREATE INDEX idx_order_timeline_timestamp ON order_timeline(timestamp DESC);

-- ============================================================
-- 8. PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id),
  provider TEXT NOT NULL DEFAULT 'pesapal',
  merchant_reference TEXT NOT NULL,
  pesapal_tracking_id TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  status payment_status NOT NULL DEFAULT 'PENDING',
  payment_method TEXT,
  raw_status TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_pharmacy ON payments(pharmacy_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_merchant_ref ON payments(merchant_reference);
CREATE INDEX idx_payments_tracking ON payments(pesapal_tracking_id);

-- ============================================================
-- 9. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor);

-- ============================================================
-- ORDER NUMBER SEQUENCE
-- ============================================================

CREATE SEQUENCE order_number_seq START WITH 1 INCREMENT BY 1;

-- Helper function to generate order numbers: AFY-2026-000001
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
  year_part TEXT;
BEGIN
  seq_val := nextval('order_number_seq');
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  RETURN 'AFY-' || year_part || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_accounts_updated_at
  BEFORE UPDATE ON whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_accounts_updated_at
  BEFORE UPDATE ON payment_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- Super Admin (authenticated users with SUPER_ADMIN role) get full access.
-- Service role key bypasses RLS entirely (used by backend).
-- No direct frontend access to these tables in MVP.
-- ============================================================

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'role' = 'service_role'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'OPERATOR')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pharmacies: Admin full access
CREATE POLICY "Admin full access to pharmacies"
  ON pharmacies FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clinics: Admin full access
CREATE POLICY "Admin full access to clinics"
  ON clinics FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- WhatsApp Accounts: Admin full access
CREATE POLICY "Admin full access to whatsapp_accounts"
  ON whatsapp_accounts FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Payment Accounts: Admin full access
CREATE POLICY "Admin full access to payment_accounts"
  ON payment_accounts FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Orders: Admin full access
CREATE POLICY "Admin full access to orders"
  ON orders FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Order Attachments: Admin full access
CREATE POLICY "Admin full access to order_attachments"
  ON order_attachments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Order Timeline: Admin full access
CREATE POLICY "Admin full access to order_timeline"
  ON order_timeline FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Payments: Admin full access
CREATE POLICY "Admin full access to payments"
  ON payments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Audit Logs: Admin read only (no delete/update)
CREATE POLICY "Admin read access to audit_logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin insert access to audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ============================================================
-- PUBLIC ACCESS FOR PAYMENT PAGE
-- Orders: Allow public read of specific fields by order_number
-- This is handled via the backend API, not direct Supabase access.
-- The backend uses the service role key which bypasses RLS.
-- ============================================================

-- ============================================================
-- STORAGE BUCKET FOR WHATSAPP SESSIONS AND ORDER ATTACHMENTS
-- ============================================================

-- These are created via Supabase dashboard or API:
-- Bucket: whatsapp-sessions (private)
-- Bucket: order-attachments (private)

-- ============================================================
-- DONE
-- ============================================================
