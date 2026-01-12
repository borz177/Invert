
import React, { useState, useEffect, useRef } from 'react';
import { Product, Transaction, Sale, CashEntry, AppView, Supplier, Customer, Employee, AppSettings, User, Order } from './types';
import { NAV_ITEMS, QUICK_ACTIONS, INITIAL_CATEGORIES } from './constants';
import { db } from './services/api';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import Warehouse from './components/Warehouse';
import POS from './components/POS';
import Cashbox from './components/Cashbox';
import Reports from './components/Reports';
import AllOperations from './components/AllOperations';
import Suppliers from './components/Suppliers';
import Clients from './components/Clients';
import Employees from './components/Employees';
import PriceList from './components/PriceList';
import StockReport from './components/StockReport';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Login from './components/Login';
import ClientPortal from './components/ClientPortal';
import OrdersManager from './components/OrdersManager';
import Tariffs from './components/Tariffs';

const DEFAULT_SETTINGS: AppSettings = {
  shopName: 'ИнвентарьПро',
  currency: '₽',
  lowStockThreshold: 5,
  darkMode: false
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>('DASHBOARD');

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [posCart, setPosCart] = useState<any[]>([]);
  const [warehouseBatch, setWarehouseBatch] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR'>('IDLE');
  const [isQuickMenuOpen, setQuickMenuOpen] = useState(false);
  const [activeClientShopName, setActiveClientShopName] = useState<string | null>(null);

  const isDataLoaded = useRef(false);
  const isClient = currentUser?.role === 'client';
  const isAdmin = currentUser?.role === 'admin';

  const handleLogin = (user: User) => {
    const sessionUser = { ...user };
    if (sessionUser.role === 'admin' && !sessionUser.ownerId) sessionUser.ownerId = sessionUser.id;
    setCurrentUser(sessionUser);
    setIsAuthenticated(true);
    localStorage.setItem('currentUser', JSON.stringify(sessionUser));
    setView(sessionUser.role === 'client' ? 'CLIENT_PORTAL' : 'DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
    setView('DASHBOARD');
  };

  const fetchAllData = async (silent = false) => {
    if (!isAuthenticated) { setIsLoading(false); return; }
    if (!silent) setIsLoading(true);
    setSyncStatus('SYNCING');
    try {
      const [p, t, s, c, sup, cust, emp, cats, sett, cart, batch, ords] = await Promise.all([
        db.getData('products'), db.getData('transactions'), db.getData('sales'),
        db.getData('cashEntries'), db.getData('suppliers'), db.getData('customers'),
        db.getData('employees'), db.getData('categories'), db.getData('settings'),
        db.getData('posCart'), db.getData('warehouseBatch'), db.getData('orders')
      ]);
      if (Array.isArray(p)) setProducts(p);
      if (Array.isArray(t)) setTransactions(t);
      if (Array.isArray(s)) setSales(s);
      if (Array.isArray(c)) setCashEntries(c);
      if (Array.isArray(sup)) setSuppliers(sup);
      if (Array.isArray(cust)) setCustomers(cust);
      if (Array.isArray(emp)) setEmployees(emp);
      if (Array.isArray(cats) && cats.length) setCategories(cats);
      if (Array.isArray(ords)) setOrders(ords);
      if (sett && sett.shopName) setSettings(sett);
      isDataLoaded.current = true;
      setSyncStatus('IDLE');
    } catch (e) { setSyncStatus('ERROR'); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        setCurrentUser(u);
        setIsAuthenticated(true);
        if (u.role === 'client') setView('CLIENT_PORTAL');
      } catch(e) { localStorage.removeItem('currentUser'); }
    } else { setIsLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) fetchAllData(); }, [isAuthenticated, currentUser?.ownerId]);

  useEffect(() => {
    if (!isDataLoaded.current || isLoading || !isAuthenticated) return;
    const timer = setTimeout(() => {
      const syncMap = [
        { key: 'products', data: products }, { key: 'transactions', data: transactions },
        { key: 'sales', data: sales }, { key: 'cashEntries', data: cashEntries },
        { key: 'suppliers', data: suppliers }, { key: 'customers', data: customers },
        { key: 'employees', data: employees }, { key: 'categories', data: categories },
        { key: 'settings', data: settings }, { key: 'orders', data: orders }
      ];
      Promise.all(syncMap.map(item => db.saveData(item.key, item.data)));
    }, 2000);
    return () => clearTimeout(timer);
  }, [products, transactions, sales, cashEntries, suppliers, customers, employees, categories, settings, orders]);

 const handleAddCashEntry = (entry: CashEntry) => {
  setCashEntries([entry, ...cashEntries]);

  // Уменьшаем долг клиента ТОЛЬКО если это НЕ автоматическая запись от продажи
  // (т.е. только при явной оплате долга, например, категория "Оплата")
  if (entry.type === 'INCOME' && entry.customerId && entry.category !== 'Продажа') {
    setCustomers(prev => prev.map(c =>
      c.id === entry.customerId
        ? { ...c, debt: Math.max(0, (Number(c.debt) || 0) - entry.amount) }
        : c
    ));
  }

  // Для поставщиков — аналогично (если нужно)
  if (entry.type === 'EXPENSE' && entry.supplierId) {
    setSuppliers(prev => prev.map(s =>
      s.id === entry.supplierId
        ? { ...s, debt: Math.max(0, (Number(s.debt) || 0) - entry.amount) }
        : s
    ));
  }
};

const handleConfirmOrder = (order: Order) => {
  let finalCustomerId = order.customerId;
  let updatedCustomers = [...customers];

  if (order.note && order.note.includes('[Имя:')) {
    const matchName = order.note.match(/\[Имя:\s*([^,]+)/);
    const matchPhone = order.note.match(/Тел:\s*([^\]]+)/);
    const name = matchName ? matchName[1].trim() : 'Новый клиент';
    const phone = matchPhone ? matchPhone[1].trim() : '';

    const existing = customers.find(c => (phone && c.phone === phone) || (c.id === order.customerId));
    if (!existing) {
      const newCust: Customer = { id: `CUST-${Date.now()}`, name, phone, debt: order.total, discount: 0 };
      updatedCustomers = [newCust, ...customers];
      finalCustomerId = newCust.id;
    } else {
      finalCustomerId = existing.id;
      updatedCustomers = customers.map(c => c.id === existing.id ? { ...c, debt: (Number(c.debt) || 0) + order.total } : c);
    }
  } else {
    updatedCustomers = customers.map(c => c.id === finalCustomerId ? { ...c, debt: (Number(c.debt) || 0) + order.total } : c);
  }

  const newSale: Sale = {
    id: `SALE-ORD-${order.id}`,
    employeeId: currentUser?.id || 'admin',
    items: order.items.map(it => ({ ...it, cost: products.find(p => p.id === it.productId)?.cost || 0 })),
    total: order.total,
    paymentMethod: 'DEBT',
    date: new Date().toISOString(),
    customerId: finalCustomerId
  };

  setProducts(products.map(p => {
    const it = order.items.find(x => x.productId === p.id);
    return (it && p.type !== 'SERVICE') ? { ...p, quantity: Math.max(0, p.quantity - it.quantity) } : p;
  }));

  setSales([newSale, ...sales]);
  setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'CONFIRMED', customerId: finalCustomerId } : o));
  setCustomers(updatedCustomers);
  alert('Заказ выдан! Сформирована продажа и обновлен долг клиента.');
};

  const handleClearData = async () => {
    if (!window.confirm('Очистить все данные?')) return;
    setProducts([]); setTransactions([]); setSales([]); setCashEntries([]); setSuppliers([]); setCustomers([]); setEmployees([]); setOrders([]); setCategories(INITIAL_CATEGORIES);
  };

  const renderView = () => {
    if (!currentUser) return null;

    // Если клиент и НЕ в профиле, показываем портал. Иначе переходим к свитчу.
    if (isClient && view !== 'PROFILE') {
      return <ClientPortal user={currentUser} products={products} sales={sales} orders={orders} onAddOrder={(o) => setOrders([o, ...orders])} onActiveShopChange={setActiveClientShopName} />;
    }

    switch (view) {
      case 'DASHBOARD': return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} onNavigate={setView} orderCount={orders.filter(o => o.status === 'NEW').length}/>;
      case 'PRODUCTS': return <ProductList products={products} categories={categories} canEdit={true} canCreate={true} canDelete={true} showCost={true} onAdd={p => setProducts([p, ...products])} onAddBulk={ps => setProducts([...ps, ...products])} onUpdate={p => setProducts(products.map(x => x.id === p.id ? p : x))} onDelete={id => setProducts(products.filter(x => x.id !== id))} onAddCategory={c => setCategories([...categories, c])} onRenameCategory={(o, n) => { setCategories(categories.map(c => c === o ? n : c)); setProducts(products.map(p => p.category === o ? { ...p, category: n } : p)); }} onDeleteCategory={c => { setCategories(categories.filter(x => x !== c)); setProducts(products.map(p => p.category === c ? { ...p, category: 'Другое' } : p)); }}/>;
      case 'WAREHOUSE': return <Warehouse products={products} suppliers={suppliers} transactions={transactions} batch={warehouseBatch} setBatch={setWarehouseBatch} onTransaction={t => setTransactions([t, ...transactions])} onTransactionsBulk={ts => setTransactions([...ts, ...transactions])} onAddCashEntry={handleAddCashEntry}/>;
      case 'SALES': return <POS products={products} customers={customers} cart={posCart} setCart={setPosCart} currentUserId={currentUser.id} onSale={s => { setSales([s, ...sales]); if (s.paymentMethod === 'DEBT' && s.customerId) setCustomers(prev => prev.map(c => c.id === s.customerId ? { ...c, debt: (Number(c.debt) || 0) + s.total } : c)); else if (s.paymentMethod !== 'DEBT') handleAddCashEntry({ id: `S-${Date.now()}`, amount: s.total, type: 'INCOME', category: 'Продажа', description: `Продажа №${s.id.slice(-4)}`, date: s.date, employeeId: s.employeeId }); }}/>;
      case 'CLIENTS': return <Clients customers={customers} sales={sales} cashEntries={cashEntries} onAdd={c => setCustomers([...customers, c])} onUpdate={c => setCustomers(customers.map(x => x.id === c.id ? c : x))} onDelete={id => setCustomers(customers.filter(x => x.id !== id))}/>;
      case 'SUPPLIERS': return <Suppliers suppliers={suppliers} transactions={transactions} cashEntries={cashEntries} products={products} onAdd={s => setSuppliers([...suppliers, s])} onUpdate={s => setSuppliers(suppliers.map(x => x.id === s.id ? s : x))} onDelete={id => setSuppliers(suppliers.filter(x => x.id !== id))}/>;
      case 'EMPLOYEES': return <Employees employees={employees} sales={sales} onAdd={e => setEmployees([...employees, e])} onUpdate={e => setEmployees(employees.map(x => x.id === e.id ? e : x))} onDelete={id => setEmployees(employees.filter(x => x.id !== id))}/>;
      case 'ORDERS_MANAGER': return <OrdersManager orders={orders} customers={customers} products={products} onUpdateOrder={o => setOrders(orders.map(x => x.id === o.id ? o : x))} onConfirmOrder={handleConfirmOrder}/>;
      case 'ALL_OPERATIONS': return <AllOperations sales={sales} transactions={transactions} cashEntries={cashEntries} products={products} employees={employees} customers={customers} onUpdateTransaction={()=>{}} onDeleteTransaction={(id)=>setTransactions(transactions.filter(t=>t.id!==id))} onDeleteSale={(id)=>setSales(sales.filter(s=>s.id!==id))} onDeleteCashEntry={(id)=>setCashEntries(cashEntries.filter(c=>c.id!==id))} onUpdateSale={()=>{}} canDelete={isAdmin}/>;
      case 'CASHBOX': return <Cashbox entries={cashEntries} customers={customers} suppliers={suppliers} onAdd={handleAddCashEntry}/>;
      case 'REPORTS': return <Reports sales={sales} transactions={transactions} products={products}/>;
      case 'PRICE_LIST': return <PriceList products={products} showCost={isAdmin}/>;
      case 'STOCK_REPORT': return <StockReport products={products}/>;
      case 'TARIFFS': return <Tariffs />;
      case 'SETTINGS': return <Settings settings={settings} onUpdate={setSettings} onClear={handleClearData} isOwner={isAdmin}/>;
      case 'PROFILE': return <Profile user={currentUser as any} sales={sales} onLogout={handleLogout} onUpdateProfile={handleLogin}/>;
      case 'MORE_MENU': return (
        <div className="space-y-4 animate-fade-in pb-10">
          <h2 className="text-2xl font-black text-slate-800 px-2 mb-6">Управление</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setView('ORDERS_MANAGER')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><i className="fas fa-clipboard-list"></i></div><span className="font-bold text-slate-700">Заказы клиентов</span></button>
            <button onClick={() => setView('CLIENTS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><i className="fas fa-users"></i></div><span className="font-bold text-slate-700">Клиенты</span></button>
            <button onClick={() => setView('SUPPLIERS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><i className="fas fa-truck"></i></div><span className="font-bold text-slate-700">Поставщики</span></button>
            <button onClick={() => setView('EMPLOYEES')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><i className="fas fa-user-tie"></i></div><span className="font-bold text-slate-700">Сотрудники</span></button>
            <button onClick={() => setView('REPORTS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><i className="fas fa-chart-line"></i></div><span className="font-bold text-slate-700">Отчеты</span></button>
            <button onClick={() => setView('PRICE_LIST')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center"><i className="fas fa-tags"></i></div><span className="font-bold text-slate-700">Прайс-лист</span></button>
            <button onClick={() => setView('STOCK_REPORT')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center"><i className="fas fa-boxes"></i></div><span className="font-bold text-slate-700">Остатки</span></button>
            <button onClick={() => setView('TARIFFS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center"><i className="fas fa-credit-card"></i></div><span className="font-bold text-slate-700">Тарифы и оплата</span></button>
            <button onClick={() => setView('SETTINGS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center"><i className="fas fa-cog"></i></div><span className="font-bold text-slate-700">Настройки</span></button>
          </div>
        </div>
      );
      default: return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} onNavigate={setView}/>;
    }
  };

  if (isLoading) return <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[300]"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-6 font-black text-indigo-600 uppercase tracking-[0.2em] text-xs">Синхронизация...</p></div>;
  if (!isAuthenticated) return <Login onLogin={handleLogin}/>;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${settings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="bg-white text-indigo-600 p-4 shadow-sm border-b border-slate-100 flex justify-between items-center z-20 shrink-0 h-16">
        <h1 className="text-xl font-black flex items-center gap-2 cursor-pointer" onClick={() => setView(isClient ? 'CLIENT_PORTAL' : 'DASHBOARD')}>
          <i className="fas fa-store text-indigo-600"></i>
          <span className="text-indigo-900">{isClient ? (activeClientShopName || "") : settings.shopName}</span>
        </h1>
        <button onClick={() => setView('PROFILE')} className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-lg text-white text-[10px] flex items-center justify-center font-black">{currentUser?.name?.[0].toUpperCase()}</div>
          <span className="text-xs font-bold text-slate-700 truncate max-w-[80px]">{currentUser?.name}</span>
        </button>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-28 no-scrollbar"><div className="max-w-5xl mx-auto">{renderView()}</div></main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-2 flex justify-around z-[70] h-20 shadow-lg">
        {isClient ? (
          <>
            <button onClick={() => setView('CLIENT_PORTAL')} className={`flex-1 flex flex-col items-center justify-center ${view === 'CLIENT_PORTAL' ? 'text-indigo-600' : 'text-slate-400'}`}><i className="fas fa-shopping-bag text-xl mb-1"></i><span className="text-[9px] font-black uppercase">Магазин</span></button>
            <button onClick={() => setView('PROFILE')} className={`flex-1 flex flex-col items-center justify-center ${view === 'PROFILE' ? 'text-indigo-600' : 'text-slate-400'}`}><i className="fas fa-user text-xl mb-1"></i><span className="text-[9px] font-black uppercase">Профиль</span></button>
          </>
        ) : (
          NAV_ITEMS.map(item => item.isCenter ? (
            <div key={item.id} className="relative -top-6">
              <button onClick={() => setQuickMenuOpen(!isQuickMenuOpen)} className={`w-14 h-14 ${isQuickMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-indigo-600'} text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white transition-all`}><i className="fas fa-plus text-xl"></i></button>
            </div>
          ) : (
            <button key={item.id} onClick={() => setView(item.id as AppView)} className={`flex flex-col items-center justify-center px-4 transition-all ${view === item.id ? 'text-indigo-600' : 'text-slate-400'}`}><i className={`fas ${item.icon} text-lg mb-1`}></i><span className="text-[9px] font-bold uppercase">{item.label}</span></button>
          ))
        )}
      </nav>
      {isQuickMenuOpen && !isClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end justify-center pb-24 px-4" onClick={() => setQuickMenuOpen(false)}>
          <div className="grid grid-cols-2 gap-4 p-6 bg-white rounded-[40px] w-full max-sm shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            {QUICK_ACTIONS.map(action => (
              <button key={action.id} onClick={() => { setView(action.id as AppView); setQuickMenuOpen(false); }} className="flex flex-col items-center justify-center p-4 rounded-3xl active:bg-slate-50 transition-all"><div className={`${action.color} text-white w-14 h-14 flex items-center justify-center rounded-2xl shadow-lg mb-2`}><i className={`fas ${action.icon} text-xl`}></i></div><span className="text-[10px] font-black text-slate-700 uppercase">{action.label}</span></button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
