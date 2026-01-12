
import React, { useState } from 'react';

const Tariffs: React.FC = () => {
  const [months, setMonths] = useState<number>(1);

  const getDiscount = (m: number) => {
    if (m === 3) return 0.05;
    if (m === 6) return 0.10;
    if (m === 12) return 0.20;
    return 0;
  };

  const calculatePrice = (base: number) => {
    if (base === 0) return 0;
    const discount = getDiscount(months);
    const monthlyPrice = base * (1 - discount);
    return Math.round(monthlyPrice * months);
  };

  const PLANS = [
    {
      id: 'START',
      name: 'Старт',
      basePrice: 0,
      color: 'from-slate-400 to-slate-500',
      icon: 'fa-rocket',
      features: [
        'До 50 товаров',
        '1 магазин',
        '1 пользователь',
        'Базовая аналитика',
        'PWA приложение'
      ],
      limit: 'Отлично для микро-бизнеса'
    },
    {
      id: 'BUSINESS',
      name: 'Бизнес',
      basePrice: 990,
      color: 'from-indigo-600 to-indigo-700',
      icon: 'fa-briefcase',
      features: [
        'До 1000 товаров',
        'До 3 магазинов',
        '5 сотрудников',
        'AI Аналитика (Gemini)',
        'Работа с долгами'
      ],
      limit: 'Для растущих магазинов',
      isPopular: true
    },
    {
      id: 'PRO',
      name: 'Про',
      basePrice: 2490,
      color: 'from-amber-500 to-amber-600',
      icon: 'fa-crown',
      features: [
        'Безлимит товаров',
        'Безлимит магазинов',
        'Любое кол-во сотрудников',
        'Advanced AI аналитика',
        'Приоритетный саппорт 24/7'
      ],
      limit: 'Для крупных сетей'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-800">Выберите свой план</h2>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Масштабируйте свой бизнес вместе с нами</p>
      </div>

      <div className="flex justify-center p-1 bg-slate-100 rounded-[28px] max-w-sm mx-auto shadow-inner">
        {[1, 3, 6, 12].map(m => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`flex-1 py-4 rounded-[24px] text-[10px] font-black uppercase transition-all relative ${months === m ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}
          >
            {m === 1 ? '1 мес' : `${m} мес`}
            {getDiscount(m) > 0 && (
              <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[7px] px-1.5 py-0.5 rounded-full border-2 border-white">
                -{getDiscount(m)*100}%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <div key={plan.id} className={`bg-white rounded-[40px] shadow-sm border ${plan.isPopular ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-100'} flex flex-col relative overflow-hidden transition-all hover:shadow-xl`}>
            {plan.isPopular && (
              <div className="bg-indigo-600 text-white text-[8px] font-black uppercase py-1 px-4 absolute top-4 -right-8 rotate-45 w-32 text-center">ХИТ</div>
            )}

            <div className={`bg-gradient-to-br ${plan.color} p-8 text-white text-center`}>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-lg">
                <i className={`fas ${plan.icon}`}></i>
              </div>
              <h3 className="text-xl font-black">{plan.name}</h3>
              <p className="text-[9px] font-black uppercase opacity-60 mt-1">{plan.limit}</p>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="text-center mb-8">
                <span className="text-4xl font-black text-slate-800">
                  {plan.basePrice === 0 ? 'Бесплатно' : `${calculatePrice(plan.basePrice).toLocaleString()} ₽`}
                </span>
                {plan.basePrice > 0 && <span className="text-xs text-slate-400 block font-bold mt-1">за {months} мес.</span>}
              </div>

              <ul className="space-y-4 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-5 h-5 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
                      <i className="fas fa-check text-[10px]"></i>
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => alert(`Вы выбрали тариф ${plan.name} на ${months} мес. Перенаправление на оплату...`)}
                className={`mt-8 w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${plan.basePrice === 0 ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
              >
                {plan.basePrice === 0 ? 'Текущий план' : 'Перейти на этот план'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm text-center space-y-4">
        <h4 className="text-lg font-black text-slate-800">Есть вопросы?</h4>
        <p className="text-sm text-slate-400 font-medium">Свяжитесь с нашим отделом заботы о клиентах, мы поможем подобрать лучшее решение.</p>
        <button className="bg-slate-50 text-slate-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:bg-slate-100 transition-colors">
          <i className="fas fa-headset mr-2"></i> Написать в поддержку
        </button>
      </div>
    </div>
  );
};

export default Tariffs;
