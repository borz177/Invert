
import React, { useState } from 'react';
import { Employee, Sale, User } from '../types';
import { db } from '../services/api';

interface ProfileProps {
  user: Employee | null;
  sales: Sale[];
  onLogout: () => void;
  onUpdateProfile?: (user: User) => void;
}

const PERMISSION_LABELS: Record<string, string> = {
  canEditProduct: 'Редактирование товаров',
  canCreateProduct: 'Добавление товаров',
  canDeleteProduct: 'Удаление (корзина)',
  canShowCost: 'Видеть себестоимость'
};

const Profile: React.FC<ProfileProps> = ({ user, sales, onLogout, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;
  // Fixed the role comparison on line 29 by casting user.role to string. This handles cases where the user object might be an admin/owner.
  const isOwner = (user.role as string) === 'admin' || (user as any).ownerId === user.id;
  const totalAmount = sales.filter(s => !s.isDeleted).reduce((acc, s) => acc + s.total, 0);

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

  return (
    <div className="space-y-6">
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
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{(user as any).role === 'admin' ? 'Владелец' : user.role}</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Продаж сегодня</p>
          <p className="text-2xl font-black text-emerald-700">{sales.filter(s => !s.isDeleted).length}</p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 shadow-sm">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Ваша выручка</p>
          <p className="text-2xl font-black text-indigo-700">{totalAmount.toLocaleString()} ₽</p>
        </div>
      </div>

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
    </div>
  );
};

export default Profile;
