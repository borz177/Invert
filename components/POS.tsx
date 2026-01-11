
import React, { useState, useEffect } from 'react';
import { Product, Sale, Customer } from '../types';

interface POSProps {
  products: Product[];
  customers: Customer[];
  cart: Array<{ id: string; name: string; price: number; cost: number; quantity: number; unit: string; type?: 'PRODUCT' | 'SERVICE' }>;
  setCart: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; price: number; cost: number; quantity: number; unit: string; type?: 'PRODUCT' | 'SERVICE' }>>>;
  onSale: (sale: Sale) => void;
  onAddCustomer: (customer: Customer) => void;
  currentUserId?: string;
}

const POS: React.FC<POSProps> = ({ products, customers, cart, setCart, onSale, onAddCustomer, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const [qtyModalProduct, setQtyModalProduct] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<number>(1);
  const [inputPrice, setInputPrice] = useState<number>(0);

  // Состояние для формы быстрого добавления клиента
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const openQtyModal = (p: Product) => {
    if (p.type !== 'SERVICE' && p.quantity <= 0) {
      alert("Товар закончился на складе!");
      return;
    }
    setQtyModalProduct(p);
    setInputQty(1);
    setInputPrice(p.price);
  };

  const confirmAddToCart = () => {
    if (!qtyModalProduct) return;
    if (inputQty <= 0) { alert("Введите корректное количество"); return; }
    if (qtyModalProduct.type !== 'SERVICE' && inputQty > qtyModalProduct.quantity) {
      alert(`Недостаточно товара! В наличии: ${qtyModalProduct.quantity}`);
      return;
    }

    const p = qtyModalProduct;
    const existingIndex = cart.findIndex(item => item.id === p.id && item.price === inputPrice);

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += inputQty;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: p.id,
        name: p.name,
        price: inputPrice,
        cost: p.cost,
        quantity: inputQty,
        unit: p.unit || 'шт',
        type: p.type || 'PRODUCT'
      }]);
    }
    setQtyModalProduct(null);
    setIsCartOpen(true);
  };

  const handleQuickCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const newCust: Customer = {
      id: `CUST-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      debt: 0,
      discount: 0
    };
    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowQuickCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  const checkout = (method: 'CASH' | 'CARD' | 'DEBT') => {
    if (cart.length === 0) return;
    if (method === 'DEBT' && !selectedCustomerId) { alert("Выберите клиента для продажи в долг"); return; }

    onSale({
      id: Date.now().toString(),
      employeeId: currentUserId || 'admin',
      items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price, cost: i.cost })),
      total: cart.reduce((acc, i) => acc + i.price * i.quantity, 0),
      paymentMethod: method,
      date: new Date().toISOString(),
      customerId: selectedCustomerId || undefined
    });

    setCart([]);
    setSelectedCustomerId('');
    setIsCartOpen(false);
    alert('Продажа успешно оформлена!');
  };

  const filteredBySearch = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeProducts = selectedCategory ? filteredBySearch.filter(p => p.category === selectedCategory) : [];
  const uniqueCategories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="flex flex-col h-full space-y-4 pb-20">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-bold text-slate-800">
          {selectedCategory && !searchTerm ? (
            <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 hover:text-indigo-600 transition-colors"><i className="fas fa-arrow-left text-sm"></i> {selectedCategory}</button>
          ) : 'Оформление'}
        </h2>
        <button onClick={() => setIsCartOpen(true)} className={`relative p-4 rounded-2xl shadow-md border border-slate-100 transition-all ${cart.length > 0 ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>
          <i className="fas fa-shopping-basket text-xl"></i>
          {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-lg">{cart.length}</span>}
        </button>
      </div>

      <div className="relative">
        <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
        <input className="w-full p-4 pl-12 rounded-2xl bg-white shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Поиск товара или услуги..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {!selectedCategory && !searchTerm && (
        <div className="grid grid-cols-2 gap-3">
          {uniqueCategories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-indigo-300 transition-all group">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm"><i className="fas fa-folder text-3xl"></i></div>
              <h3 className="font-black text-slate-800 text-sm truncate w-full">{cat}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{products.filter(p => p.category === cat).length} поз.</p>
            </button>
          ))}
        </div>
      )}

      {(selectedCategory || searchTerm) && (
        <div className="grid grid-cols-2 gap-3 pb-10">
          {(searchTerm ? filteredBySearch : activeProducts).map(p => (
            <button key={p.id} onClick={() => openQtyModal(p)} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-left active:scale-95 transition-all flex flex-col justify-between min-h-[140px] animate-fade-in group">
              <div>
                <div className="flex justify-between items-start">
                  <div className="text-[10px] text-slate-400 uppercase font-black mb-1">{p.category}</div>
                  {p.type === 'SERVICE' && <i className="fas fa-bolt text-emerald-500 text-[10px]"></i>}
                </div>
                <div className="font-bold text-slate-800 line-clamp-2 leading-tight text-sm group-hover:text-indigo-600">{p.name}</div>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div>
                  {p.type === 'SERVICE' ? <div className="text-[9px] text-emerald-600 font-black uppercase">Услуга</div> : <div className="text-[10px] text-slate-400 font-medium">Ост: {p.quantity} {p.unit}</div>}
                </div>
                <div className="text-indigo-600 font-black text-lg">{p.price.toLocaleString()} ₽</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {qtyModalProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-slide-up space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-black text-slate-800">{qtyModalProduct.name}</h3>
                {qtyModalProduct.type === 'SERVICE' && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded">Услуга</span>}
              </div>
              {qtyModalProduct.type !== 'SERVICE' && <p className="text-xs text-slate-400">В наличии: <span className="font-bold text-indigo-600">{qtyModalProduct.quantity} {qtyModalProduct.unit}</span></p>}
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Количество</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl h-16 shadow-inner">
                  <button onClick={() => setInputQty(Math.max(1, inputQty - 1))} className="w-14 h-full text-slate-400 text-lg"><i className="fas fa-minus"></i></button>
                  <input type="number" step="any" className="flex-1 text-center bg-transparent outline-none font-black text-xl" value={inputQty === 0 ? '' : inputQty} onChange={e => setInputQty(parseFloat(e.target.value) || 0)}/>
                  <button onClick={() => setInputQty(qtyModalProduct.type === 'SERVICE' ? inputQty + 1 : Math.min(qtyModalProduct.quantity, inputQty + 1))} className="w-14 h-full text-slate-400 text-lg"><i className="fas fa-plus"></i></button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Цена за ед. (₽)</label>
                <input type="number" className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none font-black text-xl text-indigo-600 text-center" value={inputPrice === 0 ? '' : inputPrice} onChange={e => setInputPrice(parseFloat(e.target.value) || 0)}/>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setQtyModalProduct(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button onClick={confirmAddToCart} className="flex-1 bg-indigo-600 text-white py-4 rounded-3xl font-black shadow-lg">Добавить</button>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-6 flex flex-col max-h-[90vh] animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">Корзина ({cart.length})</h3>
              <button onClick={() => setIsCartOpen(false)} className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center text-slate-400"><i className="fas fa-times text-xl"></i></button>
            </div>

            <div className="mb-4 space-y-1">
              <div className="flex justify-between items-center px-1 mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Клиент</label>
                <button onClick={() => setShowQuickCustomer(true)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"><i className="fas fa-user-plus"></i> Создать</button>
              </div>
              <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                <option value="">Розничный покупатель</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.debt > 0 ? `(Долг: ${c.debt} ₽)` : ''}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pb-4">
              {cart.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-slate-800 truncate text-sm">{item.name}</p>
                    <p className="text-xs text-indigo-500 font-bold">{item.price.toLocaleString()} ₽ / {item.unit}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-200 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <div className="py-20 text-center text-slate-300 italic">Корзина пуста</div>}
            </div>

            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6 px-2"><span className="text-slate-400 font-bold uppercase text-[10px]">К оплате</span><span className="text-3xl font-black text-slate-800">{cart.reduce((a, b) => a + b.price * b.quantity, 0).toLocaleString()} ₽</span></div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => checkout('CASH')} className="bg-slate-800 text-white p-4 rounded-2xl font-black shadow-lg flex flex-col items-center"><i className="fas fa-money-bill-wave text-lg mb-1"></i><span className="text-[9px] uppercase">Нал</span></button>
                  <button onClick={() => checkout('CARD')} className="bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg flex flex-col items-center"><i className="fas fa-credit-card text-lg mb-1"></i><span className="text-[9px] uppercase">Карта</span></button>
                  <button onClick={() => checkout('DEBT')} className="bg-red-500 text-white p-4 rounded-2xl font-black shadow-lg flex flex-col items-center disabled:opacity-40" disabled={!selectedCustomerId}><i className="fas fa-hand-holding-usd text-lg mb-1"></i><span className="text-[9px] uppercase">В долг</span></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showQuickCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleQuickCustomerSubmit} className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm space-y-6 animate-slide-up">
            <h3 className="text-xl font-black text-slate-800 text-center">Новый клиент</h3>
            <div className="space-y-4">
              <input required autoFocus className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="ФИО клиента..." value={newCustName} onChange={e => setNewCustName(e.target.value)} />
              <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Номер телефона..." type="tel" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowQuickCustomer(false)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg uppercase text-xs">Создать</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default POS;
