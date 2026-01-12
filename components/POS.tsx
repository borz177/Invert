
import React, { useState, useEffect } from 'react';
import { Product, Sale, Customer, AppSettings } from '../types';

interface POSProps {
  products: Product[];
  customers: Customer[];
  cart: Array<{ id: string; name: string; price: number; cost: number; quantity: number; unit: string }>;
  setCart: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; price: number; cost: number; quantity: number; unit: string }>>>;
  onSale: (sale: Sale) => void;
  currentUserId?: string;
  settings?: AppSettings;
}

const POS: React.FC<POSProps> = ({ products, customers, cart, setCart, onSale, currentUserId, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [successSale, setSuccessSale] = useState<Sale | null>(null);

  const [qtyModalProduct, setQtyModalProduct] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<number>(1);
  const [inputPrice, setInputPrice] = useState<number>(0);

  const openQtyModal = (p: Product) => {
    if (p.quantity <= 0) {
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
    if (inputPrice < 0) { alert("Цена не может быть отрицательной"); return; }
    if (inputQty > qtyModalProduct.quantity) { alert(`Недостаточно товара! В наличии: ${qtyModalProduct.quantity}`); return; }

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
        unit: p.unit || 'шт'
      }]);
    }
    setQtyModalProduct(null);
    setIsCartOpen(true);
  };

  const updateCartQuantity = (id: string, price: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id && item.price === price) {
        const product = products.find(p => p.id === id);
        const newQty = Math.max(1, item.quantity + delta);
        if (product && newQty > product.quantity) { alert("Больше нет в наличии!"); return item; }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string, price: number) => {
    setCart(cart.filter(item => !(item.id === id && item.price === price)));
  };

  const customer = customers.find(c => c.id === selectedCustomerId);
  const discountPercent = customer?.discount || 0;
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;

  const handlePrint = (sale: Sale) => {
    const cust = customers.find(c => c.id === sale.customerId);
    const shopName = settings?.shopName || "Магазин";

    const receiptHtml = `
      <div style="font-family: 'Courier New', Courier, monospace; width: 300px; padding: 20px; color: #000; font-size: 12px; line-height: 1.4;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${shopName.toUpperCase()}</h2>
          <p style="margin: 5px 0;">ТОВАРНЫЙ ЧЕК</p>
          <p style="margin: 0; font-size: 10px;">№ ${sale.id.slice(-6)} от ${new Date(sale.date).toLocaleString()}</p>
        </div>
        
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="text-align: left; font-size: 10px;">
                <th style="padding-bottom: 5px;">Наименование</th>
                <th style="text-align: right; padding-bottom: 5px;">Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => {
                const p = products.find(prod => prod.id === item.productId);
                return `
                  <tr>
                    <td style="padding-bottom: 3px;">
                      ${p?.name || 'Товар'}<br/>
                      <small>${item.quantity} x ${item.price} ₽</small>
                    </td>
                    <td style="text-align: right; vertical-align: top;">${(item.quantity * item.price).toLocaleString()} ₽</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-bottom: 10px;">
          <span>ИТОГО:</span>
          <span>${sale.total.toLocaleString()} ₽</span>
        </div>

        <div style="font-size: 10px; border-top: 1px solid #eee; pt: 10px;">
          <p style="margin: 2px 0;">Оплата: ${sale.paymentMethod === 'CASH' ? 'Наличные' : sale.paymentMethod === 'CARD' ? 'Карта' : 'В долг'}</p>
          <p style="margin: 2px 0;">Клиент: ${cust?.name || 'Розничный клиент'}</p>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 10px;">
          <p>Спасибо за покупку!</p>
        </div>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `receipt-${sale.id.slice(-6)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    window.html2pdf().from(receiptHtml).set(opt).save();
    setSuccessSale(null);
  };

  const checkout = (method: 'CASH' | 'CARD' | 'DEBT') => {
    if (cart.length === 0) return;
    if (method === 'DEBT' && !selectedCustomerId) { alert("Выберите клиента для продажи в долг"); return; }

    const newSale: Sale = {
      id: Date.now().toString(),
      employeeId: currentUserId || 'admin',
      items: cart.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price, cost: i.cost })),
      total,
      paymentMethod: method,
      date: new Date().toISOString(),
      customerId: selectedCustomerId || undefined
    };

    onSale(newSale);
    setSuccessSale(newSale);
    setCart([]);
    setSelectedCustomerId('');
    setIsCartOpen(false);
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
          ) : 'Продажа'}
        </h2>
        <button onClick={() => setIsCartOpen(true)} className={`relative p-4 rounded-2xl shadow-md border border-slate-100 transition-all ${cart.length > 0 ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>
          <i className="fas fa-shopping-basket text-xl"></i>
          {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-lg">{cart.length}</span>}
        </button>
      </div>

      <div className="relative">
        <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
        <input className="w-full p-4 pl-12 rounded-2xl bg-white shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {!selectedCategory && !searchTerm && (
        <div className="grid grid-cols-2 gap-3">
          {uniqueCategories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-indigo-300 active:scale-95 transition-all group">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm"><i className="fas fa-folder text-3xl"></i></div>
              <h3 className="font-black text-slate-800 text-sm truncate w-full">{cat}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{products.filter(p => p.category === cat).length} товаров</p>
            </button>
          ))}
        </div>
      )}

      {(selectedCategory || searchTerm) && (
        <div className="grid grid-cols-2 gap-3 pb-10">
          {(searchTerm ? filteredBySearch : activeProducts).map(p => (
            <button key={p.id} onClick={() => openQtyModal(p)} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 text-left active:scale-95 hover:border-indigo-300 transition-all flex flex-col justify-between min-h-[140px] animate-fade-in group">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-black mb-1">{p.category}</div>
                <div className="font-bold text-slate-800 line-clamp-2 leading-tight text-sm group-hover:text-indigo-600">{p.name}</div>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Ост: {p.quantity} {p.unit}</div>
                  <div className="text-[10px] text-slate-400 font-medium opacity-50">#{p.sku.slice(-4)}</div>
                </div>
                <div className="text-indigo-600 font-black text-lg">{p.price.toLocaleString()} ₽</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {qtyModalProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl p-8 animate-slide-up space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-800 mb-1">{qtyModalProduct.name}</h3>
              <p className="text-xs text-slate-400">В наличии: <span className="font-bold text-indigo-600">{qtyModalProduct.quantity} {qtyModalProduct.unit}</span></p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Количество ({qtyModalProduct.unit})</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl h-16 shadow-inner">
                  <button onClick={() => setInputQty(Math.max(1, inputQty - 1))} className="w-14 h-full text-slate-400 text-lg active:bg-slate-100 transition-colors"><i className="fas fa-minus"></i></button>
                  <input type="number" step="any" inputMode="decimal" className="flex-1 text-center bg-transparent outline-none font-black text-xl text-slate-800" value={inputQty === 0 ? '' : inputQty} onChange={e => setInputQty(parseFloat(e.target.value) || 0)}/>
                  <button onClick={() => setInputQty(Math.min(qtyModalProduct.quantity, inputQty + 1))} className="w-14 h-full text-slate-400 text-lg active:bg-slate-100 transition-colors"><i className="fas fa-plus"></i></button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Цена за единицу (₽)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    className="w-full p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl outline-none font-black text-xl text-indigo-600 text-center focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    value={inputPrice === 0 ? '' : inputPrice}
                    onChange={e => setInputPrice(parseFloat(e.target.value) || 0)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 font-black">₽</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setQtyModalProduct(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button onClick={confirmAddToCart} className="flex-1 bg-indigo-600 text-white py-4 rounded-3xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest text-xs">В корзину</button>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] shadow-2xl p-6 flex flex-col max-h-[90vh] animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Корзина</h3>
                <p className="text-xs text-slate-400 font-medium uppercase">{cart.length} позиции</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center text-slate-400"><i className="fas fa-times text-xl"></i></button>
            </div>

            <div className="mb-4 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Клиент</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm text-slate-600" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                <option value="">Розничный покупатель</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.debt > 0 ? `(Долг: ${c.debt} ₽)` : ''}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 no-scrollbar">
              {cart.map((item, idx) => (
                <div key={`${item.id}-${item.price}-${idx}`} className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-slate-800 truncate text-sm">{item.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-indigo-500 font-bold">{item.price.toLocaleString()} ₽ / {item.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <button onClick={() => updateCartQuantity(item.id, item.price, -1)} className="w-10 h-10 flex items-center justify-center text-slate-400"><i className="fas fa-minus text-xs"></i></button>
                      <span className="font-black px-1 text-slate-700 min-w-[30px] text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, item.price, 1)} className="w-10 h-10 flex items-center justify-center text-slate-400"><i className="fas fa-plus text-xs"></i></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id, item.price)} className="w-10 h-10 flex items-center justify-center text-red-200 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-20 text-center text-slate-300">
                   <i className="fas fa-shopping-basket text-4xl mb-3 block opacity-20"></i>
                   <p className="font-bold">Корзина пуста</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-2 mb-4 px-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400"><span>ПРОМЕЖУТОЧНЫЙ ИТОГ</span><span>{subtotal.toLocaleString()} ₽</span></div>
                  {discountPercent > 0 && <div className="flex justify-between items-center text-xs font-bold text-emerald-500"><span>СКИДКА КЛИЕНТА ({discountPercent}%)</span><span>-{discountAmount.toLocaleString()} ₽</span></div>}
                  <div className="flex justify-between items-center"><span className="text-slate-400 font-bold uppercase text-[10px]">Итог к оплате</span><span className="text-3xl font-black text-slate-800">{total.toLocaleString()} ₽</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => checkout('CASH')} className="bg-slate-800 text-white p-4 rounded-2xl font-black shadow-lg flex flex-col items-center active:scale-95 transition-transform"><i className="fas fa-money-bill-wave text-lg mb-1"></i><span className="text-[9px] uppercase">Нал</span></button>
                  <button onClick={() => checkout('CARD')} className="bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg flex flex-col items-center active:scale-95 transition-transform"><i className="fas fa-credit-card text-lg mb-1"></i><span className="text-[9px] uppercase">Карта</span></button>
                  <button onClick={() => checkout('DEBT')} disabled={!selectedCustomerId} className="bg-red-50 text-white p-4 rounded-2xl font-black shadow-lg flex flex-col items-center active:scale-95 transition-transform disabled:opacity-40 bg-red-500"><i className="fas fa-hand-holding-usd text-lg mb-1"></i><span className="text-[9px] uppercase">В долг</span></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {successSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-center space-y-6 animate-slide-up">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto text-3xl"><i className="fas fa-check"></i></div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800">Продажа оформлена!</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">Сумма: {successSale.total.toLocaleString()} ₽</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => handlePrint(successSale)} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black shadow-lg flex items-center justify-center gap-3">
                <i className="fas fa-print"></i> ПЕЧАТЬ ЧЕКА
              </button>
              <button onClick={() => setSuccessSale(null)} className="w-full py-4 text-slate-400 font-bold">Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
