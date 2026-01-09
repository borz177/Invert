
import React from 'react';
import { Product, Sale, CashEntry, Customer, Supplier } from '../types';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  cashEntries: CashEntry[];
  customers: Customer[];
  suppliers: Supplier[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, sales, cashEntries, customers, suppliers }) => {
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.date.startsWith(today) && !s.isDeleted);
  const totalSalesToday = todaySales.reduce((acc, s) => acc + s.total, 0);
  const lowStock = products.filter(p => p.quantity <= p.minStock);
  const cashBalance = cashEntries.reduce((acc, e) => acc + (e.type === 'INCOME' ? e.amount : -e.amount), 0);
  const totalDebtFromClients = customers.reduce((acc, c) => acc + (c.debt || 0), 0);
  const totalDebtToSuppliers = suppliers.reduce((acc, s) => acc + (s.debt || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Обзор за сегодня</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600"><i className="fas fa-wallet fa-lg"></i></div>
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Продажи сегодня</p><p className="text-2xl font-black text-slate-800">{totalSalesToday.toLocaleString()} ₽</p></div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600"><i className="fas fa-cash-register fa-lg"></i></div>
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">В кассе</p><p className="text-2xl font-black text-slate-800">{cashBalance.toLocaleString()} ₽</p></div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-red-100 p-3 rounded-2xl text-red-600"><i className="fas fa-hand-holding-usd fa-lg"></i></div>
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Нам должны</p><p className="text-2xl font-black text-red-600">{totalDebtFromClients.toLocaleString()} ₽</p></div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><i className="fas fa-file-invoice-dollar fa-lg"></i></div>
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Мы должны</p><p className="text-2xl font-black text-orange-600">{totalDebtToSuppliers.toLocaleString()} ₽</p></div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-slate-100 p-3 rounded-2xl text-slate-600"><i className="fas fa-exclamation-triangle fa-lg"></i></div>
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Мало на складе</p><p className="text-2xl font-black text-slate-800">{lowStock.length} поз.</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800"><i className="fas fa-clock text-slate-400"></i> Последние продажи</h3>
          <div className="space-y-3">
            {sales.filter(s => !s.isDeleted).slice(0, 5).map(sale => (
              <div key={sale.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm font-medium">Чек №{sale.id.slice(-4)}</span>
                <span className="text-slate-400 text-[10px] font-bold">{new Date(sale.date).toLocaleTimeString()}</span>
                <span className="font-black text-slate-800">{sale.total.toLocaleString()} ₽</span>
              </div>
            ))}
            {sales.filter(s => !s.isDeleted).length === 0 && <p className="text-slate-400 text-sm text-center py-4">Нет продаж за сегодня</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100">
          <h3 className="font-bold mb-4 text-orange-600 flex items-center gap-2"><i className="fas fa-warehouse text-orange-400"></i> Критические остатки</h3>
          <div className="space-y-3">
            {lowStock.slice(0, 5).map(product => (
              <div key={product.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm font-medium">{product.name}</span>
                <span className="text-red-600 font-black bg-red-50 px-2 py-0.5 rounded-lg text-xs">{product.quantity} {product.unit}</span>
              </div>
            ))}
            {lowStock.length === 0 && <p className="text-emerald-500 text-sm text-center py-4 font-bold">Склад в порядке!</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
