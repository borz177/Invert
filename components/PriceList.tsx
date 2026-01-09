
import React, { useState, useMemo } from 'react';
import { Product } from '../types';

interface PriceListProps {
  products: Product[];
  showCost: boolean;
}

const PriceList: React.FC<PriceListProps> = ({ products, showCost }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const totals = useMemo(() => {
    return products.reduce((acc, p) => {
      acc.cost += p.cost * p.quantity;
      acc.price += p.price * p.quantity;
      return acc;
    }, { cost: 0, price: 0 });
  }, [products]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-slate-800">Прайс-лист</h2>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{products.length} поз.</div>
      </div>

      {showCost && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Оценка склада (Закуп)</p>
            <p className="text-2xl font-black text-slate-800">{totals.cost.toLocaleString()} ₽</p>
          </div>
          <div className="bg-indigo-600 p-6 rounded-[32px] shadow-lg text-white">
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Оценка склада (Продажа)</p>
            <p className="text-2xl font-black">{totals.price.toLocaleString()} ₽</p>
          </div>
        </div>
      )}

      <div className="relative">
        <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
        <input className="w-full p-4 pl-12 rounded-2xl bg-white shadow-sm border border-slate-100 outline-none" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {filtered.map(p => (
          <div key={p.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="font-bold text-slate-800 truncate text-sm">{p.name}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{p.category} • {p.unit} {p.quantity <= p.minStock && <span className="text-red-500 ml-1">(мало)</span>}</p>
            </div>
            <div className="text-right flex items-center gap-6 shrink-0">
              {showCost && (
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-black uppercase">Закуп</p>
                  <p className="font-bold text-slate-500 text-xs">{p.cost.toLocaleString()} ₽</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Продажа</p>
                <p className="text-lg font-black text-indigo-600">{p.price.toLocaleString()} ₽</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceList;
