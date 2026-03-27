import React, { useContext, useState } from 'react';
import { Package, Plus, ClipboardList, Users, Ticket, GraduationCap, Megaphone, Link2, Store, Search, Pencil, ChevronUp, ChevronDown, ScanBarcode, Scan, Zap, BrainCircuit, AlertTriangle, TrendingUp, TrendingDown, Clock, Check, X, Printer, Save, RefreshCw, Trash2, Tag, ChevronLeft, LogOut, ExternalLink, MessageCircle, Wallet, Download, Film, DollarSign, Image as ImageIcon, Layers, Box, Wand2, QrCode, Copy, Play } from 'lucide-react';
import { AppContext, formatCurrency, formatDate, parseImages, playSound, getYoutubeId } from '../AppContext';
import { Product, SupportTicket } from '../types';

export default function Fornecedor() {
  const ctx = useContext(AppContext);
  const { 
    currentTenant, adminView, setAdminView, handleLogout, adminStockStats, searchTerm, setSearchTerm, 
    adminStockFilter, setAdminStockFilter, filteredAdminList, setAdminViewingGroupName, adminViewingGroupName, 
    groupedAdminProducts, handleUpdateQuantity, openGroupEdit, editingGroup, setEditingGroup, handleDeleteGroup, handleSaveGroupEdit, 
    baseName, setBaseName, baseSku, setBaseSku, basePrice, setBasePrice, baseImage, setBaseImage, 
    baseDescription, setBaseDescription, baseMaterial, setBaseMaterial, baseSole, setBaseSole, 
    baseFastening, setBaseFastening, baseWeight, setBaseWeight, baseLength, setBaseLength, baseWidth, 
    setBaseWidth, baseHeight, setBaseHeight, baseNcm, setBaseNcm, baseCest, setBaseCest, tempColor, 
    setTempColor, addColor, colors, setColors, tempSize, setTempSize, addSize, sizes, setSizes, 
    generatedRows, updateRowBarcode, isSavingBatch, handleSaveBatch, predictiveData, history, usersList, 
    allTickets, handleAdminTicketAction, academySeasonMode, setAcademySeasonMode, 
    academySeason, setAcademySeason, availableSeasons, academyNewSeason, setAcademyNewSeason, 
    academyEpisode, setAcademyEpisode, academyTitle, setAcademyTitle, academyYoutube, setAcademyYoutube, 
    academyDesc, setAcademyDesc, academyBanner, setAcademyBanner, academyLinks, setAcademyLinks, 
    handleSaveAcademy, academySeasons, handleDeleteAcademy, noticeType, setNoticeType, noticeTitle, 
    setNoticeTitle, noticeContent, setNoticeContent, noticeImage, setNoticeImage, handleSaveNotice, 
    notices, handleDeleteNotice, linkTitle, setLinkTitle, linkSubtitle, setLinkSubtitle, linkUrl, 
    setLinkUrl, linkIcon, setLinkIcon, linkOrder, setLinkOrder, handleSaveLink, quickLinks, 
    handleDeleteLink, showcases, editingShowcase, setEditingShowcase, copyShowcaseLink, handleDeleteShowcase, 
    selectAllModelsForShowcase, clearAllModelsForShowcase, toggleModelInShowcase, handleSaveShowcase, baseDriveLink, setBaseDriveLink, brandName, brandLogo, products, handleGenerateAllAddBarcodes, handlePrintLabels, setGeneratedRows
  } = ctx;

  const removeColor = (colorToRemove: string) => setColors(colors.filter((c: string) => c !== colorToRemove));
  const removeSize = (sizeToRemove: string) => setSizes(sizes.filter((s: string) => s !== sizeToRemove));

  const [scanMode, setScanMode] = useState<'entry' | 'exit'>('exit');
  const [scanInput, setScanInput] = useState('');
  const [lastScanned, setLastScanned] = useState<any>(null);

  const [printModalData, setPrintModalData] = useState<any[] | null>(null);
  const [printType, setPrintType] = useState<'qrcode' | 'barcode'>('qrcode');

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    const term = scanInput.trim().toLowerCase();
    const foundProduct = products.find((p: Product) => (p.barcode && p.barcode.toLowerCase() === term) || (p.sku && p.sku.toLowerCase() === term));
    if (foundProduct) {
        const newQty = scanMode === 'entry' ? Number(foundProduct.quantity) + 1 : Number(foundProduct.quantity) - 1;
        if (newQty < 0) { alert("Estoque não pode ficar negativo!"); playSound('error'); } else {
            handleUpdateQuantity(foundProduct, newQty); setLastScanned({ ...foundProduct, quantity: newQty, action: scanMode }); playSound('magic');
        }
    } else { playSound('error'); alert("Produto não encontrado!"); }
    setScanInput('');
  };

  const handleUpdateEditingItem = (index: number, field: string, value: string) => {
      const newItems = [...editingGroup.items];
      newItems[index] = { ...newItems[index], [field]: value };
      setEditingGroup({ ...editingGroup, items: newItems });
  };

  const handleGenerateBarcodeForEdit = (index: number) => {
      const generated = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
      handleUpdateEditingItem(index, 'barcode', generated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {adminView !== 'menu' ? (<button onClick={() => setAdminView('menu')} className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"><ChevronLeft className="w-6 h-6 text-white" /></button>) : (brandLogo ? <img src={brandLogo} className="h-10 object-contain rounded" alt="Logo"/> : <div className="bg-slate-800 p-2 rounded-lg border border-slate-700"><Package className="w-6 h-6 text-blue-400" /></div>)}
            <div className="flex flex-col"><h1 className="font-black text-white text-xl leading-tight">{brandName}</h1><span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{currentTenant?.cnpj ? `CNPJ: ${currentTenant.cnpj}` : 'Painel Fornecedor PRO'}</span></div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => window.open(`/?preview=${currentTenant?.id}`, '_blank')} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 hover:bg-blue-500/20 transition-colors mr-2"><ExternalLink size={16} /> <span className="hidden md:inline font-bold">Testar Vitrine</span></button>
            <button onClick={handleLogout} className="text-xs bg-slate-800 border border-slate-700 p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 hover:bg-red-500 hover:text-white transition-colors"><LogOut size={16} /> <span className="hidden md:inline font-bold">Sair</span></button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-3 md:p-6 space-y-6 relative pb-20">
        
        {adminView === 'menu' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mt-2">
            <button onClick={() => {setAdminView('scanner'); setScanInput(''); setLastScanned(null);}} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 col-span-2 md:col-span-2 lg:col-span-1 border-t-4 border-t-orange-500"><div className="w-14 h-14 bg-orange-500/10 rounded-full flex items-center justify-center"><Scan size={28} className="text-orange-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Bipagem Rápida</h3></div></button>
            <button onClick={() => setAdminView('predictive')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 col-span-2 md:col-span-2 lg:col-span-1 border-t-4 border-t-fuchsia-500"><div className="w-14 h-14 bg-fuchsia-500/10 rounded-full flex items-center justify-center"><BrainCircuit size={28} className="text-fuchsia-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Inteligência IA</h3></div></button>
            <button onClick={() => setAdminView('stock')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center"><Package size={28} className="text-blue-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Estoque</h3></div></button>
            <button onClick={() => setAdminView('add')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center"><Plus size={28} className="text-green-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Criar Produto</h3></div></button>
            <button onClick={() => setAdminView('history')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center"><ClipboardList size={28} className="text-purple-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Relatórios</h3></div></button>
            <button onClick={() => setAdminView('customers')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center"><Users size={28} className="text-indigo-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Clientes</h3></div></button>
            <button onClick={() => setAdminView('tickets')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 relative"><div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center"><Ticket size={28} className="text-rose-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Chamados</h3></div>{allTickets.filter((t:any) => t.status === 'pendente').length > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{allTickets.filter((t:any) => t.status === 'pendente').length}</span>}</button>
            <button onClick={() => setAdminView('academy')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 border-b-4 border-b-red-600"><div className="w-14 h-14 bg-red-600/10 rounded-full flex items-center justify-center"><GraduationCap size={28} className="text-red-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Jornada Alunos</h3></div></button>
            <button onClick={() => setAdminView('notices')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center"><Megaphone size={28} className="text-amber-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Avisos Dashboard</h3></div></button>
            <button onClick={() => setAdminView('links')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center"><Link2 size={28} className="text-cyan-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Botões Rápidos</h3></div></button>
            <button onClick={() => {setAdminView('showcases'); setEditingShowcase(null);}} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 col-span-2 md:col-span-1"><div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center"><Store size={28} className="text-emerald-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Vitrines Públicas</h3></div></button>
          </div>
        )}

        {adminView === 'showcases' && (
            <div className="space-y-6 animate-in slide-in-from-right">
                {editingShowcase ? (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between"><div className="flex items-center gap-2"><Store className="text-emerald-400"/><h2 className="text-lg font-bold text-white">Configurar Vitrine</h2></div><button onClick={() => setEditingShowcase(null)} className="text-slate-400 hover:text-white"><X/></button></div>
                        <form onSubmit={handleSaveShowcase} className="p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Vitrine (Público)*</label><input value={editingShowcase.name || ''} onChange={e => setEditingShowcase({...editingShowcase, name: e.target.value})} required placeholder="Ex: Coleção Verão" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                                
                                {/* ADICIONADO: BOTÃO OCULTAR PREÇO */}
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                                        <input type="checkbox" checked={editingShowcase.config?.showPrice ?? true} onChange={e => setEditingShowcase({...editingShowcase, config: {...(editingShowcase.config as any), showPrice: e.target.checked}})} className="w-5 h-5 accent-emerald-500" />
                                        <div>
                                            <span className="font-bold text-white text-sm block">Exibir Preços</span>
                                            <span className="text-[10px] text-slate-500">Se desmarcado, os produtos aparecerão sem valor para o cliente final.</span>
                                        </div>
                                    </label>
                                    
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Adicional no Preço (%)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-500 font-bold">%</span>
                                            <input type="number" disabled={!(editingShowcase.config?.showPrice ?? true)} value={editingShowcase.config?.priceMarkup || 0} onChange={e => setEditingShowcase({...editingShowcase, config: {...(editingShowcase.config as any), priceMarkup: Number(e.target.value)}})} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-3 text-white outline-none focus:border-emerald-500 disabled:opacity-50" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Acresce esse % no preço base.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                                <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center"><h3 className="font-bold text-white text-sm">Modelos Visíveis ({editingShowcase.models?.length || 0})</h3><div className="flex gap-2"><button type="button" onClick={selectAllModelsForShowcase} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-white transition-colors">Marcar Todos</button><button type="button" onClick={clearAllModelsForShowcase} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded font-bold transition-colors">Limpar</button></div></div>
                                <div className="p-4 max-h-[40vh] overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {Object.entries(groupedAdminProducts).map(([name, group]: any) => (
                                        <label key={name} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${editingShowcase.models?.includes(name) ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
                                            <input type="checkbox" checked={editingShowcase.models?.includes(name)} onChange={() => toggleModelInShowcase(name)} className="accent-emerald-500 w-4 h-4"/>
                                            <div className="flex items-center gap-3"><img src={group.info.image?.split(',')[0]} className="w-8 h-8 rounded bg-slate-800 object-cover" /><span className="text-sm font-bold text-white truncate">{name}</span></div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={isSavingBatch} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg mt-4">{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Salvar Vitrine</button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center"><div className="flex items-center gap-2"><Store className="text-emerald-400" /><h2 className="text-lg font-bold text-white">Vitrines Ativas</h2></div><button onClick={() => setEditingShowcase({ name: '', config: { showPrice: true, priceMarkup: 0 }, models: [] })} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1"><Plus size={16}/> Nova Vitrine</button></div>
                        <div className="p-4 space-y-3">
                            {showcases.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhuma vitrine criada.</p> : showcases.map((s:any) => (
                                <div key={s.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-colors">
                                    <div><h3 className="font-bold text-white text-lg">{s.name}</h3><div className="flex items-center gap-3 mt-1"><span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">{s.models.length} Modelos</span><span className="text-xs text-slate-500 font-mono">Markup: +{s.config.priceMarkup}%</span><span className="text-xs text-slate-500 font-mono">{s.config.showPrice ? 'Preço: Visível' : 'Preço: Oculto'}</span></div></div>
                                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                        <button onClick={() => copyShowcaseLink(s.linkId)} className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"><Copy size={14}/> Copiar Link</button>
                                        <button onClick={() => window.open(`https://${currentTenant?.domain || window.location.hostname}/?vitrine=${s.linkId}`, '_blank')} className="flex-1 md:flex-none bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"><ExternalLink size={14}/> Acessar</button>
                                        <button onClick={() => setEditingShowcase(s)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg transition-colors"><Pencil size={14}/></button>
                                        <button onClick={() => handleDeleteShowcase(s.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-2 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {adminView === 'scanner' && (
          <div className="space-y-6 animate-in slide-in-from-right max-w-2xl mx-auto">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6"><div className="bg-orange-500/10 p-4 rounded-2xl shrink-0"><Scan className="text-orange-500" size={36}/></div><div><h2 className="text-2xl font-black text-white leading-tight">Leitor de Estoque (Bipagem)</h2><p className="text-sm text-slate-400 mt-1">Conecte seu leitor USB ou digite o SKU manualmente.</p></div></div>
              <div className="flex gap-4 mb-8">
                <label className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer border-2 transition-all ${scanMode === 'entry' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}><input type="radio" name="scanMode" className="hidden" checked={scanMode === 'entry'} onChange={() => {setScanMode('entry'); document.getElementById('scan-input')?.focus();}} /><TrendingUp size={32} className="mb-3" /><span className="font-black tracking-wider uppercase">ENTRADA (+)</span></label>
                <label className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer border-2 transition-all ${scanMode === 'exit' ? 'bg-red-500/10 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}><input type="radio" name="scanMode" className="hidden" checked={scanMode === 'exit'} onChange={() => {setScanMode('exit'); document.getElementById('scan-input')?.focus();}} /><TrendingDown size={32} className="mb-3" /><span className="font-black tracking-wider uppercase">SAÍDA (-)</span></label>
              </div>
              <form onSubmit={handleScanSubmit} className="relative mb-6"><input id="scan-input" autoFocus type="text" value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder="Bipe o Código de Barras ou digite o SKU..." className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl p-5 pl-14 text-white font-mono text-xl focus:border-orange-500 outline-none shadow-inner"/><ScanBarcode className="absolute left-5 top-5 text-slate-500" size={28}/><button type="submit" className="hidden">Bipar</button></form>
              {lastScanned && (
                <div className={`mt-8 p-5 rounded-2xl border-2 flex items-center gap-5 animate-in zoom-in-95 shadow-xl ${lastScanned.action === 'entry' ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-red-950/30 border-red-500/50'}`}>
                  <div className="w-20 h-20 bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-slate-700">{lastScanned.image ? <img src={lastScanned.image.split(',')[0]} className="w-full h-full object-cover"/> : <ImageIcon className="w-full h-full p-5 text-slate-500"/>}</div>
                  <div className="flex-1"><span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm ${lastScanned.action === 'entry' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>{lastScanned.action === 'entry' ? 'Entrada Adicionada' : 'Saída Registrada'}</span><h4 className="font-bold text-white text-lg mt-2 leading-tight">{lastScanned.name}</h4><p className="text-sm text-slate-400 font-mono mt-1">{lastScanned.color} | Tam: {lastScanned.size} | SKU: {lastScanned.sku}</p></div>
                  <div className="text-center shrink-0 bg-slate-900 px-4 py-3 rounded-xl border border-slate-700"><span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Estoque Novo</span><span className={`text-3xl font-black ${lastScanned.quantity > 0 ? 'text-white' : 'text-red-500'}`}>{lastScanned.quantity}</span></div>
                </div>
              )}
            </div>
          </div>
        )}

        {adminView === 'stock' && (
          <div className="space-y-6 animate-in slide-in-from-right pb-24">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg border-l-4 border-l-blue-500"><div className="bg-blue-500/10 p-3 rounded-xl"><Package className="text-blue-500" size={24}/></div><div><p className="text-[10px] font-bold text-slate-500 uppercase">Peças Físicas</p><h3 className="text-2xl font-black text-white">{adminStockStats.totalItems}</h3></div></div>
                 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg border-l-4 border-l-emerald-500"><div className="bg-emerald-500/10 p-3 rounded-xl"><DollarSign className="text-emerald-500" size={24}/></div><div><p className="text-[10px] font-bold text-slate-500 uppercase">Valor em Estoque</p><h3 className="text-2xl font-black text-green-400">{formatCurrency(adminStockStats.totalValue)}</h3></div></div>
                 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg border-l-4 border-l-red-500"><div className="bg-red-500/10 p-3 rounded-xl"><AlertTriangle className="text-red-500" size={24}/></div><div><p className="text-[10px] font-bold text-slate-500 uppercase">Modelos Esgotados</p><h3 className="text-2xl font-black text-red-400">{adminStockStats.outOfStockModels}</h3></div></div>
             </div>

             <div className="flex flex-col md:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                 <div className="relative flex-1"><Search className="absolute left-4 top-3 text-slate-500 w-5 h-5" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou SKU..." className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-blue-500 outline-none" /></div>
                 <div className="flex gap-2 overflow-x-auto hidden-scroll">
                     <button onClick={() => setAdminStockFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${adminStockFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Todos</button>
                     <button onClick={() => setAdminStockFilter('low')} className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${adminStockFilter === 'low' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Estoque Baixo</button>
                     <button onClick={() => setAdminStockFilter('out')} className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${adminStockFilter === 'out' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Esgotados</button>
                 </div>
             </div>

             <div>
               {filteredAdminList.length === 0 ? (<p className="text-center text-slate-500 py-10">Nenhum produto encontrado nesse filtro.</p>) : (
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                       {filteredAdminList.map(([name, group]: any) => {
                           const firstImage = group.info.image ? group.info.image.split(',')[0] : ''; const isLow = group.total > 0 && group.total <= 20; const isOut = group.total === 0;
                           return (
                           <div key={name} onClick={() => setAdminViewingGroupName(name)} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col hover:border-blue-500 transition-all cursor-pointer group">
                               <div className="aspect-square bg-slate-950 relative overflow-hidden">
                                   {firstImage ? (<img src={firstImage} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-700 w-12 h-12" /></div>)}
                                   <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-black shadow-lg backdrop-blur-md ${isOut ? 'bg-red-500 text-white' : isLow ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}>{group.total} UN</div>
                               </div>
                               <div className="p-3 flex-1 flex flex-col justify-between">
                                   <div><h3 className="font-bold text-white text-sm leading-tight line-clamp-1">{String(name)}</h3><span className="text-[10px] font-bold text-slate-500">{group.info.parentSku || (group.info.sku ? String(group.info.sku).split('-')[0] : '')}</span></div>
                                   <div className="mt-2 flex items-center justify-between"><span className="text-sm font-black text-green-400">{formatCurrency(group.info.price || 0)}</span></div>
                               </div>
                           </div>
                       )})}
                   </div>
               )}
             </div>
          </div>
        )}

        {adminViewingGroupName && groupedAdminProducts[adminViewingGroupName] && !printModalData && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in" onClick={() => setAdminViewingGroupName(null)}>
               <div className="bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row border border-slate-700" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setAdminViewingGroupName(null)} className="absolute top-4 right-4 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700 transition-colors z-20"><X size={20}/></button>

                  <div className="w-full md:w-1/3 p-6 bg-slate-950 flex flex-col border-r border-slate-800">
                     <div className="aspect-square bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-6 flex items-center justify-center shadow-sm">
                         {groupedAdminProducts[adminViewingGroupName].info.image ? <img src={groupedAdminProducts[adminViewingGroupName].info.image.split(',')[0]} className="w-full h-full object-cover opacity-80" /> : <ImageIcon className="text-slate-700 w-24 h-24" />}
                     </div>
                     <span className="text-xs font-bold text-slate-500 mb-1">{groupedAdminProducts[adminViewingGroupName].info.parentSku || (groupedAdminProducts[adminViewingGroupName].info.sku ? String(groupedAdminProducts[adminViewingGroupName].info.sku).split('-')[0] : '')}</span>
                     <h2 className="text-xl font-black text-white leading-tight mb-2">{adminViewingGroupName}</h2>
                     <div className="text-2xl font-black text-green-400 mb-4">{formatCurrency(groupedAdminProducts[adminViewingGroupName].info.price || 0)}</div>
                     
                     <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center mb-6">
                         <span className="text-xs font-bold text-slate-400 uppercase">Estoque Geral</span>
                         <span className="text-lg font-black text-blue-400">{groupedAdminProducts[adminViewingGroupName].total}</span>
                     </div>
                     
                     <div className="mt-auto space-y-2">
                        <button onClick={() => setPrintModalData(groupedAdminProducts[adminViewingGroupName].items.map((i:any) => ({...i, printQty: 0})))} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700">
                            <Printer size={18}/> Imprimir Etiquetas
                        </button>
                        <button onClick={() => { openGroupEdit(adminViewingGroupName, groupedAdminProducts[adminViewingGroupName]); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <Pencil size={18}/> Editar Ficha Completa
                        </button>
                     </div>
                  </div>

                  <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto">
                      <div className="mb-6 border-b border-slate-800 pb-4">
                          <h3 className="text-lg font-black text-white flex items-center gap-2"><Zap className="text-yellow-500"/> Ajuste Rápido de Numerações</h3>
                          <p className="text-xs text-slate-400">As alterações no estoque (+) ou (-) são salvas automaticamente na nuvem.</p>
                      </div>

                      <div className="space-y-3">
                          {groupedAdminProducts[adminViewingGroupName].items.map((p: Product) => (
                              <div key={p.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                  <div className="flex items-center gap-4">
                                      <span className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-lg shadow-inner">{String(p.size || '')}</span>
                                      <div>
                                          <span className="text-sm font-bold text-slate-300 uppercase block mb-1">{String(p.color || '')}</span>
                                          <span className="text-[10px] text-slate-600 font-mono flex items-center gap-1"><ScanBarcode size={10}/> {p.barcode || p.sku || 'Sem Cód.'}</span>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden h-12 shadow-sm">
                                      <button onClick={() => handleUpdateQuantity(p, Number(p.quantity) - 1)} className="w-12 h-full hover:bg-slate-800 text-slate-400 hover:text-red-400 font-black text-xl transition-colors">-</button>
                                      <div className={`w-14 text-center font-black text-lg ${p.quantity > 0 ? 'text-white' : 'text-red-500'}`}>{Number(p.quantity)}</div>
                                      <button onClick={() => handleUpdateQuantity(p, Number(p.quantity) + 1)} className="w-12 h-full hover:bg-slate-800 text-slate-400 hover:text-emerald-400 font-black text-xl transition-colors">+</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
               </div>
            </div>
        )}

        {printModalData && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-in fade-in" onClick={() => setPrintModalData(null)}>
                <div className="bg-slate-900 p-6 md:p-8 rounded-3xl w-full max-w-2xl border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                        <h2 className="text-xl font-black text-white flex items-center gap-2"><Printer className="text-blue-400" size={24}/> Impressão Massiva (75x35mm)</h2>
                        <button onClick={() => setPrintModalData(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X size={16}/></button>
                    </div>
                    
                    <div className="mb-6 bg-slate-950 border border-slate-800 rounded-xl p-4">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Formato da Etiqueta</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${printType === 'qrcode' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                <input type="radio" className="hidden" checked={printType==='qrcode'} onChange={()=>setPrintType('qrcode')}/>
                                <QrCode size={20}/> <span className="font-bold text-sm">QR Code</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${printType === 'barcode' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                <input type="radio" className="hidden" checked={printType==='barcode'} onChange={()=>setPrintType('barcode')}/>
                                <ScanBarcode size={20}/> <span className="font-bold text-sm">Código de Barras</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-[40vh] overflow-y-auto hidden-scroll">
                        {printModalData.map((item, idx) => (
                            <div key={item.id} className="flex items-center justify-between border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                <div><span className="font-bold text-white text-sm">Tam: {item.size} | Cor: {item.color}</span><p className="text-[10px] text-slate-500 font-mono">Cód: {item.barcode || item.sku}</p></div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] uppercase font-bold text-slate-500">Imprimir:</span>
                                    <div className="flex items-center bg-slate-900 rounded border border-slate-700">
                                        <button type="button" onClick={() => {const d = [...printModalData]; if(d[idx].printQty > 0) d[idx].printQty--; setPrintModalData(d);}} className="w-8 h-8 hover:bg-slate-800 text-white font-bold">-</button>
                                        <input type="number" value={item.printQty} onChange={e => {const d = [...printModalData]; d[idx].printQty = parseInt(e.target.value)||0; setPrintModalData(d);}} className="w-12 h-8 bg-transparent text-center text-white text-sm font-bold outline-none" />
                                        <button type="button" onClick={() => {const d = [...printModalData]; d[idx].printQty++; setPrintModalData(d);}} className="w-8 h-8 hover:bg-slate-800 text-white font-bold">+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex gap-3">
                        <button onClick={() => {const d = [...printModalData]; d.forEach(i => i.printQty = Number(i.quantity) > 0 ? Number(i.quantity) : 0); setPrintModalData(d);}} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-colors text-xs">Copiar Estoque Real</button>
                        <button onClick={() => { handlePrintLabels(printModalData.filter(i => i.printQty > 0), printType); }} disabled={printModalData.every(i => i.printQty === 0)} className={`flex-1 flex-[2] text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg transition-transform ${printModalData.every(i => i.printQty === 0) ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 hover:scale-[1.02]'}`}><Printer size={18}/> Imprimir Selecionadas</button>
                    </div>
                </div>
            </div>
        )}

        {adminView === 'add' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden relative animate-in slide-in-from-right">
            <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-800/50"><h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><Layers size={24} className="text-green-500" /> Gerador de Variações</h2></div>
            <div className="p-4 md:p-6 space-y-6 md:space-y-8">
              
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50">
                <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Package size={16} className="text-blue-400" /> 1. Produto Pai</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm text-slate-400 block mb-1">Nome*</label><input value={baseName} onChange={e => setBaseName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                    <div><label className="text-sm text-slate-400 block mb-1">SPU (SKU Pai / Base)*</label><input value={baseSku} onChange={e => setBaseSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                    <div className="md:col-span-2"><label className="text-sm text-slate-400 block mb-1">Preço Padrão (R$)*</label><input value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="Ex: 59,90" className="w-full md:w-1/2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                    
                    <div className="md:col-span-2">
                        <label className="text-sm text-slate-400 block mb-1 font-bold text-blue-400">Links das Fotos (Cole todos os links do ImgBB de uma vez)</label>
                        <textarea value={baseImage} onChange={(e) => setBaseImage(e.target.value)} rows={4} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white outline-none focus:border-blue-500 font-mono text-xs placeholder:text-slate-600" placeholder="Exemplo:&#10;https://i.ibb.co/67Pk8NkQ/foto1.png&#10;https://i.ibb.co/B5gWVRCK/foto2.png" />
                        {baseImage && (<div className="mt-3 flex gap-3 overflow-x-auto pb-2 hidden-scroll">{parseImages(baseImage).split(',').map((url, i) => (<div key={i} className="relative shrink-0"><img src={url} className="w-20 h-20 rounded-lg object-cover border-2 border-slate-700" /><span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black shadow-lg">{i+1}</span></div>))}</div>)}
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm text-slate-400 block mb-1 font-bold text-blue-400">Link do Drive (Fotos/Vídeos de Alta Qualidade)</label>
                        <input value={baseDriveLink} onChange={e => setBaseDriveLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
                    </div>
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50">
                  <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Tag size={16} className="text-purple-400" /> Atributos (Ficha Técnica)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><label className="text-sm text-slate-400 block mb-1">Material</label><input value={baseMaterial} onChange={e => setBaseMaterial(e.target.value)} placeholder="Ex: Couro, Sintético..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">Solado</label><input value={baseSole} onChange={e => setBaseSole(e.target.value)} placeholder="Ex: Borracha, EVA..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">Tipo de Ajuste</label><input value={baseFastening} onChange={e => setBaseFastening(e.target.value)} placeholder="Ex: Cadarço, Zíper" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div className="md:col-span-3"><label className="text-sm text-slate-400 block mb-1">Descrição Curta (Fica salva no sistema)</label><textarea value={baseDescription} onChange={e => setBaseDescription(e.target.value)} rows={2} placeholder="Detalhes extras do produto..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"></textarea></div>
                  </div>
              </div>

              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50">
                  <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Box size={16} className="text-orange-400" /> Logística e Fiscal (UpSeller)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><label className="text-sm text-slate-400 block mb-1">Peso (g)</label><input type="number" value={baseWeight} onChange={e => setBaseWeight(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">Comp. (cm)</label><input type="number" value={baseLength} onChange={e => setBaseLength(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">Largura (cm)</label><input type="number" value={baseWidth} onChange={e => setBaseWidth(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">Altura (cm)</label><input type="number" value={baseHeight} onChange={e => setBaseHeight(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div className="col-span-2"><label className="text-sm text-slate-400 block mb-1">NCM</label><input value={baseNcm} onChange={e => setBaseNcm(e.target.value)} placeholder="0000.00.00" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div className="col-span-2"><label className="text-sm text-slate-400 block mb-1">CEST</label><input value={baseCest} onChange={e => setBaseCest(e.target.value)} placeholder="00.000.00" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                  </div>
              </div>

              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Layers size={16} className="text-blue-400" /> 2. Grade</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-sm text-slate-400 block mb-2">Cores (Enter)</label><div className="flex gap-2 mb-2"><input value={tempColor} onChange={e => setTempColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{colors.map(c => <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button></span>)}</div></div><div><label className="text-sm text-slate-400 block mb-2">Tamanhos (Enter)</label><div className="flex gap-2 mb-2"><input value={tempSize} onChange={e => setTempSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{sizes.map(s => <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button></span>)}</div></div></div></div>
              
              {generatedRows.length > 0 && (
                <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-bold text-slate-300">Variações ({generatedRows.length})</h3>
                        <button type="button" onClick={handleGenerateAllAddBarcodes} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded flex items-center gap-1"><Wand2 size={12}/> Auto-Gerar Cód. Barras</button>
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU Físico</th><th className="p-2">Cód. Barras (Mundial)</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} placeholder="Bipe ou digite" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none" /></td></tr>))}</tbody></table></div>
                </div>
              )}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-xl px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} {isSavingBatch ? 'SALVANDO...' : 'GERAR VARIAÇÕES'}</button></div>
            </div>
          </div>
        )}

        {editingGroup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-3xl border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                 <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="text-blue-400" size={24}/> Editar Modelo Completo</h2><p className="text-xs text-slate-400 mt-1">Atualiza a ficha base e as variações individuais.</p></div>
                 <button type="button" onClick={handleDeleteGroup} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 md:px-3 md:py-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"><Trash2 size={16} /> <span className="hidden md:inline">Excluir Tudo</span></button>
              </div>
              <form onSubmit={handleSaveGroupEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Nome do Modelo</label><input value={editingGroup.name} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">SPU (SKU Pai / Base)</label><input value={editingGroup.parentSku} onChange={e => setEditingGroup({...editingGroup, parentSku: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:border-blue-500 outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Preço Geral (R$)</label><input value={editingGroup.price || ''} onChange={e => setEditingGroup({...editingGroup, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" type="number" required /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase flex items-center gap-1"><Download size={12}/> Descrição</label><textarea value={editingGroup.description} onChange={e => setEditingGroup({...editingGroup, description: e.target.value})} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none"></textarea></div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <label className="text-xs font-bold text-purple-400 uppercase mb-2 block flex items-center gap-1"><Tag size={14}/> Atributos (Ficha Técnica)</label>
                    <div className="grid grid-cols-3 gap-2">
                        <div><label className="text-[10px] text-slate-500 uppercase">Material</label><input value={editingGroup.material} onChange={e => setEditingGroup({...editingGroup, material: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"/></div>
                        <div><label className="text-[10px] text-slate-500 uppercase">Solado</label><input value={editingGroup.sole} onChange={e => setEditingGroup({...editingGroup, sole: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"/></div>
                        <div><label className="text-[10px] text-slate-500 uppercase">Ajuste</label><input value={editingGroup.fastening} onChange={e => setEditingGroup({...editingGroup, fastening: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"/></div>
                    </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <label className="text-xs font-bold text-blue-400 uppercase mb-2 block">Links das Fotos</label>
                    <textarea value={editingGroup.image.replace(/,/g, '\n')} onChange={(e) => setEditingGroup({...editingGroup, image: parseImages(e.target.value)})} rows={4} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-blue-500 font-mono text-xs" />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Link do Drive (Mídias de Alta Qualidade)</label>
                    <input value={editingGroup.driveLink || ''} onChange={e => setEditingGroup({...editingGroup, driveLink: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="https://drive.google.com/..." />
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><ScanBarcode size={16}/> Variações Individuais</h3>
                    </div>
                    <div className="max-h-48 overflow-y-auto hidden-scroll bg-slate-950 border border-slate-800 rounded-xl p-2">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-slate-950 z-10 shadow-sm">
                                <tr><th className="p-2 text-slate-500">Tam</th><th className="p-2 text-slate-500">Cor</th><th className="p-2 text-slate-500">SKU Físico</th><th className="p-2 text-slate-500">Cód. Barras</th><th className="p-2"></th></tr>
                            </thead>
                            <tbody>
                                {editingGroup.items.map((item: any, idx: number) => (
                                    <tr key={item.id} className="border-b border-slate-800/50">
                                        <td className="p-2 text-white font-bold">{item.size}</td>
                                        <td className="p-2 text-slate-300">{item.color}</td>
                                        <td className="p-2"><input value={item.sku} onChange={e => handleUpdateEditingItem(idx, 'sku', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:border-blue-500 outline-none"/></td>
                                        <td className="p-2"><input value={item.barcode || ''} onChange={e => handleUpdateEditingItem(idx, 'barcode', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:border-blue-500 outline-none"/></td>
                                        <td className="p-2"><button type="button" onClick={() => handleGenerateBarcodeForEdit(idx)} title="Gerar Código" className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white p-1.5 rounded transition-colors"><Wand2 size={14}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-800">
                   <button type="button" onClick={() => setEditingGroup(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-colors">Cancelar</button>
                   <button type="submit" disabled={isSavingBatch} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors">{isSavingBatch ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Salvar Ficha Completa</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {adminView === 'predictive' && predictiveData && (
            <div className="space-y-6 animate-in slide-in-from-right">
                <div className="p-5 border-b border-slate-800 bg-slate-900 rounded-2xl shadow-xl flex items-center justify-between"><div className="flex items-center gap-3"><BrainCircuit className="text-fuchsia-500" size={28}/><h2 className="text-xl font-black text-white">Inteligência Preditiva</h2></div><div className="bg-fuchsia-500/20 text-fuchsia-400 px-4 py-2 rounded-lg font-bold text-sm">Últimos 30 Dias</div></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 rounded-2xl border border-red-900/50 shadow-lg overflow-hidden"><div className="p-4 bg-red-500/10 border-b border-red-900/50 flex items-center gap-2"><AlertTriangle className="text-red-500" size={20} /><h3 className="font-bold text-red-500">Fila de Produção</h3></div><div className="p-4 space-y-3"><p className="text-xs text-slate-400 mb-3">Modelos com estoque no fim.</p>{predictiveData.toProduce.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Tudo sob controle.</p> : predictiveData.toProduce.map((p:any) => (<div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-red-900/30 flex justify-between items-center"><div><h4 className="text-sm font-bold text-white">{String(p.name)}</h4><span className="text-xs text-slate-400">{String(p.color)} - Tam {String(p.size)}</span></div><div className="text-right"><span className="block text-red-400 font-black text-lg">{Number(p.quantity)} un</span></div></div>))}</div></div>
                </div>
            </div>
        )}
        
        {adminView === 'history' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-right">
                <div className="p-5 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center"><div className="flex items-center gap-3"><ClipboardList className="text-purple-400" size={24}/><h2 className="text-xl font-black text-white">Relatório de Estoque</h2></div></div>
                <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                    {history.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhum movimento registrado.</p> : history.map((item:any) => (
                        <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center hover:border-slate-700 transition-colors"><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black ${item.type === 'entry' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{item.type === 'entry' ? '+' : '-'}{item.amount}</div><div><h3 className="font-bold text-white text-sm">{item.productName}</h3><p className="text-xs text-slate-500">SKU: {item.sku || 'N/A'}</p></div></div><div className="text-right"><span className="block text-xs text-slate-400">{formatDate(item.timestamp)}</span><span className="text-[10px] font-mono text-slate-600">Saldo: {item.newQty}</span></div></div>
                    ))}
                </div>
            </div>
        )}{/* TICKETS ADMIN */}
        {adminView === 'tickets' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-right">
                <div className="p-5 border-b border-slate-800 bg-slate-800/30"><div className="flex items-center gap-3"><Ticket className="text-rose-400" size={24}/><h2 className="text-xl font-black text-white">Central de Resoluções</h2></div><p className="text-sm text-slate-400 mt-1">Gerencie trocas e devoluções solicitadas pelos revendedores.</p></div>
                <div className="p-5 space-y-4">
                    {allTickets.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhum chamado aberto no momento.</p> : allTickets.map((ticket: any) => (
                        <div key={ticket.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-3">
                                <div><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${ticket.type === 'devolucao' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>{ticket.type}</span><span className="text-xs text-slate-500 font-mono">{formatDate(ticket.createdAt)}</span>{ticket.status === 'pendente' && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded uppercase animate-pulse border border-yellow-500/30">Novo</span>}{ticket.status === 'aguardando_devolucao' && <span className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-orange-500/30 flex items-center gap-1"><Clock size={10}/> Esperando Peça</span>}{ticket.status === 'aceito' && <span className="text-emerald-500 text-[10px] font-black uppercase"><Check size={12} className="inline"/> Autorizado</span>}{ticket.status === 'concluido' && <span className="text-blue-500 text-[10px] font-black uppercase">Finalizado</span>}{ticket.status === 'recusado' && <span className="text-red-500 text-[10px] font-black uppercase">Recusado</span>}</div><h3 className="font-bold text-white text-lg">{ticket.userName}</h3></div>
                                <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-right"><span className="block text-[10px] text-slate-400 uppercase font-bold">Valor Ref.</span><span className="font-black text-green-400">{formatCurrency(ticket.productValue)}</span></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-slate-900 p-3 rounded-lg border border-slate-800"><span className="block text-xs text-slate-500 uppercase font-bold mb-1">Dados da Solicitação</span><span className="font-medium text-white whitespace-pre-wrap leading-relaxed block">{ticket.productInfo}</span></div><div className="bg-slate-900 p-3 rounded-lg border border-slate-800"><span className="block text-xs text-slate-500 uppercase font-bold mb-1">Motivo / Defeito</span><span className="font-medium text-slate-300 text-sm leading-relaxed block">{ticket.reason}</span></div></div>
                            <div className="pt-2 flex flex-wrap gap-2">
                                {ticket.status === 'pendente' && ticket.type === 'troca' && (<><button onClick={() => handleAdminTicketAction(ticket, 'aceitar_troca')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Check size={16}/> Aceitar Troca</button><button onClick={() => handleAdminTicketAction(ticket, 'recusar')} className="bg-slate-800 hover:bg-slate-700 text-red-400 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><X size={16}/> Recusar</button></>)}
                                {ticket.status === 'pendente' && ticket.type === 'devolucao' && (<><button onClick={() => handleAdminTicketAction(ticket, 'aceitar_devolucao')} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Clock size={16}/> Autorizar (Aguardar Peça)</button><button onClick={() => handleAdminTicketAction(ticket, 'recusar')} className="bg-slate-800 hover:bg-slate-700 text-red-400 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><X size={16}/> Recusar (Sem Defeito)</button></>)}
                                {ticket.status === 'aguardando_devolucao' && ticket.type === 'devolucao' && (<button onClick={() => handleAdminTicketAction(ticket, 'recebido_gerar_credito')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 animate-bounce"><Wallet size={18}/> Produto Entregue - Gerar Crédito (R$ {ticket.productValue.toFixed(2)})</button>)}
                                {ticket.status === 'aceito' && ticket.type === 'troca' && (<span className="text-emerald-500 text-xs font-bold flex items-center gap-1"><Check size={16}/> Aguardando envio do cliente</span>)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* JORNADA DO ALUNO */}
        {adminView === 'academy' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-800/30 flex items-center gap-3">
                <GraduationCap className="text-red-500" size={24}/>
                <h2 className="text-xl font-black text-white">Jornada do Aluno (Treinamentos)</h2>
              </div>
              <form onSubmit={handleSaveAcademy} className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Módulo / Temporada</label>
                    <div className="flex gap-2 mb-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="radio" checked={academySeasonMode==='existing'} onChange={() => setAcademySeasonMode('existing')} className="accent-red-500"/> Existente</label>
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="radio" checked={academySeasonMode==='new'} onChange={() => setAcademySeasonMode('new')} className="accent-red-500"/> Novo</label>
                    </div>
                    {academySeasonMode === 'existing' ? (
                      <select value={academySeason} onChange={(e:any) => setAcademySeason(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-red-500">
                        <option value="">Selecione um Módulo...</option>
                        {availableSeasons.map((s:any) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input value={academyNewSeason} onChange={(e:any) => setAcademyNewSeason(e.target.value)} placeholder="Ex: Módulo 1 - Iniciantes" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-red-500" />
                    )}
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Episódio / Ordem</label><input type="number" value={academyEpisode} onChange={(e:any) => setAcademyEpisode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-red-500" /></div>
                  <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título da Aula</label><input value={academyTitle} onChange={(e:any) => setAcademyTitle(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-red-500" /></div>
                  <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link do YouTube</label><input value={academyYoutube} onChange={(e:any) => setAcademyYoutube(e.target.value)} required placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-red-500" /></div>
                  <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição da Aula</label><textarea value={academyDesc} onChange={(e:any) => setAcademyDesc(e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-red-500"></textarea></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link do Banner (Imagem)</label><input value={academyBanner} onChange={(e:any) => setAcademyBanner(e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-red-500" /></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Links/Materiais de Apoio</label><input value={academyLinks} onChange={(e:any) => setAcademyLinks(e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-red-500" /></div>
                </div>
                <button type="submit" disabled={isSavingBatch} className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors mt-4">{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Publicar Aula</button>
              </form>
            </div>
            
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-800/30"><h2 className="font-bold text-white">Aulas Publicadas</h2></div>
              <div className="p-5 space-y-4">
                 {academySeasons.length === 0 ? <p className="text-slate-500 text-center">Nenhuma aula cadastrada.</p> : academySeasons.map((season: any, idx: number) => (
                     <div key={idx} className="space-y-2">
                         <h3 className="font-black text-red-500 border-b border-slate-800 pb-2">{season.name}</h3>
                         {season.episodes.map((ep: any) => (
                             <div key={ep.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                                 <div>
                                     <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-bold mr-2">Ep {ep.episode}</span>
                                     <span className="font-bold text-sm text-white">{ep.title}</span>
                                 </div>
                                 <button onClick={() => handleDeleteAcademy(ep.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors"><Trash2 size={16}/></button>
                             </div>
                         ))}
                     </div>
                 ))}
              </div>
            </div>
          </div>
        )}

        {/* AVISOS DO DASHBOARD */}
        {adminView === 'notices' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2"><Megaphone className="text-amber-400" /><h2 className="text-lg font-bold text-white">Adicionar Aviso / Banner</h2></div>
              <form onSubmit={handleSaveNotice} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tipo</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 p-3 rounded-lg flex-1"><input type="radio" checked={noticeType==='text'} onChange={()=>setNoticeType('text')} className="accent-amber-500"/><span className="text-sm font-bold">Aviso Normal</span></label>
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 p-3 rounded-lg flex-1"><input type="radio" checked={noticeType==='banner'} onChange={()=>setNoticeType('banner')} className="accent-amber-500"/><span className="text-sm font-bold">Banner</span></label>
                  </div>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título*</label><input value={noticeTitle} onChange={(e:any)=>setNoticeTitle(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-amber-500"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Conteúdo</label><textarea value={noticeContent} onChange={(e:any)=>setNoticeContent(e.target.value)} rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-amber-500"></textarea></div>
                {noticeType === 'banner' && <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link da Imagem</label><input value={noticeImage} onChange={(e:any)=>setNoticeImage(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-amber-500"/></div>}
                <button type="submit" disabled={isSavingBatch} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg mt-4">{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Publicar</button>
              </form>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50"><h2 className="text-lg font-bold text-white">Avisos Ativos</h2></div>
              <div className="p-4 space-y-3">
                {notices.map((n:any) => (
                  <div key={n.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-start">
                    <div><span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded uppercase font-bold mr-2">{n.type}</span><span className="font-bold text-white">{n.title}</span></div>
                    <button onClick={()=>handleDeleteNotice(n.id)} className="text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BOTÕES RÁPIDOS */}
        {adminView === 'links' && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2"><Link2 className="text-cyan-400" /><h2 className="text-lg font-bold text-white">Criar Botão Rápido</h2></div>
              <form onSubmit={handleSaveLink} className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título*</label><input value={linkTitle} onChange={(e:any)=>setLinkTitle(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-cyan-500"/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Subtítulo</label><input value={linkSubtitle} onChange={(e:any)=>setLinkSubtitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-cyan-500"/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">URL Destino*</label><input value={linkUrl} onChange={(e:any)=>setLinkUrl(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-cyan-500"/></div>
                  <div className="flex gap-4">
                     <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ícone</label><select value={linkIcon} onChange={(e:any)=>setLinkIcon(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-cyan-500"><option value="Link2">Padrão</option><option value="MessageCircle">WhatsApp</option><option value="Globe">Site</option></select></div>
                     <div className="w-24"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ordem</label><input type="number" value={linkOrder} onChange={(e:any)=>setLinkOrder(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-cyan-500"/></div>
                  </div>
                </div>
                <button type="submit" disabled={isSavingBatch} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg mt-4">{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Salvar Botão</button>
              </form>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50"><h2 className="text-lg font-bold text-white">Botões Ativos</h2></div>
              <div className="p-4 space-y-3">
                {quickLinks.map((link:any) => (
                  <div key={link.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div><span className="font-bold text-white text-sm">{link.title}</span><p className="text-xs text-slate-500">{link.url}</p></div>
                    <button onClick={()=>handleDeleteLink(link.id)} className="text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VITRINES PÚBLICAS */}
        {adminView === 'showcases' && (
            <div className="space-y-6 animate-in slide-in-from-right">
                {editingShowcase ? (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between"><div className="flex items-center gap-2"><Store className="text-emerald-400"/><h2 className="text-lg font-bold text-white">Configurar Vitrine</h2></div><button onClick={() => setEditingShowcase(null)} className="text-slate-400 hover:text-white"><X/></button></div>
                        <form onSubmit={handleSaveShowcase} className="p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Vitrine (Público)*</label><input value={editingShowcase.name || ''} onChange={e => setEditingShowcase({...editingShowcase, name: e.target.value})} required placeholder="Ex: Coleção Verão" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-emerald-500" /></div>
                                
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                                        <input type="checkbox" checked={editingShowcase.config?.showPrice ?? true} onChange={e => setEditingShowcase({...editingShowcase, config: {...(editingShowcase.config as any), showPrice: e.target.checked}})} className="w-5 h-5 accent-emerald-500" />
                                        <div>
                                            <span className="font-bold text-white text-sm block">Exibir Preços</span>
                                            <span className="text-[10px] text-slate-500">Se desmarcado, os produtos aparecerão sem valor para o cliente final.</span>
                                        </div>
                                    </label>
                                    
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Adicional no Preço (%)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-500 font-bold">%</span>
                                            <input type="number" disabled={!(editingShowcase.config?.showPrice ?? true)} value={editingShowcase.config?.priceMarkup || 0} onChange={e => setEditingShowcase({...editingShowcase, config: {...(editingShowcase.config as any), priceMarkup: Number(e.target.value)}})} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-3 text-white outline-none focus:border-emerald-500 disabled:opacity-50" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Acresce esse % no preço base.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                                <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center"><h3 className="font-bold text-white text-sm">Modelos Visíveis ({editingShowcase.models?.length || 0})</h3><div className="flex gap-2"><button type="button" onClick={selectAllModelsForShowcase} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-white transition-colors">Marcar Todos</button><button type="button" onClick={clearAllModelsForShowcase} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded font-bold transition-colors">Limpar</button></div></div>
                                <div className="p-4 max-h-[40vh] overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {Object.entries(groupedAdminProducts).map(([name, group]: any) => (
                                        <label key={name} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${editingShowcase.models?.includes(name) ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
                                            <input type="checkbox" checked={editingShowcase.models?.includes(name)} onChange={() => toggleModelInShowcase(name)} className="accent-emerald-500 w-4 h-4"/>
                                            <div className="flex items-center gap-3"><img src={group.info.image?.split(',')[0]} className="w-8 h-8 rounded bg-slate-800 object-cover" /><span className="text-sm font-bold text-white truncate">{name}</span></div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={isSavingBatch} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg mt-4">{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Salvar Vitrine</button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center"><div className="flex items-center gap-2"><Store className="text-emerald-400" /><h2 className="text-lg font-bold text-white">Vitrines Ativas</h2></div><button onClick={() => setEditingShowcase({ name: '', config: { showPrice: true, priceMarkup: 0 }, models: [] })} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1"><Plus size={16}/> Nova Vitrine</button></div>
                        <div className="p-4 space-y-3">
                            {showcases.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhuma vitrine criada.</p> : showcases.map((s:any) => (
                                <div key={s.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-colors">
                                    <div><h3 className="font-bold text-white text-lg">{s.name}</h3><div className="flex items-center gap-3 mt-1"><span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">{s.models.length} Modelos</span><span className="text-xs text-slate-500 font-mono">Markup: +{s.config.priceMarkup}%</span><span className="text-xs text-slate-500 font-mono">{s.config.showPrice ? 'Preço: Visível' : 'Preço: Oculto'}</span></div></div>
                                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                        <button onClick={() => copyShowcaseLink(s.linkId)} className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"><Copy size={14}/> Copiar Link</button>
                                        <button onClick={() => window.open(`https://${currentTenant?.domain || window.location.hostname}/?vitrine=${s.linkId}`, '_blank')} className="flex-1 md:flex-none bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"><ExternalLink size={14}/> Acessar</button>
                                        <button onClick={() => setEditingShowcase(s)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg transition-colors"><Pencil size={14}/></button>
                                        <button onClick={() => handleDeleteShowcase(s.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-2 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}