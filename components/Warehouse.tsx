
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
  products, suppliers, categories, batch, setBatch,
  onTransactionsBulk, onAddCashEntry, onAddProduct
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBT'>('DEBT');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDocOpen, setIsDocOpen] = useState(false);

  // Модалка ввода параметров для выбранного товара
  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<number>(1);
  const [inputCost, setInputCost] = useState<number>(0);

  // Модалка создания нового товара
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
        {/* Шапка с основными данными документа */}
        <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Дата
              </label>
              <input
                  type="date"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-700"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
              />
            </div>
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Поставщик
              </label>
              <select
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-700"
                  value={selectedSupplier}
                  onChange={e => setSelectedSupplier(e.target.value)}
              >
                <option value="">-- Выберите --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Выбор товара - Навигация */}
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-black text-slate-800">
            {selectedCategory ? (
                <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 text-indigo-600">
                  <i className="fas fa-arrow-left text-sm"></i> {selectedCategory}
                </button>
            ) : 'Выбор товара'}
          </h2>
          <button
              onClick={() => setShowNewProductForm(true)}
              className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-100 active:scale-95 transition-all"
          >
            + Создать новый
          </button>
        </div>

        {/* Поиск */}
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
          <input
              className="w-full p-4 pl-12 rounded-2xl bg-white shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/10 font-medium"
              placeholder="Поиск по названию или SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Сетка категорий или товаров */}
        {!selectedCategory && !searchTerm ? (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                  <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-indigo-300 active:scale-95 transition-all"
                  >
                    <div
                        className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3">
                      <i className="fas fa-folder text-2xl"></i></div>
                    <h3 className="font-black text-slate-800 text-sm truncate w-full">{cat}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Перейти</p>
                  </button>
              ))}
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-3 pb-20">
              {filteredProducts.map(p => (
                  <button
                      key={p.id}
                      onClick={() => openAddItem(p)}
                      className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-left active:scale-95 transition-all group"
                  >
                    <div className="text-[8px] font-black text-indigo-400 uppercase mb-1">{p.category}</div>
                    <div
                        className="font-bold text-slate-800 text-xs line-clamp-2 min-h-[32px] group-hover:text-indigo-600">{p.name}</div>
                    <div className="flex justify-between items-end mt-3 pt-2 border-t border-slate-50">
                      <div className="text-[9px] font-black text-slate-400 uppercase">Ост: <span
                          className="text-slate-800">{p.quantity}</span></div>
                      <div
                          className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                        <i className="fas fa-plus text-xs"></i></div>
                    </div>
                  </button>
              ))}
              {filteredProducts.length === 0 &&
                  <div className="col-span-2 text-center py-10 text-slate-300 italic">Нет товаров</div>}
            </div>
        )}

        {/* Плавающая кнопка документа (Drawer Trigger) */}
        {batch.length > 0 && (
            <div className="fixed bottom-24 left-4 right-4 z-[80]">
              <button
                  onClick={() => setIsDocOpen(true)}
                  className="w-full bg-slate-800 text-white p-5 rounded-[32px] shadow-2xl flex justify-between items-center animate-slide-up"
              >
                <div className="flex items-center gap-4">
                  <div
                      className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black">{batch.length}</div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase opacity-60">Документ прихода</p>
                    <p className="text-lg font-black">{totalSum.toLocaleString()} ₽</p>
                  </div>
                </div>
                <div
                    className="bg-indigo-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Открыть
                </div>
              </button>
            </div>
        )}

        {/* Оверлей ввода количества и цены */}
        {activeItem && (
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl p-8 animate-slide-up space-y-6">
                <div className="text-center">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{activeItem.category}</p>
                  <h3 className="text-xl font-black text-slate-800">{activeItem.name}</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Кол-во к приходу
                      ({activeItem.unit})</label>
                    <div
                        className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl h-14 overflow-hidden">
                      <button onClick={() => setInputQty(Math.max(1, inputQty - 1))}
                              className="px-5 h-full text-slate-400"><i className="fas fa-minus"></i></button>
                      <input type="number" step="any"
                             className="w-full text-center bg-transparent outline-none font-black text-lg"
                             value={inputQty} onChange={e => setInputQty(parseFloat(e.target.value) || 0)}/>
                      <button onClick={() => setInputQty(inputQty + 1)} className="px-5 h-full text-slate-400"><i
                          className="fas fa-plus"></i></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Цена закупа (за ед.)</label>
                    <input type="number" step="0.01"
                           className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-lg text-center text-indigo-600"
                           value={inputCost} onChange={e => setInputCost(parseFloat(e.target.value) || 0)}/>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setActiveItem(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена
                  </button>
                  <button onClick={confirmAddToDoc}
                          className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">ДОБАВИТЬ
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Список товаров в документе (Full Screen Drawer) */}
        {isDocOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[100] flex items-end justify-center">
              <div
                  className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-6 flex flex-col max-h-[90vh] animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Состав накладной</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Всего: {batch.length} позиций</p>
                  </div>
                  <button onClick={() => setIsDocOpen(false)}
                          className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                    <i className="fas fa-times"></i></button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
                  <div className="space-y-2 mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Выберите статус
                      оплаты</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                          onClick={() => setPaymentMethod('CASH')}
                          className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${paymentMethod === 'CASH' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        <i className="fas fa-wallet text-sm"></i>
                        Оплачено
                      </button>
                      <button
                          onClick={() => setPaymentMethod('DEBT')}
                          className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${paymentMethod === 'DEBT' ? 'bg-red-50 border-red-500 text-red-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        <i className="fas fa-file-invoice-dollar text-sm"></i>
                        В долг
                      </button>
                    </div>
                  </div>

                  {batch.map(item => (
                      <div key={item.productId}
                           className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            {item.quantity} {item.unit} x {item.cost} ₽
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-black text-slate-800">{(item.quantity * item.cost).toLocaleString()} ₽</p>
                          <button onClick={() => setBatch(batch.filter(b => b.productId !== item.productId))}
                                  className="text-red-300 hover:text-red-500"><i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-end px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Итоговая сумма</span>
                    <span className="text-3xl font-black text-slate-800">{totalSum.toLocaleString()} ₽</span>
                  </div>
                  <button
                      onClick={handlePostDocument}
                      className="w-full bg-indigo-600 text-white p-5 rounded-[24px] font-black uppercase shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                  >
                    ПРОВЕСТИ ПРИХОД
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Быстрое создание нового товара */}
        {showNewProductForm && (
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
              <form onSubmit={handleCreateProduct}
                    className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-slide-up space-y-5">
                <h3 className="text-xl font-black text-slate-800 text-center">Создать и добавить</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Название</label>
                    <input required
                           className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                           value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})}
                           placeholder="Напр: Платье белое"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label
                          className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Категория</label>
                      <select
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold"
                          value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ед.
                        изм.</label>
                      <select
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold"
                          value={newProd.unit} onChange={e => setNewProd({...newProd, unit: e.target.value as any})}>
                        <option value="шт">шт</option>
                        <option value="кг">кг</option>
                        <option value="упак">упак</option>
                        <option value="л">л</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label
                          className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Закуп</label>
                      <input type="number"
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-indigo-600"
                             value={newProd.cost || ''}
                             onChange={e => setNewProd({...newProd, cost: parseFloat(e.target.value) || 0})}/>
                    </div>
                    <div className="space-y-1">
                      <label
                          className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Продажа</label>
                      <input type="number"
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-emerald-600"
                             value={newProd.price || ''}
                             onChange={e => setNewProd({...newProd, price: parseFloat(e.target.value) || 0})}/>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowNewProductForm(false)}
                          className="flex-1 py-4 font-bold text-slate-400">Отмена
                  </button>
                  <button type="submit"
                          className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">СОЗДАТЬ
                  </button>
                </div>
              </form>
            </div>
        )}
      </div>
  );
};

export default Warehouse;
