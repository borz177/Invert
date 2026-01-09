
import React, { useState, useEffect, useRef } from 'react';
import { Product, Transaction, Sale, CashEntry, AppView, Supplier, Customer, Employee, AppSettings } from './types';
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
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
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
  const [isQuickMenuOpen, setQuickMenuOpen] = useState(false);

  const [posCart, setPosCart] = useState<any[]>([]);
  const [warehouseBatch, setWarehouseBatch] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // Первоначальная загрузка данных
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const auth = localStorage.getItem('isAuthenticated');
        if (auth === 'true') {
          const userJson = localStorage.getItem('currentUserObj');
          if (userJson) {
            setCurrentUser(JSON.parse(userJson));
            setIsAuthenticated(true);
          }
        }

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

        if (p) setProducts(p);
        if (t) setTransactions(t);
        if (s) setSales(s);
        if (c) setCashEntries(c);
        if (sup) setSuppliers(sup);
        if (cust) setCustomers(cust);
        if (emp) setEmployees(emp);
        if (cats && cats.length) setCategories(cats);
        if (sett && sett.shopName) setSettings(sett);
        if (cart) setPosCart(cart);
        if (batch) setWarehouseBatch(batch);

        // Помечаем, что данные загружены и можно начинать синхронизацию В БАЗУ
        isInitialized.current = true;
      } catch (e) {
        console.error("Database connection error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  // Оптимизированная синхронизация (с защитой от перезатирания при загрузке)
  useEffect(() => {
    if (isInitialized.current && !isLoading) {
      // Используем setTimeout как простой debounce, чтобы не спамить запросами
      const timer = setTimeout(() => {
        db.saveData('products', products);
        db.saveData('transactions', transactions);
        db.saveData('sales', sales);
        db.saveData('cashEntries', cashEntries);
        db.saveData('suppliers', suppliers);
        db.saveData('customers', customers);
        db.saveData('employees', employees);
        db.saveData('categories', categories);
        db.saveData('settings', settings);
        db.saveData('posCart', posCart);
        db.saveData('warehouseBatch', warehouseBatch);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [products, transactions, sales, cashEntries, suppliers, customers, employees, categories, settings, posCart, warehouseBatch, isLoading]);

  const handleLogin = (user: Employee) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('currentUserObj', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUserObj');
  };

  const updateProductStock = (id: string, diff: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: p.quantity + diff } : p));
  };

  const handleSale = (s: Sale) => {
    const saleWithEmployee = { ...s, employeeId: currentUser?.id || 'admin' };
    setSales([saleWithEmployee, ...sales]);
    s.items.forEach(i => updateProductStock(i.productId, -i.quantity));

    if (s.paymentMethod === 'DEBT' && s.customerId) {
      setCustomers(prev => prev.map(c => c.id === s.customerId ? { ...c, debt: c.debt + s.total } : c));
    } else {
      const clientName = customers.find(c => c.id === s.customerId)?.name || '';
      setCashEntries([{
        id: `sale-${s.id}`,
        amount: s.total,
        type: 'INCOME',
        category: 'Продажа',
        date: new Date().toISOString(),
        employeeId: currentUser?.id || 'admin',
        description: `Чек №${s.id.slice(-4)}${clientName ? ' (Кл: ' + clientName + ')' : ''}`
      }, ...cashEntries]);
    }
    setPosCart([]);
  };

  const handleCashEntry = (e: CashEntry) => {
    const entryWithEmployee = { ...e, employeeId: currentUser?.id || 'admin' };
    setCashEntries([entryWithEmployee, ...cashEntries]);
    if (e.type === 'INCOME' && e.customerId) {
      setCustomers(prev => prev.map(c => c.id === e.customerId ? { ...c, debt: Math.max(0, c.debt - e.amount) } : c));
    }
    if (e.type === 'EXPENSE' && e.supplierId) {
      setSuppliers(prev => prev.map(s => s.id === e.supplierId ? { ...s, debt: Math.max(-9999999, s.debt - e.amount) } : s));
    }
  };

  const handleWarehouseIntake = (ts: Transaction[]) => {
    const tsWithEmp = ts.map(t => ({ ...t, employeeId: currentUser?.id || 'admin' }));
    setTransactions([...tsWithEmp, ...transactions]);

    tsWithEmp.forEach(t => {
      updateProductStock(t.productId, t.quantity);
      const totalCost = t.quantity * (t.pricePerUnit || 0);
      if (t.type === 'IN' && t.supplierId && totalCost > 0) {
        if (t.paymentMethod === 'DEBT') {
          setSuppliers(prev => prev.map(s => s.id === t.supplierId ? { ...s, debt: s.debt + totalCost } : s));
        } else if (t.paymentMethod === 'CASH') {
          setCashEntries([{
            id: `intake-${t.id}`,
            amount: totalCost,
            type: 'EXPENSE',
            category: 'Закупка товара',
            date: new Date().toISOString(),
            employeeId: currentUser?.id || 'admin',
            supplierId: t.supplierId,
            description: `Оплата за ${products.find(p => p.id === t.productId)?.name} (${t.quantity} шт.)`
          }, ...cashEntries]);
        }
      }
    });
    setWarehouseBatch([]);
  };

  const softDeleteTransaction = (id: string) => {
    const t = transactions.find(x => x.id === id);
    if (!t || t.isDeleted) return;
    setTransactions(prev => prev.map(x => x.id === id ? { ...x, isDeleted: true } : x));
    const multiplier = t.type === 'IN' ? -1 : 1;
    updateProductStock(t.productId, t.quantity * multiplier);
    const totalCost = t.quantity * (t.pricePerUnit || 0);
    if (t.type === 'IN' && t.supplierId && t.paymentMethod === 'DEBT') {
      setSuppliers(prev => prev.map(s => s.id === t.supplierId ? { ...s, debt: Math.max(0, s.debt - totalCost) } : s));
    } else if (t.type === 'IN' && t.paymentMethod === 'CASH') {
      setCashEntries(prev => prev.filter(e => e.id !== `intake-${t.id}`));
    }
  };

  const softDeleteSale = (id: string) => {
    const s = sales.find(x => x.id === id);
    if (!s || s.isDeleted) return;
    setSales(prev => prev.map(x => x.id === id ? { ...x, isDeleted: true } : x));
    s.items.forEach(i => updateProductStock(i.productId, i.quantity));
    if (s.paymentMethod === 'DEBT' && s.customerId) {
      setCustomers(prev => prev.map(c => c.id === s.customerId ? { ...c, debt: Math.max(0, c.debt - s.total) } : c));
    } else {
      setCashEntries(prev => prev.filter(e => e.id !== `sale-${s.id}`));
    }
  };

  const renderView = () => {
    if (!currentUser) return null;
    const { permissions } = currentUser;

    switch (view) {
      case 'DASHBOARD': return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} />;
      case 'PRODUCTS': return (
        <ProductList
          products={products} categories={categories}
          canEdit={permissions.canEditProduct} canCreate={permissions.canCreateProduct} canDelete={permissions.canDeleteProduct} showCost={permissions.canShowCost}
          onAdd={p => setProducts([...products, p])} onAddBulk={ps => setProducts([...products, ...ps])}
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
          onTransaction={t => handleWarehouseIntake([t])}
          onTransactionsBulk={ts => handleWarehouseIntake(ts)}
        />
      );
      case 'SALES': return (
        <POS
          products={products} customers={customers} cart={posCart} setCart={setPosCart}
          onSale={handleSale}
        />
      );
      case 'CASHBOX': return <Cashbox entries={cashEntries} customers={customers} suppliers={suppliers} onAdd={handleCashEntry} />;
      case 'REPORTS': return <Reports sales={sales} products={products} transactions={transactions} />;
      case 'ALL_OPERATIONS': return (
        <AllOperations
          sales={sales} transactions={transactions} cashEntries={cashEntries} products={products} employees={employees}
          onUpdateTransaction={() => {}}
          onDeleteTransaction={softDeleteTransaction}
          onDeleteSale={softDeleteSale}
          onDeleteCashEntry={(id) => setCashEntries(prev => prev.filter(x => x.id !== id))}
        />
      );
      case 'SUPPLIERS': return (
        <Suppliers
          suppliers={suppliers} transactions={transactions} cashEntries={cashEntries} products={products}
          onAdd={s => setSuppliers([...suppliers, { ...s, debt: 0 }])}
          onUpdate={s => setSuppliers(suppliers.map(x => x.id === s.id ? s : x))}
          onDelete={id => setSuppliers(suppliers.filter(x => x.id !== id))}
        />
      );
      case 'CLIENTS': return (
        <Clients
          customers={customers} sales={sales} cashEntries={cashEntries}
          onAdd={c => setCustomers([...customers, { ...c, debt: 0 }])}
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
      case 'PRICE_LIST': return <PriceList products={products} showCost={permissions.canShowCost} />;
      case 'STOCK_REPORT': return <StockReport products={products} />;
      case 'PROFILE': return <Profile user={currentUser} sales={sales} onLogout={handleLogout} />;
      case 'SETTINGS': return <Settings settings={settings} onUpdate={setSettings} onClear={() => {
        if(window.confirm('ОЧИСТИТЬ ВСЕ ДАННЫЕ?')) {
          localStorage.clear();
          window.location.reload();
        }
      }} />;
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
            {(currentUser.role === 'управляющий' || currentUser.id === 'admin') && (
              <button onClick={() => setView('EMPLOYEES')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><i className="fas fa-user-tie"></i></div>
                <span className="font-bold text-slate-700">Сотрудники</span>
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

  if (isLoading) return <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 font-black text-indigo-600 uppercase tracking-widest text-[10px]">Загрузка базы данных...</p></div>;

  if (!isAuthenticated) return <Login onLogin={handleLogin} employees={employees} />;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${settings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="bg-white text-indigo-600 p-4 shadow-sm border-b border-slate-100 flex justify-between items-center z-20 shrink-0">
        <h1 className="text-xl font-black flex items-center gap-2 cursor-pointer" onClick={() => setView('DASHBOARD')}>
          <i className="fas fa-store"></i>
          <span>{settings.shopName}</span>
        </h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('PROFILE')} className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg text-white text-[10px] flex items-center justify-center font-black">{currentUser?.name?.[0].toUpperCase()}</div>
            <span className="text-xs font-bold text-slate-700">{currentUser?.name}</span>
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-28 no-scrollbar"><div className="max-w-5xl mx-auto">{renderView()}</div></main>
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex justify-around p-1 z-[70] px-2 h-20">
        {NAV_ITEMS.map(item => (
          item.isCenter ? (
            <div key={item.id} className="relative -top-6">
               <button onClick={() => setQuickMenuOpen(!isQuickMenuOpen)} className={`w-14 h-14 ${isQuickMenuOpen ? 'bg-slate-800 rotate-45' : 'bg-indigo-600'} text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white transition-all duration-300 active:scale-90`}><i className="fas fa-plus text-xl"></i></button>
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
