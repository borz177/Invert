
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

  const isDataLoaded = useRef(false);

  const isAdminOrOwner =
    currentUser?.role === 'admin' ||
    (currentUser && currentUser.id === currentUser.ownerId);

  const isClient = currentUser?.role === 'client';

  const userPermissions = (currentUser as any)?.permissions || {};

  const canEditProd = isAdminOrOwner || currentUser?.role === 'управляющий' || userPermissions.canEditProduct;
  const canCreateProd = isAdminOrOwner || currentUser?.role === 'управляющий' || userPermissions.canCreateProduct;
  const canDeleteOps = isAdminOrOwner || currentUser?.role === 'управляющий' || userPermissions.canDeleteProduct;
  const canShowCost = isAdminOrOwner || currentUser?.role === 'управляющий' || userPermissions.canShowCost;

  const handleLogin = (user: User) => {
    const sessionUser = { ...user };
    if (sessionUser.role === 'admin' && !sessionUser.ownerId) {
      sessionUser.ownerId = sessionUser.id;
    }

    setCurrentUser(sessionUser);
    setIsAuthenticated(true);
    localStorage.setItem('currentUser', JSON.stringify(sessionUser));

    // Клиентов сразу в личный кабинет
    if (sessionUser.role === 'client') {
      setView('CLIENT_PORTAL');
    } else {
      setView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
    setView('DASHBOARD');
  };

  const fetchAllData = async (silent = false) => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    setSyncStatus('SYNCING');

    try {
      const [p, t, s, c, sup, cust, emp, cats, sett, cart, batch, ords] = await Promise.all([
        db.getData('products'),
        db.getData('transactions'),
        db.getData('sales'),
        db.getData('cashEntries'),
        db.getData('suppliers'),
        db.getData('customers'),
        db.getData('employees'),
        db.getData('categories'),
        db.getData('settings'),
        db.getData('posCart'),
        db.getData('warehouseBatch'),
        db.getData('orders')
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
      if (Array.isArray(cart)) setPosCart(cart);
      if (Array.isArray(batch)) setWarehouseBatch(batch);

      isDataLoaded.current = true;
      setSyncStatus('IDLE');
    } catch (e) {
      console.error('Fetch error:', e);
      setSyncStatus('ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        setCurrentUser(u);
        setIsAuthenticated(true);
        if (u.role === 'client') setView('CLIENT_PORTAL');
      } catch(e) {
        localStorage.removeItem('currentUser');
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAllData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isDataLoaded.current || isLoading || !isAuthenticated) return;

    const timer = setTimeout(() => {
      setSyncStatus('SYNCING');
      const syncMap = [
        { key: 'products', data: products },
        { key: 'transactions', data: transactions },
        { key: 'sales', data: sales },
        { key: 'cashEntries', data: cashEntries },
        { key: 'suppliers', data: suppliers },
        { key: 'customers', data: customers },
        { key: 'employees', data: employees },
        { key: 'categories', data: categories },
        { key: 'settings', data: settings },
        { key: 'posCart', data: posCart },
        { key: 'warehouseBatch', data: warehouseBatch },
        { key: 'orders', data: orders }
      ];

      Promise.all(syncMap.map(item => db.saveData(item.key, item.data))).then(results => {
        setSyncStatus(results.every(r => r) ? 'IDLE' : 'ERROR');
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [products, transactions, sales, cashEntries, suppliers, customers, employees, categories, settings, posCart, warehouseBatch, orders]);

  const updateCustomerDebt = (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, debt: (c.debt || 0) + amount } : c));
  };

  const updateSupplierDebt = (id: string, amount: number) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, debt: (s.debt || 0) + amount } : s));
  };

  const handleSale = (s: Sale) => {
    setSales([s, ...sales]);
    if ((s.paymentMethod === 'CASH' || s.paymentMethod === 'CARD') && currentUser) {
      const cashEntry: CashEntry = {
        id: `sale-${s.id}`,
        amount: s.total,
        type: 'INCOME',
        category: 'Продажа',
        date: s.date,
        description: `Продажа №${s.id.slice(-4)} (${s.paymentMethod === 'CASH' ? 'Нал' : 'Карта'})`,
        employeeId: currentUser.id,
        customerId: s.customerId
      };
      setCashEntries(prev => [cashEntry, ...prev]);
    }
    if (s.paymentMethod === 'DEBT' && s.customerId) {
      updateCustomerDebt(s.customerId, s.total);
    }
    setProducts(prev => prev.map(p => {
      const soldItem = s.items.find(si => si.productId === p.id);
      return soldItem ? { ...p, quantity: p.quantity - soldItem.quantity } : p;
    }));
  };

  const handleTransactionsBulk = (ts: Transaction[]) => {
    setTransactions([...ts, ...transactions]);
    ts.forEach(t => {
      setProducts(prev => prev.map(p => p.id === t.productId ? { ...p, quantity: p.quantity + (t.type === 'IN' ? t.quantity : -t.quantity) } : p));
      if (t.type === 'IN' && t.paymentMethod === 'DEBT' && t.supplierId) {
        updateSupplierDebt(t.supplierId, t.quantity * (t.pricePerUnit || 0));
      }
    });
  };

  const handleCashEntry = (entry: CashEntry) => {
    setCashEntries([entry, ...cashEntries]);
    if (entry.type === 'INCOME' && entry.customerId) {
      updateCustomerDebt(entry.customerId, -entry.amount);
    }
    if (entry.type === 'EXPENSE' && entry.supplierId) {
      updateSupplierDebt(entry.supplierId, -entry.amount);
    }
  };

  const handleAddCashEntrySimple = (entry: Omit<CashEntry, 'id' | 'date' | 'employeeId'> & { id?: string }) => {
    if (!currentUser) return;
    const fullEntry: CashEntry = {
      ...entry,
      id: entry.id || Date.now().toString(),
      date: new Date().toISOString(),
      employeeId: currentUser.id
    };
    handleCashEntry(fullEntry);
  };

  const deleteSale = (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (!sale || sale.isDeleted) return;
    setSales(sales.map(s => s.id === id ? { ...s, isDeleted: true } : s));
    setCashEntries(prev => prev.filter(e => e.id !== `sale-${id}`));
    setProducts(prev => prev.map(p => {
      const item = sale.items.find(si => si.productId === p.id);
      return item ? { ...p, quantity: p.quantity + item.quantity } : p;
    }));
    if (sale.paymentMethod === 'DEBT' && sale.customerId) {
      updateCustomerDebt(sale.customerId, -sale.total);
    }
  };

  const deleteTransaction = (id: string) => {
    const t = transactions.find(x => x.id === id);
    if (!t || t.isDeleted) return;
    setTransactions(transactions.map(x => x.id === id ? { ...x, isDeleted: true } : x));
    setCashEntries(prev => prev.filter(e => e.id !== `trans-receipt-${id}`));
    setProducts(prev => prev.map(p => p.id === t.productId ? { ...p, quantity: p.quantity + (t.type === 'IN' ? -t.quantity : t.quantity) } : p));
    if (t.type === 'IN' && t.paymentMethod === 'DEBT' && t.supplierId) {
      updateSupplierDebt(t.supplierId, -(t.quantity * (t.pricePerUnit || 0)));
    }
  };

  const renderView = () => {
    if (!currentUser) return null;

    // Если клиент
    if (isClient) {
      if (view === 'PROFILE') {
        const clientData = customers.find(c => c.id === currentUser.id);
        return <Profile user={{id: currentUser.id, name: currentUser.name, role: 'client', login: currentUser.email, password: '', salary: 0, revenuePercent: 0, profitPercent: 0, permissions: {}, debt: clientData?.debt || 0} as any} sales={sales} onLogout={handleLogout} onUpdateProfile={handleLogin}/>;
      }
      return <ClientPortal user={currentUser} products={products} sales={sales} orders={orders} onAddOrder={(o) => setOrders([o, ...orders])}/>;
    }

    switch (view) {
      case 'DASHBOARD': return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} onNavigate={(v) => setView(v as AppView)} orderCount={orders.filter(o => o.status === 'NEW').length}/>;
      case 'PRODUCTS': return <ProductList products={products} categories={categories} canEdit={canEditProd} canCreate={canCreateProd} canDelete={canDeleteOps} showCost={canShowCost} onAdd={p => setProducts([p, ...products])} onAddBulk={ps => setProducts([...ps, ...products])} onUpdate={p => setProducts(products.map(x => x.id === p.id ? p : x))} onDelete={id => setProducts(products.filter(x => x.id !== id))} onAddCategory={c => setCategories([...categories, c])} onRenameCategory={(o, n) => { setCategories(categories.map(c => c === o ? n : c)); setProducts(products.map(p => p.category === o ? { ...p, category: n } : p)); }} onDeleteCategory={c => { setCategories(categories.filter(x => x !== c)); setProducts(products.map(p => p.category === c ? { ...p, category: 'Другое' } : p)); }}/>;
      case 'WAREHOUSE': return <Warehouse products={products} suppliers={suppliers} transactions={transactions} batch={warehouseBatch} setBatch={setWarehouseBatch} onTransaction={t => handleTransactionsBulk([{...t, employeeId: currentUser.id}])} onTransactionsBulk={ts => handleTransactionsBulk(ts.map(t => ({...t, employeeId: currentUser.id})))} onAddCashEntry={handleAddCashEntrySimple}/>;
      case 'SALES': return <POS products={products} customers={customers} cart={posCart} setCart={setPosCart} currentUserId={currentUser.id} onSale={handleSale}/>;
      case 'CASHBOX': return <Cashbox entries={cashEntries} customers={customers} suppliers={suppliers} onAdd={handleCashEntry}/>;
      case 'REPORTS': return <Reports sales={sales} products={products} transactions={transactions}/>;
      case 'ORDERS_MANAGER': return <OrdersManager orders={orders} customers={customers} products={products} onUpdateOrder={(ord) => setOrders(orders.map(o => o.id === ord.id ? ord : o))} onConfirmOrder={(ord) => { setOrders(orders.map(o => o.id === ord.id ? {...o, status: 'CONFIRMED'} : o)); handleSale({ id: `ORD-${ord.id}`, employeeId: currentUser.id, items: ord.items.map(i => ({...i, cost: products.find(p => p.id === i.productId)?.cost || 0})), total: ord.total, paymentMethod: 'DEBT', date: new Date().toISOString(), customerId: ord.customerId }); }}/>;
      case 'ALL_OPERATIONS': return <AllOperations sales={sales} transactions={transactions} cashEntries={cashEntries} products={products} employees={employees} onUpdateTransaction={t => setTransactions(transactions.map(x => x.id === t.id ? t : x))} onDeleteTransaction={deleteTransaction} onDeleteSale={deleteSale} onDeleteCashEntry={id => setCashEntries(cashEntries.filter(c => c.id !== id))} ownerId={currentUser.ownerId || currentUser.id} ownerName={currentUser.name} canDelete={canDeleteOps}/>;
      case 'STOCK_REPORT': return <StockReport products={products}/>;
      case 'PRICE_LIST': return <PriceList products={products} showCost={canShowCost}/>;
      case 'SUPPLIERS': return <Suppliers suppliers={suppliers} transactions={transactions} cashEntries={cashEntries} products={products} onAdd={s => setSuppliers([...suppliers, s])} onUpdate={s => setSuppliers(suppliers.map(x => x.id === s.id ? s : x))} onDelete={id => setSuppliers(suppliers.filter(x => x.id !== id))}/>;
      case 'CLIENTS': return <Clients customers={customers} sales={sales} cashEntries={cashEntries} onAdd={c => setCustomers([...customers, c])} onUpdate={c => setCustomers(customers.map(x => x.id === c.id ? c : x))} onDelete={id => setCustomers(customers.filter(x => x.id !== id))}/>;
      case 'EMPLOYEES': if (!isAdminOrOwner && currentUser.role !== 'управляющий') return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} onNavigate={(v) => setView(v as AppView)}/>; return <Employees employees={employees} sales={sales} onAdd={e => setEmployees([...employees, e])} onUpdate={e => setEmployees(employees.map(x => x.id === e.id ? e : x))} onDelete={id => setEmployees(employees.filter(x => x.id !== id))}/>;
      case 'PROFILE': return <Profile user={{id: currentUser.id, name: currentUser.name, role: currentUser.role as any, login: currentUser.email, password: '', salary: 0, revenuePercent: 0, profitPercent: 0, permissions: (currentUser as any).permissions} as Employee} sales={sales} onLogout={handleLogout} onUpdateProfile={handleLogin}/>;
      case 'SETTINGS': return <Settings settings={settings} onUpdate={setSettings} onClear={() => {}}/>;
      case 'MORE_MENU': return (
        <div className="space-y-4 animate-fade-in pb-10">
          <h2 className="text-2xl font-black text-slate-800 px-2 mb-6">Еще</h2>
          <button onClick={() => setView('PROFILE')} className="w-full bg-white p-6 rounded-[32px] shadow-sm flex items-center gap-4 border border-slate-100">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-user-circle"></i></div>
            <div className="text-left"><p className="font-black text-slate-800">Профиль</p><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{currentUser.role === 'admin' || currentUser.id === currentUser.ownerId ? 'Владелец' : currentUser.role}</p></div>
          </button>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => setView('ORDERS_MANAGER')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><i className="fas fa-clipboard-list"></i></div><span className="font-bold text-slate-700">Заказы от клиентов</span></button>
            <button onClick={() => setView('SUPPLIERS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><i className="fas fa-truck-field"></i></div><span className="font-bold text-slate-700">Поставщики</span></button>
            <button onClick={() => setView('CLIENTS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><i className="fas fa-users"></i></div><span className="font-bold text-slate-700">Клиенты</span></button>
            {(isAdminOrOwner || currentUser.role === 'управляющий') && <button onClick={() => setView('EMPLOYEES')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><i className="fas fa-user-tie"></i></div><span className="font-bold text-slate-700">Сотрудники</span></button>}
            <button onClick={() => setView('SETTINGS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center"><i className="fas fa-cog"></i></div><span className="font-bold text-slate-700">Настройки</span></button>
          </div>
        </div>
      );
      default: return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} onNavigate={(v) => setView(v as AppView)}/>;
    }
  };

  if (isLoading) return <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[300]"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-6 font-black text-indigo-600 uppercase tracking-[0.2em] text-xs">Загрузка данных...</p></div>;
  if (!isAuthenticated) return <Login onLogin={handleLogin}/>;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${settings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="bg-white text-indigo-600 p-4 shadow-sm border-b border-slate-100 flex justify-between items-center z-20 shrink-0">
        <h1 className="text-xl font-black flex items-center gap-2 cursor-pointer" onClick={() => setView(isClient ? 'CLIENT_PORTAL' : 'DASHBOARD')}><i className="fas fa-store"></i><span>{settings.shopName}</span><div className="ml-2 flex items-center">{syncStatus === 'SYNCING' && <i className="fas fa-sync fa-spin text-[10px] text-indigo-400"></i>}{syncStatus === 'ERROR' && <i className="fas fa-exclamation-circle text-[10px] text-red-500 animate-pulse"></i>}{syncStatus === 'IDLE' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>}</div></h1>
        <div className="flex items-center gap-3"><button onClick={() => setView('PROFILE')} className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2"><div className="w-6 h-6 bg-indigo-600 rounded-lg text-white text-[10px] flex items-center justify-center font-black">{currentUser?.name?.[0].toUpperCase() || 'U'}</div><span className="text-xs font-bold text-slate-700 truncate max-w-[80px]">{currentUser?.name}</span></button></div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-28 no-scrollbar"><div className="max-w-5xl mx-auto">{renderView()}</div></main>

      {!isClient && (
        <>
          {isQuickMenuOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end justify-center pb-24 px-4" onClick={() => setQuickMenuOpen(false)}><div className="grid grid-cols-2 gap-4 p-6 bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>{QUICK_ACTIONS.map(action => (<button key={action.id} onClick={() => { setView(action.id as AppView); setQuickMenuOpen(false); }} className="flex flex-col items-center justify-center p-4 rounded-2xl active:bg-slate-100 transition-colors"><div className={`${action.color} text-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg mb-2`}><i className={`fas ${action.icon} text-xl`}></i></div><span className="text-xs font-bold text-slate-700">{action.label}</span></button>))}</div></div>}
          <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex justify-around p-1 z-[70] px-2 h-20">
            {NAV_ITEMS.map(item => item.isCenter ? (<div key={item.id} className="relative -top-6"><button onClick={() => setQuickMenuOpen(!isQuickMenuOpen)} className={`w-14 h-14 ${isQuickMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-indigo-600'} text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white transition-all duration-300 active:scale-90`}><i className="fas fa-plus text-xl"></i></button></div>) : (<button key={item.id} onClick={() => { setView(item.id as AppView); setQuickMenuOpen(false); }} className={`flex flex-col items-center justify-center px-4 rounded-xl transition-all ${view === item.id ? 'text-indigo-600' : 'text-slate-400'}`}><i className={`fas ${item.icon} text-lg mb-0.5`}></i><span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span></button>))}
          </nav>
        </>
      )}
      {isClient && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-2 flex justify-around z-50 h-20 shadow-lg">
          <button onClick={() => setView('CLIENT_PORTAL')} className={`flex flex-col items-center justify-center w-1/3 ${view === 'CLIENT_PORTAL' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-shopping-bag text-xl mb-1"></i>
            <span className="text-[9px] font-black uppercase">Магазин</span>
          </button>
          <button onClick={() => setView('PROFILE')} className={`flex flex-col items-center justify-center w-1/3 ${view === 'PROFILE' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-user text-xl mb-1"></i>
            <span className="text-[9px] font-black uppercase">Профиль</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
