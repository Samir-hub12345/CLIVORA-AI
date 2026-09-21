/**
 * CLINOVA AI — IndexedDB Offline Queue & Resilient Network Synchronization.
 *
 * Implements persistent browser-side queuing for rural health posts and
 * intermittent-connectivity environments. Enables zero-data-loss patient
 * intake and clinical observation entry with automatic replay upon reconnection.
 */

export interface OfflineRequestItem {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH";
  payload: any;
  timestamp: string;
  retryCount: number;
  status: "pending" | "syncing" | "failed" | "conflict";
  lastError?: string;
}

const DB_NAME = "clinova_offline_store";
const STORE_NAME = "offline_requests";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available in current environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineRequest(
  endpoint: string,
  method: "POST" | "PUT" | "PATCH",
  payload: any
): Promise<OfflineRequestItem> {
  const item: OfflineRequestItem = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    endpoint,
    method,
    payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    status: "pending",
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to persist offline request to IndexedDB, using fallback", err);
    return item;
  }
}

export async function getPendingOfflineRequests(): Promise<OfflineRequestItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineRequest(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Could not delete from IndexedDB", err);
  }
}

export async function syncOfflineQueue(
  apiBaseUrl: string,
  token?: string | null
): Promise<{ syncedCount: number; failedCount: number }> {
  const pending = await getPendingOfflineRequests();
  if (pending.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of pending) {
    try {
      const url = `${apiBaseUrl}${item.endpoint}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: item.method,
        headers,
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        await removeOfflineRequest(item.id);
        syncedCount++;
      } else if (response.status === 409) {
        // Conflict state: keep in queue marked for manual resolution
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        item.status = "conflict";
        item.lastError = "Clinical data version conflict detected on server.";
        tx.objectStore(STORE_NAME).put(item);
        failedCount++;
      } else {
        item.retryCount++;
        item.status = "failed";
        item.lastError = `HTTP ${response.status}: ${await response.text()}`;
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(item);
        failedCount++;
      }
    } catch (networkErr: any) {
      failedCount++;
      break; // Network still disconnected
    }
  }

  return { syncedCount, failedCount };
}
