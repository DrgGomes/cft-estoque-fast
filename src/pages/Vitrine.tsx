import React, { useContext, useState } from 'react';
import { Search, Image as ImageIcon, X, ShoppingBag } from 'lucide-react';
import { AppContext, formatCurrency } from '../AppContext';

export default function Vitrine() {
  const { publicVitrine, currentTenant, groupedProducts, loading } = useContext(AppContext);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [activeModalImage, setActiveModalImage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  if (loading || !publicVitrine) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-bold">Carregando Catálogo...</p>
          </div>
      );
  }

  const showPrice = publicVitrine.config?.showPrice ?? true;
  const markup = publicVitrine.config?.priceMarkup || 0;
  const brandColor = currentTenant?.primaryColor || '#2563eb';

  // Filtra apenas os produtos que o Fornecedor marcou para aparecer nesta vitrine
  let vitrineModels = Object.entries(groupedProducts).filter(([name]) => publicVitrine.models.includes(name));
  
  if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      vitrineModels = vitrineModels.filter(([name]) => name.toLowerCase().includes(lowerTerm));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      
      {/* CABEÇALHO */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-5xl mx-auto p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  {currentTenant?.logoUrl ? (
                      <img src={currentTenant.logoUrl} className="h-10 object-contain" alt="Logo" />
                  ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{backgroundColor: brandColor}}><ShoppingBag size={20}/></div>
                  )}
                  <div>
                      <h1 className="font-black text-xl leading-tight">{publicVitrine.name}</h1>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{currentTenant?.name}</span>
                  </div>
              </div>
              <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar modelo..." className="w-full bg-slate-100 border border-transparent rounded-full pl-10 pr-4 py-2 text-sm focus:bg-white focus:border-slate-300 outline-none transition-colors" />
              </div>
          </div>
      </header>

      {/* CATÁLOGO EM GRADE */}
      <main className="max-w-5xl mx-auto p-4 mt-4">
          {vitrineModels.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Nenhum produto encontrado nesta coleção.</p>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                  {vitrineModels.map(([name, group]: any) => {
                      const firstImage = group.info.image ? group.info.image.split(',')[0] : '';
                      const finalPrice = group.info.price + (group.info.price * (markup / 100));
                      
                      return (
                          <div key={name} onClick={() => { setViewingProduct({name, group, finalPrice}); setActiveModalImage(firstImage); }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition duration-300 cursor-pointer group">
                              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                                  {firstImage ? (<img src={firstImage} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300 w-12 h-12" /></div>)}
                              </div>
                              <div className="p-3 md:p-4 flex flex-col justify-between flex-1">
                                  <h3 className="font-bold text-slate-800 text-xs md:text-sm leading-tight line-clamp-2 mb-2">{String(name)}</h3>
                                  {showPrice && <div className="text-sm md:text-lg font-black mt-auto" style={{color: brandColor}}>{formatCurrency(finalPrice)}</div>}
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </main>

      {/* MODAL DO PRODUTO (CLIENTE FINAL) */}
      {viewingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] md:p-4 animate-in fade-in" onClick={() => setViewingProduct(null)}>
             <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <button onClick={() => setViewingProduct(null)} className="absolute top-4 right-4 bg-slate-100 text-slate-500 hover:text-black hover:bg-slate-200 p-2 rounded-full transition-colors z-20"><X size={20}/></button>
                
                <div className="w-full md:w-1/2 p-4 md:p-6 bg-slate-50 flex flex-col">
                    <div className="aspect-square bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4 flex items-center justify-center shadow-sm">
                        {activeModalImage ? <img src={activeModalImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-24 h-24" />}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 hidden-scroll">
                        {viewingProduct.group.info.image && viewingProduct.group.info.image.split(',').map((url: string, i: number) => (
                            <img key={i} src={url} onClick={() => setActiveModalImage(url)} className={`w-16 h-16 rounded-xl object-cover cursor-pointer border-2 transition-all shrink-0 ${activeModalImage === url ? 'opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`} style={activeModalImage === url ? {borderColor: brandColor} : {}} />
                        ))}
                    </div>
                </div>
                
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
                    <h2 className="text-xl md:text-3xl font-black text-slate-800 leading-tight mb-2 pr-8">{viewingProduct.name}</h2>
                    {showPrice && <div className="text-2xl md:text-3xl font-black mb-6" style={{color: brandColor}}>{formatCurrency(viewingProduct.finalPrice)}</div>}
                    
                    <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Cores Disponíveis</p>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(viewingProduct.group.items.map((i: any) => i.color))).map(color => (<span key={String(color)} className="border border-slate-200 text-slate-700 bg-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm">{String(color)}</span>))}
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Tamanhos Disponíveis</p>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(viewingProduct.group.items.map((i: any) => i.size))).map(size => (<span key={String(size)} className="border border-slate-200 text-slate-700 bg-white w-12 h-12 flex items-center justify-center rounded-xl text-sm font-black shadow-sm">{String(size)}</span>))}
                        </div>
                    </div>

                    {viewingProduct.group.info.description && (
                        <div className="mb-6">
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Descrição do Produto</p>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{viewingProduct.group.info.description}</p>
                        </div>
                    )}
                </div>
             </div>
          </div>
      )}
    </div>
  );
}