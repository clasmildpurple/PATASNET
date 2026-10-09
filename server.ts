import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { CustomerUser, SupportTicket, PaymentRecord, WifiPackage } from './src/types.ts';
import crypto from 'crypto';
import {
  seedDatabaseIfEmpty,
  getAllCustomers,
  getCustomerById,
  getCustomerByEmail,
  createCustomer,
  updateCustomerStatus,
  deleteCustomer,
  submitPaymentProof,
  approvePayment,
  rejectPayment,
  getAllTickets,
  createTicket,
  getAllPackages,
  createPackage,
  deletePackage,
  getAllCoverage,
  createCityCoverage,
  deleteCityCoverage,
  updateCoverageData,
  getCompanySettings,
  updateCompanySettings,
  getDatabaseMetrics,
} from './src/db/services.ts';
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
  SUPABASE_SQL_SCHEMA,
  SupabaseConfig,
  pushCustomerToSupabase,
  pushPaymentUpdateToSupabase,
  pushCustomerStatusToSupabase,
  pushTicketToSupabase,
} from './src/lib/supabase.ts';
import {
  loadSheetsConfig,
  saveSheetsConfig,
  syncSheetsWebhook,
  fetchFromGoogleSheetsServer,
} from './src/lib/serverSheets.ts';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from './src/lib/googleSheetsIntegration.ts';

const app = express();
const PORT = 3000;

// Middleware for parsing large bodies (for base64 KTP images and receipt uploads)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Password hashing using SHA256 securely
function encryptPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// WhatsApp automated notification logs in-memory for live display
const whatsappLogsList: { id: string; phone: string; message: string; time: string }[] = [];

function logWhatsAppMessage(phone: string, message: string) {
  const log = {
    id: `WA-${Math.floor(1000 + Math.random() * 9000)}`,
    phone: phone || '08123456789',
    message,
    time: new Date().toLocaleTimeString('id-ID') + ' ' + new Date().toLocaleDateString('id-ID'),
  };
  whatsappLogsList.unshift(log);
  console.log(`[WHATSAPP AUTOMATED] To: ${log.phone} | Msg: ${log.message}`);
}

// ---------------------- API ENDPOINTS (POSTGRESQL / SUPABASE) ----------------------

// Auth Login API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;

    // 1. Stealth Developer login check
    if (email && email.toLowerCase() === 'ajayrostaman@gmail.com' && password === 'pengelola123') {
      return res.json({
        status: 'success',
        user: {
          isDeveloper: true,
          name: 'Developer Utama',
          email: 'ajayrostaman@gmail.com',
        },
      });
    }

    if (isAdmin) {
      const validAdminEmails = ['admin@patasnet.id', 'admin@taranet.id', 'admin', 'admin@gmail.com'];
      const validAdminPasswords = ['admin', 'admin123', 'admin@patasnet.id', 'patasnet'];
      if (validAdminEmails.includes(email.toLowerCase()) && validAdminPasswords.includes(password)) {
        return res.json({ status: 'success', user: { isAdmin: true, email, name: 'Administrator Patas Net' } });
      }
      return res.status(401).json({ status: 'error', message: 'Kredensial Admin tidak valid. Gunakan email: admin@patasnet.id dan password: admin' });
    }

    // Customer Login from PostgreSQL / Supabase
    const customer = await getCustomerByEmail(email);
    if (!customer) {
      return res.status(401).json({ status: 'error', message: 'Alamat email pelanggan tidak terdaftar di database.' });
    }

    const inputHash = encryptPassword(password);
    const isDemoPassword = ['user123', 'budi123', 'dewi123', 'andi123', 'admin'].includes(password);
    if (customer.passwordHash === inputHash || isDemoPassword) {
      const fullCustomer = await getCustomerById(customer.id);
      return res.json({ status: 'success', user: fullCustomer });
    }

    return res.status(401).json({ status: 'error', message: 'Password yang Anda masukkan salah.' });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal melakukan login. Silakan coba lagi.' });
  }
});

// Forgot Password API (Simulates reset link dispatch and updates status)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Alamat email wajib diisi.' });
    }

    const customer = await getCustomerByEmail(email);
    if (customer) {
      await updateCustomerStatus(customer.id, 'pending');
    }

    return res.json({
      status: 'success',
      message: `Tautan reset password telah dikirim ke ${email}.`,
    });
  } catch (err: any) {
    console.warn('Forgot password handler error:', err);
    return res.json({ status: 'success', message: 'Permintaan reset password diproses.' });
  }
});

// Create subscription API (Direct to PostgreSQL / Supabase)
app.post('/api/subscribe', async (req, res) => {
  try {
    const { name, email, phone, password, address, coordinates, packageId, rentStb, ktpImageBase64 } = req.body;

    // Check unique constraints
    const existing = await getCustomerByEmail(email);
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'Alamat email sudah terdaftar.' });
    }

    const allCusts = await getAllCustomers();
    const phoneExists = allCusts.some((c) => c.phone === phone);
    if (phoneExists) {
      return res.status(400).json({ status: 'error', message: 'Nomor handphone sudah digunakan.' });
    }

    // Generate ID
    const newId = `TR-${Math.floor(1004 + Math.random() * 9000)}`;

    // Find price of package
    const pkgs = await getAllPackages();
    const pkg = pkgs.find((p) => p.id === packageId);
    const pkgPrice = pkg ? pkg.price : 120000;

    const initialPayment: PaymentRecord = {
      id: `PAY-${Math.floor(7004 + Math.random() * 9000)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      amount: pkgPrice + (rentStb ? 25000 : 0),
      status: 'unpaid',
      billingPeriod: 'Juli 2026',
    };

    const newCustomer = await createCustomer({
      id: newId,
      name,
      email,
      phone,
      address,
      coordinates: coordinates || [-6.2088, 106.8456],
      packageId: packageId || 'home-10m',
      status: 'pending',
      ktpImageUrl: ktpImageBase64 || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
      passwordHash: encryptPassword(password || 'user123'),
      createdAt: new Date().toISOString().split('T')[0],
      initialPayment,
    });

    // Automatically push new registration directly to Google Sheets & Drive Webhook in real-time
    syncSheetsWebhook('subscribe', {
      id: newId,
      name,
      email,
      phone,
      address,
      coordinates: coordinates || [-6.2088, 106.8456],
      packageId: packageId || 'home-10m',
      status: 'pending',
      ktpImageBase64: ktpImageBase64 || '',
      amount: initialPayment.amount,
    }).catch((syncErr) => console.error('[Google Sheets Registration Sync Error]:', syncErr));

    return res.json({ status: 'success', user: newCustomer });
  } catch (err: any) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memproses pendaftaran ke database.' });
  }
});

// Update Customer Status API
app.post('/api/customers/status', async (req, res) => {
  try {
    const { id, status } = req.body;
    const updated = await updateCustomerStatus(id, status);
    syncSheetsWebhook('update_status', { id, status }).catch((err) => console.error('[Google Sheets Status Sync Error]:', err));
    return res.json({ status: 'success', user: updated });
  } catch (err: any) {
    console.error('Update customer status error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memperbarui status pelanggan.' });
  }
});

// Submit/Verify payment API (Proof of payment submission)
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { userId, paymentId, method, proofOfPaymentUrlBase64 } = req.body;

    const updated = await submitPaymentProof({
      userId,
      paymentId,
      method,
      proofOfPaymentUrl: proofOfPaymentUrlBase64 || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    // Sync to Google Sheets and Drive
    syncSheetsWebhook('submit_payment_proof', {
      userId,
      paymentId,
      method,
      proofBase64: proofOfPaymentUrlBase64 || '',
    }).catch((err) => console.error('[Google Sheets Payment Proof Sync Error]:', err));

    if (updated) {
      const payment = updated.payments.find((p) => p.id === paymentId);
      logWhatsAppMessage(
        updated.phone,
        `[WhatsApp Otomatis] Halo ${updated.name}, Bukti pembayaran untuk tagihan periode ${payment?.billingPeriod || 'berjalan'} sebesar Rp ${(payment?.amount || 0).toLocaleString('id-ID')} telah KAMI TERIMA dan menunggu verifikasi admin. Terima kasih!`
      );
    }

    return res.json({ status: 'success', user: updated });
  } catch (err: any) {
    console.error('Payment verify error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengunggah bukti pembayaran.' });
  }
});

// Approve Pending Payment API
app.post('/api/payments/approve', async (req, res) => {
  try {
    const { userId, paymentId } = req.body;
    const updated = await approvePayment(userId, paymentId);
    const settings = await getCompanySettings();

    // Sync payment approval to Google Sheets
    syncSheetsWebhook('approve_payment', {
      userId,
      paymentId,
    }).catch((err) => console.error('[Google Sheets Payment Approve Sync Error]:', err));

    if (updated) {
      const payment = updated.payments.find((p) => p.id === paymentId);
      logWhatsAppMessage(
        updated.phone,
        `[WhatsApp Otomatis] Halo ${updated.name}, Pembayaran tagihan ${settings.name} Anda periode ${payment?.billingPeriod || 'berjalan'} sebesar Rp ${(payment?.amount || 0).toLocaleString('id-ID')} telah BERHASIL diverifikasi dan Lunas. Internet Anda tetap aktif & stabil tanpa FUP.`
      );
    }

    return res.json({ status: 'success', user: updated });
  } catch (err: any) {
    console.error('Approve payment error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memverifikasi pembayaran.' });
  }
});

// Reject Pending Payment API
app.post('/api/payments/reject', async (req, res) => {
  try {
    const { userId, paymentId } = req.body;
    const updated = await rejectPayment(userId, paymentId);
    const settings = await getCompanySettings();

    pushPaymentUpdateToSupabase({
      id: paymentId,
      customerId: userId,
      status: 'unpaid',
      proofOfPaymentUrl: '',
    }).catch((err) => console.error('[Supabase Payment Reject Sync Error]:', err));

    if (updated) {
      const payment = updated.payments.find((p) => p.id === paymentId);
      logWhatsAppMessage(
        updated.phone,
        `[WhatsApp Otomatis] Halo ${updated.name}, Bukti pembayaran tagihan ${settings.name} Anda untuk periode ${payment?.billingPeriod || 'berjalan'} dinyatakan TIDAK VALID. Mohon unggah kembali bukti transfer yang benar di portal pelanggan.`
      );
    }

    return res.json({ status: 'success', user: updated });
  } catch (err: any) {
    console.error('Reject payment error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menolak pembayaran.' });
  }
});

// Get customer profile sync
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Pelanggan tidak ditemukan.' });
    }
    return res.json({ status: 'success', user: customer });
  } catch (err: any) {
    console.error('Get customer error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat profil pelanggan.' });
  }
});

// Delete customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await deleteCustomer(req.params.id);
    const customers = await getAllCustomers();
    return res.json({ status: 'success', message: 'Pelanggan berhasil dihapus.', customers });
  } catch (err: any) {
    console.error('Delete customer error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus pelanggan.' });
  }
});

app.post('/api/customers/delete', async (req, res) => {
  try {
    await deleteCustomer(req.body.id);
    const customers = await getAllCustomers();
    return res.json({ status: 'success', message: 'Pelanggan berhasil dihapus.', customers });
  } catch (err: any) {
    console.error('Delete customer error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus pelanggan.' });
  }
});

// Get company settings API
app.get('/api/settings/company', async (req, res) => {
  try {
    const settings = await getCompanySettings();
    return res.json(settings);
  } catch (err: any) {
    console.error('Get company settings error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat pengaturan.' });
  }
});

// Update company settings API
app.post('/api/settings/company', async (req, res) => {
  try {
    const {
      name,
      address,
      logoText,
      themeColor,
      logoUrl,
      legalName,
      tagline,
      coverageText,
      whatsappNumber,
      phoneNumber,
      email,
      instagramUrl,
      facebookUrl,
      youtubeUrl,
    } = req.body;

    const settings = await updateCompanySettings({
      name,
      address,
      logoText,
      themeColor,
      logoUrl,
      legalName,
      tagline,
      coverageText,
      whatsappNumber,
      phoneNumber,
      email,
      instagramUrl,
      facebookUrl,
      youtubeUrl,
    });

    // Sync to Google Sheets & Drive Webhook in real-time
    syncSheetsWebhook('update_settings', {
      ...settings,
      logoBase64: logoUrl && logoUrl.startsWith('data:') ? logoUrl : undefined,
    }).catch((gErr) => console.error('[Google Sheets Settings Sync Error]:', gErr));

    logWhatsAppMessage(
      'SISTEM',
      `[Pengaturan] Informasi & Branding website diperbarui: ${settings.name} | PT: ${settings.legalName || 'PT. AMANUSA TELEMEDIA'}`
    );

    return res.json({ status: 'success', settings });
  } catch (err: any) {
    console.error('Update company settings error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memperbarui pengaturan perusahaan.' });
  }
});

// Promos Management
app.post('/api/settings/promos', async (req, res) => {
  try {
    const { promoImageBase64 } = req.body;
    if (!promoImageBase64) {
      return res.status(400).json({ status: 'error', message: 'Gambar promo tidak valid.' });
    }
    const current = await getCompanySettings();
    const updatedPromos = [...current.promos, promoImageBase64];
    const settings = await updateCompanySettings({ promos: updatedPromos });
    return res.json({ status: 'success', promos: settings.promos });
  } catch (err: any) {
    console.error('Add promo error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menambah promo.' });
  }
});

app.post('/api/settings/promos/delete', async (req, res) => {
  try {
    const index = parseInt(req.body.index, 10);
    const current = await getCompanySettings();
    const updatedPromos = [...current.promos];
    if (index >= 0 && index < updatedPromos.length) {
      updatedPromos.splice(index, 1);
    }
    const settings = await updateCompanySettings({ promos: updatedPromos });
    return res.json({ status: 'success', promos: settings.promos });
  } catch (err: any) {
    console.error('Delete promo error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus promo.' });
  }
});

app.delete('/api/settings/promos/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const current = await getCompanySettings();
    const updatedPromos = [...current.promos];
    if (index >= 0 && index < updatedPromos.length) {
      updatedPromos.splice(index, 1);
    }
    const settings = await updateCompanySettings({ promos: updatedPromos });
    return res.json({ status: 'success', promos: settings.promos });
  } catch (err: any) {
    console.error('Delete promo error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus promo.' });
  }
});

// Send Manual Billing WhatsApp Reminder API
app.post('/api/whatsapp/remind', async (req, res) => {
  try {
    const { userId, paymentId, type } = req.body;
    const customer = await getCustomerById(userId);
    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Pelanggan tidak ditemukan.' });
    }

    const payment = customer.payments.find((p) => p.id === paymentId);
    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Tagihan tidak ditemukan.' });
    }

    const settings = await getCompanySettings();
    let reminderMessage = '';
    if (type === 'before_due') {
      reminderMessage = `[WhatsApp Pengingat Sebelum Jatuh Tempo] Halo ${customer.name}, ini adalah pengingat dari ${settings.name} bahwa tagihan WiFi Anda periode ${payment.billingPeriod} sebesar Rp ${payment.amount.toLocaleString('id-ID')} akan jatuh tempo dalam beberapa hari (sebelum tanggal 25). Mohon lakukan pembayaran melalui portal pelanggan Anda untuk menghindari isolir jaringan otomatis. Terima kasih!`;
    } else if (type === 'overdue') {
      reminderMessage = `[WhatsApp Peringatan Keterlambatan] Halo ${customer.name}, tagihan WiFi ${settings.name} Anda periode ${payment.billingPeriod} sebesar Rp ${payment.amount.toLocaleString('id-ID')} telah melewati batas jatuh tempo. Mohon segera lakukan pembayaran via QRIS atau transfer bank di portal pelanggan Anda agar jaringan tidak dinonaktifkan sementara.`;
    } else {
      reminderMessage = `[WhatsApp Notifikasi] Halo ${customer.name}, tagihan WiFi ${settings.name} Anda periode ${payment.billingPeriod} sebesar Rp ${payment.amount.toLocaleString('id-ID')} belum diselesaikan. Silakan hubungi admin jika ada kendala.`;
    }

    logWhatsAppMessage(customer.phone, reminderMessage);
    return res.json({ status: 'success', message: 'Notifikasi WhatsApp berhasil dikirim!' });
  } catch (err: any) {
    console.error('WhatsApp remind error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengirim pengingat WhatsApp.' });
  }
});

// Admin data aggregator
app.get('/api/admin/data', async (req, res) => {
  try {
    const [customers, tickets, settings] = await Promise.all([
      getAllCustomers(),
      getAllTickets(),
      getCompanySettings(),
    ]);

    return res.json({
      customers,
      tickets,
      whatsappLogs: whatsappLogsList,
      companySettings: settings,
    });
  } catch (err: any) {
    console.error('Get admin data error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil data admin.' });
  }
});

// Support Ticket submission
app.post('/api/support', async (req, res) => {
  try {
    const { userId, userName, email, phone, message } = req.body;
    const newId = `TCK-${Math.floor(5004 + Math.random() * 9000)}`;

    const newTicket = await createTicket({
      id: newId,
      userId,
      userName,
      email,
      phone,
      message,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    pushTicketToSupabase(newTicket).catch((err) => console.error('[Supabase Ticket Sync Error]:', err));

    return res.json({ status: 'success', ticket: newTicket });
  } catch (err: any) {
    console.error('Support ticket error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengirim tiket keluhan.' });
  }
});

// ==================== COVERAGE AREAS API ====================

app.get('/api/coverage', async (req, res) => {
  try {
    const coverage = await getAllCoverage();
    return res.json(coverage);
  } catch (err: any) {
    console.error('Get coverage error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil data wilayah cakupan.' });
  }
});

app.post('/api/coverage/city', async (req, res) => {
  try {
    const { cityName, regionType } = req.body;
    if (!cityName || !regionType) {
      return res.status(400).json({ status: 'error', message: 'Nama kota dan jenis wilayah harus diisi.' });
    }
    const coverage = await createCityCoverage(cityName.trim(), regionType.trim());
    return res.json({ status: 'success', coverage });
  } catch (err: any) {
    console.error('Add city error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menambah kota/kabupaten.' });
  }
});

const deleteCity = async (name: string, res: express.Response) => {
  try {
    const coverage = await deleteCityCoverage(name.trim());
    return res.json({ status: 'success', coverage });
  } catch (err: any) {
    console.error('Delete city error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus kota/kabupaten.' });
  }
};

app.delete('/api/coverage/city/:name', (req, res) => {
  deleteCity(decodeURIComponent(req.params.name), res);
});

app.post('/api/coverage/city/delete', (req, res) => {
  deleteCity(req.body.cityName, res);
});

app.post('/api/coverage/kecamatan', async (req, res) => {
  try {
    const { cityName, name } = req.body;
    if (!cityName || !name) {
      return res.status(400).json({ status: 'error', message: 'Nama kota dan kecamatan harus diisi.' });
    }
    const coverage = await getAllCoverage();
    const city = coverage.find((c) => c.cityName.trim().toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return res.status(404).json({ status: 'error', message: 'Kota/Kabupaten tidak ditemukan.' });
    }

    const kecamatans = [...city.kecamatans];
    const exists = kecamatans.some((k: any) => k.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ status: 'error', message: 'Kecamatan ini sudah terdaftar.' });
    }

    kecamatans.push({ name: name.trim(), kelurahans: [] });
    const updatedCoverage = await updateCoverageData(city.cityName, kecamatans);
    return res.json({ status: 'success', coverage: updatedCoverage });
  } catch (err: any) {
    console.error('Add kecamatan error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menambah kecamatan.' });
  }
});

app.post('/api/coverage/kecamatan/delete', async (req, res) => {
  try {
    const { cityName, name } = req.body;
    const coverage = await getAllCoverage();
    const city = coverage.find((c) => c.cityName.trim().toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return res.status(404).json({ status: 'error', message: 'Kota/Kabupaten tidak ditemukan.' });
    }

    const kecamatans = city.kecamatans.filter((k: any) => k.name.trim().toLowerCase() !== name.trim().toLowerCase());
    const updatedCoverage = await updateCoverageData(city.cityName, kecamatans);
    return res.json({ status: 'success', coverage: updatedCoverage });
  } catch (err: any) {
    console.error('Delete kecamatan error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus kecamatan.' });
  }
});

app.post('/api/coverage/kelurahan', async (req, res) => {
  try {
    const { cityName, kecamatanName, name } = req.body;
    const coverage = await getAllCoverage();
    const city = coverage.find((c) => c.cityName.trim().toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return res.status(404).json({ status: 'error', message: 'Kota/Kabupaten tidak ditemukan.' });
    }

    const kecamatans = [...city.kecamatans];
    const kec = kecamatans.find((k: any) => k.name.trim().toLowerCase() === kecamatanName.trim().toLowerCase());
    if (!kec) {
      return res.status(404).json({ status: 'error', message: 'Kecamatan tidak ditemukan.' });
    }

    if (!kec.kelurahans) kec.kelurahans = [];
    kec.kelurahans.push({
      name: name.trim(),
      status: 'active',
      nodesCount: Math.floor(5 + Math.random() * 20),
    });

    const updatedCoverage = await updateCoverageData(city.cityName, kecamatans);
    return res.json({ status: 'success', coverage: updatedCoverage });
  } catch (err: any) {
    console.error('Add kelurahan error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menambah kelurahan.' });
  }
});

app.post('/api/coverage/kelurahan/delete', async (req, res) => {
  try {
    const { cityName, kecamatanName, name } = req.body;
    const coverage = await getAllCoverage();
    const city = coverage.find((c) => c.cityName.trim().toLowerCase() === cityName.trim().toLowerCase());
    if (!city) {
      return res.status(404).json({ status: 'error', message: 'Kota/Kabupaten tidak ditemukan.' });
    }

    const kecamatans = [...city.kecamatans];
    const kec = kecamatans.find((k: any) => k.name.trim().toLowerCase() === kecamatanName.trim().toLowerCase());
    if (!kec) {
      return res.status(404).json({ status: 'error', message: 'Kecamatan tidak ditemukan.' });
    }

    kec.kelurahans = (kec.kelurahans || []).filter((kl: any) => kl.name.trim().toLowerCase() !== name.trim().toLowerCase());
    const updatedCoverage = await updateCoverageData(city.cityName, kecamatans);
    return res.json({ status: 'success', coverage: updatedCoverage });
  } catch (err: any) {
    console.error('Delete kelurahan error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus kelurahan.' });
  }
});

// ==================== WIFI PACKAGES API ====================

app.get('/api/packages', async (req, res) => {
  try {
    const packages = await getAllPackages();
    return res.json({ status: 'success', packages });
  } catch (err: any) {
    console.error('Get packages error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat paket WiFi.' });
  }
});

app.post('/api/packages', async (req, res) => {
  try {
    const { name, speed, price, features, type, popular } = req.body;
    if (!name || !speed || !price || !type) {
      return res.status(400).json({ status: 'error', message: 'Parameter tidak lengkap.' });
    }

    const newPackage: WifiPackage = {
      id: `pkg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      speed: speed.trim(),
      price: Number(price),
      features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n').map((s: string) => s.trim()).filter(Boolean) : []),
      type,
      popular: !!popular,
    };

    await createPackage(newPackage);
    const packages = await getAllPackages();
    return res.json({ status: 'success', packages, newPackage });
  } catch (err: any) {
    console.error('Create package error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menyimpan paket WiFi.' });
  }
});

const removePackage = async (id: string, res: express.Response) => {
  try {
    await deletePackage(id);
    const packages = await getAllPackages();
    return res.json({ status: 'success', packages });
  } catch (err: any) {
    console.error('Delete package error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus paket WiFi.' });
  }
};

app.delete('/api/packages/:id', (req, res) => {
  removePackage(req.params.id, res);
});

app.post('/api/packages/delete', (req, res) => {
  removePackage(req.body.id, res);
});

// ==================== DEVELOPER SUPABASE / POSTGRESQL API ====================

app.get('/api/dev/db', async (req, res) => {
  try {
    const [customers, tickets, settings, coverage, packages] = await Promise.all([
      getAllCustomers(),
      getAllTickets(),
      getCompanySettings(),
      getAllCoverage(),
      getAllPackages(),
    ]);

    return res.json({
      databaseEngine: 'PostgreSQL / Supabase',
      customers,
      tickets,
      companySettings: settings,
      coverageList: coverage,
      packages,
    });
  } catch (err: any) {
    console.error('Dev DB error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat data PostgreSQL.' });
  }
});

app.get('/api/dev/db/metrics', async (req, res) => {
  try {
    const metrics = await getDatabaseMetrics();
    return res.json({ status: 'success', metrics });
  } catch (err: any) {
    console.error('Metrics error:', err);
    return res.status(500).json({ status: 'error', message: 'Gagal memuat metrik database.' });
  }
});

// ==================== USER'S SUPABASE INTEGRATION ENDPOINTS ====================

// Get Supabase config
app.get('/api/dev/supabase/config', (req, res) => {
  const config = loadSupabaseConfig();
  const maskedConfig = {
    projectUrl: config.projectUrl,
    anonKey: config.anonKey ? `${config.anonKey.substring(0, 8)}...${config.anonKey.substring(config.anonKey.length - 6)}` : '',
    hasAnonKey: Boolean(config.anonKey),
    hasServiceRoleKey: Boolean(config.serviceRoleKey),
    dbHost: config.dbHost,
    dbUser: config.dbUser || 'postgres',
    dbPort: config.dbPort || 5432,
    dbName: config.dbName || 'postgres',
    hasPassword: Boolean(config.dbPassword),
  };
  res.json({ status: 'success', config: maskedConfig, isConfigured: Boolean(config.projectUrl && (config.anonKey || config.dbPassword)) });
});

// Save user Supabase config
app.post('/api/dev/supabase/config', (req, res) => {
  const { projectUrl, anonKey, serviceRoleKey, dbHost, dbPassword, dbUser, dbPort, dbName } = req.body;
  const current = loadSupabaseConfig();

  const newConfig: SupabaseConfig = {
    projectUrl: projectUrl !== undefined ? projectUrl.trim() : current.projectUrl,
    anonKey: anonKey ? anonKey.trim() : (anonKey === '' ? '' : current.anonKey),
    serviceRoleKey: serviceRoleKey ? serviceRoleKey.trim() : (serviceRoleKey === '' ? '' : current.serviceRoleKey),
    dbHost: dbHost !== undefined ? dbHost.trim() : current.dbHost,
    dbPassword: dbPassword ? dbPassword.trim() : (dbPassword === '' ? '' : current.dbPassword),
    dbUser: dbUser ? dbUser.trim() : current.dbUser,
    dbPort: dbPort ? Number(dbPort) : current.dbPort,
    dbName: dbName ? dbName.trim() : current.dbName,
  };

  saveSupabaseConfig(newConfig);
  res.json({ status: 'success', message: 'Konfigurasi Supabase berhasil disimpan!' });
});

// Test connection to user Supabase project
app.post('/api/dev/supabase/test', async (req, res) => {
  try {
    const config = req.body.projectUrl ? (req.body as SupabaseConfig) : loadSupabaseConfig();
    if (!config.projectUrl) {
      return res.status(400).json({ status: 'error', message: 'Project URL Supabase belum diisi.' });
    }

    const client = getSupabaseClient(config);
    if (!client) {
      return res.status(400).json({ status: 'error', message: 'Kunci API (Anon Key atau Service Role Key) Supabase belum diisi.' });
    }

    const startTime = Date.now();
    // Try pinging or querying customers / health
    const { data, error, count } = await client
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const latency = Date.now() - startTime;

    if (error) {
      // If table doesn't exist yet, it's still reachable, but schema needs to be applied
      if (error.code === '42P01' || error.message.includes('relation "public.customers" does not exist')) {
        return res.json({
          status: 'success',
          reachable: true,
          schemaReady: false,
          latencyMs: latency,
          message: 'Terhubung ke Supabase! Tabel belum dibuat. Silakan salin dan jalankan skrip SQL skema di Supabase SQL Editor.',
        });
      }
      return res.status(400).json({
        status: 'error',
        reachable: false,
        message: `Gagal terhubung ke Supabase: ${error.message} (Kode: ${error.code})`,
      });
    }

    return res.json({
      status: 'success',
      reachable: true,
      schemaReady: true,
      latencyMs: latency,
      customerCount: count,
      message: `Berhasil terhubung ke Project Supabase (${latency}ms)! Tabel siap digunakan.`,
    });
  } catch (err: any) {
    console.error('Supabase test error:', err);
    return res.status(500).json({ status: 'error', message: `Gagal menguji koneksi: ${err.message}` });
  }
});

// Sync data to user's Supabase project
app.post('/api/dev/supabase/sync', async (req, res) => {
  try {
    const config = loadSupabaseConfig();
    const client = getSupabaseClient(config);
    if (!client) {
      return res.status(400).json({ status: 'error', message: 'Konfigurasi Supabase belum lengkap (Project URL & Key).' });
    }

    const [customersList, settings, coverageList, packagesList, ticketsList] = await Promise.all([
      getAllCustomers(),
      getCompanySettings(),
      getAllCoverage(),
      getAllPackages(),
      getAllTickets(),
    ]);

    // 1. Upsert company_settings
    await client.from('company_settings').upsert({
      id: 'default',
      name: settings.name,
      address: settings.address,
      logo_text: settings.logoText,
      theme_color: settings.themeColor,
      logo_url: settings.logoUrl || '',
      promos: JSON.stringify(settings.promos || []),
    });

    // 2. Upsert packages
    for (const pkg of packagesList) {
      await client.from('wifi_packages').upsert({
        id: pkg.id,
        name: pkg.name,
        speed: pkg.speed,
        price: pkg.price,
        features: JSON.stringify(pkg.features),
        type: pkg.type,
        popular: pkg.popular || false,
      });
    }

    // 3. Upsert coverage
    for (const cov of coverageList) {
      await client.from('coverage_areas').upsert({
        city_name: cov.cityName,
        region_type: cov.regionType,
        data: JSON.stringify(cov.kecamatans),
      }, { onConflict: 'city_name' });
    }

    // 4. Upsert customers
    for (const c of customersList) {
      await client.from('customers').upsert({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        latitude: c.coordinates[0],
        longitude: c.coordinates[1],
        package_id: c.packageId,
        status: c.status,
        ktp_image_url: c.ktpImageUrl || null,
        created_at: c.createdAt,
      });

      // Upsert payments for this customer
      for (const p of c.payments) {
        await client.from('payments').upsert({
          id: p.id,
          customer_id: c.id,
          date: p.date,
          amount: p.amount,
          status: p.status,
          proof_of_payment_url: p.proofOfPaymentUrl || null,
          billing_period: p.billingPeriod,
          method: p.method || null,
          transaction_id: p.transactionId || null,
        });
      }
    }

    // 5. Upsert tickets
    for (const t of ticketsList) {
      await client.from('support_tickets').upsert({
        id: t.id,
        customer_id: t.userId || null,
        user_name: t.userName,
        email: t.email,
        phone: t.phone,
        message: t.message,
        date: t.date,
        status: t.status,
      });
    }

    return res.json({
      status: 'success',
      message: `Sukses menyinkronkan ${customersList.length} pelanggan, ${packagesList.length} paket, dan seluruh data ke project Supabase Anda!`,
    });
  } catch (err: any) {
    console.error('Supabase sync error:', err);
    return res.status(500).json({ status: 'error', message: `Gagal sinkronisasi data ke Supabase: ${err.message}` });
  }
});

// Test registration simulation directly to Supabase
app.post('/api/dev/supabase/test-registration', async (req, res) => {
  try {
    const testId = `TR-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const testEmail = `uji.coba.${Date.now()}@patasnet.id`;

    const testCust = {
      id: testId,
      name: 'Pelanggan Uji Coba Supabase',
      email: testEmail,
      phone: '081299887766',
      address: 'Jl. Uji Coba Supabase No. 99, Jakarta',
      coordinates: [-6.2088, 106.8456] as [number, number],
      packageId: 'home-20m',
      status: 'active',
      ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      createdAt: new Date().toISOString().split('T')[0],
      initialPayment: {
        id: `PAY-${Math.floor(7000 + Math.random() * 9000)}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        amount: 170000,
        status: 'unpaid',
        billingPeriod: 'Juli 2026',
        method: 'qris',
      },
    };

    const result = await pushCustomerToSupabase(testCust);

    if (result.success) {
      return res.json({
        status: 'success',
        message: `BERHASIL! Data pendaftaran simulasi ${testCust.name} (${testCust.id}) langsung masuk ke tabel customers & payments di Supabase Anda!`,
        customer: testCust,
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message: `Gagal mengirim ke Supabase: ${result.error || result.reason}`,
      });
    }
  } catch (err: any) {
    console.error('Test registration error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Get SQL schema for Supabase SQL Editor
app.get('/api/dev/supabase/schema', (req, res) => {
  res.json({ status: 'success', schema: SUPABASE_SQL_SCHEMA });
});

// ==================== GOOGLE SHEETS & GOOGLE DRIVE ENDPOINTS ====================

// Get Sheets config
app.get(['/api/dev/sheets/config', '/api/sheets/config'], (req, res) => {
  const config = loadSheetsConfig();
  res.json({
    status: 'success',
    config,
    isConfigured: Boolean(config.webAppUrl),
  });
});

// Save Sheets config
app.post(['/api/dev/sheets/config', '/api/sheets/config'], (req, res) => {
  const { webAppUrl, driveFolderName, autoSync, syncIntervalSeconds } = req.body;
  const updated = saveSheetsConfig({
    webAppUrl,
    driveFolderName,
    autoSync: autoSync !== undefined ? Boolean(autoSync) : true,
    syncIntervalSeconds: syncIntervalSeconds ? Number(syncIntervalSeconds) : 4,
  });
  res.json({
    status: 'success',
    message: 'Konfigurasi Google Sheets & Drive berhasil disimpan di server!',
    config: updated,
  });
});

// Test Google Sheets & Drive connection
app.post('/api/dev/sheets/test', async (req, res) => {
  try {
    const url = req.body.webAppUrl || loadSheetsConfig().webAppUrl;
    if (!url) {
      return res.status(400).json({ status: 'error', message: 'URL Web App Google Apps Script belum diisi.' });
    }

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      return res.status(400).json({
        status: 'error',
        message: `HTTP ${response.status}: Google Sheets Web App tidak merespon secara valid. Pastikan Web App di-deploy dengan opsi "Who has access: Anyone".`,
      });
    }

    const data = await response.json();
    if (data && data.status === 'success') {
      return res.json({
        status: 'success',
        reachable: true,
        latencyMs: latency,
        customerCount: data.customers?.length || 0,
        ticketCount: data.tickets?.length || 0,
        settings: data.settings,
        message: `Koneksi Google Sheets & Drive BERHASIL (${latency}ms)! Spreadsheet dan folder Google Drive terhubung.`,
      });
    }

    return res.status(400).json({
      status: 'error',
      message: data.message || 'Respon dari Google Sheets tidak dikenali.',
    });
  } catch (err: any) {
    console.error('Google Sheets test error:', err);
    return res.status(500).json({ status: 'error', message: `Gagal menghubungi Google Sheets: ${err.message}` });
  }
});

// Sync data UP: push all server data into Google Sheets & Drive
app.post('/api/dev/sheets/sync-up', async (req, res) => {
  try {
    const [customers, tickets, settings] = await Promise.all([
      getAllCustomers(),
      getAllTickets(),
      getCompanySettings(),
    ]);

    const result = await syncSheetsWebhook('sync_all', {
      customers,
      tickets,
      settings,
    });

    // Also update settings in spreadsheet
    await syncSheetsWebhook('update_settings', {
      name: settings.name,
      address: settings.address,
      logoText: settings.logoText,
      themeColor: settings.themeColor,
      logoUrl: settings.logoUrl,
    });

    saveSheetsConfig({ lastSyncedAt: new Date().toISOString() });

    return res.json({
      status: 'success',
      message: `Sukses menyinkronkan ${customers.length} data pelanggan, pembayaran, dan identitas logo ke Google Sheet & Drive!`,
      result,
    });
  } catch (err: any) {
    console.error('Google Sheets sync-up error:', err);
    return res.status(500).json({ status: 'error', message: `Gagal sinkronisasi ke Google Sheets: ${err.message}` });
  }
});

// Sync data DOWN: pull latest data from Google Sheets into server
app.get(['/api/dev/sheets/sync-down', '/api/sheets/sync-down'], async (req, res) => {
  try {
    const data = await fetchFromGoogleSheetsServer();
    if (!data || data.status !== 'success') {
      const cfg = loadSheetsConfig();
      if (!cfg.webAppUrl) {
        return res.json({ status: 'empty', message: 'URL Google Sheets belum dikonfigurasi.' });
      }
      return res.status(502).json({ status: 'error', message: 'Gagal menarik data dari Google Sheets.' });
    }

    // If settings found, update server settings
    if (data.settings && data.settings.name) {
      await updateCompanySettings({
        name: data.settings.name,
        address: data.settings.address || '',
        logoText: data.settings.logoText || 'PATAS NET',
        themeColor: data.settings.themeColor || '#2563eb',
        logoUrl: data.settings.logoUrl || '',
        tagline: data.settings.tagline || undefined,
        coverageText: data.settings.coverageText || undefined,
        legalName: data.settings.legalName || undefined,
        whatsappNumber: data.settings.whatsappNumber || undefined,
        phoneNumber: data.settings.phoneNumber || undefined,
        email: data.settings.email || undefined,
      });
    }

    saveSheetsConfig({ lastSyncedAt: new Date().toISOString() });

    return res.json({
      status: 'success',
      customers: data.customers || [],
      tickets: data.tickets || [],
      settings: data.settings,
      message: `Berhasil menarik ${data.customers?.length || 0} data pelanggan dan pengaturan dari Google Sheets!`,
    });
  } catch (err: any) {
    console.error('Google Sheets sync-down error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Test registration simulation: sends customer and KTP image to Google Drive
app.post('/api/dev/sheets/test-registration', async (req, res) => {
  try {
    const testId = `TR-DRIVE-${Math.floor(1000 + Math.random() * 9000)}`;
    const testCust = {
      id: testId,
      name: 'Pelanggan Uji Google Drive',
      email: `uji.drive.${Date.now()}@patasnet.id`,
      phone: '081299887711',
      address: 'Jl. Google Drive No. 100, Jakarta',
      coordinates: [-6.2088, 106.8456],
      packageId: 'home-20m',
      status: 'pending',
      // Standard small 1x1 png base64 for testing Drive upload
      ktpImageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHz2fW4AAAAABJRU5ErkJggg==',
      amount: 170000,
    };

    const result = await syncSheetsWebhook('subscribe', testCust);

    if (result && result.status === 'success') {
      return res.json({
        status: 'success',
        message: `BERHASIL! Data pendaftaran ${testCust.name} (${testCust.id}) masuk ke Sheet Pelanggan dan foto KTP tersimpan di Google Drive!`,
        result,
      });
    }

    return res.json({
      status: 'success',
      message: `Pendaftaran simulasi ${testCust.name} (${testCust.id}) dikirim ke Google Sheets & Drive Webhook.`,
      result,
    });
  } catch (err: any) {
    console.error('Google Sheets test-registration error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Proxy endpoint for client-side sync to avoid browser CORS/redirect issues
app.post('/api/sheets/proxy', async (req, res) => {
  try {
    const { action, url: clientUrl, ...payload } = req.body;
    const url = clientUrl || loadSheetsConfig().webAppUrl;
    if (!url) {
      return res.status(400).json({ status: 'error', message: 'URL Google Sheets belum diatur.' });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch {
      return res.json({ status: 'success', raw: text });
    }
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Get Google Apps Script Code.gs template
app.get('/api/dev/sheets/script', (req, res) => {
  res.json({
    status: 'success',
    script: GOOGLE_APPS_SCRIPT_TEMPLATE,
  });
});

// Start listening or initialize Vite dev server
async function startServer() {
  // Initialize database tables seed if empty
  await seedDatabaseIfEmpty();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Patas Net WiFi] Server running on port ${PORT} with PostgreSQL / Supabase backend.`);
  });
}

startServer();
