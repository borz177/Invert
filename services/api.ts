

import { Product, Transaction, Sale, CashEntry, Supplier, Customer, Employee } from '../types';

/**
 * ВНИМАНИЕ: Если вы используете домен с HTTPS, API тоже должен быть доступен по HTTPS.
 * Если IP не указан, приложение пытается использовать текущий адрес хоста.
 */
const VPS_PUBLIC_IP = '109.73.199.190';

const getApiUrl = () => {
  // Если работаем локально
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (VPS_PUBLIC_IP && VPS_PUBLIC_IP !== '109.73.199.190') {
      return `http://${VPS_PUBLIC_IP}:3001/api/data`;
    }
    return `http://localhost:3001/api/data`;
  }

  // Если на сервере - используем тот же протокол и хост, но порт 3001
  // (Либо настройте проксирование в nginx с /api на порт 3001)
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return `${protocol}//${host}:3001/api/data`;
};

const API_URL = getApiUrl();

export const db = {
  async getData(key: string) {
    if (!API_URL) return JSON.parse(localStorage.getItem(key) || '[]');

    try {
      const response = await fetch(`${API_URL}?key=${key}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const serverData = await response.json();

      // Синхронизируем локальное хранилище с сервером
      if (serverData) {
        localStorage.setItem(key, JSON.stringify(serverData));
        return serverData;
      }
      return [];
    } catch (e) {
      console.warn(`[DB] Ошибка загрузки ${key} с сервера, берем из кэша:`, e);
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
  },

  async saveData(key: string, data: any) {
    // 1. Сначала локально (всегда доступно)
    localStorage.setItem(key, JSON.stringify(data));

    if (!API_URL) return;

    // 2. Отправка в облако
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (e) {
      console.error(`[DB] Ошибка облачной синхронизации для ${key}:`, e);
      // Не бросаем ошибку дальше, чтобы не блокировать UI,
      // так как локально данные уже сохранены
    }
  }
};
