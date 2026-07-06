CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  telegram_id BIGINT NOT NULL UNIQUE,

  username TEXT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,

  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,

  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL UNIQUE,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pix_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id)
    ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES banks(id)
    ON DELETE RESTRICT,

  pix TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_pix_key UNIQUE (pix),
  CONSTRAINT unique_user_bank_pix UNIQUE (user_id, bank_id, pix)
);

CREATE TABLE IF NOT EXISTS agenda_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  created_by_user_id UUID NOT NULL REFERENCES users(id)
    ON DELETE CASCADE,

  chat_id BIGINT NOT NULL,
  message_thread_id BIGINT,
  topic_id BIGINT,

  due_date DATE NOT NULL,
  title TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  description TEXT NOT NULL,

  pix_key_id UUID REFERENCES pix_keys(id)
    ON DELETE SET NULL,

  pix TEXT NOT NULL,
  bank TEXT NOT NULL,

  is_fully_paid BOOLEAN NOT NULL DEFAULT FALSE,
  fully_paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_payment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agenda_payment_id UUID NOT NULL REFERENCES agenda_payments(id)
    ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id)
    ON DELETE CASCADE,

  is_responsible BOOLEAN NOT NULL DEFAULT TRUE,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,

  amount_share NUMERIC(12, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_payment_user UNIQUE (agenda_payment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id
  ON users(telegram_id);

CREATE INDEX IF NOT EXISTS idx_banks_active_sort
  ON banks(is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_pix_keys_user_id
  ON pix_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_pix_keys_bank_id
  ON pix_keys(bank_id);

CREATE INDEX IF NOT EXISTS idx_pix_keys_user_bank
  ON pix_keys(user_id, bank_id);

CREATE INDEX IF NOT EXISTS idx_agenda_payments_created_by
  ON agenda_payments(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_agenda_payments_fully_paid
  ON agenda_payments(is_fully_paid);

CREATE INDEX IF NOT EXISTS idx_agenda_payments_due_date
  ON agenda_payments(due_date);

CREATE INDEX IF NOT EXISTS idx_agenda_members_payment
  ON agenda_payment_members(agenda_payment_id);

CREATE INDEX IF NOT EXISTS idx_agenda_members_user
  ON agenda_payment_members(user_id);

CREATE INDEX IF NOT EXISTS idx_agenda_members_user_paid
  ON agenda_payment_members(user_id, is_paid);

INSERT INTO banks (name, sort_order)
VALUES
  ('Bradesco', 10),
  ('Itau', 20),
  ('Santander', 30),
  ('Caixa', 40),
  ('Nubank', 50),
  ('Inter', 60),
  ('Banco do Brasil', 70),
  ('Next', 80),
  ('C6 Bank', 90),
  ('Picpay', 100),
  ('Neon', 110),
  ('Mercado Pago', 120),
  ('Pagseguro', 130),
  ('Banco Pan', 140)
ON CONFLICT (name)
DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
