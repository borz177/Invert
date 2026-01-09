
import React, { useState, useMemo } from 'react';
import { Supplier, Transaction, Product, CashEntry } from '../types';

interface SuppliersProps {
  suppliers: Supplier[];
  transactions: Transaction[];
  cashEntries: CashEntry[];
  products: Product[];
  onAdd: (s: Supplier) => void;
  onUpdate: (s: Supplier) => void;
  onDelete: (id: string) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, transactions, cashEntries, products, onAdd, onUpdate, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      if (editingSupplier) {
        onUpdate({ ...editingSupplier, ...formData } as Supplier);
      } else {
        onAdd({
          ...formData as Supplier,
          id: Date.now().toString(),
          phone: formData.phone || '',
          debt: 0
        });
      }
      closeModal();
    }
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditingSupplier(null);
    setFormData({});
    setActiveMenuId(null);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData(s);
    setShowAdd(true);
    setActiveMenuId(null);
  };

  const combinedHistory = useMemo(() => {
    if (!viewHistoryId) return [];

    const supplyHistory = transactions
      .filter(t => t.supplierId === viewHistoryId && !t.isDeleted)
      .map(t => ({
        id: t.id,
        date: t.date,
        type: 'SUPPLY' as const,
        amount: t.quantity * (t.pricePerUnit || 0),
        title: `Приход: ${products.find(p => p.id === t.productId)?.name || '---'}`,
        subtitle: `${t.quantity} шт. • ${t.paymentMethod === 'DEBT' ? 'В долг' : 'Оплачено'}`,
        isNegative: t.paymentMethod === 'DEBT'
      }));

    const paymentHistory = cashEntries
      .filter(e => e.supplierId === viewHistoryId && e.type === 'EXPENSE')
      .map(e => ({
        id: e.id,
        date: e.date,
        type: 'PAYMENT' as const,
        amount: e.amount,
        title: 'Платеж поставщику',
        subtitle: e.description || 'Из кассы',
        isNegative: false
      }));

    return [...supplyHistory, ...paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewHistoryId, transactions, cashEntries, products]);

  return (
    <div className="space-y-6 pb-20" onClick={() => setActiveMenuId(null)}>
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-slate-800">Поставщики</h2>
        <button onClick={(e) => { e.stopPropagation(); setShowAdd(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm">
          + Добавить
        </button>
      </div>

      <div className="grid gap-3">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative transition-all hover:border-orange-200">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${s.debt > 0 ? 'bg-orange-50 text-orange-600' : (s.debt < 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600')} rounded-2xl flex items-center justify-center font-bold text-xl transition-colors`}>
                {s.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 leading-tight">{s.name}</h4>
                <p className="text-xs text-slate-400">{s.phone || 'Нет телефона'}</p>
                {s.debt !== 0 && (
                  <p className={`text-[10px] font-black uppercase mt-1 ${s.debt > 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                    {s.debt > 0 ? 'Мы должны: ' : 'Должен нам: '}
                    {Math.abs(s.debt).toLocaleString()} ₽
                  </p>
                )}
                {s.debt === 0 && <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">Расчет окончен</p>}
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === s.id ? null : s.id); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400"
            >
              <i className="fas fa-ellipsis-v text-sm"></i>
            </button>

            {activeMenuId === s.id && (
              <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-52 z-20 animate-fade-in">
                <button onClick={() => { setViewHistoryId(s.id); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-info-circle text-orange-400"></i> Информация / Взаимозачет
                </button>
                <button onClick={() => openEdit(s)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-pen text-indigo-400"></i> Изменить данные
                </button>
                <button onClick={() => setConfirmDeleteId(s.id)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50 mt-1">
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
            <h3 className="text-xl font-black text-slate-800 text-center">{editingSupplier ? 'Изменить поставщика' : 'Новый поставщик'}</h3>
            <div className="space-y-4">
              <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Название..." value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Телефон..." value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
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
                <h3 className="text-xl font-black text-slate-800">{suppliers.find(s => s.id === viewHistoryId)?.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const s = suppliers.find(s => s.id === viewHistoryId);
                    if (!s) return null;
                    return (
                      <>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.debt >= 0 ? 'Мы должны:' : 'Должен нам:'}</span>
                        <span className={`text-lg font-black ${s.debt >= 0 ? 'text-red-500' : 'text-indigo-600'}`}>{Math.abs(s.debt).toLocaleString()} ₽</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <button onClick={() => setViewHistoryId(null)} className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6 pr-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">История сделок и оплат</p>
              {combinedHistory.map(op => (
                <div key={op.id} className={`p-4 rounded-3xl border flex justify-between items-center transition-colors ${op.type === 'PAYMENT' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-slate-800 text-sm truncate">{op.title}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-0.5">{op.subtitle}</p>
                    <p className="text-[9px] text-slate-300 font-bold uppercase">{new Date(op.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${op.type === 'PAYMENT' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {op.type === 'PAYMENT' ? '−' : ''}{op.amount.toLocaleString()} ₽
                    </p>
                    {op.type === 'SUPPLY' && op.isNegative && <span className="text-[7px] bg-red-100 text-red-500 px-1 py-0.5 rounded font-black uppercase">В долг</span>}
                  </div>
                </div>
              ))}
              {combinedHistory.length === 0 && <p className="text-center py-20 text-slate-300 italic">Событий не зафиксировано</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
