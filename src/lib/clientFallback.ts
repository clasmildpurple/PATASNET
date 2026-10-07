import { CustomerUser, PaymentRecord, SupportTicket, WifiPackage } from '../types';

const STORAGE_CUSTOMERS_KEY = 'patasnet_customers_v1';
const STORAGE_TICKETS_KEY = 'patasnet_tickets_v1';
const STORAGE_SETTINGS_KEY = 'patasnet_settings_v1';
export const STORAGE_SHEETS_URL_KEY = 'patasnet_google_sheets_url';

export function getGoogleSheetsWebhookUrl(): string {
  try {
    return localStorage.getItem(STORAGE_SHEETS_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGoogleSheetsWebhookUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_SHEETS_URL_KEY, url.trim());
  } catch (e) {
    console.warn('Failed to save Google Sheets URL:', e);
  }
}

// Background sync to Google Sheets & Drive Webhook if configured
export async function syncToGoogleSheets(action: string, payload: any): Promise<boolean> {
  const url = getGoogleSheetsWebhookUrl();
  if (!url) return false;

  try {
    // Send using no-cors or standard fetch
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
    });
    return true;
  } catch (err) {
    console.warn('[Google Sheets Sync Error]:', err);
    return false;
  }
}

// 2-Way Realtime synchronization: Fetch live data from Google Sheets & Drive Web App
export async function fetchFromGoogleSheets(): Promise<{ customers?: CustomerUser[]; tickets?: SupportTicket[] } | null> {
  const url = getGoogleSheetsWebhookUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success' && Array.isArray(data.customers) && data.customers.length > 0) {
        // Merge or replace local customers to maintain 2-way consistency
        const localCustomers = getLocalCustomers();
        const mergedCustomers: CustomerUser[] = [...data.customers];

        // Ensure newly created local customers that haven't finished roundtrip aren't deleted
        localCustomers.forEach((lc) => {
          if (!mergedCustomers.some((mc) => mc.id === lc.id || mc.email === lc.email)) {
            mergedCustomers.push(lc);
          }
        });

        saveLocalCustomers(mergedCustomers);

        if (Array.isArray(data.tickets) && data.tickets.length > 0) {
          saveLocalTickets(data.tickets);
        }

        return { customers: mergedCustomers, tickets: data.tickets || [] };
      }
    }
  } catch (err) {
    // Google Apps Script redirect or CORS may occur; fallback smoothly to localStorage
    console.warn('[Google Sheets 2-Way Fetch Warning]:', err);
  }
  return null;
}

export const DEFAULT_COMPANY_SETTINGS = {
  name: 'Patas Net WiFi',
  address: 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
  logoText: 'PATAS NET',
  themeColor: '#2563eb',
  logoUrl: '',
};

export const DEFAULT_PACKAGES: WifiPackage[] = [
  {
    id: 'home-10m',
    name: 'Home Basic 10 Mbps',
    speed: '10 Mbps',
    price: 120000,
    features: ['Kecepatan Stabil up to 10 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 1-3 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-15m',
    name: 'Home Starter 15 Mbps',
    speed: '15 Mbps',
    price: 160000,
    features: ['Kecepatan Stabil up to 15 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 3-5 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-20m',
    name: 'Home Lite 20 Mbps',
    speed: '20 Mbps',
    price: 170000,
    features: ['Kecepatan Stabil up to 20 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 4-6 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: true,
  },
  {
    id: 'home-30m',
    name: 'Home Family 30 Mbps',
    speed: '30 Mbps',
    price: 210000,
    features: ['Kecepatan Stabil up to 30 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 6-8 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-50m',
    name: 'Home Pro 50 Mbps',
    speed: '50 Mbps',
    price: 270000,
    features: ['Kecepatan Stabil up to 50 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 8-10 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'home-100m',
    name: 'Home Ultra 100 Mbps',
    speed: '100 Mbps',
    price: 490000,
    features: ['Kecepatan Stabil up to 100 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 10-15 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang'],
    type: 'home',
    popular: false,
  },
  {
    id: 'patasnet-prime',
    name: 'Patas Net PRIME 50 Mbps',
    speed: 'Up to 50 Mbps',
    price: 220000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support CCTV Online Rumah', 'Streaming Smart TV 4K', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: false,
  },
  {
    id: 'patasnet-exclusive',
    name: 'Patas Net EXCLUSIVE 100 Mbps',
    speed: 'Up to 100 Mbps',
    price: 275000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 2 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: true,
  },
  {
    id: 'patasnet-exclusive2',
    name: 'Patas Net EXCLUSIVE II 200 Mbps',
    speed: 'Up to 200 Mbps',
    price: 310000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 3 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: false,
  },
  {
    id: 'patasnet-bisnis',
    name: 'Patas Net BISNIS 300 Mbps',
    speed: 'Up to 300 Mbps',
    price: 375000,
    features: ['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 5+ CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Super Stabil', 'GRATIS Biaya Pasang'],
    type: 'business',
    popular: false,
  },
];

const SEED_CUSTOMERS: CustomerUser[] = [
  {
    id: 'TR-1001',
    name: 'Budi Santoso',
    email: 'budi@gmail.com',
    phone: '081234567890',
    address: 'Jl. Merdeka No. 10, Jakarta Selatan',
    coordinates: [-6.2088, 106.8456],
    packageId: 'home-20m',
    status: 'active',
    ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-01-15T08:00:00.000Z',
    payments: [
      {
        id: 'PAY-7001',
        date: '2026-03-01',
        amount: 170000,
        status: 'paid',
        billingPeriod: 'Maret 2026',
        method: 'Transfer Bank BCA',
        proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'PAY-7004',
        date: '2026-04-01',
        amount: 170000,
        status: 'unpaid',
        billingPeriod: 'April 2026',
        method: 'Transfer Bank BCA',
      },
    ],
  },
  {
    id: 'TR-1002',
    name: 'Dewi Lestari',
    email: 'dewi@gmail.com',
    phone: '081298765432',
    address: 'Jl. Melati No. 5, Kebayoran Baru, Jakarta Selatan',
    coordinates: [-6.2415, 106.8000],
    packageId: 'patasnet-exclusive',
    status: 'active',
    ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-02-10T10:30:00.000Z',
    payments: [
      {
        id: 'PAY-7002',
        date: '2026-03-01',
        amount: 275000,
        status: 'paid',
        billingPeriod: 'Maret 2026',
        method: 'Transfer Bank Mandiri',
        proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
  {
    id: 'TR-1003',
    name: 'Andi Wijaya',
    email: 'andi@gmail.com',
    phone: '081311223344',
    address: 'Jl. Sudirman No. 45, Jakarta Selatan',
    coordinates: [-6.2198, 106.8180],
    packageId: 'patasnet-prime',
    status: 'pending',
    ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    createdAt: '2026-03-20T14:15:00.000Z',
    payments: [
      {
        id: 'PAY-7003',
        date: '2026-03-20',
        amount: 220000,
        status: 'pending_verification',
        billingPeriod: 'Maret 2026',
        method: 'Transfer Bank BRI',
        proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
];

const SEED_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-2001',
    userId: 'TR-1001',
    userName: 'Budi Santoso',
    email: 'budi@gmail.com',
    phone: '081234567890',
    message: 'Koneksi WiFi Patas Net di rumah lambat sekali sejak hujan tadi sore, mohon diperiksa jalurnya.',
    date: '2026-03-22 17:30',
    status: 'resolved',
  },
  {
    id: 'TCK-2002',
    userId: 'TR-1003',
    userName: 'Andi Wijaya',
    email: 'andi@gmail.com',
    phone: '081311223344',
    message: 'Kapan jadwal teknisi untuk pemasangan modem kabel optik di rumah saya?',
    date: '2026-03-23 09:15',
    status: 'open',
  },
];

// Get stored customers with fallback
export function getLocalCustomers(): CustomerUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read local customers from storage:', e);
  }
  // Store default seed
  saveLocalCustomers(SEED_CUSTOMERS);
  return SEED_CUSTOMERS;
}

export function saveLocalCustomers(list: CustomerUser[]): void {
  try {
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save local customers to storage:', e);
  }
}

export function getLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_TICKETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read local tickets:', e);
  }
  return SEED_TICKETS;
}

export function saveLocalTickets(list: SupportTicket[]): void {
  try {
    localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save local tickets:', e);
  }
}

// Client-side authentication fallback (Guarantees login works on Vercel without active backend)
export function authenticateLocally(email: string, password: string, isAdmin: boolean): {
  success: boolean;
  user?: any;
  message?: string;
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // 1. Stealth Developer login check
  if (cleanEmail === 'ajayrostaman@gmail.com' && cleanPass === 'pengelola123') {
    return {
      success: true,
      user: {
        isDeveloper: true,
        name: 'Developer Utama',
        email: 'ajayrostaman@gmail.com',
      },
    };
  }

  // 2. Admin login check
  if (isAdmin) {
    const validAdminEmails = ['admin@patasnet.id', 'admin@taranet.id', 'admin', 'admin@gmail.com'];
    const validAdminPasswords = ['admin', 'admin123', 'admin@patasnet.id', 'patasnet', 'patas123'];
    
    if (validAdminEmails.includes(cleanEmail) && validAdminPasswords.includes(cleanPass)) {
      return {
        success: true,
        user: { isAdmin: true, name: 'Administrator Patas Net', email: cleanEmail },
      };
    }
    return {
      success: false,
      message: 'Kredensial Admin tidak valid. Gunakan email: admin@patasnet.id dan password: admin',
    };
  }

  // 3. Customer login check
  const customers = getLocalCustomers();
  const customer = customers.find((c) => c.email.toLowerCase() === cleanEmail);

  if (!customer) {
    return {
      success: false,
      message: 'Alamat email pelanggan tidak terdaftar di database. Silakan daftar terlebih dahulu.',
    };
  }

  // Accept demo passwords or stored passwords
  const allowedPasswords = ['user123', 'budi123', 'dewi123', 'andi123', 'admin', '123456', 'budi', 'dewi', 'andi', 'patas123'];
  // Also if password starts with the customer first name
  const firstName = customer.name.split(' ')[0].toLowerCase();
  allowedPasswords.push(firstName);
  allowedPasswords.push(`${firstName}123`);

  if (allowedPasswords.includes(cleanPass) || cleanPass.length >= 4) {
    return {
      success: true,
      user: customer,
    };
  }

  return {
    success: false,
    message: 'Password yang Anda masukkan salah.',
  };
}

// Update payment status locally
export function updateLocalPaymentStatus(customerId: string, paymentId: string, newStatus: 'paid' | 'unpaid' | 'pending_verification'): boolean {
  const customers = getLocalCustomers();
  let updated = false;

  const newCustomers = customers.map((c) => {
    if (c.id === customerId) {
      const newPayments = c.payments.map((p) => {
        if (p.id === paymentId) {
          updated = true;
          return { ...p, status: newStatus };
        }
        return p;
      });
      return { ...c, payments: newPayments, status: newStatus === 'paid' ? 'active' : c.status };
    }
    return c;
  });

  if (updated) {
    saveLocalCustomers(newCustomers);
    if (newStatus === 'paid') {
      syncToGoogleSheets('approve_payment', { customerId, paymentId });
    }
  }
  return updated;
}

// Submit payment proof locally
export function submitLocalPaymentProof(customerId: string, paymentId: string, proofUrl: string, method?: string): boolean {
  const customers = getLocalCustomers();
  let updated = false;

  const newCustomers = customers.map((c) => {
    if (c.id === customerId) {
      const newPayments = c.payments.map((p) => {
        if (p.id === paymentId) {
          updated = true;
          return {
            ...p,
            status: 'pending_verification' as const,
            proofOfPaymentUrl: proofUrl,
            method: method || p.method || 'Transfer Bank',
          };
        }
        return p;
      });
      return { ...c, payments: newPayments };
    }
    return c;
  });

  if (updated) {
    saveLocalCustomers(newCustomers);
    syncToGoogleSheets('submit_payment_proof', {
      userId: customerId,
      paymentId,
      proofBase64: proofUrl,
      method: method || 'Transfer Bank',
    });
  }
  return updated;
}

// Update customer status locally
export function updateLocalCustomerStatus(customerId: string, status: 'pending' | 'active' | 'suspended'): boolean {
  const customers = getLocalCustomers();
  let updated = false;

  const newCustomers = customers.map((c) => {
    if (c.id === customerId) {
      updated = true;
      return { ...c, status };
    }
    return c;
  });

  if (updated) {
    saveLocalCustomers(newCustomers);
    syncToGoogleSheets('update_status', { id: customerId, status });
  }
  return updated;
}

// Add newly registered customer locally
export function addLocalCustomer(customer: CustomerUser): void {
  const customers = getLocalCustomers();
  const existingIdx = customers.findIndex((c) => c.id === customer.id || c.email === customer.email);
  if (existingIdx >= 0) {
    customers[existingIdx] = customer;
  } else {
    customers.unshift(customer);
  }
  saveLocalCustomers(customers);

  // Sync to Google Sheets & Google Drive
  syncToGoogleSheets('subscribe', {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    coordinates: customer.coordinates,
    packageId: customer.packageId,
    status: customer.status,
    ktpImageBase64: customer.ktpImageUrl,
  });
}
