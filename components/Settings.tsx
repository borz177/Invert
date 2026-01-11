
import React from 'react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onClear: () => void;
  isOwner?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate, onClear, isOwner }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-800 px-2">Настройки</h2>

      <div className="bg-white p-6 rounded-[40px] border border-slate-100 space-y-6 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Название магазина</label>
          <input
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/5"
            value={settings.shopName}
            onChange={e => onUpdate({...settings, shopName: e.target.value})}
          />
        </div>

        <div className="space-y-4 pt-2">
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Клиентский доступ</p>

           <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="font-black text-slate-700 text-sm">Публичный магазин</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Клиенты могут найти вас по названию</p>
            </div>
            <button
              onClick={() => onUpdate({...settings, isPublic: !settings.isPublic})}
              className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${settings.isPublic ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="font-black text-slate-700 text-sm">Показывать товары</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Клиенты увидят вашу витрину в приложении</p>
            </div>
            <button
              onClick={() => onUpdate({...settings, showProductsToClients: !settings.showProductsToClients})}
              className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${settings.showProductsToClients ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Валюта</label>
            <select
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
              value={settings.currency}
              onChange={e => onUpdate({...settings, currency: e.target.value})}
            >
              <option value="₽">Рубль (₽)</option>
              <option value="$">Доллар ($)</option>
              <option value="€">Евро (€)</option>
              <option value="₸">Тенге (₸)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Порог остатков</label>
            <input
              type="number"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
              value={settings.lowStockThreshold}
              onChange={e => onUpdate({...settings, lowStockThreshold: parseInt(e.target.value) || 0})}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
          <div>
            <p className="font-black text-slate-700 text-sm">Темная тема</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Экспериментально</p>
          </div>
          <button
            onClick={() => onUpdate({...settings, darkMode: !settings.darkMode})}
            className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${settings.darkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="p-6 bg-red-50 rounded-[40px] border border-red-100 animate-fade-in">
          <h3 className="font-black text-red-600 text-sm uppercase tracking-widest mb-2">Опасная зона</h3>
          <p className="text-xs text-red-400 font-medium mb-4 leading-relaxed">
            Удаление всех данных приведет к полной очистке каталога, истории продаж и кассы. Это действие необратимо.
          </p>
          <button
            onClick={onClear}
            className="w-full py-4 bg-white border-2 border-red-100 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest active:bg-red-50 transition-colors"
          >
            ОЧИСТИТЬ ВСЕ ДАННЫЕ
          </button>
        </div>
      )}

      <div className="text-center py-4">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ИнвентарьПро v2.1.0</p>
      </div>
    </div>
  );
};

export default Settings;
