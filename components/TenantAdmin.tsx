
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { db } from '../services/api';

const TenantAdmin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'admin' | 'client'>('ALL');

  useEffect(() => {
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
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'ALL' || u.role === filter;
      return matchSearch && matchFilter;
    });
  }, [users, search, filter]);

  if (loading) return <div className="p-20 text-center text-indigo-600"><i className="fas fa-spinner fa-spin text-4xl mb-4"></i><p className="font-black uppercase tracking-widest text-xs">Загрузка платформы...</p></div>;

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-6">Панель Управления Платформой</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10 text-center">
              <p className="text-[10px] font-black uppercase opacity-60 mb-1">Всего Магазинов</p>
              <p className="text-3xl font-black">{stats?.shops || 0}</p>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10 text-center">
              <p className="text-[10px] font-black uppercase opacity-60 mb-1">Пользователей</p>
              <p className="text-3xl font-black">{stats?.users || 0}</p>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10 text-center">
              <p className="text-[10px] font-black uppercase opacity-60 mb-1">Записей в БД</p>
              <p className="text-3xl font-black">{stats?.dataPoints || 0}</p>
            </div>
          </div>
        </div>
        <i className="fas fa-globe absolute -right-10 -bottom-10 text-[180px] opacity-10 rotate-12"></i>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xl font-black text-slate-800">Все пользователи</h3>
          <div className="flex gap-2">
            <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${filter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>Все</button>
            <button onClick={() => setFilter('admin')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${filter === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>Продавцы</button>
            <button onClick={() => setFilter('client')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${filter === 'client' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>Клиенты</button>
          </div>
        </div>

        <div className="relative">
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input className="w-full p-5 pl-14 bg-white rounded-[30px] shadow-sm border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold" placeholder="Поиск по имени или email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
          {filteredUsers.map(u => (
            <div key={u.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : (u.role === 'superadmin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400')}`}>
                  {u.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-800 text-base">{u.name}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${u.role === 'admin' ? 'bg-indigo-600 text-white' : (u.role === 'superadmin' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500')}`}>
                      {u.role === 'admin' ? 'Магазин' : (u.role === 'superadmin' ? 'BOSS' : 'Клиент')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold">{u.email}</p>
                  <p className="text-[8px] text-slate-300 font-black uppercase tracking-widest mt-1">ID: {u.id.slice(0, 13)}...</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-300 font-black uppercase">Зарегистрирован</p>
                <p className="text-xs font-bold text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '---'}</p>
                <button className="mt-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Управление</button>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && <div className="p-20 text-center text-slate-300 italic">Пользователи не найдены</div>}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-8 rounded-[40px] flex items-center gap-6">
        <div className="w-16 h-16 bg-amber-500 text-white rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-amber-200"><i className="fas fa-shield-alt"></i></div>
        <div>
          <h4 className="text-lg font-black text-amber-800">Режим обслуживания</h4>
          <p className="text-sm text-amber-700/70 font-medium">Вы можете временно ограничить доступ к платформе для всех пользователей, кроме администраторов.</p>
          <button className="mt-4 bg-amber-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md">Включить режим</button>
        </div>
      </div>
    </div>
  );
};

export default TenantAdmin;
