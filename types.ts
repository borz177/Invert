
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'кассир' | 'менеджер' | 'кладовщик' | 'управляющий' | 'client';
  ownerId?: string;
  permissions?: any;
  linkedShopIds?: string[]; // Для клиентов: список ID магазинов
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
  category: string;
  minStock: number;
  unit: 'шт' | 'кг' | 'упак' | 'ящик' | 'л' | 'мл';
  image?: string;
  type?: 'PRODUCT' | 'SERVICE'; // PRODUCT - списывается со склада, SERVICE - нет
  description?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  debt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  discount?: number;
  debt: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: 'NEW' | 'ACCEPTED' | 'CONFIRMED' | 'CANCELLED';
  date: string;
  note?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'DEBT';
}

export interface Employee {
  id: string;
  name: string;
  role: 'кассир' | 'менеджер' | 'кладовщик' | 'управляющий';
  login: string;
  password: string;
  salary: number;
  revenuePercent: number;
  profitPercent: number;
  permissions: {
    canEditProduct: boolean;
    canCreateProduct: boolean;
    canDeleteProduct: boolean;
    canShowCost: boolean;
  };
}

export type TransactionType = 'IN' | 'OUT' | 'SALE' | 'ADJUSTMENT';

export interface Transaction {
  id: string;
  productId: string;
  supplierId?: string;
  type: TransactionType;
  quantity: number;
  date: string;
  note: string;
  employeeId: string;
  pricePerUnit?: number;
  paymentMethod?: 'CASH' | 'DEBT';
  isDeleted?: boolean;
  batchId?: string; // ID документа прихода для группировки
}

export interface Sale {
  id: string;
  employeeId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    cost: number;
  }>;
  total: number;
  paymentMethod: 'CASH' | 'CARD' | 'DEBT';
  date: string;
  isDeleted?: boolean;
  customerId?: string;
}

export interface CashEntry {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  description: string;
  employeeId: string;
  customerId?: string;
  supplierId?: string;
}

export interface AppSettings {
  shopName: string;
  currency: string;
  lowStockThreshold: number;
  darkMode: boolean;
  isPublic?: boolean; // Виден ли магазин в поиске
  showProductsToClients?: boolean;// Видны ли товары клиентам

}

export type AppView =
  | 'DASHBOARD'
  | 'PRODUCTS'
  | 'WAREHOUSE'
  | 'SALES'
  | 'CASHBOX'
  | 'REPORTS'
  | 'ALL_OPERATIONS'
  | 'SUPPLIERS'
  | 'CLIENTS'
  | 'EMPLOYEES'
  | 'PRICE_LIST'
  | 'STOCK_REPORT'
  | 'PROFILE'
  | 'SETTINGS'
  | 'MORE_MENU'
  | 'TENANT_ADMIN'
  | 'CLIENT_PORTAL'
  | 'ORDERS_MANAGER'
  | 'TARIFFS';
