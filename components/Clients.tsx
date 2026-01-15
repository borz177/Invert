
import React, { useState, useMemo } from 'react';
import { Customer, Sale, CashEntry, Product } from '../types';

interface ClientsProps {
  customers: Customer[];
  sales: Sale[];
  cashEntries: CashEntry[];
  products: Product[];
  onAdd: (c: Customer) => void;
  onUpdate: (c: Customer) => void;
  onDelete: (id: string) => void;
}

const Clients: React.FC<ClientsProps> = ({ customers, sales, cashEntries, products, onAdd, onUpdate, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'INFO' | 'HISTORY'>('INFO');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Customer>>({});

  const activeCustomer = useMemo(() =>
    customers.find(c => c.id === viewingCustomerId),
    [customers, viewingCustomerId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      if (editingCustomer) {
        onUpdate({ ...editingCustomer, ...formData } as Customer);
      } else {
        onAdd({
          ...formData as Customer,
          id: `CUST-${Date.now()}`,
          debt: formData.debt || 0,
          discount: formData.discount || 0
        });
      }
      closeModal();
    }
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditingCustomer(null);
    setFormData({});
    setActiveMenuId(null);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData(c);
    setShowAdd(true);
    setActiveMenuId(null);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const history = useMemo(() => {
    if (!viewingCustomerId) return [];

    const salesHistory = sales
      .filter(s => s.customerId === viewingCustomerId && !s.isDeleted)
      .map(s => ({
        id: s.id,
        date: s.date,
        type: 'SALE' as const,
        amount: s.total,
        raw: s
      }));

    const paymentHistory = cashEntries
      .filter(e => e.customerId === viewingCustomerId && e.type === 'INCOME')
      .map(e => ({
        id: e.id,
        date: e.date,
        type: 'PAYMENT' as const,
        amount: e.amount,
        description: e.description || 'Внесение средств',
        raw: e
      }));

    return [...salesHistory, ...paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewingCustomerId, sales, cashEntries]);

  // Детальная страница клиента
  if (activeCustomer) {
    return (
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setViewingCustomerId(null)} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 className="text-2xl font-black text-slate-800 truncate">{activeCustomer.name}</h2>
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          <button onClick={() => setDetailTab('INFO')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${detailTab === 'INFO' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}>Информация</button>
          <button onClick={() => setDetailTab('HISTORY')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${detailTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}>История сделок</button>
        </div>

        {detailTab === 'INFO' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center">
               <div className={`w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center text-3xl font-black ${activeCustomer.debt > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                 {activeCustomer.name[0].toUpperCase()}
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Текущий долг</p>
               <p className={`text-4xl font-black mt-1 ${activeCustomer.debt > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                 {activeCustomer.debt.toLocaleString()} ₽
               </p>
               {activeCustomer.discount > 0 && (
                 <div className="mt-4 bg-indigo-50 inline-block px-4 py-1.5 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                   Персональная скидка {activeCustomer.discount}%
                 </div>
               )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><i className="fas fa-phone"></i></div>
                 <p className="font-bold text-slate-700">{activeCustomer.phone || 'Телефон не указан'}</p>
               </div>
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><i className="fas fa-map-marker-alt"></i></div>
                 <p className="font-bold text-slate-700">{activeCustomer.address || 'Адрес не указан'}</p>
               </div>
            </div>

            <button onClick={() => openEdit(activeCustomer)} className="w-full bg-slate-800 text-white p-5 rounded-3xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
              Редактировать профиль
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {history.map(item => (
              <button key={item.id} onClick={() => item.type === 'SALE' && setSelectedSale(item.raw)} className={`w-full bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center text-left ${item.type === 'SALE' ? 'active:bg-slate-50 cursor-pointer' : 'cursor-default'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${item.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-600'}`}>
                    <i className={`fas ${item.type === 'PAYMENT' ? 'fa-wallet' : 'fa-shopping-cart'}`}></i>
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">
                      {item.type === 'PAYMENT' ? 'Платеж' : `Покупка №${item.id.toString().slice(-4)}`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black ${item.type === 'PAYMENT' ? 'text-emerald-500' : 'text-slate-800'}`}>
                    {item.type === 'PAYMENT' ? '+' : ''}{item.amount.toLocaleString()} ₽
                  </p>
                  {item.type === 'SALE' && item.raw.paymentMethod === 'DEBT' && <span className="text-[8px] font-black text-red-400 uppercase bg-red-50 px-1.5 py-0.5 rounded ml-1">В долг</span>}
                  {item.type === 'SALE' && <i className="fas fa-chevron-right text-[10px] text-slate-200 ml-2"></i>}
                </div>
              </button>
            ))}
            {history.length === 0 && <div className="py-20 text-center text-slate-300 italic">Событий не зафиксировано</div>}
          </div>
        )}

        {/* Детали продажи (чека) */}
        {selectedSale && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedSale(null)}>
            <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-6 flex flex-col max-h-[85vh] animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Детали покупки</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Чек №{selectedSale.id.toString().slice(-6)} • {new Date(selectedSale.date).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times text-xl"></i></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-6">
                {selectedSale.items.map((it, idx) => {
                  const p = products.find(prod => prod.id === it.productId);
                  return (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div className="min-w-0 pr-4">
                        <p className="font-bold text-slate-800 text-sm truncate">{p?.name || '---'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{it.quantity} {p?.unit || 'шт'} x {it.price} ₽</p>
                      </div>
                      <p className="font-black text-slate-800 whitespace-nowrap">{(it.quantity * it.price).toLocaleString()} ₽</p>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-800 p-6 rounded-[32px] text-white flex justify-between items-center">
                <span className="text-[10px] font-black uppercase opacity-60">Итог по чеку:</span>
                <span className="text-2xl font-black">{selectedSale.total.toLocaleString()} ₽</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20" onClick={() => setActiveMenuId(null)}>
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-slate-800">Клиенты</h2>
        <button onClick={(e) => { e.stopPropagation(); setShowAdd(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm">
          + Добавить
        </button>
      </div>

      <div className="relative">
        <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
        <input
          className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
          placeholder="Поиск..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filteredCustomers.map(c => (
          <div key={c.id} onClick={() => { setViewingCustomerId(c.id); setDetailTab('INFO'); }} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative transition-all hover:border-indigo-300 cursor-pointer active:scale-[0.98]">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${c.debt > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} rounded-2xl flex items-center justify-center font-bold text-xl`}>
                {c.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 leading-tight">{c.name}</h4>
                <p className="text-xs text-slate-400">{c.phone || 'Без телефона'}</p>
                <div className="flex gap-2 mt-1">
                  {c.debt > 0 ? (
                    <span className="text-[10px] font-black text-red-500 uppercase">Долг: {c.debt.toLocaleString()} ₽</span>
                  ) : <span className="text-[10px] font-black text-emerald-600 uppercase">Оплачено</span>}
                </div>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === c.id ? null : c.id); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400"
            >
              <i className="fas fa-ellipsis-v text-sm"></i>
            </button>

            {activeMenuId === c.id && (
              <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-52 z-20 animate-fade-in" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setViewingCustomerId(c.id); setDetailTab('INFO'); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-info-circle text-indigo-400"></i> Информация
                </button>
                <button onClick={() => openEdit(c)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-pen text-indigo-400"></i> Изменить данные
                </button>
                <button onClick={() => { if(confirm('Удалить клиента?')) onDelete(c.id); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50 mt-1">
                  <i className="fas fa-trash"></i> Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-sm space-y-5 animate-fade-in">
            <h3 className="text-xl font-black text-slate-800 text-center">{editingCustomer ? 'Изменить клиента' : 'Новый клиент'}</h3>
            <div className="space-y-4">
              <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Имя клиента..." value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Телефон..." value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Адрес..." value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Скидка %</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={formData.discount || ''} onChange={e => setFormData({...formData, discount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Нач. Долг</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={formData.debt || ''} onChange={e => setFormData({...formData, debt: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">СОХРАНИТЬ</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Clients;
