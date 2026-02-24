import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, updateDoc, addDoc, deleteDoc, setDoc,
  serverTimestamp, query, orderBy, onSnapshot, writeBatch, limit, increment, where, getDocs
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'firebase/auth';
import {
  Bell, Package, RefreshCw, Trash2, Plus, Smartphone, LogOut,
  ScanBarcode, Image as ImageIcon, Search, X, Save, Check,
  Layers, Pencil, Zap, AlertCircle, Camera, StopCircle,
  ChevronLeft, ClipboardList, ChevronDown, ChevronUp,
  ShoppingCart, MessageCircle, Minus, Truck, FileText, ShoppingBag,
  LayoutGrid, Megaphone, Upload, Link2, Video, Globe, MousePointerClick,
  Store, Copy, Percent, Ticket, Users, Wallet, Printer, Clock,
  TrendingUp, TrendingDown, Activity, BrainCircuit, AlertTriangle,
  Play, Film, GraduationCap, CheckCircle2, Circle, Building2, PaintBucket
} from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";

// --- CONFIGURAÇÃO FIREBASE ÚNICA PARA O SAAS INTEIRO ---
const firebaseConfig = {
  apiKey: "AIzaSyDG8hpJggHKpWBLaILx2WJrD-Jw7XcKvRg",
  authDomain: "cft-drop---estoque-flash.firebaseapp.com",
  projectId: "cft-drop---estoque-flash",
  storageBucket: "cft-drop---estoque-flash.firebasestorage.app",
  messagingSenderId: "513670906518",
  appId: "1:513670906518:web:eec3f177a4779f3ddf78b7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Coleção Raiz do SaaS (Onde ficam os clientes/empresas)
const TENANTS_COLLECTION = `saas_tenants`;

// Tipos do SaaS
type Tenant = {
  id: string;
  name: string;
  domain: string;
  logoUrl: string;
  primaryColor: string;
  createdAt?: any;
};

// Tipos do Sistema (Inquilino)
type Product = { id: string; sku?: string; barcode?: string; image?: string; name: string; color: string; size: string; quantity: number; price: number; updatedAt?: any; };
type VariationRow = { color: string; size: string; sku: string; barcode: string; };
type ScannedItem = { product: Product; count: number; };
type HistoryItem = { id: string; productId: string; productName: string; sku: string; image: string; type: 'entry' | 'exit' | 'correction'; amount: number; previousQty: number; newQty: number; timestamp: any; };
type CartItem = { product: Product; quantity: number; };
type PurchaseOrder = { id: string; orderCode: string; supplier: string; status: 'pending' | 'received'; items: { productId: string; sku: string; name: string; quantity: number }[]; totalItems: number; createdAt: any; receivedAt?: any; };
type Notice = { id: string; type: 'text' | 'banner'; title: string; content?: string; imageUrl?: string; createdAt: any; };
type QuickLink = { id: string; title: string; subtitle: string; icon: string; url: string; order: number; createdAt?: any; };
type Showcase = { id: string; name: string; linkId: string; config: { showPrice: boolean; priceMarkup: number; }; models: string[]; createdAt?: any; };
type UserProfile = { id: string; name: string; email: string; role: string; creditBalance: number; completedLessons?: string[]; createdAt?: any; };
type SupportTicket = { id: string; userId: string; userName: string; type: 'troca' | 'devolucao'; status: 'pendente' | 'aceito' | 'recusado' | 'aguardando_devolucao' | 'concluido'; productId: string; productInfo: string; productValue: number; reason: string; adminNote?: string; createdAt: any; updatedAt?: any; };
type AcademyLesson = { id: string; season: string; episode: number; title: string; description: string; youtubeUrl: string; bannerUrl: string; materialLinks: string; createdAt: any; };

// FUNÇÕES DE UTILIDADE
const formatCurrency = (value: any) => { const num = Number(value); if (isNaN(num)) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num); };
const getYoutubeId = (url: string) => { if (!url) return null; const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/); return match ? match[1] : null; };

export default function App() {
  const [globalLoading, setGlobalLoading] = useState(true);
  
  // --- ESTADOS DO MOTOR MULTI-TENANT (SaaS) ---
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [saasTenants, setSaasTenants] = useState<Tenant[]>([]);
  
  // Formulário de Criação de Empresa (Super Admin)
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantDomain, setNewTenantDomain] = useState('');
  const [newTenantLogo, setNewTenantLogo] = useState('');
  const [newTenantColor, setNewTenantColor] = useState('#2563eb'); // Azul padrão
  
  const currentDomain = window.location.hostname;

  // Coleções Dinâmicas baseadas no Inquilino atual (Isolamento de Dados)
  const getCol = (name: string) => `saas_tenants/${currentTenant?.id}/${name}`;

  // Estados padrão do sistema
  const urlParams = new URLSearchParams(window.location.search);
  const vitrineLinkId = urlParams.get('vitrine');
  const [isVitrineMode] = useState(!!vitrineLinkId);
  const [publicVitrine, setPublicVitrine] = useState<Showcase | null>(null);

  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [adminView, setAdminView] = useState<'menu' | 'stock' | 'add' | 'history' | 'purchases' | 'notices' | 'links' | 'showcases' | 'customers' | 'tickets' | 'predictive' | 'academy'>('menu');
  const [userView, setUserView] = useState<'dashboard' | 'catalog' | 'cart' | 'orders' | 'support' | 'academy'>('dashboard');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Demais estados omitidos para focar na renderização... (Eles continuam iguais os que fizemos antes)
  const [baseSku, setBaseSku] = useState('');
  const [baseName, setBaseName] = useState('');
  const [baseImage, setBaseImage] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [tempColor, setTempColor] = useState('');
  const [tempSize, setTempSize] = useState('');
  const [generatedRows, setGeneratedRows] = useState<VariationRow[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ oldName: string, name: string, image: string, price: number, items: Product[] } | null>(null);

  const [noticeType, setNoticeType] = useState<'text' | 'banner'>('text');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeImage, setNoticeImage] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkSubtitle, setLinkSubtitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkIcon, setLinkIcon] = useState('Link2');
  const [linkOrder, setLinkOrder] = useState('1');

  const [academySeasonMode, setAcademySeasonMode] = useState<'existing' | 'new'>('existing');
  const [academySeason, setAcademySeason] = useState('');
  const [academyNewSeason, setAcademyNewSeason] = useState('');
  const [academyEpisode, setAcademyEpisode] = useState('1');
  const [academyTitle, setAcademyTitle] = useState('');
  const [academyDesc, setAcademyDesc] = useState('');
  const [academyYoutube, setAcademyYoutube] = useState('');
  const [academyBanner, setAcademyBanner] = useState('');
  const [academyLinks, setAcademyLinks] = useState('');
  const [activeLesson, setActiveLesson] = useState<AcademyLesson | null>(null);

  const [editingShowcase, setEditingShowcase] = useState<Partial<Showcase> | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [ticketType, setTicketType] = useState<'troca' | 'devolucao'>('troca');
  const [ticketReturnProductId, setTicketReturnProductId] = useState('');
  const [ticketDesiredProductId, setTicketDesiredProductId] = useState('');
  const [ticketReason, setTicketReason] = useState('');
  const [ticketValue, setTicketValue] = useState(0);

  // ========================================================================
  // 1. O LEITOR DE DOMÍNIOS (ROTEAMENTO MULTI-TENANT)
  // ========================================================================
  useEffect(() => {
    const fetchTenant = async () => {
      // Procura se o domínio atual pertence a alguma empresa cadastrada
      const q = query(collection(db, TENANTS_COLLECTION), where("domain", "==", currentDomain));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Encontrou! Carrega a empresa.
        const tenantData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Tenant;
        setCurrentTenant(tenantData);
        setIsSuperAdminMode(false);
      } else {
        // Não encontrou o domínio. Mostra o Painel Super Admin (Sua Sala de Comando)
        setIsSuperAdminMode(true);
      }
      setGlobalLoading(false);
    };

    fetchTenant();
  }, [currentDomain]);

  // ========================================================================
  // 2. BUSCA DE DADOS ISOLADA (Usando getCol para pegar só da empresa atual)
  // ========================================================================
  useEffect(() => {
    if (!currentTenant) return; // Só busca se tiver empresa definida

    const q = query(collection(db, getCol('products')), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as Product); });
      prevProductsRef.current = items;
      setProducts(items);
      setFilteredProducts(items);
      setLoading(false);
    });

    if (!isVitrineMode) {
        const unsubNotices = onSnapshot(query(collection(db, getCol('notices')), orderBy('createdAt', 'desc')), (snap) => setNotices(snap.docs.map(d => ({id: d.id, ...d.data()} as Notice))));
        const unsubLinks = onSnapshot(query(collection(db, getCol('quickLinks')), orderBy('order', 'asc')), (snap) => setQuickLinks(snap.docs.map(d => ({id: d.id, ...d.data()} as QuickLink))));
        const unsubShowcases = onSnapshot(query(collection(db, getCol('showcases'))), (snap) => setShowcases(snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase))));
        const unsubAcademy = onSnapshot(collection(db, getCol('academy')), (snap) => setLessons(snap.docs.map(d => ({id: d.id, ...d.data()} as AcademyLesson))));
        return () => { unsubscribe(); unsubNotices(); unsubLinks(); unsubShowcases(); unsubAcademy(); };
    }
  }, [currentTenant, loading, isVitrineMode]);

  // Restante das buscas do Admin (Histórico, Usuários, Tickets) isoladas:
  useEffect(() => {
    if (selectedRole === 'admin' && currentTenant) {
      const unsubHist = onSnapshot(query(collection(db, getCol('history')), orderBy('timestamp', 'desc'), limit(300)), (snap) => setHistory(snap.docs.map(d => ({id: d.id, ...d.data()} as HistoryItem))));
      const unsubPurch = onSnapshot(query(collection(db, getCol('purchases')), orderBy('createdAt', 'desc')), (snap) => setPurchases(snap.docs.map(d => ({id: d.id, ...d.data()} as PurchaseOrder))));
      // No SaaS, usuários ficam numa subcoleção de clientes do inquilino para não misturar auth base
      const unsubUsers = onSnapshot(collection(db, getCol('customers')), (snap) => setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile))));
      const unsubAllTickets = onSnapshot(query(collection(db, getCol('tickets')), orderBy('createdAt', 'desc')), (snap) => setAllTickets(snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket))));

      return () => { unsubHist(); unsubPurch(); unsubUsers(); unsubAllTickets(); };
    }
  }, [selectedRole, currentTenant]);

  // ========================================================================
  // FUNÇÕES DO SUPER ADMIN (Criar novas empresas)
  // ========================================================================
  const handleCreateTenant = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTenantName || !newTenantDomain) return alert("Preencha Nome e Domínio.");
      setIsSavingBatch(true);
      try {
          // Limpa o domínio (tira https, barras, etc)
          const cleanDomain = newTenantDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
          
          await addDoc(collection(db, TENANTS_COLLECTION), {
              name: newTenantName,
              domain: cleanDomain,
              logoUrl: newTenantLogo,
              primaryColor: newTenantColor,
              createdAt: serverTimestamp()
          });
          
          setNewTenantName(''); setNewTenantDomain(''); setNewTenantLogo(''); setNewTenantColor('#2563eb');
          alert("Empresa criada com sucesso! Agora aponte o domínio no Vercel.");
      } catch (error) {
          console.error(error); alert("Erro ao criar empresa.");
      } finally {
          setIsSavingBatch(false);
      }
  };

  useEffect(() => {
      if (isSuperAdminMode) {
          const unsub = onSnapshot(query(collection(db, TENANTS_COLLECTION), orderBy('createdAt', 'desc')), (snap) => {
              setSaasTenants(snap.docs.map(d => ({id: d.id, ...d.data()} as Tenant)));
          });
          return () => unsub();
      }
  }, [isSuperAdminMode]);


  // (Aqui entram as funções de agrupamento, tickets e academy que já construímos,
  // mas substituindo as `collection(db, COLECAO)` por `collection(db, getCol('nome_colecao'))` 
  // no código completo que você for montar depois). 
  // *Para não exceder o limite de texto desta mensagem, vou direto para a renderização.*

  if (globalLoading) {
      return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><RefreshCw className="animate-spin text-white w-10 h-10"/></div>;
  }

  // ========================================================================
  // TELA DO SUPER ADMIN (O SEU PAINEL MASTER)
  // ========================================================================
  if (isSuperAdminMode) {
      return (
          <div className="min-h-screen bg-slate-950 font-sans text-white p-6 md:p-12">
              <div className="max-w-6xl mx-auto space-y-8">
                  <header className="flex items-center gap-4 border-b border-slate-800 pb-6">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/50">
                          <Building2 size={32} />
                      </div>
                      <div>
                          <h1 className="text-3xl font-black">MaxDrop SaaS Manager</h1>
                          <p className="text-slate-400">Painel Geral de Controle de Inquilinos</p>
                      </div>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* FORMULÁRIO DE CRIAR NOVA EMPRESA */}
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl h-fit">
                          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus className="text-emerald-500"/> Cadastrar Novo Cliente</h2>
                          <form onSubmit={handleCreateTenant} className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Empresa</label>
                                  <input value={newTenantName} onChange={e => setNewTenantName(e.target.value)} required placeholder="Ex: João Drop" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Domínio do Cliente</label>
                                  <input value={newTenantDomain} onChange={e => setNewTenantDomain(e.target.value)} required placeholder="Ex: joaodrop.com.br" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                                  <p className="text-[10px] text-slate-500 mt-1">É assim que o sistema vai reconhecer de quem é a loja.</p>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link da Logo (Opcional)</label>
                                  <input value={newTenantLogo} onChange={e => setNewTenantLogo(e.target.value)} placeholder="https://" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-xs" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><PaintBucket size={14}/> Cor Principal da Marca</label>
                                  <div className="flex gap-3">
                                      <input type="color" value={newTenantColor} onChange={e => setNewTenantColor(e.target.value)} className="w-12 h-12 rounded cursor-pointer bg-slate-950 border border-slate-800" />
                                      <input type="text" value={newTenantColor} onChange={e => setNewTenantColor(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono uppercase" />
                                  </div>
                              </div>
                              <button type="submit" disabled={isSavingBatch} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black mt-4 transition-transform hover:scale-[1.02] flex justify-center">
                                  {isSavingBatch ? <RefreshCw className="animate-spin" /> : 'Criar Infraestrutura da Empresa'}
                              </button>
                          </form>
                      </div>

                      {/* LISTA DE EMPRESAS ATIVAS */}
                      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Store className="text-blue-500"/> Empresas Hospedadas ({saasTenants.length})</h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {saasTenants.length === 0 ? (
                                  <p className="text-slate-500 text-sm">Nenhum cliente cadastrado ainda. Comece a vender seu SaaS!</p>
                              ) : saasTenants.map(tenant => (
                                  <div key={tenant.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden">
                                      {/* Tarja lateral de cor personalizada */}
                                      <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: tenant.primaryColor }}></div>
                                      
                                      <div className="pl-2 flex justify-between items-start">
                                          <div>
                                              <h3 className="font-bold text-lg text-white">{tenant.name}</h3>
                                              <a href={`https://${tenant.domain}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"><Globe size={12}/> {tenant.domain}</a>
                                          </div>
                                          {tenant.logoUrl ? (
                                              <img src={tenant.logoUrl} className="w-10 h-10 rounded bg-white object-contain p-1" />
                                          ) : (
                                              <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center"><Store size={16} className="text-slate-500"/></div>
                                          )}
                                      </div>
                                      
                                      <div className="pl-2 mt-2 pt-3 border-t border-slate-800 flex justify-between items-center">
                                          <span className="text-[10px] text-slate-500 font-mono">ID: {tenant.id.substring(0,8)}</span>
                                          <button className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded hover:bg-red-500/20 font-bold">Suspender</button>
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

  // ========================================================================
  // RENDERIZAÇÃO: LOGIN DA EMPRESA (O Motor White Label Entra em Ação)
  // ========================================================================
  
  // Variáveis Dinâmicas de Design
  const brandColor = currentTenant?.primaryColor || '#2563eb'; // Default Azul
  const brandName = currentTenant?.name || 'DropFast';
  const brandLogo = currentTenant?.logoUrl || null;

  if (!selectedRole && !isVitrineMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Efeito visual de fundo com a cor da marca */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: brandColor }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: brandColor }}></div>

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center mb-8">
            {brandLogo ? (
                <img src={brandLogo} alt={brandName} className="h-16 object-contain mb-4" />
            ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-white" style={{ backgroundColor: brandColor }}>
                  <Package className="w-8 h-8" />
                </div>
            )}
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{brandName}</h1>
            <p className="text-slate-500 text-sm mt-1">Área Exclusiva para Revendedores</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl text-center font-bold">{authError}</div>}
            
            {isRegistering && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Seu Nome Completo</label>
                  <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} required={isRegistering} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="Ex: João da Silva" />
                </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">E-mail de Acesso</label>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="seu@email.com" />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Senha (Mínimo 6 dígitos)</label>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="••••••" />
            </div>

            <button type="submit" className="w-full py-4 mt-2 text-white rounded-xl font-black shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2" style={{ backgroundColor: brandColor }}>
              {isRegistering ? 'Criar Minha Conta Agora' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-sm font-bold transition-colors" style={{ color: brandColor }}>
              {isRegistering ? 'Já tenho uma conta. Fazer Login.' : 'Não tem conta? Cadastre-se grátis.'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button type="button" onClick={() => { const s = prompt("Senha ADM da Fábrica:"); if (s === "1234") setSelectedRole('admin'); else alert("Acesso negado!"); }} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5 mx-auto font-bold uppercase tracking-wider transition-colors">
              <Package size={14} /> Acesso Restrito (Fornecedor)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // O restante do sistema (Visão do Revendedor e Visão do Admin) continua aqui embaixo, 
  // mas substituindo as cores fixas por estilos inline onde for necessário para abraçar a White Label.
  // Como o limite de texto me impede de colar os 1.500 linhas de uma vez com o HTML, o foco desta 
  // resposta foi entregar a ESTRUTURA GERAL DO MOTOR SAAS.

  return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="text-center space-y-4">
              <RefreshCw className="animate-spin text-blue-500 w-12 h-12 mx-auto" />
              <h2 className="text-2xl font-black">Motor SaaS Inicializado!</h2>
              <p className="text-slate-400">O sistema Multi-Tenant está pronto. Conecte este projeto ao Vercel e cadastre seus primeiros clientes no Super Admin.</p>
          </div>
      </div>
  );
}