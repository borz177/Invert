
import React, { useState, useEffect, useRef } from 'react';
import { Product, Transaction, Sale, CashEntry, AppView, Supplier, Customer, Employee, AppSettings, User } from './types';
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
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [posCart, setPosCart] = useState<any[]>([]);
  const [warehouseBatch, setWarehouseBatch] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR'>('IDLE');
  const [isQuickMenuOpen, setQuickMenuOpen] = useState(false);

  const isDataLoaded = useRef(false);

  const fetchAllData = async (silent = false) => {
  if (!isAuthenticated) {
    setIsLoading(false);
    return;
  }
  if (!silent) setIsLoading(true);
  setSyncStatus('SYNCING');

  try {
    console.log('📥 Загружаем данные с сервера...');
    const [p, t, s, c, sup, cust, emp, cats, sett, cart, batch] = await Promise.all([
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
      db.getData('warehouseBatch')
    ]);

    console.log('✅ Получены данные:', { products: p?.length, settings: sett });

    // Безопасная установка состояния
    if (Array.isArray(p)) setProducts(p);
    if (Array.isArray(t)) setTransactions(t);
    if (Array.isArray(s)) setSales(s);
    if (Array.isArray(c)) setCashEntries(c);
    if (Array.isArray(sup)) setSuppliers(sup);
    if (Array.isArray(cust)) setCustomers(cust);
    if (Array.isArray(emp)) setEmployees(emp);
    if (Array.isArray(cats) && cats.length) setCategories(cats);
    if (Array.isArray(cart)) setPosCart(cart);
    if (Array.isArray(batch)) setWarehouseBatch(batch);

    if (sett && typeof sett === 'object' && sett.shopName) {
      setSettings(sett as AppSettings);
    }

    isDataLoaded.current = true;
    setSyncStatus('IDLE');
  } catch (e) {
    console.error('Fetch all data error:', e);
    setSyncStatus('ERROR');
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
  const userJson = localStorage.getItem('currentUser');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      setCurrentUser(user);
      setIsAuthenticated(true);
      // Загружаем данные сразу после установки пользователя
      fetchAllData(true); // silent = true, чтобы не показывать лоадер
    } catch (e) {
      console.error('Ошибка парсинга currentUser:', e);
      setIsLoading(false);
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

    // Добавьте проверку типа
    const safeProducts = Array.isArray(products) ? products : [];
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeSales = Array.isArray(sales) ? sales : [];
    const safeCashEntries = Array.isArray(cashEntries) ? cashEntries : [];
    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const safeCustomers = Array.isArray(customers) ? customers : [];
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const safeCategories = Array.isArray(categories) ? categories : INITIAL_CATEGORIES;
    const safePosCart = Array.isArray(posCart) ? posCart : [];
    const safeWarehouseBatch = Array.isArray(warehouseBatch) ? warehouseBatch : [];

    Promise.all([
      db.saveData('products', safeProducts),
      db.saveData('transactions', safeTransactions),
      db.saveData('sales', safeSales),
      db.saveData('cashEntries', safeCashEntries),
      db.saveData('suppliers', safeSuppliers),
      db.saveData('customers', safeCustomers),
      db.saveData('employees', safeEmployees),
      db.saveData('categories', safeCategories),
      db.saveData('settings', settings),
      db.saveData('posCart', safePosCart),
      db.saveData('warehouseBatch', safeWarehouseBatch)
    ]).then(results => {
      setSyncStatus(results.every(r => r) ? 'IDLE' : 'ERROR');
    });
  }, 2000);
  return () => clearTimeout(timer);
}, [products, transactions, sales, cashEntries, suppliers, customers, employees, categories, settings, posCart, warehouseBatch]);

  const handleLogin = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    isDataLoaded.current = false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    window.location.reload();
  };

  const renderView = () => {
    if (!currentUser) return null;

    if (currentUser.role === 'admin' && view === 'TENANT_ADMIN') {
        return (
            <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-black mb-4 text-indigo-600">Управление аккаунтами</h2>
                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <i className="fas fa-tools text-2xl text-slate-300 mb-2"></i>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Панель управления пользователями находится в разработке</p>
                </div>
            </div>
        );
    }

    switch (view) {
      case 'DASHBOARD': return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} />;
      case 'PRODUCTS': return (
        <ProductList
          products={products} categories={categories}
          canEdit={true} canCreate={true} canDelete={true} showCost={true}
          onAdd={p => setProducts([p, ...products])} onAddBulk={ps => setProducts([...ps, ...products])}
          onUpdate={p => setProducts(products.map(x => x.id === p.id ? p : x))}
          onDelete={id => setProducts(products.filter(x => x.id !== id))}
          onAddCategory={c => setCategories([...categories, c])}
          onRenameCategory={(o, n) => {
            setCategories(categories.map(c => c === o ? n : c));
            setProducts(products.map(p => p.category === o ? { ...p, category: n } : p));
          }}
          onDeleteCategory={c => {
            setCategories(categories.filter(x => x !== c));
            setProducts(products.map(p => p.category === c ? { ...p, category: 'Другое' } : p));
          }}
        />
      );
      case 'WAREHOUSE': return (
        <Warehouse
          products={products} suppliers={suppliers} transactions={transactions}
          batch={warehouseBatch} setBatch={setWarehouseBatch}
          onTransaction={t => setTransactions([t, ...transactions])}
          onTransactionsBulk={ts => setTransactions([...ts, ...transactions])}
        />
      );
      case 'SALES': return <POS products={products} customers={customers} cart={posCart} setCart={setPosCart} onSale={(s) => setSales([s, ...sales])} />;
      case 'CASHBOX': return <Cashbox entries={cashEntries} customers={customers} suppliers={suppliers} onAdd={(e) => setCashEntries([e, ...cashEntries])} />;
      case 'REPORTS': return <Reports sales={sales} products={products} transactions={transactions} />;
      case 'ALL_OPERATIONS': return (
        <AllOperations
          sales={sales} transactions={transactions} cashEntries={cashEntries} products={products} employees={employees}
          onUpdateTransaction={t => setTransactions(transactions.map(x => x.id === t.id ? t : x))}
          onDeleteTransaction={id => setTransactions(transactions.map(t => t.id === id ? { ...t, isDeleted: true } : t))}
          onDeleteSale={id => setSales(sales.map(s => s.id === id ? { ...s, isDeleted: true } : s))}
          onDeleteCashEntry={id => setCashEntries(cashEntries.filter(c => c.id !== id))}
        />
      );
      case 'STOCK_REPORT': return <StockReport products={products} />;
      case 'PRICE_LIST': return <PriceList products={products} showCost={true} />;
      case 'SUPPLIERS': return (
        <Suppliers
          suppliers={suppliers} transactions={transactions} cashEntries={cashEntries} products={products}
          onAdd={s => setSuppliers([...suppliers, s])}
          onUpdate={s => setSuppliers(suppliers.map(x => x.id === s.id ? s : x))}
          onDelete={id => setSuppliers(suppliers.filter(x => x.id !== id))}
        />
      );
      case 'CLIENTS': return (
        <Clients
          customers={customers} sales={sales} cashEntries={cashEntries}
          onAdd={c => setCustomers([...customers, c])}
          onUpdate={c => setCustomers(customers.map(x => x.id === c.id ? c : x))}
          onDelete={id => setCustomers(customers.filter(x => x.id !== id))}
        />
      );
      case 'EMPLOYEES': return (
        <Employees
          employees={employees} sales={sales}
          onAdd={e => setEmployees([...employees, e])}
          onUpdate={e => setEmployees(employees.map(x => x.id === e.id ? e : x))}
          onDelete={id => setEmployees(employees.filter(x => x.id !== id))}
        />
      );
      case 'PROFILE': return <Profile user={{id: currentUser.id, name: currentUser.name, role: 'управляющий', login: currentUser.email, password: '', salary: 0, revenuePercent: 0, profitPercent: 0, permissions: {canEditProduct: true, canCreateProduct: true, canDeleteProduct: true, canShowCost: true}} as Employee} sales={sales} onLogout={handleLogout} />;
      case 'SETTINGS': return <Settings settings={settings} onUpdate={setSettings} onClear={() => {}} />;
      case 'MORE_MENU': return (
        <div className="space-y-4 animate-fade-in pb-10">
          <h2 className="text-2xl font-black text-slate-800 px-2 mb-6">Еще</h2>
          <button onClick={() => setView('PROFILE')} className="w-full bg-white p-6 rounded-[32px] shadow-sm flex items-center gap-4 border border-slate-100">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-user-circle"></i></div>
            <div className="text-left"><p className="font-black text-slate-800">Профиль</p><p className="text-xs text-slate-400 font-bold uppercase">{currentUser.role}</p></div>
          </button>

          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => setView('SUPPLIERS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><i className="fas fa-truck-field"></i></div>
              <span className="font-bold text-slate-700">Поставщики</span>
            </button>
            <button onClick={() => setView('CLIENTS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><i className="fas fa-users"></i></div>
              <span className="font-bold text-slate-700">Клиенты</span>
            </button>
            <button onClick={() => setView('EMPLOYEES')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><i className="fas fa-user-tie"></i></div>
              <span className="font-bold text-slate-700">Сотрудники</span>
            </button>
            {currentUser.role === 'admin' && (
              <button onClick={() => setView('TENANT_ADMIN')} className="w-full bg-slate-800 text-white p-5 rounded-3xl shadow-sm flex items-center gap-4 hover:bg-black transition-colors">
                <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center"><i className="fas fa-crown"></i></div>
                <span className="font-bold">Панель Суперадмина</span>
              </button>
            )}
            <button onClick={() => setView('SETTINGS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50">
              <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center"><i className="fas fa-cog"></i></div>
              <span className="font-bold text-slate-700">Настройки</span>
            </button>
          </div>
        </div>
      );
      default: return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} />;
    }
  };

  if (isLoading) return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[300]">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 font-black text-indigo-600 uppercase tracking-[0.2em] text-xs">Подключение к системе...</p>
    </div>
  );

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${settings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="bg-white text-indigo-600 p-4 shadow-sm border-b border-slate-100 flex justify-between items-center z-20 shrink-0">
        <h1 className="text-xl font-black flex items-center gap-2 cursor-pointer" onClick={() => setView('DASHBOARD')}>
          <i className="fas fa-store"></i>
          <span>{settings.shopName}</span>
          <div className="ml-2 flex items-center">
            {syncStatus === 'SYNCING' && <i className="fas fa-sync fa-spin text-[10px] text-indigo-400"></i>}
            {syncStatus === 'ERROR' && <i className="fas fa-exclamation-circle text-[10px] text-red-500 animate-pulse"></i>}
            {syncStatus === 'IDLE' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>}
          </div>
        </h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('PROFILE')} className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg text-white text-[10px] flex items-center justify-center font-black">
              {currentUser?.name?.[0].toUpperCase() || 'U'}
            </div>
            <span className="text-xs font-bold text-slate-700">{currentUser?.name}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28 no-scrollbar">
        <div className="max-w-5xl mx-auto">
          {renderView()}
        </div>
      </main>

      {isQuickMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end justify-center pb-24 px-4" onClick={() => setQuickMenuOpen(false)}>
          <div className="grid grid-cols-2 gap-4 p-6 bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            {QUICK_ACTIONS.map(action => (
              <button key={action.id} onClick={() => { setView(action.id as AppView); setQuickMenuOpen(false); }} className="flex flex-col items-center justify-center p-4 rounded-2xl active:bg-slate-100 transition-colors">
                <div className={`${action.color} text-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg mb-2`}><i className={`fas ${action.icon} text-xl`}></i></div>
                <span className="text-xs font-bold text-slate-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex justify-around p-1 z-[70] px-2 h-20">
        {NAV_ITEMS.map(item => (
          item.isCenter ? (
            <div key={item.id} className="relative -top-6">
               <button onClick={() => setQuickMenuOpen(!isQuickMenuOpen)} className={`w-14 h-14 ${isQuickMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-indigo-600'} text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white transition-all duration-300 active:scale-90`}>
                 <i className="fas fa-plus text-xl"></i>
               </button>
            </div>
          ) : (
            <button key={item.id} onClick={() => { setView(item.id as AppView); setQuickMenuOpen(false); }} className={`flex flex-col items-center justify-center px-4 rounded-xl transition-all ${view === item.id ? 'text-indigo-600' : 'text-slate-400'}`}>
              <i className={`fas ${item.icon} text-lg mb-0.5`}></i>
              <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
            </button>
          )
        ))}
      </nav>
    </div>
  );
};

export default App;
