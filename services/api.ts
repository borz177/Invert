
import { Product, Transaction, Sale, CashEntry, Supplier, Customer, Employee, User, AppSettings } from '../types';

const getApiUrl = () => {
  const { protocol, hostname, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('preview') || hostname.includes('webcontainer')) {
    if (port !== '3001') {
      return `${protocol}//${hostname}:3001/api`;
    }
  }
  return '/api';
};

const API_BASE = getApiUrl();
const REQUEST_TIMEOUT = 8000;

async function fetchWithTimeout(url: string, options: any = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export const db = {
  auth: {
    async register(email: string, password: string, name: string, role: string): Promise<User> {
      const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка регистрации');
      return data;
    },
    async login(email: string, password: string): Promise<User & { ownerId?: string }> {
      const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка входа');
      return data;
    },
    async updateProfile(userId: string, name: string, currentPassword?: string, newPassword?: string): Promise<User> {
      const res = await fetchWithTimeout(`${API_BASE}/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка обновления профиля');
      return data;
    }
  },

  shops: {
    async search(query: string): Promise<any[]> {
      const res = await fetchWithTimeout(`${API_BASE}/shops/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!res.ok) return [];
      return await res.json();
    }
  },

  async getData(key: string) {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return null;
    const user: User & { ownerId?: string } = JSON.parse(userJson);
    const targetUserId = user.ownerId || user.id;

    try {
      const response = await fetchWithTimeout(`${API_BASE}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ key, user_id: targetUserId })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      localStorage.setItem(`cache_${targetUserId}_${key}`, JSON.stringify(data));
      return data;
    } catch (e) {
      const local = localStorage.getItem(`cache_${targetUserId}_${key}`);
      return local ? JSON.parse(local) : null;
    }
  },

  // Получение данных из контекста ЧУЖОГО магазина (для клиентов)
  async getDataOfShop(shopOwnerId: string, key: string) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, user_id: shopOwnerId })
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    }
  },

  async saveDataOfShop(shopOwnerId: string, key: string, data: any) {
     try {
      await fetchWithTimeout(`${API_BASE}/data/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, user_id: shopOwnerId })
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async saveData(key: string, data: any) {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return false;
    const user: User & { ownerId?: string } = JSON.parse(userJson);
    const targetUserId = user.ownerId || user.id;

    localStorage.setItem(`cache_${targetUserId}_${key}`, JSON.stringify(data));

    try {
      const response = await fetchWithTimeout(`${API_BASE}/data/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, user_id: targetUserId })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};
