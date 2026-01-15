
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
import TenantAdmin from './components/TenantAdmin';

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

  // Fix: added explicit types for cart and batch states to match component props and resolve assignment errors
  const [posCart, setPosCart] = useState<Array<{ id: string; name: string; price: number; cost: number; quantity: number; unit: string }>>([]);
  const [warehouseBatch, setWarehouseBatch] = useState<Array<{productId: string, name: string, quantity: number, cost: number; unit: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR'>('IDLE');
  const [isQuickMenuOpen, setQuickMenuOpen] = useState(false);
  const [activeClientShopName, setActiveClientShopName] = useState<string | null>(null);
  const [publicShopId, setPublicShopId] = useState<string | null>(null);

  const isDataLoaded = useRef(false);
  const isClient = currentUser?.role === 'client';
  const isAdmin = currentUser?.role === 'admin';
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'admin';
  const isGuest = currentUser?.id?.startsWith('GUEST-');

  const handleLogin = (user: User) => {
    const sessionUser = { ...user };
    if ((sessionUser.role === 'admin' || sessionUser.role === 'superadmin') && !sessionUser.ownerId) sessionUser.ownerId = sessionUser.id;
    setCurrentUser(sessionUser);
    setIsAuthenticated(true);
    setPublicShopId(null);
    localStorage.setItem('currentUser', JSON.stringify(sessionUser));
    setView(sessionUser.role === 'client' ? 'CLIENT_PORTAL' : 'DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
    setPublicShopId(null);
    window.history.replaceState({}, '', window.location.pathname);
    setView('DASHBOARD');
  };

  const handleGuestToAuth = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPublicShopId(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const fetchAllData = async (silent = false) => {
    if (!isAuthenticated || publicShopId) { setIsLoading(false); return; }
    if (!silent) setIsLoading(true);
    setSyncStatus('SYNCING');
    try {
      const [p, t, s, c, sup, cust, emp, cats, sett, ords] = await Promise.all([
        db.getData('products'), db.getData('transactions'), db.getData('sales'),
        db.getData('cashEntries'), db.getData('suppliers'), db.getData('customers'),
        db.getData('employees'), db.getData('categories'), db.getData('settings'),
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
      isDataLoaded.current = true;
      setSyncStatus('IDLE');
    } catch (e) { setSyncStatus('ERROR'); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const checkPublicAndAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sId = urlParams.get('shop');

      if (sId) {
        setPublicShopId(sId);
        let guestId = localStorage.getItem('inventory_guest_id');
        if (!guestId) {
          guestId = 'GUEST-' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('inventory_guest_id', guestId);
        }
        const guest: User = { id: guestId, name: 'Гость', role: 'client', email: '' };
        setCurrentUser(guest);
        setIsAuthenticated(true);
        setView('CLIENT_PORTAL');
        setIsLoading(false);
        return;
      }

      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        try {
          const u = JSON.parse(userJson);
          setCurrentUser(u);
          setIsAuthenticated(true);
          if (u.role === 'client') setView('CLIENT_PORTAL');
        } catch(e) { localStorage.removeItem('currentUser'); }
      }
      setIsLoading(false);
    };
    checkPublicAndAuth();
  }, []);

  useEffect(() => { if (isAuthenticated && !publicShopId) fetchAllData(); }, [isAuthenticated, currentUser?.ownerId]);

  useEffect(() => {
    if (!isAuthenticated || publicShopId) return;
    const interval = setInterval(() => fetchAllData(true), 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.ownerId]);

  useEffect(() => {
    if (!isDataLoaded.current || isLoading || !isAuthenticated || publicShopId) return;
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
      db.saveData('orders', orders);
    }, 3000);
    return () => clearTimeout(timer);
  }, [products, transactions, sales, cashEntries, suppliers, customers, employees, categories, settings, orders]);

  const handleB2BPurchase = (shopId: string, shopName: string, order: Order, shopProducts: Product[]) => {
    setSuppliers(prev => {
      const exists = prev.find(s => s.id === shopId);
      if (!exists) {
        const newSupplier: Supplier = { id: shopId, name: shopName, phone: '', debt: 0 };
        return [newSupplier, ...prev];
      }
      return prev;
    });

    const newTransactions: Transaction[] = order.items.map(it => {
      const shopP = shopProducts.find(p => p.id === it.productId);
      return {
        id: `B2B-IN-${Date.now()}-${it.productId}`,
        productId: it.productId,
        supplierId: shopId,
        type: 'PENDING_IN',
        quantity: it.quantity,
        date: order.date,
        pricePerUnit: it.price,
        // Ожидаемый платеж пока не определен, он придет от продавца при подтверждении
        paymentMethod: undefined,
        note: `B2B Заказ №${order.id.slice(-4)} у ${shopName}. Название: ${shopP?.name || 'Товар'}`,
        employeeId: currentUser?.id || 'admin',
        orderId: order.id
      };
    });

    setTransactions(prev => [...newTransactions, ...prev]);
  };

  const handleConfirmOrder = (order: Order) => {
    setProducts(prev => prev.map(p => {
      const it = order.items.find(x => x.productId === p.id);
      return (it && p.type !== 'SERVICE') ? { ...p, quantity: Math.max(0, p.quantity - it.quantity) } : p;
    }));

    let finalCustomerId = order.customerId;
    let updatedCustomers = [...customers];

    if (order.note && order.note.includes('[Имя:')) {
      const matchName = order.note.match(/\[Имя:\s*([^,]+)/);
      const matchPhone = order.note.match(/Тел:\s*([^\]]+)/);
      const name = matchName ? matchName[1].trim() : 'Новый клиент';
      const phone = matchPhone ? matchPhone[1].trim() : '';

      const existing = customers.find(c => (phone && c.phone === phone) || (c.id === order.customerId));
      if (!existing) {
        const newCust: Customer = { id: `CUST-${Date.now()}`, name, phone, debt: 0, discount: 0 };
        updatedCustomers = [newCust, ...customers];
        finalCustomerId = newCust.id;
      } else {
        finalCustomerId = existing.id;
      }
    }

    if (order.paymentMethod === 'DEBT' && finalCustomerId) {
      updatedCustomers = updatedCustomers.map(c => c.id === finalCustomerId ? { ...c, debt: (Number(c.debt) || 0) + order.total } : c);
    }

    const newSale: Sale = {
      id: `SALE-ORD-${order.id}`,
      employeeId: currentUser?.id || 'admin',
      items: order.items.map(it => ({ ...it, cost: products.find(p => p.id === it.productId)?.cost || 0 })),
      total: order.total,
      paymentMethod: order.paymentMethod || 'DEBT',
      date: new Date().toISOString(),
      customerId: finalCustomerId
    };

    if (order.paymentMethod !== 'DEBT') {
      const cashEntry: CashEntry = { id: `CS-${Date.now()}`, amount: order.total, type: 'INCOME', category: 'Продажа', description: `Продажа №${newSale.id.slice(-4)}`, date: newSale.date, employeeId: newSale.employeeId, customerId: finalCustomerId };
      setCashEntries(prev => [cashEntry, ...prev]);
    }

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'CONFIRMED', customerId: finalCustomerId, paymentMethod: order.paymentMethod } : o));
    setCustomers(updatedCustomers);
    setSales(prev => [newSale, ...prev]);
    alert('Заказ выдан!');
  };

  const renderView = () => {
    if (!currentUser) return null;
    if (isClient && view !== 'PROFILE') {
      return <ClientPortal user={currentUser} onAddOrder={(o) => setOrders(prev => [o, ...prev])} onActiveShopChange={setActiveClientShopName} initialShopId={publicShopId} />;
    }
    switch (view) {
      case 'DASHBOARD': return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} onNavigate={setView} orderCount={orders.filter(o => o.status === 'NEW').length}/>;
      case 'PRODUCTS': return <ProductList products={products} categories={categories} canEdit={true} canCreate={true} canDelete={true} showCost={true}
        onAdd={(p) => setProducts(prev => { const up = [p, ...prev]; db.saveData('products', up); return up; })}
        onAddBulk={(ps) => setProducts(prev => { const up = [...ps, ...prev]; db.saveData('products', up); return up; })}
        onUpdate={(p) => setProducts(prev => { const up = prev.map(x => x.id === p.id ? p : x); db.saveData('products', up); return up; })}
        onDelete={(id) => setProducts(prev => { const up = prev.filter(x => x.id !== id); db.saveData('products', up); return up; })}
        onAddCategory={(c) => setCategories(prev => { const up = [...prev, c]; db.saveData('categories', up); return up; })}
        onRenameCategory={(o, n) => { setCategories(prev => { const up = prev.map(cat => cat === o ? n : cat); db.saveData('categories', up); return up; }); setProducts(prev => { const up = prev.map(p => p.category === o ? { ...p, category: n } : p); db.saveData('products', up); return up; }); }}
        onDeleteCategory={(c) => { setCategories(prev => { const up = prev.filter(cat => cat !== c); db.saveData('categories', up); return up; }); setProducts(prev => { const up = prev.map(p => p.category === c ? { ...p, category: 'Другое' } : p); db.saveData('products', up); return up; }); }}
      />;
      case 'WAREHOUSE': return <Warehouse products={products} suppliers={suppliers} transactions={transactions} categories={categories} batch={warehouseBatch} setBatch={setWarehouseBatch} onTransaction={t => setTransactions(prev => [t, ...prev])} onTransactionsBulk={ts => {
        setTransactions(prev => [...ts, ...prev]);
        const pU: any = {};
        const sU: any = {};
        const newCashEntries: CashEntry[] = [];

        ts.forEach(t => {
          pU[t.productId] = { q: (pU[t.productId]?.q || 0) + t.quantity, c: t.pricePerUnit };
          const sum = t.quantity * (t.pricePerUnit || 0);
          if (t.paymentMethod === 'DEBT' && t.supplierId) {
            sU[t.supplierId] = (sU[t.supplierId] || 0) + sum;
          } else if (t.paymentMethod === 'CASH') {
            newCashEntries.push({
              id: `CS-IN-${Date.now()}-${t.id}`,
              amount: sum,
              type: 'EXPENSE',
              category: 'Закупка товара',
              description: `Оплата товара: ${products.find(p=>p.id===t.productId)?.name || '---'}`,
              date: t.date,
              employeeId: t.employeeId,
              supplierId: t.supplierId
            });
          }
        });

        setProducts(prev => prev.map(p => pU[p.id] ? { ...p, quantity: p.quantity + pU[p.id].q, cost: pU[p.id].c || p.cost } : p));
        setSuppliers(prev => prev.map(s => sU[s.id] ? { ...s, debt: (Number(s.debt) || 0) + sU[s.id] } : s));
        if (newCashEntries.length > 0) setCashEntries(prev => [...newCashEntries, ...prev]);
      }} onAddProduct={(p) => setProducts(prev => { const up = [p, ...prev]; db.saveData('products', up); return up; })} onDeleteTransaction={(id) => setTransactions(prev => prev.filter(t => t.id !== id))} orders={orders} />;
      case 'SALES': return <POS products={products} customers={customers} cart={posCart} setCart={setPosCart} currentUserId={currentUser?.id} settings={settings} onSale={s => {
        setSales(prev => [s, ...prev]);
        setProducts(prev => prev.map(p => {
          const it = s.items.find(x => x.productId === p.id);
          return (it && p.type !== 'SERVICE') ? { ...p, quantity: Math.max(0, p.quantity - it.quantity) } : p;
        }));

        if (s.paymentMethod === 'DEBT' && s.customerId) {
          setCustomers(prev => prev.map(c => c.id === s.customerId ? { ...c, debt: (Number(c.debt) || 0) + s.total } : c));
        } else if (s.customerId) {
          const cashEntry: CashEntry = {
            id: `CS-SALE-${Date.now()}`,
            amount: s.total,
            type: 'INCOME',
            category: 'Продажа',
            description: `Оплата продажи №${s.id.slice(-4)}`,
            date: s.date,
            employeeId: s.employeeId,
            customerId: s.customerId
          };
          setCashEntries(prev => [cashEntry, ...prev]);
        }
      }} />;
      // Fix: Added missing 'products' prop to 'Clients' component
      case 'CLIENTS': return <Clients products={products} customers={customers} sales={sales} cashEntries={cashEntries} onAdd={c => setCustomers(prev => [c, ...prev])} onUpdate={c => setCustomers(prev => prev.map(x => x.id === c.id ? c : x))} onDelete={id => setCustomers(prev => prev.filter(x => x.id !== id))}/>;
      case 'SUPPLIERS': return <Suppliers suppliers={suppliers} transactions={transactions} cashEntries={cashEntries} products={products} onAdd={s => setSuppliers(prev => [s, ...prev])} onUpdate={s => setSuppliers(prev => prev.map(x => x.id === s.id ? s : x))} onDelete={id => setSuppliers(prev => prev.filter(x => x.id !== id))}/>;
      case 'EMPLOYEES': return <Employees employees={employees} sales={sales} onAdd={e => setEmployees(prev => [e, ...prev])} onUpdate={e => setEmployees(prev => prev.map(x => x.id === e.id ? e : x))} onDelete={id => setEmployees(prev => prev.filter(x => x.id !== id))}/>;
      case 'ORDERS_MANAGER': return <OrdersManager orders={orders} customers={customers} products={products} onUpdateOrder={o => setOrders(prev => { const updated = prev.map(x => x.id === o.id ? o : x); db.saveData('orders', updated); return updated; })} onConfirmOrder={handleConfirmOrder}/>;
      case 'ALL_OPERATIONS': return <AllOperations sales={sales} transactions={transactions} cashEntries={cashEntries} products={products} employees={employees} customers={customers} settings={settings} onUpdateTransaction={()=>{}} onDeleteTransaction={(id)=>setTransactions(prev => { const updated = prev.filter(t=>t.id!==id); db.saveData('transactions', updated); return updated; })} onDeleteSale={(id)=>setSales(prev => { const updated = prev.map(s => s.id===id ? {...s, isDeleted:true} : s); db.saveData('sales', updated); return updated; })} onDeleteCashEntry={(id)=>setCashEntries(prev => { const updated = prev.filter(c=>c.id!==id); db.saveData('cashEntries', updated); return updated; })} onUpdateSale={(updatedSale) => { setSales(prev => { const updated = prev.map(s => s.id === updatedSale.id ? updatedSale : s); db.saveData('sales', updated); return updated; }); }} canDelete={isAdmin || isSuperAdmin} />;
      case 'CASHBOX': return <Cashbox
        entries={cashEntries}
        customers={customers}
        suppliers={suppliers}
        onAdd={e => setCashEntries(prev => { const updated = [e, ...prev]; db.saveData('cashEntries', updated); return updated; })}
        onUpdateCustomer={c => setCustomers(prev => prev.map(x => x.id === c.id ? c : x))}
        onUpdateSupplier={s => setSuppliers(prev => prev.map(x => x.id === s.id ? s : x))}
      />;
      case 'REPORTS': return <Reports sales={sales} transactions={transactions} products={products}/>;
      case 'PRICE_LIST': return <PriceList products={products} showCost={isAdmin || isSuperAdmin}/>;
      case 'STOCK_REPORT': return <StockReport products={products}/>;
      case 'TARIFFS': return <Tariffs />;
      case 'TENANT_ADMIN': return <TenantAdmin />;
      case 'MARKETPLACE': return <ClientPortal user={currentUser} onAddOrder={()=>{}} onB2BPurchaseComplete={handleB2BPurchase}/>;
      case 'SETTINGS': return <Settings settings={settings} onUpdate={setSettings} onClear={() => { if(confirm('Очистить всё?')){ setProducts([]); setTransactions([]); setSales([]); setCashEntries([]); setSuppliers([]); setCustomers([]); setEmployees([]); setOrders([]); setCategories(INITIAL_CATEGORIES); } }} isOwner={isAdmin} userId={currentUser?.id}/>;
      case 'PROFILE': return <Profile user={currentUser as any} sales={sales} onLogout={handleLogout} onUpdateProfile={handleLogin}/>;
      case 'MORE_MENU': return (
        <div className="space-y-4 animate-fade-in pb-10">
          <h2 className="text-2xl font-black text-slate-800 px-2 mb-6">Управление</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isSuperAdmin && (
              <button onClick={() => setView('TENANT_ADMIN')} className="w-full bg-indigo-900 p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-indigo-800 hover:bg-indigo-950 text-white"><div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center"><i className="fas fa-crown"></i></div><span className="font-bold">Платформа</span></button>
            )}
            <button onClick={() => setView('MARKETPLACE')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><i className="fas fa-shopping-cart"></i></div><span className="font-bold text-slate-700">Закупки (B2B)</span></button>
            <button onClick={() => setView('ORDERS_MANAGER')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><i className="fas fa-clipboard-list"></i></div><span className="font-bold text-slate-700">Заказы клиентов</span></button>
            <button onClick={() => setView('CLIENTS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><i className="fas fa-users"></i></div><span className="font-bold text-slate-700">Клиенты</span></button>
            <button onClick={() => setView('SUPPLIERS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><i className="fas fa-truck"></i></div><span className="font-bold text-slate-700">Поставщики</span></button>
            <button onClick={() => setView('EMPLOYEES')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><i className="fas fa-user-tie"></i></div><span className="font-bold text-slate-700">Сотрудники</span></button>
            <button onClick={() => setView('REPORTS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><i className="fas fa-chart-line"></i></div><span className="font-bold text-slate-700">Отчеты</span></button>
            <button onClick={() => setView('PRICE_LIST')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center"><i className="fas fa-tags"></i></div><span className="font-bold text-slate-700">Прайс-лист</span></button>
            <button onClick={() => setView('STOCK_REPORT')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center"><i className="fas fa-boxes"></i></div><span className="font-bold text-slate-700">Остатки</span></button>
            <button onClick={() => setView('TARIFFS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center"><i className="fas fa-credit-card"></i></div><span className="font-bold text-slate-700">Тарифы</span></button>
            <button onClick={() => setView('SETTINGS')} className="w-full bg-white p-5 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-100 hover:bg-slate-50"><div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center"><i className="fas fa-cog"></i></div><span className="font-bold text-slate-700">Настройки</span></button>
          </div>
        </div>
      );
      default: return <Dashboard products={products} sales={sales} cashEntries={cashEntries} customers={customers} suppliers={suppliers} onNavigate={setView}/>;
    }
  };

  if (isLoading) return <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[300]"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-6 font-black text-indigo-600 uppercase tracking-[0.2em] text-xs">Загрузка...</p></div>;
  if (!isAuthenticated) return <Login onLogin={handleLogin}/>;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${settings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="bg-white text-indigo-600 p-4 shadow-sm border-b border-slate-100 flex justify-between items-center z-20 shrink-0 h-16">
        <h1 className="text-xl font-black flex items-center gap-2 cursor-pointer" onClick={() => setView(isClient ? 'CLIENT_PORTAL' : 'DASHBOARD')}>
          <i className="fas fa-store text-indigo-600"></i>
          <span className="text-indigo-900">{isClient ? (activeClientShopName || "Магазин") : settings.shopName}</span>
        </h1>
        {isGuest ? (
          <button onClick={handleGuestToAuth} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center active:bg-slate-100 transition-colors shadow-inner border border-slate-100">
            <i className="fas fa-user-circle text-2xl"></i>
          </button>
        ) : (
          <button onClick={() => setView('PROFILE')} className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg text-white text-[10px] flex items-center justify-center font-black">{currentUser?.name?.[0].toUpperCase()}</div>
            <span className="text-xs font-bold text-slate-700 truncate max-w-[80px]">{currentUser?.name}</span>
          </button>
        )}
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-28 no-scrollbar"><div className="max-w-5xl mx-auto">{renderView()}</div></main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-2 flex justify-around z-[70] h-20 shadow-lg">
        {isClient ? (
          <>
            <button onClick={() => setView('CLIENT_PORTAL')} className={`flex-1 flex flex-col items-center justify-center ${view === 'CLIENT_PORTAL' ? 'text-indigo-600' : 'text-slate-400'}`}><i className="fas fa-shopping-bag text-xl mb-1"></i><span className="text-[9px] font-black uppercase">Витрина</span></button>
            <button onClick={isGuest ? handleGuestToAuth : () => setView('PROFILE')} className={`flex-1 flex flex-col items-center justify-center ${view === 'PROFILE' ? 'text-indigo-600' : 'text-slate-400'}`}><i className="fas fa-user-circle text-xl mb-1"></i><span className="text-[9px] font-black uppercase">{isGuest ? 'Войти' : 'Профиль'}</span></button>
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
