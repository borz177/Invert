
import React, { useState, useEffect, useMemo } from 'react';
import { User, Product, Sale, Order, AppSettings, CashEntry } from '../types';
import { db } from '../services/api';

interface ClientPortalProps {
  user: User;
  products: Product[]; // Это локальные продукты (не используются в глобальном режиме)
  sales: Sale[]; // Это локальные продажи
  orders: Order[];
  onAddOrder: (order: Order) => void;
  onUpdateOrder?: (order: Order) => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ user, onAddOrder, onUpdateOrder }) => {
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [shopList, setShopList] = useState<any[]>([]); // Мои добавленные магазины
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Состояние данных конкретного магазина
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

  // Загружаем список магазинов клиента при старте
  useEffect(() => {
    const fetchMyShops = async () => {
      const linked = await db.getData('linkedShops');
      if (Array.isArray(linked)) setShopList(linked);
    };
    fetchMyShops();
  }, []);

  // Поиск магазинов
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

  // Загрузка данных магазина при выборе
  useEffect(() => {
    if (!activeShopId) {
      setShopData(null);
      return;
    }
    const fetchShopInfo = async () => {
      // Имитируем получение данных именно этого магазина через API
      // В реальности мы вызываем db.getData с контекстом ownerId = activeShopId
      const [p, s, o, c, sett, customers] = await Promise.all([
        db.getDataOfShop(activeShopId, 'products'),
        db.getDataOfShop(activeShopId, 'sales'),
        db.getDataOfShop(activeShopId, 'orders'),
        db.getDataOfShop(activeShopId, 'cashEntries'),
        db.getDataOfShop(activeShopId, 'settings'),
        db.getDataOfShop(activeShopId, 'customers')
      ]);

      // Находим себя в списке клиентов этого магазина по email
      const meInShop = customers?.find((c: any) => c.email === user.email);

      setShopData({
        products: p || [],
        sales: s || [],
        orders: o || [],
        cashEntries: c || [],
        settings: sett || {},
        customerIdInShop: meInShop?.id
      });
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
  };

  const myHistory = useMemo(() => {
    if (!shopData || !shopData.customerIdInShop) return [];
    const s = shopData.sales.filter(x => x.customerId === shopData.customerIdInShop && !x.isDeleted);
    const p = shopData.cashEntries.filter(x => x.customerId === shopData.customerIdInShop && x.type === 'INCOME');
    return [...s.map(i => ({...i, type: 'SALE'})), ...p.map(i => ({...i, type: 'PAYMENT'}))]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shopData]);

  const myStats = useMemo(() => {
    if (!shopData || !shopData.customerIdInShop) return { debt: 0, totalPurchased: 0 };
    const sales = shopData.sales.filter(x => x.customerId === shopData.customerIdInShop && !x.isDeleted);
    const payments = shopData.cashEntries.filter(x => x.customerId === shopData.customerIdInShop && x.type === 'INCOME');

    const totalPurchased = sales.reduce((acc, i) => acc + i.total, 0);
    const totalPaid = payments.reduce((acc, i) => acc + i.amount, 0);

    // Долг может быть также в объекте customer
    return {
      debt: totalPurchased - totalPaid,
      totalPurchased
    };
  }, [shopData]);

  const handleSendOrder = () => {
    if (cart.length === 0 || !activeShopId) return;
    const newOrder: Order = {
      id: Date.now().toString(),
      customerId: shopData?.customerIdInShop || user.id, // Если продавец еще не добавил нас, используем свой ID
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      total: cart.reduce((acc, i) => acc + i.price * i.quantity, 0),
      status: 'NEW',
      date: new Date().toISOString(),
      note: note.trim() || undefined
    };
    // Отправляем в базу магазина
    db.saveDataOfShop(activeShopId, 'orders', [newOrder, ...(shopData?.orders || [])]);
    setCart([]);
    setIsOrdering(false);
    alert('Заказ отправлен в магазин!');
  };

  // ЕСЛИ МАГАЗИН ВЫБРАН
  if (activeShopId && shopData) {
    return (
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveShopId(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
              <i className="fas fa-arrow-left"></i>
            </button>
            <h2 className="font-black text-slate-800">{shopData.settings.shopName || 'Магазин'}</h2>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-2xl">
            <button onClick={() => setTab('PRODUCTS')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'PRODUCTS' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Витрина</button>
            <button onClick={() => setTab('HISTORY')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'HISTORY' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>История</button>
          </div>
        </div>

        {tab === 'PRODUCTS' ? (
          <div className="space-y-4">
            {shopData.settings.showProductsToClients ? (
              <div className="grid grid-cols-2 gap-3">
                {shopData.products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                    <div className="aspect-square bg-slate-50 rounded-2xl mb-3 overflow-hidden flex items-center justify-center">
                      {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <i className="fas fa-image text-2xl text-slate-200"></i>}
                    </div>
                    <p className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight mb-2">{p.name}</p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="font-black text-indigo-600">{p.price.toLocaleString()} ₽</span>
                      <button
                        onClick={() => {
                          const existing = cart.find(i => i.productId === p.id);
                          if (existing) setCart(cart.map(i => i.productId === p.id ? {...i, quantity: i.quantity + 1} : i));
                          else setCart([...cart, { productId: p.id, name: p.name, price: p.price, quantity: 1, unit: p.unit }]);
                        }}
                        className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
                {shopData.products.length === 0 && <p className="col-span-2 text-center py-20 text-slate-300 italic">Товаров нет</p>}
              </div>
            ) : (
              <div className="p-10 text-center bg-white rounded-[40px] border border-slate-100">
                <i className="fas fa-lock text-4xl text-slate-100 mb-4"></i>
                <p className="font-bold text-slate-400">Витрина скрыта владельцем</p>
              </div>
            )}

            {cart.length > 0 && (
              <button onClick={() => setIsOrdering(true)} className="fixed bottom-24 left-4 right-4 bg-slate-800 text-white p-6 rounded-[32px] flex justify-between items-center shadow-2xl z-50 animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black">{cart.length}</div>
                  <div className="text-left"><p className="text-[10px] opacity-60 uppercase font-black">Ваш заказ</p><p className="text-lg font-black">{cart.reduce((a,i)=>a+i.price*i.quantity,0).toLocaleString()} ₽</p></div>
                </div>
                <span className="font-black uppercase tracking-widest text-xs">Оформить</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 text-center">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Ваш долг</p>
                <p className={`text-2xl font-black ${myStats.debt > 0 ? 'text-red-600' : 'text-slate-400'}`}>{myStats.debt.toLocaleString()} ₽</p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 text-center">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Всего закупок</p>
                <p className="text-2xl font-black text-indigo-600">{myStats.totalPurchased.toLocaleString()} ₽</p>
              </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
              <p className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">История операций</p>
              {myHistory.map((op: any) => (
                <div key={op.id} className="p-5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{op.type === 'SALE' ? `Покупка №${op.id.slice(-4)}` : 'Платеж (Оплата долга)'}</p>
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
            <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-6 flex flex-col animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Корзина</h3>
                <button onClick={() => setIsOrdering(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full"><i className="fas fa-times"></i></button>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[50vh] no-scrollbar">
                {cart.map(item => (
                  <div key={item.productId} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div><p className="font-bold text-slate-800 text-sm">{item.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit} x {item.price} ₽</p></div>
                    <button onClick={() => setCart(cart.filter(i=>i.productId!==item.productId))} className="text-red-300"><i className="fas fa-trash"></i></button>
                  </div>
                ))}
              </div>
              <textarea placeholder="Комментарий..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-4 text-sm outline-none" value={note} onChange={e=>setNote(e.target.value)} />
              <button onClick={handleSendOrder} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest mt-6 shadow-xl shadow-indigo-100">Отправить заказ</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ГЛАВНЫЙ ЭКРАН (СПИСОК МАГАЗИНОВ И ПОИСК)
  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-slate-800 px-2">Поиск магазина</h2>
        <div className="relative">
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            className="w-full p-5 pl-14 bg-white rounded-[24px] shadow-sm border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
            placeholder="Введите название магазина..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {isSearching && <div className="text-center py-4"><i className="fas fa-spinner fa-spin text-indigo-400"></i></div>}

        <div className="space-y-2">
          {searchResults.map(shop => (
            <div key={shop.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-store"></i></div>
                <div><p className="font-black text-slate-800">{shop.shopName}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Владелец: {shop.ownerName}</p></div>
              </div>
              <button onClick={() => addShop(shop)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Добавить</button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Мои магазины</h3>
        <div className="grid grid-cols-1 gap-3">
          {shopList.map(shop => (
            <div key={shop.id} className="relative group">
              <button
                onClick={() => setActiveShopId(shop.id)}
                className="w-full bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-5 hover:border-indigo-300 transition-all text-left"
              >
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[22px] flex items-center justify-center text-2xl"><i className="fas fa-store"></i></div>
                <div className="flex-1">
                  <p className="text-lg font-black text-slate-800">{shop.shopName}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Перейти к покупкам</p>
                </div>
                <i className="fas fa-chevron-right text-slate-200"></i>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeShop(shop.id); }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-red-100"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          ))}
          {shopList.length === 0 && searchQuery === '' && (
            <div className="text-center py-20 bg-white/50 rounded-[40px] border border-dashed border-slate-200">
              <i className="fas fa-search text-4xl text-slate-200 mb-4"></i>
              <p className="text-slate-400 font-medium">Найдите и добавьте магазины,<br/>чтобы видеть свои покупки</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
