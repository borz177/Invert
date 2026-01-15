
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Transaction, Supplier, CashEntry, Order } from '../types';
import { db } from '../services/api';

interface WarehouseProps {
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  categories: string[];
  batch: Array<{productId: string, name: string, quantity: number, cost: number, unit: string}>;
  setBatch: React.Dispatch<React.SetStateAction<Array<{productId: string, name: string, quantity: number, cost: number, unit: string}>>>;
  onTransaction: (t: Transaction) => void;
  onTransactionsBulk: (ts: Transaction[]) => void;
  onConfirmB2BArrivalBulk?: (newProds: Product[], finalTransactions: Transaction[], pendingIdsToDelete: string[]) => void;
  onAddCashEntry?: (entry: Omit<CashEntry, 'id' | 'date' | 'employeeId'> & { id?: string }) => void;
  onAddProduct: (p: Product) => void;
  onDeleteTransaction: (id: string) => void;
  orders?: Order[];
}

const Warehouse: React.FC<WarehouseProps> = ({
  products, suppliers, transactions, categories, batch, setBatch,
  onTransactionsBulk, onConfirmB2BArrivalBulk, onAddCashEntry, onAddProduct, onDeleteTransaction,
  orders = []
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

  // B2B Приемка
  const [selectedB2BOrderId, setSelectedB2BOrderId] = useState<string | null>(null);
  const [b2bPaymentMethod, setB2BPaymentMethod] = useState<'CASH' | 'DEBT'>('DEBT');
  const [isSyncing, setIsSyncing] = useState(false);
  const [productMappings, setProductMappings] = useState<Record<string, string>>({});
  const [b2bItemSettings, setB2BItemSettings] = useState<Record<string, {
    localId: string,
    category: string,
    rename: string,
    remoteName: string,
    remoteProductId: string
  }>>({});

  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    category: categories[0] || 'Другое',
    price: 0,
    cost: 0,
    unit: 'шт' as any
  });

  useEffect(() => {
    const loadMappings = async () => {
      const saved = await db.getData('b2b_mappings');
      if (saved) setProductMappings(saved);
    };
    loadMappings();
  }, []);

  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplier) {
      setSelectedSupplier(suppliers[0].id);
    }
  }, [suppliers]);

  const openAddItem = (p: Product) => {
    setActiveItem(p);
    setInputQty(1);
    setInputCost(p.cost || 0);
  };

  const confirmAddToDoc = () => {
    if (!activeItem) return;
    const newItem = {
      productId: activeItem.id,
      name: activeItem.name,
      quantity: inputQty,
      cost: inputCost,
      unit: activeItem.unit
    };
    setBatch(prev => Array.isArray(prev) ? [...prev, newItem] : [newItem]);
    setActiveItem(null);
    setIsDocOpen(true);
  };

  const handlePostDocument = () => {
    if (batch.length === 0) return;
    if (!selectedSupplier) {
      alert('Выберите поставщика');
      return;
    }

    const commonBatchId = `BATCH-${Date.now()}`;

    const newTransactions: Transaction[] = batch.map(item => ({
      id: `TR-IN-${Date.now()}-${item.productId}`,
      productId: item.productId,
      supplierId: selectedSupplier,
      type: 'IN',
      quantity: item.quantity,
      date: receiptDate + 'T' + new Date().toISOString().split('T')[1],
      pricePerUnit: item.cost,
      paymentMethod: paymentMethod,
      batchId: commonBatchId,
      note: `Приход на склад. Поставщик: ${suppliers.find(s => s.id === selectedSupplier)?.name || '---'}`,
      employeeId: 'admin'
    }));

    onTransactionsBulk(newTransactions);
    setBatch([]);
    setIsDocOpen(false);
    alert('Приход успешно проведен!');
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const product: Product = {
      id: `P-${Date.now()}`,
      name: newProd.name,
      sku: `SKU-${Math.floor(Math.random() * 10000)}`,
      price: newProd.price,
      cost: newProd.cost,
      quantity: 0,
      category: newProd.category,
      minStock: 5,
      unit: newProd.unit,
      type: 'PRODUCT'
    };
    onAddProduct(product);
    setShowNewProductForm(false);
    setNewProd({
      name: '',
      category: categories[0] || 'Другое',
      price: 0,
      cost: 0,
      unit: 'шт'
    });
    alert('Товар создан');
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.type !== 'SERVICE');
    if (selectedCategory) result = result.filter(p => p.category === selectedCategory);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(low) || p.sku.toLowerCase().includes(low));
    }
    return result;
  }, [selectedCategory, searchTerm, products]);

  const externalOrders = useMemo(() => {
    const pending = transactions.filter(t => t.type === 'PENDING_IN');
    const groups: Record<string, { orderId: string, supplierId: string, date: string, items: Transaction[], total: number }> = {};

    pending.forEach(t => {
      const oId = t.orderId || 'no-id';
      if (!groups[oId]) {
        groups[oId] = {
          orderId: oId,
          supplierId: t.supplierId || '',
          date: t.date,
          items: [],
          total: 0
        };
      }
      groups[oId].items.push(t);
      groups[oId].total += t.quantity * (t.pricePerUnit || 0);
    });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const openB2BOrder = async (orderId: string) => {
    const orderGroup = externalOrders.find(o => o.orderId === orderId);
    if (!orderGroup) return;

    setIsSyncing(true);
    let remotePaymentMethod: 'CASH' | 'DEBT' = 'DEBT';

    try {
      const remoteOrders = await db.getDataOfShop(orderGroup.supplierId, 'orders');
      if (Array.isArray(remoteOrders)) {
        const matchingOrder = remoteOrders.find((o: any) => o.id === orderId);
        if (matchingOrder && matchingOrder.paymentMethod) {
          remotePaymentMethod = matchingOrder.paymentMethod === 'DEBT' ? 'DEBT' : 'CASH';
        }
      }
    } catch (e) {
      console.warn("Failed to sync remote order payment method", e);
    } finally {
      setIsSyncing(false);
    }

    setB2BPaymentMethod(remotePaymentMethod);

    const initialSettings: any = {};
    orderGroup.items.forEach(item => {
      const mappingKey = `${orderGroup.supplierId}_${item.productId}`;
      const existingMapping = productMappings[mappingKey];

      const remoteNameMatch = item.note.match(/Название:\s*(.*)/);
      const remoteName = remoteNameMatch ? remoteNameMatch[1] : 'Товар';

      initialSettings[item.id] = {
        localId: existingMapping || '',
        category: categories[0] || 'Другое',
        rename: remoteName,
        remoteName: remoteName,
        remoteProductId: item.productId
      };
    });

    setB2BItemSettings(initialSettings);
    setSelectedB2BOrderId(orderId);
  };

  const handleConfirmB2BReceipt = async () => {
    const orderGroup = externalOrders.find(o => o.orderId === selectedB2BOrderId);
    if (!orderGroup || !onConfirmB2BArrivalBulk) return;

    const commonBatchId = `B2B-BATCH-${orderGroup.orderId}`;
    const finalTransactions: Transaction[] = [];
    const newProds: Product[] = [];
    const pendingIdsToDelete: string[] = [];
    const newMappings = { ...productMappings };

    for (const item of orderGroup.items) {
      const settings = b2bItemSettings[item.id];
      let finalLocalId = settings.localId;

      if (!finalLocalId) {
        finalLocalId = `P-B2B-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newProduct: Product = {
          id: finalLocalId,
          name: settings.rename || settings.remoteName,
          sku: `B2B-${Math.floor(Math.random() * 10000)}`,
          category: settings.category,
          price: (item.pricePerUnit || 0) * 1.5,
          cost: item.pricePerUnit || 0,
          quantity: 0,
          minStock: 5,
          unit: 'шт',
          type: 'PRODUCT'
        };
        newProds.push(newProduct);
        const mappingKey = `${orderGroup.supplierId}_${settings.remoteProductId}`;
        newMappings[mappingKey] = finalLocalId;
      } else {
        const mappingKey = `${orderGroup.supplierId}_${settings.remoteProductId}`;
        newMappings[mappingKey] = finalLocalId;
      }

      finalTransactions.push({
        ...item,
        id: `TR-B2B-IN-${Date.now()}-${item.id}`,
        type: 'IN',
        productId: finalLocalId,
        batchId: commonBatchId,
        paymentMethod: b2bPaymentMethod,
        note: `B2B Приемка. Заказ №${orderGroup.orderId.slice(-4)}. Поставщик: ${suppliers.find(s=>s.id===orderGroup.supplierId)?.name}`
      });

      pendingIdsToDelete.push(item.id);
    }

    await db.saveData('b2b_mappings', newMappings);
    setProductMappings(newMappings);

    // Вызываем атомарное обновление в App.tsx
    onConfirmB2BArrivalBulk(newProds, finalTransactions, pendingIdsToDelete);

    setSelectedB2BOrderId(null);
    alert('Товары успешно приняты на склад!');
  };

  const totalSum = batch.reduce((acc, i) => acc + (i.quantity * i.cost), 0);

  return (
    <div className="flex flex-col h-full space-y-4 pb-24">
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
        <button onClick={() => setWarehouseTab('MANUAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${warehouseTab === 'MANUAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Приемка</button>
        <button onClick={() => setWarehouseTab('EXTERNAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${warehouseTab === 'EXTERNAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>B2B Закупки {externalOrders.length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded ml-1">{externalOrders.length}</span>}</button>
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
                <button key={p.id} onClick={() => openAddItem(p)} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-left active:scale-95 transition-all flex flex-col justify-between min-h-[140px] animate-fade-in group">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-black mb-1">{p.category}</div>
                    <div className="font-bold text-slate-800 line-clamp-2 leading-tight text-sm group-hover:text-indigo-600">{p.name}</div>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Ост: {p.quantity} {p.unit}</div>
                      <div className="text-[10px] text-slate-400 font-medium opacity-50">#{p.sku.slice(-4)}</div>
                    </div>
                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><i className="fas fa-plus text-xs"></i></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 pb-20">
          <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
            <h4 className="font-black text-indigo-900 text-sm uppercase">Ожидаемые поставки</h4>
            <p className="text-[10px] text-indigo-400 font-bold uppercase mt-1">Сгруппировано по заказам</p>
          </div>
          <div className="space-y-3">
            {externalOrders.map(order => (
              <div key={order.orderId} onClick={() => openB2BOrder(order.orderId)} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center cursor-pointer active:bg-slate-50 transition-colors">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <p className="font-black text-slate-800 text-sm truncate">Заказ №{order.orderId.slice(-4)}</p>
                  </div>
                  <p className="text-[9px] text-slate-400 font-black uppercase">От: {suppliers.find(s=>s.id===order.supplierId)?.name || 'Магазин'}</p>
                  <p className="text-[9px] font-black text-indigo-500 mt-1">{order.items.length} поз. • {order.total.toLocaleString()} ₽</p>
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <i className="fas fa-chevron-right text-xs"></i>
                </div>
              </div>
            ))}
            {externalOrders.length === 0 && <div className="py-20 text-center text-slate-300 italic text-sm">Внешних заказов пока нет</div>}
          </div>
        </div>
      )}

      {selectedB2BOrderId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-6 flex flex-col max-h-[95vh] animate-slide-up overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">Приемка B2B заказа</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Сопоставление товаров со складом</p>
              </div>
              <button onClick={() => setSelectedB2BOrderId(null)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times text-xl"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pb-6 pr-1">
              <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center mb-3">Способ оплаты (актуальные данные поставщика)</p>
                {isSyncing ? (
                  <div className="flex justify-center py-2"><i className="fas fa-sync fa-spin text-indigo-600"></i></div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setB2BPaymentMethod('CASH')} className={`py-3 rounded-2xl font-black text-[10px] uppercase transition-all border-2 ${b2bPaymentMethod === 'CASH' ? 'bg-emerald-50 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>Оплачено</button>
                      <button onClick={() => setB2BPaymentMethod('DEBT')} className={`py-3 rounded-2xl font-black text-[10px] uppercase transition-all border-2 ${b2bPaymentMethod === 'DEBT' ? 'bg-red-50 border-red-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>В долг</button>
                    </div>
                    <p className="text-[8px] text-center text-indigo-400 font-bold uppercase mt-2 opacity-70">
                       * Данные синхронизированы из базы поставщика
                    </p>
                  </>
                )}
              </div>

              {externalOrders.find(o => o.orderId === selectedB2BOrderId)?.items.map(item => {
                const settings = b2bItemSettings[item.id];
                if (!settings) return null;

                return (
                  <div key={item.id} className="p-5 bg-slate-50 rounded-[30px] border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-4">
                        <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Товар поставщика:</p>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{settings.remoteName}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">{item.quantity} шт • {item.pricePerUnit} ₽</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Действие:</p>
                        <select
                          className={`p-2 rounded-xl text-[10px] font-black uppercase outline-none border transition-all ${settings.localId ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-indigo-600'}`}
                          value={settings.localId}
                          onChange={e => setB2BItemSettings({...b2bItemSettings, [item.id]: { ...settings, localId: e.target.value }})}
                        >
                          <option value="">+ Создать новый</option>
                          <optgroup label="Ваш склад">
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
                      {!settings.localId ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Как назвать у себя</label>
                            <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={settings.rename} onChange={e => setB2BItemSettings({...b2bItemSettings, [item.id]: { ...settings, rename: e.target.value }})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Категория на складе</label>
                            <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={settings.category} onChange={e => setB2BItemSettings({...b2bItemSettings, [item.id]: { ...settings, category: e.target.value }})}>
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 py-1 flex items-center gap-2">
                           <i className="fas fa-link text-emerald-500 text-xs"></i>
                           <p className="text-[10px] font-bold text-emerald-600">Связан с локальным товаром: {products.find(p=>p.id===settings.localId)?.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
               <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Итог заказа</span>
                  <span className="text-2xl font-black text-slate-800">{externalOrders.find(o=>o.orderId===selectedB2BOrderId)?.total.toLocaleString()} ₽</span>
               </div>
               <button onClick={handleConfirmB2BReceipt} className="w-full bg-indigo-600 text-white p-5 rounded-[24px] font-black uppercase shadow-xl shadow-indigo-100 active:scale-95 transition-all">ПРИНЯТЬ ВСЁ НА СКЛАД</button>
            </div>
          </div>
        </div>
      )}

      {activeItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl p-8 space-y-6">
            <div className="text-center"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1">{activeItem.category}</p><h3 className="text-xl font-black text-slate-800">{activeItem.name}</h3></div>
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Количество ({activeItem.unit})</label><input type="number" step="any" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center font-black text-xl text-slate-800" value={inputQty === 0 ? '' : inputQty} onChange={e => setInputQty(parseFloat(e.target.value) || 0)} /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Цена закупа</label><input type="number" step="0.01" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center font-black text-xl text-indigo-600" value={inputCost === 0 ? '' : inputCost} onChange={e => setInputCost(parseFloat(e.target.value) || 0)} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setActiveItem(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button onClick={confirmAddToDoc} className="flex-1 bg-indigo-600 text-white py-4 rounded-[24px] font-black shadow-lg">ДОБАВИТЬ</button>
            </div>
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
            <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowNewProductForm(false)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button><button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">СОХРАНИТЬ</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
