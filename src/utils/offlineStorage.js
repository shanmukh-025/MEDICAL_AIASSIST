// Offline Storage using IndexedDB for rural offline-first experience
const DB_NAME = 'MediVillageDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  RECORDS: 'healthRecords',
  APPOINTMENTS: 'appointments',
  FAMILY: 'familyMembers',
  WELLNESS: 'wellnessTips',
  CACHE: 'apiCache'
};

class OfflineStorage {
  constructor() {
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.RECORDS)) {
          db.createObjectStore(STORES.RECORDS, { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains(STORES.APPOINTMENTS)) {
          db.createObjectStore(STORES.APPOINTMENTS, { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains(STORES.FAMILY)) {
          db.createObjectStore(STORES.FAMILY, { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains(STORES.WELLNESS)) {
          db.createObjectStore(STORES.WELLNESS, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Generic save method
  async save(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Handle array of items
      if (Array.isArray(data)) {
        // Clear existing data first
        store.clear();
        data.forEach(item => store.put(item));
      } else {
        store.put(data);
      }

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Generic get all method
  async getAll(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic get by ID method
  async getById(storeName, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete item
  async delete(storeName, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache API response with timestamp
  async cacheAPIResponse(endpoint, data) {
    if (!this.db) await this.init();

    const cacheEntry = {
      key: endpoint,
      data: data,
      timestamp: Date.now()
    };

    return this.save(STORES.CACHE, cacheEntry);
  }

  // Get cached API response
  async getCachedAPIResponse(endpoint, maxAge = 24 * 60 * 60 * 1000) { // Default 24 hours
    if (!this.db) await this.init();

    const cached = await this.getById(STORES.CACHE, endpoint);
    
    if (!cached) return null;

    // Check if cache is still valid
    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      await this.delete(STORES.CACHE, endpoint);
      return null;
    }

    return cached.data;
  }

  // Specific methods for common operations
  async saveRecords(records) {
    return this.save(STORES.RECORDS, records);
  }

  async getRecords() {
    return this.getAll(STORES.RECORDS);
  }

  async saveAppointments(appointments) {
    return this.save(STORES.APPOINTMENTS, appointments);
  }

  async getAppointments() {
    return this.getAll(STORES.APPOINTMENTS);
  }

  async saveFamilyMembers(members) {
    return this.save(STORES.FAMILY, members);
  }

  async getFamilyMembers() {
    return this.getAll(STORES.FAMILY);
  }

  // Clear all offline data
  async clearAll() {
    if (!this.db) await this.init();

    const stores = Object.values(STORES);
    const transaction = this.db.transaction(stores, 'readwrite');
    
    stores.forEach(storeName => {
      transaction.objectStore(storeName).clear();
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export singleton instance
const offlineStorage = new OfflineStorage();
export default offlineStorage;
