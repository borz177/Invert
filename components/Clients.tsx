
import React, { useState } from 'react';
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
  const [editingClient, setEditingClient] = useState<Customer | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      if (editingClient) {
        onUpdate({ ...editingClient, ...formData } as Customer);
      } else {
        onAdd({
          ...formData as Customer,
          id: Date.now().toString(),
          phone: formData.phone || '',
          discount: formData.discount || 0,
          debt: 0
        });
      }
      closeModal();
    }
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditingClient(null);
    setFormData({});
    setActiveMenuId(null);
  };

  const openEdit = (c: Customer) => {
    setEditingClient(c);
    setFormData(c);
    setShowAdd(true);
    setActiveMenuId(null);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const getClientHistory = (clientId: string) => {
    const clientSales = sales.filter(s => s.customerId === clientId).map(s => ({
      id: s.id,
      date: s.date,
      type: 'SALE',
      title: `Покупка №${s.id.slice(-4)}`,
      amount: s.total,
      isDebt: s.paymentMethod === 'DEBT'
    }));

    const clientPayments = cashEntries.filter(e => e.customerId === clientId && e.type === 'INCOME').map(e => ({
      id: e.id,
      date: e.date,
      type: 'PAYMENT',
      title: 'Оплата долга',
      amount: e.amount,
      isDebt: false
    }));

    return [...clientSales, ...clientPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="space-y-6 pb-20" onClick={() => setActiveMenuId(null)}>
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-slate-800">Клиенты</h2>
        <button onClick={(e) => { e.stopPropagation(); setShowAdd(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm">+ Добавить</button>
      </div>

      <div className="relative">
        <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
        <input className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative transition-all hover:border-indigo-200">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${c.debt > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'} rounded-2xl flex items-center justify-center font-bold text-xl`}>
                {c.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 leading-tight">{c.name}</h4>
                <p className="text-xs text-slate-400">{c.phone || '---'}</p>
                {c.debt > 0 && <p className="text-[10px] font-black text-red-500 uppercase mt-1">Долг: {c.debt.toLocaleString()} ₽</p>}
                {c.login && <p className="text-[8px] font-black text-indigo-400 uppercase mt-0.5">Личный кабинет: {c.login}</p>}
              </div>
            </div>

            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === c.id ? null : c.id); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400"><i className="fas fa-ellipsis-v text-sm"></i></button>

            {activeMenuId === c.id && (
              <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-48 z-20 animate-fade-in">
                <button onClick={() => { setViewHistoryId(c.id); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><i className="fas fa-history text-indigo-400 text-xs"></i> История</button>
                <button onClick={() => openEdit(c)} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><i className="fas fa-pen text-indigo-400 text-xs"></i> Изменить</button>
                <button onClick={() => setConfirmDeleteId(c.id)} className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50 mt-1"><i className="fas fa-trash text-xs"></i> Удалить</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-w-sm space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
            <h3 className="text-xl font-black text-slate-800 text-center">{editingClient ? 'Изменить клиента' : 'Новый клиент'}</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Основное</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Имя..." value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Телефон..." value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Скидка %" value={formData.discount || ''} onChange={e => setFormData({...formData, discount: parseInt(e.target.value) || 0})} />
                <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="p-4 bg-indigo-50 rounded-3xl space-y-3">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Доступ в личный кабинет</p>
                <input className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-xs font-bold" placeholder="Логин для входа" value={formData.login || ''} onChange={e => setFormData({...formData, login: e.target.value})} />
                <input className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-xs font-bold" placeholder="Пароль" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3">
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
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">История операций</p>
              </div>
              <button onClick={() => setViewHistoryId(null)} className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
              {getClientHistory(viewHistoryId).map(op => (
                <div key={op.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{op.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(op.date).toLocaleDateString()}</p>
                    {op.isDebt && <span className="text-[8px] font-black text-red-500 uppercase">В долг</span>}
                  </div>
                  <p className={`font-black text-lg ${op.type === 'PAYMENT' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {op.type === 'PAYMENT' ? '-' : ''}{op.amount.toLocaleString()} ₽
                  </p>
                </div>
              ))}
              {getClientHistory(viewHistoryId).length === 0 && <p className="text-center py-10 text-slate-300 italic">Операций не найдено</p>}
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-center space-y-6 animate-slide-up">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto text-3xl"><i className="fas fa-user-minus"></i></div>
            <h3 className="text-xl font-black text-slate-800">Удалить клиента?</h3>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black">УДАЛИТЬ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
