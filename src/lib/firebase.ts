import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  Unsubscribe,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { CompanySettings, CustomerUser, SupportTicket } from '../types';

let app: FirebaseApp;
let db: Firestore;

try {
  if (getApps().length === 0) {
    app = initializeApp({
      apiKey: firebaseConfigJson.apiKey,
      authDomain: firebaseConfigJson.authDomain,
      projectId: firebaseConfigJson.projectId,
      storageBucket: firebaseConfigJson.storageBucket,
      messagingSenderId: firebaseConfigJson.messagingSenderId,
      appId: firebaseConfigJson.appId,
    });
  } else {
    app = getApp();
  }

  const databaseId = (firebaseConfigJson as any).firestoreDatabaseId;
  db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
} catch (err) {
  console.warn('Firebase initialization warning:', err);
}

export { app, db };

/**
 * Real-time listener for Company & Website settings (Logo, QRIS, Branding)
 * Syncs instantly in the background across all devices and browsers!
 */
export function subscribeToCloudSettings(
  onUpdate: (settings: Partial<CompanySettings>) => void
): Unsubscribe {
  if (!db) return () => {};

  try {
    const settingsDocRef = doc(db, 'settings', 'company');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<CompanySettings>;
          onUpdate(data);
        }
      },
      (error) => {
        console.warn('[Firestore Realtime Settings Warning]:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to cloud settings:', err);
    return () => {};
  }
}

/**
 * Save / broadcast updated settings to all devices in real-time
 */
export async function saveCompanySettingsToCloud(
  settings: Partial<CompanySettings>
): Promise<boolean> {
  if (!db) return false;

  try {
    const settingsDocRef = doc(db, 'settings', 'company');
    const payload = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(settingsDocRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save settings to cloud:', err);
    return false;
  }
}

/**
 * Real-time listener for Customers & Transactions
 * Any registration or payment confirmation syncs to admin in the background!
 */
export function subscribeToCloudCustomers(
  onUpdate: (customers: CustomerUser[]) => void
): Unsubscribe {
  if (!db) return () => {};

  try {
    const customersColRef = collection(db, 'customers');
    const unsubscribe = onSnapshot(
      customersColRef,
      (snapshot) => {
        const list: CustomerUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CustomerUser;
          list.push({
            ...data,
            id: docSnap.id,
            payments: Array.isArray(data.payments) ? data.payments : [],
          });
        });
        if (list.length > 0) {
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('[Firestore Realtime Customers Warning]:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to cloud customers:', err);
    return () => {};
  }
}

/**
 * Save or update customer profile & payments in cloud
 */
export async function saveCustomerToCloud(customer: CustomerUser): Promise<boolean> {
  if (!db || !customer?.id) return false;

  try {
    const custDocRef = doc(db, 'customers', customer.id);
    await setDoc(custDocRef, customer, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save customer to cloud:', err);
    return false;
  }
}

/**
 * Real-time listener for Support Tickets
 */
export function subscribeToCloudTickets(
  onUpdate: (tickets: SupportTicket[]) => void
): Unsubscribe {
  if (!db) return () => {};

  try {
    const ticketsColRef = collection(db, 'tickets');
    const unsubscribe = onSnapshot(
      ticketsColRef,
      (snapshot) => {
        const list: SupportTicket[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as SupportTicket);
        });
        if (list.length > 0) {
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('[Firestore Realtime Tickets Warning]:', error.message);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to cloud tickets:', err);
    return () => {};
  }
}

/**
 * Save support ticket in cloud
 */
export async function saveTicketToCloud(ticket: SupportTicket): Promise<boolean> {
  if (!db || !ticket?.id) return false;

  try {
    const ticketDocRef = doc(db, 'tickets', ticket.id);
    await setDoc(ticketDocRef, ticket, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save ticket to cloud:', err);
    return false;
  }
}
