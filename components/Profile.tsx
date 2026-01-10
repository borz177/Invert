
import React from 'react';
import { Employee, Sale } from '../types';

interface ProfileProps {
  user: Employee | null;
  sales: Sale[];
  onLogout: () => void;
}

const PERMISSION_LABELS: Record<string, string> = {
  canEditProduct: 'Редактирование товаров',
  canCreateProduct: 'Добавление товаров',
  canDeleteProduct: 'Удаление (корзина)',
  canShowCost: 'Видеть себестоимость'
};

const Profile: React.FC<ProfileProps> = ({ user, sales, onLogout }) => {
  if (!user) return null;
  const totalAmount = sales.filter(s => !s.isDeleted).reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center relative">
        <button onClick={onLogout} className="absolute top-6 right-6 w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:bg-red-100 transition-colors">
          <i className="fas fa-sign-out-alt"></i>
        </button>
        <div className="w-24 h-24 bg-indigo-600 rounded-[32px] text-white flex items-center justify-center text-4xl font-black mx-auto mb-4 shadow-xl shadow-indigo-100">
          {user.name[0].toUpperCase()}
        </div>
        <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{(user as any).role || 'Пользователь'}</p>
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
            <p className="text-center w-full text-slate-400 text-xs italic py-4">Права доступа не установлены (Владелец)</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
