import React, { useContext } from 'react';
import { Building2, Plus, Store, Globe, LayoutGrid, Lock, RefreshCw, PaintBucket } from 'lucide-react';
import { AppContext } from '../AppContext';

export default function SuperAdmin() {
  const {
    superAdminAuthenticated, setSuperAdminAuthenticated,
    newTenantName, setNewTenantName, newTenantDomain, setNewTenantDomain,
    newTenantLogo, setNewTenantLogo, newTenantColor, setNewTenantColor,
    isSavingBatch, handleCreateTenant, saasTenants
  } = useContext(AppContext);

  if (!superAdminAuthenticated) {
      return (
         <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
             <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={32} className="text-blue-500" /></div>
                <h1 className="text-2xl font-black text-white mb-2">Acesso Master</h1>
                <p className="text-slate-400 text-sm mb-8">Infraestrutura SaaS Exclusiva.</p>
                <input type="password" placeholder="Senha Mestre" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 outline-none mb-4 text-center tracking-widest font-mono" onKeyDown={(e) => { if (e.key === 'Enter') { if (e.currentTarget.value === 'master123') setSuperAdminAuthenticated(true); else { alert('Acesso Negado!'); e.currentTarget.value = ''; } } }} />
                <button onClick={(e) => { const input = e.currentTarget.previousElementSibling as HTMLInputElement; if (input.value === 'master123') setSuperAdminAuthenticated(true); else { alert('Acesso Negado!'); input.value = ''; } }} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black shadow-lg transition-colors">Entrar no Sistema Central</button>
             </div>
         </div>
      );
  }

  return (
      <div className="min-h-screen bg-slate-950 font-sans text-white p-6 md:p-12 overflow-y-auto animate-in fade-in duration-500">
          <div className="max-w-6xl mx-auto space-y-8">
              <header className="flex items-center gap-4 border-b border-slate-800 pb-6"><div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/50"><Building2 size={32} /></div><div><h1 className="text-3xl font-black">MaxDrop SaaS Manager</h1><p className="text-slate-400">Painel Geral de Controle de Inquilinos</p></div></header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl h-fit">
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus className="text-emerald-500"/> Cadastrar Novo Cliente</h2>
                      <form onSubmit={handleCreateTenant} className="space-y-4">
                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Empresa</label><input value={newTenantName} onChange={e => setNewTenantName(e.target.value)} required placeholder="Ex: João Drop" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" /></div>
                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Domínio do Cliente</label><input value={newTenantDomain} onChange={e => setNewTenantDomain(e.target.value)} required placeholder="Ex: joaodrop.com.br" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" /><p className="text-[10px] text-slate-500 mt-1">É assim que o sistema vai reconhecer de quem é a loja.</p></div>
                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link da Logo (Opcional)</label><input value={newTenantLogo} onChange={e => setNewTenantLogo(e.target.value)} placeholder="https://" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-xs" /></div>
                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><PaintBucket size={14}/> Cor Principal da Marca</label><div className="flex gap-3"><input type="color" value={newTenantColor} onChange={e => setNewTenantColor(e.target.value)} className="w-12 h-12 rounded cursor-pointer bg-slate-950 border border-slate-800" /><input type="text" value={newTenantColor} onChange={e => setNewTenantColor(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono uppercase" /></div></div>
                          <button type="submit" disabled={isSavingBatch} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black mt-4 transition-transform hover:scale-[1.02] flex justify-center">{isSavingBatch ? <RefreshCw className="animate-spin" /> : 'Criar Infraestrutura da Empresa'}</button>
                      </form>
                  </div>

                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Store className="text-blue-500"/> Empresas Hospedadas ({saasTenants.length})</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {saasTenants.length === 0 ? (<p className="text-slate-500 text-sm">Nenhum cliente cadastrado ainda.</p>) : saasTenants.map((tenant: any) => (
                              <div key={tenant.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: tenant.primaryColor }}></div>
                                  <div className="pl-2 flex justify-between items-start">
                                      <div>
                                          <h3 className="font-bold text-lg text-white uppercase">{tenant.name}</h3>
                                          <a href={`https://${tenant.domain}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"><Globe size={12}/> {tenant.domain}</a>
                                      </div>
                                      {tenant.logoUrl ? (<img src={tenant.logoUrl} className="w-10 h-10 rounded bg-white object-contain p-1" />) : (<div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center"><Store size={16} className="text-slate-500"/></div>)}
                                  </div>
                                  <div className="pl-2 mt-2 pt-3 border-t border-slate-800 flex justify-between items-center">
                                      <span className="text-[10px] text-slate-500 font-mono flex-1">ID: {tenant.id.substring(0,8)}</span>
                                      <div className="flex gap-2">
                                          <a href={`/?preview=${tenant.id}`} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-500/20 font-bold flex items-center gap-1 transition-colors"><LayoutGrid size={12}/> Ver Painel</a>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}