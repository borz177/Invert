
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Transaction, Supplier, CashEntry } from '../types';

interface WarehouseProps {
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  categories: string[];
  batch: Array<{productId: string, name: string, quantity: number, cost: number, unit: string}>;
  setBatch: React.Dispatch<React.SetStateAction<Array<{productId: string, name: string, quantity: number, cost: number, unit: string}>>>;
  onTransaction: (t: Transaction) => void;
  onTransactionsBulk: (ts: Transaction[]) => void;
  onAddCashEntry?: (entry: Omit<CashEntry, 'id' | 'date' | 'employeeId'> & { id?: string }) => void;
  onAddProduct: (p: Product) => void;
}

const Warehouse: React.FC<WarehouseProps> = ({
  products, suppliers, transactions, categories, batch, setBatch,
  onTransactionsBulk, onAddCashEntry, onAddProduct
}) => {
  const [warehouseTab, setWarehouseTab] = useState<'MANUAL' | 'EXTERNAL'>('MANUAL');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBT'>('DEBT');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDocOpen, setIsDocOpen] = useState(false);

  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<number>(1);
  const [inputCost, setInputCost] = useState<number>(0);

  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    category: categories[0] || 'Другое',
    price: 0,
    cost: 0,
    unit: 'шт' as any
  });

  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplier) {
      setSelectedSupplier(suppliers[0].id);
    }
  }, [suppliers]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.type !== 'SERVICE');
    if (selectedCategory) result = result.filter(p => p.category === selectedCategory);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(low) || p.sku.toLowerCase().includes(low));
    }
    return result;
  }, [selectedCategory, searchTerm, products]);

  const externalPurchases = useMemo(() => {
    return transactions.filter(t => t.type === 'PENDING_IN');
  }, [transactions]);

  const openAddItem = (p: Product) => {
    setActiveItem(p);
    setInputQty(1);
    setInputCost(p.cost);
  };

  const confirmAddToDoc = () => {
    if (!activeItem) return;
    const existing = batch.find(b => b.productId === activeItem.id);
    if (existing) {
      setBatch(batch.map(b => b.productId === activeItem.id ? { ...b, quantity: b.quantity + inputQty, cost: inputCost } : b));
    } else {
      setBatch([...batch, { productId: activeItem.id, name: activeItem.name, quantity: inputQty, cost: inputCost, unit: activeItem.unit }]);
    }
    setActiveItem(null);
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
    setBatch([...batch, { productId: newId, name: product.name, quantity: 1, cost: product.cost, unit: product.unit }]);
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
      note: `Приход. Поставщик: ${supplier?.name}`,
      employeeId: 'admin',
      batchId
    }));

    if (paymentMethod === 'CASH' && onAddCashEntry) {
      const totalCost = batch.reduce((acc, i) => acc + (i.quantity * i.cost), 0);
      onAddCashEntry({
        amount: totalCost,
        type: 'EXPENSE',
        category: 'Закуп товара',
        description: `Оплата поставщику ${supplier?.name}`,
        supplierId: selectedSupplier
      });
    }

    onTransactionsBulk(ts);
    setBatch([]);
    setIsDocOpen(false);
    alert('Оприходование завершено успешно!');
  };

  const totalSum = batch.reduce((acc, i) => acc + (i.quantity * i.cost), 0);

  return (
    <div className="flex flex-col h-full space-y-4 pb-24">
      {/* Вкладки: Ручной ввод / Маркетплейс */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
        <button onClick={() => setWarehouseTab('MANUAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${warehouseTab === 'MANUAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Приемка</button>
        <button onClick={() => setWarehouseTab('EXTERNAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${warehouseTab === 'EXTERNAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>B2B Закупки {externalPurchases.length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded ml-1">{externalPurchases.length}</span>}</button>
      </div>

      {warehouseTab === 'MANUAL' ? (
        <>
          <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Дата</label>
              <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Поставщик</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                <option value="">-- Выберите --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <h2 className="text-xl font-black text-slate-800">{selectedCategory ? <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 text-indigo-600"><i className="fas fa-arrow-left text-sm"></i> {selectedCategory}</button> : 'Выбор товара'}</h2>
            <button onClick={() => setShowNewProductForm(true)} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-100">+ Новый</button>
          </div>

          <div className="relative"><i className="fas fa-search absolute left-4 top-4 text-slate-400"></i><input className="w-full p-4 pl-12 rounded-2xl bg-white shadow-sm border border-slate-100 outline-none" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>

          {!selectedCategory && !searchTerm ? (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center active:scale-95 transition-all">
                  <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3"><i className="fas fa-folder text-2xl"></i></div>
                  <h3 className="font-black text-slate-800 text-sm truncate w-full">{cat}</h3>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-20">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => openAddItem(p)} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-left active:scale-95 transition-all">
                  <div className="text-[8px] font-black text-indigo-400 uppercase mb-1">{p.category}</div>
                  <div className="font-bold text-slate-800 text-xs line-clamp-2 min-h-[32px]">{p.name}</div>
                  <div className="flex justify-between items-end mt-3 pt-2 border-t border-slate-50"><div className="text-[9px] font-black text-slate-400 uppercase">Ост: {p.quantity}</div><div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><i className="fas fa-plus text-xs"></i></div></div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 pb-20">
          <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
            <h4 className="font-black text-indigo-900 text-sm uppercase">Ожидаемые поставки</h4>
            <p className="text-[10px] text-indigo-400 font-bold uppercase mt-1">Заказы, сделанные у других магазинов</p>
          </div>
          <div className="space-y-3">
            {externalPurchases.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center">
                <div className="min-w-0 pr-4">
                  <p className="font-bold text-slate-800 text-sm truncate">{t.note.split('. ').pop()}</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase mt-1">Поставщик: {suppliers.find(s=>s.id===t.supplierId)?.name || 'Маркетплейс'}</p>
                  <p className="text-[9px] font-black text-indigo-500 mt-0.5">Сумма: {(t.quantity * (t.pricePerUnit || 0)).toLocaleString()} ₽</p>
                </div>
                <button className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[8px] font-black uppercase shadow-lg active:scale-95" onClick={() => alert('В демо: при приемке этот товар должен быть сопоставлен с вашим каталогом или создан как новый.')}>Принять</button>
              </div>
            ))}
            {externalPurchases.length === 0 && <div className="py-20 text-center text-slate-300 italic text-sm">Внешних заказов пока нет</div>}
          </div>
        </div>
      )}

      {/* Плавающая корзина прихода */}
      {batch.length > 0 && warehouseTab === 'MANUAL' && (
        <div className="fixed bottom-24 left-4 right-4 z-[80] animate-slide-up">
          <button onClick={() => setIsDocOpen(true)} className="w-full bg-slate-800 text-white p-5 rounded-[32px] shadow-2xl flex justify-between items-center">
            <div className="flex items-center gap-4"><div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black">{batch.length}</div><div><p className="text-[10px] font-black uppercase opacity-60">Новое поступление</p><p className="text-lg font-black">{totalSum.toLocaleString()} ₽</p></div></div>
            <div className="bg-indigo-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Просмотр</div>
          </button>
        </div>
      )}

      {/* Модалки (AddItem, NewProduct, DocOpen) – без изменений, но закрыты условиями или переиспользованы */}
      {activeItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl p-8 space-y-6">
            <div className="text-center"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1">{activeItem.category}</p><h3 className="text-xl font-black text-slate-800">{activeItem.name}</h3></div>
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Количество ({activeItem.unit})</label><input type="number" step="any" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center font-black text-lg" value={inputQty} onChange={e => setInputQty(parseFloat(e.target.value) || 0)} /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Цена закупа</label><input type="number" step="0.01" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center font-black text-lg text-indigo-600" value={inputCost} onChange={e => setInputCost(parseFloat(e.target.value) || 0)} /></div>
            </div>
            <div className="flex gap-3"><button onClick={() => setActiveItem(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button><button onClick={confirmAddToDoc} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">ДОБАВИТЬ</button></div>
          </div>
        </div>
      )}

      {isDocOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-6 flex flex-col max-h-[90vh] animate-slide-up">
            <div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black text-slate-800">Состав приемки</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Всего: {batch.length} поз.</p></div><button onClick={() => setIsDocOpen(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times text-xl"></i></button></div>
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => setPaymentMethod('CASH')} className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase ${paymentMethod === 'CASH' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-100 text-slate-400'}`}>Оплачено</button>
                <button onClick={() => setPaymentMethod('DEBT')} className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase ${paymentMethod === 'DEBT' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-slate-100 text-slate-400'}`}>В долг</button>
              </div>
              {batch.map(item => (<div key={item.productId} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"><div className="min-w-0 flex-1 pr-4"><p className="font-bold text-slate-800 text-sm truncate">{item.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit} x {item.cost} ₽</p></div><button onClick={() => setBatch(batch.filter(b => b.productId !== item.productId))} className="text-red-300 ml-3"><i className="fas fa-trash-alt"></i></button></div>))}
            </div>
            <div className="pt-4 border-t border-slate-100 space-y-4"><div className="flex justify-between items-end px-2"><span className="text-[10px] font-black text-slate-400 uppercase">Итого</span><span className="text-3xl font-black text-slate-800">{totalSum.toLocaleString()} ₽</span></div><button onClick={handlePostDocument} className="w-full bg-indigo-600 text-white p-5 rounded-[24px] font-black uppercase shadow-xl">ПРОВЕСТИ ПРИХОД</button></div>
          </div>
        </div>
      )}

      {showNewProductForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <form onSubmit={handleCreateProduct} className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-slide-up space-y-5">
            <h3 className="text-xl font-black text-slate-800 text-center">Новый товар</h3>
            <div className="space-y-4">
              <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} placeholder="Название..." />
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold" value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold" value={newProd.unit} onChange={e => setNewProd({...newProd, unit: e.target.value as any})}><option value="шт">шт</option><option value="кг">кг</option><option value="упак">упак</option><option value="л">л</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Закуп" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-indigo-600" value={newProd.cost || ''} onChange={e => setNewProd({...newProd, cost: parseFloat(e.target.value) || 0})} />
                <input type="number" placeholder="Продажа" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-emerald-600" value={newProd.price || ''} onChange={e => setNewProd({...newProd, price: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowNewProductForm(false)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button><button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">СОЗДАТЬ</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
