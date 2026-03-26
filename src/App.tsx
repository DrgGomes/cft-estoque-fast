import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, updateDoc, addDoc, deleteDoc, setDoc, getDoc,
  serverTimestamp, query, onSnapshot, writeBatch, limit, increment, where, getDocs, arrayUnion, arrayRemove
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
  Play, Film, GraduationCap, CheckCircle2, Circle, Building2, PaintBucket, ExternalLink, Download, Plug, Send
} from 'lucide-react';

// --- SONS E FUNÇÕES ÚTEIS ---
const SOUNDS = { success: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3", alert: "https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3", magic: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3" };
const playSound = (type: 'success' | 'error' | 'alert' | 'magic') => { try { const audio = new Audio(SOUNDS[type]); audio.volume = 0.5; audio.play().catch(e => console.log("Audio", e)); } catch (e) {} };
const formatCurrency = (value: any) => { const num = Number(value); if (isNaN(num)) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num); };
const getYoutubeId = (url: string) => { if (!url) return null; const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/); return match ? match[1] : null; };
const formatDate = (timestamp: any) => { if (!timestamp) return '...'; if (typeof timestamp.toMillis === 'function') { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp.toMillis()); } return '...'; };
const sortByDateDesc = (a: any, b: any, fieldName: string) => { const tA = a[fieldName]?.toMillis ? a[fieldName].toMillis() : 0; const tB = b[fieldName]?.toMillis ? b[fieldName].toMillis() : 0; return tB - tA; };

const renderDynamicIcon = (iconName: string, size = 24, className = "") => {
  switch (iconName) { case 'MessageCircle': return <MessageCircle size={size} className={className} />; case 'ImageIcon': return <ImageIcon size={size} className={className} />; case 'Video': return <Video size={size} className={className} />; case 'Globe': return <Globe size={size} className={className} />; case 'ShoppingBag': return <ShoppingBag size={size} className={className} />; case 'FileText': return <FileText size={size} className={className} />; case 'Smartphone': return <Smartphone size={size} className={className} />; default: return <Link2 size={size} className={className} />; }
};

// --- CONFIGURAÇÃO FIREBASE ÚNICA DO SAAS ---
const firebaseConfig = { apiKey: "AIzaSyDG8hpJggHKpWBLaILx2WJrD-Jw7XcKvRg", authDomain: "cft-drop---estoque-flash.firebaseapp.com", projectId: "cft-drop---estoque-flash", storageBucket: "cft-drop---estoque-flash.firebasestorage.app", messagingSenderId: "513670906518", appId: "1:513670906518:web:eec3f177a4779f3ddf78b7" };
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);
const TENANTS_COLLECTION = `saas_tenants`;

// Tipos
type Tenant = { id: string; name: string; domain: string; logoUrl: string; primaryColor: string; createdAt?: any; };
type Product = { id: string; sku?: string; barcode?: string; image?: string; name: string; description?: string; color: string; size: string; quantity: number; price: number; updatedAt?: any; };
type VariationRow = { color: string; size: string; sku: string; barcode: string; };
type HistoryItem = { id: string; productId: string; productName: string; sku: string; image: string; type: 'entry' | 'exit' | 'correction'; amount: number; previousQty: number; newQty: number; timestamp: any; };
type PurchaseOrder = { id: string; orderCode: string; supplier: string; status: 'pending' | 'received'; items: { productId: string; sku: string; name: string; quantity: number }[]; totalItems: number; createdAt: any; receivedAt?: any; };
type Notice = { id: string; type: 'text' | 'banner'; title: string; content?: string; imageUrl?: string; createdAt: any; };
type QuickLink = { id: string; title: string; subtitle: string; icon: string; url: string; order: number; createdAt?: any; };
type Showcase = { id: string; name: string; linkId: string; config: { showPrice: boolean; priceMarkup: number; }; models: string[]; createdAt?: any; };
type UserProfile = { id: string; name: string; email: string; role: string; creditBalance: number; completedLessons?: string[]; tenantId: string; shopeeConnected?: boolean; createdAt?: any; };
type SupportTicket = { id: string; userId: string; userName: string; type: 'troca' | 'devolucao'; status: 'pendente' | 'aceito' | 'recusado' | 'aguardando_devolucao' | 'concluido'; productId: string; productInfo: string; productValue: number; reason: string; adminNote?: string; createdAt: any; updatedAt?: any; };
type AcademyLesson = { id: string; season: string; episode: number; title: string; description: string; youtubeUrl: string; bannerUrl: string; materialLinks: string; createdAt: any; };

export default function App() {
  const [globalLoading, setGlobalLoading] = useState(true);
  const urlParams = new URLSearchParams(window.location.search);
  const previewTenantId = urlParams.get('preview'); 
  const vitrineLinkId = urlParams.get('vitrine');
  const isVitrineMode = !!vitrineLinkId;
  
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [saasTenants, setSaasTenants] = useState<Tenant[]>([]);
  
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantDomain, setNewTenantDomain] = useState('');
  const [newTenantLogo, setNewTenantLogo] = useState('');
  const [newTenantColor, setNewTenantColor] = useState('#2563eb');
  
  const currentDomain = window.location.hostname;
  const getCol = (name: string) => `saas_tenants/${currentTenant?.id}/${name}`;

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
  
  const [adminView, setAdminView] = useState<'menu'|'stock'|'add'|'history'|'purchases'|'notices'|'links'|'showcases'|'customers'|'tickets'|'predictive'|'academy'>('menu');
  const [userView, setUserView] = useState<'dashboard'|'catalog'|'support'|'academy'|'integrations'>('dashboard'); // NOVO: Integrações
  
  const prevProductsRef = useRef<Product[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupName: string) => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));

  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const [baseSku, setBaseSku] = useState(''); const [baseName, setBaseName] = useState(''); const [baseDescription, setBaseDescription] = useState(''); const [baseImage, setBaseImage] = useState(''); const [basePrice, setBasePrice] = useState(''); const [colors, setColors] = useState<string[]>([]); const [sizes, setSizes] = useState<string[]>([]); const [tempColor, setTempColor] = useState(''); const [tempSize, setTempSize] = useState(''); const [generatedRows, setGeneratedRows] = useState<VariationRow[]>([]); const [isSavingBatch, setIsSavingBatch] = useState(false); const [editingProduct, setEditingProduct] = useState<Product | null>(null); const [editingGroup, setEditingGroup] = useState<{ oldName: string, name: string, description: string, image: string, price: number, items: Product[] } | null>(null);
  const [noticeType, setNoticeType] = useState<'text' | 'banner'>('text'); const [noticeTitle, setNoticeTitle] = useState(''); const [noticeContent, setNoticeContent] = useState(''); const [noticeImage, setNoticeImage] = useState('');
  const [linkTitle, setLinkTitle] = useState(''); const [linkSubtitle, setLinkSubtitle] = useState(''); const [linkUrl, setLinkUrl] = useState(''); const [linkIcon, setLinkIcon] = useState('Link2'); const [linkOrder, setLinkOrder] = useState('1');
  const [academySeasonMode, setAcademySeasonMode] = useState<'existing' | 'new'>('existing'); const [academySeason, setAcademySeason] = useState(''); const [academyNewSeason, setAcademyNewSeason] = useState(''); const [academyEpisode, setAcademyEpisode] = useState('1'); const [academyTitle, setAcademyTitle] = useState(''); const [academyDesc, setAcademyDesc] = useState(''); const [academyYoutube, setAcademyYoutube] = useState(''); const [academyBanner, setAcademyBanner] = useState(''); const [academyLinks, setAcademyLinks] = useState(''); const [activeLesson, setActiveLesson] = useState<AcademyLesson | null>(null);
  const [editingShowcase, setEditingShowcase] = useState<Partial<Showcase> | null>(null); const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [ticketType, setTicketType] = useState<'troca' | 'devolucao'>('troca'); const [ticketReturnProductId, setTicketReturnProductId] = useState(''); const [ticketDesiredProductId, setTicketDesiredProductId] = useState(''); const [ticketReason, setTicketReason] = useState(''); const [ticketValue, setTicketValue] = useState(0);

  const [isShopeeSimulating, setIsShopeeSimulating] = useState(false); // Estado para o botão da Shopee

  useEffect(() => {
    const fetchTenant = async () => {
      if (previewTenantId) {
        const docRef = doc(db, TENANTS_COLLECTION, previewTenantId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { setCurrentTenant({ id: docSnap.id, ...docSnap.data() } as Tenant); setIsSuperAdminMode(false); } 
        else { alert("Erro no Preview: Empresa não encontrada."); setIsSuperAdminMode(true); }
        setGlobalLoading(false); return;
      }
      const q = query(collection(db, TENANTS_COLLECTION), where("domain", "==", currentDomain));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) { setCurrentTenant({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Tenant); setIsSuperAdminMode(false); } 
      else { setIsSuperAdminMode(true); }
      setGlobalLoading(false);
    };
    fetchTenant();
  }, [currentDomain, previewTenantId]);

  useEffect(() => {
    if (!currentTenant) return;
    const unsubProducts = onSnapshot(collection(db, getCol('products')), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      items.sort((a, b) => sortByDateDesc(a, b, 'updatedAt'));
      prevProductsRef.current = items; setProducts(items); setFilteredProducts(items); setLoading(false);
    });

    if (!isVitrineMode) {
        const unsubNotices = onSnapshot(collection(db, getCol('notices')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as Notice)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setNotices(items); });
        const unsubLinks = onSnapshot(collection(db, getCol('quickLinks')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as QuickLink)); items.sort((a, b) => a.order - b.order); setQuickLinks(items); });
        const unsubShowcases = onSnapshot(collection(db, getCol('showcases')), (snap) => setShowcases(snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase))));
        const unsubAcademy = onSnapshot(collection(db, getCol('academy')), (snap) => setLessons(snap.docs.map(d => ({id: d.id, ...d.data()} as AcademyLesson))));
        return () => { unsubProducts(); unsubNotices(); unsubLinks(); unsubShowcases(); unsubAcademy(); };
    } else {
        const unsubShowcases = onSnapshot(collection(db, getCol('showcases')), (snap) => { const allVitrines = snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase)); setPublicVitrine(allVitrines.find(v => v.linkId === vitrineLinkId) || null); });
        return () => { unsubProducts(); unsubShowcases(); };
    }
  }, [currentTenant, loading, isVitrineMode, vitrineLinkId]);

  useEffect(() => {
     if (user && selectedRole === 'user' && currentTenant) {
         const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => { if (docSnap.exists()) setUserProfile({ id: docSnap.id, completedLessons: [], shopeeConnected: false, ...docSnap.data() } as UserProfile); });
         const unsubMyTickets = onSnapshot(collection(db, getCol('tickets')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setMyTickets(items.filter(t => t.userId === user.uid)); });
         return () => { unsubProfile(); unsubMyTickets(); };
     }
  }, [user, selectedRole, currentTenant]);

  useEffect(() => {
    if (searchTerm.trim() === '') { setFilteredProducts(products); } 
    else { const lowerTerm = searchTerm.toLowerCase(); setFilteredProducts(products.filter(p => { const name = String(p.name || '').toLowerCase(); const sku = String(p.sku || '').toLowerCase(); return name.includes(lowerTerm) || sku.includes(lowerTerm); })); }
  }, [searchTerm, products]);

  // Agrupamento
  const groupProducts = (items: Product[]) => { 
      const groups: Record<string, { info: Product, total: number, items: Product[] }> = {}; 
      if (!items || !Array.isArray(items)) return groups;
      items.forEach(product => { 
          if (!product) return; const key = String(product.name || 'Sem Nome');
          if (!groups[key]) groups[key] = { info: product, total: 0, items: [] }; 
          groups[key].items.push(product); groups[key].total += Number(product.quantity || 0);
      }); 
      Object.values(groups).forEach(group => group.items.sort((a, b) => (String(a.size || '') > String(b.size || '') ? 1 : -1))); 
      return groups; 
  };
  const groupedProducts = groupProducts(filteredProducts);

  // --- EXPORTAÇÃO UPSELLER ---
  const handleExportToUpSeller = (groupName: string, groupData: any) => {
      let csvContent = "\uFEFF"; 
      const headerRow = `"SPU*\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)","SKU*\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)","Título*\n(Obrigatório, 1-500 caracteres)","Apelido do Produto\n(1-500 caracteres)","Usar apelido como título da NFe","Variantes1*\n(Obrigatório, 1-14 caracteres)","Valor da Variante1*\n(Obrigatório, 1-30 caracteres)","Variantes2\n(limite 1-14 caracteres)","Valor da Variante2\n(limite 1-30 caracteres)","Variantes3\n(limite 1-14 caracteres)","Valor da Variante3\n(limite 1-30 caracteres)","Variantes4\n(limite 1-14 caracteres)","Valor da Variante4\n(limite 1-30 caracteres)","Variantes5\n(limite 1-14 caracteres)","Valor da Variante5\n(limite 1-30 caracteres)","Preço de varejo\n(limite 0-999999999)","Custo de Compra\n(limite 0-999999999)","Quantidade\n(limite 0-999999999, Se não for preenchido, não será registrado na Lista de Estoque)","N° do Estante\n(Apenas estantes existentes, serão filtrados se o estante selecionado estiver cheio ou ficará cheio após a importação)","Código de Barras\n(Limite de 8 a 14 caracteres, separe vários códigos de barras com vírgulas)","Apelido de SKU\n（Limite a letras, números e caracteres especiais; separe vários apelidos de SKU com vírgulas; máximo de 20 entradas）","Imagem","Peso (g)\n(limite 1-999999)","Comprimento (cm)\n(limite 1-999999)","Largura (cm)\n(limite 1-999999)","Altura (cm)\n(limite 1-999999)","NCM\n(limite 8 dígitos)","CEST\n(limite 7 dígitos)","Unidade\n(Selecionar UN/KG/Par)","Origem\n(Selecionar 0/1/2/3/4/5/6/7/8)","Link do Fornecedor"`;
      csvContent += headerRow + "\n";

      groupData.items.forEach((p: Product) => {
          const skuPai = p.sku ? p.sku.split('-')[0] : 'SKU';
          const desc = p.description || '';
          const tituloCompleto = desc ? `${p.name} - ${desc}` : p.name;
          const safeTitulo = tituloCompleto.replace(/"/g, '""'); 
          
          const row = [ `"${skuPai}"`, `"${p.sku || ''}"`, `"${safeTitulo}"`, `""`, `"N"`, `"Cor"`, `"${p.color || ''}"`, `"Tamanho"`, `"${p.size || ''}"`, `""`,`""`, `""`,`""`, `""`,`""`, `${p.price || 0}`, `${p.price || 0}`, `200`, `""`, `"${p.barcode || ''}"`, `""`, `"${p.image || ''}"`, `800`, `33`, `12`, `19`, `""`, `""`, `"UN"`, `"0"`, `""` ].join(',');
          csvContent += row + "\n";
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `UpSeller_${groupName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link); playSound('magic');
  };

  // --- NOVA FUNÇÃO: SIMULAR CONEXÃO SHOPEE ---
  const handleConnectShopee = async () => {
      if (!user) return;
      setIsShopeeSimulating(true);
      // Simula o tempo que levaria o OAuth2
      setTimeout(async () => {
          await updateDoc(doc(db, 'users', user.uid), { shopeeConnected: true });
          setIsShopeeSimulating(false);
          playSound('success');
          alert("Shopee Conectada com Sucesso! Agora você pode enviar produtos direto pelo catálogo.");
      }, 2000);
  };

  const handleDisconnectShopee = async () => {
      if (!user) return;
      if(confirm("Deseja desconectar sua loja Shopee?")) {
          await updateDoc(doc(db, 'users', user.uid), { shopeeConnected: false });
      }
  };

  const handlePublishToShopee = (groupName: string) => {
      if (!userProfile?.shopeeConnected) {
          alert("Você precisa conectar sua loja Shopee na aba 'Integrações' primeiro!");
          setUserView('integrations');
          return;
      }
      if(confirm(`Deseja publicar o modelo ${groupName} com todas as suas variações na sua loja Shopee?`)) {
          alert("Sincronizando com a API da Shopee... Isso pode levar alguns minutos. (Modo Simulação)");
          playSound('magic');
      }
  };

  // Login e afins omitidos para brevidade da explicação (já estão corretos no código anterior)
  const handleAuth = async (e: React.FormEvent) => { e.preventDefault(); setAuthError(''); if(!currentTenant) return setAuthError('Domínio não cadastrado no sistema.'); try { if (isRegistering) { if(!authName) return setAuthError('Preencha seu nome.'); const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword); await setDoc(doc(db, 'users', userCredential.user.uid), { name: authName, email: authEmail, role: 'revendedor', creditBalance: 0, tenantId: currentTenant.id, shopeeConnected: false, createdAt: serverTimestamp() }); setSelectedRole('user'); playSound('success'); } else { await signInWithEmailAndPassword(auth, authEmail, authPassword); setSelectedRole('user'); playSound('success'); } } catch (err: any) { setAuthError('Erro: E-mail ou senha incorretos.'); playSound('error'); } };
  const handleLogout = async () => { await signOut(auth); setSelectedRole(null); setUserView('dashboard'); setAdminView('menu'); setUserProfile(null); };

  if (globalLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500 w-12 h-12"/></div>;
  if (isSuperAdminMode) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Logado como Super Admin</div>;

  const brandColor = currentTenant?.primaryColor || '#2563eb'; 
  const brandName = currentTenant?.name || 'DropFast';
  const brandLogo = currentTenant?.logoUrl || null;

  if (!selectedRole && !isVitrineMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {previewTenantId && (<div className="absolute top-4 left-4 bg-yellow-500 text-black font-black text-xs px-3 py-1 rounded shadow-lg uppercase z-50 animate-pulse">Modo Preview</div>)}
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
            {isRegistering && (<div className="animate-in slide-in-from-top-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Seu Nome Completo</label><input type="text" value={authName} onChange={e => setAuthName(e.target.value)} required={isRegistering} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="Ex: João da Silva" /></div>)}
            <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">E-mail de Acesso</label><input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="seu@email.com" /></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Senha (Mínimo 6 dígitos)</label><input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} placeholder="••••••" /></div>
            <button type="submit" className="w-full py-4 mt-2 text-white rounded-xl font-black shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2" style={{ backgroundColor: brandColor }}>{isRegistering ? 'Criar Minha Conta Agora' : 'Entrar no Sistema'}</button>
          </form>
          <div className="mt-6 text-center"><button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-sm font-bold transition-colors" style={{ color: brandColor }}>{isRegistering ? 'Já tenho uma conta. Fazer Login.' : 'Não tem conta? Cadastre-se grátis.'}</button></div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: REVENDEDOR LOGADO
  // ==========================================
  if (selectedRole === 'user') {
    return (
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
        <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex h-screen sticky top-0">
          <div className="p-6 text-center border-b border-slate-800">
            {brandLogo ? (<img src={brandLogo} className="h-10 mx-auto object-contain mb-2" alt="Logo"/>) : (<h1 className="text-2xl font-black flex items-center justify-center gap-2" style={{ color: brandColor }}><RefreshCw size={24} /> {brandName}</h1>)}
            <p className="text-xs text-slate-400 mt-1">Olá, {userProfile?.name?.split(' ')[0] || 'Revendedor'}</p>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto hidden-scroll">
            <button onClick={() => setUserView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'dashboard' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'dashboard' ? {backgroundColor: brandColor} : {}}><Layers size={20} /> Visão Geral</button>
            <button onClick={() => setUserView('catalog')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'catalog' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'catalog' ? {backgroundColor: brandColor} : {}}><LayoutGrid size={20} /> Catálogo</button>
            <button onClick={() => setUserView('integrations')} className={`w-full flex items-center justify-between p-3 rounded-xl font-medium transition-all ${userView === 'integrations' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'integrations' ? {backgroundColor: brandColor} : {}}>
                <div className="flex items-center gap-3"><Plug size={20} /> Integrações</div>
                {userProfile?.shopeeConnected && <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>}
            </button>
            <button onClick={() => setUserView('support')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'support' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'support' ? {backgroundColor: brandColor} : {}}><Ticket size={20} /> Suporte / Trocas</button>
          </nav>
          <div className="p-4 mx-4 mb-4 bg-slate-800 rounded-xl border border-slate-700 text-center"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-center gap-1"><Wallet size={12}/> Seu Crédito</p><p className="text-xl font-black text-green-400">{formatCurrency(userProfile?.creditBalance || 0)}</p></div>
          <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2"><LogOut size={20} /> Sair</button></div>
        </aside>

        <main className={`flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50 text-slate-800`}>
          <header className={`bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100`}>
            <div className="flex items-center gap-3">
              <div className={`md:hidden p-2 rounded-lg text-white`} style={{backgroundColor: brandColor}}><RefreshCw size={20} /></div>
              <div><h2 className={`text-xl font-bold hidden md:block text-slate-800`}>{userView === 'dashboard' ? 'Dashboard' : userView === 'catalog' ? 'Catálogo de Produtos' : userView === 'integrations' ? 'App & Integrações' : 'Central de Resoluções'}</h2></div>
            </div>
          </header>

          <div className={`p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full pb-24 md:pb-6`}>
            
            {/* TELA DE INTEGRAÇÕES (SHOPEE) */}
            {userView === 'integrations' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center shrink-0">
                            <Store className="text-orange-500" size={32}/>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Sincronização Shopee</h2>
                            <p className="text-slate-500 text-sm">Conecte sua loja e publique produtos do nosso catálogo com apenas um clique.</p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto">
                        <img src="https://logospng.org/download/shopee/logo-shopee-icon-1024.png" className="w-24 h-24 mx-auto mb-6 object-contain" alt="Shopee Logo" />
                        
                        {userProfile?.shopeeConnected ? (
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm border border-green-200">
                                    <CheckCircle2 size={18}/> Loja Conectada com Sucesso
                                </div>
                                <p className="text-slate-500 mb-6">A sua loja na Shopee já está sincronizada com o nosso sistema. Você pode ir no Catálogo e usar o botão "Publicar na Shopee" para enviar os produtos direto para o seu estoque.</p>
                                <button onClick={handleDisconnectShopee} className="text-sm font-bold text-red-500 hover:text-red-700 underline">Desconectar Loja</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-slate-800">Pronto para acelerar suas vendas?</h3>
                                <p className="text-slate-500 text-sm mb-6">Ao clicar em conectar, você será redirecionado para a plataforma da Shopee para autorizar o nosso sistema a criar anúncios para você.</p>
                                <button onClick={handleConnectShopee} disabled={isShopeeSimulating} className="w-full md:w-auto px-8 py-4 bg-[#ee4d2d] hover:bg-[#d74326] text-white rounded-xl font-black shadow-lg shadow-orange-500/30 transition-transform hover:scale-105 flex items-center justify-center gap-3 mx-auto">
                                    {isShopeeSimulating ? <RefreshCw className="animate-spin" size={20} /> : <Plug size={20} />} 
                                    {isShopeeSimulating ? 'Autenticando na Shopee...' : 'Conectar Loja Shopee Agora'}
                                </button>
                                <p className="text-[10px] text-slate-400 mt-4">*Funcionalidade em fase de testes (Simulação API)</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- VIEW: CATÁLOGO --- */}
            {userView === 'catalog' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-6">
                 <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input type="text" placeholder="Buscar modelo, cor ou SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 text-lg" style={{'--tw-ring-color':brandColor} as any} />
                 </div>
                 
                 <div>
                   {loading ? (
                       <p className="text-center text-slate-400">Carregando catálogo...</p>
                   ) : Object.keys(groupedProducts).length === 0 ? (
                       <p className="text-center text-slate-400 py-10">Nenhum produto encontrado.</p>
                   ) : (
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                           {Object.entries(groupedProducts).map(([name, group]) => (
                               <div key={name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition duration-300">
                                   <div onClick={() => toggleGroup(name)} className="aspect-square bg-slate-100 relative cursor-pointer overflow-hidden group">
                                       {group.info.image ? (<img src={group.info.image} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300 w-12 h-12" /></div>)}
                                   </div>
                                   
                                   <div onClick={() => toggleGroup(name)} className="p-4 flex-1 cursor-pointer flex flex-col justify-between">
                                       <div>
                                           <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{String(name)}</h3>
                                           <span className="text-xs font-bold text-slate-400">{group.info.sku ? String(group.info.sku).split('-')[0] : ''}</span>
                                       </div>
                                       <div className="mt-3 flex items-center justify-between">
                                           <span className="text-lg font-black text-green-600">{formatCurrency(group.info.price || 0)}</span>
                                           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedGroups[name] ? 'text-white' : 'bg-slate-100 text-slate-400'}`} style={expandedGroups[name] ? {backgroundColor: brandColor} : {}}>
                                              {expandedGroups[name] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                           </div>
                                       </div>
                                   </div>

                                   {expandedGroups[name] && (
                                       <div className="bg-slate-50 border-t border-slate-100 p-3 max-h-80 overflow-y-auto hidden-scroll animate-in slide-in-from-top-2 flex flex-col justify-between">
                                           <div>
                                               <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Cores e Numerações</p>
                                               <div className="flex flex-wrap gap-2 mb-4">
                                                   {group.items.map(p => (
                                                       <div key={p.id} className="flex items-center justify-between bg-white p-2 w-full rounded-xl border border-slate-200 shadow-sm">
                                                           <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase">{String(p.color || '')}</span><span className="text-sm font-black text-slate-800">{String(p.size || '')}</span></div>
                                                           <div>{Number(p.quantity) > 4 ? (<span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded shadow-sm">Em Estoque</span>) : (<span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded shadow-sm">Zerado</span>)}</div>
                                                       </div>
                                                   ))}
                                               </div>
                                           </div>
                                           
                                           {/* BOTÕES DE EXPORTAÇÃO E INTEGRAÇÃO */}
                                           <div className="space-y-2 mt-auto">
                                                <button onClick={(e) => { e.stopPropagation(); handlePublishToShopee(name); }} className="w-full bg-[#ee4d2d] hover:bg-[#d74326] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs shadow-md">
                                                    <Send size={16}/> Publicar na Shopee
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleExportToUpSeller(name, group); }} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs shadow-md">
                                                    <Download size={16}/> Baixar P/ UpSeller
                                                </button>
                                           </div>
                                       </div>
                                   )}
                               </div>
                           ))}
                       </div>
                   )}
                 </div>
              </div>
            )}
          </div>
        </main>
        
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <button onClick={() => setUserView('dashboard')} className={`flex flex-col items-center gap-1 ${userView === 'dashboard' ? '' : 'text-slate-400'}`} style={userView === 'dashboard' ? {color: brandColor} : {}}><Layers size={20} /><span className="text-[10px] font-bold">Início</span></button>
          <button onClick={() => setUserView('catalog')} className={`flex flex-col items-center gap-1 ${userView === 'catalog' ? '' : 'text-slate-400'}`} style={userView === 'catalog' ? {color: brandColor} : {}}><LayoutGrid size={20} /><span className="text-[10px] font-bold">Catálogo</span></button>
          <button onClick={() => setUserView('integrations')} className={`flex flex-col items-center gap-1 relative ${userView === 'integrations' ? '' : 'text-slate-400'}`} style={userView === 'integrations' ? {color: brandColor} : {}}>
             <Plug size={20} />
             {userProfile?.shopeeConnected && <span className="absolute top-0 right-3 w-2 h-2 bg-green-500 rounded-full"></span>}
             <span className="text-[10px] font-bold">Conectar</span>
          </button>
          <button onClick={() => setUserView('support')} className={`flex flex-col items-center gap-1 ${userView === 'support' ? '' : 'text-slate-400'}`} style={userView === 'support' ? {color: brandColor} : {}}><Ticket size={20} /><span className="text-[10px] font-bold">Trocas</span></button>
        </nav>
      </div>
    );
  }
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Área Admin (Reduzida na demonstração visual)</div>;
}