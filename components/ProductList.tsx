
import React, { useState } from 'react';
import { Product } from '../types';

interface ProductListProps {
  products: Product[];
  categories: string[];
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  showCost: boolean;
  onAdd: (product: Product) => void;
  onAddBulk: (products: Product[]) => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddCategory: (category: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products, categories, canEdit, canCreate, canDelete, showCost,
  onAdd, onAddBulk, onUpdate, onDelete, onAddCategory, onRenameCategory, onDeleteCategory
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<Product | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'CAT' | 'PROD', id: string, name: string } | null>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    category: categories[0] || 'Другое',
    minStock: 5,
    quantity: 0,
    cost: 0,
    price: 0,
    unit: 'шт',
    type: 'PRODUCT'
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openEdit = (p: Product) => {
    if (!canEdit) return;
    setFormData({ ...p });
    setEditingId(p.id);
    setShowForm(true);
    setActiveMenuId(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setShowBulk(false);
    setShowCatForm(false);
    setEditingId(null);
    setEditingCat(null);
    setNewCatName('');
    setBulkText('');
    setShowMoveModal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.price !== undefined) {
      const parseNum = (val: any) => {
        if (val === '' || val === null || val === undefined) return 0;
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
      };

      const finalProduct: Product = {
        id: editingId || Date.now().toString(),
        name: formData.name!,
        sku: formData.sku || `SKU-${Math.floor(Math.random() * 10000)}`,
        price: parseNum(formData.price),
        cost: parseNum(formData.cost),
        quantity: formData.type === 'SERVICE' ? 0 : parseNum(formData.quantity),
        category: formData.category || categories[0] || 'Другое',
        minStock: formData.type === 'SERVICE' ? 0 : parseNum(formData.minStock),
        unit: (formData.unit as any) || 'шт',
        image: formData.image,
        type: formData.type || 'PRODUCT'
      };

      if (editingId) {
        onUpdate(finalProduct);
      } else {
        onAdd(finalProduct);
      }
      closeForm();
    }
  };

  const handleMoveProduct = (newCat: string) => {
    if (showMoveModal) {
      onUpdate({ ...showMoveModal, category: newCat });
      setShowMoveModal(null);
      setActiveMenuId(null);
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split('\n');
    const newProducts: Product[] = [];
    lines.forEach(line => {
      const parts = line.split(',').map(s => s.trim());
      if (parts[0]) {
        newProducts.push({
          id: Math.random().toString(36).substr(2, 9),
          name: parts[0],
          sku: `SKU-${Math.floor(Math.random() * 10000)}`,
          price: parseFloat(parts[1]) || 0,
          cost: parseFloat(parts[2]) || 0,
          quantity: parseFloat(parts[3]) || 0,
          category: selectedCategory || categories[0] || 'Другое',
          minStock: 5,
          unit: 'шт',
          type: 'PRODUCT'
        });
      }
    });
    if (newProducts.length) onAddBulk(newProducts);
    closeForm();
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName) {
      if (editingCat) onRenameCategory(editingCat, newCatName);
      else onAddCategory(newCatName);
      closeForm();
    }
  };

  const processDelete = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirmDelete) return;
    if (confirmDelete.type === 'PROD') onDelete(confirmDelete.id);
    else onDeleteCategory(confirmDelete.id);
    setConfirmDelete(null);
  };

  const filteredBySearch = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeProducts = selectedCategory
    ? filteredBySearch.filter(p => p.category === selectedCategory)
    : [];

  const productCountPerCategory = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="relative space-y-6 min-h-screen">
      {activeMenuId && (
        <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setActiveMenuId(null)} />
      )}

      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-slate-800">
          {(selectedCategory && !searchTerm) ? (
            <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
              <i className="fas fa-arrow-left text-sm"></i> {selectedCategory}
            </button>
          ) : 'Каталог'}
        </h2>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setShowBulk(true); }} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider">Массово</button>
              <button onClick={(e) => { e.stopPropagation(); setFormData({ category: selectedCategory || categories[0] || 'Другое', minStock: 5, quantity: 0, cost: 0, price: 0, unit: 'шт', type: 'PRODUCT' }); setShowForm(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm active:scale-95 transition-transform">+ Добавить</button>
            </>
          )}
        </div>
      </div>

      <div className="relative z-0">
        <i className="fas fa-search absolute left-4 top-4 text-slate-400"></i>
        <input className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {!selectedCategory && !searchTerm && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat} className="relative">
              <button onClick={() => setSelectedCategory(cat)} className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group transition-all hover:border-indigo-300">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><i className="fas fa-folder text-3xl"></i></div>
                <h3 className="font-black text-slate-800 text-sm truncate w-full">{cat}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{productCountPerCategory[cat] || 0} позиций</p>
              </button>
              {canEdit && (
                <div className="absolute top-4 right-4 z-20">
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === cat ? null : cat); }} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100"><i className="fas fa-ellipsis-v text-xs"></i></button>
                  {activeMenuId === cat && (
                    <div className="absolute top-10 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-40 z-30 animate-fade-in">
                      <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setNewCatName(cat); setShowCatForm(true); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50">Изменить</button>
                      {canDelete && <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'CAT', id: cat, name: cat }); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 flex items-center gap-2 hover:bg-red-50">Удалить</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {canCreate && (
            <button onClick={() => { setEditingCat(null); setNewCatName(''); setShowCatForm(true); }} className="w-full bg-slate-50 p-6 rounded-[32px] border border-dashed border-slate-300 flex flex-col items-center justify-center text-center group hover:bg-white hover:border-indigo-300 transition-all">
              <div className="w-16 h-16 bg-white text-slate-300 rounded-3xl flex items-center justify-center mb-3 group-hover:text-indigo-400 transition-colors"><i className="fas fa-plus text-3xl"></i></div>
              <h3 className="font-bold text-slate-400 text-sm">Новая папка</h3>
            </button>
          )}
        </div>
      )}

      {(selectedCategory || searchTerm) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
          {(searchTerm ? filteredBySearch : activeProducts).map(p => (
            <div key={p.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex flex-col relative animate-fade-in">
              <div className="flex justify-between items-start mb-4 pr-6">
                <div className="flex gap-4 min-w-0 pr-4">
                  {p.image ? (
                    <img src={p.image} className="w-16 h-16 rounded-2xl object-cover shrink-0" alt={p.name} />
                  ) : (
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shrink-0">
                      <i className={`fas ${p.type === 'SERVICE' ? 'fa-concierge-bell' : 'fa-image'} text-xl`}></i>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-indigo-400 uppercase bg-indigo-50 px-2 py-0.5 rounded-full inline-block">{p.category}</span>
                      {p.type === 'SERVICE' && (
                        <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full inline-block">Услуга</span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-800 leading-tight line-clamp-2">{p.name}</h4>
                  </div>
                </div>
                {(canEdit || canDelete) && (
                  <div className="absolute top-5 right-5 z-20">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === p.id ? null : p.id); }} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100"><i className="fas fa-ellipsis-v text-xs"></i></button>
                    {activeMenuId === p.id && (
                      <div className="absolute top-10 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-48 z-30 animate-fade-in">
                        {canEdit && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50">
                              <i className="fas fa-pen text-indigo-400 w-4"></i> Изменить
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setShowMoveModal(p); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50">
                              <i className="fas fa-exchange-alt text-orange-400 w-4"></i> Переместить
                            </button>
                          </>
                        )}
                        {canDelete && <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'PROD', id: p.id, name: p.name }); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 flex items-center gap-2 hover:bg-red-50 border-t border-slate-50 mt-1">
                          <i className="fas fa-trash text-red-400 w-4"></i> Удалить
                        </button>}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-auto flex justify-between items-end border-t border-slate-50 pt-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">{p.type === 'SERVICE' ? 'Статус' : 'Остаток'}</p>
                  {p.type === 'SERVICE' ? (
                    <p className="text-sm font-black text-emerald-600 flex items-center gap-1"><i className="fas fa-bolt text-[10px]"></i> Всегда в наличии</p>
                  ) : (
                    <p className={`text-xl font-black ${p.quantity <= p.minStock ? 'text-red-500' : 'text-slate-800'}`}>{p.quantity} <span className="text-xs font-normal text-slate-400">{p.unit}</span></p>
                  )}
                </div>
                <div className="text-right">
                  {showCost && p.type !== 'SERVICE' && <p className="text-[8px] text-slate-300 font-bold uppercase mb-1">Закуп: {p.cost} ₽</p>}
                  <p className="text-[10px] font-black text-slate-400 uppercase">Цена</p><p className="text-xl font-black text-indigo-600">{p.price.toLocaleString()} ₽</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[140] flex items-center justify-center p-4" onClick={closeForm}>
          <form onSubmit={handleSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-md space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-800">{editingId ? 'Изменить' : 'Новая запись'}</h3>

            <div className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, type: 'PRODUCT'})}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'PRODUCT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Товар
                </button>
                <button type="button" onClick={() => setFormData({...formData, type: 'SERVICE'})}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'SERVICE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Услуга
                </button>
              </div>

              <div className="flex flex-col items-center gap-3">
                <label className="relative cursor-pointer group">
                  <div
                      className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-indigo-300">
                    {formData.image ? (
                        <img src={formData.image} className="w-full h-full object-cover" alt="Preview"/>
                    ) : (
                        <>
                          <i className={`fas ${formData.type === 'SERVICE' ? 'fa-concierge-bell' : 'fa-camera'} text-2xl text-slate-300 mb-2`}></i>
                          <span className="text-[8px] font-black text-slate-400 uppercase">Загрузить фото</span>
                        </>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange}/>
                  {formData.image && (
                      <button type="button" onClick={(e) => {
                        e.preventDefault();
                        setFormData({...formData, image: undefined});
                      }}
                              className="absolute -top-2 -right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow-lg flex items-center justify-center border border-slate-100">
                        <i className="fas fa-times"></i></button>
                  )}
                </label>
              </div>

              <div className="space-y-1">
                <label
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Название {formData.type === 'SERVICE' ? 'услуги' : 'товара'}</label>
                <input required
                       className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium"
                       placeholder={formData.type === 'SERVICE' ? "Напр: Маникюр" : "Напр: Футболка"}
                       value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}/>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Описание
                  (необязательно)</label>
                <textarea
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-slate-700 h-24 resize-none"
                    placeholder="Добавьте детали, характеристики или состав..." value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Папка</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ед.
                    изм.</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                          value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                    <option value="шт">шт</option>
                    <option value="кг">кг</option>
                    <option value="упак">упак</option>
                    <option value="ящик">ящик</option>
                    <option value="л">л</option>
                    <option value="мл">мл</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.type !== 'SERVICE' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Закуп
                        (₽)</label>
                      <input type="number" step="0.01" inputMode="decimal"
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                             value={formData.cost === 0 ? '' : formData.cost}
                             onChange={e => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}/>
                    </div>
                )}
                <div className={`${formData.type === 'SERVICE' ? 'col-span-2' : ''} space-y-1`}>
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Цена продажи
                    (₽)</label>
                  <input type="number" step="0.01" inputMode="decimal" required
                         className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none font-black text-indigo-600"
                         value={formData.price === 0 ? '' : formData.price}
                         onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}/>
                </div>
              </div>

              {formData.type !== 'SERVICE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label
                          className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Остаток</label>
                      <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                          value={formData.quantity === 0 || formData.quantity === null || formData.quantity === undefined ? '' : formData.quantity}
                          onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Мин.
                        порог</label>
                      <input type="number" inputMode="numeric"
                             className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                             value={formData.minStock === 0 ? '' : formData.minStock}
                             onChange={e => setFormData({...formData, minStock: parseFloat(e.target.value) || 0})}/>
                    </div>
                  </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeForm} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit"
                      className="flex-1 bg-indigo-600 text-white p-4 rounded-3xl font-black shadow-lg uppercase tracking-widest text-xs">СОХРАНИТЬ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk and Delete modals remain same */}
      {showBulk && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[140] flex items-center justify-center p-4" onClick={closeForm}>
          <form onSubmit={handleBulkSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-w-md space-y-5 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-800">Массовый ввод (товары)</h3>
            <p className="text-xs text-slate-400">Формат: Название, Цена, Закуп, Ост</p>
            <textarea className="w-full h-48 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-mono text-sm resize-none" placeholder="Товар 1, 100, 50, 10" value={bulkText} onChange={e => setBulkText(e.target.value)} />
            <div className="flex gap-3">
              <button type="button" onClick={closeForm} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white p-4 rounded-3xl font-black shadow-lg">ДОБАВИТЬ</button>
            </div>
          </form>
        </div>
      )}

      {showCatForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[140] flex items-center justify-center p-4" onClick={closeForm}>
          <form onSubmit={handleCatSubmit} className="bg-white p-7 rounded-[40px] shadow-2xl w-full max-sm space-y-5 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-800">{editingCat ? 'Изменить папку' : 'Новая папка'}</h3>
            <input required autoFocus className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Название папки..." value={newCatName} onChange={e => setNewCatName(e.target.value)} />
            <div className="flex gap-3">
              <button type="button" onClick={closeForm} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white p-4 rounded-3xl font-black shadow-lg">СОХРАНИТЬ</button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-center space-y-6 animate-slide-up">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto text-3xl"><i className="fas fa-trash-alt"></i></div>
            <h3 className="text-xl font-black text-slate-800">Удалить {confirmDelete.name}?</h3>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-4 font-bold text-slate-400">Отмена</button>
              <button onClick={() => processDelete()} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black">УДАЛИТЬ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
