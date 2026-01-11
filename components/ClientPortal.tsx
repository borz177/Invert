
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Product, Sale, Order, AppSettings, CashEntry } from '../types';
import { db } from '../services/api';

interface ClientPortalProps {
  user: User;
  products: Product[];
  sales: Sale[];
  orders: Order[];
  onAddOrder: (order: Order) => void;
  onUpdateOrder?: (order: Order) => void;
  onActiveShopChange?: (name: string | null) => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ user, onAddOrder, onUpdateOrder, onActiveShopChange }) => {
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [shopList, setShopList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const [tempName, setTempName] = useState(user.name || '');
  const [tempPhone, setTempPhone] = useState('');

  // Состояние для свайпа
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const touchStart = useRef<number>(0);

  useEffect(() => {
    const fetchMyShops = async () => {
      const linked = await db.getData('linkedShops');
      if (Array.isArray(linked)) setShopList(linked);
    };
    fetchMyShops();
  }, []);

  useEffect(() => {
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
  }, [searchQuery]);

  useEffect(() => {
    if (!activeShopId) {
      setShopData(null);
      if (onActiveShopChange) onActiveShopChange(null);
      return;
    }
    const fetchShopInfo = async () => {
      const [p, s, o, c, sett, customers] = await Promise.all([
        db.getDataOfShop(activeShopId, 'products'),
        db.getDataOfShop(activeShopId, 'sales'),
        db.getDataOfShop(activeShopId, 'orders'),
        db.getDataOfShop(activeShopId, 'cashEntries'),
        db.getDataOfShop(activeShopId, 'settings'),
        db.getDataOfShop(activeShopId, 'customers')
      ]);

      const meInShop = customers?.find((c: any) => c.email === user.email);

      setShopData({
        products: p || [],
        sales: s || [],
        orders: o || [],
        cashEntries: c || [],
        settings: sett || {},
        customerIdInShop: meInShop?.id
      });
      if (onActiveShopChange) onActiveShopChange(sett?.shopName || 'Магазин');
    };
    fetchShopInfo();
  }, [activeShopId]);

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
    if (diff > 50) { // Свайп влево
      setSwipeId(id);
    } else if (diff < -50) { // Свайп вправо (отмена)
      setSwipeId(null);
    }
  };

  const myHistory = useMemo(() => {
    if (!shopData || !shopData.customerIdInShop) return [];

    // Фильтруем продажи и приходы кассы ИЗ ДАННЫХ МАГАЗИНА
    const mySales = shopData.sales.filter(x => x.customerId === shopData.customerIdInShop && !x.isDeleted);
    const myPayments = shopData.cashEntries.filter(x => x.customerId === shopData.customerIdInShop && x.type === 'INCOME');

    const combined = [
      ...mySales.map(i => ({...i, type: 'SALE'})),
      ...myPayments.map(i => ({...i, type: 'PAYMENT'}))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return combined;
  }, [shopData]);

  const myStats = useMemo(() => {
    if (!shopData || !shopData.customerIdInShop) return { debt: 0, totalPurchased: 0 };
    const sales = shopData.sales.filter(x => x.customerId === shopData.customerIdInShop && !x.isDeleted);
    const payments = shopData.cashEntries.filter(x => x.customerId === shopData.customerIdInShop && x.type === 'INCOME');
    const totalPurchased = sales.reduce((acc, i) => acc + i.total, 0);
    const totalPaid = payments.reduce((acc, i) => acc + i.amount, 0);
    return { debt: Math.max(0, totalPurchased - totalPaid), totalPurchased };
  }, [shopData]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  }, [cart]);

  const handleSendOrder = () => {
    if (cart.length === 0 || !activeShopId) return;

    if (!shopData?.customerIdInShop) {
      if (!tempName.trim() || !tempPhone.trim()) {
        alert('Пожалуйста, укажите ваше имя и номер телефона для оформления заказа');
        return;
      }
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      customerId: shopData?.customerIdInShop || user.id,
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      total: cartTotal,
      status: 'NEW',
      date: new Date().toISOString(),
      note: `${shopData?.customerIdInShop ? '' : `[Имя: ${tempName}, Тел: ${tempPhone}] `}${note.trim()}` || undefined
    };

    db.saveDataOfShop(activeShopId, 'orders', [newOrder, ...(shopData?.orders || [])]);
    setCart([]);
    setIsOrdering(false);
    alert('Заказ успешно отправлен!');
  };

  if (activeShopId && shopData) {
    return (
      <div className="space-y-6 animate-fade-in pb-32">
        <div className="flex bg-white p-2 rounded-[32px] shadow-sm border border-slate-50">
          <button
            onClick={() => setTab('PRODUCTS')}
            className={`flex-1 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'PRODUCTS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}
          >
            Заказать товар
          </button>
          <button
            onClick={() => setTab('HISTORY')}
            className={`flex-1 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}
          >
            Моя история
          </button>
        </div>

        {tab === 'PRODUCTS' ? (
          <div className="space-y-6">
            <div className="relative">
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input
                className="w-full p-5 pl-14 bg-white rounded-[24px] shadow-sm border border-slate-100 outline-none text-sm placeholder:text-slate-300"
                placeholder="Поиск товаров в магазине..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {shopData.settings.showProductsToClients ? (
              <div className="grid grid-cols-2 gap-4">
                {shopData.products.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-[40px] shadow-sm border border-slate-50 flex flex-col relative group transition-all hover:border-indigo-100">
                    <span className="absolute top-4 left-5 text-[8px] font-black text-indigo-400 uppercase bg-indigo-50 px-2 py-1 rounded-full">{p.category}</span>
                    <div className="aspect-square bg-slate-50 rounded-[32px] mb-4 overflow-hidden flex items-center justify-center p-2">
                      {p.image ? <img src={p.image} className="w-full h-full object-contain" /> : <i className="fas fa-image text-4xl text-slate-100"></i>}
                    </div>
                    <div className="space-y-1 mb-4">
                      <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">Ост: {p.quantity} {p.unit}</p>
                    </div>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="font-black text-slate-800 text-lg">{p.price.toLocaleString()} ₽</span>
                      <button
                        onClick={() => {
                          const existing = cart.find(i => i.productId === p.id);
                          if (existing) setCart(cart.map(i => i.productId === p.id ? {...i, quantity: i.quantity + 1} : i));
                          else setCart([...cart, { productId: p.id, name: p.name, price: p.price, quantity: 1, unit: p.unit }]);
                        }}
                        className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all"
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center bg-white rounded-[40px] border border-slate-100 opacity-50">
                <i className="fas fa-lock text-4xl text-slate-100 mb-4"></i>
                <p className="font-bold text-slate-400">Витрина скрыта</p>
              </div>
            )}

            {cart.length > 0 && (
              <button onClick={() => setIsOrdering(true)} className="fixed bottom-24 left-4 right-4 bg-indigo-600 text-white p-6 rounded-[32px] flex justify-between items-center shadow-2xl z-50 animate-slide-up hover:bg-indigo-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black">{cart.length}</div>
                  <div className="text-left">
                    <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">Ваш заказ</p>
                    <p className="text-lg font-black">{cartTotal.toLocaleString()} ₽</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black uppercase tracking-widest text-[10px]">Оформить</span>
                  <i className="fas fa-chevron-right text-[10px]"></i>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 text-center">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Ваш долг</p>
                <p className={`text-2xl font-black ${myStats.debt > 0 ? 'text-red-600' : 'text-slate-400'}`}>{myStats.debt.toLocaleString()} ₽</p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 text-center">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Закуп суммой</p>
                <p className="text-2xl font-black text-indigo-600">{myStats.totalPurchased.toLocaleString()} ₽</p>
              </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
              <p className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">История и платежи</p>
              {myHistory.map((op: any) => (
                <div key={op.id} className="p-5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{op.type === 'SALE' ? `Покупка №${op.id.slice(-4)}` : 'Платеж (Оплата)'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(op.date).toLocaleDateString()}</p>
                  </div>
                  <p className={`font-black text-lg ${op.type === 'PAYMENT' ? 'text-emerald-500' : 'text-slate-800'}`}>
                    {op.type === 'PAYMENT' ? '-' : ''}{(op.amount || op.total).toLocaleString()} ₽
                  </p>
                </div>
              ))}
              {myHistory.length === 0 && <p className="text-center py-20 text-slate-300 italic">История пуста</p>}
            </div>
          </div>
        )}

        {isOrdering && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-8 flex flex-col animate-slide-up max-h-[95vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Оформление заказа</h3>
                  <p className="text-xs text-slate-400 font-bold">Проверьте состав и данные</p>
                </div>
                <button onClick={() => setIsOrdering(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full active:scale-90 transition-all"><i className="fas fa-times"></i></button>
              </div>

              {!shopData?.customerIdInShop && (
                <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 mb-6 space-y-4">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Ваши контакты (Обязательно)</p>
                  <input
                    className="w-full p-4 bg-white border border-indigo-100 rounded-2xl outline-none text-sm font-bold"
                    placeholder="Ваше Имя"
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                  />
                  <input
                    className="w-full p-4 bg-white border border-indigo-100 rounded-2xl outline-none text-sm font-bold"
                    placeholder="Номер телефона"
                    type="tel"
                    value={tempPhone}
                    onChange={e => setTempPhone(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-3 mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Состав заказа</p>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto no-scrollbar pr-1">
                  {cart.map(item => (
                    <div key={item.productId} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit} x {item.price} ₽</p>
                      </div>
                      <button onClick={() => setCart(cart.filter(i=>i.productId!==item.productId))} className="text-red-300 p-2"><i className="fas fa-trash-alt"></i></button>
                    </div>
                  ))}
                </div>
              </div>

              <textarea
                placeholder="Примечание к заказу..."
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 mb-6 resize-none"
                rows={2}
                value={note}
                onChange={e=>setNote(e.target.value)}
              />

              <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Итого к оплате</span>
                <span className="text-2xl font-black text-slate-800">{cartTotal.toLocaleString()} ₽</span>
              </div>
              <button onClick={handleSendOrder} className="w-full bg-indigo-600 text-white p-6 rounded-[28px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all">Отправить заказ</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-slate-800 px-2 tracking-tight">Поиск магазина</h2>
        <div className="relative">
          <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input
            className="w-full p-6 pl-14 bg-white rounded-[32px] shadow-sm border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm placeholder:text-slate-300"
            placeholder="Введите название магазина..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {isSearching && <div className="text-center py-6"><i className="fas fa-spinner fa-spin text-indigo-400"></i></div>}

        <div className="space-y-3">
          {searchResults.map(shop => (
            <div key={shop.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex justify-between items-center animate-fade-in">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner"><i className="fas fa-store"></i></div>
                <div>
                  <p className="font-black text-slate-800">{shop.shopName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Владелец: {shop.ownerName}</p>
                </div>
              </div>
              <button onClick={() => addShop(shop)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-90 transition-all">Добавить</button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Ваши магазины</h3>
        <div className="grid grid-cols-1 gap-4 overflow-hidden">
          {shopList.map(shop => (
            <div
              key={shop.id}
              className="relative overflow-hidden rounded-[40px] bg-red-500"
              onTouchStart={(e) => handleTouchStart(e, shop.id)}
              onTouchMove={(e) => handleTouchMove(e, shop.id)}
            >
              {/* Кнопка удаления (под карточкой) */}
              <button
                onClick={() => removeShop(shop.id)}
                className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 text-white font-black uppercase text-[10px] flex items-center justify-center"
              >
                Удалить
              </button>

              {/* Сама карточка магазина */}
              <button
                onClick={() => swipeId === shop.id ? setSwipeId(null) : setActiveShopId(shop.id)}
                style={{ transform: swipeId === shop.id ? 'translateX(-96px)' : 'translateX(0)' }}
                className="relative w-full bg-white p-7 shadow-sm border border-slate-50 flex items-center gap-6 transition-transform duration-300 ease-out text-left active:scale-[0.98]"
              >
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center text-3xl shadow-lg shadow-indigo-100"><i className="fas fa-store"></i></div>
                <div className="flex-1">
                  <p className="text-lg font-black text-slate-800 leading-tight">{shop.shopName}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Свайп влево для удаления</p>
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300"><i className="fas fa-chevron-right text-xs"></i></div>
              </button>
            </div>
          ))}
          {shopList.length === 0 && searchQuery === '' && (
            <div className="text-center py-24 bg-white/50 rounded-[40px] border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6"><i className="fas fa-search text-3xl text-slate-200"></i></div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs px-10 leading-loose">Найдите и добавьте магазины,<br/>чтобы видеть свои покупки</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
