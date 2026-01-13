
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Transaction, Supplier, CashEntry } from '../types';

interface WarehouseProps {
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  categories: string[];
  batch: Array<{productId: string, name: string, quantity: number, cost: number}>;
  setBatch: React.Dispatch<React.SetStateAction<Array<{productId: string, name: string, quantity: number, cost: number}>>>;
  onTransaction: (t: Transaction) => void;
  onTransactionsBulk: (ts: Transaction[]) => void;
  onAddCashEntry?: (entry: Omit<CashEntry, 'id' | 'date' | 'employeeId'> & { id?: string }) => void;
  onAddProduct: (p: Product) => void;
}

const Warehouse: React.FC<WarehouseProps> = ({
  products, suppliers, transactions, categories, batch, setBatch,
  onTransaction, onTransactionsBulk, onAddCashEntry, onAddProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBT'>('DEBT');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState(`ВХ-${Date.now().toString().slice(-6)}`);

  // Форма нового товара
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    category: categories[0] || 'Другое',
    price: 0,
    cost: 0,
    unit: 'шт' as any
  });

  // Авто-выбор поставщика
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplier) {
      setSelectedSupplier(suppliers[0].id);
    }
  }, [suppliers]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const low = searchTerm.toLowerCase();
    return products
      .filter(p => p.type !== 'SERVICE' && (p.name.toLowerCase().includes(low) || p.sku.toLowerCase().includes(low)))
      .slice(0, 5);
  }, [searchTerm, products]);

  const addToBatch = (p: Product) => {
    const existing = batch.find(b => b.productId === p.id);
    if (existing) {
      setBatch(batch.map(b => b.productId === p.id ? { ...b, quantity: b.quantity + 1 } : b));
    } else {
      setBatch([...batch, { productId: p.id, name: p.name, quantity: 1, cost: p.cost }]);
    }
    setSearchTerm('');
  };

  const updateBatchItem = (id: string, field: 'quantity' | 'cost', value: number) => {
    setBatch(batch.map(item => item.productId === id ? { ...item, [field]: value } : item));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `P-${Date.now()}`;
    const product: Product = {
      id: newId,
      name: newProd.name,
      sku: `SKU-${Math.floor(Math.random() * 10000)}`,
      category: newProd.category,
      price: newProd.price,
      cost: newProd.cost,
      quantity: 0,
      minStock: 5,
      unit: newProd.unit,
      type: 'PRODUCT'
    };
    onAddProduct(product);
    setBatch([...batch, { productId: newId, name: product.name, quantity: 1, cost: product.cost }]);
    setShowNewProductForm(false);
    setNewProd({ name: '', category: categories[0] || 'Другое', price: 0, cost: 0, unit: 'шт' });
  };

  const handlePostDocument = () => {
    if (batch.length === 0) return;
    if (!selectedSupplier) { alert('Выберите поставщика!'); return; }

    const batchId = `BATCH-${Date.now()}`;
    const supplier = suppliers.find(s => s.id === selectedSupplier);

    const ts: Transaction[] = batch.map(item => ({
      id: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: item.productId,
      supplierId: selectedSupplier,
      type: 'IN',
      quantity: item.quantity,
      pricePerUnit: item.cost,
      paymentMethod,
      date: receiptDate + 'T' + new Date().toLocaleTimeString('en-GB'),
      note: `Документ №${docNumber}. Поставщик: ${supplier?.name}`,
      employeeId: 'admin',
      batchId
    }));

    if (paymentMethod === 'CASH' && onAddCashEntry) {
      const totalCost = batch.reduce((acc, i) => acc + (i.quantity * i.cost), 0);
      onAddCashEntry({
        amount: totalCost,
        type: 'EXPENSE',
        category: 'Закуп товара',
        description: `Оплата по док. №${docNumber} (${supplier?.name})`,
        supplierId: selectedSupplier
      });
    }

    onTransactionsBulk(ts);
    setBatch([]);
    setDocNumber(`ВХ-${Date.now().toString().slice(-6)}`);
    alert('Документ проведен!');
  };

  const totalSum = batch.reduce((acc, i) => acc + (i.quantity * i.cost), 0);

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Шапка документа */}
      <div className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800">Накладная прихода</h2>
          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{docNumber}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Дата операции</label>
            <input
              type="date"
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs"
              value={receiptDate}
              onChange={e => setReceiptDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Поставщик</label>
            <select
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs"
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
            >
              <option value="">Выберите...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
          <button onClick={() => setPaymentMethod('DEBT')} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'DEBT' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400'}`}>В долг</button>
          <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}>Оплачено (из кассы)</button>
        </div>
      </div>

      {/* Поиск и подбор товаров */}
      <div className="relative z-[60]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-4 top-4 text-slate-300"></i>
            <input
              className="w-full p-4 pl-12 rounded-2xl bg-white shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/10 font-medium"
              placeholder="Поиск товара для добавления..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowNewProductForm(true)}
            className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0"
            title="Создать новый товар"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>

        {filteredProducts.length > 0 && (
          <div className="absolute top-16 left-0 right-0 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in divide-y divide-slate-50">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToBatch(p)}
                className="w-full p-4 text-left hover:bg-indigo-50 transition-colors flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{p.category} • Ост: {p.quantity} {p.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-indigo-600">{p.cost} ₽</p>
                  <p className="text-[8px] text-slate-300 font-bold uppercase">Закуп</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Список товаров в документе */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Состав документа ({batch.length})</h3>
          {batch.length > 0 && (
            <button onClick={() => setBatch([])} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">Очистить список</button>
          )}
        </div>

        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {batch.map(item => (
            <div key={item.productId} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <p className="font-bold text-slate-800 text-sm flex-1 pr-4">{item.name}</p>
                <button onClick={() => setBatch(batch.filter(b => b.productId !== item.productId))} className="text-slate-300 hover:text-red-500"><i className="fas fa-times"></i></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Количество</label>
                  <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    <button onClick={() => updateBatchItem(item.productId, 'quantity', Math.max(1, item.quantity - 1))} className="w-10 h-10 flex items-center justify-center text-slate-400"><i className="fas fa-minus text-[10px]"></i></button>
                    <input
                      type="number"
                      className="flex-1 text-center bg-transparent outline-none font-black text-sm"
                      value={item.quantity}
                      onChange={e => updateBatchItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                    <button onClick={() => updateBatchItem(item.productId, 'quantity', item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-slate-400"><i className="fas fa-plus text-[10px]"></i></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Цена закупа (₽)</label>
                  <input
                    type="number"
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-black text-sm text-center text-indigo-600"
                    value={item.cost}
                    onChange={e => updateBatchItem(item.productId, 'cost', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ))}

          {batch.length === 0 && (
            <div className="py-20 text-center text-slate-300 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                <i className="fas fa-file-import text-3xl"></i>
              </div>
              <p className="font-bold text-sm">Документ пуст</p>
              <p className="text-[10px] uppercase font-bold mt-1 max-w-[200px]">Воспользуйтесь поиском выше, чтобы добавить товары</p>
            </div>
          )}
        </div>
      </div>

      {/* Итоговая панель */}
      {batch.length > 0 && (
        <div className="sticky bottom-24 left-0 right-0 bg-indigo-600 text-white p-6 rounded-[32px] flex justify-between items-center shadow-2xl z-50 animate-slide-up">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase opacity-60">Итого к приходу</p>
            <p className="text-2xl font-black">{totalSum.toLocaleString()} ₽</p>
          </div>
          <button
            onClick={handlePostDocument}
            className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all"
          >
            ПРОВЕСТИ
          </button>
        </div>
      )}

      {/* Модалка быстрого создания товара */}
      {showNewProductForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <form onSubmit={handleCreateProduct} className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-slide-up space-y-5">
            <h3 className="text-xl font-black text-slate-800 text-center">Создать и добавить</h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Название</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} placeholder="Напр: Платье белое" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Категория</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold" value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ед. изм.</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold" value={newProd.unit} onChange={e => setNewProd({...newProd, unit: e.target.value as any})}>
                    <option value="шт">шт</option>
                    <option value="кг">кг</option>
                    <option value="упак">упак</option>
                    <option value="л">л</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Цена закупа</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-indigo-600" value={newProd.cost || ''} onChange={e => setNewProd({...newProd, cost: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Цена продажи</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-emerald-600" value={newProd.price || ''} onChange={e => setNewProd({...newProd, price: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowNewProductForm(false)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-3xl font-black shadow-lg shadow-indigo-100">СОЗДАТЬ</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
