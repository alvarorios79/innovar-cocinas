import { useEffect, useState, useCallback } from 'react';

const DB_NAME = 'innovar-offline';
const DB_VERSION = 1;

interface StorageItem {
  key: string;
  data: any;
  timestamp: number;
  type: 'project' | 'quotation' | 'client' | 'task' | 'note';
}

class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Crear object stores
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('quotations')) {
          db.createObjectStore('quotations', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async save(key: string, data: any, type: StorageItem['type']): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);

      const item: StorageItem = {
        key,
        data,
        timestamp: Date.now(),
        type,
      };

      const request = store.put(item);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(key: string, type: StorageItem['type']): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readonly');
      const store = transaction.objectStore(type);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  }

  async getAll(type: StorageItem['type']): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readonly');
      const store = transaction.objectStore(type);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result;
        resolve(results.map((item: StorageItem) => item.data));
      };
    });
  }

  async delete(key: string, type: StorageItem['type']): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(type: StorageItem['type']): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addToSyncQueue(action: string, data: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      const request = store.add({
        action,
        data,
        timestamp: Date.now(),
        synced: false,
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSyncQueue(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearSyncQueue(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const storageManager = new OfflineStorageManager();

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveProject = useCallback(
    async (key: string, data: any) => {
      await storageManager.save(key, data, 'project');
    },
    []
  );

  const getProject = useCallback(async (key: string) => {
    return storageManager.get(key, 'project');
  }, []);

  const getAllProjects = useCallback(async () => {
    return storageManager.getAll('project');
  }, []);

  const saveQuotation = useCallback(
    async (key: string, data: any) => {
      await storageManager.save(key, data, 'quotation');
    },
    []
  );

  const getQuotation = useCallback(async (key: string) => {
    return storageManager.get(key, 'quotation');
  }, []);

  const getAllQuotations = useCallback(async () => {
    return storageManager.getAll('quotation');
  }, []);

  const saveNote = useCallback(
    async (key: string, data: any) => {
      await storageManager.save(key, data, 'note');
    },
    []
  );

  const getNote = useCallback(async (key: string) => {
    return storageManager.get(key, 'note');
  }, []);

  const getAllNotes = useCallback(async () => {
    return storageManager.getAll('note');
  }, []);

  const addToSyncQueue = useCallback(async (action: string, data: any) => {
    await storageManager.addToSyncQueue(action, data);
  }, []);

  const getSyncQueue = useCallback(async () => {
    return storageManager.getSyncQueue();
  }, []);

  const clearSyncQueue = useCallback(async () => {
    await storageManager.clearSyncQueue();
  }, []);

  return {
    isOnline,
    isSyncing,
    saveProject,
    getProject,
    getAllProjects,
    saveQuotation,
    getQuotation,
    getAllQuotations,
    saveNote,
    getNote,
    getAllNotes,
    addToSyncQueue,
    getSyncQueue,
    clearSyncQueue,
  };
}
