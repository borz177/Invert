// services/api.ts
import { User } from '../types';

/**
 * Определяем базовый URL API
 */
const getApiUrl = () => {
  const { protocol, hostname, port } = window.location;

  // Локальная разработка
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return port !== '3001'
      ? `${protocol}//${hostname}:3001/api`
      : `${protocol}//${hostname}:${port}/api`;
  }

  // Продакшен — используем относительный путь
  return '/api';
};

const API_BASE = getApiUrl();

/**
 * Функция fetch с таймаутом
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 секунд

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Экспортируем объект db
 */
export const db = {
  auth: {
    async register(email: string, password: string, name: string): Promise<User> {
      const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async login(email: string, password: string): Promise<User> {
      const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  },

  async getData(key: string) {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return null;
    const user: User = JSON.parse(userJson);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, user_id: user.id })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      localStorage.setItem(`cache_${user.id}_${key}`, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn(`[Sync] Error loading ${key}:`, e);
      const local = localStorage.getItem(`cache_${user.id}_${key}`);
      return local ? JSON.parse(local) : null;
    }
  },

  async saveData(key: string, data: any) {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return false;
    const user: User = JSON.parse(userJson);

    localStorage.setItem(`cache_${user.id}_${key}`, JSON.stringify(data));

    try {
      const response = await fetchWithTimeout(`${API_BASE}/data/save`, { // ← ИСПРАВЛЕНО
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, user_id: user.id })
      });
      return response.ok;
    } catch (e) { // ← УДАЛЕНА ЛИШНЯЯ БУКВА "a"
      return false;
    }
  }
};