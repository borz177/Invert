

import { Product, Transaction, Sale, CashEntry, Supplier, Customer, Employee } from '../types';

/**
 * Если вы развернули фронтенд и бэкенд на одном сервере,
 * API будет доступен по относительному пути /api/data.
 */
const VPS_PUBLIC_IP = '109.73.199.190';

const getApiUrl = () => {
  // 1. Если настроен конкретный IP
  if (VPS_PUBLIC_IP && VPS_PUBLIC_IP !== '109.73.199.190') {
    return `http://${VPS_PUBLIC_IP}:3001/api/data`;
  }
  // 2. Если мы на сервере (производство), используем текущий домен
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Предполагаем, что API проксируется через тот же порт/домен или доступен на 3001
    return `${window.location.protocol}//${window.location.hostname}:3001/api/data`;
  }
  // 3. Локальная разработка без настроенного IP
  return null;
};

const API_URL = getApiUrl();

export const db = {
  async getData(key: string) {
    if (!API_URL) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    }

    try {
      const response = await fetch(`${API_URL}?key=${key}`);
      if (!response.ok) throw new Error('Server error');
      return await response.json();
    } catch (e) {
      console.warn(`API unavailable for ${key}, using local:`, e);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    }
  },

  async saveData(key: string, data: any) {
    // Offline First: сначала в локальное хранилище
    localStorage.setItem(key, JSON.stringify(data));

    if (!API_URL) return;

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data })
      });
    } catch (e) {
      // Тихая ошибка, так как локально данные уже сохранены
      console.debug(`Cloud sync failed for ${key} (Expected if backend not reachable)`);
    }
  }
};
