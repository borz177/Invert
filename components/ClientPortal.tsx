
import React, { useState, useMemo } from 'react';
import { User, Product, Sale, Order } from '../types';

interface ClientPortalProps {
  user: User;
  products: Product[];
  sales: Sale[];
  orders: Order[];
  onAddOrder: (order: Order) => void;
  onUpdateOrder?: (order: Order) => void;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ user, products, sales, orders, onAddOrder, onUpdateOrder }) => {
  const [tab, setTab] = useState<'MY_HISTORY' | 'CREATE_ORDER'>('CREATE_ORDER');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{ type: 'INVOICE' | 'ORDER', item: any } | null>(null);

  const mySales = useMemo(() => {
    return sales.filter(s => s.customerId === user.id && !s.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, user.id]);

  const myOrders = useMemo(() => {
    return orders.filter(o => o.customerId === user.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, user.id]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      setCart(cart.map(i => i.productId === product.id ? {...i, quantity: i.quantity + 1} : i));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1, unit: product.unit }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.productId !== id));
  };

  const totalCart = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const handleSendOrder = () => {
    if (cart.length === 0) return;
    const newOrder: Order = {
      id: Date.now().toString(),
      customerId: user.id,
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      total: totalCart,
      status: 'NEW',
      date: new Date().toISOString()
    };
    onAddOrder(newOrder);
    setCart([]);
    setIsOrdering(false);
    alert('Ваш заказ успешно отправлен! Ожидайте подтверждения менеджером.');
  };

  const handleCancelOrder = (order: Order) => {
    if (window.confirm('Вы действительно хотите отменить этот заказ?') && onUpdateOrder) {
      onUpdateOrder({ ...order, status: 'CANCELLED' });
      setSelectedDetail(null);
    }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Товар удален';
  const getProductUnit = (id: string) => products.find(p => p.id === id)?.unit || 'шт';

  return (
    <div className="space-y-6 pb-24">
      <div className="flex bg-white p-1 rounded-3xl shadow-sm border border-slate-100 mb-4 sticky top-0 z-10">
        <button
          onClick={() => setTab('CREATE_ORDER')}
          className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${tab === 'CREATE_ORDER' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
        >
          Заказать товар
        </button>
        <button
          onClick={() => setTab('MY_HISTORY')}
          className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${tab === 'MY_HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
        >
          Моя история
        </button>
      </div>

      {tab === 'CREATE_ORDER' ? (
        <div className="space-y-4">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
            <input
              className="w-full p-4 pl-12 rounded-2xl bg-white shadow-sm border border-slate-100 outline-none"
              placeholder="Поиск товаров в магазине..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white p-0 rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden animate-fade-in group">
                <div className="relative aspect-square w-full bg-slate-50 flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt={p.name} />
                  ) : (
                    <i className="fas fa-image text-4xl text-slate-200"></i>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="text-[8px] font-black text-indigo-400 uppercase bg-white/90 backdrop-blur px-2 py-1 rounded-lg border border-slate-100">
                      {p.category}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div className="font-bold text-slate-800 line-clamp-2 leading-tight text-sm mb-2">{p.name}</div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Ост: {p.quantity} {p.unit}</p>
                      <p className="text-lg font-black text-slate-800">{p.price.toLocaleString()} ₽</p>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="fixed bottom-24 left-4 right-4 z-[100] animate-slide-up">
              <button
                onClick={() => setIsOrdering(true)}
                className="w-full bg-slate-800 text-white p-6 rounded-[32px] flex items-center justify-between shadow-2xl shadow-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center font-black">{cart.length}</div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase opacity-60">Ваш заказ</p>
                    <p className="text-lg font-black">{totalCart.toLocaleString()} ₽</p>
                  </div>
                </div>
                <span className="font-black uppercase tracking-widest text-xs">Оформить</span>
              </button>
            </div>
          )}

          {isOrdering && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end justify-center">
              <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-6 max-h-[90vh] flex flex-col animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Ваша корзина</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{cart.length} поз.</p>
                  </div>
                  <button onClick={() => setIsOrdering(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
                  {cart.map(item => (
                    <div key={item.productId} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit} x {item.price.toLocaleString()} ₽</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-black text-slate-800">{(item.quantity * item.price).toLocaleString()} ₽</p>
                        <button onClick={() => removeFromCart(item.productId)} className="text-red-300 hover:text-red-500"><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Итого к оплате</span>
                    <span className="text-3xl font-black text-slate-800">{totalCart.toLocaleString()} ₽</span>
                  </div>
                  <button onClick={handleSendOrder} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">Отправить заказ</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Текущие заказы</h4>
            {myOrders.map(o => (
              <div
                key={o.id}
                onClick={() => setSelectedDetail({ type: 'ORDER', item: o })}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${o.status === 'NEW' ? 'bg-indigo-50 text-indigo-500' : o.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                    <i className={`fas ${o.status === 'NEW' ? 'fa-hourglass-half' : o.status === 'CONFIRMED' ? 'fa-check-double' : 'fa-times'}`}></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Заказ №{o.id.slice(-4)}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(o.date).toLocaleDateString()} • {o.items.length} поз.</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${o.status === 'NEW' ? 'bg-indigo-100 text-indigo-600' : o.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {o.status === 'NEW' ? 'Обрабатывается' : o.status === 'CONFIRMED' ? 'Подтвержден' : 'Отменен'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-800">{o.total.toLocaleString()} ₽</p>
                  <i className="fas fa-chevron-right text-[10px] text-slate-300"></i>
                </div>
              </div>
            ))}
            {myOrders.length === 0 && <p className="text-center py-10 text-slate-300 italic text-sm">Активных заказов нет</p>}
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Мои накладные</h4>
            {mySales.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedDetail({ type: 'INVOICE', item: s })}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center active:scale-95 transition-transform"
              >
                <div>
                  <p className="font-bold text-slate-800 text-sm">Накладная №{s.id.slice(-4)}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-600">{s.total.toLocaleString()} ₽</p>
                  <span className="text-[8px] font-black text-slate-300 uppercase block">{s.paymentMethod === 'CASH' ? 'Наличными' : s.paymentMethod === 'CARD' ? 'Карта' : 'В долг'}</span>
                </div>
              </div>
            ))}
            {mySales.length === 0 && <p className="text-center py-10 text-slate-300 italic text-sm">История накладных пуста</p>}
          </div>
        </div>
      )}

      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-6 max-h-[90vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  {selectedDetail.type === 'INVOICE' ? 'Накладная' : 'Заказ'} №{selectedDetail.item.id.slice(-4)}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Детализация товаров
                </p>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
              {selectedDetail.item.items.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    {products.find(p => p.id === it.productId)?.image && (
                      <img src={products.find(p => p.id === it.productId)?.image} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{getProductName(it.productId)}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{it.quantity} {getProductUnit(it.productId)} x {it.price.toLocaleString()} ₽</p>
                    </div>
                  </div>
                  <p className="font-black text-slate-800">{(it.quantity * it.price).toLocaleString()} ₽</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Итого</span>
                  <p className="text-3xl font-black text-slate-800">{selectedDetail.item.total.toLocaleString()} ₽</p>
                </div>
                {selectedDetail.type === 'ORDER' && selectedDetail.item.status === 'NEW' && (
                  <button
                    onClick={() => handleCancelOrder(selectedDetail.item)}
                    className="bg-red-50 text-red-500 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest active:bg-red-100"
                  >
                    Отменить заказ
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedDetail(null)} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-100">Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
