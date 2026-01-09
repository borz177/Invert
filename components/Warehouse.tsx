
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Transaction, Supplier } from '../types';

interface WarehouseProps {
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  batch: Array<{productId: string, name: string, quantity: number, cost: number}>;
  setBatch: React.Dispatch<React.SetStateAction<Array<{productId: string, name: string, quantity: number, cost: number}>>>;
  onTransaction: (t: Transaction) => void;
  onTransactionsBulk: (ts: Transaction[]) => void;
}

const Warehouse: React.FC<WarehouseProps> = ({ products, suppliers, transactions, batch, setBatch, onTransaction, onTransactionsBulk }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBT'>('DEBT');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  // Автоматический выбор поставщика с именем "Поставщик"
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplier) {
      const defaultSupplier = suppliers.find(s => s.name.toLowerCase() === 'поставщик');
      if (defaultSupplier) {
        setSelectedSupplier(defaultSupplier.id);
      }
    }
  }, [suppliers, selectedSupplier]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter(p => p.category === selectedCategory).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory, products]);

  const addToBatch = () => {
    if (!selectedProduct) return;
    const prod = products.find(p => p.id === selectedProduct);
    if (!prod) return;

    const existing = batch.find(b => b.productId === selectedProduct);
    if (existing) {
      setBatch(batch.map(b => b.productId === selectedProduct ? {...b, quantity: b.quantity + quantity} : b));
    } else {
      setBatch([...batch, { productId: selectedProduct, name: prod.name, quantity, cost: prod.cost }]);
    }
    setQuantity(1);
    setSelectedProduct('');
  };

  const removeFromBatch = (id: string) => {
    setBatch(batch.filter(b => b.productId !== id));
  };

  const handleConfirmBatch = () => {
    if (batch.length === 0) return;
    if (!selectedSupplier) { alert('Пожалуйста, выберите поставщика!'); return; }

    const ts: Transaction[] = batch.map(b => ({
      id: Math.random().toString(36).substr(2, 9),
      productId: b.productId,
      supplierId: selectedSupplier,
      type: 'IN',
      quantity: b.quantity,
      pricePerUnit: b.cost,
      paymentMethod: paymentMethod,
      date: new Date().toISOString(),
      note: note || `Приход: ${suppliers.find(s => s.id === selectedSupplier)?.name}`,
      employeeId: ''
    }));

    onTransactionsBulk(ts);
    setNote('');
    alert('Все товары приняты на склад!');
  };

  const totalAmount = batch.reduce((acc, b) => acc + (b.quantity * b.cost), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 px-1">Приход на склад</h2>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-5 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Категория</label>
            <select
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 font-medium transition-all"
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedProduct('');
              }}
            >
              <option value="">-- Выберите папку --</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Товар</label>
            <select
              disabled={!selectedCategory}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 font-medium transition-all disabled:opacity-50"
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
            >
              <option value="">{selectedCategory ? `-- Выберите товар --` : `Сначала выберите папку`}</option>
              {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} (ост: {p.quantity})</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Кол-во</label>
            <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden h-14">
               <button onClick={() => setQuantity(Math.max(1, quantity-1))} className="px-5 h-full text-slate-400 active:bg-slate-200 transition-colors"><i className="fas fa-minus"></i></button>
               <input type="number" className="w-full text-center bg-transparent outline-none font-bold text-slate-700" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} />
               <button onClick={() => setQuantity(quantity+1)} className="px-5 h-full text-slate-400 active:bg-slate-200 transition-colors"><i className="fas fa-plus"></i></button>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={addToBatch}
              disabled={!selectedProduct}
              className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black active:scale-95 disabled:opacity-30 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs"
            >
              В список
            </button>
          </div>
        </div>
      </div>

      {batch.length > 0 && (
        <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 space-y-5 animate-slide-up shadow-sm">
          <div className="flex justify-between items-center">
             <h3 className="font-black text-indigo-900 text-sm uppercase tracking-wider">Список прихода ({batch.length})</h3>
             <button onClick={() => setBatch([])} className="text-[10px] font-black text-indigo-400 uppercase hover:text-indigo-600 transition-colors">Очистить</button>
          </div>
          <div className="space-y-2">
            {batch.map(item => (
              <div key={item.productId} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                 <div className="flex-1">
                   <p className="text-sm font-bold text-slate-800">{item.name}</p>
                   <p className="text-[10px] text-indigo-500 font-black uppercase tracking-tighter">Будет зачислено: {item.quantity} шт. на {(item.quantity * item.cost).toLocaleString()} ₽</p>
                 </div>
                 <button onClick={() => removeFromBatch(item.productId)} className="text-red-300 hover:text-red-500 transition-colors p-2"><i className="fas fa-trash-alt"></i></button>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-2 border-t border-indigo-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Поставщик</label>
                <select required className="w-full p-4 bg-white border border-indigo-100 rounded-2xl outline-none text-sm font-bold text-slate-600" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                  <option value="">-- КТО ПРИВЕЗ --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Оплата</label>
                <div className="flex bg-white border border-indigo-100 p-1 rounded-2xl">
                   <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'CASH' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>Оплачено</button>
                   <button onClick={() => setPaymentMethod('DEBT')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'DEBT' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>В долг</button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Комментарий</label>
              <input className="w-full p-4 bg-white border border-indigo-100 rounded-2xl outline-none text-sm font-medium" placeholder="Примечание/Накладная..." value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div className="bg-white p-5 rounded-3xl flex justify-between items-center border border-indigo-100">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Итого к зачету</p>
                  <p className="text-2xl font-black text-slate-800">{totalAmount.toLocaleString()} ₽</p>
               </div>
               <button onClick={handleConfirmBatch} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest text-xs">
                 ПРИНЯТЬ
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 pb-10">
        <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest px-2">Последние приходы</h3>
        {transactions.filter(t => t.type === 'IN').slice(0, 5).map(t => {
          const prod = products.find(p => p.id === t.productId);
          return (
            <div key={t.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-50 flex items-center justify-between hover:border-emerald-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><i className="fas fa-arrow-down text-sm"></i></div>
                <div>
                  <p className="font-bold text-sm text-slate-800 line-clamp-1">{prod?.name || '---'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(t.date).toLocaleDateString()} • {t.paymentMethod === 'CASH' ? 'Оплачено' : 'В долг'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-600 text-lg">+{t.quantity}</p>
                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">{prod?.unit || 'шт.'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Warehouse;
