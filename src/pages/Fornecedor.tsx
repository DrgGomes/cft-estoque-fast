import React, { useContext, useState } from 'react';
import { Package, Plus, ClipboardList, Users, Ticket, GraduationCap, Megaphone, Link2, Store, Search, Pencil, ChevronLeft, LogOut, ExternalLink, Download, FileText, ScanBarcode, Scan, Zap, BrainCircuit, AlertTriangle, TrendingUp, TrendingDown, Clock, Check, X, Printer, Save, RefreshCw, Trash2, Tag, ArrowLeft, DollarSign, QrCode, Layers, Box, Wand2, Image as ImageIcon } from 'lucide-react';
import { AppContext, formatCurrency, formatDate, playSound, parseImages } from '../AppContext';
import { Product } from '../types';

export default function Fornecedor() {
  const { 
    currentTenant, adminView, setAdminView, handleLogout, purchases, financeRecords, updateOrderStatus, updateOrderPayment, isSavingBatch, brandName, brandLogo, theme, toggleTheme,
    adminStockStats, searchTerm, setSearchTerm, adminStockFilter, setAdminStockFilter, filteredAdminList, setAdminViewingGroupName, adminViewingGroupName, groupedAdminProducts,
    handleUpdateQuantity, openGroupEdit, editingGroup, setEditingGroup, handleDeleteGroup, handleSaveGroupEdit,
    baseName, setBaseName, baseSku, setBaseSku, basePrice, setBasePrice, baseImage, setBaseImage, baseDescription, setBaseDescription, baseMaterial, setBaseMaterial, baseSole, setBaseSole, baseFastening, setBaseFastening, baseWeight, setBaseWeight, baseLength, setBaseLength, baseWidth, setBaseWidth, baseHeight, setBaseHeight, baseNcm, setBaseNcm, baseCest, setBaseCest, baseDriveLink, setBaseDriveLink,
    tempColor, setTempColor, addColor, colors, setColors, tempSize, setTempSize, addSize, sizes, setSizes,
    generatedRows, updateRowBarcode, handleSaveBatch, handleGenerateAllAddBarcodes, handlePrintLabels, predictiveData, history, usersList, allTickets, academySeasons, notices, quickLinks, showcases
  } = useContext(AppContext);
  
  const removeColor = (colorToRemove: string) => setColors(colors.filter((c: string) => c !== colorToRemove));
  const removeSize = (sizeToRemove: string) => setSizes(sizes.filter((s: string) => s !== sizeToRemove));

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'entry' | 'exit'>('exit');
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [printModalData, setPrintModalData] = useState<any[] | null>(null);
  const [printType, setPrintType] = useState<'qrcode' | 'barcode'>('qrcode');

  const handleScanItem = (e: React.FormEvent) => { e.preventDefault(); if (!scanInput || !selectedOrder) return; const term = scanInput.trim().toLowerCase(); const updatedOrder = { ...selectedOrder }; const itemIndex = updatedOrder.items.findIndex((i:any) => i.barcode?.toLowerCase() === term || i.sku?.toLowerCase() === term); if (itemIndex > -1) { if (updatedOrder.items[itemIndex].scannedQty < updatedOrder.items[itemIndex].quantity) { updatedOrder.items[itemIndex].scannedQty += 1; setSelectedOrder(updatedOrder); playSound('magic'); } else { alert("Quantidade máxima já bipada!"); playSound('error'); } } else { alert("Item não pertence a este pedido!"); playSound('error'); } setScanInput(''); };
  const handleFinishSeparation = () => { if (!selectedOrder) return; let isComplete = true; let isPartial = false; selectedOrder.items.forEach((i:any) => { if (i.scannedQty < i.quantity) { isComplete = false; if (i.scannedQty > 0) isPartial = true; } else { isPartial = true; } }); const newStatus = isComplete ? 'liberado_retirada' : (isPartial ? 'separado_parcialmente' : 'em_separacao'); updateOrderStatus(selectedOrder.id, newStatus); setSelectedOrder(null); setAdminView('orders'); };

  const handleScanEstoque = (e: React.FormEvent) => {
    e.preventDefault(); if (!scanInput.trim()) return; const term = scanInput.trim().toLowerCase();
    let foundProduct = null;
    for(const groupName in groupedAdminProducts) { const group = groupedAdminProducts[groupName]; const prod = group.items.find((p:Product) => (p.barcode && p.barcode.toLowerCase() === term) || (p.sku && p.sku.toLowerCase() === term)); if(prod) {foundProduct = prod; break;} }
    if (foundProduct) { const newQty = scanMode === 'entry' ? Number(foundProduct.quantity) + 1 : Number(foundProduct.quantity) - 1; if (newQty < 0) { alert("Estoque não pode ficar negativo!"); playSound('error'); } else { handleUpdateQuantity(foundProduct, newQty); setLastScanned({ ...foundProduct, quantity: newQty, action: scanMode }); playSound('magic'); } } else { playSound('error'); alert("Produto não encontrado no sistema!"); }
    setScanInput('');
  };

  const handleUpdateEditingItem = (index: number, field: string, value: string) => { const newItems = [...editingGroup.items]; newItems[index] = { ...newItems[index], [field]: value }; setEditingGroup({ ...editingGroup, items: newItems }); };
  const handleGenerateBarcodeForEdit = (index: number) => { const generated = Math.floor(1000000000000 + Math.random() * 9000000000000).toString(); handleUpdateEditingItem(index, 'barcode', generated); };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              {adminView !== 'menu' && <button onClick={() => setAdminView('menu')} className="p-2 bg-slate-800 rounded hover:bg-slate-700"><ArrowLeft size={20}/></button>}
              {brandLogo ? <img src={brandLogo} className="h-10 object-contain rounded" alt="Logo"/> : <div className="bg-slate-800 p-2 rounded"><Package className="w-6 h-6 text-blue-400" /></div>}
              <div><h1 className="font-black text-white text-xl">{brandName}</h1><span className="text-[10px] text-slate-400 uppercase">Fornecedor PRO</span></div>
            </div>
            <button onClick={handleLogout} className="text-xs bg-slate-800 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors">Sair</button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-4 py-8 space-y-6">
        
        {adminView === 'menu' && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                <button onClick={() => setAdminView('orders')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform border-t-4 border-t-blue-500"><ClipboardList size={28} className="text-blue-500"/><span className="font-bold text-sm">Controle Pedidos</span></button>
                <button onClick={() => setAdminView('scanner_order')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform border-t-4 border-t-orange-500"><ScanBarcode size={28} className="text-orange-500"/><span className="font-bold text-sm">Checkout Bipagem</span></button>
                <button onClick={() => setAdminView('finance')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform border-t-4 border-t-green-500"><DollarSign size={28} className="text-green-500"/><span className="font-bold text-sm">Financeiro</span></button>
                
                <button onClick={() => setAdminView('stock')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><Package size={28} className="text-blue-400"/><span className="font-bold text-sm">Estoque Físico</span></button>
                <button onClick={() => setAdminView('scanner')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><Scan size={28} className="text-orange-400"/><span className="font-bold text-sm">Bipagem (E/S)</span></button>
                <button onClick={() => setAdminView('add')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><Plus size={28} className="text-green-400"/><span className="font-bold text-sm">Criar Produto</span></button>
                <button onClick={() => setAdminView('predictive')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><BrainCircuit size={28} className="text-fuchsia-500"/><span className="font-bold text-sm">Inteligência IA</span></button>
                <button onClick={() => setAdminView('history')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><FileText size={28} className="text-purple-400"/><span className="font-bold text-sm">Relatórios</span></button>
                <button onClick={() => setAdminView('customers')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><Users size={28} className="text-indigo-400"/><span className="font-bold text-sm">Clientes</span></button>
                <button onClick={() => setAdminView('tickets')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><Ticket size={28} className="text-rose-400"/><span className="font-bold text-sm">Chamados</span></button>
                <button onClick={() => setAdminView('academy')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><GraduationCap size={28} className="text-red-500"/><span className="font-bold text-sm">Jornada Alunos</span></button>
                <button onClick={() => setAdminView('notices')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><Megaphone size={28} className="text-amber-400"/><span className="font-bold text-sm">Avisos</span></button>
                <button onClick={() => setAdminView('links')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><Link2 size={28} className="text-cyan-400"/><span className="font-bold text-sm">Botões Rápidos</span></button>
                <button onClick={() => setAdminView('showcases')} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform"><Store size={28} className="text-emerald-400"/><span className="font-bold text-sm">Vitrines</span></button>
            </div>
        )}

        {/* --- MÓDULOS DE PEDIDOS --- */}
        {adminView === 'orders' && (
            <div className="space-y-4">
                <div className="bg-slate-900 p-4 border-b border-slate-800 rounded-t-xl"><h2 className="text-lg font-black text-white flex items-center gap-2"><ClipboardList className="text-blue-500"/> Gestão de Pedidos</h2></div>
                <div className="space-y-3">
                    {purchases.length === 0 ? <p className="text-center text-slate-500">Nenhum pedido recebido.</p> : purchases.map((order: any) => (
                        <div key={order.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono bg-slate-800 text-white px-2 py-1 rounded">#{order.id.slice(-6).toUpperCase()}</span><select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} className="bg-slate-950 border border-slate-700 text-[10px] text-white font-bold px-2 py-1 rounded uppercase outline-none focus:border-blue-500"><option value="novo">Novo</option><option value="em_separacao">Em Separação</option><option value="producao">Em Produção</option><option value="separado_parcialmente">Separado Parcialmente</option><option value="liberado_retirada">Pronto / Liberado</option><option value="enviado">Enviado</option><option value="entregue">Entregue</option><option value="cancelado">Cancelado</option></select></div>
                                <h3 className="font-bold text-white">{order.userName}</h3><p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className="font-black text-green-400 text-lg">{formatCurrency(order.totalValue)}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => {setSelectedOrder(order); setAdminView('scanner_order');}} className="bg-orange-600/20 text-orange-500 hover:bg-orange-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"><ScanBarcode size={14}/> Bipar</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {adminView === 'scanner_order' && (
            <div className="space-y-6 max-w-3xl mx-auto">
                {!selectedOrder ? (
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
                        <QrCode size={48} className="text-slate-600 mx-auto mb-4"/>
                        <h2 className="text-lg font-bold text-white mb-4">Selecione um pedido na tela de Pedidos para iniciar o checkout.</h2>
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center"><h2 className="text-xl font-black text-white">Bipagem do Pedido #{selectedOrder.id.slice(-6).toUpperCase()}</h2><button onClick={() => setSelectedOrder(null)} className="p-2 bg-slate-800 rounded"><X size={16}/></button></div>
                        <div className="p-6">
                            <form onSubmit={handleScanItem} className="relative mb-6"><input autoFocus type="text" value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder="Bipe a etiqueta do produto..." className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl p-5 pl-14 text-white font-mono text-xl focus:border-orange-500 outline-none"/><ScanBarcode className="absolute left-5 top-5 text-slate-500" size={28}/><button type="submit" className="hidden">Bipar</button></form>
                            <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto hidden-scroll pr-2">
                                {selectedOrder.items.map((item:any, idx:number) => (
                                    <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${item.scannedQty === item.quantity ? 'bg-emerald-900/20 border-emerald-500/50' : (item.scannedQty > 0 ? 'bg-orange-900/20 border-orange-500/50' : 'bg-slate-950 border-slate-800')}`}>
                                        <div><span className="font-bold text-white block text-sm">{item.name}</span><span className="text-xs text-slate-500">SKU: {item.sku} | Cor: {item.color} | Tam: {item.size}</span></div>
                                        <div className="text-right"><span className="text-[10px] text-slate-500 uppercase font-bold block">Bipados / Total</span><span className={`text-2xl font-black ${item.scannedQty === item.quantity ? 'text-emerald-400' : 'text-white'}`}>{item.scannedQty} / {item.quantity}</span></div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleFinishSeparation} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2"><CheckCircle size={20}/> Finalizar Separação & Salvar</button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {adminView === 'finance' && (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl border-l-4 border-l-green-500"><p className="text-[10px] font-bold text-slate-500 uppercase">Receita (Pagos)</p><h3 className="text-2xl font-black text-green-400">{formatCurrency(financeRecords.filter((r:any) => r.status === 'pago').reduce((a:number, b:any)=>a+b.value, 0))}</h3></div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl border-l-4 border-l-orange-500"><p className="text-[10px] font-bold text-slate-500 uppercase">A Receber (Pendentes)</p><h3 className="text-2xl font-black text-orange-400">{formatCurrency(financeRecords.filter((r:any) => r.status === 'pendente').reduce((a:number, b:any)=>a+b.value, 0))}</h3></div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl border-l-4 border-l-blue-500"><p className="text-[10px] font-bold text-slate-500 uppercase">Faturado (A Prazo)</p><h3 className="text-2xl font-black text-blue-400">{formatCurrency(financeRecords.filter((r:any) => r.status === 'faturado').reduce((a:number, b:any)=>a+b.value, 0))}</h3></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800"><h2 className="text-lg font-black text-white">Transações Vinculadas a Pedidos</h2></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-500 text-xs uppercase"><tr className="border-b border-slate-800"><th className="p-4">Data</th><th className="p-4">Pedido / Descrição</th><th className="p-4">Valor</th><th className="p-4">Status / Ação</th></tr></thead>
                            <tbody>
                                {financeRecords.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-500">Nenhum registro financeiro.</td></tr> : financeRecords.map((rec:any) => (
                                    <tr key={rec.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                        <td className="p-4 text-slate-400">{formatDate(rec.date)}</td><td className="p-4 text-white font-bold">{rec.description}</td><td className="p-4 font-black text-white">{formatCurrency(rec.value)}</td>
                                        <td className="p-4"><select value={rec.status} onChange={(e) => updateOrderPayment(rec.orderId, e.target.value)} className={`bg-slate-950 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded uppercase outline-none cursor-pointer ${rec.status === 'pago' ? 'text-green-400' : (rec.status==='faturado' ? 'text-blue-400' : 'text-orange-400')}`}><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="faturado">Faturado</option></select></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- TELAS ORIGINAIS RESTAURADAS --- */}
        
        {adminView === 'scanner' && (
          <div className="space-y-6 animate-in slide-in-from-right max-w-2xl mx-auto">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6"><div className="bg-orange-500/10 p-4 rounded-2xl shrink-0"><Scan className="text-orange-500" size={36}/></div><div><h2 className="text-2xl font-black text-white leading-tight">Leitor de Estoque (Bipagem Livre)</h2><p className="text-sm text-slate-400 mt-1">Conecte seu leitor USB ou digite o SKU manualmente.</p></div></div>
              <div className="flex gap-4 mb-8">
                <label className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer border-2 transition-all ${scanMode === 'entry' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}><input type="radio" name="scanMode" className="hidden" checked={scanMode === 'entry'} onChange={() => setScanMode('entry')} /><TrendingUp size={32} className="mb-3" /><span className="font-black tracking-wider uppercase">ENTRADA (+)</span></label>
                <label className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer border-2 transition-all ${scanMode === 'exit' ? 'bg-red-500/10 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}><input type="radio" name="scanMode" className="hidden" checked={scanMode === 'exit'} onChange={() => setScanMode('exit')} /><TrendingDown size={32} className="mb-3" /><span className="font-black tracking-wider uppercase">SAÍDA (-)</span></label>
              </div>
              <form onSubmit={handleScanEstoque} className="relative mb-6"><input autoFocus type="text" value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder="Bipe o Código de Barras ou digite o SKU..." className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl p-5 pl-14 text-white font-mono text-xl focus:border-orange-500 outline-none"/><ScanBarcode className="absolute left-5 top-5 text-slate-500" size={28}/><button type="submit" className="hidden">Bipar</button></form>
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
                 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 border-l-4 border-l-blue-500"><div><p className="text-[10px] font-bold text-slate-500 uppercase">Peças Físicas</p><h3 className="text-2xl font-black text-white">{adminStockStats.totalItems}</h3></div></div>
                 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 border-l-4 border-l-emerald-500"><div><p className="text-[10px] font-bold text-slate-500 uppercase">Valor em Estoque</p><h3 className="text-2xl font-black text-green-400">{formatCurrency(adminStockStats.totalValue)}</h3></div></div>
                 <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 border-l-4 border-l-red-500"><div><p className="text-[10px] font-bold text-slate-500 uppercase">Modelos Esgotados</p><h3 className="text-2xl font-black text-red-400">{adminStockStats.outOfStockModels}</h3></div></div>
             </div>
             <div className="flex flex-col md:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                 <div className="relative flex-1"><Search className="absolute left-4 top-3 text-slate-500 w-5 h-5" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou SKU..." className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none" /></div>
                 <div className="flex gap-2">
                     <button onClick={() => setAdminStockFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${adminStockFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Todos</button>
                     <button onClick={() => setAdminStockFilter('low')} className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${adminStockFilter === 'low' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Baixo</button>
                     <button onClick={() => setAdminStockFilter('out')} className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${adminStockFilter === 'out' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Esgotados</button>
                 </div>
             </div>
             <div>
               {filteredAdminList.length === 0 ? (<p className="text-center text-slate-500 py-10">Nenhum produto encontrado.</p>) : (
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                       {filteredAdminList.map(([name, group]: any) => {
                           const firstImage = group.info.image ? group.info.image.split(',')[0] : ''; const isLow = group.total > 0 && group.total <= 20; const isOut = group.total === 0;
                           return (
                           <div key={name} onClick={() => setAdminViewingGroupName(name)} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col hover:border-blue-500 transition-all cursor-pointer relative">
                               <img src={firstImage} className="w-full aspect-square object-cover opacity-80" />
                               <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-black shadow-lg backdrop-blur-md ${isOut ? 'bg-red-500 text-white' : isLow ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}>{group.total} UN</div>
                               <div className="p-3"><h3 className="font-bold text-white text-sm truncate">{String(name)}</h3><span className="text-sm font-black text-green-400 block mt-1">{formatCurrency(group.info.price || 0)}</span></div>
                           </div>
                       )})}
                   </div>
               )}
             </div>
          </div>
        )}

        {adminView === 'add' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden relative animate-in slide-in-from-right">
            <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-800/50"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers size={24} className="text-green-500" /> Gerador de Variações</h2></div>
            <div className="p-4 md:p-6 space-y-6 md:space-y-8">
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50">
                <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">1. Produto Pai</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm text-slate-400 block mb-1">Nome*</label><input value={baseName} onChange={e => setBaseName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                    <div><label className="text-sm text-slate-400 block mb-1">SPU (SKU Pai / Base)*</label><input value={baseSku} onChange={e => setBaseSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                    <div className="md:col-span-2"><label className="text-sm text-slate-400 block mb-1">Preço Padrão (R$)*</label><input value={basePrice} onChange={e => setBasePrice(e.target.value)} className="w-full md:w-1/2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                    <div className="md:col-span-2"><label className="text-sm text-slate-400 block mb-1 font-bold text-blue-400">Links das Fotos (Vírgula ou Enter)</label><textarea value={baseImage} onChange={(e) => setBaseImage(e.target.value)} rows={4} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white outline-none focus:border-blue-500 font-mono text-xs" /></div>
                    <div className="md:col-span-2"><label className="text-sm text-slate-400 block mb-1 font-bold text-blue-400">Link do Drive (Alta Qualidade)</label><input value={baseDriveLink} onChange={e => setBaseDriveLink(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50">
                  <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Ficha Técnica e Logística</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><label className="text-sm text-slate-400 block mb-1">Material</label><input value={baseMaterial} onChange={e => setBaseMaterial(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">Solado</label><input value={baseSole} onChange={e => setBaseSole(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div className="col-span-2"><label className="text-sm text-slate-400 block mb-1">Descrição</label><input value={baseDescription} onChange={e => setBaseDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">Peso (g)</label><input type="number" value={baseWeight} onChange={e => setBaseWeight(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">C (cm)</label><input type="number" value={baseLength} onChange={e => setBaseLength(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">L (cm)</label><input type="number" value={baseWidth} onChange={e => setBaseWidth(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                      <div><label className="text-sm text-slate-400 block mb-1">A (cm)</label><input type="number" value={baseHeight} onChange={e => setBaseHeight(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                  </div>
              </div>

              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">2. Grade</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-sm text-slate-400 block mb-2">Cores (Enter)</label><div className="flex gap-2 mb-2"><input value={tempColor} onChange={e => setTempColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{colors.map(c => <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button></span>)}</div></div><div><label className="text-sm text-slate-400 block mb-2">Tamanhos (Enter)</label><div className="flex gap-2 mb-2"><input value={tempSize} onChange={e => setTempSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{sizes.map(s => <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button></span>)}</div></div></div></div>
              
              {generatedRows.length > 0 && (
                <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2"><h3 className="text-sm font-bold text-slate-300">Variações ({generatedRows.length})</h3><button type="button" onClick={handleGenerateAllAddBarcodes} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded flex items-center gap-1"><Wand2 size={12}/> Auto-Gerar Cód. Barras</button></div>
                    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU Físico</th><th className="p-2">Cód. Barras</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></td></tr>))}</tbody></table></div>
                </div>
              )}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-xl px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} GERAR VARIAÇÕES</button></div>
            </div>
          </div>
        )}

        {adminView === 'history' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-right">
                <div className="p-5 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center"><div className="flex items-center gap-3"><FileText className="text-purple-400" size={24}/><h2 className="text-xl font-black text-white">Relatório de Estoque</h2></div></div>
                <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                    {history.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhum movimento registrado.</p> : history.map((item:any) => (
                        <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center"><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black ${item.type === 'entry' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{item.type === 'entry' ? '+' : '-'}{item.amount}</div><div><h3 className="font-bold text-white text-sm">{item.productName}</h3><p className="text-xs text-slate-500">SKU: {item.sku || 'N/A'}</p></div></div><div className="text-right"><span className="block text-xs text-slate-400">{formatDate(item.timestamp)}</span><span className="text-[10px] font-mono text-slate-600">Saldo: {item.newQty}</span></div></div>
                    ))}
                </div>
            </div>
        )}

        {adminView === 'customers' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-right">
             <div className="p-5 border-b border-slate-800 bg-slate-800/30 flex items-center gap-3"><Users className="text-indigo-400" size={24}/><h2 className="text-xl font-black text-white">Revendedores ({usersList.length})</h2></div>
             <div className="p-5 space-y-3">
                 {usersList.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhum cliente cadastrado.</p> : usersList.map((u: any) => (
                     <div key={u.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center"><div><h3 className="font-bold text-white text-lg">{u.name || 'Sem Nome'}</h3><p className="text-sm text-slate-500">{u.email}</p></div><div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg"><span className="text-xs text-slate-400 uppercase">Crédito</span><span className="text-lg font-black text-green-400 block">{formatCurrency(u.creditBalance || 0)}</span></div></div>
                 ))}
             </div>
          </div>
        )}
        
        {/* MODAL EDIÇÃO ESTOQUE (INCLUÍDO IMPRIMIR ETIQUETAS) */}
        {adminViewingGroupName && groupedAdminProducts[adminViewingGroupName] && !printModalData && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in" onClick={() => setAdminViewingGroupName(null)}>
               <div className="bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row border border-slate-700" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setAdminViewingGroupName(null)} className="absolute top-4 right-4 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700 transition-colors z-20"><X size={20}/></button>

                  <div className="w-full md:w-1/3 p-6 bg-slate-950 flex flex-col border-r border-slate-800">
                     <div className="aspect-square bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-6 flex items-center justify-center">
                         {groupedAdminProducts[adminViewingGroupName].info.image ? <img src={groupedAdminProducts[adminViewingGroupName].info.image.split(',')[0]} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-700 w-24 h-24" />}
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
                      </div>
                      <div className="space-y-3">
                          {groupedAdminProducts[adminViewingGroupName].items.map((p: Product) => (
                              <div key={p.id} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                                  <div className="flex items-center gap-4">
                                      <span className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-lg">{String(p.size || '')}</span>
                                      <div><span className="text-sm font-bold text-slate-300 block mb-1">{String(p.color || '')}</span><span className="text-[10px] text-slate-600 font-mono">Cód: {p.barcode || p.sku || 'N/A'}</span></div>
                                  </div>
                                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden h-12">
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
        
        {/* MODAL IMPRIMIR ETIQUETAS 75x35 */}
        {printModalData && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-in fade-in" onClick={() => setPrintModalData(null)}>
                <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-2xl border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                        <h2 className="text-xl font-black text-white flex items-center gap-2"><Printer className="text-blue-400"/> Impressão Massiva (75x35mm)</h2>
                        <button onClick={() => setPrintModalData(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X size={16}/></button>
                    </div>
                    <div className="mb-6 bg-slate-950 border border-slate-800 rounded-xl p-4">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Formato</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer ${printType === 'qrcode' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}><input type="radio" className="hidden" checked={printType==='qrcode'} onChange={()=>setPrintType('qrcode')}/> <QrCode size={20}/> <span>QR Code</span></label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer ${printType === 'barcode' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}><input type="radio" className="hidden" checked={printType==='barcode'} onChange={()=>setPrintType('barcode')}/> <ScanBarcode size={20}/> <span>Cód. Barras</span></label>
                        </div>
                    </div>
                    <div className="space-y-3 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-[40vh] overflow-y-auto hidden-scroll">
                        {printModalData.map((item, idx) => (
                            <div key={item.id} className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                                <div><span className="font-bold text-white text-sm">Tam: {item.size} | Cor: {item.color}</span></div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-500">Imprimir:</span>
                                    <div className="flex items-center bg-slate-900 rounded border border-slate-700">
                                        <button onClick={() => {const d = [...printModalData]; if(d[idx].printQty > 0) d[idx].printQty--; setPrintModalData(d);}} className="w-8 h-8 text-white">-</button>
                                        <input type="number" value={item.printQty} onChange={e => {const d = [...printModalData]; d[idx].printQty = parseInt(e.target.value)||0; setPrintModalData(d);}} className="w-12 h-8 bg-transparent text-center text-white outline-none" />
                                        <button onClick={() => {const d = [...printModalData]; d[idx].printQty++; setPrintModalData(d);}} className="w-8 h-8 text-white">+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => {const d = [...printModalData]; d.forEach(i => i.printQty = Number(i.quantity) > 0 ? Number(i.quantity) : 0); setPrintModalData(d);}} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold">Copiar Estoque Real</button>
                        <button onClick={() => { handlePrintLabels(printModalData.filter(i => i.printQty > 0), printType); }} disabled={printModalData.every(i => i.printQty === 0)} className={`flex-1 flex-[2] text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 ${printModalData.every(i => i.printQty === 0) ? 'bg-slate-700' : 'bg-blue-600'}`}><Printer size={18}/> Imprimir Selecionadas</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EDITAR GRUPO GERAL */}
        {editingGroup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-3xl border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                 <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="text-blue-400"/> Editar Modelo Completo</h2></div>
                 <button onClick={handleDeleteGroup} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 rounded-lg font-bold flex gap-1"><Trash2 size={16}/> <span className="hidden md:inline">Excluir Tudo</span></button>
              </div>
              <form onSubmit={handleSaveGroupEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">Nome do Modelo</label><input value={editingGroup.name} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none" required /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">SPU (SKU Base)</label><input value={editingGroup.parentSku} onChange={e => setEditingGroup({...editingGroup, parentSku: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">Preço Geral (R$)</label><input value={editingGroup.price || ''} onChange={e => setEditingGroup({...editingGroup, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none" type="number" required /></div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <label className="text-xs font-bold text-blue-400 uppercase mb-2 block">Links das Fotos</label>
                    <textarea value={editingGroup.image.replace(/,/g, '\n')} onChange={(e) => setEditingGroup({...editingGroup, image: parseImages(e.target.value)})} rows={4} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white outline-none font-mono text-xs" />
                </div>
                <div className="mt-6 pt-6 border-t border-slate-800">
                    <h3 className="text-sm font-bold text-white mb-3">Variações Individuais</h3>
                    <div className="max-h-48 overflow-y-auto hidden-scroll bg-slate-950 border border-slate-800 rounded-xl p-2">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-slate-950 z-10 shadow-sm"><tr><th className="p-2 text-slate-500">Tam</th><th className="p-2 text-slate-500">Cor</th><th className="p-2 text-slate-500">Cód. Barras</th><th className="p-2"></th></tr></thead>
                            <tbody>
                                {editingGroup.items.map((item: any, idx: number) => (
                                    <tr key={item.id} className="border-b border-slate-800/50">
                                        <td className="p-2 text-white font-bold">{item.size}</td><td className="p-2 text-slate-300">{item.color}</td>
                                        <td className="p-2"><input value={item.barcode || ''} onChange={e => handleUpdateEditingItem(idx, 'barcode', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono outline-none"/></td>
                                        <td className="p-2"><button type="button" onClick={() => handleGenerateBarcodeForEdit(idx)} className="bg-blue-600/20 text-blue-400 p-1.5 rounded"><Wand2 size={14}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex gap-3 pt-6 border-t border-slate-800">
                   <button type="button" onClick={() => setEditingGroup(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold">Cancelar</button>
                   <button type="submit" disabled={isSavingBatch} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold">{isSavingBatch ? 'Salvando...' : 'Salvar Ficha Completa'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}