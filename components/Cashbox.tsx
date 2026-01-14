import React, { useState } from 'react';
import { CashEntry, Customer, Supplier } from '../types';

interface CashboxProps {
  entries: CashEntry[];
  customers: Customer[];
  suppliers: Supplier[];
  onAdd: (e: CashEntry) => void;
  onUpdateCustomer?: (c: Customer) => void;
  onUpdateSupplier?: (s: Supplier) => void;
}

const Cashbox: React.FC<CashboxProps> = ({ 
  entries, 
  customers, 
  suppliers, 
  onAdd,
  onUpdateCustomer,
  onUpdateSupplier 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [isClientPayment, setIsClientPayment] = useState(false);
  const [isSupplierPayment, setIsSupplierPayment] = useState(false);
  const [formData, setFormData] = useState<Partial<CashEntry>>({
    type: 'EXPENSE',
    category: 'Хозрасходы'
  });

  const total = entries.reduce((acc, e) => acc + (e.type === 'INCOME' ? e.amount : -e.amount), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || formData.amount <= 0) {
      alert('Укажите корректную сумму');
      return;
    }

    if (isClientPayment && !formData.customerId) {
      alert('Выберите клиента');
      return;
    }

    if (isSupplierPayment && !formData.supplierId) {
      alert('Выберите поставщика');
      return;
    }

    let finalCategory = formData.category || 'Общее';
    if (isClientPayment) finalCategory = 'Оплата от клиента';
    if (isSupplierPayment) finalCategory = 'Оплата поставщику';

    const newEntry: CashEntry = {
      ...formData as CashEntry,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      category: finalCategory
    };

    // 1. Добавляем запись в кассу
    onAdd(newEntry);

    // 2. Обновляем долг КЛИЕНТА (если оплата от клиента)
    if (isClientPayment && formData.customerId && onUpdateCustomer) {
      const customer = customers.find(c => c.id === formData.customerId);
      if (customer) {
        const newDebt = Math.max(0, customer.debt - (formData.amount || 0));
        onUpdateCustomer({ ...customer, debt: newDebt });
      }
    }

    // 3. Обновляем долг ПОСТАВЩИКА (если оплата поставщику)
    if (isSupplierPayment && formData.supplierId && onUpdateSupplier) {
      const supplier = suppliers.find(s => s.id === formData.supplierId);
      if (supplier) {
        // Предполагается: supplier.debt — это сумма, которую ВЫ должны поставщику.
        // При оплате долг уменьшается.
        const newDebt = Math.max(0, supplier.debt - (formData.amount || 0));
        onUpdateSupplier({ ...supplier, debt: newDebt });
      }
    }

    // Сброс формы
    setShowForm(false);
    setIsClientPayment(false);
    setIsSupplierPayment(false);
    setFormData({ type: 'EXPENSE', category: 'Хозрасходы' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-lg text-center">
        <p className="text-indigo-100 text-sm uppercase tracking-widest font-bold">Остаток в кассе</p>
        <p className="text-5xl font-black mt-2">{total.toLocaleString()} ₽</p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Операции</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-slate-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
          {showForm ? 'Отмена' : '+ Новая запись'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[32px] shadow-md border border-slate-200 grid gap-4 animate-slide-up">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              type="button" 
              className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest ${formData.type === 'INCOME' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`} 
              onClick={() => { 
                setFormData({...formData, type: 'INCOME', category: 'Прочее'}); 
                setIsSupplierPayment(false); 
              }}
            >
              Приход
            </button>
            <button 
              type="button" 
              className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest ${formData.type === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`} 
              onClick={() => { 
                setFormData({...formData, type: 'EXPENSE', category: 'Хозрасходы'}); 
                setIsClientPayment(false); 
              }}
            >
              Расход
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Сумма</label>
              <input 
                type="number" 
                required 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-lg" 
                value={formData.amount || ''} 
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
              />
            </div>

            <div className="space-y-1">
              {formData.type === 'INCOME' ? (
                <>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex justify-between">
                    <span>Категория / Клиент</span>
                    <button 
                      type="button" 
                      onClick={() => setIsClientPayment(!isClientPayment)} 
                      className={`text-[8px] font-black border px-1 rounded transition-colors ${isClientPayment ? 'bg-indigo-600 border-indigo-600 text-white' : 'text-indigo-600 border-indigo-200'}`}
                    >
                      ОТ КЛИЕНТА
                    </button>
                  </label>
                  {isClientPayment ? (
                    <select 
                      required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                      value={formData.customerId || ''} 
                      onChange={e => setFormData({...formData, customerId: e.target.value})}
                    >
                      <option value="">Выберите клиента...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.debt > 0 ? `(Долг: ${c.debt} ₽)` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                      placeholder="Напр: Инвестиции" 
                      value={formData.category || ''} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    />
                  )}
                </>
              ) : (
                <>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex justify-between">
                    <span>Категория / Поставщик</span>
                    <button 
                      type="button" 
                      onClick={() => setIsSupplierPayment(!isSupplierPayment)} 
                      className={`text-[8px] font-black border px-1 rounded transition-colors ${isSupplierPayment ? 'bg-orange-500 border-orange-500 text-white' : 'text-orange-500 border-orange-200'}`}
                    >
                      ПОСТАВЩИКУ
                    </button>
                  </label>
                  {isSupplierPayment ? (
                    <select 
                      required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                      value={formData.supplierId || ''} 
                      onChange={e => setFormData({...formData, supplierId: e.target.value})}
                    >
                      <option value="">Кому платим...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.debt > 0 ? `(Долг: ${s.debt} ₽)` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                      placeholder="Напр: Аренда" 
                      value={formData.category || ''} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Описание</label>
            <input 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" 
              placeholder="Дополнительно..." 
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            className="bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 mt-2"
          >
            ЗАПИСАТЬ ОПЕРАЦИЮ
          </button>
        </form>
      )}

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {entries.map(e => {
          const clientName = e.customerId ? customers.find(c => c.id === e.customerId)?.name : '';
          const supplierName = e.supplierId ? suppliers.find(s => s.id === e.supplierId)?.name : '';
          return (
            <div key={e.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-2xl ${e.type === 'INCOME' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                  <i className={`fas ${e.type === 'INCOME' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    {e.category}
                    {(clientName || supplierName) && (
                      <span className="text-[10px] text-slate-400 ml-2 font-black uppercase">
                        ({clientName || supplierName})
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">
                    {e.description || 'Без описания'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black text-lg ${e.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {e.type === 'INCOME' ? '+' : '-'}{e.amount.toLocaleString()} ₽
                </p>
                <p className="text-[9px] text-slate-300 font-bold uppercase">
                  {new Date(e.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Cashbox;