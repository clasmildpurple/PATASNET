import fs from 'fs';
import path from 'path';

export interface ServerSheetsConfig {
  webAppUrl: string;
  driveFolderName: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
  lastSyncedAt?: string;
}

export interface GoogleSheetsDatabase {
  sheets: {
    Pelanggan: Array<any[]>;
    Pembayaran: Array<any[]>;
    Tiket: Array<any[]>;
    Pengaturan: Array<any[]>;
  };
  headers: {
    Pelanggan: string[];
    Pembayaran: string[];
    Tiket: string[];
    Pengaturan: string[];
  };
  lastSyncedAt: string;
  totalRecords: number;
}

const SHEETS_CONFIG_PATH = path.resolve(process.cwd(), 'data/sheets_config.json');
const SHEETS_DB_PATH = path.resolve(process.cwd(), 'data/google_sheets_database.json');

export const DEFAULT_SHEET_HEADERS = {
  Pelanggan: [
    'Timestamp',
    'ID Pelanggan',
    'Nama Lengkap',
    'Email',
    'Nomor WhatsApp',
    'Alamat Lengkap',
    'Koordinat GPS',
    'Paket WiFi',
    'Status',
    'URL Foto KTP Drive',
  ],
  Pembayaran: [
    'Timestamp',
    'ID Pembayaran',
    'ID Pelanggan',
    'Nama Pelanggan',
    'Nominal (Rp)',
    'Periode Tagihan',
    'Metode',
    'Status',
    'URL Bukti Bayar Drive',
  ],
  Tiket: [
    'Timestamp',
    'ID Tiket',
    'ID Pelanggan',
    'Nama',
    'Nomor WA',
    'Pesan Masalah',
    'Status',
  ],
  Pengaturan: ['Key', 'Value', 'UpdatedAt'],
};

export function loadSheetsConfig(): ServerSheetsConfig {
  try {
    if (fs.existsSync(SHEETS_CONFIG_PATH)) {
      const raw = fs.readFileSync(SHEETS_CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading sheets config:', e);
  }
  return {
    webAppUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    driveFolderName: 'PatasNet_Drive',
    autoSync: true,
    syncIntervalSeconds: 4,
  };
}

export function saveSheetsConfig(config: Partial<ServerSheetsConfig>): ServerSheetsConfig {
  const current = loadSheetsConfig();
  const updated: ServerSheetsConfig = {
    ...current,
    ...config,
    webAppUrl: (config.webAppUrl !== undefined ? config.webAppUrl : current.webAppUrl).trim(),
  };

  try {
    const dir = path.dirname(SHEETS_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SHEETS_CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving sheets config:', e);
  }

  return updated;
}

// ---------------- LIVE GOOGLE SHEETS SPREADSHEET DATABASE ----------------

export function getGoogleSheetsDatabase(): GoogleSheetsDatabase {
  try {
    if (fs.existsSync(SHEETS_DB_PATH)) {
      const raw = fs.readFileSync(SHEETS_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.sheets) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading google_sheets_database.json:', err);
  }

  // Initialize with seed data if not existing
  const initialDb: GoogleSheetsDatabase = {
    sheets: {
      Pelanggan: [
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TR-1001',
          'Budi Santoso',
          'budi@gmail.com',
          '081234567890',
          'Jl. Melawai Raya No. 45, Kebayoran Baru, Jakarta Selatan',
          '-6.2443, 106.8005',
          'home-20m',
          'active',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TR-1002',
          'Dewi Lestari',
          'dewi@gmail.com',
          '081298765432',
          'Jl. Cipete Raya No. 12, Cilandak, Jakarta Selatan',
          '-6.2781, 106.8052',
          'home-30m',
          'active',
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TR-1003',
          'Andi Pratama',
          'andi@gmail.com',
          '081311223344',
          'Jl. Pondok Cina No. 8, Beji, Depok',
          '-6.3686, 106.8322',
          'home-10m',
          'pending',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        ],
      ],
      Pembayaran: [
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'PAY-7001',
          'TR-1001',
          'Budi Santoso',
          170000,
          'Juli 2026',
          'Transfer Bank BCA',
          'paid',
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'PAY-7002',
          'TR-1002',
          'Dewi Lestari',
          225000,
          'Juli 2026',
          'QRIS Semua Pembayaran',
          'paid',
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'PAY-7003',
          'TR-1003',
          'Andi Pratama',
          120000,
          'Bulan Pertama',
          'Transfer Bank Mandiri',
          'pending_verification',
          'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
        ],
      ],
      Tiket: [
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TKT-901',
          'TR-1001',
          'Budi Santoso',
          '081234567890',
          'Lampu indikator LOS merah berkedip setelah hujan deras',
          'resolved',
        ],
        [
          new Date().toISOString().replace('T', ' ').substring(0, 19),
          'TKT-902',
          'TR-1003',
          'Andi Pratama',
          '081311223344',
          'Permintaan penyesuaian jadwal survei teknisi ke rumah',
          'in_progress',
        ],
      ],
      Pengaturan: [
        ['name', 'PATAS NET', new Date().toISOString()],
        ['logoText', 'PATAS NET', new Date().toISOString()],
        ['logoUrl', '', new Date().toISOString()],
        ['tagline', 'Internet Cepat Harga Merakyat', new Date().toISOString()],
        ['coverageText', '5 Kota/Kabupaten, 13 Kecamatan, 40 Kelurahan', new Date().toISOString()],
        ['legalName', 'PT. AMANUSA TELEMEDIA', new Date().toISOString()],
        ['whatsappNumber', '0812-3456-7890', new Date().toISOString()],
        ['phoneNumber', '+62 899-3299-977', new Date().toISOString()],
        ['themeColor', '#2563eb', new Date().toISOString()],
        ['address', 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110', new Date().toISOString()],
        ['qrisUrl', '', new Date().toISOString()],
      ],
    },
    headers: DEFAULT_SHEET_HEADERS,
    lastSyncedAt: new Date().toISOString(),
    totalRecords: 17,
  };

  saveGoogleSheetsDatabase(initialDb);
  return initialDb;
}

export function saveGoogleSheetsDatabase(db: GoogleSheetsDatabase): void {
  try {
    const dir = path.dirname(SHEETS_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db.lastSyncedAt = new Date().toISOString();
    db.totalRecords =
      (db.sheets.Pelanggan?.length || 0) +
      (db.sheets.Pembayaran?.length || 0) +
      (db.sheets.Tiket?.length || 0) +
      (db.sheets.Pengaturan?.length || 0);
    fs.writeFileSync(SHEETS_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing google_sheets_database.json:', err);
  }
}

// Internal record updater: appends/updates into spreadsheet database
export function recordToInternalSheetsDatabase(action: string, payload: any): void {
  const db = getGoogleSheetsDatabase();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (action === 'subscribe') {
    const custId = payload.id || `TR-${Math.floor(1000 + Math.random() * 9000)}`;
    const coordStr = Array.isArray(payload.coordinates)
      ? payload.coordinates.join(', ')
      : payload.coordinates || '-6.2088, 106.8456';
    // Preserve original uploaded image URL / base64 without replacing with non-existent Google Drive link
    const ktpDriveUrl = payload.ktpImageBase64 || '';

    // Check if customer already exists in sheet
    let custRowIdx = -1;
    for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
      if (String(db.sheets.Pelanggan[i][1]) === String(custId)) {
        custRowIdx = i;
        break;
      }
    }

    const row = [
      nowStr,
      custId,
      payload.name || 'Pelanggan Baru',
      payload.email || '',
      payload.phone || '',
      payload.address || '',
      coordStr,
      payload.packageId || 'home-20m',
      payload.status || 'pending',
      ktpDriveUrl,
    ];

    if (custRowIdx >= 0) {
      db.sheets.Pelanggan[custRowIdx] = row;
    } else {
      db.sheets.Pelanggan.unshift(row);
    }

    // Also record initial billing in Pembayaran sheet
    const payId = `PAY-${Math.floor(7000 + Math.random() * 9000)}`;
    const payRow = [
      nowStr,
      payId,
      custId,
      payload.name || 'Pelanggan Baru',
      payload.amount || 170000,
      'Bulan Pertama',
      'QRIS / Transfer',
      'unpaid',
      '',
    ];
    db.sheets.Pembayaran.unshift(payRow);
    saveGoogleSheetsDatabase(db);
  } else if (action === 'submit_payment_proof') {
    const payId = payload.paymentId;
    // Preserve real proof image URL
    const proofUrl = payload.proofBase64 || '';

    let updated = false;
    for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
      if (String(db.sheets.Pembayaran[i][1]) === String(payId)) {
        db.sheets.Pembayaran[i][6] = payload.method || db.sheets.Pembayaran[i][6] || 'Transfer Bank';
        db.sheets.Pembayaran[i][7] = 'pending_verification';
        if (proofUrl) db.sheets.Pembayaran[i][8] = proofUrl;
        updated = true;
        break;
      }
    }

    if (!updated) {
      db.sheets.Pembayaran.unshift([
        nowStr,
        payId,
        payload.userId || '',
        payload.userName || '',
        payload.amount || 170000,
        payload.billingPeriod || 'Berjalan',
        payload.method || 'Transfer Bank',
        'pending_verification',
        proofUrl,
      ]);
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'approve_payment') {
    for (let i = 0; i < db.sheets.Pembayaran.length; i++) {
      if (String(db.sheets.Pembayaran[i][1]) === String(payload.paymentId)) {
        db.sheets.Pembayaran[i][7] = 'paid';
        if (payload.method) db.sheets.Pembayaran[i][6] = payload.method;
        break;
      }
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'update_status') {
    for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
      if (String(db.sheets.Pelanggan[i][1]) === String(payload.id)) {
        db.sheets.Pelanggan[i][8] = payload.status;
        break;
      }
    }
    saveGoogleSheetsDatabase(db);
  } else if (action === 'update_settings' || action === 'update_logo' || action === 'update_qris') {
    const keys = [
      'name',
      'logoText',
      'logoUrl',
      'address',
      'themeColor',
      'tagline',
      'coverageText',
      'legalName',
      'whatsappNumber',
      'phoneNumber',
      'email',
      'qrisUrl',
      'qrisMerchantName',
      'qrisNmid',
      'qrisAutoVerify',
      'qrisInstructions',
    ];
    keys.forEach((key) => {
      if (payload[key] !== undefined && payload[key] !== null) {
        let found = false;
        for (let i = 0; i < db.sheets.Pengaturan.length; i++) {
          if (String(db.sheets.Pengaturan[i][0]) === key) {
            db.sheets.Pengaturan[i][1] = String(payload[key]);
            db.sheets.Pengaturan[i][2] = nowStr;
            found = true;
            break;
          }
        }
        if (!found) {
          db.sheets.Pengaturan.push([key, String(payload[key]), nowStr]);
        }
      }
    });
    saveGoogleSheetsDatabase(db);
  } else if (action === 'sync_all') {
    if (Array.isArray(payload.customers)) {
      payload.customers.forEach((c: any) => {
        let exists = false;
        for (let i = 0; i < db.sheets.Pelanggan.length; i++) {
          if (String(db.sheets.Pelanggan[i][1]) === String(c.id)) {
            exists = true;
            break;
          }
        }
        if (!exists) {
          db.sheets.Pelanggan.push([
            c.createdAt || nowStr,
            c.id,
            c.name,
            c.email,
            c.phone,
            c.address,
            Array.isArray(c.coordinates) ? c.coordinates.join(', ') : c.coordinates || '',
            c.packageId,
            c.status || 'active',
            c.ktpImageUrl || '',
          ]);
        }
      });
    }
    saveGoogleSheetsDatabase(db);
  }
}

// Two-way synchronization: writes to internal Google Sheets DB and forwards to external Google Apps Script Web App
export async function syncSheetsWebhook(action: string, payload: any): Promise<any> {
  // 1. Always record into the internal Google Sheets database immediately
  try {
    recordToInternalSheetsDatabase(action, payload);
  } catch (err) {
    console.error('Error recording to internal Google Sheets DB:', err);
  }

  // 2. If external Web App URL is configured, also post to Google Apps Script / Drive
  const cfg = loadSheetsConfig();
  if (!cfg.webAppUrl) {
    return {
      status: 'success',
      message: 'Data tersimpan di Google Sheets Database Server!',
      internal: true,
    };
  }

  try {
    const response = await fetch(cfg.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    });
    if (response.ok) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { status: 'success', raw: text };
      }
    }
  } catch (err: any) {
    console.warn(`[Google Sheets & Drive Webhook Sync (${action}) Error]:`, err.message || err);
  }

  return {
    status: 'success',
    message: 'Data tersimpan di Google Sheets Database!',
    internal: true,
  };
}

export async function fetchFromGoogleSheetsServer(): Promise<any> {
  const cfg = loadSheetsConfig();
  if (cfg.webAppUrl) {
    try {
      const response = await fetch(cfg.webAppUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow',
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'success') {
          return data;
        }
      }
    } catch (err: any) {
      console.warn('[Google Sheets External Fetch Warning]:', err.message || err);
    }
  }

  // Return live internal Google Sheets database format
  const db = getGoogleSheetsDatabase();
  const customers = db.sheets.Pelanggan.map((row) => ({
    id: row[1],
    name: row[2],
    email: row[3],
    phone: row[4],
    address: row[5],
    coordinates: typeof row[6] === 'string' && row[6].includes(',')
      ? row[6].split(',').map((n: string) => parseFloat(n.trim()))
      : [-6.2088, 106.8456],
    packageId: row[7],
    status: row[8],
    ktpImageUrl: row[9],
    payments: db.sheets.Pembayaran
      .filter((p) => String(p[2]) === String(row[1]))
      .map((p) => ({
        id: p[1],
        date: String(p[0]).substring(0, 10),
        amount: Number(p[4]) || 170000,
        billingPeriod: p[5],
        method: p[6],
        status: p[7],
        proofOfPaymentUrl: p[8],
      })),
  }));

  const tickets = db.sheets.Tiket.map((row) => ({
    id: row[1],
    customerId: row[2],
    customerName: row[3],
    customerPhone: row[4],
    subject: row[5],
    status: row[6],
    createdAt: row[0],
  }));

  let diskCompanySettings: any = {};
  try {
    const csPath = path.resolve(process.cwd(), 'data/company_settings.json');
    if (fs.existsSync(csPath)) {
      diskCompanySettings = JSON.parse(fs.readFileSync(csPath, 'utf-8'));
    }
  } catch {}

  const settingsObj: Record<string, any> = { ...diskCompanySettings };
  db.sheets.Pengaturan.forEach((row) => {
    if (row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== '') {
      settingsObj[row[0]] = row[1];
    }
  });

  return {
    status: 'success',
    source: cfg.webAppUrl ? 'external_google_sheets' : 'internal_google_sheets',
    customers,
    tickets,
    settings: settingsObj,
    sheets: db.sheets,
    headers: db.headers,
  };
}
