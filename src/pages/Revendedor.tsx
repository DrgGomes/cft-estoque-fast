import React from 'react';
import {
  Layers, LayoutGrid, Play, Plug, Ticket, Wallet, LogOut, Search,
  CheckSquare, Image as ImageIcon, ChevronUp, ChevronDown, Download, Send,
  GraduationCap, ChevronLeft, Film, CheckCircle2, Circle, Bell,
  X, MousePointerClick, Store, RefreshCw, MessageCircle, Video, Globe, ShoppingBag, FileText, Smartphone, Link2
} from 'lucide-react';
import { Product } from '../types';

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value: any) => { const num = Number(value); if (isNaN(num)) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num); };
const formatDate = (timestamp: any) => { if (!timestamp) return '...'; if (typeof timestamp.toMillis === 'function') { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp.toMillis()); } return '...'; };
const getYoutubeId = (url: string) => { if (!url) return null; const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/); return match ? match[1] : null; };

const renderDynamicIcon = (iconName: string, size = 24, className = "") => {
  switch (iconName) {
    case 'MessageCircle': return <MessageCircle size={size} className={className} />;
    case 'ImageIcon': return <ImageIcon size={size} className={className} />;
    case 'Video': return <Video size={size} className={className} />;
    case 'Globe': return <Globe size={size} className={className} />;
    case 'ShoppingBag': return <ShoppingBag size={size} className={className} />;
    case 'FileText': return <FileText size={size} className={className} />;
    case 'Smartphone': return <Smartphone size={size} className={className} />;
    default: return <Link2 size={size} className={className} />;
  }
};

export default function Revendedor(props: any) {
  // Recebe todas as variáveis do motor central (App.tsx)
  const {
    brandColor, brandLogo, brandName, userProfile, userView, setUserView, handleLogout,
    quickLinks, notices, selectedNotice, setSelectedNotice, searchTerm, setSearchTerm,
    groupedProducts, selectedCatalogGroups, setSelectedCatalogGroups, toggleGroupSelection,
    viewingProduct, setViewingProduct, activeModalImage, setActiveModalImage,
    handleBatchExportToUpSeller, handleExportToUpSeller, handlePublishToShopee,
    isShopeeSimulating, handleConnectShopee, handleDisconnectShopee,
    academyProgress, lessons, activeLesson, setActiveLesson, academySeasons,
    toggleLessonCompletion, ticketType, setTicketType, ticketReturnGroup,
    setTicketReturnGroup, ticketReturnProductId, setTicketReturnProductId,
    ticketDesiredGroup, setTicketDesiredGroup, ticketDesiredProductId,
    setTicketDesiredProductId, ticketReason, setTicketReason, handleOpenTicket,
    isSavingBatch, products, myTickets
  } = props;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 relative">
      
      {/* BOTÃO FLUTUANTE DE EXPORTAÇÃO EM LOTE */}
      {selectedCatalogGroups.length > 0 && userView === 'catalog' && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white pl-6 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-10 border border-slate-700">
              <span className="font-bold text-sm">{selectedCatalogGroups.length} selecionados</span>
              <button onClick={handleBatchExportToUpSeller} className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-full font-black flex items-center gap-2 text-sm shadow-lg transition-colors"><Download size={16} /> Baixar Lote (UpSeller)</button>
          </div>
      )}

      {/* MODAL DE DETALHES DO PRODUTO (E-COMMERCE PRO) */}
      {viewingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in" onClick={() => setViewingProduct(null)}>
             <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
                <button onClick={() => setViewingProduct(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-md hover:bg-black transition-colors z-20"><X size={20}/></button>

                <div className="w-full md:w-1/2 p-6 bg-slate-50 flex flex-col">
                   <div className="aspect-square bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4 flex items-center justify-center shadow-sm">
                       {activeModalImage ? <img src={activeModalImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-24 h-24" />}
                   </div>
                   <div className="flex gap-3 overflow-x-auto pb-2 hidden-scroll">
                       {viewingProduct.group.info.image && viewingProduct.group.info.image.split(',').map((url: string, i: number) => (
                           <img key={i} src={url} onClick={() => setActiveModalImage(url)} className={`w-16 h-16 rounded-xl object-cover cursor-pointer border-2 transition-all ${activeModalImage === url ? 'border-emerald-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`} />
                       ))}
                   </div>
                </div>

                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto">
                    <span className="text-xs font-bold text-slate-400 mb-1">{viewingProduct.group.info.parentSku || (viewingProduct.group.info.sku ? String(viewingProduct.group.info.sku).split('-')[0] : '')}</span>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight mb-2">{viewingProduct.name}</h2>
                    <div className="text-3xl font-black text-green-600 mb-6">{formatCurrency(viewingProduct.group.info.price || 0)}</div>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                        {viewingProduct.group.info.material && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Mat: {viewingProduct.group.info.material}</span>}
                        {viewingProduct.group.info.sole && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Sol: {viewingProduct.group.info.sole}</span>}
                        {viewingProduct.group.info.fastening && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Ajus: {viewingProduct.group.info.fastening}</span>}
                    </div>

                    <div className="mb-6"><p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Cores Disponíveis</p><div className="flex flex-wrap gap-2">{Array.from(new Set(viewingProduct.group.items.map((i: any) => i.color))).map(color => (<span key={String(color)} className="border border-slate-200 text-slate-700 bg-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm">{String(color)}</span>))}</div></div>
                    <div className="mb-6"><p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Tamanhos Disponíveis</p><div className="flex flex-wrap gap-2">{Array.from(new Set(viewingProduct.group.items.map((i: any) => i.size))).map(size => (<span key={String(size)} className="border border-slate-200 text-slate-700 bg-white w-12 h-12 flex items-center justify-center rounded-xl text-sm font-black shadow-sm">{String(size)}</span>))}</div></div>
                    {viewingProduct.group.info.description && (<div className="mb-6"><p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Descrição</p><p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{viewingProduct.group.info.description}</p></div>)}
                    
                    <div className="mt-auto pt-6 space-y-3">
                        <button onClick={() => { handleExportToUpSeller(viewingProduct.name, viewingProduct.group); setViewingProduct(null); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xl shadow-emerald-500/20 text-lg"><Download size={24}/> Baixar Planilha UpSeller</button>
                        {userProfile?.shopeeConnected && (<button onClick={() => { handlePublishToShopee(viewingProduct.name); setViewingProduct(null); }} className="w-full bg-[#ee4d2d] hover:bg-[#d74326] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"><Send size={20}/> Publicar direto na Shopee</button>)}
                    </div>
                </div>
             </div>
          </div>
      )}

      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6 text-center border-b border-slate-800">
          {brandLogo ? (<img src={brandLogo} className="h-10 mx-auto object-contain mb-2" alt="Logo"/>) : (<h1 className="text-2xl font-black flex items-center justify-center gap-2" style={{ color: brandColor }}><RefreshCw size={24} /> {brandName}</h1>)}
          <p className="text-xs text-slate-400 mt-1">Olá, {userProfile?.name?.split(' ')[0] || 'Revendedor'}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto hidden-scroll">
          <button onClick={() => setUserView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'dashboard' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'dashboard' ? {backgroundColor: brandColor} : {}}><Layers size={20} /> Visão Geral</button>
          <button onClick={() => setUserView('catalog')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'catalog' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'catalog' ? {backgroundColor: brandColor} : {}}><LayoutGrid size={20} /> Catálogo</button>
          <button onClick={() => {setUserView('academy'); setActiveLesson(null);}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'academy' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'academy' ? {backgroundColor: brandColor} : {}}><Play size={20} /> Como Funciona</button>
          <button onClick={() => setUserView('integrations')} className={`w-full flex items-center justify-between p-3 rounded-xl font-medium transition-all ${userView === 'integrations' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'integrations' ? {backgroundColor: brandColor} : {}}><div className="flex items-center gap-3"><Plug size={20} /> Integrações</div>{userProfile?.shopeeConnected && <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>}</button>
          <button onClick={() => setUserView('support')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'support' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'support' ? {backgroundColor: brandColor} : {}}><Ticket size={20} /> Suporte / Trocas</button>
        </nav>
        <div className="p-4 mx-4 mb-4 bg-slate-800 rounded-xl border border-slate-700 text-center"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-center gap-1"><Wallet size={12}/> Seu Crédito</p><p className="text-xl font-black text-green-400">{formatCurrency(userProfile?.creditBalance || 0)}</p></div>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2"><LogOut size={20} /> Sair</button></div>
      </aside>

      <main className={`flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50 text-slate-800`}>
        <header className={`bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100`}>
          <div className="flex items-center gap-3"><div className={`md:hidden p-2 rounded-lg text-white`} style={{backgroundColor: brandColor}}><RefreshCw size={20} /></div><div><h2 className={`text-xl font-bold hidden md:block text-slate-800`}>{userView === 'dashboard' ? 'Dashboard' : userView === 'catalog' ? 'Catálogo de Produtos' : userView === 'integrations' ? 'App & Integrações' : userView === 'academy' ? 'Treinamentos' : 'Central de Resoluções'}</h2></div></div>
          <button onClick={handleLogout} className={`md:hidden text-xs p-3 rounded-xl text-red-500 bg-slate-100`}><LogOut size={20} /></button>
        </header>

        <div className={`p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full pb-24 md:pb-6`}>
          
          {userView === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              {quickLinks.length > 0 && (
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickLinks.map((link: QuickLink) => (
                    <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition flex items-center gap-4" style={{ '--tw-border-opacity': '1' } as any} onMouseOver={(e) => e.currentTarget.style.borderColor = brandColor} onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}>
                      <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center transition" style={{ color: brandColor, backgroundColor: `${brandColor}15` }}>{renderDynamicIcon(link.icon, 28)}</div>
                      <div><h4 className="font-bold text-slate-800 text-lg transition-colors">{link.title}</h4><p className="text-sm text-slate-500 mt-1">{link.subtitle}</p></div>
                    </a>
                  ))}
                </section>
              )}
              <section className="space-y-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Megaphone className="text-orange-500"/> Mural de Avisos Importantes</h3>
                {notices.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center"><Bell size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-medium">Nenhum aviso no momento.</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {notices.map((notice: any) => (
                         <div onClick={() => setSelectedNotice(notice)} key={notice.id} className="bg-slate-200 hover:bg-slate-300 cursor-pointer rounded-2xl shadow-sm border border-slate-300 overflow-hidden relative transition-colors group">
                            {notice.type === 'banner' && notice.imageUrl && (<div className="w-full h-40 bg-slate-300"><img src={notice.imageUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>)}
                            <div className="p-5"><div className="flex items-center gap-2 mb-2">{notice.type === 'banner' ? <ImageIcon style={{color:brandColor}} size={18}/> : <Bell className="text-orange-600" size={18}/>}<h4 className="font-black text-lg text-slate-800 line-clamp-1">{notice.title}</h4></div>{notice.content && (<p className="text-slate-500 text-sm line-clamp-2 mt-1">{notice.content}</p>)}<div className="mt-4 flex items-center justify-between"><p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(notice.createdAt)}</p><span className="text-xs font-bold group-hover:underline flex items-center gap-1" style={{color: brandColor}}>Ver mais <MousePointerClick size={12}/></span></div></div>
                         </div>
                      ))}
                    </div>
                )}
              </section>
            </div>
          )}

          {userView === 'integrations' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center shrink-0"><Store className="text-orange-500" size={32}/></div>
                      <div><h2 className="text-xl font-black text-slate-800">Sincronização Shopee</h2><p className="text-slate-500 text-sm">Conecte sua loja e publique produtos do nosso catálogo com apenas um clique.</p></div>
                  </div>
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto">
                      <img src="https://logospng.org/download/shopee/logo-shopee-icon-1024.png" className="w-24 h-24 mx-auto mb-6 object-contain" alt="Shopee Logo" />
                      {userProfile?.shopeeConnected ? (
                          <div className="space-y-4"><div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm border border-green-200"><CheckCircle2 size={18}/> Loja Conectada</div><p className="text-slate-500 mb-6">Sincronizada. Use o botão "Publicar na Shopee" no catálogo.</p><button onClick={handleDisconnectShopee} className="text-sm font-bold text-red-500 hover:text-red-700 underline">Desconectar Loja</button></div>
                      ) : (
                          <div className="space-y-4"><h3 className="text-lg font-bold text-slate-800">Acelere suas vendas</h3><button onClick={handleConnectShopee} disabled={isShopeeSimulating} className="w-full md:w-auto px-8 py-4 bg-[#ee4d2d] hover:bg-[#d74326] text-white rounded-xl font-black shadow-lg shadow-orange-500/30 transition-transform hover:scale-105 flex items-center justify-center gap-3 mx-auto">{isShopeeSimulating ? <RefreshCw className="animate-spin" size={20} /> : <Plug size={20} />} Conectar Loja Shopee</button></div>
                      )}
                  </div>
              </div>
          )}

          {userView === 'catalog' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-6">
               <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                   <div className="relative w-full md:w-2/3"><Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" /><input type="text" placeholder="Buscar modelo, cor ou SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 text-lg" style={{'--tw-ring-color':brandColor} as any} /></div>
                   <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => setSelectedCatalogGroups(Object.keys(groupedProducts))} className="flex-1 md:flex-none bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><CheckSquare size={16}/> Selecionar Tudo</button>
                      {selectedCatalogGroups.length > 0 && <button onClick={() => setSelectedCatalogGroups([])} className="flex-1 md:flex-none bg-red-100 hover:bg-red-200 text-red-600 px-4 py-3 rounded-xl font-bold text-sm transition-colors">Limpar</button>}
                   </div>
               </div>
               
               <div>
                 {Object.keys(groupedProducts).length === 0 ? (<p className="text-center text-slate-400 py-10">Nenhum produto encontrado.</p>) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                         {Object.entries(groupedProducts).map(([name, group]: any) => {
                             const firstImage = group.info.image ? group.info.image.split(',')[0] : '';
                             const isSelected = selectedCatalogGroups.includes(name);
                             return (
                             <div key={name} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition duration-300 relative ${isSelected ? 'border-emerald-500' : 'border-slate-200'}`}>
                                 <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); toggleGroupSelection(name, e.target.checked); }} className="absolute top-3 left-3 z-10 w-6 h-6 accent-emerald-500 cursor-pointer shadow-sm rounded-lg" />
                                 <div onClick={() => { setViewingProduct({name, group}); setActiveModalImage(firstImage); }} className="aspect-square bg-slate-100 relative cursor-pointer overflow-hidden group-card">
                                     {firstImage ? (<img src={firstImage} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300 w-12 h-12" /></div>)}
                                     {group.info.image && group.info.image.split(',').length > 1 && <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-black px-2 py-1 rounded backdrop-blur-sm shadow-lg">+{group.info.image.split(',').length - 1} fotos</div>}
                                 </div>
                                 <div onClick={() => { setViewingProduct({name, group}); setActiveModalImage(firstImage); }} className="p-4 flex-1 cursor-pointer flex flex-col justify-between">
                                     <div><h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{String(name)}</h3></div>
                                     <div className="mt-3 flex items-center justify-between"><span className="text-lg font-black text-green-600">{formatCurrency(group.info.price || 0)}</span></div>
                                 </div>
                             </div>
                         )})}
                     </div>
                 )}
               </div>
            </div>
          )}

          {userView === 'academy' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{backgroundColor: `${brandColor}20`}}><GraduationCap style={{color: brandColor}} size={32} /></div>
                      <div className="flex-1 w-full text-center md:text-left">
                          <h3 className="font-black text-lg text-white mb-2">Seu Progresso na Jornada</h3>
                          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden relative"><div className="h-full transition-all duration-1000 ease-out" style={{ width: `${academyProgress}%`, backgroundColor: brandColor }}></div></div>
                          <p className="text-slate-400 text-xs mt-2 font-bold">{userProfile?.completedLessons?.length || 0} de {lessons.length} aulas concluídas ({academyProgress}%)</p>
                      </div>
                  </div>

                  {activeLesson ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                              <button onClick={() => setActiveLesson(null)} className="text-slate-400 hover:text-white flex items-center gap-2 font-bold text-sm bg-slate-800 px-4 py-2 rounded-lg w-fit transition-colors"><ChevronLeft size={16}/> Voltar</button>
                              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 w-full aspect-video">
                                  {getYoutubeId(activeLesson.youtubeUrl) ? (<iframe src={`https://www.youtube.com/embed/${getYoutubeId(activeLesson.youtubeUrl)}?autoplay=1&rel=0`} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen></iframe>) : (<div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900 font-bold">Vídeo Indisponível</div>)}
                              </div>
                              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                  <span className="font-black text-sm uppercase tracking-widest" style={{color: brandColor}}>{activeLesson.season || 'Módulo Geral'} - Ep {activeLesson.episode}</span>
                                  <h1 className="text-2xl md:text-3xl font-black text-white mt-1 mb-4">{activeLesson.title}</h1>
                                  <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{activeLesson.description}</p>
                                  {activeLesson.materialLinks && (
                                      <div className="mt-6 pt-6 border-t border-slate-800">
                                          <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Link2 size={18} style={{color: brandColor}}/> Materiais Complementares</h3>
                                          <a href={activeLesson.materialLinks} target="_blank" rel="noreferrer" className="inline-block bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl text-sm font-bold transition-colors" style={{color: brandColor}}>Acessar Links / Materiais</a>
                                      </div>
                                  )}
                              </div>
                          </div>
                          
                          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[70vh]">
                              <div className="p-4 border-b border-slate-800 bg-slate-800/50"><h3 className="font-black text-white">Conteúdo do Módulo</h3></div>
                              <div className="flex-1 overflow-y-auto hidden-scroll p-2 space-y-2">
                                  {lessons.filter(l => (l.season || 'Módulo Geral') === (activeLesson.season || 'Módulo Geral')).sort((a,b)=> (a.episode||0) - (b.episode||0)).map((ep) => {
                                      const isCompleted = userProfile?.completedLessons?.includes(ep.id);
                                      const isActive = activeLesson.id === ep.id;
                                      return (
                                          <div key={ep.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${isActive ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50 border border-transparent'}`}>
                                              <button onClick={(e) => { e.stopPropagation(); toggleLessonCompletion(ep.id); }} className="shrink-0 transition-colors" style={{color: isCompleted ? '#22c55e' : '#94a3b8'}}>
                                                  {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                              </button>
                                              <div onClick={() => setActiveLesson(ep)} className="flex-1 min-w-0">
                                                  <h4 className={`font-bold text-sm truncate ${isActive ? '' : 'text-slate-200'}`} style={isActive ? {color: brandColor} : {}}>{ep.episode}. {ep.title}</h4>
                                                  <span className="text-[10px] text-slate-500 font-bold uppercase">{isCompleted ? 'Concluído' : 'Pendente'}</span>
                                              </div>
                                              {isActive && <Play size={16} shrink-0 fill="currentColor" style={{color: brandColor}}/>}
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                      </div>
                  ) : (
                      <>
                          {lessons.length > 0 && (
                              <div className="relative w-full h-[300px] md:h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group">
                                  <img src={lessons[0].bannerUrl || 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?q=80&w=2070&auto=format&fit=crop'} loading="lazy" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Hero" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
                                  <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3">
                                      <div className="flex items-center gap-2 mb-2"><Film size={16} style={{color:brandColor}}/><span className="font-black text-xs uppercase tracking-widest" style={{color:brandColor}}>Comece por aqui</span></div>
                                      <h2 className="text-2xl md:text-5xl font-black text-white mb-2 leading-tight">{lessons[0].title}</h2>
                                      <p className="text-slate-300 text-xs md:text-sm line-clamp-2 mb-6 max-w-xl">{lessons[0].description}</p>
                                      <button onClick={() => setActiveLesson(lessons[0])} className="bg-white text-black hover:bg-slate-200 px-6 py-3 rounded-lg font-black flex items-center gap-2 transition-transform hover:scale-105 shadow-xl"><Play fill="black" size={20} /> Assistir Agora</button>
                                  </div>
                              </div>
                          )}

                          {lessons.length === 0 ? (
                              <div className="text-center py-20 text-slate-500 font-bold">Nenhuma aula disponível no momento.</div>
                          ) : (
                              <div className="space-y-10">
                                  {academySeasons.map((season, idx) => (
                                      <div key={idx}>
                                          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-l-4 pl-3" style={{borderColor:brandColor}}>{season.name}</h3>
                                          <div className="flex overflow-x-auto gap-4 pb-4 hidden-scroll snap-x">
                                              {season.episodes.map(ep => {
                                                  const isCompleted = userProfile?.completedLessons?.includes(ep.id);
                                                  return (
                                                  <div key={ep.id} onClick={() => setActiveLesson(ep)} className="snap-start shrink-0 w-[260px] md:w-[320px] cursor-pointer group">
                                                      <div className="w-full aspect-video bg-slate-800 rounded-xl overflow-hidden relative shadow-lg border-2 border-slate-800 group-hover:border-slate-500 transition-colors">
                                                          {ep.bannerUrl ? (<img src={ep.bannerUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />) : (<div className="w-full h-full flex items-center justify-center text-slate-600"><Film size={40}/></div>)}
                                                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                              <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 duration-300 shadow-xl backdrop-blur-sm" style={{backgroundColor: `${brandColor}E6`}}>
                                                                  <Play fill="white" size={24} className="ml-1"/>
                                                              </div>
                                                          </div>
                                                          <span className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg backdrop-blur">Ep {ep.episode}</span>
                                                          {isCompleted && <span className="absolute top-2 right-2 text-green-500 bg-black/80 rounded-full"><CheckCircle2 size={16}/></span>}
                                                      </div>
                                                      <div className="mt-3 pr-2">
                                                          <h4 className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors line-clamp-1">{ep.title}</h4>
                                                      </div>
                                                  </div>
                                              )})}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </>
                  )}
              </div>
          )}

          {userView === 'support' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-slate-50">
                          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Ticket style={{color:brandColor}}/> Abrir Chamado de Troca/Devolução</h3>
                          <p className="text-sm text-slate-500 mt-1">Siga o passo a passo abaixo para relatar o problema.</p>
                      </div>
                      <form onSubmit={handleOpenTicket} className="p-6 space-y-6">
                          
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">1. O que você deseja fazer?</label>
                              <div className="flex gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 p-4 rounded-xl flex-1 transition-colors">
                                      <input type="radio" name="ticketType" checked={ticketType === 'troca'} onChange={() => {setTicketType('troca'); setTicketReason(''); setTicketDesiredProductId(''); setTicketDesiredGroup('');}} className="w-5 h-5" style={{accentColor: brandColor}} />
                                      <div><span className="font-bold text-slate-800 block">Troca Normal</span><span className="text-[10px] text-slate-500 font-medium">Trocar uma peça por outra</span></div>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 p-4 rounded-xl flex-1 transition-colors">
                                      <input type="radio" name="ticketType" checked={ticketType === 'devolucao'} onChange={() => {setTicketType('devolucao'); setTicketDesiredProductId(''); setTicketDesiredGroup('');}} className="accent-red-600 w-5 h-5" />
                                      <div><span className="font-bold text-slate-800 text-red-600 block">Devolução (Defeito)</span><span className="text-[10px] text-slate-500 font-medium">Devolver e gerar crédito</span></div>
                                  </label>
                              </div>
                              {ticketType === 'devolucao' && (
                                  <div className="mt-3 bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm font-medium animate-in zoom-in">
                                      <strong>ATENÇÃO:</strong> Aceitamos devolução <strong>APENAS em casos de defeito de fabricação</strong>. Solicitações por outros motivos serão recusadas. O valor será creditado na sua carteira.
                                  </div>
                              )}
                          </div>

                          <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
                              <label className="text-xs font-bold text-slate-500 uppercase block">2. Qual modelo você comprou e quer devolver?*</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <select value={ticketReturnGroup} onChange={(e) => {setTicketReturnGroup(e.target.value); setTicketReturnProductId('');}} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-800 outline-none font-bold text-sm focus:ring-2 shadow-sm" style={{'--tw-ring-color':brandColor} as any}>
                                          <option value="">1º - Escolha o Modelo...</option>
                                          {Object.keys(groupedProducts).map(k => <option key={k} value={k}>{k}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <select disabled={!ticketReturnGroup} value={ticketReturnProductId} onChange={(e) => setTicketReturnProductId(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-800 outline-none font-medium text-sm focus:ring-2 shadow-sm disabled:opacity-50" style={{'--tw-ring-color':brandColor} as any}>
                                          <option value="">2º - Escolha Cor e Tamanho...</option>
                                          {ticketReturnGroup && groupedProducts[ticketReturnGroup]?.items.map((p: Product) => (
                                              <option key={p.id} value={p.id}>Cor: {p.color} | Tam: {p.size} (R$ {formatCurrency(p.price)})</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                          </div>

                          {ticketType === 'troca' && (
                              <div className="p-5 rounded-xl space-y-4 animate-in slide-in-from-top-2" style={{backgroundColor: `${brandColor}10`, borderColor: `${brandColor}30`, borderWidth: '1px'}}>
                                  <div className="flex items-center gap-2 font-bold mb-1" style={{color: brandColor}}><RefreshCw size={18}/> <span>3. Por qual peça deseja trocar?*</span></div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <select value={ticketDesiredGroup} onChange={(e) => {setTicketDesiredGroup(e.target.value); setTicketDesiredProductId('');}} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-800 outline-none font-bold text-sm focus:ring-2 shadow-sm" style={{'--tw-ring-color':brandColor} as any}>
                                              <option value="">1º - Escolha o Novo Modelo...</option>
                                              {Object.keys(groupedProducts).map(k => <option key={k} value={k}>{k}</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <select disabled={!ticketDesiredGroup} value={ticketDesiredProductId} onChange={(e) => setTicketDesiredProductId(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-800 outline-none font-medium text-sm focus:ring-2 shadow-sm disabled:opacity-50" style={{'--tw-ring-color':brandColor} as any}>
                                              <option value="">2º - Escolha Cor e Tamanho...</option>
                                              {ticketDesiredGroup && groupedProducts[ticketDesiredGroup]?.items.map((p: Product) => {
                                                  const isOutOfStock = p.quantity <= 0;
                                                  return (
                                                      <option key={p.id} value={p.id} disabled={isOutOfStock}>Cor: {p.color} | Tam: {p.size} {isOutOfStock ? '(ESGOTADO)' : ''}</option>
                                                  );
                                              })}
                                          </select>
                                          <p className="text-[10px] mt-2 font-medium" style={{color: brandColor}}>*Mostramos apenas variações em estoque.</p>
                                      </div>
                                  </div>
                              </div>
                          )}
                          
                          {ticketType === 'devolucao' && (
                              <div className="animate-in slide-in-from-top-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">3. Motivo da Devolução (Qual o defeito?)*</label>
                                  <textarea value={ticketReason} onChange={e => setTicketReason(e.target.value)} required rows={3} placeholder="Explique qual defeito o produto apresentou..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none text-sm focus:ring-2" style={{'--tw-ring-color':brandColor} as any}></textarea>
                              </div>
                          )}

                          <div className="pt-4 border-t border-slate-100">
                              <button type="submit" disabled={isSavingBatch || !ticketReturnProductId || (ticketType === 'troca' && !ticketDesiredProductId)} className={`w-full md:w-auto px-8 py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg transition-transform ${isSavingBatch || !ticketReturnProductId || (ticketType === 'troca' && !ticketDesiredProductId) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'text-white hover:scale-[1.02]'}`} style={(!isSavingBatch && ticketReturnProductId && (ticketType !== 'troca' || ticketDesiredProductId)) ? {backgroundColor: brandColor} : {}}>
                                  {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Enviar Solicitação
                              </button>
                          </div>
                      </form>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800 text-lg">Meu Histórico de Chamados</h3></div>
                      <div className="p-4 space-y-3">
                          {myTickets.length === 0 ? (<p className="text-slate-400 text-center py-6">Você não possui chamados abertos.</p>) : myTickets.map((ticket: any) => (
                              <div key={ticket.id} className="border border-slate-200 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden">
                                  <div className={`absolute top-0 left-0 w-1.5 h-full`} style={{backgroundColor: ticket.type === 'devolucao' ? '#ef4444' : brandColor}}></div>
                                  <div className="pl-3 flex flex-col gap-3">
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${ticket.type === 'devolucao' ? 'bg-red-100 text-red-700' : 'text-white'}`} style={ticket.type === 'troca' ? {backgroundColor: brandColor} : {}}>{ticket.type}</span><span className="text-xs text-slate-500 font-bold">{formatDate(ticket.createdAt)}</span></div>
                                          </div>
                                          <div>
                                              {ticket.status === 'pendente' && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-bold uppercase border border-yellow-200">Em Análise</span>}
                                              {ticket.status === 'aceito' && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold uppercase border border-emerald-200">Troca Aceita</span>}
                                              {ticket.status === 'aguardando_devolucao' && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-bold uppercase border border-orange-200 text-center block leading-tight">Aguardando<br/>Entrega</span>}
                                              {ticket.status === 'recusado' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold uppercase border border-red-200">Recusado</span>}
                                              {ticket.status === 'concluido' && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold uppercase border border-blue-200">Concluído</span>}
                                          </div>
                                      </div>
                                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm"><p className="font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.productInfo}</p></div>
                                      {ticket.type === 'devolucao' && ticket.reason && (<p className="text-sm text-slate-600"><strong>Motivo:</strong> {ticket.reason}</p>)}
                                      {ticket.adminNote && (<div className="bg-slate-800 text-white p-3 rounded-lg text-sm flex gap-2"><MessageCircle size={16} className="shrink-0 text-blue-400" /><div><strong className="text-blue-400 block mb-0.5">Resposta do Fornecedor:</strong> {ticket.adminNote}</div></div>)}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

        </div>
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <button onClick={() => setUserView('dashboard')} className={`flex flex-col items-center gap-1 ${userView === 'dashboard' ? '' : 'text-slate-400'}`} style={userView === 'dashboard' ? {color: brandColor} : {}}><Layers size={20} /><span className="text-[10px] font-bold">Início</span></button>
        <button onClick={() => setUserView('catalog')} className={`flex flex-col items-center gap-1 ${userView === 'catalog' ? '' : 'text-slate-400'}`} style={userView === 'catalog' ? {color: brandColor} : {}}><LayoutGrid size={20} /><span className="text-[10px] font-bold">Catálogo</span></button>
        <button onClick={() => setUserView('integrations')} className={`flex flex-col items-center gap-1 relative ${userView === 'integrations' ? '' : 'text-slate-400'}`} style={userView === 'integrations' ? {color: brandColor} : {}}>
           <Plug size={20} />
           {userProfile?.shopeeConnected && <span className="absolute top-0 right-3 w-2 h-2 bg-green-500 rounded-full"></span>}
           <span className="text-[10px] font-bold">Conectar</span>
        </button>
        <button onClick={() => setUserView('support')} className={`flex flex-col items-center gap-1 ${userView === 'support' ? '' : 'text-slate-400'}`} style={userView === 'support' ? {color: brandColor} : {}}><Ticket size={20} /><span className="text-[10px] font-bold">Trocas</span></button>
      </nav>
    </div>
  );
}