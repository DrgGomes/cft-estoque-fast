import React, { useContext, useState } from 'react';
import { Package, Plus, ClipboardList, Users, Ticket, GraduationCap, Megaphone, Link2, Store, Search, Pencil, ChevronLeft, LogOut, ExternalLink, Download, FileText, ScanBarcode, Scan, Zap, BrainCircuit, AlertTriangle, TrendingUp, TrendingDown, Clock, Check, X, Printer, Save, RefreshCw, Trash2, Tag, ArrowLeft, DollarSign, QrCode } from 'lucide-react';
import { AppContext, formatCurrency, formatDate, playSound } from '../AppContext';

export default function Fornecedor() {
  const { currentTenant, adminView, setAdminView, handleLogout, purchases, financeRecords, updateOrderStatus, updateOrderPayment, isSavingBatch, brandName, brandLogo, theme, toggleTheme } = useContext(AppContext);
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [scanInput, setScanInput] = useState('');

  const handleScanItem = (e: React.FormEvent) => { e.preventDefault(); if (!scanInput || !selectedOrder) return; const term = scanInput.trim().toLowerCase(); const updatedOrder = { ...selectedOrder }; const itemIndex = updatedOrder.items.findIndex((i:any) => i.barcode?.toLowerCase() === term || i.sku?.toLowerCase() === term); if (itemIndex > -1) { if (updatedOrder.items[itemIndex].scannedQty < updatedOrder.items[itemIndex].quantity) { updatedOrder.items[itemIndex].scannedQty += 1; setSelectedOrder(updatedOrder); playSound('magic'); } else { alert("Quantidade máxima já bipada!"); playSound('error'); } } else { alert("Item não pertence a este pedido!"); playSound('error'); } setScanInput(''); };
  const handleFinishSeparation = () => { if (!selectedOrder) return; let isComplete = true; let isPartial = false; selectedOrder.items.forEach((i:any) => { if (i.scannedQty < i.quantity) { isComplete = false; if (i.scannedQty > 0) isPartial = true; } else { isPartial = true; } }); const newStatus = isComplete ? 'liberado_retirada' : (isPartial ? 'separado_parcialmente' : 'em_separacao'); updateOrderStatus(selectedOrder.id, newStatus); setSelectedOrder(null); setAdminView('orders'); };

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
        
        {/* MENU GIGANTE RESTAURADO (14 BOTÕES) */}
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

        {/* RESTANTE DO CÓDIGO FOCADO NAS NOVAS FUNÇÕES (PEDIDOS) PARA ECONOMIZAR ESPAÇO */}
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

      </main>
    </div>
  );
}