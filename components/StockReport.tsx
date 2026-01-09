
import React from 'react';
import { Product } from '../types';

interface StockReportProps {
  products: Product[];
}

const StockReport: React.FC<StockReportProps> = ({ products }) => {
  const totalStockItems = products.reduce((acc, p) => acc + p.quantity, 0);
  const totalCostValue = products.reduce((acc, p) => acc + (p.quantity * p.cost), 0);
  const totalRetailValue = products.reduce((acc, p) => acc + (p.quantity * p.price), 0);
  const expectedProfit = totalRetailValue - totalCostValue;
  
  const criticalItems = products.filter(p => p.quantity <= p.minStock);

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-slate-800">Отчет по остаткам</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Общий объем</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-slate-800">{totalStockItems.toLocaleString()} <span className="text-sm font-normal text-slate-400">ед.</span></h3>
            <div className="text-right">
              <p className="text-xs font-bold text-indigo-600">на {totalCostValue.toLocaleString()} ₽ <span className="text-[9px] text-slate-400 uppercase">(закуп)</span></p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white">
          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Ожидаемая прибыль</p>
          <h3 className="text-3xl font-black">{expectedProfit.toLocaleString()} ₽</h3>
          <p className="text-[10px] opacity-70 mt-1">при полной реализации текущих остатков</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-100">
          <h4 className="font-black text-slate-500 text-[10px] uppercase tracking-widest">Критически мало на складе ({criticalItems.length})</h4>
        </div>
        <div className="divide-y divide-slate-50">
          {criticalItems.map(p => (
            <div key={p.id} className="p-4 flex justify-between items-center bg-red-50/30">
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">МИН: {p.minStock} • ТЕКУЩИЙ: {p.quantity}</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase">Нужна закупка</span>
              </div>
            </div>
          ))}
          {criticalItems.length === 0 && (
            <div className="p-10 text-center text-emerald-500 font-bold text-sm">Все товары в достаточном количестве!</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-100">
          <h4 className="font-black text-slate-500 text-[10px] uppercase tracking-widest">Весь ассортимент</h4>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
            <tr>
              <th className="p-4">Товар</th>
              <th className="p-4 text-center">Кол-во</th>
              <th className="p-4 text-right">Сумма закупа</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map(p => (
              <tr key={p.id}>
                <td className="p-4">
                  <p className="font-bold text-slate-800 leading-tight">{p.name}</p>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">{p.sku}</p>
                </td>
                <td className="p-4 text-center">
                  <span className={`font-black ${p.quantity <= p.minStock ? 'text-red-500' : 'text-slate-800'}`}>{p.quantity}</span>
                </td>
                <td className="p-4 text-right font-bold text-slate-600">
                  {(p.quantity * p.cost).toLocaleString()} ₽
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockReport;
