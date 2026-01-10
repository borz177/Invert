
import React, { useState } from 'react';
import { Order, Customer, Product } from '../types';

interface OrdersManagerProps {
  orders: Order[];
  customers: Customer[];
  products: Product[];
  onUpdateOrder: (order: Order) => void;
  onConfirmOrder: (order: Order) => void;
}

const OrdersManager: React.FC<OrdersManagerProps> = ({ orders, customers, products, onUpdateOrder, onConfirmOrder }) => {
  const [filter, setFilter] = useState<'ALL' | 'NEW' | 'CONFIRMED' | 'CANCELLED'>('NEW');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(o => filter === 'ALL' || o.status === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Неизвестный клиент';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-slate-800">Заказы клиентов</h2>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {(['ALL', 'NEW', 'CONFIRMED', 'CANCELLED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              {f === 'ALL' ? 'Все' : f === 'NEW' ? 'Новые' : f === 'CONFIRMED' ? 'Готовы' : 'Отмена'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredOrders.map(o => (
          <div
            key={o.id}
            onClick={() => setSelectedOrder(o)}
            className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center active:scale-95 transition-all hover:border-indigo-200"
          >
            <div className="flex items-center gap-4 min-w-0 pr-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${o.status === 'NEW' ? 'bg-indigo-50 text-indigo-500 animate-pulse' : o.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                <i className={`fas ${o.status === 'NEW' ? 'fa-bell' : o.status === 'CONFIRMED' ? 'fa-check' : 'fa-times'}`}></i>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{getCustomerName(o.customerId)}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Заказ №{o.id.slice(-4)} • {o.items.length} поз.</p>
                <p className="text-[9px] text-slate-300 font-bold uppercase">{new Date(o.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-slate-800">{o.total.toLocaleString()} ₽</p>
              <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-lg ${o.status === 'NEW' ? 'bg-indigo-100 text-indigo-600' : o.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {o.status === 'NEW' ? 'НОВЫЙ' : o.status === 'CONFIRMED' ? 'ВЫПОЛНЕН' : 'ОТМЕНЕН'}
              </span>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && <div className="py-20 text-center text-slate-300 italic text-sm">Заказов в этой категории нет</div>}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-6 max-h-[90vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">Детали заказа №{selectedOrder.id.slice(-4)}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{getCustomerName(selectedOrder.customerId)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6 pr-1">
              {selectedOrder.items.map((item, idx) => {
                const prod = products.find(p => p.id === item.productId);
                return (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{prod?.name || 'Удаленный товар'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {prod?.unit || 'шт'} x {item.price.toLocaleString()} ₽</p>
                    </div>
                    <p className="font-black text-slate-800">{(item.quantity * item.price).toLocaleString()} ₽</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Итоговая сумма</span>
                <span className="text-3xl font-black text-slate-800">{selectedOrder.total.toLocaleString()} ₽</span>
              </div>

              {selectedOrder.status === 'NEW' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { onUpdateOrder({...selectedOrder, status: 'CANCELLED'}); setSelectedOrder(null); }}
                    className="flex-1 py-4 font-black text-red-500 uppercase tracking-widest text-[10px]"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={() => { onConfirmOrder(selectedOrder); setSelectedOrder(null); }}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Выдать / В продажу
                  </button>
                </div>
              )}
              {selectedOrder.status !== 'NEW' && (
                <p className="text-center text-[10px] font-black text-slate-300 uppercase py-4">Операция завершена</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManager;
