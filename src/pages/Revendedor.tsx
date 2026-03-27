import React, { useContext } from 'react';
import { Package, Plus, ClipboardList, Users, Ticket, GraduationCap, Megaphone, Link2, Store, Search, Pencil, ChevronUp, ChevronDown, ScanBarcode, Zap, BrainCircuit, AlertTriangle, TrendingUp, TrendingDown, Clock, Check, X, Printer, Save, RefreshCw, Trash2, Tag, ChevronLeft, LogOut, ExternalLink, MessageCircle, Wallet, Download, Film, DollarSign, Image as ImageIcon, Play, Layers, Box, CheckSquare, Plug, Send, CheckCircle2, Circle, Bell, MousePointerClick, Video, Globe, ShoppingBag, FileText, Smartphone, LayoutGrid, Sun, Moon } from 'lucide-react';
import { AppContext, formatCurrency, formatDate, getYoutubeId } from '../AppContext';
import { Product, QuickLink } from '../types';

const renderDynamicIcon = (iconName: string, size = 24) => {
  switch (iconName) { case 'MessageCircle': return <MessageCircle size={size}/>; case 'ImageIcon': return <ImageIcon size={size}/>; case 'Video': return <Video size={size}/>; case 'Globe': return <Globe size={size}/>; case 'ShoppingBag': return <ShoppingBag size={size}/>; case 'FileText': return <FileText size={size}/>; case 'Smartphone': return <Smartphone size={size}/>; default: return <Link2 size={size}/>; }
};

export default function Revendedor() {
  const ctx = useContext(AppContext);
  const { userProfile, lessons, selectedCatalogGroups, userView, handleBatchExportToUpSeller, viewingProduct, setViewingProduct, activeModalImage, setActiveModalImage, handleExportToUpSeller, brandLogo, brandName, brandColor, setUserView, handleLogout, quickLinks, notices, selectedNotice, setSelectedNotice, searchTerm, setSearchTerm, groupedProducts, toggleGroupSelection, activeLesson, setActiveLesson, academySeasons, toggleLessonCompletion, ticketType, setTicketType, ticketReturnGroup, setTicketReturnGroup, ticketReturnProductId, setTicketReturnProductId, ticketDesiredGroup, setTicketDesiredGroup, ticketDesiredProductId, setTicketDesiredProductId, ticketReason, setTicketReason, handleOpenTicket, isSavingBatch, myTickets, theme, toggleTheme } = ctx;
  const academyProgress = Math.round(((userProfile?.completedLessons?.length || 0) / (lessons.length || 1)) * 100);

  // VARIÁVEIS DE TEMA DINÂMICAS
  const isDark = theme === 'dark';
  const bgPage = isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800';
  const bgCard = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const bgCardHover = isDark ? 'hover:border-slate-700 hover:shadow-lg' : 'hover:shadow-md';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const bgInput = isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-100 border-transparent text-slate-800 placeholder:text-slate-400';
  const bgHeader = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const bgSidebar = isDark ? 'bg-slate-950 border-slate-900' : 'bg-slate-900 border-slate-800'; // Sidebar sempre escura, mas no Dark fica mais profunda

  return (
    <div className={`min-h-screen flex font-sans relative transition-colors duration-300 ${bgPage}`}>
      
      {/* Botão de Lote */}
      {selectedCatalogGroups.length > 0 && userView === 'catalog' && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white pl-6 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-10 border border-emerald-500"><span className="font-bold text-sm">{selectedCatalogGroups.length} selecionados</span><button onClick={handleBatchExportToUpSeller} className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-full font-black flex items-center gap-2 text-sm shadow-lg transition-colors"><Download size={16} /> Baixar Lote (UpSeller)</button></div>
      )}

      {/* Modal Produto */}
      {viewingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in" onClick={() => setViewingProduct(null)}>
             <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row border ${isDark ? 'border-slate-800' : 'border-transparent'}`} onClick={e => e.stopPropagation()}>
                <button onClick={() => setViewingProduct(null)} className={`absolute top-4 right-4 ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-black/50 text-white hover:bg-black'} p-2 rounded-full backdrop-blur-md transition-colors z-20`}><X size={20}/></button>
                <div className={`w-full md:w-1/2 p-6 flex flex-col ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                    <div className={`aspect-square rounded-2xl border overflow-hidden mb-4 flex items-center justify-center shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        {activeModalImage ? <img src={activeModalImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-24 h-24" />}
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 hidden-scroll">
                        {viewingProduct.group.info.image && viewingProduct.group.info.image.split(',').map((url: string, i: number) => (<img key={i} src={url} onClick={() => setActiveModalImage(url)} className={`w-16 h-16 rounded-xl object-cover cursor-pointer border-2 transition-all ${activeModalImage === url ? 'border-emerald-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`} />))}
                    </div>
                </div>
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto">
                    <span className="text-xs font-bold text-slate-400 mb-1">{viewingProduct.group.info.parentSku || (viewingProduct.group.info.sku ? String(viewingProduct.group.info.sku).split('-')[0] : '')}</span>
                    <h2 className={`text-2xl md:text-3xl font-black leading-tight mb-2 ${textTitle}`}>{viewingProduct.name}</h2>
                    <div className="text-3xl font-black text-green-600 mb-6">{formatCurrency(viewingProduct.group.info.price || 0)}</div>
                    <div className="flex flex-wrap gap-2 mb-6">{viewingProduct.group.info.material && <span className={`${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'} text-[10px] font-bold px-3 py-1 rounded-full uppercase`}>Mat: {viewingProduct.group.info.material}</span>}{viewingProduct.group.info.sole && <span className={`${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'} text-[10px] font-bold px-3 py-1 rounded-full uppercase`}>Sol: {viewingProduct.group.info.sole}</span>}{viewingProduct.group.info.fastening && <span className={`${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'} text-[10px] font-bold px-3 py-1 rounded-full uppercase`}>Ajus: {viewingProduct.group.info.fastening}</span>}</div>
                    <div className="mb-6"><p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Cores Disponíveis</p><div className="flex flex-wrap gap-2">{Array.from(new Set(viewingProduct.group.items.map((i: any) => i.color))).map(color => (<span key={String(color)} className={`border px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>{String(color)}</span>))}</div></div>
                    <div className="mb-6"><p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Tamanhos Disponíveis</p><div className="flex flex-wrap gap-2">{Array.from(new Set(viewingProduct.group.items.map((i: any) => i.size))).map(size => (<span key={String(size)} className={`border w-12 h-12 flex items-center justify-center rounded-xl text-sm font-black shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>{String(size)}</span>))}</div></div>
                    {viewingProduct.group.info.description && (<div className="mb-6"><p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Descrição</p><p className={`text-sm leading-relaxed p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{viewingProduct.group.info.description}</p></div>)}
                    <div className="mt-auto pt-6 space-y-3">
                        {viewingProduct.group.info.driveLink && (<a href={viewingProduct.group.info.driveLink} target="_blank" rel="noreferrer" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xl shadow-blue-500/20 text-lg"><Download size={24}/> Baixar Mídias (Drive)</a>)}
                        <button onClick={() => { handleExportToUpSeller(viewingProduct.name, viewingProduct.group); setViewingProduct(null); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xl shadow-emerald-500/20 text-lg"><Download size={24}/> Baixar Planilha UpSeller</button>
                    </div>
                </div>
             </div>
          </div>
      )}

      {/* Menu Lateral Desktop */}
      <aside className={`w-64 flex-col hidden md:flex h-screen sticky top-0 transition-colors border-r ${bgSidebar}`}>
        <div className={`p-6 text-center border-b ${isDark ? 'border-slate-800' : 'border-slate-800'}`}>{brandLogo ? (<img src={brandLogo} className="h-10 mx-auto object-contain mb-2" alt="Logo"/>) : (<h1 className="text-2xl font-black flex items-center justify-center gap-2" style={{ color: brandColor }}><RefreshCw size={24} /> {brandName}</h1>)}<p className="text-xs text-slate-400 mt-1">Olá, {userProfile?.name?.split(' ')[0] || 'Revendedor'}</p></div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto hidden-scroll">
          <button onClick={() => setUserView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'dashboard' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'dashboard' ? {backgroundColor: brandColor} : {}}><Layers size={20} /> Visão Geral</button>
          <button onClick={() => setUserView('catalog')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'catalog' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'catalog' ? {backgroundColor: brandColor} : {}}><LayoutGrid size={20} /> Catálogo</button>
          <button onClick={() => {setUserView('academy'); setActiveLesson(null);}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'academy' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'academy' ? {backgroundColor: brandColor} : {}}><Play size={20} /> Como Funciona</button>
          <button onClick={() => setUserView('support')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'support' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'support' ? {backgroundColor: brandColor} : {}}><Ticket size={20} /> Suporte / Trocas</button>
        </nav>
        <div className={`p-4 mx-4 mb-4 rounded-xl border text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-800 border-slate-700'}`}><p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-center gap-1"><Wallet size={12}/> Seu Crédito</p><p className="text-xl font-black text-green-400">{formatCurrency(userProfile?.creditBalance || 0)}</p></div>
        <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-800'}`}><button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2"><LogOut size={20} /> Sair</button></div>
      </aside>

      <main className={`flex-1 flex flex-col h-screen overflow-y-auto transition-colors`}>
        <header className={`shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b transition-colors ${bgHeader}`}>
            <div className="flex items-center gap-3">
                <div className="md:hidden p-2 rounded-lg text-white" style={{backgroundColor: brandColor}}><RefreshCw size={20} /></div>
                <div><h2 className={`text-xl font-bold hidden md:block ${textTitle}`}>{userView === 'dashboard' ? 'Dashboard' : userView === 'catalog' ? 'Catálogo de Produtos' : userView === 'academy' ? 'Treinamentos' : 'Central de Resoluções'}</h2></div>
            </div>
            
            <div className="flex items-center gap-2">
                {/* NOVO: BOTÃO DE TEMA */}
                <button onClick={toggleTheme} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {isDark ? <Sun size={20}/> : <Moon size={20}/>}
                </button>
                <button onClick={handleLogout} className={`md:hidden text-xs p-3 rounded-xl text-red-500 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}><LogOut size={20} /></button>
            </div>
        </header>

        <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full pb-24 md:pb-6">
          
          {userView === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              {quickLinks.length > 0 && (
                  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {quickLinks.map((link: QuickLink) => (
                          <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className={`group p-6 rounded-2xl shadow-sm border transition-all flex items-center gap-4 ${bgCard} ${bgCardHover}`}>
                              <div className="w-14 h-14 rounded-xl flex items-center justify-center transition" style={{ color: brandColor, backgroundColor: `${brandColor}15` }}>{renderDynamicIcon(link.icon, 28)}</div>
                              <div><h4 className={`font-bold text-lg transition-colors ${textTitle}`}>{link.title}</h4><p className={`text-sm mt-1 ${textSub}`}>{link.subtitle}</p></div>
                          </a>
                      ))}
                  </section>
              )}
              <section className="space-y-4">
                <h3 className={`text-xl font-black flex items-center gap-2 ${textTitle}`}><Megaphone className="text-orange-500"/> Mural de Avisos</h3>
                {notices.length === 0 ? (
                    <div className={`rounded-2xl shadow-sm border p-10 text-center ${bgCard}`}><Bell size={48} className="mx-auto text-slate-400 mb-4" /><p className={textSub}>Nenhum aviso no momento.</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {notices.map((notice: any) => (
                         <div onClick={() => setSelectedNotice(notice)} key={notice.id} className={`cursor-pointer rounded-2xl shadow-sm border overflow-hidden relative transition-colors group ${bgCard} ${bgCardHover}`}>
                            {notice.type === 'banner' && notice.imageUrl && (<div className="w-full h-40 bg-slate-300"><img src={notice.imageUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>)}
                            <div className="p-5"><div className="flex items-center gap-2 mb-2">{notice.type === 'banner' ? <ImageIcon style={{color:brandColor}} size={18}/> : <Bell className="text-orange-600" size={18}/>}<h4 className={`font-black text-lg line-clamp-1 ${textTitle}`}>{notice.title}</h4></div>{notice.content && (<p className={`text-sm line-clamp-2 mt-1 ${textSub}`}>{notice.content}</p>)}<div className="mt-4 flex items-center justify-between"><p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(notice.createdAt)}</p><span className="text-xs font-bold group-hover:underline flex items-center gap-1" style={{color: brandColor}}>Ver mais <MousePointerClick size={12}/></span></div></div>
                         </div>
                      ))}
                    </div>
                )}
              </section>
            </div>
          )}

          {userView === 'catalog' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-6">
               <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                   <div className="relative w-full md:w-2/3"><Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" /><input type="text" placeholder="Buscar modelo, cor ou SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full pl-12 pr-4 py-4 rounded-2xl shadow-sm focus:outline-none focus:ring-2 text-lg transition-colors border ${bgInput}`} style={{'--tw-ring-color':brandColor} as any} /></div>
                   <div className="flex gap-2 w-full md:w-auto"><button onClick={() => setSelectedCatalogGroups(Object.keys(groupedProducts))} className={`flex-1 md:flex-none px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}><CheckSquare size={16}/> Selecionar Tudo</button>{selectedCatalogGroups.length > 0 && <button onClick={() => setSelectedCatalogGroups([])} className="flex-1 md:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-3 rounded-xl font-bold text-sm transition-colors">Limpar</button>}</div>
               </div>
               <div>
                 {Object.keys(groupedProducts).length === 0 ? (<p className="text-center text-slate-500 py-10">Nenhum produto encontrado.</p>) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                         {Object.entries(groupedProducts).map(([name, group]: any) => {
                             const firstImage = group.info.image ? group.info.image.split(',')[0] : ''; const isSelected = selectedCatalogGroups.includes(name);
                             return (
                             <div key={name} className={`rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition duration-300 relative ${isSelected ? 'border-emerald-500' : (isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}`}>
                                 <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); toggleGroupSelection(name, e.target.checked); }} className="absolute top-3 left-3 z-10 w-6 h-6 accent-emerald-500 cursor-pointer shadow-sm rounded-lg" />
                                 <div onClick={() => { setViewingProduct({name, group}); setActiveModalImage(firstImage); }} className={`aspect-square relative cursor-pointer overflow-hidden group-card ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>{firstImage ? (<img src={firstImage} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-500 w-12 h-12" /></div>)}{group.info.image && group.info.image.split(',').length > 1 && <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-black px-2 py-1 rounded backdrop-blur-sm shadow-lg">+{group.info.image.split(',').length - 1} fotos</div>}</div>
                                 <div onClick={() => { setViewingProduct({name, group}); setActiveModalImage(firstImage); }} className="p-4 flex-1 cursor-pointer flex flex-col justify-between"><div><h3 className={`font-bold text-sm leading-tight line-clamp-2 mb-1 ${textTitle}`}>{String(name)}</h3></div><div className="mt-3 flex items-center justify-between"><span className="text-lg font-black text-green-500">{formatCurrency(group.info.price || 0)}</span></div></div>
                             </div>
                         )})}
                     </div>
                 )}
               </div>
            </div>
          )}

          {userView === 'academy' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className={`rounded-2xl border p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl ${bgCard}`}><div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{backgroundColor: `${brandColor}20`}}><GraduationCap style={{color: brandColor}} size={32} /></div><div className="flex-1 w-full text-center md:text-left"><h3 className={`font-black text-lg mb-2 ${textTitle}`}>Seu Progresso na Jornada</h3><div className={`w-full rounded-full h-4 overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-slate-200'}`}><div className="h-full transition-all duration-1000 ease-out" style={{ width: `${academyProgress}%`, backgroundColor: brandColor }}></div></div><p className={`text-xs mt-2 font-bold ${textSub}`}>{userProfile?.completedLessons?.length || 0} de {lessons.length} aulas concluídas ({academyProgress}%)</p></div></div>
                  {activeLesson ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                              <button onClick={() => setActiveLesson(null)} className={`font-bold text-sm px-4 py-2 rounded-lg w-fit transition-colors flex items-center gap-2 ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-black'}`}><ChevronLeft size={16}/> Voltar</button>
                              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 w-full aspect-video">{getYoutubeId(activeLesson.youtubeUrl) ? (<iframe src={`https://www.youtube.com/embed/${getYoutubeId(activeLesson.youtubeUrl)}?autoplay=1&rel=0`} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen></iframe>) : (<div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900 font-bold">Vídeo Indisponível</div>)}</div>
                              <div className={`p-6 rounded-2xl border shadow-xl ${bgCard}`}><span className="font-black text-sm uppercase tracking-widest" style={{color: brandColor}}>{activeLesson.season || 'Módulo Geral'} - Ep {activeLesson.episode}</span><h1 className={`text-2xl md:text-3xl font-black mt-1 mb-4 ${textTitle}`}>{activeLesson.title}</h1><p className={`text-sm leading-relaxed whitespace-pre-wrap ${textSub}`}>{activeLesson.description}</p>{activeLesson.materialLinks && (<div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}><h3 className={`font-bold mb-3 flex items-center gap-2 ${textTitle}`}><Link2 size={18} style={{color: brandColor}}/> Materiais Complementares</h3><a href={activeLesson.materialLinks} target="_blank" rel="noreferrer" className={`inline-block px-4 py-3 rounded-xl text-sm font-bold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>Acessar Links / Materiais</a></div>)}</div>
                          </div>
                          <div className={`lg:col-span-1 border rounded-2xl overflow-hidden flex flex-col h-[70vh] ${bgCard}`}>
                              <div className={`p-4 border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}><h3 className={`font-black ${textTitle}`}>Conteúdo do Módulo</h3></div>
                              <div className="flex-1 overflow-y-auto hidden-scroll p-2 space-y-2">
                                  {lessons.filter(l => (l.season || 'Módulo Geral') === (activeLesson.season || 'Módulo Geral')).sort((a,b)=> (a.episode||0) - (b.episode||0)).map((ep) => {
                                      const isCompleted = userProfile?.completedLessons?.includes(ep.id); const isActive = activeLesson.id === ep.id;
                                      return ( <div key={ep.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer border ${isActive ? (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200') : `border-transparent ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'}`}`}><button onClick={(e) => { e.stopPropagation(); toggleLessonCompletion(ep.id); }} className="shrink-0 transition-colors" style={{color: isCompleted ? '#22c55e' : (isDark ? '#475569' : '#cbd5e1')}}>{isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}</button><div onClick={() => setActiveLesson(ep)} className="flex-1 min-w-0"><h4 className={`font-bold text-sm truncate ${isActive ? (isDark ? 'text-white' : 'text-black') : textSub}`} style={isActive ? {color: brandColor} : {}}>{ep.episode}. {ep.title}</h4><span className="text-[10px] text-slate-500 font-bold uppercase">{isCompleted ? 'Concluído' : 'Pendente'}</span></div>{isActive && <Play size={16} shrink-0 fill="currentColor" style={{color: brandColor}}/>}</div> )
                                  })}
                              </div>
                          </div>
                      </div>
                  ) : (
                      <>
                          {lessons.length > 0 && (<div className="relative w-full h-[300px] md:h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group"><img src={lessons[0].bannerUrl || 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?q=80&w=2070&auto=format&fit=crop'} loading="lazy" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Hero" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div><div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3"><div className="flex items-center gap-2 mb-2"><Film size={16} style={{color:brandColor}}/><span className="font-black text-xs uppercase tracking-widest" style={{color:brandColor}}>Comece por aqui</span></div><h2 className="text-2xl md:text-5xl font-black text-white mb-2 leading-tight">{lessons[0].title}</h2><p className="text-slate-300 text-xs md:text-sm line-clamp-2 mb-6 max-w-xl">{lessons[0].description}</p><button onClick={() => setActiveLesson(lessons[0])} className="bg-white text-black hover:bg-slate-200 px-6 py-3 rounded-lg font-black flex items-center gap-2 transition-transform hover:scale-105 shadow-xl"><Play fill="black" size={20} /> Assistir Agora</button></div></div>)}
                          {lessons.length === 0 ? (<div className="text-center py-20 text-slate-500 font-bold">Nenhuma aula disponível no momento.</div>) : (
                              <div className="space-y-10">
                                  {academySeasons.map((season, idx) => (
                                      <div key={idx}><h3 className={`text-xl font-bold mb-4 flex items-center gap-2 border-l-4 pl-3 ${textTitle}`} style={{borderColor:brandColor}}>{season.name}</h3><div className="flex overflow-x-auto gap-4 pb-4 hidden-scroll snap-x">
                                              {season.episodes.map(ep => {
                                                  const isCompleted = userProfile?.completedLessons?.includes(ep.id);
                                                  return ( <div key={ep.id} onClick={() => setActiveLesson(ep)} className="snap-start shrink-0 w-[260px] md:w-[320px] cursor-pointer group"><div className={`w-full aspect-video rounded-xl overflow-hidden relative shadow-lg border-2 transition-colors ${isDark ? 'bg-slate-800 border-slate-800 group-hover:border-slate-500' : 'bg-slate-200 border-slate-200 group-hover:border-slate-400'}`}>{ep.bannerUrl ? (<img src={ep.bannerUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />) : (<div className="w-full h-full flex items-center justify-center text-slate-500"><Film size={40}/></div>)}<div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center"><div className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 duration-300 shadow-xl backdrop-blur-sm" style={{backgroundColor: `${brandColor}E6`}}><Play fill="white" size={24} className="ml-1"/></div></div><span className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg backdrop-blur">Ep {ep.episode}</span>{isCompleted && <span className="absolute top-2 right-2 text-green-500 bg-black/80 rounded-full"><CheckCircle2 size={16}/></span>}</div><div className="mt-3 pr-2"><h4 className={`font-bold text-sm transition-colors line-clamp-1 ${isDark ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-black'}`}>{ep.title}</h4></div></div> )
                                              })}
                                      </div></div>
                                  ))}
                              </div>
                          )}
                      </>
                  )}
              </div>
          )}

          {userView === 'support' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  <div className={`rounded-2xl border shadow-sm overflow-hidden ${bgCard}`}>
                      <div className={`p-6 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h3 className={`font-bold text-lg flex items-center gap-2 ${textTitle}`}><Ticket style={{color:brandColor}}/> Abrir Chamado</h3><p className={`text-sm mt-1 ${textSub}`}>Siga o passo a passo abaixo para relatar o problema.</p></div>
                      <form onSubmit={handleOpenTicket} className="p-6 space-y-6">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">1. O que você deseja fazer?</label>
                              <div className="flex gap-4">
                                  <label className={`flex items-center gap-2 cursor-pointer border p-4 rounded-xl flex-1 transition-colors ${isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}><input type="radio" name="ticketType" checked={ticketType === 'troca'} onChange={() => {setTicketType('troca'); setTicketReason(''); setTicketDesiredProductId(''); setTicketDesiredGroup('');}} className="w-5 h-5" style={{accentColor: brandColor}} /><div><span className={`font-bold block ${textTitle}`}>Troca Normal</span><span className={`text-[10px] font-medium ${textSub}`}>Trocar uma peça por outra</span></div></label>
                                  <label className={`flex items-center gap-2 cursor-pointer border p-4 rounded-xl flex-1 transition-colors ${isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}><input type="radio" name="ticketType" checked={ticketType === 'devolucao'} onChange={() => {setTicketType('devolucao'); setTicketDesiredProductId(''); setTicketDesiredGroup('');}} className="accent-red-600 w-5 h-5" /><div><span className="font-bold text-red-500 block">Devolução (Defeito)</span><span className={`text-[10px] font-medium ${textSub}`}>Devolver e gerar crédito</span></div></label>
                              </div>
                              {ticketType === 'devolucao' && (<div className="mt-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-sm font-medium animate-in zoom-in"><strong>ATENÇÃO:</strong> Aceitamos devolução <strong>APENAS em casos de defeito de fabricação</strong>. Solicitações por outros motivos serão recusadas. O valor será creditado na sua carteira.</div>)}
                          </div>
                          <div className={`border p-5 rounded-xl space-y-4 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <label className="text-xs font-bold text-slate-500 uppercase block">2. Qual modelo você comprou e quer devolver?*</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div><select value={ticketReturnGroup} onChange={(e) => {setTicketReturnGroup(e.target.value); setTicketReturnProductId('');}} className={`w-full rounded-xl p-4 outline-none font-bold text-sm focus:ring-2 shadow-sm border ${bgInput}`} style={{'--tw-ring-color':brandColor} as any}><option value="">1º - Escolha o Modelo...</option>{Object.keys(groupedProducts).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                                  <div><select disabled={!ticketReturnGroup} value={ticketReturnProductId} onChange={(e) => setTicketReturnProductId(e.target.value)} required className={`w-full rounded-xl p-4 outline-none font-medium text-sm focus:ring-2 shadow-sm disabled:opacity-50 border ${bgInput}`} style={{'--tw-ring-color':brandColor} as any}><option value="">2º - Escolha Cor e Tamanho...</option>{ticketReturnGroup && groupedProducts[ticketReturnGroup]?.items.map((p: Product) => (<option key={p.id} value={p.id}>Cor: {p.color} | Tam: {p.size} (R$ {formatCurrency(p.price)})</option>))}</select></div>
                              </div>
                          </div>
                          {ticketType === 'troca' && (
                              <div className="p-5 rounded-xl space-y-4 animate-in slide-in-from-top-2" style={{backgroundColor: `${brandColor}10`, borderColor: `${brandColor}30`, borderWidth: '1px'}}>
                                  <div className="flex items-center gap-2 font-bold mb-1" style={{color: brandColor}}><RefreshCw size={18}/> <span>3. Por qual peça deseja trocar?*</span></div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div><select value={ticketDesiredGroup} onChange={(e) => {setTicketDesiredGroup(e.target.value); setTicketDesiredProductId('');}} className={`w-full rounded-xl p-4 outline-none font-bold text-sm focus:ring-2 shadow-sm border ${bgInput}`} style={{'--tw-ring-color':brandColor} as any}><option value="">1º - Escolha o Novo Modelo...</option>{Object.keys(groupedProducts).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                                      <div><select disabled={!ticketDesiredGroup} value={ticketDesiredProductId} onChange={(e) => setTicketDesiredProductId(e.target.value)} required className={`w-full rounded-xl p-4 outline-none font-medium text-sm focus:ring-2 shadow-sm disabled:opacity-50 border ${bgInput}`} style={{'--tw-ring-color':brandColor} as any}><option value="">2º - Escolha Cor e Tamanho...</option>{ticketDesiredGroup && groupedProducts[ticketDesiredGroup]?.items.map((p: Product) => { const isOutOfStock = p.quantity <= 0; return (<option key={p.id} value={p.id} disabled={isOutOfStock}>Cor: {p.color} | Tam: {p.size} {isOutOfStock ? '(ESGOTADO)' : ''}</option>);})}</select><p className="text-[10px] mt-2 font-medium" style={{color: brandColor}}>*Mostramos apenas variações em estoque.</p></div>
                                  </div>
                              </div>
                          )}
                          {ticketType === 'devolucao' && (<div className="animate-in slide-in-from-top-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">3. Motivo da Devolução (Qual o defeito?)*</label><textarea value={ticketReason} onChange={e => setTicketReason(e.target.value)} required rows={3} placeholder="Explique qual defeito o produto apresentou..." className={`w-full rounded-xl p-4 outline-none text-sm focus:ring-2 border ${bgInput}`} style={{'--tw-ring-color':brandColor} as any}></textarea></div>)}
                          <div className={`pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}><button type="submit" disabled={isSavingBatch || !ticketReturnProductId || (ticketType === 'troca' && !ticketDesiredProductId)} className={`w-full md:w-auto px-8 py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg transition-transform ${isSavingBatch || !ticketReturnProductId || (ticketType === 'troca' && !ticketDesiredProductId) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'text-white hover:scale-[1.02]'}`} style={(!isSavingBatch && ticketReturnProductId && (ticketType !== 'troca' || ticketDesiredProductId)) ? {backgroundColor: brandColor} : {}}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Enviar Solicitação</button></div>
                      </form>
                  </div>
                  <div className={`rounded-2xl border shadow-sm overflow-hidden ${bgCard}`}>
                      <div className={`p-6 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}><h3 className={`font-bold text-lg ${textTitle}`}>Meu Histórico de Chamados</h3></div>
                      <div className="p-4 space-y-3">
                          {myTickets.length === 0 ? (<p className="text-slate-500 text-center py-6">Você não possui chamados abertos.</p>) : myTickets.map((ticket: any) => (
                              <div key={ticket.id} className={`border p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                                  <div className={`absolute top-0 left-0 w-1.5 h-full`} style={{backgroundColor: ticket.type === 'devolucao' ? '#ef4444' : brandColor}}></div>
                                  <div className="pl-3 flex flex-col gap-3">
                                      <div className="flex justify-between items-start"><div><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${ticket.type === 'devolucao' ? 'bg-red-500/10 text-red-500' : 'text-white'}`} style={ticket.type === 'troca' ? {backgroundColor: brandColor} : {}}>{ticket.type}</span><span className="text-xs text-slate-500 font-bold">{formatDate(ticket.createdAt)}</span></div></div><div>{ticket.status === 'pendente' && <span className="bg-yellow-500/10 text-yellow-500 text-xs px-2 py-1 rounded font-bold uppercase border border-yellow-500/20">Em Análise</span>}{ticket.status === 'aceito' && <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded font-bold uppercase border border-emerald-500/20">Troca Aceita</span>}{ticket.status === 'aguardando_devolucao' && <span className="bg-orange-500/10 text-orange-500 text-xs px-2 py-1 rounded font-bold uppercase border border-orange-500/20 text-center block leading-tight">Aguardando<br/>Entrega</span>}{ticket.status === 'recusado' && <span className="bg-red-500/10 text-red-500 text-xs px-2 py-1 rounded font-bold uppercase border border-red-500/20">Recusado</span>}{ticket.status === 'concluido' && <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded font-bold uppercase border border-blue-500/20">Concluído</span>}</div></div>
                                      <div className={`p-3 rounded-lg border text-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}><p className={`font-bold whitespace-pre-wrap leading-relaxed ${textTitle}`}>{ticket.productInfo}</p></div>
                                      {ticket.type === 'devolucao' && ticket.reason && (<p className={`text-sm ${textSub}`}><strong>Motivo:</strong> {ticket.reason}</p>)}
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
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around p-3 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={() => setUserView('dashboard')} className={`flex flex-col items-center gap-1 ${userView === 'dashboard' ? '' : textSub}`} style={userView === 'dashboard' ? {color: brandColor} : {}}><Layers size={20} /><span className="text-[10px] font-bold">Início</span></button>
        <button onClick={() => setUserView('catalog')} className={`flex flex-col items-center gap-1 ${userView === 'catalog' ? '' : textSub}`} style={userView === 'catalog' ? {color: brandColor} : {}}><LayoutGrid size={20} /><span className="text-[10px] font-bold">Catálogo</span></button>
        <button onClick={() => setUserView('support')} className={`flex flex-col items-center gap-1 ${userView === 'support' ? '' : textSub}`} style={userView === 'support' ? {color: brandColor} : {}}><Ticket size={20} /><span className="text-[10px] font-bold">Trocas</span></button>
      </nav>
    </div>
  );
}