
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

const ClientPortal: React.FC<ClientPortalProps> = ({ user, onAddOrder, onActiveShopChange }) => {
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
  const [selectedOpDetail, setSelectedOpDetail] = useState<any | null>(null);
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const touchStart = useRef<number>(0);

  useEffect(() => {
    db.getData('linkedShops').then(linked => { if (Array.isArray(linked)) setShopList(linked); });
  }, []);

  const fetchShopInfo = async (shopId: string) => {
    const [p, s, o, c, sett, customers] = await Promise.all([
      db.getDataOfShop(shopId, 'products'), db.getDataOfShop(shopId, 'sales'),
      db.getDataOfShop(shopId, 'orders'), db.getDataOfShop(shopId, 'cashEntries'),
      db.getDataOfShop(shopId, 'settings'), db.getDataOfShop(shopId, 'customers')
    ]);
    const meInShop = customers?.find((c: any) => (c.email === user.email) || (c.name === user.name));
    setShopData({
      products: p || [], sales: s || [], orders: o || [], cashEntries: c || [],
      settings: sett || {}, customerIdInShop: meInShop?.id
    });
    if (onActiveShopChange) onActiveShopChange(sett?.shopName || 'Магазин');
  };

  useEffect(() => {
    if (activeShopId) fetchShopInfo(activeShopId);
    else { setShopData(null); if (onActiveShopChange) onActiveShopChange(null); }
  }, [activeShopId]);

  const handleSendOrder = async () => {
    if (!cart.length || !activeShopId) return;
    const newOrder: Order = {
      id: Date.now().toString(),
      customerId: shopData?.customerIdInShop || user.id,
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      total: cart.reduce((acc, i) => acc + i.price * i.quantity, 0),
      status: 'NEW',
      date: new Date().toISOString(),
      note: `${shopData?.customerIdInShop ? '' : `[Имя: ${tempName}, Тел: ${tempPhone}] `}${note}`
    };
    await db.saveDataOfShop(activeShopId, 'orders', [newOrder, ...(shopData?.orders || [])]);
    // Сразу обновляем локально для мгновенного отображения статуса "Обрабатывается"
    setShopData(prev => prev ? { ...prev, orders: [newOrder, ...prev.orders] } : null);
    setCart([]); setIsOrdering(false); setNote('');
    alert('Заявка отправлена! Статус: Обрабатывается');
  };

  const myHistory = useMemo(() => {
    if (!shopData) return [];
    const mySales = shopData.sales.filter(x => !x.isDeleted && (x.customerId === shopData.customerIdInShop || x.customerId === user.id));
    const myPayments = shopData.cashEntries.filter(x => x.type === 'INCOME' && (x.customerId === shopData.customerIdInShop || x.customerId === user.id));
    const myOrders = shopData.orders.filter(x => (x.customerId === shopData.customerIdInShop || x.customerId === user.id) && (x.status === 'NEW' || x.status === 'CANCELLED'));
    return [...mySales.map(i => ({...i, type: 'SALE'})), ...myPayments.map(i => ({...i, type: 'PAYMENT'})), ...myOrders.map(i => ({...i, type: 'ORDER'}))]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shopData]);

  if (activeShopId && shopData) {
    return (
      <div className="space-y-6 pb-32 animate-fade-in">
        <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-slate-50">
          <button onClick={() => setTab('PRODUCTS')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${tab === 'PRODUCTS' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Заказать</button>
          <button onClick={() => setTab('HISTORY')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${tab === 'HISTORY' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>История</button>
        </div>
        {tab === 'PRODUCTS' ? (
          <div className="grid grid-cols-2 gap-4">
            {shopData.products.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-[32px] border border-slate-50 flex flex-col">
                <div className="aspect-square bg-slate-50 rounded-2xl mb-3 flex items-center justify-center p-2">
                  {p.image ? <img src={p.image} className="h-full w-full object-contain" /> : <i className="fas fa-image text-2xl text-slate-100"></i>}
                </div>
                <p className="font-bold text-slate-800 text-xs truncate">{p.name}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-black text-slate-800 text-sm">{p.price.toLocaleString()} ₽</span>
                  <button onClick={() => setCart([...cart, { productId: p.id, price: p.price, quantity: 1 }])} className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center"><i className="fas fa-plus text-[10px]"></i></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {myHistory.map((op: any) => (
              <div key={op.id} onClick={() => setSelectedOpDetail(op)} className="bg-white p-5 rounded-3xl border border-slate-50 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{op.type === 'SALE' ? `Покупка №${op.id.slice(-4)}` : op.type === 'ORDER' ? 'Заявка' : 'Платеж'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(op.date).toLocaleDateString()}</p>
                  {op.type === 'ORDER' && <span className="text-[9px] font-black text-indigo-500 uppercase">{op.status === 'NEW' ? 'Обрабатывается' : 'Отменена'}</span>}
                </div>
                <p className="font-black text-slate-800">{(op.amount || op.total).toLocaleString()} ₽</p>
              </div>
            ))}
            {!myHistory.length && <p className="text-center py-20 text-slate-300">История пуста</p>}
          </div>
        )}
        {cart.length > 0 && <button onClick={() => setIsOrdering(true)} className="fixed bottom-24 left-4 right-4 bg-indigo-600 text-white p-5 rounded-2xl font-black shadow-2xl flex justify-between"><span>Оформить ({cart.length})</span><span>{cart.reduce((a, b) => a + b.price * b.quantity, 0).toLocaleString()} ₽</span></button>}
        {isOrdering && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[40px] p-8 animate-slide-up">
              <h3 className="text-xl font-black mb-6">Ваш заказ</h3>
              {!shopData.customerIdInShop && (
                <div className="space-y-3 mb-6">
                  <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="Ваше имя" value={tempName} onChange={e => setTempName(e.target.value)} />
                  <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none" placeholder="Телефон" value={tempPhone} onChange={e => setTempPhone(e.target.value)} />
                </div>
              )}
              <textarea placeholder="Примечание..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none mb-6 h-24" value={note} onChange={e => setNote(e.target.value)} />
              <button onClick={handleSendOrder} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black">ОТПРАВИТЬ ЗАЯВКУ</button>
              <button onClick={() => setIsOrdering(false)} className="w-full p-4 text-slate-400 font-bold mt-2">Отмена</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-800">Магазины</h2>
      <input className="w-full p-6 bg-white rounded-3xl shadow-sm outline-none" placeholder="Поиск по названию..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      <div className="space-y-3">
        {shopList.map(shop => (
          <div key={shop.id} onClick={() => setActiveShopId(shop.id)} className="bg-white p-6 rounded-[32px] border border-slate-50 flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-store"></i></div>
            <div><p className="font-black text-slate-800 text-lg">{shop.shopName}</p><p className="text-xs text-slate-400 font-bold uppercase">Нажмите, чтобы войти</p></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientPortal;
