import React, { useContext } from 'react';
import { Package } from 'lucide-react';
import { AppContext } from '../AppContext';

export default function Login() {
  const {
    previewTenantId, setSelectedRole, brandColor, brandLogo, brandName,
    handleAuth, authError, isRegistering, authName, setAuthName,
    authEmail, setAuthEmail, authPassword, setAuthPassword,
    setIsRegistering, setAuthError
  } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {previewTenantId && (<div className="absolute top-4 left-4 bg-yellow-500 text-black font-black text-xs px-3 py-1 rounded shadow-lg uppercase z-50 animate-pulse">Modo Preview</div>)}
      <button type="button" onClick={() => { const s = prompt("Senha ADM da Fábrica:"); if (s === "1234") setSelectedRole('admin'); else alert("Acesso negado!"); }} className="absolute top-4 right-4 z-50 text-slate-300 hover:text-slate-500 p-2 rounded-full transition-colors flex items-center gap-2" title="Acesso Restrito"><Package size={20} /></button>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: brandColor }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: brandColor }}></div>
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          {brandLogo ? (<img src={brandLogo} alt={brandName} className="h-16 object-contain mb-4" />) : (<div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-white" style={{ backgroundColor: brandColor }}><Package className="w-8 h-8" /></div>)}
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{brandName}</h1>
          <p className="text-slate-500 text-sm mt-1">Área Exclusiva para Revendedores</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {authError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl text-center font-bold">{authError}</div>}
          {isRegistering && (<div className="animate-in slide-in-from-top-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Seu Nome Completo</label><input type="text" value={authName} onChange={(e: any) => setAuthName(e.target.value)} required={isRegistering} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="Ex: João da Silva" /></div>)}
          <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">E-mail de Acesso</label><input type="email" value={authEmail} onChange={(e: any) => setAuthEmail(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="seu@email.com" /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Senha (Mínimo 6 dígitos)</label><input type="password" value={authPassword} onChange={(e: any) => setAuthPassword(e.target.value)} required minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="••••••" /></div>
          <button type="submit" className="w-full py-4 mt-2 text-white rounded-xl font-black shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2" style={{ backgroundColor: brandColor }}>{isRegistering ? 'Criar Minha Conta Agora' : 'Entrar no Sistema'}</button>
        </form>
        <div className="mt-6 text-center"><button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-sm font-bold transition-colors" style={{ color: brandColor }}>{isRegistering ? 'Já tenho uma conta. Fazer Login.' : 'Não tem conta? Cadastre-se grátis.'}</button></div>
      </div>
    </div>
  );
}