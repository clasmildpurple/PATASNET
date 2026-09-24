import { relations } from 'drizzle-orm';
import { pgTable, text, integer, boolean, timestamp, serial, doublePrecision } from 'drizzle-orm/pg-core';

// 1. Users table (Firebase Auth / System users)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID or system user ID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('customer'), // 'customer' | 'admin' | 'developer'
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Customers table
export const customers = pgTable('customers', {
  id: text('id').primaryKey(), // e.g. 'TR-1001'
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude').default(-6.2088),
  longitude: doublePrecision('longitude').default(106.8456),
  packageId: text('package_id').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'active' | 'suspended'
  ktpImageUrl: text('ktp_image_url'),
  passwordHash: text('password_hash'),
  createdAt: text('created_at').notNull(),
});

// 3. Payments table
export const payments = pgTable('payments', {
  id: text('id').primaryKey(), // e.g. 'PAY-7001'
  customerId: text('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('unpaid'), // 'unpaid' | 'pending_verification' | 'paid'
  proofOfPaymentUrl: text('proof_of_payment_url'),
  billingPeriod: text('billing_period').notNull(),
  method: text('method'),
  transactionId: text('transaction_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Support Tickets table
export const supportTickets = pgTable('support_tickets', {
  id: text('id').primaryKey(), // e.g. 'TCK-5001'
  customerId: text('customer_id'),
  userName: text('user_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  message: text('message').notNull(),
  date: text('date').notNull(),
  status: text('status').notNull().default('open'), // 'open' | 'resolved'
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. WiFi Packages table
export const wifiPackages = pgTable('wifi_packages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  speed: text('speed').notNull(),
  price: integer('price').notNull(),
  features: text('features').notNull(), // JSON array string
  type: text('type').notNull(), // 'home' | 'business'
  popular: boolean('popular').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Coverage Areas table
export const coverageAreas = pgTable('coverage_areas', {
  id: serial('id').primaryKey(),
  cityName: text('city_name').notNull().unique(),
  regionType: text('region_type').notNull(),
  data: text('data').notNull(), // JSON string representing kecamatans and kelurahans
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Company Settings table
export const companySettings = pgTable('company_settings', {
  id: text('id').primaryKey().default('default'),
  name: text('name').notNull(),
  address: text('address').notNull(),
  logoText: text('logo_text').notNull(),
  themeColor: text('theme_color').notNull(),
  logoUrl: text('logo_url').default(''),
  promos: text('promos').default('[]'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 8. Relations
export const customersRelations = relations(customers, ({ many }) => ({
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
}));
