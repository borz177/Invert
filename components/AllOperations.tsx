
import React, { useMemo, useState } from 'react';
import { Sale, Transaction, CashEntry, Product, Employee } from '../types';

interface AllOperationsProps {
  sales: Sale[];
  transactions: Transaction[];
  cashEntries: CashEntry[];
  products: Product[];
  employees: Employee[];
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onDeleteSale: (id: string) => void;
  onDeleteCashEntry: (id: string) => void;
}

const AllOperations: React.FC<AllOperationsProps> = ({
  sales, transactions, cashEntries, products, employees,
  onUpdateTransaction, onDeleteTransaction, onDeleteSale, onDeleteCashEntry
}) => {
  const [filter, setFilter] = useState<'ALL' | 'SALES' | 'STOCK' | 'CASH'>('ALL');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'SALE' | 'STOCK' | 'CASH' } | null>(null);

  const getEmployeeName = (id: string) => {
    if (id === 'admin') return 'Админ';
    return employees.find(e => e.id === id)?.name || 'Неизвестно';
  };

  const operations = useMemo(() => {
    const list: any[] = [];

    if (filter === 'ALL' || filter === 'SALES') {
      sales.forEach(s => list.push({
        id: s.id,
        date: s.date,
        type: 'SALE',
        title: `Продажа №${s.id.slice(-4)}`,
        subtitle: `${s.items.length} поз. • ${s.paymentMethod === 'CASH' ? 'Нал' : s.paymentMethod === 'CARD' ? 'Карта' : 'В долг'}`,
        amount: s.total,
        isPositive: true,
        icon: 'fa-shopping-cart',
        color: s.paymentMethod === 'DEBT' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
        isDeleted: s.isDeleted,
        responsible: getEmployeeName(s.employeeId)
      }));
    }

    if (filter === 'ALL' || filter === 'STOCK') {
      transactions.forEach(t => {
        const p = products.find(prod => prod.id === t.productId);
        list.push({
          id: t.id,
          date: t.date,
          type: 'STOCK',
          title: t.type === 'IN' ? 'Приход товара' : 'Расход товара',
          subtitle: `${p?.name || '---'} • ${t.quantity} ${p?.unit || 'шт.'}`,
          amount: 0,
          isPositive: t.type === 'IN',
          icon: t.type === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up',
          color: t.type === 'IN' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600',
          isDeleted: t.isDeleted,
          raw: t,
          responsible: getEmployeeName(t.employeeId)
        });
      });
    }

    if (filter === 'ALL' || filter === 'CASH') {
      cashEntries.forEach(c => {
        if (filter === 'ALL' && c.category === 'Продажа') return;

        list.push({
          id: c.id,
          date: c.date,
          type: 'CASH',
          title: c.category,
          subtitle: c.description,
          amount: c.amount,
          isPositive: c.type === 'INCOME',
          icon: c.type === 'INCOME' ? 'fa-wallet' : 'fa-hand-holding-dollar',
          color: c.type === 'INCOME' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600',
          responsible: getEmployeeName(c.employeeId)
        });
      });
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, transactions, cashEntries, products, employees, filter]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransaction) {
      onUpdateTransaction(editingTransaction);
      setEditingTransaction(null);
      setActiveMenuId(null);
    }
  };

  const processDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'SALE') onDeleteSale(confirmDelete.id);
    else if (confirmDelete.type === 'STOCK') onDeleteTransaction(confirmDelete.id);
    else if (confirmDelete.type === 'CASH') onDeleteCashEntry(confirmDelete.id);
    setConfirmDelete(null);
    setActiveMenuId(null);
  };

  const filterButtons = [
    { id: 'ALL', label: 'Все', icon: 'fa-layer-group' },
    { id: 'SALES', label: 'Продажи', icon: 'fa-shopping-bag' },
    { id: 'STOCK', label: 'Склад', icon: 'fa-warehouse' },
    { id: 'CASH', label: 'Касса', icon: 'fa-cash-register' },
  ];

  return (
    <div className="space-y-6 pb-20" onClick={() => setActiveMenuId(null)}>
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-slate-800">История операций</h2>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{operations.length}</div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {filterButtons.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider border transition-all shrink-0 ${filter === f.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100'}`}
          >
            <i className={`fas ${f.icon}`}></i>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 divide-y divide-slate-50">
        {operations.map((op, index) => (
          <div
            key={`${op.type}-${op.id}`}
            className={`p-5 flex items-center gap-4 group transition-all relative 
              ${op.isDeleted ? 'opacity-40 grayscale' : 'hover:bg-slate-50'}
              ${index === 0 ? 'rounded-t-[40px]' : ''}
              ${index === operations.length - 1 ? 'rounded-b-[40px]' : ''}
            `}
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${op.color} shadow-sm shrink-0`}>
              <i className={`fas ${op.icon} text-lg`}></i>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className={`font-bold text-slate-800 text-sm truncate ${op.isDeleted ? 'line-through' : ''}`}>{op.title}</h4>
                <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-black uppercase tracking-tighter shrink-0">{op.responsible}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate">{op.subtitle}</p>
            </div>

            <div className="text-right shrink-0 flex items-center gap-3">
              <div className="flex flex-col items-end">
                {op.amount > 0 && (
                  <p className={`font-black text-sm whitespace-nowrap ${op.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {op.isPositive ? '+' : '-'}{op.amount.toLocaleString()} ₽
                  </p>
                )}
                <p className="text-[9px] text-slate-300 font-bold uppercase">
                  {new Date(op.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>

              {!op.isDeleted ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === `${op.type}-${op.id}` ? null : `${op.type}-${op.id}`);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
                  >
                    <i className="fas fa-ellipsis-v text-[12px]"></i>
                  </button>
                  {activeMenuId === `${op.type}-${op.id}` && (
                    <div className="absolute top-11 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 w-48 animate-fade-in z-[100]">
                      {op.type === 'STOCK' && (
                        <button onClick={(e) => { e.stopPropagation(); setEditingTransaction(op.raw); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
                          <i className="fas fa-pen text-indigo-400 text-[10px] w-4 text-center"></i> Изменить
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ id: op.id, type: op.type });
                        }}
                        className="w-full px-4 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 border-t border-slate-50 mt-1"
                      >
                        <i className={`fas ${op.type === 'STOCK' ? 'fa-undo' : 'fa-trash-alt'} text-[10px] w-4 text-center`}></i>
                        {op.type === 'STOCK' ? 'Аннулировать' : 'Удалить'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-10 flex justify-center">
                  <span className="text-[7px] font-black text-red-400 border border-red-100 px-1 py-0.5 rounded uppercase leading-none text-center">DEL</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-center space-y-6 animate-slide-up">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-3xl ${confirmDelete.type === 'STOCK' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}>
              <i className={`fas ${confirmDelete.type === 'STOCK' ? 'fa-undo' : 'fa-trash-alt'}`}></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">{confirmDelete.type === 'STOCK' ? 'Аннулировать операцию?' : 'Удалить операцию?'}</h3>
              <p className="text-sm text-slate-400 font-medium mt-2 leading-relaxed">
                {confirmDelete.type === 'STOCK' ? 'Остатки товара будут пересчитаны.' :
                 confirmDelete.type === 'SALE' ? 'Товары вернутся на склад, а выручка/долг будут отменены.' :
                 'Движение по кассе будет удалено. Если это был платеж клиента, его долг восстановится.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Отмена</button>
              <button onClick={processDelete} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-100 active:scale-95 transition-all uppercase tracking-widest text-[10px]">Подтвердить</button>
            </div>
          </div>
        </div>
      )}

      {editingTransaction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-w-sm space-y-5 animate-fade-in">
            <h3 className="text-xl font-black text-slate-800 text-center">Редактирование прихода</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Количество</label>
                 <input
                  type="number" required autoFocus
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-2xl text-center"
                  value={editingTransaction.quantity}
                  onChange={e => setEditingTransaction({...editingTransaction, quantity: parseInt(e.target.value) || 0})}
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Примечание</label>
                 <input
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                  value={editingTransaction.note}
                  onChange={e => setEditingTransaction({...editingTransaction, note: e.target.value})}
                 />
               </div>
               <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setEditingTransaction(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
                 <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100">СОХРАНИТЬ</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllOperations;
