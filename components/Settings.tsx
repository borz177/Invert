
import React, { useState } from 'react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onClear: () => void;
  isOwner?: boolean;
  userId?: string;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate, onClear, isOwner, userId }) => {
  const [copied, setCopied] = useState(false);

  const shopUrl = settings?.publicToken
  ? `${window.location.origin}/shop/${settings.publicToken}`
  : `${window.location.origin}/shop/generating...`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-800 px-2">Настройки</h2>

      {isOwner && (
        <div className="bg-indigo-600 p-6 rounded-[40px] shadow-lg text-white space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-link"></i>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-60">Ваша публичная ссылка</p>
              <p className="text-xs font-bold truncate max-w-[200px]">{shopUrl}</p>
            </div>
          </div>
          <p className="text-[10px] leading-relaxed opacity-80 font-medium">Отправьте эту ссылку клиентам, чтобы они могли заказывать товары без регистрации в системе.</p>
          <button
            onClick={copyToClipboard}
            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500' : 'bg-white text-indigo-600'}`}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            {copied ? 'Скопировано!' : 'Копировать ссылку'}
          </button>
        </div>
      )}

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
              <p className="text-[10px] text-slate-400 font-bold uppercase">Магазин виден по ссылке выше</p>
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
              <p className="text-[10px] text-slate-400 font-bold uppercase">Клиенты увидят вашу витрину</p>
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
            Удаление всех данных приведет к полной очистке каталога, истории продаж и кассы.
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
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ИнвентарьПро v2.2.0</p>
      </div>
    </div>
  );
};

export default Settings;
