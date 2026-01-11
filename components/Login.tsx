
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<'client' | 'seller'>('seller');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let user: User;
      if (isRegister) {
        user = await db.auth.register(email, password, name, role === 'seller' ? 'admin' : 'client');
      } else {
        user = await db.auth.login(email, password);
      }
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-4 z-[200]">
      <div className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 animate-slide-up relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>

        <div className="text-center mb-8 mt-4">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
            <i className={`fas ${isRegister ? 'fa-user-plus' : 'fa-lock'} text-3xl`}></i>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">ИнвентарьПро</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            {isRegister ? 'Создание аккаунта' : 'Вход в систему'}
          </p>
        </div>

        {isRegister && (
          <div className="flex bg-slate-50 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setRole('seller')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === 'seller' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Я Продавец
            </button>
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === 'client' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Я Клиент
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                <i className="fas fa-id-card text-sm"></i>
              </div>
              <input
                type="text" required
                className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700"
                placeholder={role === 'seller' ? 'Название магазина' : 'Ваше имя'}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
              <i className="fas fa-envelope text-sm"></i>
            </div>
            <input
              type="text" required
              className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700"
              placeholder="Email / Логин"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
              <i className="fas fa-key text-sm"></i>
            </div>
            <input
              type="password" required
              className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-fade-in border border-red-100">
              <i className="fas fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white p-5 rounded-[24px] font-black shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all mt-6 text-lg hover:bg-indigo-700 flex items-center justify-center"
          >
            {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
            {isRegister ? 'зарегистрироваться' : 'войти'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] hover:text-indigo-700 transition-colors"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
