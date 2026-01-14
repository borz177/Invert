
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Product, Sale, Order, AppSettings, CashEntry } from '../types';
import { db } from '../services/api';

interface ClientPortalProps {
  user: User;
  onAddOrder: (order: Order) => void;
  onUpdateOrder?: (order: Order) => void;
  onActiveShopChange?: (name: string | null) => void;
  initialShopId?: string | null;
  onB2BPurchaseComplete?: (shopId: string, shopName: string, order: Order, products: Product[]) => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ 
  user, 
  onAddOrder, 
  onActiveShopChange, 
  initialShopId,
  onB2BPurchaseComplete 
}) => {
  const [activeShopId, setActiveShopId] = useState<string | null>(initialShopId || null);
  const [shopList, setShopList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isShopLoading, setIsShopLoading] = useState(false);

  const [shopData, setShopData] = useState<{
    products: Product[];
    sales: Sale[];
    orders: Order[];
    cashEntries: CashEntry[];
    settings: AppSettings;
    customerIdInShop?: string;
  } | null>(null);

  const [tab, setTab] = useState<'PRODUCTS' | 'HISTORY'>('PRODUCTS');
  const [cart, setCart] = useState<any[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [note, setNote] = useState('');

  // Предзаполнение для B2B или обычного клиента
  const [tempName, setTempName] = useState(user.name || '');
  const [tempPhone, setTempPhone] = useState('');

  const [swipeId, setSwipeId] = useState<string | null>(null);
  const touchStart = useRef<number>(0);
  const [selectedOpDetail, setSelectedOpDetail] = useState<any | null>(null);

  useEffect(() => {
    const fetchMyShops = async () => {
      const linked = await db.getData('linkedShops');
      if (Array.isArray(linked)) setShopList(linked);
    };
    fetchMyShops();
  }, []);

  useEffect(() => {
    if (initialShopId) setActiveShopId(initialShopId);
  }, [initialShopId]);

  useEffect(() => {
    if (activeShopId) return;
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await db.shops.search(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    };
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeShopId]);

  useEffect(() => {
    if (!activeShopId) {
      setShopData(null);
      if (onActiveShopChange) onActiveShopChange(null);
      return;
    }

    const fetchShopInfo = async () => {
      setIsShopLoading(true);
      try {
        const [p, s, o, c, sett, customers] = await Promise.all([
          db.getDataOfShop(activeShopId, 'products'),
          db.getDataOfShop(activeShopId, 'sales'),
          db.getDataOfShop(activeShopId, 'orders'),
          db.getDataOfShop(activeShopId, 'cashEntries'),
          db.getDataOfShop(activeShopId, 'settings'),
          db.getDataOfShop(activeShopId, 'customers')
        ]);

        const meInShop = customers?.find((cust: any) =>
          (cust.email?.toLowerCase().trim() === user.email?.toLowerCase().trim() && user.email) ||
          (cust.name?.toLowerCase().trim() === user.name?.toLowerCase().trim())
        );

        setShopData({
          products: p || [],
          sales: s || [],
          orders: o || [],
          cashEntries: c || [],
          settings: sett || {},
          customerIdInShop: meInShop?.id
        });

        if (onActiveShopChange) onActiveShopChange(sett?.shopName || 'Магазин');
      } catch (err) {
        console.error("Failed to load shop data", err);
      } finally {
        setIsShopLoading(false);
      }
    };
    fetchShopInfo();
  }, [activeShopId, user.email, user.name]);

  const addShop = async (shop: any) => {
    if (shopList.some(s => s.id === shop.id)) return;
    const newList = [...shopList, shop];
    setShopList(newList);
    await db.saveData('linkedShops', newList);
    setSearchQuery('');
    setSearchResults([]);
    setActiveShopId(shop.id);
  };

  const removeShop = async (id: string) => {
    const newList = shopList.filter(s => s.id !== id);
    setShopList(newList);
    await db.saveData('linkedShops', newList);
    if (activeShopId === id) setActiveShopId(null);
    setSwipeId(null);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    const currentX = e.targetTouches[0].clientX;
    const diff = touchStart.current - currentX;
    if (diff > 50) setSwipeId(id);
    else if (diff < -50) setSwipeId(null);
  };

  const myHistory = useMemo(() => {
    if (!shopData) return [];
    const mySales = shopData.sales.filter(x => !x.isDeleted && (x.customerId === shopData.customerIdInShop || x.customerId === user.id));
    const myPayments = shopData.cashEntries.filter(x => x.type === 'INCOME' && (x.customerId === shopData.customerIdInShop || x.customerId === user.id));
    const myOrders = shopData.orders.filter(x => (x.customerId === shopData.customerIdInShop || x.customerId === user.id) && (x.status === 'NEW' || x.status === 'ACCEPTED' || x.status === 'CANCELLED'));
    return [
      ...mySales.map(i => ({...i, type: 'SALE'})),
      ...myPayments.map(i => ({...i, type: 'PAYMENT'})),
      ...myOrders.map(i => ({...i, type: 'ORDER'}))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shopData, user.id]);

  const filteredProducts = useMemo(() => {
    if (!shopData) return [];
    const search = productSearch.toLowerCase();
    return shopData.products.filter(p => p.name.toLowerCase().includes(search) || (p.category && p.category.toLowerCase().includes(search)));
  }, [shopData, productSearch]);

  const myStats = useMemo(() => {
    if (!shopData) return { debt: 0, totalPurchased: 0 };
    const sales = shopData.sales.filter(x => !x.isDeleted && (x.customerId === shopData.customerIdInShop || x.customerId === user.id));
    const payments = shopData.cashEntries.filter(x => x.type === 'INCOME' && (x.customerId === shopData.customerIdInShop || x.customerId === user.id));
    const totalPurchased = sales.reduce((acc, i) => acc + i.total, 0);
    const totalPaid = payments.reduce((acc, i) => acc + i.amount, 0);
    return { debt: Math.max(0, totalPurchased - totalPaid), totalPurchased };
  }, [shopData, user.id]);

  const cartTotal = useMemo(() => cart.reduce((acc, i) => acc + i.price * i.quantity, 0), [cart]);

  const handleSendOrder = async () => {
    if (cart.length === 0 || !activeShopId || !shopData) return;

    // Валидация контактов, если клиент не зарегистрирован в том магазине
    if (!shopData.customerIdInShop && (!tempName.trim() || !tempPhone.trim())) {
      alert('Пожалуйста, укажите ваши данные для связи');
      return;
    }

    const isB2B = user.role === 'admin' || user.role === 'superadmin';

    const newOrder: Order = {
      id: Date.now().toString(),
      customerId: shopData.customerIdInShop || user.id,
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      total: cartTotal,
      status: 'NEW',
      date: new Date().toISOString(),
      note: `${shopData.customerIdInShop ? '' : `[Имя: ${tempName}, Тел: ${tempPhone}] `}${isB2B ? '🛍 B2B ЗАКУПКА. ' : ''}${note.trim()}`,
      isExternalPurchase: isB2B,
      supplierShopId: activeShopId
    };

    await db.saveDataOfShop(activeShopId, 'orders', [newOrder, ...shopData.orders]);

    if (isB2B && onB2BPurchaseComplete) {
      onB2BPurchaseComplete(activeShopId, shopData.settings.shopName, newOrder, shopData.products);
    }

    setCart([]);
    setIsOrdering(false);
    alert(isB2B ? 'Закупка оформлена! Поставщик уведомлен.' : 'Заявка отправлена!');
  };

  if (activeShopId && isShopLoading) return <div className="flex flex-col items-center justify-center h-screen animate-fade-in"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-sm font-black text-indigo-600 uppercase tracking-widest">Входим в магазин...</p></div>;

  if (activeShopId && shopData) {
    return (
      <div className="space-y-6 animate-fade-in pb-32">
        <div className="flex bg-white p-2 rounded-[32px] shadow-sm border border-slate-50">
          <button onClick={() => setTab('PRODUCTS')} className={`flex-1 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'PRODUCTS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}>Каталог</button>
          <button onClick={() => setTab('HISTORY')} className={`flex-1 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}>История</button>
        </div>

        {tab === 'PRODUCTS' ? (
          <div className="space-y-6">
            <div className="relative"><i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i><input type="text" className="w-full p-5 pl-14 bg-white rounded-[24px] shadow-sm border border-slate-100 outline-none text-sm placeholder:text-slate-300" placeholder="Поиск товаров..." value={productSearch} onChange={e => setProductSearch(e.target.value)} /></div>
            {shopData.settings.showProductsToClients ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-[40px] shadow-sm border border-slate-50 flex flex-col relative">
                    <span className="absolute top-4 left-5 text-[8px] font-black text-indigo-400 uppercase bg-indigo-50 px-2 py-1 rounded-full">{p.category}</span>
                    <div className="aspect-square bg-slate-50 rounded-[32px] mb-4 overflow-hidden flex items-center justify-center p-2">{p.image ? <img src={p.image} className="w-full h-full object-contain" /> : <i className="fas fa-image text-4xl text-slate-100"></i>}</div>
                    <div className="space-y-1 mb-4"><p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{p.name}</p><p className="text-[10px] text-slate-400 font-bold">Ост: {p.quantity} {p.unit}</p></div>
                    <div className="flex justify-between items-center mt-auto"><span className="font-black text-slate-800 text-lg">{p.price.toLocaleString()} ₽</span><button onClick={() => { const ex = cart.find(i => i.productId === p.id); if (ex) setCart(cart.map(i => i.productId === p.id ? {...i, quantity: i.quantity + 1} : i)); else setCart([...cart, { productId: p.id, name: p.name, price: p.price, quantity: 1, unit: p.unit }]); }} className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95"><i className="fas fa-plus text-xs"></i></button></div>
                  </div>
                ))}
              </div>
            ) : <div className="p-20 text-center text-slate-300">Витрина скрыта</div>}

            {cart.length > 0 && (
              <button onClick={() => setIsOrdering(true)} className="fixed bottom-24 left-4 right-4 bg-indigo-600 text-white p-6 rounded-[32px] flex justify-between items-center shadow-2xl z-50 animate-slide-up">
                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black">{cart.length}</div><div className="text-left"><p className="text-[10px] opacity-60 uppercase font-black">Сумма заказа</p><p className="text-lg font-black">{cartTotal.toLocaleString()} ₽</p></div></div>
                <div className="flex items-center gap-2"><span className="font-black uppercase text-[10px]">Оформить</span><i className="fas fa-chevron-right text-[10px]"></i></div>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 text-center"><p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Долг</p><p className="text-2xl font-black text-red-600">{myStats.debt.toLocaleString()} ₽</p></div>
              <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 text-center"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Всего закупок</p><p className="text-2xl font-black text-indigo-600">{myStats.totalPurchased.toLocaleString()} ₽</p></div>
            </div>
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
              <p className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">Ваши операции</p>
              {myHistory.map((op: any) => (
                <div key={op.id} onClick={() => setSelectedOpDetail(op)} className="p-5 flex justify-between items-center active:bg-slate-50 cursor-pointer">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-bold text-slate-800 text-sm">{op.type === 'SALE' ? `Покупка №${op.id.slice(-4)}` : op.type === 'PAYMENT' ? 'Платеж' : 'Заявка'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(op.date).toLocaleDateString()}</p>
                    {op.type === 'ORDER' && <span className={`text-[8px] font-black uppercase inline-block px-1.5 py-0.5 rounded mt-1 ${op.status === 'NEW' ? 'bg-indigo-50 text-indigo-500' : op.status === 'ACCEPTED' ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-400'}`}>{op.status === 'NEW' ? 'В обработке' : op.status === 'ACCEPTED' ? 'Принята' : 'Отменена'}</span>}
                  </div>
                  <div className="flex items-center gap-4"><p className={`font-black text-lg ${op.type === 'PAYMENT' ? 'text-emerald-500' : 'text-slate-800'}`}>{op.type === 'PAYMENT' ? '-' : ''}{(op.amount || op.total || 0).toLocaleString()} ₽</p><i className="fas fa-chevron-right text-[10px] text-slate-200"></i></div>
                </div>
              ))}
              {myHistory.length === 0 && <p className="text-center py-20 text-slate-300 italic">Событий нет</p>}
            </div>
          </div>
        )}

        {selectedOpDetail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-end justify-center p-0" onClick={() => setSelectedOpDetail(null)}>
            <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-8 flex flex-col animate-slide-up max-h-[85vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black text-slate-800">{selectedOpDetail.type === 'SALE' ? 'Детали покупки' : (selectedOpDetail.type === 'PAYMENT' ? 'Детали платежа' : 'Детали заявки')}</h3><p className="text-[10px] text-slate-400 font-black uppercase">№ {selectedOpDetail.id.slice(-6)} • {new Date(selectedOpDetail.date).toLocaleDateString()}</p></div><button onClick={() => setSelectedOpDetail(null)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button></div>

               {(selectedOpDetail.type === 'SALE' || selectedOpDetail.type === 'ORDER') ? (
                 <div className="space-y-4">
                    <div className="space-y-2">{selectedOpDetail.items.map((item: any, idx: number) => { const p = shopData.products.find(prod => prod.id === item.productId); return (<div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"><div><p className="font-bold text-slate-800 text-sm">{p?.name || 'Товар'}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {p?.unit || 'шт'} x {item.price} ₽</p></div><p className="font-black text-slate-800">{(item.quantity * item.price).toLocaleString()} ₽</p></div>); })}</div>
                    <div className="bg-slate-800 p-6 rounded-[32px] text-white flex justify-between items-center mt-4"><span className="text-[10px] font-black uppercase opacity-60">Итого:</span><span className="text-2xl font-black">{(selectedOpDetail.total || 0).toLocaleString()} ₽</span></div>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 text-center">
                      <p className="text-[10px] font-black text-emerald-400 uppercase mb-2 tracking-widest">Сумма оплаты</p>
                      <p className="text-5xl font-black text-emerald-600">{(selectedOpDetail.amount || 0).toLocaleString()} ₽</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Назначение:</p>
                      <p className="text-sm font-bold text-slate-700">{selectedOpDetail.category || 'Пополнение счета'}</p>
                      <p className="text-xs text-slate-400 mt-2">{selectedOpDetail.description || 'Без описания'}</p>
                    </div>
                    <button onClick={() => setSelectedOpDetail(null)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Закрыть окно</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {isOrdering && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-8 flex flex-col animate-slide-up max-h-[95vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black text-slate-800">Оформление</h3><p className="text-xs text-slate-400 font-bold">Подтверждение заказа</p></div><button onClick={() => setIsOrdering(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full"><i className="fas fa-times"></i></button></div>

              {/* Карточка контактов (обязательна для новых клиентов и B2B) */}
              {!shopData?.customerIdInShop && (
                <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 mb-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <i className="fas fa-id-card text-indigo-300"></i>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Контактные данные</p>
                  </div>
                  <div className="space-y-3">
                    <input className="w-full p-4 bg-white border border-indigo-100 rounded-2xl outline-none text-sm font-bold placeholder:text-slate-300" placeholder="Ваше имя / Название магазина" value={tempName} onChange={e => setTempName(e.target.value)} />
                    <input className="w-full p-4 bg-white border border-indigo-100 rounded-2xl outline-none text-sm font-bold placeholder:text-slate-300" placeholder="Ваш телефон" type="tel" value={tempPhone} onChange={e => setTempPhone(e.target.value)} />
                  </div>
                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <p className="text-[8px] text-center text-indigo-400 font-black uppercase opacity-60">Это B2B закупка — данные будут видны поставщику</p>
                  )}
                </div>
              )}

              <div className="space-y-3 mb-6">{cart.map(item => (<div key={item.productId} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"><div><p className="font-bold text-slate-800 text-sm">{item.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit} x {item.price} ₽</p></div><button onClick={() => setCart(cart.filter(i=>i.productId!==item.productId))} className="text-red-300 p-2"><i className="fas fa-trash-alt"></i></button></div>))}</div>
              <textarea placeholder="Комментарий к заказу (необязательно)..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] text-sm outline-none mb-6 resize-none" rows={2} value={note} onChange={e=>setNote(e.target.value)} />
              <div className="flex justify-between items-center mb-6 px-2"><span className="text-[10px] font-black text-slate-400 uppercase">Сумма к оплате</span><span className="text-2xl font-black text-slate-800">{cartTotal.toLocaleString()} ₽</span></div>
              <button onClick={handleSendOrder} className="w-full bg-indigo-600 text-white p-6 rounded-[28px] font-black uppercase shadow-xl tracking-widest active:scale-95 transition-all">ОТПРАВИТЬ ЗАКАЗ</button>
            </div>
          </div>
        )}

        <button onClick={() => setActiveShopId(null)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-indigo-500">Вернуться к списку магазинов</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-slate-800 px-2">{user.role === 'admin' ? 'Поиск поставщиков' : 'Поиск магазина'}</h2>
        <div className="relative"><i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i><input type="text" className="w-full p-6 pl-14 bg-white rounded-[32px] shadow-sm border border-slate-100 outline-none text-sm placeholder:text-slate-300" placeholder="Название или владелец..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        {isSearching && <div className="text-center py-6 font-bold text-indigo-400 animate-pulse">Поиск магазинов...</div>}
        <div className="space-y-3">
          {searchResults.map(shop => (
            <div key={shop.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center transition-all">
              <div className="flex items-center gap-5"><div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner"><i className="fas fa-store"></i></div><div><p className="font-black text-slate-800">{shop.shopName}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Владелец: {shop.ownerName}</p></div></div>
              <button onClick={() => addShop(shop)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Открыть</button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Ваши связи</h3>
        <div className="grid grid-cols-1 gap-4 overflow-hidden">
          {shopList.map(shop => (
            <div key={shop.id} className="relative overflow-hidden rounded-[40px] bg-red-500" onTouchStart={(e) => handleTouchStart(e, shop.id)} onTouchMove={(e) => handleTouchMove(e, shop.id)}>
              <button onClick={() => removeShop(shop.id)} className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 text-white font-black uppercase text-[10px] flex items-center justify-center">Удалить</button>
              <button onClick={() => swipeId === shop.id ? setSwipeId(null) : setActiveShopId(shop.id)} style={{ transform: swipeId === shop.id ? 'translateX(-96px)' : 'translateX(0)' }} className="relative w-full bg-white p-7 shadow-sm border border-slate-50 flex items-center gap-6 transition-transform duration-300 text-left active:bg-slate-50">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center text-3xl shadow-lg"><i className="fas fa-store"></i></div>
                <div className="flex-1"><p className="text-lg font-black text-slate-800 leading-tight">{shop.shopName}</p><p className="text-xs text-slate-400 font-bold uppercase mt-1">Владелец: {shop.ownerName}</p></div>
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300"><i className="fas fa-chevron-right text-xs"></i></div>
              </button>
            </div>
          ))}
          {shopList.length === 0 && searchQuery === '' && <div className="text-center py-24 text-slate-300 italic">Нет добавленных магазинов</div>}
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
