
import React, { useMemo, useState } from 'react';
import { Sale, Transaction, CashEntry, Product, Employee, Customer, AppSettings } from '../types';

interface AllOperationsProps {
  sales: Sale[];
  transactions: Transaction[];
  cashEntries: CashEntry[];
  products: Product[];
  employees: Employee[];
  customers: Customer[];
  settings?: AppSettings;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onDeleteSale: (id: string) => void;
  onDeleteCashEntry: (id: string) => void;
  ownerId?: string;
  ownerName?: string;
  canDelete?: boolean;
}

const AllOperations: React.FC<AllOperationsProps> = ({ 
  sales, transactions, cashEntries, products, employees, customers, settings,
  onUpdateTransaction, onDeleteTransaction, onDeleteSale, onDeleteCashEntry,
  ownerId, ownerName, canDelete = false
}) => {
  const [filter, setFilter] = useState<'ALL' | 'SALES' | 'STOCK' | 'CASH'>('ALL');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'SALE' | 'STOCK' | 'CASH' } | null>(null);
  const [printingSale, setPrintingSale] = useState<any | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  const getEmployeeName = (id: string) => {
    if (!id) return '---';
    if (id === 'admin' || id === ownerId || id === '00000000-0000-0000-0000-000000000000') {
      return ownerName || 'Владелец';
    }
    const emp = employees.find(e => e.id === id);
    if (emp) return emp.name;
    return id === ownerId ? (ownerName || 'Владелец') : 'Сотрудник';
  };

  const getCustomerName = (id?: string) => customers.find(c => c.id === id)?.name || 'Розничный клиент';

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
        responsible: getEmployeeName(s.employeeId),
        raw: s
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
          responsible: getEmployeeName(c.employeeId),
          raw: c
        });
      });
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, transactions, cashEntries, products, employees, filter, ownerId, ownerName]);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20" onClick={() => setActiveMenuId(null)}>
      <style>{`
        @media print {
          html, body, #root, [class*="h-screen"], [class*="overflow-hidden"], main {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            position: relative !important;
            display: block !important;
            background: white !important;
          }
          header, nav, .no-print, button, [class*="fixed"], [class*="backdrop-blur"] {
            display: none !important;
          }
          #invoice-print-wrapper {
            display: block !important;
            position: static !important;
            width: 100% !important;
          }
          #invoice-print-area {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            padding: 0 !important;
            color: black !important;
          }
          #invoice-print-area * {
            visibility: visible !important;
            color: black !important;
          }
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid black !important; padding: 6px !important; }
        }
      `}</style>

      <div className="flex justify-between items-center px-1 no-print">
        <h2 className="text-2xl font-black text-slate-800">История операций</h2>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{operations.length}</div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 no-print">
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

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 divide-y divide-slate-50 no-print">
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
                <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-black uppercase tracking-tighter shrink-0">Отв: {op.responsible}</span>
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
                      <button onClick={(e) => { e.stopPropagation(); setSelectedDetail({ ...op.raw, _opType: op.type }); setActiveMenuId(null); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3">
                        <i className="fas fa-info-circle text-indigo-400 text-[10px] w-4 text-center"></i> Данные
                      </button>
                      {op.type === 'SALE' && (
                        <button onClick={(e) => { e.stopPropagation(); setPrintingSale(op.raw); setActiveMenuId(null); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-t border-slate-50/50">
                          <i className="fas fa-print text-emerald-400 text-[10px] w-4 text-center"></i> Накладная
                        </button>
                      )}
                      {op.type === 'STOCK' && canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); setEditingTransaction(op.raw); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-t border-slate-50/50">
                          <i className="fas fa-pen text-orange-400 text-[10px] w-4 text-center"></i> Изменить
                        </button>
                      )}
                      {canDelete && (
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
                      )}
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

      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 no-print" onClick={() => setSelectedDetail(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-6 flex flex-col max-h-[90vh] animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Детали операции</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">ID: {selectedDetail.id}</p>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center active:scale-90 transition-all"><i className="fas fa-times"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-6 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Дата и время</p>
                  <p className="text-xs font-bold text-slate-800">{new Date(selectedDetail.date).toLocaleString('ru-RU')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ответственный</p>
                  <p className="text-xs font-bold text-slate-800">{getEmployeeName(selectedDetail.employeeId)}</p>
                </div>
              </div>

              {selectedDetail._opType === 'SALE' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100">
                    <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Покупатель</p>
                    <p className="text-sm font-black text-indigo-600">{getCustomerName(selectedDetail.customerId)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase ml-1">Состав чека</p>
                    {selectedDetail.items.map((it: any, idx: number) => {
                      const p = products.find(prod => prod.id === it.productId);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{p?.name || 'Удален'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{it.quantity} {p?.unit || 'шт'} x {it.price.toLocaleString()} ₽</p>
                          </div>
                          <p className="font-black text-slate-800">{(it.quantity * it.price).toLocaleString()} ₽</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-slate-800 p-5 rounded-[32px] text-white flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase opacity-60">Итоговая сумма</span>
                    <span className="text-2xl font-black">{selectedDetail.total.toLocaleString()} ₽</span>
                  </div>
                </div>
              )}

              {selectedDetail._opType === 'STOCK' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Тип движения</p>
                    <p className="text-sm font-black text-blue-600 uppercase tracking-widest">{selectedDetail.type === 'IN' ? 'ПРИХОД НА СКЛАД' : 'РАСХОД СО СКЛАДА'}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Товар</p>
                    <div className="flex justify-between items-center">
                      <p className="font-black text-slate-800">{products.find(p => p.id === selectedDetail.productId)?.name || 'Удален'}</p>
                      <p className="text-lg font-black text-indigo-600">{selectedDetail.quantity} {products.find(p => p.id === selectedDetail.productId)?.unit || 'шт'}</p>
                    </div>
                  </div>
                  {selectedDetail.note && (
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Примечание</p>
                      <p className="text-xs text-slate-600 font-medium">{selectedDetail.note}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedDetail._opType === 'CASH' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-3xl border ${selectedDetail.type === 'INCOME' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-[9px] font-black uppercase mb-1 ${selectedDetail.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>Тип операции</p>
                    <p className={`text-sm font-black uppercase tracking-widest ${selectedDetail.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>{selectedDetail.type === 'INCOME' ? 'ПРИХОД В КАССУ' : 'РАСХОД ИЗ КАССЫ'}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Категория</p>
                    <p className="text-lg font-black text-slate-800">{selectedDetail.category}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Описание</p>
                    <p className="text-sm text-slate-600 font-medium">{selectedDetail.description || 'Нет описания'}</p>
                  </div>
                  <div className={`p-6 rounded-[32px] flex justify-between items-center text-white ${selectedDetail.type === 'INCOME' ? 'bg-emerald-600' : 'bg-red-500'}`}>
                    <span className="text-[10px] font-black uppercase opacity-70">Сумма</span>
                    <span className="text-3xl font-black">{selectedDetail.amount.toLocaleString()} ₽</span>
                  </div>
                </div>
              )}
            </div>
            
            <button onClick={() => setSelectedDetail(null)} className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Закрыть</button>
          </div>
        </div>
      )}

      {printingSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-0 sm:p-4 no-print" onClick={() => setPrintingSale(null)}>
          <div className="bg-white w-full max-w-2xl sm:rounded-[40px] shadow-2xl h-full sm:h-auto max-h-[95vh] flex flex-col animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Предпросмотр накладной</h3>
              <button onClick={() => setPrintingSale(null)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
            </div>
            
            <div id="invoice-print-wrapper" className="flex-1 overflow-y-auto p-4 sm:p-10 bg-white">
              <div id="invoice-print-area" className="font-serif text-slate-900">
                <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-2xl font-black mb-1">РАСХОДНАЯ НАКЛАДНАЯ</h1>
                    <p className="text-sm font-bold">№ {printingSale.id.slice(-6)} от {new Date(printingSale.date).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg uppercase tracking-tight">{settings?.shopName || 'МОЙ МАГАЗИН'}</p>
                    <p className="text-[10px] text-slate-500 italic">Система учета товаров ИнвентарьПро</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Поставщик:</p>
                    <p className="font-bold underline">{settings?.shopName || 'ИнвентарьПро'}</p>
                    <p className="text-[11px] mt-1 italic">Адрес: _________________________________</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Покупатель:</p>
                    <p className="font-bold underline">
                      {printingSale.customerId ? 
                        customers.find(c => c.id === printingSale.customerId)?.name || 'Неизвестный клиент' : 
                        'Розничный покупатель'}
                    </p>
                    {printingSale.customerId && (
                       <p className="text-[11px] mt-1 italic">Тел: {customers.find(c => c.id === printingSale.customerId)?.phone || '__________'}</p>
                    )}
                  </div>
                </div>

                <table className="w-full border-collapse border border-slate-900 text-sm mb-8">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-900 p-2 text-center w-10">№</th>
                      <th className="border border-slate-900 p-2 text-left">Наименование товара</th>
                      <th className="border border-slate-900 p-2 text-center w-20">Кол-во</th>
                      <th className="border border-slate-900 p-2 text-center w-16">Ед.</th>
                      <th className="border border-slate-900 p-2 text-right w-24">Цена</th>
                      <th className="border border-slate-900 p-2 text-right w-32">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingSale.items.map((item: any, idx: number) => {
                      const p = products.find(prod => prod.id === item.productId);
                      return (
                        <tr key={idx}>
                          <td className="border border-slate-900 p-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-900 p-2">{p?.name || 'Товар удален'}</td>
                          <td className="border border-slate-900 p-2 text-center font-bold">{item.quantity}</td>
                          <td className="border border-slate-900 p-2 text-center">{p?.unit || 'шт'}</td>
                          <td className="border border-slate-900 p-2 text-right">{item.price.toLocaleString()} ₽</td>
                          <td className="border border-slate-900 p-2 text-right font-black">{(item.price * item.quantity).toLocaleString()} ₽</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="border border-slate-900 p-2 text-right font-black uppercase text-xs">Итого к оплате:</td>
                      <td className="border border-slate-900 p-2 text-right font-black text-lg">{printingSale.total.toLocaleString()} ₽</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="text-sm italic mb-10">
                  <p>Всего наименований {printingSale.items.length}, на сумму {printingSale.total.toLocaleString()} ₽</p>
                </div>

                <div className="grid grid-cols-2 gap-20 pt-10 border-t border-slate-200">
                  <div className="text-center">
                    <p className="border-b border-slate-900 pb-1 font-bold">{ownerName || '________________'}</p>
                    <p className="text-[10px] uppercase font-black text-slate-400 mt-1">Отпустил (Подпись)</p>
                  </div>
                  <div className="text-center">
                    <p className="border-b border-slate-900 pb-1 font-bold">________________</p>
                    <p className="text-[10px] uppercase font-black text-slate-400 mt-1">Получил (Подпись)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-4 no-print">
              <button onClick={() => setPrintingSale(null)} className="flex-1 py-4 font-bold text-slate-400 uppercase text-xs">Отмена</button>
              <button onClick={handlePrint} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                <i className="fas fa-print"></i> Распечатать / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 no-print" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 no-print" onClick={(e) => e.stopPropagation()}>
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
