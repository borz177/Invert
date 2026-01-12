
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
  onUpdateSale: (s: Sale) => void;
  ownerId?: string;
  ownerName?: string;
  canDelete?: boolean;
}

const AllOperations: React.FC<AllOperationsProps> = ({
  sales, transactions, cashEntries, products, employees, customers, settings,
  onUpdateTransaction, onDeleteTransaction, onDeleteSale, onDeleteCashEntry, onUpdateSale,
  ownerId, ownerName, canDelete = false
}) => {
  const [filter, setFilter] = useState<'ALL' | 'SALES' | 'STOCK' | 'CASH'>('ALL');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [printModalSale, setPrintModalSale] = useState<Sale | null>(null);

  const getEmployeeName = (id: string) => {
    if (!id) return '---';
    if (id === 'admin' || id === ownerId || id === '00000000-0000-0000-0000-000000000000') {
      return ownerName || 'Владелец';
    }
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Сотрудник';
  };

  const getCustomerName = (id?: string) => customers.find(c => c.id === id)?.name || 'Розничный клиент';
  const getSupplierName = (id?: string) => customers.find(s => (s as any).id === id)?.name || 'Поставщик';

  const handlePrintReceipt = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const shopName = settings?.shopName || "Магазин";

    const receiptHtml = `
      <div style="font-family: 'Courier New', Courier, monospace; width: 300px; padding: 20px; color: #000; font-size: 12px; line-height: 1.4;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${shopName.toUpperCase()}</h2>
          <p style="margin: 5px 0;">ТОВАРНЫЙ ЧЕК</p>
          <p style="margin: 0; font-size: 10px;">№ ${sale.id.slice(-6)} от ${new Date(sale.date).toLocaleString()}</p>
        </div>
        
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="text-align: left; font-size: 10px;">
                <th style="padding-bottom: 5px;">Наименование</th>
                <th style="text-align: right; padding-bottom: 5px;">Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => {
                const p = products.find(prod => prod.id === item.productId);
                return `
                  <tr>
                    <td style="padding-bottom: 3px;">
                      ${p?.name || 'Товар'}<br/>
                      <small>${item.quantity} x ${item.price} ₽</small>
                    </td>
                    <td style="text-align: right; vertical-align: top;">${(item.quantity * item.price).toLocaleString()} ₽</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-bottom: 10px;">
          <span>ИТОГО:</span>
          <span>${sale.total.toLocaleString()} ₽</span>
        </div>

        <div style="font-size: 10px; border-top: 1px solid #eee; padding-top: 10px;">
          <p style="margin: 2px 0;">Оплата: ${sale.paymentMethod === 'CASH' ? 'Наличные' : sale.paymentMethod === 'CARD' ? 'Карта' : 'В долг'}</p>
          <p style="margin: 2px 0;">Клиент: ${customer?.name || 'Розничный клиент'}</p>
          <p style="margin: 2px 0;">Продавец: ${getEmployeeName(sale.employeeId)}</p>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 10px;">
          <p>Спасибо за покупку!</p>
        </div>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `receipt-${sale.id.slice(-6)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    window.html2pdf().from(receiptHtml).set(opt).save();
    setPrintModalSale(null);
  };

  const handlePrintInvoice = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const shopName = settings?.shopName || "Магазин";
    const dateStr = new Date(sale.date).toLocaleDateString();

    const invoiceHtml = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; font-size: 12px; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${shopName}</h1>
          <p style="margin: 5px 0; font-size: 16px; letter-spacing: 2px;">РАСХОДНАЯ НАКЛАДНАЯ № ${sale.id.slice(-6)}</p>
          <p style="margin: 0; font-size: 12px;">от ${dateStr}</p>
        </div>

        <div style="margin-bottom: 30px;">
          <p style="margin: 5px 0;"><strong>Поставщик:</strong> ${shopName}</p>
          <p style="margin: 5px 0;"><strong>Получатель:</strong> ${customer?.name || 'Розничный клиент'} ${customer?.phone ? `(${customer.phone})` : ''}</p>
          <p style="margin: 5px 0;"><strong>Основание:</strong> Продажа №${sale.id.slice(-6)} (${sale.paymentMethod === 'CASH' ? 'Наличные' : sale.paymentMethod === 'CARD' ? 'Карта' : 'В долг'})</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 40px;">№</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Товары (работы, услуги)</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 60px;">Кол-во</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 40px;">Ед.</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right; width: 80px;">Цена</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right; width: 90px;">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map((item, index) => {
              const p = products.find(prod => prod.id === item.productId);
              return `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">${p?.name || 'Товар'}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${p?.unit || 'шт'}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${item.price.toLocaleString()}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${(item.quantity * item.price).toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold;">Итого:</td>
              <td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold;">${sale.total.toLocaleString()} ₽</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div style="width: 45%;">
            <p style="margin-bottom: 20px;">Отпустил: ___________________ / ${getEmployeeName(sale.employeeId)}</p>
            <p style="font-size: 10px; color: #666;">М.П. (при наличии)</p>
          </div>
          <div style="width: 45%;">
            <p style="margin-bottom: 20px;">Получил: ___________________ / ${customer?.name || '________________'}</p>
          </div>
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `invoice-${sale.id.slice(-6)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    window.html2pdf().from(invoiceHtml).set(opt).save();
    setPrintModalSale(null);
  };

  const operations = useMemo(() => {
    const list: any[] = [];
    if (filter === 'ALL' || filter === 'SALES') {
      sales.forEach(s => list.push({
        id: s.id, date: s.date, type: 'SALE',
        title: `Продажа №${s.id.slice(-4)}`,
        targetName: getCustomerName(s.customerId),
        targetIcon: 'fa-user',
        subtitle: `${s.items.length} поз. • ${s.paymentMethod === 'CASH' ? 'Нал' : s.paymentMethod === 'CARD' ? 'Карта' : 'В долг'}`,
        amount: s.total, isPositive: true, icon: 'fa-shopping-cart',
        color: s.paymentMethod === 'DEBT' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
        isDeleted: s.isDeleted, responsible: getEmployeeName(s.employeeId), raw: s
      }));
    }
    if (filter === 'ALL' || filter === 'STOCK') {
      transactions.forEach(t => {
        const p = products.find(prod => prod.id === t.productId);
        list.push({
          id: t.id, date: t.date, type: 'STOCK',
          title: t.type === 'IN' ? 'Приход товара' : 'Расход товара',
          targetName: t.supplierId ? getSupplierName(t.supplierId) : 'Складской учет',
          targetIcon: 'fa-truck',
          subtitle: `${p?.name || '---'} • ${t.quantity} ${p?.unit || 'шт.'}`,
          amount: 0, isPositive: t.type === 'IN', icon: t.type === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up',
          color: t.type === 'IN' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600',
          isDeleted: t.isDeleted, responsible: getEmployeeName(t.employeeId), raw: t
        });
      });
    }
    if (filter === 'ALL' || filter === 'CASH') {
      cashEntries.forEach(c => {
        if (filter === 'ALL' && c.category === 'Продажа') return;
        list.push({
          id: c.id, date: c.date, type: 'CASH', title: c.category, subtitle: c.description,
          targetName: c.customerId ? getCustomerName(c.customerId) : (c.supplierId ? getSupplierName(c.supplierId) : null),
          targetIcon: c.customerId ? 'fa-user' : 'fa-truck',
          amount: c.amount, isPositive: c.type === 'INCOME', icon: c.type === 'INCOME' ? 'fa-wallet' : 'fa-hand-holding-dollar',
          color: c.type === 'INCOME' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600',
          responsible: getEmployeeName(c.employeeId), raw: c
        });
      });
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, transactions, cashEntries, products, employees, filter, customers, ownerId, ownerName]);

  const handleEditSaleItem = (productId: string, field: 'quantity' | 'price', val: number) => {
    if (!editingSale) return;
    const newItems = editingSale.items.map(it => it.productId === productId ? { ...it, [field]: val } : it);
    const newTotal = newItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    setEditingSale({ ...editingSale, items: newItems, total: newTotal });
  };

  const handleSaleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSale) {
      onUpdateSale(editingSale);
      setEditingSale(null);
      setActiveMenuId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20" onClick={() => setActiveMenuId(null)}>
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-slate-800">История</h2>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{operations.length} опер.</div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'ALL', label: 'Все', icon: 'fa-layer-group' },
          { id: 'SALES', label: 'Продажи', icon: 'fa-shopping-bag' },
          { id: 'STOCK', label: 'Склад', icon: 'fa-warehouse' },
          { id: 'CASH', label: 'Касса', icon: 'fa-cash-register' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as any)} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider border transition-all shrink-0 ${filter === f.id ? 'bg-indigo-600 text-white shadow-md border-indigo-600' : 'bg-white text-slate-400 border-slate-100'}`}>
            <i className={`fas ${f.icon}`}></i><span>{f.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 divide-y divide-slate-50">
        {operations.map((op) => (
          <div key={`${op.type}-${op.id}`} className="p-5 flex items-center gap-4 relative hover:bg-slate-50 transition-colors">
            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${op.color} shadow-sm shrink-0`}><i className={`fas ${op.icon} text-lg`}></i></div>
            <div className="flex-1 min-w-0">
              {op.targetName && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <i className={`fas ${op.targetIcon} scale-75`}></i> {op.targetName}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="font-bold text-slate-800 text-sm truncate">{op.title}</h4>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate mb-1">{op.subtitle}</p>
              <div className="flex items-center gap-2">
                <span className="text-[7px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 font-black uppercase tracking-widest">Отв: {op.responsible}</span>
              </div>
            </div>
            <div className="text-right shrink-0 flex items-center gap-2">
              <div className="flex flex-col items-end">
                <p className={`font-black text-sm whitespace-nowrap ${op.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {op.amount > 0 ? (op.isPositive ? '+' : '-') : ''}{op.amount > 0 ? op.amount.toLocaleString() + ' ₽' : 'Учет'}
                </p>
                <p className="text-[9px] text-slate-300 font-bold uppercase">{new Date(op.date).toLocaleDateString()}</p>
              </div>
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === `${op.type}-${op.id}` ? null : `${op.type}-${op.id}`); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 active:bg-slate-200"><i className="fas fa-ellipsis-v text-[10px]"></i></button>
                {activeMenuId === `${op.type}-${op.id}` && (
                  <div className="absolute top-10 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 w-48 z-[100] animate-fade-in">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedDetail(op.raw); setActiveMenuId(null); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-info-circle text-indigo-400"></i> Детали</button>
                    {op.type === 'SALE' && (
                      <button onClick={(e) => { e.stopPropagation(); setPrintModalSale(op.raw); setActiveMenuId(null); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-t border-slate-50"><i className="fas fa-print text-indigo-400"></i> Печать...</button>
                    )}
                    {op.type === 'SALE' && canDelete && (
                      <button onClick={(e) => { e.stopPropagation(); setEditingSale(op.raw); setActiveMenuId(null); }} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-t border-slate-50"><i className="fas fa-pen text-indigo-400"></i> Редактировать</button>
                    )}
                    {canDelete && (
                      <button onClick={(e) => { e.stopPropagation(); if(confirm('Удалить операцию?')) { if(op.type==='SALE') onDeleteSale(op.id); else if(op.type==='STOCK') onDeleteTransaction(op.id); else onDeleteCashEntry(op.id); } }} className="w-full px-4 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 border-t border-slate-50"><i className="fas fa-trash"></i> Удалить</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {operations.length === 0 && <div className="py-20 text-center text-slate-300 italic">Операций пока нет</div>}
      </div>

      {printModalSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4" onClick={() => setPrintModalSale(null)}>
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm space-y-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-800">Выберите тип документа</h3>
              <p className="text-xs text-slate-400 mt-1 font-bold">Продажа №{printModalSale.id.slice(-6)}</p>
            </div>
            <div className="grid gap-3">
              <button onClick={() => handlePrintReceipt(printModalSale)} className="w-full bg-white border-2 border-slate-100 p-5 rounded-3xl flex items-center gap-4 hover:bg-slate-50 transition-all group">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <i className="fas fa-receipt text-xl"></i>
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-800">Кассовый чек</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Формат 80мм</p>
                </div>
              </button>
              <button onClick={() => handlePrintInvoice(printModalSale)} className="w-full bg-white border-2 border-slate-100 p-5 rounded-3xl flex items-center gap-4 hover:bg-slate-50 transition-all group">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <i className="fas fa-file-invoice text-xl"></i>
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-800">Расходная накладная</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Формат A4 (с подписями)</p>
                </div>
              </button>
            </div>
            <button onClick={() => setPrintModalSale(null)} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Закрыть</button>
          </div>
        </div>
      )}

      {editingSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4" onClick={() => setEditingSale(null)}>
          <form onSubmit={handleSaleUpdateSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-w-md space-y-5 animate-fade-in max-h-[85vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-800 text-center">Редактировать продажу</h3>
            <div className="space-y-4">
              {editingSale.items.map((it, idx) => {
                const p = products.find(prod => prod.id === it.productId);
                return (
                  <div key={idx} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
                    <p className="font-bold text-slate-800 text-sm truncate">{p?.name || 'Товар'}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Кол-во</label>
                        <input type="number" step="any" className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={it.quantity} onChange={e => handleEditSaleItem(it.productId, 'quantity', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Цена (₽)</label>
                        <input type="number" className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={it.price} onChange={e => handleEditSaleItem(it.productId, 'price', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-indigo-600 p-5 rounded-3xl text-white flex justify-between items-center shadow-lg">
              <span className="text-xs font-black uppercase opacity-60">Итого:</span>
              <span className="text-xl font-black">{editingSale.total.toLocaleString()} ₽</span>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">СОХРАНИТЬ ИЗМЕНЕНИЯ</button>
          </form>
        </div>
      )}

      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4" onClick={() => setSelectedDetail(null)}>
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md space-y-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-800">Детали операции</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(selectedDetail.date).toLocaleString()}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Основная информация</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Тип:</span><span className="font-black text-slate-700">{selectedDetail.category || (selectedDetail.items ? 'Продажа' : 'Склад')}</span></div>
                  {selectedDetail.customerId && <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Клиент:</span><span className="font-black text-indigo-600">{getCustomerName(selectedDetail.customerId)}</span></div>}
                  {selectedDetail.supplierId && <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Поставщик:</span><span className="font-black text-orange-600">{getSupplierName(selectedDetail.shopName)}</span></div>}
                  <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Ответственный:</span><span className="font-black text-slate-700">{getEmployeeName(selectedDetail.employeeId)}</span></div>
                </div>
              </div>

              {selectedDetail.items && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Товары</p>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                    {selectedDetail.items.map((it: any, i: number) => {
                      const p = products.find(prod => prod.id === it.productId);
                      return (
                        <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl text-xs">
                          <span className="font-bold text-slate-700 truncate pr-4">{p?.name || '---'}</span>
                          <span className="font-black shrink-0">{it.quantity} x {it.price} ₽</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDetail.amount !== undefined && (
                <div className="bg-indigo-600 p-5 rounded-3xl text-white flex justify-between items-center shadow-lg">
                  <span className="text-xs font-black uppercase opacity-60">Сумма:</span>
                  <span className="text-2xl font-black">{selectedDetail.amount.toLocaleString()} ₽</span>
                </div>
              )}
              {selectedDetail.total !== undefined && (
                <div className="bg-indigo-600 p-5 rounded-3xl text-white flex justify-between items-center shadow-lg">
                  <span className="text-xs font-black uppercase opacity-60">Итого:</span>
                  <span className="text-2xl font-black">{selectedDetail.total.toLocaleString()} ₽</span>
                </div>
              )}
            </div>

            <button onClick={() => setSelectedDetail(null)} className="w-full bg-slate-800 text-white p-4 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest">Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllOperations;
