import React, { useContext, useState } from 'react';
import { AppContext } from '../AppContext';
import { Package, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const { brandName, brandLogo, brandColor, handleAuth } = useContext(AppContext);

  // Estados locais para a tela de login
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Envia os dados locais para a função de autenticação do sistema
    await handleAuth(e, authEmail, authPassword, isRegistering, authName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 transition-colors" style={{ backgroundColor: isRegistering ? '#f8fafc' : '#f1f5f9' }}>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
        
        {/* Cabeçalho da Empresa (White Label) */}
        <div className="p-8 text-center bg-slate-900 border-b-4" style={{ borderBottomColor: brandColor }}>
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="h-16 mx-auto object-contain mb-4 drop-shadow-lg" />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: brandColor }}>
              <Package className="text-white w-8 h-8" />
            </div>
          )}
          <h2 className="text-2xl font-black text-white">{isRegistering ? 'Criar Conta' : 'Acesso ao Portal'}</h2>
          <p className="text-slate-400 text-sm mt-2">{brandName}</p>
        </div>

        <div className="p-6 md:p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            {isRegistering && (
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Seu Nome</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                  <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-colors text-slate-800" placeholder="Ex: João Drop" />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-colors text-slate-800" placeholder="seu@email.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-colors text-slate-800" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" className="w-full text-white py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] mt-4" style={{ backgroundColor: brandColor }}>
              <LogIn className="w-5 h-5" /> {isRegistering ? 'Cadastrar' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
              {isRegistering ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}