
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { db } from '../services/api';

const TenantAdmin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'admin' | 'client'>('ALL');
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        db.admin.getAllUsers(),
        db.admin.getPlatformStats()
      ]);
      setUsers(u);
      setStats(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      const userJson = localStorage.getItem('currentUser');
      if (!userJson) return;
      const currentUser = JSON.parse(userJson);

      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_id: currentUser.id, target_user_id: userId })
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        setConfirmDelete(null);
      } else {
        alert('Ошибка при удалении');
      }
    } catch (e) { console.error(e); }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.email.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'ALL' || u.role === filter;
      return matchSearch && matchFilter;
    });
  }, [users, search, filter]);

  if (loading) return <div className="p-20 text-center text-indigo-600"><i className="fas fa-spinner fa-spin text-4xl mb-4"></i><p className="font-black uppercase tracking-widest text-xs">Загрузка платформы...</p></div>;

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Шапка статистики */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-6">Управление Платформой</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10">
              <p className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-tighter">Магазинов</p>
              <p className="text-3xl font-black">{stats?.shops || 0}</p>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10">
              <p className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-tighter">Аккаунтов</p>
              <p className="text-3xl font-black">{stats?.users || 0}</p>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10">
              <p className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-tighter">Данных (MB)</p>
              <p className="text-3xl font-black">{(stats?.dataPoints * 0.1).toFixed(1)}</p>
            </div>
          </div>
        </div>
        <i className="fas fa-crown absolute -right-10 -bottom-10 text-[180px] opacity-10 rotate-12"></i>
      </div>

      {/* Список пользователей */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <h3 className="text-xl font-black text-slate-800">Пользователи системы</h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Все</button>
            <button onClick={() => setFilter('admin')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filter === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Продавцы</button>
            <button onClick={() => setFilter('client')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filter === 'client' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Клиенты</button>
          </div>
        </div>

        <div className="relative">
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input className="w-full p-5 pl-14 bg-white rounded-[30px] shadow-sm border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold" placeholder="Поиск по имени, email или ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
          {filteredUsers.map(u => (
            <div key={u.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-5 min-w-0">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner shrink-0 ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : (u.role === 'superadmin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400')}`}>
                  {u.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-slate-800 text-base truncate">{u.name}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${u.role === 'admin' ? 'bg-indigo-600 text-white' : (u.role === 'superadmin' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500')}`}>
                      {u.role === 'admin' ? 'МАГАЗИН' : (u.role === 'superadmin' ? 'СУПЕРАДМИН' : 'КЛИЕНТ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold truncate">{u.email}</p>
                  <p className="text-[8px] text-slate-300 font-black uppercase tracking-widest mt-1">ID: {u.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="text-right hidden sm:block">
                   <p className="text-[9px] text-slate-300 font-black uppercase">Регистрация</p>
                   <p className="text-xs font-bold text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '---'}</p>
                </div>
                {u.role !== 'superadmin' && (
                  <button onClick={() => setConfirmDelete(u)} className="w-10 h-10 bg-red-50 text-red-400 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && <div className="p-20 text-center text-slate-300 italic">Никого не нашли</div>}
        </div>
      </div>

      {/* Модалка удаления */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto text-3xl animate-bounce">
              <i className="fas fa-user-slash"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Удалить аккаунт?</h3>
              <p className="text-sm text-slate-400 mt-2">Пользователь <b>{confirmDelete.name}</b> и все его данные (товары, продажи) будут безвозвратно стерты.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button onClick={() => handleDeleteUser(confirmDelete.id)} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">УДАЛИТЬ</button>
            </div>
          </div>
        </div>
      )}

      {/* Дополнительная фича: Глобальное уведомление */}
      <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[40px] flex flex-col sm:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-200 shrink-0">
          <i className="fas fa-bullhorn"></i>
        </div>
        <div className="text-center sm:text-left flex-1">
          <h4 className="text-lg font-black text-indigo-900">Рассылка всем пользователям</h4>
          <p className="text-sm text-indigo-700/70 font-medium">Вы можете отправить системное сообщение всем владельцам магазинов.</p>
          <div className="mt-4 flex gap-2">
            <input className="flex-1 p-3 bg-white border border-indigo-100 rounded-xl text-sm outline-none" placeholder="Текст сообщения..." />
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all">Отправить</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantAdmin;
