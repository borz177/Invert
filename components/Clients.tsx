
import React, { useState, useMemo } from 'react';
import { Customer, Sale, CashEntry } from '../types';

interface ClientsProps {
  customers: Customer[];
  sales: Sale[];
  cashEntries: CashEntry[];
  onAdd: (c: Customer) => void;
  onUpdate: (c: Customer) => void;
  onDelete: (id: string) => void;
}

const Clients: React.FC<ClientsProps> = ({ customers, sales, cashEntries, onAdd, onUpdate, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Customer>>({});

  // Обработка сохранения клиента (новый или редактируемый)
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

  // Фильтрация списка клиентов по поисковому запросу
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  // Сбор истории операций для конкретного клиента (продажи и платежи)
  const combinedHistory = useMemo(() => {
    if (!viewHistoryId) return [];

    const salesHistory = sales
      .filter(s => s.customerId === viewHistoryId && !s.isDeleted)
      .map(s => ({
        id: s.id,
        date: s.date,
        type: 'SALE' as const,
        amount: s.total,
        title: `Продажа №${s.id.slice(-4)}`,
        subtitle: `${s.items.length} поз. • ${s.paymentMethod === 'DEBT' ? 'В долг' : 'Оплачено'}`,
        isNegative: s.paymentMethod === 'DEBT'
      }));

    const paymentHistory = cashEntries
      .filter(e => e.customerId === viewHistoryId && e.type === 'INCOME')
      .map(e => ({
        id: e.id,
        date: e.date,
        type: 'PAYMENT' as const,
        amount: e.amount,
        title: 'Оплата от клиента',
        subtitle: e.description || 'В кассу',
        isNegative: false
      }));

    return [...salesHistory, ...paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewHistoryId, sales, cashEntries]);

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
          className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none"
          placeholder="Поиск по имени или телефону..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filteredCustomers.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative transition-all hover:border-indigo-200">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${c.debt > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} rounded-2xl flex items-center justify-center font-bold text-xl`}>
                {c.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 leading-tight">{c.name}</h4>
                <p className="text-xs text-slate-400">{c.phone || 'Без телефона'}</p>
                <div className="flex gap-2 mt-1">
                  {c.debt > 0 && (
                    <span className="text-[10px] font-black text-red-500 uppercase">
                      Долг: {c.debt.toLocaleString()} ₽
                    </span>
                  )}
                  {c.discount > 0 && (
                    <span className="text-[10px] font-black text-indigo-500 uppercase">
                      Скидка: {c.discount}%
                    </span>
                  )}
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
              <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-52 z-20 animate-fade-in">
                <button onClick={() => { setViewHistoryId(c.id); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-history text-indigo-400"></i> История / Долг
                </button>
                <button onClick={() => openEdit(c)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-pen text-indigo-400"></i> Изменить
                </button>
                <button onClick={() => onDelete(c.id)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50 mt-1">
                  <i className="fas fa-trash"></i> Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-w-sm space-y-5 animate-fade-in">
            <h3 className="text-xl font-black text-slate-800 text-center">{editingCustomer ? 'Изменить клиента' : 'Новый клиент'}</h3>
            <div className="space-y-4">
              <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Имя клиента..." value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Телефон..." value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
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

      {viewHistoryId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[160] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setViewHistoryId(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-6 max-h-[90vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">{customers.find(c => c.id === viewHistoryId)?.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Текущий долг:</span>
                  <span className="text-lg font-black text-red-500">{customers.find(c => c.id === viewHistoryId)?.debt.toLocaleString()} ₽</span>
                </div>
              </div>
              <button onClick={() => setViewHistoryId(null)} className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6 pr-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">История покупок и оплат</p>
              {combinedHistory.map(op => (
                <div key={op.id} className={`p-4 rounded-3xl border flex justify-between items-center ${op.type === 'PAYMENT' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-slate-800 text-sm truncate">{op.title}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-0.5">{op.subtitle}</p>
                    <p className="text-[9px] text-slate-300 font-bold uppercase">{new Date(op.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${op.type === 'PAYMENT' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {op.type === 'PAYMENT' ? '−' : ''}{op.amount.toLocaleString()} ₽
                    </p>
                    {op.type === 'SALE' && op.isNegative && <span className="text-[7px] bg-red-100 text-red-500 px-1 py-0.5 rounded font-black uppercase">В долг</span>}
                  </div>
                </div>
              ))}
              {combinedHistory.length === 0 && <p className="text-center py-20 text-slate-300 italic">История пуста</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
