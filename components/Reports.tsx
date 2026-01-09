
import React, { useMemo } from 'react';
import { Product, Sale, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface ReportsProps {
  sales: Sale[];
  transactions: Transaction[];
  products: Product[];
}

const Reports: React.FC<ReportsProps> = ({ sales, products }) => {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => ({
      name: new Date(date).toLocaleDateString('ru-RU', { weekday: 'short' }),
      total: sales.filter(s => s.date.startsWith(date)).reduce((acc, s) => acc + s.total, 0)
    }));
  }, [sales]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod?.category || 'Другое';
        counts[cat] = (counts[cat] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sales, products]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-10">
      <h2 className="text-2xl font-bold text-slate-800">Аналитика</h2>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-6 text-slate-700">Продажи за неделю</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#94a3b8'}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6 text-slate-700">Выручка по категориям</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                <span className="text-xs text-slate-500 truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4 text-slate-700">Топ товаров (шт)</h3>
          <div className="space-y-4">
            {products
              .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
              .slice(0, 5)
              .map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">{p.name}</span>
                  <div className="flex-1 mx-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{width: `${Math.min(100, (p.quantity/50)*100)}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{p.quantity}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
