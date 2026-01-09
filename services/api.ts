
import { Product, Transaction, Sale, CashEntry, Supplier, Customer, Employee } from '../types';

/**
 * ВНИМАНИЕ: Замените 'ВАШ_IP_АДРЕС' на реальный IP вашего сервера Timeweb.
 * Вы найдете его в панели управления Timeweb Cloud (вкладка Дашборд или Сеть).
 */
const VPS_PUBLIC_IP = '109.73.199.190';
const API_URL = `http://${VPS_PUBLIC_IP}:3001/api/data`; 

export const db = {
  async getData(key: string) {
    try {
      const response = await fetch(`${API_URL}?key=${key}`);
      if (!response.ok) throw new Error('Server error');
      return await response.json();
    } catch (e) {
      console.warn(`Fallback to local for ${key}:`, e);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    }
  },

  async saveData(key: string, data: any) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data })
      });
      if (!response.ok) throw new Error('Save failed');
    } catch (e) {
      console.error(`Save error ${key}:`, e);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }
};
