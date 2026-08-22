import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocFromServer,
  getDocs,
  type Unsubscribe,
  type Firestore
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';
import { Order } from '../types';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

try {
  if (isFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
} catch (error) {
  console.warn('Firebase initialization error, falling back to local mode:', error);
}

export const db: Firestore | null = dbInstance;
export const ORDERS_COLLECTION = 'orders';
const LOCAL_STORAGE_ORDERS_KEY = 'dynamic_order_tracker_data_v1';

// LocalStorage Helper functions for offline / standalone mode
function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local orders:', e);
  }
  return [];
}

function saveLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving local orders:', e);
  }
}

/**
 * Validates connection to Firestore on initial boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      console.warn('Firestore client is offline or starting up.');
      return false;
    }
    // If test doc doesn't exist, it still means server connected
    return true;
  }
}

/**
 * Ensures sample orders are seeded if database or local storage is empty
 */
export async function initializeCloudDatabase(sampleOrders: Order[]): Promise<void> {
  const initKey = 'dynamic_order_tracker_initialized_v2';
  if (localStorage.getItem(initKey)) {
    return;
  }

  // If no Firestore db, seed to localStorage
  if (!db) {
    const local = getLocalOrders();
    if (local.length === 0) {
      saveLocalOrders(sampleOrders);
    }
    localStorage.setItem(initKey, 'true');
    return;
  }

  try {
    const initDocRef = doc(db, 'test', 'connection');
    const initDoc = await getDocFromServer(initDocRef).catch(() => null);

    // Check if orders collection already has records
    const ordersSnap = await getDocs(collection(db, ORDERS_COLLECTION)).catch(() => null);
    if (ordersSnap && !ordersSnap.empty) {
      localStorage.setItem(initKey, 'true');
      return;
    }

    // Check if test doc exists with initialized flag
    if (initDoc && initDoc.exists() && initDoc.data()?.seeded) {
      localStorage.setItem(initKey, 'true');
      return;
    }

    // First time setup on empty database: seed samples
    await bulkUploadOrdersToCloud(sampleOrders);
    await setDoc(initDocRef, { seeded: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    localStorage.setItem(initKey, 'true');
  } catch (err) {
    console.warn('Initial cloud database check warning:', err);
    // Fallback to local sample orders
    const local = getLocalOrders();
    if (local.length === 0) {
      saveLocalOrders(sampleOrders);
    }
    localStorage.setItem(initKey, 'true');
  }
}

/**
 * Subscribes to real-time updates from Cloud Firestore or falls back to localStorage
 */
export function subscribeToOrders(
  onOrdersChange: (orders: Order[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db) {
    // Deliver initial local data
    const local = getLocalOrders();
    onOrdersChange(local);

    // Listen for storage events (e.g. multi-tab sync)
    const storageHandler = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_ORDERS_KEY) {
        onOrdersChange(getLocalOrders());
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener('storage', storageHandler);
    };
  }

  const ordersRef = collection(db, ORDERS_COLLECTION);
  
  return onSnapshot(
    ordersRef,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Order;
        ordersList.push({
          ...data,
          id: docSnap.id || data.id,
        });
      });
      // Save local cache
      saveLocalOrders(ordersList);
      onOrdersChange(ordersList);
    },
    (error) => {
      console.warn('Błąd synchronizacji Firestore (przełączono na dane lokalne):', error);
      onOrdersChange(getLocalOrders());
      if (onError) onError(error);
    }
  );
}

/**
 * Save / Update a single order in Cloud Firestore (or localStorage fallback)
 */
export async function saveOrderToCloud(order: Order): Promise<void> {
  // Always update local cache
  const local = getLocalOrders();
  const existingIdx = local.findIndex((o) => o.id === order.id);
  let updatedLocal: Order[];
  if (existingIdx >= 0) {
    updatedLocal = [...local];
    updatedLocal[existingIdx] = order;
  } else {
    updatedLocal = [order, ...local];
  }
  saveLocalOrders(updatedLocal);

  if (db) {
    try {
      const orderDocRef = doc(db, ORDERS_COLLECTION, order.id);
      const cleanData = JSON.parse(JSON.stringify(order));
      await setDoc(orderDocRef, cleanData, { merge: true });
    } catch (error) {
      console.warn('Błąd zapisu zamówienia w Firestore (zapisano lokalnie):', error);
    }
  }
}

/**
 * Delete a single order from Cloud Firestore (or localStorage fallback)
 */
export async function deleteOrderFromCloud(orderId: string): Promise<void> {
  const local = getLocalOrders();
  const updatedLocal = local.filter((o) => o.id !== orderId);
  saveLocalOrders(updatedLocal);

  if (db) {
    try {
      const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
      await deleteDoc(orderDocRef);
    } catch (error) {
      console.warn('Błąd usuwania zamówienia z Firestore (usunięto lokalnie):', error);
    }
  }
}

/**
 * Batch upload / sync all orders to Cloud Firestore (or localStorage fallback)
 */
export async function bulkUploadOrdersToCloud(orders: Order[]): Promise<void> {
  saveLocalOrders(orders);

  if (db) {
    try {
      const batch = writeBatch(db);
      orders.forEach((order) => {
        const orderDocRef = doc(db, ORDERS_COLLECTION, order.id);
        const cleanData = JSON.parse(JSON.stringify(order));
        batch.set(orderDocRef, cleanData, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      console.warn('Błąd zbiorczego zapisu w Firestore (zapisano lokalnie):', error);
    }
  }
}

/**
 * Batch delete multiple orders from Cloud Firestore (or localStorage fallback)
 */
export async function bulkDeleteOrdersFromCloud(orderIds: string[]): Promise<void> {
  const local = getLocalOrders();
  const set = new Set(orderIds);
  const updatedLocal = local.filter((o) => !set.has(o.id));
  saveLocalOrders(updatedLocal);

  if (db) {
    try {
      const batch = writeBatch(db);
      orderIds.forEach((id) => {
        const orderDocRef = doc(db, ORDERS_COLLECTION, id);
        batch.delete(orderDocRef);
      });
      await batch.commit();
    } catch (error) {
      console.warn('Błąd zbiorczego usuwania z Firestore (usunięto lokalnie):', error);
    }
  }
}
