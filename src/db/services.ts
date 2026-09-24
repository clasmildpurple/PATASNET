import { db } from './index.ts';
import {
  customers,
  payments,
  supportTickets,
  wifiPackages,
  coverageAreas,
  companySettings,
  users
} from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { CustomerUser, SupportTicket, PaymentRecord, WifiPackage } from '../types.ts';

// ---------------------- SEEDING / INITIALIZATION ----------------------

export async function seedDatabaseIfEmpty() {
  try {
    // Check if customers already populated
    const existingCustomers = await db.select().from(customers).limit(1);
    if (existingCustomers.length === 0) {
      console.log('[Cloud SQL / Supabase] Initializing seed data in PostgreSQL...');

      // Default company settings
      await db.insert(companySettings).values({
        id: 'default',
        name: 'Taranet WiFi',
        address: 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
        logoText: 'TARANET',
        themeColor: '#2563eb',
        logoUrl: '',
        promos: JSON.stringify([]),
      }).onConflictDoNothing();

      // Seed packages
      const defaultPkgs = [
        { id: 'home-10m', name: 'Home Basic 10 Mbps', speed: '10 Mbps', price: 120000, features: JSON.stringify(['Kecepatan Stabil up to 10 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 1-3 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang']), type: 'home', popular: false },
        { id: 'home-15m', name: 'Home Starter 15 Mbps', speed: '15 Mbps', price: 160000, features: JSON.stringify(['Kecepatan Stabil up to 15 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 3-5 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang']), type: 'home', popular: false },
        { id: 'home-20m', name: 'Home Lite 20 Mbps', speed: '20 Mbps', price: 170000, features: JSON.stringify(['Kecepatan Stabil up to 20 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 4-6 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang']), type: 'home', popular: true },
        { id: 'home-30m', name: 'Home Family 30 Mbps', speed: '30 Mbps', price: 210000, features: JSON.stringify(['Kecepatan Stabil up to 30 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 6-8 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang']), type: 'home', popular: false },
        { id: 'home-50m', name: 'Home Pro 50 Mbps', speed: '50 Mbps', price: 270000, features: JSON.stringify(['Kecepatan Stabil up to 50 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 8-10 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang']), type: 'home', popular: false },
        { id: 'home-100m', name: 'Home Ultra 100 Mbps', speed: '100 Mbps', price: 490000, features: JSON.stringify(['Kecepatan Stabil up to 100 Mbps', 'Tanpa Batasan / Unlimited Kuota', 'Ideal untuk 10-15 perangkat', 'Bisa Sewa STB (+Rp25rb)', 'GRATIS Biaya Pasang']), type: 'home', popular: false },
        { id: 'taranet-prime', name: 'Taranet PRIME 50 Mbps', speed: 'Up to 50 Mbps', price: 220000, features: JSON.stringify(['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support CCTV Online Rumah', 'Streaming Smart TV 4K', 'GRATIS Biaya Pasang']), type: 'business', popular: false },
        { id: 'taranet-exclusive', name: 'Taranet EXCLUSIVE 100 Mbps', speed: 'Up to 100 Mbps', price: 275000, features: JSON.stringify(['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 2 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang']), type: 'business', popular: true },
        { id: 'taranet-exclusive2', name: 'Taranet EXCLUSIVE II 200 Mbps', speed: 'Up to 200 Mbps', price: 310000, features: JSON.stringify(['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 3 CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Stabil', 'GRATIS Biaya Pasang']), type: 'business', popular: false },
        { id: 'taranet-bisnis', name: 'Taranet BISNIS 300 Mbps', speed: 'Up to 300 Mbps', price: 375000, features: JSON.stringify(['100% Fiber Optik Unlimited', 'Sosmed & Video Streaming HD', 'Upload & Download Simetris 1:1', 'Ideal untuk 10-15 perangkat aktif', 'Support 5+ CCTV Online Rumah', 'Streaming Smart TV 4K', 'Gaming Online Super Stabil', 'GRATIS Biaya Pasang']), type: 'business', popular: false },
      ];
      for (const p of defaultPkgs) {
        await db.insert(wifiPackages).values(p).onConflictDoNothing();
      }

      // Seed default coverage areas
      const defaultCoverage = [
        {
          cityName: 'Jakarta Selatan',
          regionType: 'Kota',
          data: JSON.stringify([
            { name: 'Kebayoran Baru', kelurahans: [{ name: 'Rawa Barat', status: 'active', nodesCount: 12 }, { name: 'Selong', status: 'active', nodesCount: 8 }, { name: 'Melawai', status: 'active', nodesCount: 15 }, { name: 'Kramat Pela', status: 'active', nodesCount: 11 }, { name: 'Gunung', status: 'active', nodesCount: 9 }] },
            { name: 'Cilandak', kelurahans: [{ name: 'Cipete Selatan', status: 'active', nodesCount: 14 }, { name: 'Gandaria Selatan', status: 'active', nodesCount: 16 }, { name: 'Pondok Labu', status: 'active', nodesCount: 22 }, { name: 'Lebak Bulus', status: 'active', nodesCount: 18 }] },
            { name: 'Mampang Prapatan', kelurahans: [{ name: 'Kuningan Barat', status: 'active', nodesCount: 25 }, { name: 'Pela Mampang', status: 'active', nodesCount: 19 }, { name: 'Bangka', status: 'active', nodesCount: 15 }] },
            { name: 'Tebet', kelurahans: [{ name: 'Menteng Dalam', status: 'active', nodesCount: 14 }, { name: 'Tebet Barat', status: 'active', nodesCount: 17 }] }
          ])
        },
        {
          cityName: 'Depok',
          regionType: 'Kota',
          data: JSON.stringify([
            { name: 'Beji', kelurahans: [{ name: 'Pondok Cina', status: 'active', nodesCount: 32 }, { name: 'Beji Timur', status: 'active', nodesCount: 12 }, { name: 'Kemiri Muka', status: 'active', nodesCount: 18 }] },
            { name: 'Pancoran Mas', kelurahans: [{ name: 'Depok Jaya', status: 'active', nodesCount: 14 }, { name: 'Mampang', status: 'active', nodesCount: 10 }, { name: 'Pancoran Mas', status: 'active', nodesCount: 16 }] },
            { name: 'Cinere', kelurahans: [{ name: 'Cinere', status: 'active', nodesCount: 20 }, { name: 'Gandul', status: 'active', nodesCount: 15 }, { name: 'Pangkalan Jati', status: 'active', nodesCount: 11 }] }
          ])
        },
        {
          cityName: 'Tangerang Selatan',
          regionType: 'Kota',
          data: JSON.stringify([
            { name: 'Serpong', kelurahans: [{ name: 'Lengkong Gudang', status: 'active', nodesCount: 24 }, { name: 'Serpong', status: 'active', nodesCount: 18 }, { name: 'Cilenggang', status: 'active', nodesCount: 14 }] },
            { name: 'Ciputat', kelurahans: [{ name: 'Ciputat', status: 'active', nodesCount: 15 }, { name: 'Cipayung', status: 'active', nodesCount: 12 }, { name: 'Sawah Baru', status: 'active', nodesCount: 10 }] },
            { name: 'Pondok Aren', kelurahans: [{ name: 'Jurang Mangu Timur', status: 'active', nodesCount: 22 }, { name: 'Pondok Jaya', status: 'active', nodesCount: 16 }] }
          ])
        },
        {
          cityName: 'Bogor',
          regionType: 'Kota',
          data: JSON.stringify([
            { name: 'Bogor Timur', kelurahans: [{ name: 'Baranangsiang', status: 'active', nodesCount: 19 }, { name: 'Katulampa', status: 'active', nodesCount: 28 }, { name: 'Sukasari', status: 'active', nodesCount: 11 }] },
            { name: 'Bogor Selatan', kelurahans: [{ name: 'Batutulis', status: 'active', nodesCount: 15 }, { name: 'Bondongan', status: 'active', nodesCount: 12 }, { name: 'Empang', status: 'active', nodesCount: 20 }] }
          ])
        },
        {
          cityName: 'Ciomas (Bogor)',
          regionType: 'Kabupaten',
          data: JSON.stringify([
            { name: 'Ciomas', kelurahans: [{ name: 'Ciomas Rahayu', status: 'active', nodesCount: 24 }, { name: 'Ciomas Indah', status: 'active', nodesCount: 15 }, { name: 'Pagelaran', status: 'active', nodesCount: 31 }] }
          ])
        }
      ];
      for (const cov of defaultCoverage) {
        await db.insert(coverageAreas).values(cov).onConflictDoNothing();
      }

      // Seed default customers & payments
      const defaultCusts = [
        {
          id: 'TR-1001',
          name: 'Budi Santoso',
          email: 'budi@gmail.com',
          phone: '081234567890',
          address: 'Jl. Ciomas Raya No. 44, RT. 03/RW. 02, Kel. Rawa Barat, Kec. Kebayoran Baru, Jakarta Selatan',
          latitude: -6.2345,
          longitude: 106.8123,
          packageId: 'taranet-exclusive',
          status: 'active',
          ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
          passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // user123
          createdAt: '2026-07-01',
        },
        {
          id: 'TR-1002',
          name: 'Dewi Lestari',
          email: 'dewi@gmail.com',
          phone: '089876543210',
          address: 'Jl. Margonda Raya No. 12, Kel. Pondok Cina, Kec. Beji, Depok, Jawa Barat',
          latitude: -6.3721,
          longitude: 106.8324,
          packageId: 'home-20m',
          status: 'active',
          ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
          passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // user123
          createdAt: '2026-07-10',
        },
        {
          id: 'TR-1003',
          name: 'Andi Wijaya',
          email: 'andi@gmail.com',
          phone: '081122334455',
          address: 'Komp. BSD Blok C4 No. 8, Kel. Lengkong Gudang, Kec. Serpong, Tangerang Selatan',
          latitude: -6.3023,
          longitude: 106.6821,
          packageId: 'taranet-prime',
          status: 'pending',
          ktpImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
          passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // user123
          createdAt: '2026-07-18',
        },
      ];

      for (const c of defaultCusts) {
        await db.insert(customers).values(c).onConflictDoNothing();
      }

      // Seed payments
      await db.insert(payments).values([
        {
          id: 'PAY-7001',
          customerId: 'TR-1001',
          date: '2026-07-02 09:15:30',
          amount: 275000,
          status: 'paid',
          proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
          billingPeriod: 'Juli 2026',
          method: 'qris',
          transactionId: 'TX-88001122'
        },
        {
          id: 'PAY-7002',
          customerId: 'TR-1002',
          date: '2026-07-10 14:20:11',
          amount: 170000,
          status: 'paid',
          proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
          billingPeriod: 'Juli 2026',
          method: 'bca',
          transactionId: 'TX-88001123'
        },
        {
          id: 'PAY-7003',
          customerId: 'TR-1003',
          date: '2026-07-18 11:34:55',
          amount: 220000,
          status: 'pending_verification',
          proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
          billingPeriod: 'Juli 2026',
          method: 'mandiri'
        }
      ]).onConflictDoNothing();

      // Seed support ticket
      await db.insert(supportTickets).values({
        id: 'TCK-5001',
        customerId: 'TR-1001',
        userName: 'Budi Santoso',
        email: 'budi@gmail.com',
        phone: '081234567890',
        message: 'Koneksi WiFi Taranet di rumah lambat sekali sejak hujan tadi sore, mohon diperiksa jalurnya.',
        date: '2026-07-18 19:45:00',
        status: 'open'
      }).onConflictDoNothing();

      console.log('[Cloud SQL / Supabase] Database seeded successfully!');
    }
  } catch (err) {
    console.error('Failed to run seedDatabaseIfEmpty:', err);
  }
}

// ---------------------- CUSTOMERS REPOSITORY ----------------------

export async function getAllCustomers(): Promise<CustomerUser[]> {
  try {
    const custRows = await db.select().from(customers);
    const payRows = await db.select().from(payments);
    const tickRows = await db.select().from(supportTickets);

    return custRows.map((c) => {
      const custPayments: PaymentRecord[] = payRows
        .filter((p) => p.customerId === c.id)
        .map((p) => ({
          id: p.id,
          date: p.date,
          amount: p.amount,
          status: p.status as 'unpaid' | 'pending_verification' | 'paid',
          proofOfPaymentUrl: p.proofOfPaymentUrl || undefined,
          billingPeriod: p.billingPeriod,
          method: p.method || undefined,
          transactionId: p.transactionId || undefined,
        }));

      const custTickets: SupportTicket[] = tickRows
        .filter((t) => t.customerId === c.id)
        .map((t) => ({
          id: t.id,
          userId: t.customerId || undefined,
          userName: t.userName,
          email: t.email,
          phone: t.phone,
          message: t.message,
          date: t.date,
          status: t.status as 'open' | 'resolved',
        }));

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        coordinates: [c.latitude || -6.2088, c.longitude || 106.8456],
        packageId: c.packageId,
        status: c.status as 'pending' | 'active' | 'suspended',
        ktpImageUrl: c.ktpImageUrl || undefined,
        payments: custPayments,
        tickets: custTickets,
        createdAt: c.createdAt,
      };
    });
  } catch (error) {
    console.error('getAllCustomers failed:', error);
    throw new Error('Gagal mengambil data pelanggan dari database PostgreSQL.', { cause: error });
  }
}

export async function getCustomerById(id: string): Promise<CustomerUser | null> {
  try {
    const rows = await db.select().from(customers).where(eq(customers.id, id));
    if (rows.length === 0) return null;
    const c = rows[0];

    const payRows = await db.select().from(payments).where(eq(payments.customerId, id));
    const tickRows = await db.select().from(supportTickets).where(eq(supportTickets.customerId, id));

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      coordinates: [c.latitude || -6.2088, c.longitude || 106.8456],
      packageId: c.packageId,
      status: c.status as 'pending' | 'active' | 'suspended',
      ktpImageUrl: c.ktpImageUrl || undefined,
      payments: payRows.map((p) => ({
        id: p.id,
        date: p.date,
        amount: p.amount,
        status: p.status as 'unpaid' | 'pending_verification' | 'paid',
        proofOfPaymentUrl: p.proofOfPaymentUrl || undefined,
        billingPeriod: p.billingPeriod,
        method: p.method || undefined,
        transactionId: p.transactionId || undefined,
      })),
      tickets: tickRows.map((t) => ({
        id: t.id,
        userId: t.customerId || undefined,
        userName: t.userName,
        email: t.email,
        phone: t.phone,
        message: t.message,
        date: t.date,
        status: t.status as 'open' | 'resolved',
      })),
      createdAt: c.createdAt,
    };
  } catch (error) {
    console.error('getCustomerById failed:', error);
    throw new Error('Gagal memuat profil pelanggan dari database.', { cause: error });
  }
}

export async function getCustomerByEmail(email: string) {
  try {
    const rows = await db.select().from(customers).where(eq(customers.email, email.toLowerCase()));
    return rows[0] || null;
  } catch (error) {
    console.error('getCustomerByEmail failed:', error);
    throw new Error('Gagal memeriksa email pelanggan.', { cause: error });
  }
}

export async function createCustomer(data: {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  coordinates: [number, number];
  packageId: string;
  status: 'pending' | 'active' | 'suspended';
  ktpImageUrl?: string;
  passwordHash: string;
  createdAt: string;
  initialPayment: PaymentRecord;
}) {
  try {
    await db.insert(customers).values({
      id: data.id,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      address: data.address,
      latitude: data.coordinates[0],
      longitude: data.coordinates[1],
      packageId: data.packageId,
      status: data.status,
      ktpImageUrl: data.ktpImageUrl,
      passwordHash: data.passwordHash,
      createdAt: data.createdAt,
    });

    await db.insert(payments).values({
      id: data.initialPayment.id,
      customerId: data.id,
      date: data.initialPayment.date,
      amount: data.initialPayment.amount,
      status: data.initialPayment.status,
      billingPeriod: data.initialPayment.billingPeriod,
      method: data.initialPayment.method,
      proofOfPaymentUrl: data.initialPayment.proofOfPaymentUrl,
    });

    return await getCustomerById(data.id);
  } catch (error) {
    console.error('createCustomer failed:', error);
    throw new Error('Gagal mendaftarkan pelanggan ke database PostgreSQL.', { cause: error });
  }
}

export async function updateCustomerStatus(id: string, status: 'pending' | 'active' | 'suspended') {
  try {
    await db.update(customers).set({ status }).where(eq(customers.id, id));
    return await getCustomerById(id);
  } catch (error) {
    console.error('updateCustomerStatus failed:', error);
    throw new Error('Gagal memperbarui status pelanggan.', { cause: error });
  }
}

export async function deleteCustomer(id: string) {
  try {
    await db.delete(payments).where(eq(payments.customerId, id));
    await db.delete(supportTickets).where(eq(supportTickets.customerId, id));
    await db.delete(customers).where(eq(customers.id, id));
    return true;
  } catch (error) {
    console.error('deleteCustomer failed:', error);
    throw new Error('Gagal menghapus pelanggan dari database.', { cause: error });
  }
}

// ---------------------- PAYMENTS REPOSITORY ----------------------

export async function submitPaymentProof(data: {
  userId: string;
  paymentId: string;
  method?: string;
  proofOfPaymentUrl: string;
  date: string;
}) {
  try {
    await db.update(payments).set({
      status: 'pending_verification',
      method: data.method,
      proofOfPaymentUrl: data.proofOfPaymentUrl,
      date: data.date,
    }).where(eq(payments.id, data.paymentId));

    return await getCustomerById(data.userId);
  } catch (error) {
    console.error('submitPaymentProof failed:', error);
    throw new Error('Gagal mengunggah bukti pembayaran.', { cause: error });
  }
}

export async function approvePayment(userId: string, paymentId: string) {
  try {
    const txId = `TX-${Math.floor(88001000 + Math.random() * 9000)}`;
    await db.update(payments).set({
      status: 'paid',
      transactionId: txId,
    }).where(eq(payments.id, paymentId));

    // Also activate customer if status was pending
    const cust = await db.select().from(customers).where(eq(customers.id, userId));
    if (cust.length > 0 && cust[0].status === 'pending') {
      await db.update(customers).set({ status: 'active' }).where(eq(customers.id, userId));
    }

    return await getCustomerById(userId);
  } catch (error) {
    console.error('approvePayment failed:', error);
    throw new Error('Gagal memverifikasi pembayaran.', { cause: error });
  }
}

export async function rejectPayment(userId: string, paymentId: string) {
  try {
    await db.update(payments).set({
      status: 'unpaid',
      proofOfPaymentUrl: null,
    }).where(eq(payments.id, paymentId));

    return await getCustomerById(userId);
  } catch (error) {
    console.error('rejectPayment failed:', error);
    throw new Error('Gagal menolak pembayaran.', { cause: error });
  }
}

// ---------------------- SUPPORT TICKETS REPOSITORY ----------------------

export async function getAllTickets(): Promise<SupportTicket[]> {
  try {
    const rows = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    return rows.map((t) => ({
      id: t.id,
      userId: t.customerId || undefined,
      userName: t.userName,
      email: t.email,
      phone: t.phone,
      message: t.message,
      date: t.date,
      status: t.status as 'open' | 'resolved',
    }));
  } catch (error) {
    console.error('getAllTickets failed:', error);
    throw new Error('Gagal mengambil tiket dukungan.', { cause: error });
  }
}

export async function createTicket(data: {
  id: string;
  userId?: string;
  userName: string;
  email: string;
  phone: string;
  message: string;
  date: string;
}) {
  try {
    await db.insert(supportTickets).values({
      id: data.id,
      customerId: data.userId || null,
      userName: data.userName,
      email: data.email,
      phone: data.phone,
      message: data.message,
      date: data.date,
      status: 'open',
    });
    return {
      id: data.id,
      userId: data.userId,
      userName: data.userName,
      email: data.email,
      phone: data.phone,
      message: data.message,
      date: data.date,
      status: 'open' as const,
    };
  } catch (error) {
    console.error('createTicket failed:', error);
    throw new Error('Gagal membuat tiket keluhan.', { cause: error });
  }
}

// ---------------------- WIFI PACKAGES REPOSITORY ----------------------

export async function getAllPackages(): Promise<WifiPackage[]> {
  try {
    const rows = await db.select().from(wifiPackages);
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      speed: p.speed,
      price: p.price,
      features: JSON.parse(p.features || '[]'),
      type: p.type as 'home' | 'business',
      popular: p.popular || false,
    }));
  } catch (error) {
    console.error('getAllPackages failed:', error);
    throw new Error('Gagal mengambil daftar paket WiFi.', { cause: error });
  }
}

export async function createPackage(pkg: WifiPackage) {
  try {
    await db.insert(wifiPackages).values({
      id: pkg.id,
      name: pkg.name,
      speed: pkg.speed,
      price: pkg.price,
      features: JSON.stringify(pkg.features),
      type: pkg.type,
      popular: pkg.popular || false,
    });
    return pkg;
  } catch (error) {
    console.error('createPackage failed:', error);
    throw new Error('Gagal menambahkan paket WiFi.', { cause: error });
  }
}

export async function deletePackage(id: string) {
  try {
    await db.delete(wifiPackages).where(eq(wifiPackages.id, id));
    return true;
  } catch (error) {
    console.error('deletePackage failed:', error);
    throw new Error('Gagal menghapus paket WiFi.', { cause: error });
  }
}

// ---------------------- COVERAGE AREAS REPOSITORY ----------------------

export async function getAllCoverage() {
  try {
    const rows = await db.select().from(coverageAreas);
    return rows.map((c) => {
      const kecamatans = JSON.parse(c.data || '[]');
      let totalKel = 0;
      kecamatans.forEach((k: any) => {
        totalKel += (k.kelurahans || []).length;
      });
      return {
        id: c.id,
        cityName: c.cityName,
        regionType: c.regionType,
        totalKecamatan: kecamatans.length,
        totalKelurahan: totalKel,
        kecamatans,
      };
    });
  } catch (error) {
    console.error('getAllCoverage failed:', error);
    throw new Error('Gagal mengambil wilayah cakupan.', { cause: error });
  }
}

export async function createCityCoverage(cityName: string, regionType: string) {
  try {
    await db.insert(coverageAreas).values({
      cityName,
      regionType,
      data: JSON.stringify([]),
    });
    return await getAllCoverage();
  } catch (error) {
    console.error('createCityCoverage failed:', error);
    throw new Error('Gagal menambah kota cakupan.', { cause: error });
  }
}

export async function deleteCityCoverage(cityName: string) {
  try {
    await db.delete(coverageAreas).where(eq(coverageAreas.cityName, cityName));
    return await getAllCoverage();
  } catch (error) {
    console.error('deleteCityCoverage failed:', error);
    throw new Error('Gagal menghapus kota cakupan.', { cause: error });
  }
}

export async function updateCoverageData(cityName: string, kecamatans: any[]) {
  try {
    await db.update(coverageAreas).set({
      data: JSON.stringify(kecamatans),
    }).where(eq(coverageAreas.cityName, cityName));
    return await getAllCoverage();
  } catch (error) {
    console.error('updateCoverageData failed:', error);
    throw new Error('Gagal memperbarui cakupan kecamatan/kelurahan.', { cause: error });
  }
}

// ---------------------- COMPANY SETTINGS REPOSITORY ----------------------

export async function getCompanySettings() {
  try {
    const rows = await db.select().from(companySettings).where(eq(companySettings.id, 'default'));
    if (rows.length === 0) {
      return {
        name: 'Taranet WiFi',
        address: 'Jl. Raya Kebayoran Baru No. 12, Jakarta Selatan, DKI Jakarta 12110',
        logoText: 'TARANET',
        themeColor: '#2563eb',
        logoUrl: '',
        promos: [] as string[],
      };
    }
    const s = rows[0];
    return {
      name: s.name,
      address: s.address,
      logoText: s.logoText,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl || '',
      promos: JSON.parse(s.promos || '[]') as string[],
    };
  } catch (error) {
    console.error('getCompanySettings failed:', error);
    throw new Error('Gagal mengambil pengaturan perusahaan.', { cause: error });
  }
}

export async function updateCompanySettings(data: {
  name?: string;
  address?: string;
  logoText?: string;
  themeColor?: string;
  logoUrl?: string;
  promos?: string[];
}) {
  try {
    const current = await getCompanySettings();
    const updated = {
      name: data.name ?? current.name,
      address: data.address ?? current.address,
      logoText: data.logoText ?? current.logoText,
      themeColor: data.themeColor ?? current.themeColor,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : current.logoUrl,
      promos: data.promos ? JSON.stringify(data.promos) : JSON.stringify(current.promos),
      updatedAt: new Date(),
    };

    await db.insert(companySettings)
      .values({ id: 'default', ...updated })
      .onConflictDoUpdate({
        target: companySettings.id,
        set: updated,
      });

    return await getCompanySettings();
  } catch (error) {
    console.error('updateCompanySettings failed:', error);
    throw new Error('Gagal memperbarui pengaturan perusahaan.', { cause: error });
  }
}

// ---------------------- POSTGRESQL / SUPABASE STATS REPOSITORY ----------------------

export async function getDatabaseMetrics() {
  try {
    const custCount = (await db.select().from(customers)).length;
    const payCount = (await db.select().from(payments)).length;
    const tickCount = (await db.select().from(supportTickets)).length;
    const pkgCount = (await db.select().from(wifiPackages)).length;
    const covCount = (await db.select().from(coverageAreas)).length;

    return {
      engine: 'PostgreSQL / Supabase (Cloud SQL Developer Edition)',
      region: 'asia-southeast1 (Singapore)',
      status: 'Connected & Healthy',
      tables: {
        customers: custCount,
        payments: payCount,
        support_tickets: tickCount,
        wifi_packages: pkgCount,
        coverage_areas: covCount,
      },
      connectionPool: 'pg.Pool (Max 10 active connections)',
      orm: 'Drizzle ORM v0.45+',
      storageType: 'PostgreSQL Relational DB (No Google Sheets / No Google Drive)'
    };
  } catch (error) {
    console.error('getDatabaseMetrics failed:', error);
    throw new Error('Gagal memuat metrik database PostgreSQL.', { cause: error });
  }
}
