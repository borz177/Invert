
import React, { useState, useMemo } from 'react';
import { Employee, Sale } from '../types';

interface EmployeesProps {
  employees: Employee[];
  sales: Sale[];
  onAdd: (e: Employee) => void;
  onUpdate: (e: Employee) => void;
  onDelete: (id: string) => void;
}

const Employees: React.FC<EmployeesProps> = ({ employees, sales, onAdd, onUpdate, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [performanceEmp, setPerformanceEmp] = useState<Employee | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState<Partial<Employee>>({
    role: 'кассир',
    salary: 0,
    revenuePercent: 0,
    profitPercent: 0,
    permissions: {
      canEditProduct: false,
      canCreateProduct: false,
      canDeleteProduct: false,
      canShowCost: false
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.login && formData.password) {
      if (editingEmployee) {
        onUpdate({ ...editingEmployee, ...formData } as Employee);
      } else {
        onAdd({
          ...formData as Employee,
          id: Date.now().toString(),
          salary: formData.salary || 0,
          revenuePercent: formData.revenuePercent || 0,
          profitPercent: formData.profitPercent || 0
        });
      }
      closeModal();
    }
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditingEmployee(null);
    setFormData({
      role: 'кассир',
      salary: 0,
      revenuePercent: 0,
      profitPercent: 0,
      permissions: {
        canEditProduct: false,
        canCreateProduct: false,
        canDeleteProduct: false,
        canShowCost: false
      }
    });
    setActiveMenuId(null);
  };

  const openEdit = (e: Employee) => {
    setEditingEmployee(e);
    setFormData(e);
    setShowAdd(true);
    setActiveMenuId(null);
  };

  const togglePermission = (key: keyof Employee['permissions']) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions!,
        [key]: !formData.permissions![key]
      }
    });
  };

  const calculatePerformance = (emp: Employee) => {
    const periodSales = sales.filter(s =>
      !s.isDeleted &&
      s.employeeId === emp.id &&
      s.date >= dateRange.start &&
      s.date <= (dateRange.end + 'T23:59:59')
    );

    const totalRevenue = periodSales.reduce((acc, s) => acc + s.total, 0);
    const totalProfit = periodSales.reduce((acc, s) => {
      const saleProfit = s.items.reduce((pAcc, item) => pAcc + (item.price - item.cost) * item.quantity, 0);
      return acc + saleProfit;
    }, 0);

    const revenueCommission = (totalRevenue * emp.revenuePercent) / 100;
    const profitCommission = (totalProfit * emp.profitPercent) / 100;
    const totalEarnings = emp.salary + revenueCommission + profitCommission;

    return { totalRevenue, totalProfit, revenueCommission, profitCommission, totalEarnings };
  };

  return (
    <div className="space-y-6 pb-20" onClick={() => setActiveMenuId(null)}>
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-slate-800">Персонал</h2>
        <button onClick={(ev) => { ev.stopPropagation(); setShowAdd(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm">+ Добавить</button>
      </div>

      <div className="grid gap-3">
        {employees.map(e => (
          <div key={e.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative transition-all hover:border-indigo-100">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                {e.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 leading-tight">{e.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{e.role}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100 font-bold">Оклад: {e.salary}</span>
                  <span className="text-[9px] bg-indigo-50 text-indigo-500 px-2 py-1 rounded-lg border border-indigo-100 font-bold">Выр: {e.revenuePercent}%</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100 font-bold">Приб: {e.profitPercent}%</span>
                </div>
              </div>
            </div>

            <button onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(activeMenuId === e.id ? null : e.id); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400"><i className="fas fa-ellipsis-v text-sm"></i></button>

            {activeMenuId === e.id && (
              <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-48 z-20 animate-fade-in">
                <button onClick={() => { setPerformanceEmp(e); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                  <i className="fas fa-chart-line text-xs"></i> Доходы / KPI
                </button>
                <button onClick={() => openEdit(e)} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                  <i className="fas fa-pen text-indigo-400 text-xs"></i> Изменить
                </button>
                <button onClick={() => onDelete(e.id)} className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                  <i className="fas fa-trash text-xs"></i> Удалить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {performanceEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setPerformanceEmp(null)}>
          <div className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-w-md space-y-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-800">{performanceEmp.name}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Аналитика доходов</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">От</label>
                <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">До</label>
                <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
              </div>
            </div>

            {(() => {
              const stats = calculatePerformance(performanceEmp);
              return (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold">Продажи (объем)</span>
                      <span className="font-black text-slate-700">{stats.totalRevenue.toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold">Прибыль (маржа)</span>
                      <span className="font-black text-emerald-600">{stats.totalProfit.toLocaleString()} ₽</span>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 space-y-3">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center mb-2">Расчет выплаты</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold">Фикс. оклад</span>
                      <span className="font-bold text-slate-700">{performanceEmp.salary.toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold">Комиссия с выручки ({performanceEmp.revenuePercent}%)</span>
                      <span className="font-bold text-slate-700">+{stats.revenueCommission.toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold">Комиссия с прибыли ({performanceEmp.profitPercent}%)</span>
                      <span className="font-bold text-slate-700">+{stats.profitCommission.toLocaleString()} ₽</span>
                    </div>
                    <div className="pt-3 border-t border-indigo-200 flex justify-between items-center">
                      <span className="font-black text-indigo-600 text-sm uppercase">ИТОГО К ВЫПЛАТЕ:</span>
                      <span className="text-xl font-black text-indigo-700">{stats.totalEarnings.toLocaleString()} ₽</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <button onClick={() => setPerformanceEmp(null)} className="w-full bg-slate-800 text-white p-4 rounded-2xl font-black shadow-lg">ЗАКРЫТЬ</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-w-sm space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
            <h3 className="text-xl font-black text-slate-800 text-center">{editingEmployee ? 'Изменить сотрудника' : 'Новый сотрудник'}</h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ФИО</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Имя..." value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Роль</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-600" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                  <option value="кассир">Кассир</option>
                  <option value="менеджер">Менеджер</option>
                  <option value="кладовщик">Кладовщик</option>
                  <option value="управляющий">Управляющий</option>
                </select>
              </div>

              <div className="bg-indigo-50 p-4 rounded-3xl space-y-3">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Мотивация и ЗП</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Оклад (₽)</label>
                    <input type="number" className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold" value={formData.salary || ''} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">% от Выручки</label>
                    <input type="number" className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold" value={formData.revenuePercent || ''} onChange={e => setFormData({...formData, revenuePercent: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">% от Прибыли (Чистой)</label>
                  <input type="number" className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold" value={formData.profitPercent || ''} onChange={e => setFormData({...formData, profitPercent: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-3xl space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Права доступа</p>
                {[
                  { key: 'canEditProduct', label: 'Редактировать товар' },
                  { key: 'canCreateProduct', label: 'Создавать товар' },
                  { key: 'canDeleteProduct', label: 'Удаление' },
                  { key: 'canShowCost', label: 'Показывать цену закупки' }
                ].map(p => (
                  <div key={p.key} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">{p.label}</span>
                    <button type="button" onClick={() => togglePermission(p.key as any)} className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${formData.permissions?.[p.key as keyof Employee['permissions']] ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                      <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Логин</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={formData.login || ''} onChange={e => setFormData({...formData, login: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Пароль</label>
                  <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">СОХРАНИТЬ</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Employees;
