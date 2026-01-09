
import React, { useState } from 'react';
import { Product, Sale } from '../types';
import { getInventoryInsights } from '../services/geminiService';

interface AiAdvisorProps {
  products: Product[];
  sales: Sale[];
}

const AiAdvisor: React.FC<AiAdvisorProps> = ({ products, sales }) => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    const result = await getInventoryInsights(products, sales);
    setInsight(result || "Ошибка анализа.");
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl text-white shadow-xl">
        <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
          <i className="fas fa-robot"></i>
          AI Советник
        </h2>
        <p className="text-indigo-100 opacity-90 max-w-lg">
          Я проанализирую ваш ассортимент, продажи и остатки, чтобы дать рекомендации по развитию вашего бизнеса.
        </p>
        <button 
          onClick={generateReport}
          disabled={loading}
          className="mt-6 bg-white text-indigo-600 px-8 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <i className="fas fa-spinner fa-spin"></i> Думаю...
            </span>
          ) : 'Получить рекомендации'}
        </button>
      </div>

      {insight && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 animate-fade-in">
          <h3 className="text-lg font-bold mb-4 text-indigo-600 flex items-center gap-2">
            <i className="fas fa-lightbulb"></i> Анализ данных
          </h3>
          <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
            {insight}
          </div>
        </div>
      )}

      {!insight && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-slate-100 rounded-2xl border border-dashed border-slate-300 text-slate-500">
            <i className="fas fa-chart-pie mb-2 block text-xl"></i>
            Анализ оборачиваемости товаров
          </div>
          <div className="p-6 bg-slate-100 rounded-2xl border border-dashed border-slate-300 text-slate-500">
            <i className="fas fa-tag mb-2 block text-xl"></i>
            Рекомендации по ценам
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAdvisor;
