/**
 * stationCache.js
 *
 * Lightweight IndexedDB helpers for caching station data on the client.
 * Only station list data is stored here — no user/auth/booking data.
 *
 * DB name  : "ev-station-cache"
 * Store    : "stations"
 * Key      : "stations_all"   (single record that holds the full array)
 * TTL      : 5 minutes (matches server-side cache TTL for consistency)
 */

const DB_NAME = "ev-station-cache";
const DB_VERSION = 1;
const STORE_NAME = "stations";
const CACHE_KEY = "stations_all";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Open (or create) the database ────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "cacheKey" });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// ── Read cached stations ──────────────────────────────────────────────────────
/**
 * Returns the cached station array if it exists and is still fresh.
 * Returns null if there is no cache entry or the entry is stale.
 */
export async function getStationsFromIDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          console.log("[stationCache] IDB miss: no cache entry.");
          return resolve(null);
        }
        const age = Date.now() - record.fetchedAt;
        if (age > CACHE_TTL_MS) {
          console.log(`[stationCache] IDB stale: ${Math.round(age / 1000)}s old.`);
          return resolve(null);
        }
        console.log(`[stationCache] IDB hit: ${record.stations.length} stations, ${Math.round(age / 1000)}s old.`);
        resolve(record.stations);
      };
      request.onerror = () => {
        console.warn("[stationCache] IDB read error:", request.error);
        resolve(null); // fail gracefully — fall through to API
      };
    });
  } catch (err) {
    console.warn("[stationCache] openDB error:", err);
    return null;
  }
}

// ── Write stations to cache ───────────────────────────────────────────────────
/**
 * Persists the station array into IndexedDB with a timestamp.
 * Silent on failure — cache write errors must never crash the app.
 */
export async function saveStationsToIDB(stations) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({
        cacheKey: CACHE_KEY,
        stations,
        fetchedAt: Date.now(),
      });

      request.onsuccess = () => {
        console.log(`[stationCache] Saved ${stations.length} stations to IDB.`);
        resolve();
      };
      request.onerror = () => {
        console.warn("[stationCache] IDB write error:", request.error);
        resolve(); // fail gracefully
      };
    });
  } catch (err) {
    console.warn("[stationCache] openDB error on write:", err);
  }
}

// ── Clear cache (utility, not required for core flow) ────────────────────────
export async function clearStationsIDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(CACHE_KEY);
    console.log("[stationCache] IDB cache cleared.");
  } catch (err) {
    console.warn("[stationCache] clear error:", err);
  }
}
