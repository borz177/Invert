
import React, { useState } from 'react';
import { Product, Sale, CashEntry, Customer, Supplier } from '../types';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  cashEntries: CashEntry[];
  customers: Customer[];
  suppliers: Supplier[];
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ products, sales, cashEntries, customers, suppliers, onNavigate }) => {
  const [activeModal, setActiveModal] = useState<'SALES_DETAIL' | 'DEBT_CLIENTS' | 'DEBT_SUPPLIERS' | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.date.startsWith(today) && !s.isDeleted);
  const totalSalesToday = todaySales.reduce((acc, s) => acc + s.total, 0);

  // Расчет прибыли за сегодня
  const totalProfitToday = todaySales.reduce((acc, sale) => {
    const saleProfit = sale.items.reduce((pAcc, item) => pAcc + (item.price - item.cost) * item.quantity, 0);
    return acc + saleProfit;
  }, 0);

  const lowStock = products.filter(p => p.quantity <= p.minStock);
  const cashBalance = cashEntries.reduce((acc, e) => acc + (e.type === 'INCOME' ? e.amount : -e.amount), 0);
  const totalDebtFromClients = customers.reduce((acc, c) => acc + (c.debt || 0), 0);
  const totalDebtToSuppliers = suppliers.reduce((acc, s) => acc + (s.debt || 0), 0);

  // Группировка проданных товаров за сегодня
  const soldProductsToday = todaySales.reduce((acc: any[], sale) => {
    sale.items.forEach(item => {
      const existing = acc.find(x => x.productId === item.productId);
      const prod = products.find(p => p.id === item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.price * item.quantity;
        existing.profit += (item.price - item.cost) * item.quantity;
      } else {
        acc.push({
          productId: item.productId,
          name: prod?.name || '---',
          quantity: item.quantity,
          unit: prod?.unit || 'шт',
          total: item.price * item.quantity,
          profit: (item.price - item.cost) * item.quantity
        });
      }
    });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-slate-800">Обзор за сегодня</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Продажи сегодня */}
        <button
          onClick={() => setActiveModal('SALES_DETAIL')}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center space-x-4 text-left active:scale-95 transition-all"
        >
          <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600"><i className="fas fa-shopping-basket fa-lg"></i></div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Продажи сегодня</p>
            <p className="text-2xl font-black text-slate-800">{totalSalesToday.toLocaleString()} ₽</p>
          </div>
        </button>

        {/* В кассе */}
        <button
          onClick={() => onNavigate('CASHBOX')}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center space-x-4 text-left active:scale-95 transition-all"
        >
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600"><i className="fas fa-cash-register fa-lg"></i></div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">В кассе</p>
            <p className="text-2xl font-black text-slate-800">{cashBalance.toLocaleString()} ₽</p>
          </div>
        </button>

        {/* Нам должны */}
        <button
          onClick={() => setActiveModal('DEBT_CLIENTS')}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center space-x-4 text-left active:scale-95 transition-all"
        >
          <div className="bg-red-100 p-3 rounded-2xl text-red-600"><i className="fas fa-hand-holding-usd fa-lg"></i></div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Нам должны</p>
            <p className="text-2xl font-black text-red-600">{totalDebtFromClients.toLocaleString()} ₽</p>
          </div>
        </button>

        {/* Мы должны */}
        <button
          onClick={() => setActiveModal('DEBT_SUPPLIERS')}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center space-x-4 text-left active:scale-95 transition-all"
        >
          <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><i className="fas fa-file-invoice-dollar fa-lg"></i></div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Мы должны</p>
            <p className="text-2xl font-black text-orange-600">{totalDebtToSuppliers.toLocaleString()} ₽</p>
          </div>
        </button>

        {/* Мало на складе */}
        <button
          onClick={() => onNavigate('STOCK_REPORT')}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center space-x-4 text-left active:scale-95 transition-all"
        >
          <div className="bg-slate-100 p-3 rounded-2xl text-slate-600"><i className="fas fa-exclamation-triangle fa-lg"></i></div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Мало на складе</p>
            <p className="text-2xl font-black text-slate-800">{lowStock.length} поз.</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
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

      {/* Модальные окна обзора */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-6 flex flex-col max-h-[90vh] animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  {activeModal === 'SALES_DETAIL' && 'Обзор продаж сегодня'}
                  {activeModal === 'DEBT_CLIENTS' && 'Должники (Клиенты)'}
                  {activeModal === 'DEBT_SUPPLIERS' && 'Наши долги (Поставщикам)'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Детализированный отчет</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center active:bg-slate-100 transition-colors"><i className="fas fa-times text-xl"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-4">
              {activeModal === 'SALES_DETAIL' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Чистая прибыль</p>
                      <p className="text-3xl font-black text-indigo-600">{totalProfitToday.toLocaleString()} ₽</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Выручка</p>
                      <p className="text-lg font-bold text-indigo-400">{totalSalesToday.toLocaleString()} ₽</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Проданные товары</p>
                    {soldProductsToday.map((p: any) => (
                      <div key={p.productId} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                        <div className="flex-1 pr-4">
                          <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{p.quantity} {p.unit} • Сумма: {p.total.toLocaleString()} ₽</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-600">+{p.profit.toLocaleString()} ₽</p>
                          <p className="text-[8px] text-slate-300 font-bold uppercase">Прибыль</p>
                        </div>
                      </div>
                    ))}
                    {soldProductsToday.length === 0 && <p className="text-center py-10 text-slate-300 italic">Продаж еще не было</p>}
                  </div>
                </div>
              )}

              {activeModal === 'DEBT_CLIENTS' && (
                <div className="space-y-2">
                  <div className="bg-red-50 p-5 rounded-3xl border border-red-100 text-center mb-4">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Итого нам должны</p>
                    <p className="text-3xl font-black text-red-500">{totalDebtFromClients.toLocaleString()} ₽</p>
                  </div>
                  {customers.filter(c => (c.debt || 0) > 0).map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{c.phone || 'Без телефона'}</p>
                      </div>
                      <p className="text-lg font-black text-red-500">{c.debt.toLocaleString()} ₽</p>
                    </div>
                  ))}
                  {customers.filter(c => (c.debt || 0) > 0).length === 0 && <p className="text-center py-10 text-slate-300 italic text-sm">Должников нет!</p>}
                </div>
              )}

              {activeModal === 'DEBT_SUPPLIERS' && (
                <div className="space-y-2">
                  <div className="bg-orange-50 p-5 rounded-3xl border border-orange-100 text-center mb-4">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Итого наш долг</p>
                    <p className="text-3xl font-black text-orange-500">{totalDebtToSuppliers.toLocaleString()} ₽</p>
                  </div>
                  {suppliers.filter(s => (s.debt || 0) > 0).map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{s.phone || 'Без телефона'}</p>
                      </div>
                      <p className="text-lg font-black text-orange-500">{s.debt.toLocaleString()} ₽</p>
                    </div>
                  ))}
                  {suppliers.filter(s => (s.debt || 0) > 0).length === 0 && <p className="text-center py-10 text-slate-300 italic text-sm">У нас нет долгов!</p>}
                </div>
              )}
            </div>

            <button onClick={() => setActiveModal(null)} className="mt-2 w-full bg-slate-800 text-white p-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-100">Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
