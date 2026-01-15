
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'INFO' | 'HISTORY'>('INFO');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});

  const activeSupplier = useMemo(() =>
    suppliers.find(s => s.id === viewingSupplierId),
    [suppliers, viewingSupplierId]
  );

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

  // Группировка истории по "Документам"
  const groupedHistory = useMemo(() => {
    if (!viewingSupplierId) return [];

    // 1. Собираем транзакции и группируем их (похожие по времени = одна приемка)
    const supplyTrans = transactions.filter(t => t.supplierId === viewingSupplierId && !t.isDeleted);
    const supplyDocs: any[] = [];

    // Простая группировка: транзакции в пределах 2 секунд считаем одним приходом
    supplyTrans.forEach(t => {
      const time = new Date(t.date).getTime();
      const existingDoc = supplyDocs.find(d => Math.abs(new Date(d.date).getTime() - time) < 2000);

      if (existingDoc) {
        existingDoc.items.push(t);
        existingDoc.amount += t.quantity * (t.pricePerUnit || 0);
      } else {
        supplyDocs.push({
          id: t.batchId || t.id,
          date: t.date,
          type: 'SUPPLY',
          amount: t.quantity * (t.pricePerUnit || 0),
          paymentMethod: t.paymentMethod,
          items: [t]
        });
      }
    });

    // 2. Собираем платежи
    const paymentDocs = cashEntries
      .filter(e => e.supplierId === viewingSupplierId && e.type === 'EXPENSE')
      .map(e => ({
        id: e.id,
        date: e.date,
        type: 'PAYMENT',
        amount: e.amount,
        description: e.description || 'Оплата поставщику',
        raw: e
      }));

    return [...supplyDocs, ...paymentDocs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewingSupplierId, transactions, cashEntries]);

  // Если открыта страница поставщика
  if (activeSupplier) {
    return (
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setViewingSupplierId(null)} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 className="text-2xl font-black text-slate-800 truncate">{activeSupplier.name}</h2>
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          <button onClick={() => setDetailTab('INFO')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${detailTab === 'INFO' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}>Информация</button>
          <button onClick={() => setDetailTab('HISTORY')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${detailTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}>История сделок</button>
        </div>

        {detailTab === 'INFO' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center">
               <div className={`w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center text-3xl font-black ${activeSupplier.debt > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                 {activeSupplier.name[0].toUpperCase()}
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Текущий баланс</p>
               <p className={`text-4xl font-black mt-1 ${activeSupplier.debt > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                 {activeSupplier.debt.toLocaleString()} ₽
               </p>
               <p className="text-xs text-slate-400 mt-2 font-medium">
                 {activeSupplier.debt > 0 ? 'Сумма нашего долга перед поставщиком' : 'Все расчеты произведены'}
               </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
               <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center"><i className="fas fa-phone"></i></div>
                 <div>
                   <p className="text-[10px] font-black text-slate-300 uppercase">Телефон</p>
                   <p className="font-bold text-slate-700">{activeSupplier.phone || 'Не указан'}</p>
                 </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center"><i className="fas fa-envelope"></i></div>
                 <div>
                   <p className="text-[10px] font-black text-slate-300 uppercase">Email</p>
                   <p className="font-bold text-slate-700">{activeSupplier.email || 'Не указан'}</p>
                 </div>
               </div>
            </div>

            <button onClick={() => openEdit(activeSupplier)} className="w-full bg-slate-800 text-white p-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
              Изменить данные
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {groupedHistory.map(doc => (
              <button key={doc.id} onClick={() => setSelectedDoc(doc)} className="w-full bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center text-left active:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${doc.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-600'}`}>
                    <i className={`fas ${doc.type === 'PAYMENT' ? 'fa-hand-holding-dollar' : 'fa-file-invoice'}`}></i>
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">
                      {doc.type === 'PAYMENT' ? 'Платеж' : `Приход товара №${doc.id.toString().slice(-4)}`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(doc.date).toLocaleDateString()} • {new Date(doc.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black ${doc.type === 'PAYMENT' ? 'text-emerald-500' : 'text-slate-800'}`}>
                    {doc.type === 'PAYMENT' ? '−' : ''}{doc.amount.toLocaleString()} ₽
                  </p>
                  <i className="fas fa-chevron-right text-[10px] text-slate-200 mt-1"></i>
                </div>
              </button>
            ))}
            {groupedHistory.length === 0 && <div className="py-20 text-center text-slate-300 italic">История операций пуста</div>}
          </div>
        )}

        {/* Модалка деталей документа */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedDoc(null)}>
            <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-6 flex flex-col max-h-[85vh] animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {selectedDoc.type === 'PAYMENT' ? 'Детали платежа' : 'Детали прихода'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase mt-1">
                    {new Date(selectedDoc.date).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-6">
                {selectedDoc.type === 'SUPPLY' ? (
                  <>
                    <div className={`p-4 rounded-2xl flex items-center justify-between ${selectedDoc.paymentMethod === 'DEBT' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                       <span className="text-[10px] font-black uppercase tracking-widest">Способ оплаты:</span>
                       <span className="font-black uppercase text-xs">{selectedDoc.paymentMethod === 'DEBT' ? 'В долг' : 'Оплачено'}</span>
                    </div>
                    <div className="space-y-2">
                      {selectedDoc.items.map((it: any, idx: number) => {
                        const p = products.find(prod => prod.id === it.productId);
                        return (
                          <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                            <div className="min-w-0 pr-4">
                              <p className="font-bold text-slate-800 text-sm truncate">{p?.name || '---'}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{it.quantity} {p?.unit || 'шт'} x {it.pricePerUnit} ₽</p>
                            </div>
                            <p className="font-black text-slate-800 whitespace-nowrap">{(it.quantity * (it.pricePerUnit || 0)).toLocaleString()} ₽</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100 text-center">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Сумма оплаты</p>
                    <p className="text-4xl font-black text-emerald-600">{selectedDoc.amount.toLocaleString()} ₽</p>
                    <p className="text-sm text-emerald-700/60 mt-4 font-medium leading-relaxed italic">"{selectedDoc.description}"</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-800 p-6 rounded-[32px] text-white flex justify-between items-center">
                <span className="text-[10px] font-black uppercase opacity-60">Итоговая сумма:</span>
                <span className="text-2xl font-black">{selectedDoc.amount.toLocaleString()} ₽</span>
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
        <h2 className="text-2xl font-bold text-slate-800">Поставщики</h2>
        <button onClick={(e) => { e.stopPropagation(); setShowAdd(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm">
          + Добавить
        </button>
      </div>

      <div className="grid gap-3">
        {suppliers.map(s => (
          <div key={s.id} onClick={() => { setViewingSupplierId(s.id); setDetailTab('INFO'); }} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative transition-all hover:border-indigo-300 cursor-pointer active:scale-[0.98]">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${s.debt > 0 ? 'bg-orange-50 text-orange-600' : (s.debt < 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600')} rounded-2xl flex items-center justify-center font-bold text-xl transition-colors`}>
                {s.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 leading-tight">{s.name}</h4>
                <p className="text-xs text-slate-400">{s.phone || 'Нет телефона'}</p>
                <div className="mt-1">
                  {s.debt !== 0 ? (
                    <p className={`text-[10px] font-black uppercase ${s.debt > 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                      {s.debt > 0 ? 'Мы должны: ' : 'Должен нам: '}
                      {Math.abs(s.debt).toLocaleString()} ₽
                    </p>
                  ) : <p className="text-[10px] font-black text-emerald-600 uppercase">Оплачено</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === s.id ? null : s.id); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400"
              >
                <i className="fas fa-ellipsis-v text-sm"></i>
              </button>
            </div>

            {activeMenuId === s.id && (
              <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-52 z-20 animate-fade-in" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setViewingSupplierId(s.id); setDetailTab('INFO'); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-info-circle text-indigo-400"></i> Информация
                </button>
                <button onClick={() => openEdit(s)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-pen text-indigo-400"></i> Изменить данные
                </button>
                <button onClick={() => { if(confirm('Удалить поставщика?')) onDelete(s.id); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50 mt-1">
                  <i className="fas fa-trash"></i> Удалить
                </button>
              </div>
            )}
          </div>
        ))}
        {suppliers.length === 0 && <div className="py-24 text-center text-slate-300 italic">Список поставщиков пуст</div>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-sm space-y-5 animate-fade-in">
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
    </div>
  );
};

export default Suppliers;
