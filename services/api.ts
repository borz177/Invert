// services/api.ts
import { Product, Transaction, Sale, CashEntry, Supplier, Customer, Employee } from '../types';

/**
 * В продакшене все API-запросы идут через тот же домен (без указания порта),
 * потому что Nginx проксирует /api → localhost:3001.
 */
const getApiUrl = () => {
  const { protocol, hostname } = window.location;

  // Для локальной разработки
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3001/api/data`;
  }

  // Для продакшена — используем относительный путь
  return '/api/data';
};

const API_URL = getApiUrl();

export const db = {
  async getData(key: string) {
    try {
      const response = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn(`[Sync] Ошибка загрузки ${key}. Используем кэш.`, e);
      const local = localStorage.getItem(key);
      return local ? JSON.parse(local) : null;
    }
  },

  async saveData(key: string, data: any) {
    // Сначала сохраняем локально
    localStorage.setItem(key, JSON.stringify(data));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key, data })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (e) {
      console.error(`[Sync] Ошибка сохранения ${key}:`, e);
      return false;
    }
  }
};