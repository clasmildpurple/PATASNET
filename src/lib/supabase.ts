import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface SupabaseConfig {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
  dbHost?: string;
  dbPassword?: string;
  dbUser?: string;
  dbPort?: number;
  dbName?: string;
}

const CONFIG_PATH = path.join(process.cwd(), 'supabase_config.json');

export function loadSupabaseConfig(): SupabaseConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      return {
        projectUrl: parsed.projectUrl || process.env.SUPABASE_URL || '',
        anonKey: parsed.anonKey || process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: parsed.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        dbHost: parsed.dbHost || process.env.SUPABASE_DB_HOST || '',
        dbPassword: parsed.dbPassword || process.env.SUPABASE_DB_PASSWORD || '',
        dbUser: parsed.dbUser || process.env.SUPABASE_DB_USER || 'postgres',
        dbPort: parsed.dbPort ? Number(parsed.dbPort) : (process.env.SUPABASE_DB_PORT ? Number(process.env.SUPABASE_DB_PORT) : 5432),
        dbName: parsed.dbName || process.env.SUPABASE_DB_NAME || 'postgres',
      };
    }
  } catch (err) {
    console.error('Error loading supabase_config.json:', err);
  }

  return {
    projectUrl: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    dbHost: process.env.SUPABASE_DB_HOST || '',
    dbPassword: process.env.SUPABASE_DB_PASSWORD || '',
    dbUser: process.env.SUPABASE_DB_USER || 'postgres',
    dbPort: process.env.SUPABASE_DB_PORT ? Number(process.env.SUPABASE_DB_PORT) : 5432,
    dbName: process.env.SUPABASE_DB_NAME || 'postgres',
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving supabase_config.json:', err);
    return false;
  }
}

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const cfg = config || loadSupabaseConfig();
  const url = cfg.projectUrl;
  const key = cfg.serviceRoleKey || cfg.anonKey;

  if (!url || !key) return null;

  try {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

/**
 * Pushes a new customer registration and their initial billing record
 * directly into the configured Supabase project.
 */
export async function pushCustomerToSupabase(customer: {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  coordinates: [number, number];
  packageId: string;
  status: string;
  ktpImageUrl?: string;
  passwordHash?: string;
  createdAt: string;
  initialPayment?: {
    id: string;
    date: string;
    amount: number;
    status: string;
    billingPeriod: string;
    method?: string;
  };
}) {
  const client = getSupabaseClient();
  if (!client) {
    console.log('[Supabase Auto-Sync] Supabase client belum dikonfigurasi (URL/Key kosong). Data tersimpan di database lokal PostgreSQL.');
    return { success: false, reason: 'unconfigured' };
  }

  try {
    // 1. Insert/Upsert customer record
    const { error: custError } = await client.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      email: customer.email.toLowerCase(),
      phone: customer.phone,
      address: customer.address,
      latitude: customer.coordinates[0],
      longitude: customer.coordinates[1],
      package_id: customer.packageId,
      status: customer.status,
      ktp_image_url: customer.ktpImageUrl || null,
      password_hash: customer.passwordHash || null,
      created_at: customer.createdAt,
    });

    if (custError) {
      console.error('[Supabase Auto-Sync] Gagal menyimpan customer ke Supabase:', custError.message);
      return { success: false, error: custError.message };
    }

    // 1b. Also upsert into users table for Auth/Account tracking
    try {
      await client.from('users').upsert({
        uid: customer.id,
        email: customer.email.toLowerCase(),
        name: customer.name,
        role: 'customer',
      }, { onConflict: 'uid' });
    } catch (uErr) {
      console.warn('[Supabase Auto-Sync] Non-fatal users table sync:', uErr);
    }

    // 2. Insert initial payment record if present
    if (customer.initialPayment) {
      const { error: payError } = await client.from('payments').upsert({
        id: customer.initialPayment.id,
        customer_id: customer.id,
        date: customer.initialPayment.date,
        amount: customer.initialPayment.amount,
        status: customer.initialPayment.status,
        billing_period: customer.initialPayment.billingPeriod,
        method: customer.initialPayment.method || null,
      });

      if (payError) {
        console.error('[Supabase Auto-Sync] Gagal menyimpan payment ke Supabase:', payError.message);
      }
    }

    console.log(`[Supabase Auto-Sync] SUCCESS: Pelanggan ${customer.id} (${customer.name}) dan tagihannya berhasil masuk ke Supabase!`);
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Auto-Sync] Exception saat mengirim ke Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Updates payment status and proof in Supabase in real-time
 */
export async function pushPaymentUpdateToSupabase(payment: {
  id: string;
  customerId: string;
  status: string;
  method?: string;
  proofOfPaymentUrl?: string;
  transactionId?: string;
  date?: string;
}) {
  const client = getSupabaseClient();
  if (!client) return { success: false, reason: 'unconfigured' };

  try {
    const updatePayload: any = {
      status: payment.status,
    };
    if (payment.method !== undefined) updatePayload.method = payment.method;
    if (payment.proofOfPaymentUrl !== undefined) updatePayload.proof_of_payment_url = payment.proofOfPaymentUrl;
    if (payment.transactionId !== undefined) updatePayload.transaction_id = payment.transactionId;
    if (payment.date !== undefined) updatePayload.date = payment.date;

    const { error } = await client.from('payments').update(updatePayload).eq('id', payment.id);
    if (error) {
      console.error('[Supabase Auto-Sync] Gagal update payment di Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Auto-Sync] Exception update payment di Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Updates customer status in Supabase in real-time
 */
export async function pushCustomerStatusToSupabase(customerId: string, status: string) {
  const client = getSupabaseClient();
  if (!client) return { success: false, reason: 'unconfigured' };

  try {
    const { error } = await client.from('customers').update({ status }).eq('id', customerId);
    if (error) {
      console.error('[Supabase Auto-Sync] Gagal update status customer di Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Auto-Sync] Exception update customer status di Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Pushes new support ticket to Supabase in real-time
 */
export async function pushTicketToSupabase(ticket: {
  id: string;
  userId?: string;
  userName: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  status: string;
}) {
  const client = getSupabaseClient();
  if (!client) return { success: false, reason: 'unconfigured' };

  try {
    const { error } = await client.from('support_tickets').upsert({
      id: ticket.id,
      customer_id: ticket.userId || null,
      user_name: ticket.userName,
      email: ticket.email,
      phone: ticket.phone,
      message: ticket.message,
      date: ticket.date,
      status: ticket.status,
    });
    if (error) {
      console.error('[Supabase Auto-Sync] Gagal simpan tiket ke Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Auto-Sync] Exception push ticket ke Supabase:', err);
    return { success: false, error: err.message };
  }
}

export const SUPABASE_SQL_SCHEMA = `-- Skrip SQL Skema untuk Supabase SQL Editor
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda: https://supabase.com/dashboard/project/_/sql

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION DEFAULT -6.2088,
  longitude DOUBLE PRECISION DEFAULT 106.8456,
  package_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  ktp_image_url TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL
);

-- 3. Tabel Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'unpaid' NOT NULL,
  proof_of_payment_url TEXT,
  billing_period TEXT NOT NULL,
  method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  user_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Wifi Packages
CREATE TABLE IF NOT EXISTS public.wifi_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  speed TEXT NOT NULL,
  price INTEGER NOT NULL,
  features TEXT NOT NULL,
  type TEXT NOT NULL,
  popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel Coverage Areas
CREATE TABLE IF NOT EXISTS public.coverage_areas (
  id SERIAL PRIMARY KEY,
  city_name TEXT NOT NULL UNIQUE,
  region_type TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabel Company Settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  logo_text TEXT NOT NULL,
  theme_color TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  promos TEXT DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS) atau matikan sementara untuk akses API mudah
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wifi_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Penuh untuk Anon/Authenticated (Public read & write untuk aplikasi ISP)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Customers') THEN
    CREATE POLICY "Public Access Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Payments') THEN
    CREATE POLICY "Public Access Payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Tickets') THEN
    CREATE POLICY "Public Access Tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Packages') THEN
    CREATE POLICY "Public Access Packages" ON public.wifi_packages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Coverage') THEN
    CREATE POLICY "Public Access Coverage" ON public.coverage_areas FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Settings') THEN
    CREATE POLICY "Public Access Settings" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;
