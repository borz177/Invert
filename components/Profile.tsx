
import React, { useState, useEffect } from 'react';
import { Employee, Sale, User, LinkedShop } from '../types';
import { db } from '../services/api';

interface ProfileProps {
  user: Employee | null;
  sales: Sale[];
  onLogout: () => void;
  onUpdateProfile?: (user: User) => void;
  onSwitchShop?: (shop: LinkedShop) => void;
  currentShopName?: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  canEditProduct: 'Редактирование товаров',
  canCreateProduct: 'Добавление товаров',
  canDeleteProduct: 'Удаление (корзина)',
  canShowCost: 'Видеть себестоимость'
};

const Profile: React.FC<ProfileProps> = ({ user, sales, onLogout, onUpdateProfile, onSwitchShop, currentShopName }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Состояния для управления списком магазинов
  const [linkedShops, setLinkedShops] = useState<LinkedShop[]>([]);
  const [showAddShop, setShowAddShop] = useState(false);
  const [addShopLogin, setAddShopLogin] = useState('');
  const [addShopPass, setAddShopPass] = useState('');
  const [isAddingShop, setIsAddingShop] = useState(false);

  useEffect(() => {
    if (user && (user.role as string) === 'client') {
      const saved = localStorage.getItem(`linked_shops_${user.login}`);
      if (saved) setLinkedShops(JSON.parse(saved));
    }
  }, [user]);

  if (!user) return null;

  const isClient = (user.role as string) === 'client';
  const isOwner = (user.role as string) === 'admin' || (user as any).ownerId === user.id;

  const today = new Date().toISOString().split('T')[0];
  const purchasesTodayCount = sales.filter(s => s.customerId === user.id && s.date.startsWith(today) && !s.isDeleted).length;
  const totalAmountSales = sales.filter(s => !s.isDeleted).reduce((acc, s) => acc + s.total, 0);

  const clientDebt = (user as any).debt || 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const updated = await db.auth.updateProfile(user.id, name, newPassword ? currentPassword : '', newPassword);
      if (onUpdateProfile) onUpdateProfile(updated);
      setIsEditing(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingShop(true);
    try {
      // Пытаемся залогиниться, чтобы проверить данные и получить shopName
      const testUser = await db.auth.login(addShopLogin, addShopPass);

      // Имитируем запрос settings для получения названия магазина
      const settings = await db.getData('settings');
      const shopName = settings?.shopName || 'Магазин';

      const newShop: LinkedShop = {
        shopName,
        login: addShopLogin,
        password: addShopPass,
        ownerId: testUser.ownerId || testUser.id
      };

      // Проверка на дубликаты в списке магазинов клиента
      if (linkedShops.some(s => s.ownerId === newShop.ownerId)) {
        alert('Этот магазин уже добавлен в ваш список');
        return;
      }

      const updatedShops = [...linkedShops, newShop];
      setLinkedShops(updatedShops);
      localStorage.setItem(`linked_shops_${user.login}`, JSON.stringify(updatedShops));

      setShowAddShop(false);
      setAddShopLogin('');
      setAddShopPass('');
      alert('Магазин успешно добавлен!');
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    } finally {
      setIsAddingShop(false);
    }
  };

  const handleRemoveShop = (ownerId: string) => {
    if (window.confirm('Удалить этот магазин из списка?')) {
      const updated = linkedShops.filter(s => s.ownerId !== ownerId);
      setLinkedShops(updated);
      localStorage.setItem(`linked_shops_${user.login}`, JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center relative">
        <button onClick={onLogout} className="absolute top-6 right-6 w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:bg-red-100 transition-colors" title="Выйти">
          <i className="fas fa-sign-out-alt"></i>
        </button>
        {isOwner && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="absolute top-6 left-6 w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center active:bg-indigo-100 transition-colors" title="Редактировать">
            <i className="fas fa-pen text-xs"></i>
          </button>
        )}

        <div className="w-24 h-24 bg-indigo-600 rounded-[32px] text-white flex items-center justify-center text-4xl font-black mx-auto mb-4 shadow-xl shadow-indigo-100">
          {user.name[0].toUpperCase()}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="mt-4 space-y-4 text-left animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ваше имя</label>
              <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="p-4 bg-indigo-50 rounded-3xl space-y-3">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Смена пароля (необяз.)</p>
              <input type="password" placeholder="Текущий пароль" className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-xs" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <input type="password" placeholder="Новый пароль" className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-xs" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>

            {error && <p className="text-[10px] font-black text-red-500 uppercase text-center">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg uppercase text-xs">
                {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Сохранить'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
              {isClient ? 'Клиент магазина' : (isOwner ? 'Владелец' : user.role)}
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 shadow-sm text-center">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{isClient ? 'Закупок сегодня' : 'Продаж сегодня'}</p>
          <p className="text-2xl font-black text-emerald-700">{isClient ? purchasesTodayCount : sales.filter(s => s.date.startsWith(today) && !s.isDeleted).length}</p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 shadow-sm text-center">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{isClient ? 'Ваш долг' : 'Ваша выручка'}</p>
          <p className={`text-2xl font-black ${isClient && clientDebt > 0 ? 'text-red-600' : 'text-indigo-700'}`}>
            {(isClient ? clientDebt : totalAmountSales).toLocaleString()} ₽
          </p>
        </div>
      </div>

      {isClient && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Мои магазины</h3>
            <button onClick={() => setShowAddShop(true)} className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">+ Добавить</button>
          </div>

          <div className="space-y-3">
            <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-lg border border-indigo-700 flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl"><i className="fas fa-store"></i></div>
                <div>
                  <p className="font-black text-sm">{currentShopName}</p>
                  <p className="text-[8px] font-bold uppercase opacity-60">Текущий магазин</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><i className="fas fa-check"></i></div>
            </div>

            {linkedShops.map(shop => (
              <div key={shop.ownerId} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center hover:border-indigo-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 text-indigo-500 rounded-xl flex items-center justify-center text-xl group-hover:bg-indigo-50 transition-colors"><i className="fas fa-store-alt"></i></div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{shop.shopName}</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Логин: {shop.login}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSwitchShop?.(shop)}
                    className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Перейти
                  </button>
                  <button
                    onClick={() => handleRemoveShop(shop.ownerId)}
                    className="w-9 h-9 text-red-200 hover:text-red-500 transition-colors"
                  >
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
              </div>
            ))}

            {linkedShops.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-medium italic">У вас пока нет других магазинов. Добавьте их по логину и паролю.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddShop && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm space-y-6 animate-slide-up">
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-800">Добавить магазин</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Введите данные вашего аккаунта</p>
            </div>
            <form onSubmit={handleAddShop} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Логин (Email)</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="example@mail.com" value={addShopLogin} onChange={e => setAddShopLogin(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Пароль</label>
                <input required type="password" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="••••••••" value={addShopPass} onChange={e => setAddShopPass(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddShop(false)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
                <button type="submit" disabled={isAddingShop} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center justify-center">
                  {isAddingShop ? <i className="fas fa-spinner fa-spin"></i> : 'ДОБАВИТЬ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!isClient && (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 text-sm mb-4 uppercase tracking-widest text-center">Ваши права доступа</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {user.permissions ? Object.entries(user.permissions).map(([key, value]) => (
              <div key={key} className={`p-4 rounded-2xl flex items-center justify-between gap-3 ${value ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-300 border border-red-50 opacity-60'}`}>
                <span className="text-[11px] font-bold uppercase tracking-tight">{PERMISSION_LABELS[key] || key}</span>
                <i className={`fas ${value ? 'fa-check-circle' : 'fa-times-circle'} text-sm`}></i>
              </div>
            )) : (
              <p className="text-center w-full text-slate-400 text-xs italic py-4">Полный доступ (Владелец)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
