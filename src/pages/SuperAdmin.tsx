import React, { useContext, useState } from 'react';
import { Building, Plus, Globe, Palette, Image as ImageIcon, ExternalLink, Pencil, Trash2, Save, X, RefreshCw, Hash, Store } from 'lucide-react';
import { AppContext } from '../AppContext';
import { db, TENANTS_COLLECTION } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function SuperAdmin() {
  const { saasTenants, newTenantName, setNewTenantName, newTenantDomain, setNewTenantDomain, newTenantLogo, setNewTenantLogo, newTenantColor, setNewTenantColor, newTenantCnpj, setNewTenantCnpj, handleCreateTenant, isSavingBatch, handleLogout } = useContext(AppContext);

  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateTenant = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingTenant) return;
      setIsUpdating(true);
      try {
          const cleanDomain = editingTenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
          await updateDoc(doc(db, TENANTS_COLLECTION, editingTenant.id), {
              name: editingTenant.name,
              domain: cleanDomain,
              logoUrl: editingTenant.logoUrl,
              primaryColor: editingTenant.primaryColor,
              cnpj: editingTenant.cnpj || ''
          });
          setEditingTenant(null);
      } catch (error) {
          console.error(error);
          alert("Erro ao atualizar os dados.");
      } finally {
          setIsUpdating(false);
      }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
      if (confirm(`ATENÇÃO: Deseja realmente excluir toda a infraestrutura da empresa ${name}? Essa ação não pode ser desfeita.`)) {
          await deleteDoc(doc(db, TENANTS_COLLECTION, id));
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-6">
      <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20"><Building className="text-white w-6 h-6" /></div>
          <h1 className="text-xl md:text-2xl font-black text-white">Painel Geral de Controle de Inquilinos</h1>
        </div>
        <button onClick={handleLogout} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-slate-700">Sair</button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        {/* Esquerda: Cadastro */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl sticky top-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6"><Plus className="text-emerald-400"/> Cadastrar Novo Cliente</h2>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Empresa</label><input value={newTenantName} onChange={e => setNewTenantName(e.target.value)} placeholder="Ex: João Drop" required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CNPJ</label><input value={newTenantCnpj} onChange={e => setNewTenantCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Domínio do Cliente</label><input value={newTenantDomain} onChange={e => setNewTenantDomain(e.target.value)} placeholder="Ex: joaodrop.com.br" required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" /><p className="text-[10px] text-slate-500 mt-1">É assim que o sistema vai reconhecer de quem é a loja.</p></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link da Logo (Opcional)</label><input value={newTenantLogo} onChange={e => setNewTenantLogo(e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1 block"><Palette size={12}/> Cor Principal da Marca</label><div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-lg p-2"><input type="color" value={newTenantColor} onChange={e => setNewTenantColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" /><span className="text-white font-mono font-bold">{newTenantColor.toUpperCase()}</span></div></div>
              <button type="submit" disabled={isSavingBatch} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 mt-6 transition-transform hover:scale-[1.02]">{isSavingBatch ? <RefreshCw className="animate-spin" /> : 'Criar Infraestrutura da Empresa'}</button>
            </form>
          </div>
        </div>

        {/* Direita: Lista de Clientes */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl min-h-[600px]">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6"><Store className="text-blue-400"/> Empresas Hospedadas ({saasTenants.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {saasTenants.map(tenant => (
                <div key={tenant.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 relative flex flex-col justify-between hover:border-slate-700 transition-colors" style={{borderLeftWidth: '4px', borderLeftColor: tenant.primaryColor || '#2563eb'}}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-4">
                      <h3 className="font-black text-white text-lg leading-tight uppercase line-clamp-1">{tenant.name}</h3>
                      <div className="flex items-center gap-1 text-slate-400 mt-2"><Globe size={12} className="text-blue-400"/><span className="text-xs">{tenant.domain}</span></div>
                      {tenant.cnpj && <div className="flex items-center gap-1 text-slate-500 mt-1"><Hash size={12} className="text-emerald-400"/><span className="text-xs font-mono">{tenant.cnpj}</span></div>}
                    </div>
                    {tenant.logoUrl ? <img src={tenant.logoUrl} className="w-12 h-12 object-contain bg-slate-900 rounded-lg p-1 shrink-0 border border-slate-800" /> : <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center shrink-0 border border-slate-800"><Store size={20} className="text-slate-500"/></div>}
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-2 pt-4 border-t border-slate-800 gap-3">
                    <span className="text-[10px] text-slate-600 font-mono">ID: {tenant.id.substring(0,8)}</span>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => setEditingTenant(tenant)} className="flex-1 md:flex-none justify-center text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 transition-colors border border-slate-700"><Pencil size={12}/> Editar</button>
                      <button onClick={() => window.open(`/?preview=${tenant.id}`, '_blank')} className="flex-1 md:flex-none justify-center text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg font-bold flex items-center gap-1 transition-colors"><ExternalLink size={12}/> Painel</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {saasTenants.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                    <Store size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhuma empresa hospedada ainda.</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-slate-900 p-6 md:p-8 rounded-3xl w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2"><Pencil className="text-blue-400" size={24}/> Editar Empresa</h2>
              <button onClick={() => setEditingTenant(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"><X size={16}/></button>
            </div>
            <form onSubmit={handleUpdateTenant} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Empresa</label><input value={editingTenant.name} onChange={e => setEditingTenant({...editingTenant, name: e.target.value})} required className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-colors" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CNPJ</label><input value={editingTenant.cnpj || ''} onChange={e => setEditingTenant({...editingTenant, cnpj: e.target.value})} placeholder="00.000.000/0000-00" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-colors" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Domínio</label><input value={editingTenant.domain} onChange={e => setEditingTenant({...editingTenant, domain: e.target.value})} required className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-colors" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link da Logo</label><input value={editingTenant.logoUrl} onChange={e => setEditingTenant({...editingTenant, logoUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-colors" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1 block"><Palette size={12}/> Cor Principal</label><div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3"><input type="color" value={editingTenant.primaryColor} onChange={e => setEditingTenant({...editingTenant, primaryColor: e.target.value})} className="w-12 h-12 rounded cursor-pointer bg-transparent border-0" /><span className="text-white font-mono font-bold text-lg">{editingTenant.primaryColor.toUpperCase()}</span></div></div>
              <div className="flex gap-3 pt-6 border-t border-slate-800 mt-6">
                 <button type="button" onClick={() => handleDeleteTenant(editingTenant.id, editingTenant.name)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-5 py-4 rounded-xl font-bold transition-colors shadow-inner"><Trash2 size={20}/></button>
                 <button type="submit" disabled={isUpdating} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 transition-transform hover:scale-[1.02]">{isUpdating ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />} Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}