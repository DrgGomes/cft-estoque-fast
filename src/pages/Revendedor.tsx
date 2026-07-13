import React, { useContext, useState } from 'react';
import { AppContext, formatCurrency, formatDate } from '../AppContext';
import { ShoppingCart, Search, Package, CheckCircle, Trash2, X, GraduationCap, Ticket, Download } from 'lucide-react';
import { Product } from '../types';

export default function Revendedor() {
  const { brandColor, brandName, brandLogo, userProfile, handleLogout, userView, setUserView, groupedProducts, searchTerm, setSearchTerm, cart, addToCart, removeFromCart, checkoutOrder, purchases, isSavingBatch, handleBatchExportToUpSeller, selectedCatalogGroups, toggleGroupSelection, lessons, myTickets } = useContext(AppContext);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(file => { const reader = new FileReader(); reader.onloadend = () => { setLabels(prev => [...prev, reader.result as string]); }; reader.readAsDataURL(file); });
  };

  const handleAddToCart = () => {
      Object.entries(quantities).forEach(([productId, qty]) => { if (qty > 0) { const prod = selectedProduct.items.find((i:Product) => i.id === productId); if (prod) addToCart(prod, qty); } });
      setQuantities({}); setSelectedProduct(null); setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
            <div className="flex items-center gap-3">
              {brandLogo ? <img src={brandLogo} className="h-10 object-contain" alt="Logo"/> : <div className="p-2 rounded bg-slate-900"><Package className="text-white"/></div>}
              <div><h1 className="font-black text-slate-900">{brandName}</h1></div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setIsCartOpen(true)} className="relative p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
                    <ShoppingCart size={24} style={{ color: brandColor }} />
                    {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{cart.reduce((a:number, b:any) => a + b.quantity, 0)}</span>}
                </button>
                <button onClick={handleLogout} className="text-xs bg-slate-900 text-white p-2 rounded-lg font-bold">Sair</button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 py-8 space-y-6">
          <div className="flex gap-2 overflow-x-auto border-b pb-4 hidden-scroll">
              <button onClick={() => setUserView('dashboard')} className={`font-bold px-4 py-2 rounded-full whitespace-nowrap ${userView === 'dashboard' ? 'text-white' : 'bg-white text-slate-600 border'}`} style={{ backgroundColor: userView === 'dashboard' ? brandColor : '' }}>Catálogo</button>
              <button onClick={() => setUserView('orders')} className={`font-bold px-4 py-2 rounded-full whitespace-nowrap ${userView === 'orders' ? 'text-white' : 'bg-white text-slate-600 border'}`} style={{ backgroundColor: userView === 'orders' ? brandColor : '' }}>Meus Pedidos</button>
              <button onClick={() => setUserView('support')} className={`font-bold px-4 py-2 rounded-full whitespace-nowrap ${userView === 'support' ? 'text-white' : 'bg-white text-slate-600 border'}`} style={{ backgroundColor: userView === 'support' ? brandColor : '' }}>Chamados</button>
              <button onClick={() => setUserView('academy')} className={`font-bold px-4 py-2 rounded-full whitespace-nowrap ${userView === 'academy' ? 'text-white' : 'bg-white text-slate-600 border'}`} style={{ backgroundColor: userView === 'academy' ? brandColor : '' }}>Treinamentos</button>
          </div>

          {userView === 'dashboard' && (
              <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="relative flex-1"><Search className="absolute left-4 top-3 text-slate-400"/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar modelos..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none"/></div>
                      {selectedCatalogGroups.length > 0 && (
                          <button onClick={handleBatchExportToUpSeller} className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-green-500 animate-in zoom-in"><Download size={20}/> Exportar UpSeller ({selectedCatalogGroups.length})</button>
                      )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Object.entries(groupedProducts).map(([name, group]: any) => (
                          <div key={name} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative group">
                              <input type="checkbox" checked={selectedCatalogGroups.includes(name)} onChange={(e) => toggleGroupSelection(name, e.target.checked)} className="absolute top-2 left-2 z-10 w-5 h-5 accent-green-500" />
                              <div onClick={() => setSelectedProduct(group)} className="cursor-pointer">
                                  <img src={group.info.image?.split(',')[0]} className="w-full aspect-square object-cover bg-slate-100 group-hover:opacity-90" />
                                  <div className="p-3"><h3 className="font-bold text-slate-800 text-sm truncate">{name}</h3><div className="text-lg font-black mt-2" style={{ color: brandColor }}>{formatCurrency(group.info.price)}</div></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {userView === 'orders' && (
              <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 space-y-4">
                  <h2 className="text-xl font-black text-slate-800 border-b pb-4">Histórico de Pedidos</h2>
                  {purchases.map((order: any) => (
                      <div key={order.id} className="border rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4">
                          <div><span className="text-xs bg-slate-100 px-2 py-1 rounded">#{order.id.slice(-6).toUpperCase()}</span><p className="text-xs text-slate-500 mt-2">{formatDate(order.createdAt)}</p><div className="mt-2 text-sm text-slate-600 font-black" style={{ color: brandColor }}>{formatCurrency(order.totalValue)}</div></div>
                          <div className="bg-slate-50 p-2 rounded border text-xs text-slate-500 overflow-y-auto max-h-24 md:w-1/3">
                              {order.items.map((i:any) => <div key={i.productId} className="flex justify-between border-b pb-1 mb-1"><span>{i.quantity}x {i.color} Tam {i.size}</span></div>)}
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {userView === 'support' && (
              <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4 text-center py-10">
                  <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
                  <h2 className="text-xl font-black text-slate-800">Meus Chamados</h2>
                  <p className="text-slate-500">Histórico de devoluções e trocas (Consulte a equipe via WhatsApp para abrir novos).</p>
              </div>
          )}

          {userView === 'academy' && (
              <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4 text-center py-10">
                  <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
                  <h2 className="text-xl font-black text-slate-800">Treinamentos</h2>
                  <p className="text-slate-500">Aulas e tutoriais da fábrica estarão disponíveis aqui.</p>
              </div>
          )}
      </main>

      {/* MODAL PRODUTO (GRID DE TAMANHOS) */}
      {selectedProduct && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => {setSelectedProduct(null); setQuantities({});}}>
              <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h2 className="font-black text-lg text-slate-800">{selectedProduct.info.name}</h2><button onClick={() => setSelectedProduct(null)} className="p-2 bg-slate-200 rounded-full"><X size={16}/></button></div>
                  <div className="p-4 md:p-6 overflow-y-auto flex-1">
                      <div className="flex gap-4 mb-6"><img src={selectedProduct.info.image?.split(',')[0]} className="w-24 h-24 rounded-lg object-cover bg-slate-100" /><div><span className="text-2xl font-black block" style={{ color: brandColor }}>{formatCurrency(selectedProduct.info.price)}</span><p className="text-xs text-slate-500 mt-1">{selectedProduct.info.description}</p></div></div>
                      <h3 className="font-bold text-slate-800 text-sm uppercase mb-4">Selecione as Quantidades</h3>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                          {selectedProduct.items.map((item: Product) => (
                              <div key={item.id} className="border rounded-lg p-2 flex flex-col items-center gap-2 bg-slate-50"><span className="text-xs font-bold text-slate-600 truncate w-full text-center">{item.color} - {item.size}</span><span className="text-[10px] text-slate-400">Est: {item.quantity}</span><input type="number" min="0" max={item.quantity} value={quantities[item.id] || ''} onChange={e => setQuantities({...quantities, [item.id]: parseInt(e.target.value)||0})} className="w-full text-center border p-1 rounded font-bold outline-none focus:border-blue-500" placeholder="0" /></div>
                          ))}
                      </div>
                  </div>
                  <div className="p-4 border-t bg-slate-50"><button onClick={handleAddToCart} className="w-full text-white py-3 rounded-xl font-black flex justify-center gap-2" style={{ backgroundColor: brandColor }}><ShoppingCart size={18}/> Adicionar ao Carrinho</button></div>
              </div>
          </div>
      )}

      {/* MODAL CARRINHO E CHECKOUT */}
      {isCartOpen && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex justify-end backdrop-blur-sm" onClick={() => setIsCartOpen(false)}>
              <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b flex justify-between items-center bg-slate-900 text-white"><h2 className="font-black text-lg flex items-center gap-2"><ShoppingCart size={20}/> Meu Carrinho</h2><button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-800 rounded-full"><X size={16}/></button></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {cart.length === 0 ? <p className="text-center text-slate-500 py-10">Carrinho Vazio</p> : cart.map((item: any) => (
                          <div key={item.productId} className="flex gap-3 border-b pb-3 items-center"><img src={item.image} className="w-16 h-16 rounded object-cover border" /><div className="flex-1"><h4 className="font-bold text-slate-800 text-xs truncate">{item.name}</h4><p className="text-[10px] text-slate-500">{item.color} | Tam: {item.size} | Qtd: {item.quantity}</p><span className="font-black text-slate-900 text-sm">{formatCurrency(item.price * item.quantity)}</span></div><button onClick={() => removeFromCart(item.productId)} className="text-red-500 p-2"><Trash2 size={16}/></button></div>
                      ))}
                      {cart.length > 0 && (<div className="mt-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300"><label className="block text-xs font-bold text-slate-700 uppercase mb-2">Anexar Etiquetas (PDF/Imagens)</label><input type="file" multiple onChange={handleFileUpload} className="w-full text-xs text-slate-500"/>{labels.length > 0 && <p className="text-[10px] text-green-600 font-bold mt-2">{labels.length} arquivo(s) anexado(s)</p>}</div>)}
                  </div>
                  <div className="p-4 border-t bg-slate-50"><button onClick={() => {checkoutOrder(labels); setIsCartOpen(false); setLabels([]);}} disabled={cart.length === 0 || isSavingBatch} className="w-full text-white py-4 rounded-xl font-black text-lg flex justify-center gap-2 shadow-lg" style={{ backgroundColor: cart.length > 0 ? brandColor : '#cbd5e1' }}><CheckCircle size={20}/> Finalizar Pedido</button></div>
              </div>
          </div>
      )}
    </div>
  );
}