
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
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBT'>('DEBT');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Состояния для оверлея оприходования (количество и цена закупа)
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<number>(1);
  const [inputCost, setInputCost] = useState<number>(0);

  // Состояние для формы нового товара
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState(categories[0] || 'Другое');
  const [newProdPrice, setNewProdPrice] = useState<number>(0);
  const [newProdCost, setNewProdCost] = useState<number>(0);

  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplier) {
      const defaultSupplier = suppliers.find(s => s.name.toLowerCase().includes('поставщик'));
      if (defaultSupplier) setSelectedSupplier(defaultSupplier.id);
    }
  }, [suppliers]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.type !== 'SERVICE');
    if (selectedCategory) result = result.filter(p => p.category === selectedCategory);
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lowSearch) || p.sku.toLowerCase().includes(lowSearch));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory, searchTerm, products]);

  const openAddModal = (p: Product) => {
    setActiveProduct(p);
    setInputQty(1);
    setInputCost(p.cost);
  };

  const confirmAddToBatch = () => {
    if (!activeProduct) return;
    const existing = batch.find(b => b.productId === activeProduct.id);
    if (existing) {
      setBatch(batch.map(b => b.productId === activeProduct.id ? { ...b, quantity: b.quantity + inputQty, cost: inputCost } : b));
    } else {
      setBatch([...batch, { productId: activeProduct.id, name: activeProduct.name, quantity: inputQty, cost: inputCost }]);
    }
    setActiveProduct(null);
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName) return;
    const newId = `P-${Date.now()}`;
    const newP: Product = {
      id: newId,
      name: newProdName,
      sku: `SKU-${Math.floor(Math.random()*10000)}`,
      category: newProdCat,
      price: newProdPrice,
      cost: newProdCost,
      quantity: 0,
      minStock: 5,
      unit: 'шт',
      type: 'PRODUCT'
    };
    onAddProduct(newP);
    setBatch([...batch, { productId: newId, name: newProdName, quantity: 1, cost: newProdCost }]);
    setShowNewProductForm(false);
    setNewProdName('');
    setNewProdPrice(0);
    setNewProdCost(0);
  };

  const handleConfirmBatch = () => {
    if (batch.length === 0) return;
    if (!selectedSupplier) { alert('Пожалуйста, выберите поставщика!'); return; }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    const ts: Transaction[] = batch.map(b => ({
      id: `TR-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
      productId: b.productId,
      supplierId: selectedSupplier,
      type: 'IN',
      quantity: b.quantity,
      pricePerUnit: b.cost,
      paymentMethod: paymentMethod,
      date: receiptDate + 'T' + new Date().toLocaleTimeString('en-GB'),
      note: note || `Приход: ${supplier?.name}`,
      employeeId: 'admin'
    }));

    if (paymentMethod === 'CASH' && onAddCashEntry) {
      ts.forEach(t => {
        onAddCashEntry({
          id: `EXP-${t.id}`,
          amount: t.quantity * (t.pricePerUnit || 0),
          type: 'EXPENSE',
          category: 'Закуп товара',
          description: `Оплата за ${batch.find(b => b.productId === t.productId)?.name} (${supplier?.name})`,
          supplierId: selectedSupplier
        });
      });
    }

    onTransactionsBulk(ts);
    setBatch([]);
    setNote('');
    alert('Товары успешно приняты!');
  };

  const totalAmount = batch.reduce((acc, b) => acc + (b.quantity * b.cost), 0);

  return (
    <div className="space-y-6 pb-32">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-slate-800">Приход товара</h2>
        <button
          onClick={() => setShowNewProductForm(true)}
          className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-100"
        >
          + Новый товар
        </button>
      </div>

      {/* Умный поиск и Категории */}
      <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
          <input
            className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/10 font-medium transition-all"
            placeholder="Поиск товара или артикула..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${!selectedCategory ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100'}`}
          >
            Все
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Сетка товаров для выбора */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filteredProducts.map(p => (
          <button
            key={p.id}
            onClick={() => openAddModal(p)}
            className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-left active:scale-95 transition-all group hover:border-indigo-300"
          >
            <div className="text-[8px] font-black text-slate-300 uppercase mb-1 truncate">{p.category}</div>
            <div className="font-bold text-slate-800 text-xs line-clamp-2 min-h-[32px] group-hover:text-indigo-600">{p.name}</div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
              <span className="text-[10px] font-black text-indigo-500">{p.quantity} {p.unit}</span>
              <span className="text-[10px] font-black text-slate-400">{p.cost} ₽</span>
            </div>
          </button>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-300 italic text-sm">Ничего не найдено</div>
        )}
      </div>

      {/* Список оприходования (Batch) */}
      {batch.length > 0 && (
        <div className="bg-white p-6 rounded-[40px] shadow-2xl border border-indigo-100 space-y-6 animate-slide-up sticky bottom-24 z-50">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-list-ul text-indigo-500"></i> Список прихода ({batch.length})
            </h3>
            <button onClick={() => setBatch([])} className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center"><i className="fas fa-times text-xs"></i></button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
            {batch.map(item => (
              <div key={item.productId} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[9px] text-indigo-500 font-black uppercase">{item.quantity} шт. x {item.cost} ₽</p>
                </div>
                <button onClick={() => setBatch(batch.filter(b => b.productId !== item.productId))} className="text-red-300"><i className="fas fa-minus-circle"></i></button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Дата прихода</label>
              <input
                type="date"
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Поставщик</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                <option value="">-- Выбор --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
             <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'CASH' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Оплачено</button>
             <button onClick={() => setPaymentMethod('DEBT')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'DEBT' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400'}`}>В долг</button>
          </div>

          <button onClick={handleConfirmBatch} className="w-full bg-indigo-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 flex justify-between items-center">
            <div className="text-left"><p className="text-[8px] opacity-60">Итого приход</p><p className="text-xl">{totalAmount.toLocaleString()} ₽</p></div>
            <span className="bg-white/20 px-4 py-2 rounded-xl text-xs">ПРИНЯТЬ</span>
          </button>
        </div>
      )}

      {/* Модалка ввода количества и цены закупа */}
      {activeProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-slide-up space-y-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{activeProduct.category}</p>
              <h3 className="text-xl font-black text-slate-800">{activeProduct.name}</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Кол-во к оприходованию</label>
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl h-14 overflow-hidden">
                  <button onClick={() => setInputQty(Math.max(1, inputQty - 1))} className="px-5 h-full text-slate-400 active:bg-slate-200"><i className="fas fa-minus"></i></button>
                  <input type="number" step="any" className="w-full text-center bg-transparent outline-none font-black text-lg" value={inputQty} onChange={e => setInputQty(parseFloat(e.target.value) || 0)} />
                  <button onClick={() => setInputQty(inputQty + 1)} className="px-5 h-full text-slate-400 active:bg-slate-200"><i className="fas fa-plus"></i></button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Цена закупа (₽/ед)</label>
                <input type="number" step="0.01" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-lg text-center" value={inputCost} onChange={e => setInputCost(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setActiveProduct(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button onClick={confirmAddToBatch} className="flex-1 bg-indigo-600 text-white py-4 rounded-3xl font-black shadow-lg">ДОБАВИТЬ</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания нового товара */}
      {showNewProductForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleCreateAndAdd} className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-slide-up space-y-5">
            <h3 className="text-xl font-black text-slate-800 text-center">Быстрое создание</h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Название товара</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium" placeholder="Напр: Платье синее" value={newProdName} onChange={e => setNewProdName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Папка</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newProdCat} onChange={e => setNewProdCat(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Цена закупа</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={newProdCost || ''} onChange={e => setNewProdCost(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Цена продажи</label>
                  <input type="number" className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none font-black text-indigo-600" value={newProdPrice || ''} onChange={e => setNewProdPrice(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowNewProductForm(false)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-3xl font-black shadow-lg">СОЗДАТЬ</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
