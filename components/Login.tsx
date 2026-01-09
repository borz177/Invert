
import React, { useState } from 'react';
import { Employee } from '../types';

interface LoginProps {
  onLogin: (user: Employee) => void;
  employees: Employee[];
}

const Login: React.FC<LoginProps> = ({ onLogin, employees }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Системный админ
    if (cleanUsername === 'admin' && cleanPassword === 'admin123') {
      // Fix: Added missing properties to satisfy Employee interface
      onLogin({
        id: 'admin',
        name: 'Администратор',
        role: 'управляющий',
        login: 'admin',
        password: '',
        salary: 0,
        revenuePercent: 0,
        profitPercent: 0,
        permissions: {
          canEditProduct: true,
          canCreateProduct: true,
          canDeleteProduct: true,
          canShowCost: true
        }
      });
      return;
    }

    // Поиск в списке сотрудников
    const found = employees.find(emp =>
      emp.login.trim().toLowerCase() === cleanUsername &&
      emp.password.trim() === cleanPassword
    );

    if (found) {
      onLogin(found);
    } else {
      setError('Неверный логин или пароль');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Вы действительно хотите полностью очистить все данные приложения?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-4 z-[200]">
      <div className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 animate-slide-up relative overflow-hidden">

        {/* Декоративный фон как на некоторых современных UI */}
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>

        <div className="text-center mb-8 mt-4">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
            <i className="fas fa-lock text-3xl"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">ИнвентарьПро</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Вход для персонала</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
              <i className="fas fa-user text-sm"></i>
            </div>
            <input
              type="text"
              required
              autoComplete="username"
              className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700"
              placeholder="Логин"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
              <i className="fas fa-key text-sm"></i>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full p-5 pl-14 pr-14 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-fade-in border border-red-100">
              <i className="fas fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white p-5 rounded-[24px] font-black shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all mt-6 text-lg hover:bg-indigo-700"
          >
            войти
          </button>
        </form>

        <div className="mt-10 text-center">
          <button
            onClick={handleResetData}
            className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-red-400 transition-colors"
          >
            Сброс данных приложения
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
