
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
  const [filter, setFilter] = useState<'ALL' | 'NEW' | 'ACCEPTED' | 'CONFIRMED' | 'CANCELLED'>('NEW');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(o => filter === 'ALL' || o.status === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCustomer = (id: string) => customers.find(c => c.id === id);

  const getCustomerName = (order: Order) => {
    const cust = getCustomer(order.customerId);
    if (cust) return cust.name;
    if (order.note && order.note.includes('[Имя:')) {
      const match = order.note.match(/\[Имя:\s*([^,]+)/);
      return match ? match[1].trim() : 'Новый клиент';
    }
    return 'Неизвестный клиент';
  };

  const extractPhone = (order: Order) => {
    const cust = getCustomer(order.customerId);
    if (cust?.phone) return cust.phone;
    if (order.note && order.note.includes('Тел:')) {
      const match = order.note.match(/Тел:\s*([^\]]+)/);
      return match ? match[1].trim() : '';
    }
    return '';
  };

  const handleWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned) window.open(`https://wa.me/${cleaned}`, '_blank');
    else alert('Номер телефона не указан');
  };

  const handleCall = (phone: string) => {
    if (phone) window.location.href = `tel:${phone}`;
    else alert('Номер телефона не указан');
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'NEW': return 'ОЖИДАЕТ';
      case 'ACCEPTED': return 'ПРИНЯТ';
      case 'CONFIRMED': return 'ВЫПОЛНЕН';
      case 'CANCELLED': return 'ОТМЕНЕН';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 px-1">
        <h2 className="text-2xl font-black text-slate-800">Заказы клиентов</h2>
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2">
          {(['ALL', 'NEW', 'ACCEPTED', 'CONFIRMED', 'CANCELLED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all shrink-0 ${filter === f ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              {f === 'ALL' ? 'Все' : f === 'NEW' ? 'Новые' : f === 'ACCEPTED' ? 'Принятые' : f === 'CONFIRMED' ? 'Готовы' : 'Отмена'}
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
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${o.status === 'NEW' ? 'bg-indigo-50 text-indigo-500 animate-pulse' : o.status === 'ACCEPTED' ? 'bg-amber-50 text-amber-500' : o.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                <i className={`fas ${o.status === 'NEW' ? 'fa-bell' : o.status === 'ACCEPTED' ? 'fa-clock' : o.status === 'CONFIRMED' ? 'fa-check' : 'fa-times'}`}></i>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{getCustomerName(o)}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Заказ №{o.id.slice(-4)} • {o.items.length} поз.</p>
                <p className="text-[9px] text-slate-300 font-bold uppercase">{new Date(o.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-slate-800">{o.total.toLocaleString()} ₽</p>
              <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-lg ${o.status === 'NEW' ? 'bg-indigo-100 text-indigo-600' : o.status === 'ACCEPTED' ? 'bg-amber-100 text-amber-600' : o.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {getStatusText(o.status)}
              </span>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && <div className="py-24 text-center text-slate-300 italic text-sm">В этой категории пусто</div>}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-6 max-h-[95vh] flex flex-col animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">Заказ №{selectedOrder.id.slice(-4)}</h3>
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${selectedOrder.status === 'NEW' ? 'bg-indigo-50 text-indigo-600' : selectedOrder.status === 'ACCEPTED' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                   Статус: {getStatusText(selectedOrder.status)}
                </span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 no-scrollbar pb-6 pr-1">
              <div className="bg-slate-50 p-5 rounded-[32px] border border-slate-100 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Связь с клиентом</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleCall(extractPhone(selectedOrder))} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm">
                    <i className="fas fa-phone text-blue-500"></i><span className="text-xs font-black text-slate-700 uppercase">Позвонить</span>
                  </button>
                  <button onClick={() => handleWhatsApp(extractPhone(selectedOrder))} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm">
                    <i className="fab fa-whatsapp text-emerald-500"></i><span className="text-xs font-black text-slate-700 uppercase">Написать</span>
                  </button>
                </div>
              </div>

              {selectedOrder.note && (
                <div className="bg-amber-50 p-5 rounded-[32px] border border-amber-100">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Примечание:</p>
                  <p className="text-sm text-amber-900 font-medium leading-relaxed">{selectedOrder.note}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Товары в заказе</p>
                {selectedOrder.items.map((item, idx) => {
                  const prod = products.find(p => p.id === item.productId);
                  return (
                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold text-slate-800 text-sm truncate">{prod?.name || '---'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {prod?.unit || 'шт'} x {item.price} ₽</p>
                      </div>
                      <p className="font-black text-slate-800 shrink-0">{(item.quantity * item.price).toLocaleString()} ₽</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Итого</span>
                <span className="text-3xl font-black text-slate-800">{selectedOrder.total.toLocaleString()} ₽</span>
              </div>

              <div className="flex gap-2">
                {(selectedOrder.status === 'NEW' || selectedOrder.status === 'ACCEPTED') && (
                  <button
                    onClick={() => { onUpdateOrder({...selectedOrder, status: 'CANCELLED'}); setSelectedOrder(null); }}
                    className="flex-1 py-4 font-black text-red-500 uppercase tracking-widest text-[10px] border border-red-50 rounded-2xl"
                  >
                    Отмена
                  </button>
                )}

                {selectedOrder.status === 'NEW' && (
                  <button
                    onClick={() => { onUpdateOrder({...selectedOrder, status: 'ACCEPTED'}); setSelectedOrder(null); }}
                    className="flex-[2] bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-100 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Принять заказ
                  </button>
                )}

                {(selectedOrder.status === 'ACCEPTED' || selectedOrder.status === 'NEW') && (
                  <button
                    onClick={() => { onConfirmOrder(selectedOrder); setSelectedOrder(null); }}
                    className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                  >
                    {selectedOrder.status === 'NEW' ? 'Сразу выдать' : 'Выдать / Продать'}
                  </button>
                )}
              </div>

              {selectedOrder.status === 'CONFIRMED' && (
                <div className="flex flex-col items-center py-2 text-emerald-500 font-black text-[10px] uppercase">
                   <i className="fas fa-check-circle mb-1 text-xl"></i> Заказ завершен
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManager;
