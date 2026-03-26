import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, updateDoc, addDoc, deleteDoc, setDoc, getDoc,
  serverTimestamp, query, onSnapshot, writeBatch, where, getDocs, arrayUnion, arrayRemove
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
  Play, Film, GraduationCap, CheckCircle2, Circle, Building2, PaintBucket, ExternalLink, Download, Plug, Send, Box
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- SONS ---
const SOUNDS = {
  success: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  alert: "https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3",
  magic: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"
};

const playSound = (type: 'success' | 'error' | 'alert' | 'magic') => { try { const audio = new Audio(SOUNDS[type]); audio.volume = 0.5; audio.play().catch(e => console.log("Audio", e)); } catch (e) {} };
const formatCurrency = (value: any) => { const num = Number(value); if (isNaN(num)) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num); };
const getYoutubeId = (url: string) => { if (!url) return null; const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/); return match ? match[1] : null; };

const formatDate = (timestamp: any) => {
    if (!timestamp) return '...';
    if (typeof timestamp.toMillis === 'function') {
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp.toMillis());
    }
    return '...';
};

const sortByDateDesc = (a: any, b: any, fieldName: string) => {
    const tA = a[fieldName]?.toMillis ? a[fieldName].toMillis() : 0;
    const tB = b[fieldName]?.toMillis ? b[fieldName].toMillis() : 0;
    return tB - tA;
};

const renderDynamicIcon = (iconName: string, size = 24, className = "") => {
  switch (iconName) {
    case 'MessageCircle': return <MessageCircle size={size} className={className} />;
    case 'ImageIcon': return <ImageIcon size={size} className={className} />;
    case 'Video': return <Video size={size} className={className} />;
    case 'Globe': return <Globe size={size} className={className} />;
    case 'ShoppingBag': return <ShoppingBag size={size} className={className} />;
    case 'FileText': return <FileText size={size} className={className} />;
    case 'Smartphone': return <Smartphone size={size} className={className} />;
    default: return <Link2 size={size} className={className} />;
  }
};

// --- CONFIGURAÇÃO FIREBASE ÚNICA DO SAAS ---
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

const TENANTS_COLLECTION = `saas_tenants`;

// Tipos
type Tenant = { id: string; name: string; domain: string; logoUrl: string; primaryColor: string; createdAt?: any; };
type Product = { id: string; sku?: string; barcode?: string; image?: string; name: string; description?: string; color: string; size: string; quantity: number; price: number; weight?: number; length?: number; width?: number; height?: number; ncm?: string; cest?: string; updatedAt?: any; };
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
  
  // --- MOTOR MULTI-TENANT E PREVIEW ---
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

  // --- ESTADOS DO SISTEMA ---
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
  const [userView, setUserView] = useState<'dashboard'|'catalog'|'support'|'academy'|'integrations'>('dashboard');
  
  const prevProductsRef = useRef<Product[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupName: string) => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));

  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Estados Admin - Produtos
  const [baseSku, setBaseSku] = useState('');
  const [baseName, setBaseName] = useState('');
  const [baseDescription, setBaseDescription] = useState(''); 
  const [baseImage, setBaseImage] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [tempColor, setTempColor] = useState('');
  const [tempSize, setTempSize] = useState('');
  
  const [baseWeight, setBaseWeight] = useState('800');
  const [baseLength, setBaseLength] = useState('33');
  const [baseWidth, setBaseWidth] = useState('12');
  const [baseHeight, setBaseHeight] = useState('19');
  const [baseNcm, setBaseNcm] = useState('');
  const [baseCest, setBaseCest] = useState('');

  const [generatedRows, setGeneratedRows] = useState<VariationRow[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ oldName: string, name: string, description: string, image: string, price: number, weight: number, length: number, width: number, height: number, ncm: string, cest: string, items: Product[] } | null>(null);

  const [noticeType, setNoticeType] = useState<'text' | 'banner'>('text'); const [noticeTitle, setNoticeTitle] = useState(''); const [noticeContent, setNoticeContent] = useState(''); const [noticeImage, setNoticeImage] = useState('');
  const [linkTitle, setLinkTitle] = useState(''); const [linkSubtitle, setLinkSubtitle] = useState(''); const [linkUrl, setLinkUrl] = useState(''); const [linkIcon, setLinkIcon] = useState('Link2'); const [linkOrder, setLinkOrder] = useState('1');
  const [academySeasonMode, setAcademySeasonMode] = useState<'existing' | 'new'>('existing'); const [academySeason, setAcademySeason] = useState(''); const [academyNewSeason, setAcademyNewSeason] = useState(''); const [academyEpisode, setAcademyEpisode] = useState('1'); const [academyTitle, setAcademyTitle] = useState(''); const [academyDesc, setAcademyDesc] = useState(''); const [academyYoutube, setAcademyYoutube] = useState(''); const [academyBanner, setAcademyBanner] = useState(''); const [academyLinks, setAcademyLinks] = useState(''); const [activeLesson, setActiveLesson] = useState<AcademyLesson | null>(null);
  const [editingShowcase, setEditingShowcase] = useState<Partial<Showcase> | null>(null); const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [ticketType, setTicketType] = useState<'troca' | 'devolucao'>('troca'); const [ticketReturnProductId, setTicketReturnProductId] = useState(''); const [ticketDesiredProductId, setTicketDesiredProductId] = useState(''); const [ticketReason, setTicketReason] = useState('');

  const [isShopeeSimulating, setIsShopeeSimulating] = useState(false);

  // ========================================================================
  // EFEITOS
  // ========================================================================
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
    if (selectedRole === 'admin' && currentTenant) {
      const unsubHist = onSnapshot(collection(db, getCol('history')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as HistoryItem)); items.sort((a, b) => sortByDateDesc(a, b, 'timestamp')); setHistory(items.slice(0, 300)); });
      const unsubPurch = onSnapshot(collection(db, getCol('purchases')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as PurchaseOrder)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setPurchases(items); });
      const unsubUsers = onSnapshot(query(collection(db, 'users'), where('tenantId', '==', currentTenant.id)), (snap) => { setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)).filter(u => u.role === 'revendedor')); });
      const unsubAllTickets = onSnapshot(collection(db, getCol('tickets')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setAllTickets(items); });
      return () => { unsubHist(); unsubPurch(); unsubUsers(); unsubAllTickets(); };
    }
  }, [selectedRole, currentTenant]);

  useEffect(() => {
    if (isSuperAdminMode) {
      const unsub = onSnapshot(collection(db, TENANTS_COLLECTION), (snap) => { 
        const items = snap.docs.map(d => ({id: d.id, ...d.data()} as Tenant));
        items.sort((a, b) => sortByDateDesc(a, b, 'createdAt'));
        setSaasTenants(items); 
      }); 
      return () => unsub(); 
    } 
  }, [isSuperAdminMode]);

  useEffect(() => {
    if (searchTerm.trim() === '') { setFilteredProducts(products); } 
    else { const lowerTerm = searchTerm.toLowerCase(); setFilteredProducts(products.filter(p => { const name = String(p.name || '').toLowerCase(); const sku = String(p.sku || '').toLowerCase(); return name.includes(lowerTerm) || sku.includes(lowerTerm); })); }
  }, [searchTerm, products]);

  useEffect(() => { const newRows: VariationRow[] = []; colors.forEach(color => { sizes.forEach(size => { const cleanSku = baseSku.toUpperCase().replace(/\s+/g, ''); const cleanColor = color.toUpperCase(); const cleanSize = size.toUpperCase().replace(/\s+/g, ''); const autoSku = cleanSku && cleanColor && cleanSize ? `${cleanSku}-${cleanColor}-${cleanSize}` : ''; const existingRow = generatedRows.find(r => r.color === color && r.size === size); newRows.push({ color, size, sku: autoSku, barcode: existingRow ? existingRow.barcode : '' }); });}); setGeneratedRows(newRows); }, [colors, sizes, baseSku]);

  // ==========================================
  // LÓGICA DE AGRUPAMENTO (COR -> TAMANHO)
  // ==========================================
  const groupProducts = (items: Product[]) => { 
      const groups: Record<string, { info: Product, total: number, items: Product[] }> = {}; 
      if (!items || !Array.isArray(items)) return groups;
      items.forEach(product => { 
          if (!product) return; const key = String(product.name || 'Sem Nome');
          if (!groups[key]) groups[key] = { info: product, total: 0, items: [] }; 
          groups[key].items.push(product); groups[key].total += Number(product.quantity || 0);
      }); 
      Object.values(groups).forEach(group => {
          group.items.sort((a, b) => {
              const colorA = String(a.color || '').toLowerCase(); const colorB = String(b.color || '').toLowerCase();
              if (colorA !== colorB) return colorA.localeCompare(colorB);
              const numA = parseFloat(a.size); const numB = parseFloat(b.size);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return String(a.size || '').localeCompare(String(b.size || ''));
          });
      }); 
      return groups; 
  };
  const groupedProducts = groupProducts(filteredProducts);
  const groupedAdminProducts = groupProducts(filteredProducts);

  const predictiveData = useMemo(() => {
      if (adminView !== 'predictive' || products.length === 0) return null;
      const now = new Date(); const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); const exitStats: Record<string, number> = {};
      history.forEach(h => { if (h.type === 'exit') { const date = h.timestamp?.toMillis ? new Date(h.timestamp.toMillis()) : new Date(); if (date >= thirtyDaysAgo) exitStats[h.productId] = (exitStats[h.productId] || 0) + h.amount; } });
      const insights = products.map(p => { const exits30d = exitStats[p.id] || 0; const velocityPerDay = exits30d / 30; const daysRemaining = velocityPerDay > 0 ? (p.quantity / velocityPerDay) : Infinity; return { ...p, exits30d, velocityPerDay, daysRemaining }; });
      const toProduce = insights.filter(p => (p.daysRemaining <= 15 || p.quantity <= 4) && p.velocityPerDay > 0).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 10);
      const topSellers = [...insights].filter(p => p.exits30d > 0).sort((a, b) => b.exits30d - a.exits30d).slice(0, 10);
      const deadStock = insights.filter(p => p.quantity > 10 && p.exits30d === 0).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
      return { toProduce, topSellers, deadStock, totalExits: Object.values(exitStats).reduce((a,b)=>a+b, 0) };
  }, [adminView, products, history]);

  const academySeasons = useMemo(() => { const seasonsObj: Record<string, AcademyLesson[]> = {}; lessons.forEach(l => { if (!seasonsObj[l.season]) seasonsObj[l.season] = []; seasonsObj[l.season].push(l); }); return Object.entries(seasonsObj).map(([name, eps]) => ({ name, episodes: eps.sort((a,b) => a.episode - b.episode) })).sort((a,b) => a.name.localeCompare(b.name)); }, [lessons]);
  const availableSeasons = useMemo(() => Array.from(new Set(lessons.map(l => l.season))), [lessons]);

  // ==========================================
  // EXPORTAÇÃO UPSELLER 
  // ==========================================
  const handleExportToUpSeller = (groupName: string, groupData: any) => {
      let csvContent = "\uFEFF"; 
      const headerRow = `"SPU*\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)","SKU*\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)","Título*\n(Obrigatório, 1-500 caracteres)","Apelido do Produto\n(1-500 caracteres)","Usar apelido como título da NFe","Variantes1*\n(Obrigatório, 1-14 caracteres)","Valor da Variante1*\n(Obrigatório, 1-30 caracteres)","Variantes2\n(limite 1-14 caracteres)","Valor da Variante2\n(limite 1-30 caracteres)","Variantes3\n(limite 1-14 caracteres)","Valor da Variante3\n(limite 1-30 caracteres)","Variantes4\n(limite 1-14 caracteres)","Valor da Variante4\n(limite 1-30 caracteres)","Variantes5\n(limite 1-14 caracteres)","Valor da Variante5\n(limite 1-30 caracteres)","Preço de varejo\n(limite 0-999999999)","Custo de Compra\n(limite 0-999999999)","Quantidade\n(limite 0-999999999, Se não for preenchido, não será registrado na Lista de Estoque)","N° do Estante\n(Apenas estantes existentes, serão filtrados se o estante selecionado estiver cheio ou ficará cheio após a importação)","Código de Barras\n(Limite de 8 a 14 caracteres, separe vários códigos de barras com vírgulas)","Apelido de SKU\n（Limite a letras, números e caracteres especiais; separe vários apelidos de SKU com vírgulas; máximo de 20 entradas）","Imagem","Peso (g)\n(limite 1-999999)","Comprimento (cm)\n(limite 1-999999)","Largura (cm)\n(limite 1-999999)","Altura (cm)\n(limite 1-999999)","NCM\n(limite 8 dígitos)","CEST\n(limite 7 dígitos)","Unidade\n(Selecionar UN/KG/Par)","Origem\n(Selecionar 0/1/2/3/4/5/6/7/8)","Link do Fornecedor"`;
      csvContent += headerRow + "\n";

      groupData.items.forEach((p: Product) => {
          const skuPai = p.sku ? p.sku.split('-')[0] : 'SKU';
          const desc = p.description || '';
          const tituloCompleto = desc ? `${p.name} - ${desc}` : p.name;
          const safeTitulo = tituloCompleto.replace(/"/g, '""'); 
          
          const row = [ 
              `"${skuPai}"`, `"${p.sku || ''}"`, `"${safeTitulo}"`, `""`, `"N"`, `"Cor"`, `"${p.color || ''}"`, `"Tamanho"`, `"${p.size || ''}"`, 
              `""`,`""`, `""`,`""`, `""`,`""`, 
              `189.90`, `${p.price || 0}`, `500`, `""`, `"${p.barcode || ''}"`, `""`, 
              `"${p.image || ''}"`, 
              `${p.weight || 800}`, `${p.length || 33}`, `${p.width || 12}`, `${p.height || 19}`, 
              `"${p.ncm || ''}"`, `"${p.cest || ''}"`, `"UN"`, `"0"`, `""` 
          ].join(',');
          csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.setAttribute("download", `UpSeller_${groupName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link); playSound('magic');
  };

  const handleConnectShopee = async () => { if (!user) return; setIsShopeeSimulating(true); setTimeout(async () => { await updateDoc(doc(db, 'users', user.uid), { shopeeConnected: true }); setIsShopeeSimulating(false); playSound('success'); alert("Shopee Conectada com Sucesso!"); }, 2000); };
  const handleDisconnectShopee = async () => { if (!user) return; if(confirm("Deseja desconectar sua loja Shopee?")) { await updateDoc(doc(db, 'users', user.uid), { shopeeConnected: false }); } };
  const handlePublishToShopee = (groupName: string) => { if (!userProfile?.shopeeConnected) { alert("Você precisa conectar sua loja Shopee na aba 'Integrações' primeiro!"); setUserView('integrations'); return; } if(confirm(`Deseja publicar o modelo ${groupName}?`)) { alert("Sincronizando com a API da Shopee... (Modo Simulação)"); playSound('magic'); } };

  // ==========================================
  // FUNÇÕES GERAIS E BANCO DE DADOS
  // ==========================================
  useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); }); return () => unsubscribe(); }, []);
  const handleAuth = async (e: React.FormEvent) => { e.preventDefault(); setAuthError(''); if(!currentTenant) return setAuthError('Domínio não cadastrado no sistema.'); try { if (isRegistering) { if(!authName) return setAuthError('Preencha seu nome.'); const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword); await setDoc(doc(db, 'users', userCredential.user.uid), { name: authName, email: authEmail, role: 'revendedor', creditBalance: 0, tenantId: currentTenant.id, shopeeConnected: false, createdAt: serverTimestamp() }); setSelectedRole('user'); playSound('success'); } else { await signInWithEmailAndPassword(auth, authEmail, authPassword); setSelectedRole('user'); playSound('success'); } } catch (err: any) { setAuthError('Erro: E-mail ou senha incorretos.'); playSound('error'); } };
  const handleLogout = async () => { await signOut(auth); setSelectedRole(null); setUserView('dashboard'); setAdminView('menu'); setUserProfile(null); };

  const handleCreateTenant = async (e: React.FormEvent) => { e.preventDefault(); if (!newTenantName || !newTenantDomain) return; setIsSavingBatch(true); try { const cleanDomain = newTenantDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase(); await addDoc(collection(db, TENANTS_COLLECTION), { name: newTenantName, domain: cleanDomain, logoUrl: newTenantLogo, primaryColor: newTenantColor, createdAt: serverTimestamp() }); setNewTenantName(''); setNewTenantDomain(''); setNewTenantLogo(''); setNewTenantColor('#2563eb'); alert("Empresa criada!"); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } };
  
  const handleOpenTicket = async (e: React.FormEvent) => { e.preventDefault(); if(!currentTenant || !user || !userProfile) return; const returnProd = products.find(p => p.id === ticketReturnProductId); if (!returnProd) return alert("Selecione o produto que vai devolver."); let finalProductInfo = ''; let finalValue = returnProd.price || 0; if (ticketType === 'troca') { const desiredProd = products.find(p => p.id === ticketDesiredProductId); if (!desiredProd) return alert("Selecione o produto desejado para a troca."); finalProductInfo = `DEVOLVE: ${returnProd.name} (Cor: ${returnProd.color} | Tam: ${returnProd.size})\nDESEJA: ${desiredProd.name} (Cor: ${desiredProd.color} | Tam: ${desiredProd.size})`; } else { if (!ticketReason) return alert("Preencha o motivo do defeito."); finalProductInfo = `DEVOLVE: ${returnProd.name} (Cor: ${returnProd.color} | Tam: ${returnProd.size})`; } setIsSavingBatch(true); try { await addDoc(collection(db, getCol('tickets')), { userId: user.uid, userName: userProfile.name, type: ticketType, status: 'pendente', productId: returnProd.id, productInfo: finalProductInfo, productValue: finalValue, reason: ticketType === 'devolucao' ? ticketReason : 'Troca Normal', createdAt: serverTimestamp() }); setTicketReturnProductId(''); setTicketDesiredProductId(''); setTicketReason(''); alert("Solicitação enviada!"); playSound('success'); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } };
  const handleAdminTicketAction = async (ticket: SupportTicket, action: 'aceitar_troca' | 'recusar' | 'aceitar_devolucao' | 'recebido_gerar_credito') => { setIsSavingBatch(true); try { const ticketRef = doc(db, getCol('tickets'), ticket.id); if (action === 'aceitar_troca') { await updateDoc(ticketRef, { status: 'aceito', updatedAt: serverTimestamp() }); alert("Troca Aceita!"); } else if (action === 'recusar') { const note = prompt("Motivo da recusa (Opcional):"); await updateDoc(ticketRef, { status: 'recusado', adminNote: note || '', updatedAt: serverTimestamp() }); } else if (action === 'aceitar_devolucao') { await updateDoc(ticketRef, { status: 'aguardando_devolucao', updatedAt: serverTimestamp() }); alert("Devolução autorizada."); } else if (action === 'recebido_gerar_credito') { if (confirm(`Gerar crédito de R$ ${ticket.productValue.toFixed(2)} para ${ticket.userName}?`)) { const batch = writeBatch(db); batch.update(ticketRef, { status: 'concluido', updatedAt: serverTimestamp() }); batch.update(doc(db, 'users', ticket.userId), { creditBalance: increment(ticket.productValue) }); await batch.commit(); playSound('magic'); alert("Crédito gerado!"); } } } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handlePrintTicket = (ticket: SupportTicket) => { const printContent = `<html><head><title>Via de Troca</title><style>body { font-family: sans-serif; padding: 20px; } .box { border: 2px dashed #000; padding: 20px; max-width: 400px; margin: 0 auto; } h2 { text-align: center; margin-top: 0; } p { margin: 8px 0; font-size: 14px; } .line { border-top: 1px solid #ccc; margin: 15px 0; } .sign { margin-top: 40px; text-align: center; }</style></head><body><div class="box"><h2>VIA DE AUTORIZAÇÃO</h2><p><strong>TIPO:</strong> ${ticket.type.toUpperCase()}</p><p><strong>CLIENTE:</strong> ${ticket.userName}</p><p><strong>DADOS:</strong><br/> ${ticket.productInfo.replace(/\n/g, '<br/>')}</p><p><strong>MOTIVO:</strong> ${ticket.reason}</p><div class="line"></div><p><strong>DATA:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p><div class="sign">___________________________________<br/>Assinatura Responsável</div></div></body></html>`; const printWindow = window.open('', '_blank', 'width=600,height=600'); if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 250); } };
  
  const handleSaveAcademy = async (e: React.FormEvent) => { e.preventDefault(); const finalSeason = academySeasonMode === 'new' ? academyNewSeason : academySeason; if (!finalSeason || !academyTitle || !academyYoutube) return; setIsSavingBatch(true); try { await addDoc(collection(db, getCol('academy')), { season: finalSeason, episode: parseInt(academyEpisode) || 1, title: academyTitle, description: academyDesc, youtubeUrl: academyYoutube, bannerUrl: academyBanner, materialLinks: academyLinks, createdAt: serverTimestamp() }); setAcademyTitle(''); setAcademyDesc(''); setAcademyYoutube(''); setAcademyBanner(''); setAcademyLinks(''); setAcademyEpisode(String(parseInt(academyEpisode)+1)); alert("Aula publicada!"); playSound('success'); } catch(e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handleDeleteAcademy = async (id: string) => { if(confirm('Excluir?')) await deleteDoc(doc(db, getCol('academy'), id)); };
  const toggleLessonCompletion = async (lessonId: string) => { if (!user) return; const isCompleted = userProfile?.completedLessons?.includes(lessonId); try { await updateDoc(doc(db, 'users', user.uid), { completedLessons: isCompleted ? arrayRemove(lessonId) : arrayUnion(lessonId) }); } catch (e) { console.error(e); } };
  const handleSaveNotice = async (e: React.FormEvent) => { e.preventDefault(); if (!noticeTitle) return; setIsSavingBatch(true); try { await addDoc(collection(db, getCol('notices')), { type: noticeType, title: noticeTitle, content: noticeContent, imageUrl: noticeType === 'banner' ? noticeImage : '', createdAt: serverTimestamp() }); setNoticeTitle(''); setNoticeContent(''); setNoticeImage(''); alert("Aviso publicado!"); } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handleDeleteNotice = async (id: string) => { if(confirm('Apagar?')) await deleteDoc(doc(db, getCol('notices'), id)); };
  const handleSaveLink = async (e: React.FormEvent) => { e.preventDefault(); if(!linkTitle || !linkUrl) return; setIsSavingBatch(true); try { await addDoc(collection(db, getCol('quickLinks')), { title: linkTitle, subtitle: linkSubtitle, icon: linkIcon, url: linkUrl, order: parseInt(linkOrder) || 1, createdAt: serverTimestamp() }); setLinkTitle(''); setLinkSubtitle(''); setLinkUrl(''); setLinkOrder('1'); alert("Salvo!"); } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handleDeleteLink = async (id: string) => { if(confirm('Apagar?')) await deleteDoc(doc(db, getCol('quickLinks'), id)); };
  const handleSaveShowcase = async (e: React.FormEvent) => { e.preventDefault(); if (!editingShowcase?.name) return; setIsSavingBatch(true); try { const payload = { name: editingShowcase.name, linkId: editingShowcase.linkId || `cat-${Math.random().toString(36).substring(2, 8)}`, config: { showPrice: editingShowcase.config?.showPrice ?? true, priceMarkup: editingShowcase.config?.priceMarkup || 0 }, models: editingShowcase.models || [], createdAt: serverTimestamp() }; if (editingShowcase.id) { await updateDoc(doc(db, getCol('showcases'), editingShowcase.id), payload); } else { await addDoc(collection(db, getCol('showcases')), payload); } setEditingShowcase(null); setAdminView('showcases'); playSound('success'); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } };
  const handleDeleteShowcase = async (id: string) => { if(confirm('Excluir Vitrine?')) await deleteDoc(doc(db, getCol('showcases'), id)); };
  const toggleModelInShowcase = (modelName: string) => { setEditingShowcase(prev => { if (!prev) return prev; const models = prev.models || []; if (models.includes(modelName)) return { ...prev, models: models.filter(m => m !== modelName) }; return { ...prev, models: [...models, modelName] }; }); };
  const selectAllModelsForShowcase = () => { const allNames = Object.keys(groupedAdminProducts); setEditingShowcase(prev => prev ? { ...prev, models: allNames } : prev); };
  const clearAllModelsForShowcase = () => setEditingShowcase(prev => prev ? { ...prev, models: [] } : prev);
  const copyShowcaseLink = (linkId: string) => { const url = `${window.location.origin}${window.location.pathname}?vitrine=${linkId}`; navigator.clipboard.writeText(url); alert("Copiado!"); };
  
  const addColor = () => { if (tempColor && !colors.includes(tempColor)) { setColors([...colors, tempColor]); setTempColor(''); } };
  const addSize = () => { if (tempSize && !sizes.includes(tempSize)) { setSizes([...sizes, tempSize]); setTempSize(''); } };
  const removeColor = (c: string) => setColors(colors.filter(item => item !== c));
  const removeSize = (s: string) => setSizes(sizes.filter(item => item !== s));
  const updateRowBarcode = (index: number, val: string) => { const updated = [...generatedRows]; updated[index].barcode = val; setGeneratedRows(updated); };
  
  const handleSaveBatch = async () => { 
      if (!baseName || !baseSku || generatedRows.length === 0) return; setIsSavingBatch(true); 
      const priceNumber = parseFloat(basePrice.replace(',', '.').replace('R$', '').trim()) || 0; 
      try { 
          const batch = writeBatch(db); 
          generatedRows.forEach(row => { 
              const docRef = doc(collection(db, getCol('products'))); 
              batch.set(docRef, { 
                  name: baseName, description: baseDescription, image: baseImage, sku: row.sku, barcode: row.barcode, color: row.color, size: row.size, price: priceNumber, quantity: 0, 
                  weight: parseFloat(baseWeight) || 800, length: parseFloat(baseLength) || 33, width: parseFloat(baseWidth) || 12, height: parseFloat(baseHeight) || 19, ncm: baseNcm, cest: baseCest,
                  updatedAt: serverTimestamp() 
              }); 
          }); 
          await batch.commit(); setBaseSku(''); setBaseName(''); setBaseDescription(''); setBaseImage(''); setBasePrice(''); setColors([]); setSizes([]); setAdminView('stock'); alert("Sucesso!"); 
      } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } 
  };

  const handleUpdateQuantity = async (product: Product, newQty: number) => { if (newQty < 0) return; const diff = newQty - product.quantity; if (diff === 0) return; const type = diff > 0 ? 'entry' : 'exit'; try { const batch = writeBatch(db); const productRef = doc(db, getCol('products'), product.id); batch.update(productRef, { quantity: newQty, updatedAt: serverTimestamp() }); const historyRef = doc(collection(db, getCol('history'))); batch.set(historyRef, { productId: product.id, productName: product.name, sku: product.sku || '', image: product.image || '', type: type, amount: Math.abs(diff), previousQty: product.quantity, newQty: newQty, timestamp: serverTimestamp() }); await batch.commit(); } catch (e) { console.error(e); } };
  const handleDeleteProductFromModal = async () => { if (editingProduct && confirm('Excluir?')) { await deleteDoc(doc(db, getCol('products'), editingProduct.id)); setEditingProduct(null); } };
  const handleSaveEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingProduct) return; const priceNumber = typeof editingProduct.price === 'string' ? parseFloat(editingProduct.price) : editingProduct.price; try { await updateDoc(doc(db, getCol('products'), editingProduct.id), { ...editingProduct, price: priceNumber, updatedAt: serverTimestamp() }); setEditingProduct(null); } catch (error) { alert("Erro."); } };
  const openGroupEdit = (groupName: string, groupData: any) => { const info = groupData.info; setEditingGroup({ oldName: groupName, name: info.name, description: info.description || '', image: info.image || '', price: info.price || 0, weight: info.weight || 800, length: info.length || 33, width: info.width || 12, height: info.height || 19, ncm: info.ncm || '', cest: info.cest || '', items: groupData.items }); };
  const handleDeleteGroup = async () => { if(editingGroup && confirm('Excluir todas as variações deste modelo?')) { setIsSavingBatch(true); try { const batch = writeBatch(db); editingGroup.items.forEach(item => { batch.delete(doc(db, getCol('products'), item.id)); }); await batch.commit(); setEditingGroup(null); alert('Excluído!'); } catch(e) { console.error(e); } finally { setIsSavingBatch(false); } } };
  const handleSaveGroupEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingGroup) return; setIsSavingBatch(true); const priceNumber = typeof editingGroup.price === 'string' ? parseFloat(editingGroup.price) : editingGroup.price; try { const batch = writeBatch(db); editingGroup.items.forEach((item) => { const ref = doc(db, getCol('products'), item.id); batch.update(ref, { name: editingGroup.name, description: editingGroup.description, image: editingGroup.image, price: priceNumber, weight: editingGroup.weight, length: editingGroup.length, width: editingGroup.width, height: editingGroup.height, ncm: editingGroup.ncm, cest: editingGroup.cest, updatedAt: serverTimestamp() }); }); await batch.commit(); setEditingGroup(null); alert("Atualizado!"); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } };

  // ========================================================================
  // RENDERIZAÇÃO GERAL DO SISTEMA (RETORNOS DA INTERFACE)
  // ========================================================================
  if (globalLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500 w-12 h-12"/></div>;

  if (isSuperAdminMode) {
      return (
          <div className="min-h-screen bg-slate-950 font-sans text-white p-6 md:p-12 overflow-y-auto">
              <div className="max-w-6xl mx-auto space-y-8">
                  <header className="flex items-center gap-4 border-b border-slate-800 pb-6">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/50"><Building2 size={32} /></div>
                      <div><h1 className="text-3xl font-black">MaxDrop SaaS Manager</h1><p className="text-slate-400">Painel Geral de Controle de Inquilinos</p></div>
                  </header>

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
                              {saasTenants.length === 0 ? (<p className="text-slate-500 text-sm">Nenhum cliente cadastrado ainda.</p>) : saasTenants.map(tenant => (
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
                                              <button className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1.5 rounded hover:bg-red-500/20 font-bold transition-colors">Suspender</button>
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

  const brandColor = currentTenant?.primaryColor || '#2563eb'; 
  const brandName = currentTenant?.name || 'DropFast';
  const brandLogo = currentTenant?.logoUrl || null;

  if (isVitrineMode) {
      const vitrineGroups: Record<string, any> = {};
      Object.entries(groupedProducts).forEach(([name, group]) => { if (publicVitrine?.models.includes(name)) { vitrineGroups[name] = group; } });
      const applyMarkup = (basePrice: number) => { return basePrice * (1 + (publicVitrine?.config.priceMarkup || 0) / 100); };

      return (
          <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
              <header className="bg-white shadow-sm p-4 sticky top-0 z-20 border-b border-slate-100 flex items-center justify-center gap-3">
                  {brandLogo && <img src={brandLogo} className="h-8 object-contain" alt="Logo"/>}
                  <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><Store style={{ color: brandColor }} /> {publicVitrine?.name}</h1>
              </header>
              <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-20">
                 <div className="relative"><Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" /><input type="text" placeholder="Buscar modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 text-lg" style={{ outlineColor: brandColor }} /></div>
                 {Object.keys(vitrineGroups).length === 0 ? (<div className="text-center py-20 text-slate-400">Nenhum produto disponível neste catálogo.</div>) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                         {Object.entries(vitrineGroups).map(([name, group]: [string, any]) => (
                             <div key={name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition duration-300">
                                 <div onClick={() => toggleGroup(name)} className="aspect-square bg-slate-100 relative cursor-pointer overflow-hidden group">
                                     {group.info.image ? (<img src={group.info.image} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300 w-12 h-12" /></div>)}
                                 </div>
                                 <div onClick={() => toggleGroup(name)} className="p-4 flex-1 cursor-pointer flex flex-col justify-between">
                                     <div><h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{name}</h3><span className="text-xs font-bold text-slate-400">{group.info.sku ? String(group.info.sku).split('-')[0] : ''}</span></div>
                                     <div className="mt-3 flex items-center justify-between">
                                         {publicVitrine?.config.showPrice ? (<span className="text-lg font-black" style={{ color: brandColor }}>{formatCurrency(applyMarkup(group.info.price || 0))}</span>) : (<span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Sob Consulta</span>)}
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedGroups[name] ? 'text-white' : 'bg-slate-100 text-slate-400'}`} style={expandedGroups[name] ? { backgroundColor: brandColor } : {}}>{expandedGroups[name] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                                     </div>
                                 </div>
                                 {expandedGroups[name] && (
                                     <div className="bg-slate-50 border-t border-slate-100 p-3 max-h-64 overflow-y-auto hidden-scroll animate-in slide-in-from-top-2">
                                         <p className="text-xs font-bold text-slate-500 mb-2 uppercase text-center tracking-wider">Cores e Numerações</p>
                                         <div className="flex flex-wrap gap-2">
                                             {group.items.map((p: Product) => (
                                                 Number(p.quantity) > 4 && (<div key={p.id} className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs shadow-sm flex items-center gap-1"><span className="font-bold text-slate-800">{String(p.size)}</span><span className="text-slate-400">|</span><span className="text-slate-600 uppercase font-medium">{String(p.color)}</span></div>)
                                             ))}
                                         </div>
                                     </div>
                                 )}
                             </div>
                         ))}
                     </div>
                 )}
              </main>
          </div>
      );
  }

  if (!selectedRole && !isVitrineMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {previewTenantId && (<div className="absolute top-4 left-4 bg-yellow-500 text-black font-black text-xs px-3 py-1 rounded shadow-lg uppercase z-50 animate-pulse">Modo Preview</div>)}
        
        {/* BOTÃO DISCRETO NO CANTO SUPERIOR DIREITO */}
        <button
            type="button"
            onClick={() => { const s = prompt("Senha ADM da Fábrica:"); if (s === "1234") setSelectedRole('admin'); else alert("Acesso negado!"); }}
            className="absolute top-4 right-4 z-50 text-slate-300 hover:text-slate-500 p-2 rounded-full transition-colors flex items-center gap-2"
            title="Acesso Restrito"
        >
            <Package size={20} />
        </button>

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

  if (selectedRole === 'user') {
    return (
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
        {selectedNotice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">{selectedNotice.type === 'banner' ? <ImageIcon style={{color: brandColor}} size={18}/> : <Bell className="text-orange-500" size={18}/>} Detalhes do Aviso</h3>
                        <button onClick={() => setSelectedNotice(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="overflow-y-auto p-6 space-y-4">
                        {selectedNotice.type === 'banner' && selectedNotice.imageUrl && (<img src={selectedNotice.imageUrl} loading="lazy" className="w-full rounded-xl object-cover border border-slate-200" />)}
                        <h2 className="text-2xl font-black text-slate-800">{selectedNotice.title}</h2>
                        <p className="text-sm text-slate-400">{formatDate(selectedNotice.createdAt)}</p>
                        {selectedNotice.content && (<div className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedNotice.content}</div>)}
                    </div>
                    <div className="p-4 border-t border-slate-100"><button onClick={() => setSelectedNotice(null)} className="w-full py-3 text-white rounded-xl font-bold transition-colors" style={{backgroundColor: brandColor}}>Fechar</button></div>
                </div>
            </div>
        )}

        <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex h-screen sticky top-0">
          <div className="p-6 text-center border-b border-slate-800">
            {brandLogo ? (<img src={brandLogo} className="h-10 mx-auto object-contain mb-2" alt="Logo"/>) : (<h1 className="text-2xl font-black flex items-center justify-center gap-2" style={{ color: brandColor }}><RefreshCw size={24} /> {brandName}</h1>)}
            <p className="text-xs text-slate-400 mt-1">Olá, {userProfile?.name?.split(' ')[0] || 'Revendedor'}</p>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto hidden-scroll">
            <button onClick={() => setUserView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'dashboard' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'dashboard' ? {backgroundColor: brandColor} : {}}><Layers size={20} /> Visão Geral</button>
            <button onClick={() => setUserView('catalog')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'catalog' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'catalog' ? {backgroundColor: brandColor} : {}}><LayoutGrid size={20} /> Catálogo</button>
            <button onClick={() => {setUserView('academy'); setActiveLesson(null);}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'academy' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'academy' ? {backgroundColor: brandColor} : {}}><Play size={20} /> Como Funciona</button>
            <button onClick={() => setUserView('integrations')} className={`w-full flex items-center justify-between p-3 rounded-xl font-medium transition-all ${userView === 'integrations' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'integrations' ? {backgroundColor: brandColor} : {}}><div className="flex items-center gap-3"><Plug size={20} /> Integrações</div>{userProfile?.shopeeConnected && <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>}</button>
            <button onClick={() => setUserView('support')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'support' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'support' ? {backgroundColor: brandColor} : {}}><Ticket size={20} /> Suporte / Trocas</button>
          </nav>
          <div className="p-4 mx-4 mb-4 bg-slate-800 rounded-xl border border-slate-700 text-center"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-center gap-1"><Wallet size={12}/> Seu Crédito</p><p className="text-xl font-black text-green-400">{formatCurrency(userProfile?.creditBalance || 0)}</p></div>
          <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2"><LogOut size={20} /> Sair</button></div>
        </aside>

        <main className={`flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50 text-slate-800`}>
          <header className={`bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100`}>
            <div className="flex items-center gap-3"><div className={`md:hidden p-2 rounded-lg text-white`} style={{backgroundColor: brandColor}}><RefreshCw size={20} /></div><div><h2 className={`text-xl font-bold hidden md:block text-slate-800`}>{userView === 'dashboard' ? 'Dashboard' : userView === 'catalog' ? 'Catálogo de Produtos' : userView === 'integrations' ? 'App & Integrações' : 'Central de Resoluções'}</h2></div></div>
            <button onClick={handleLogout} className={`md:hidden text-xs p-3 rounded-xl text-red-500 bg-slate-100`}><LogOut size={20} /></button>
          </header>

          <div className={`p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full pb-24 md:pb-6`}>
            {userView === 'integrations' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center shrink-0"><Store className="text-orange-500" size={32}/></div>
                        <div><h2 className="text-xl font-black text-slate-800">Sincronização Shopee</h2><p className="text-slate-500 text-sm">Conecte sua loja e publique produtos do nosso catálogo com apenas um clique.</p></div>
                    </div>
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto">
                        <img src="https://logospng.org/download/shopee/logo-shopee-icon-1024.png" className="w-24 h-24 mx-auto mb-6 object-contain" alt="Shopee Logo" />
                        {userProfile?.shopeeConnected ? (
                            <div className="space-y-4"><div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm border border-green-200"><CheckCircle2 size={18}/> Loja Conectada</div><p className="text-slate-500 mb-6">Sincronizada. Use o botão "Publicar na Shopee" no catálogo.</p><button onClick={handleDisconnectShopee} className="text-sm font-bold text-red-500 hover:text-red-700 underline">Desconectar Loja</button></div>
                        ) : (
                            <div className="space-y-4"><h3 className="text-lg font-bold text-slate-800">Acelere suas vendas</h3><button onClick={handleConnectShopee} disabled={isShopeeSimulating} className="w-full md:w-auto px-8 py-4 bg-[#ee4d2d] hover:bg-[#d74326] text-white rounded-xl font-black shadow-lg shadow-orange-500/30 transition-transform hover:scale-105 flex items-center justify-center gap-3 mx-auto">{isShopeeSimulating ? <RefreshCw className="animate-spin" size={20} /> : <Plug size={20} />} Conectar Loja Shopee</button></div>
                        )}
                    </div>
                </div>
            )}

            {userView === 'catalog' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-6">
                 <div className="relative"><Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" /><input type="text" placeholder="Buscar modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 text-lg" style={{'--tw-ring-color':brandColor} as any} /></div>
                 <div>
                   {Object.keys(groupedProducts).length === 0 ? (<p className="text-center text-slate-400 py-10">Nenhum produto encontrado.</p>) : (
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                           {Object.entries(groupedProducts).map(([name, group]) => (
                               <div key={name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition duration-300">
                                   <div onClick={() => toggleGroup(name)} className="aspect-square bg-slate-100 relative cursor-pointer overflow-hidden group">
                                       {group.info.image ? (<img src={group.info.image} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300 w-12 h-12" /></div>)}
                                   </div>
                                   <div onClick={() => toggleGroup(name)} className="p-4 flex-1 cursor-pointer flex flex-col justify-between">
                                       <div><h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{String(name)}</h3></div>
                                       <div className="mt-3 flex items-center justify-between"><span className="text-lg font-black text-green-600">{formatCurrency(group.info.price || 0)}</span><div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedGroups[name] ? 'text-white' : 'bg-slate-100 text-slate-400'}`} style={expandedGroups[name] ? {backgroundColor: brandColor} : {}}>{expandedGroups[name] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div></div>
                                   </div>
                                   {expandedGroups[name] && (
                                       <div className="bg-slate-50 border-t border-slate-100 p-3 max-h-80 overflow-y-auto hidden-scroll animate-in slide-in-from-top-2 flex flex-col justify-between">
                                           <div>
                                               <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Cores e Numerações</p>
                                               <div className="flex flex-wrap gap-2 mb-4">
                                                   {group.items.map(p => (<div key={p.id} className="flex items-center justify-between bg-white p-2 w-full rounded-xl border border-slate-200 shadow-sm"><div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold uppercase">{String(p.color || '')}</span><span className="text-sm font-black text-slate-800">{String(p.size || '')}</span></div><div>{Number(p.quantity) > 4 ? (<span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded shadow-sm">Estoque OK</span>) : (<span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded shadow-sm">Falta</span>)}</div></div>))}
                                               </div>
                                           </div>
                                           <div className="space-y-2 mt-auto">
                                                <button onClick={(e) => { e.stopPropagation(); handlePublishToShopee(name); }} className="w-full bg-[#ee4d2d] hover:bg-[#d74326] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs shadow-md"><Send size={16}/> Publicar na Shopee</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleExportToUpSeller(name, group); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs shadow-md"><Download size={16}/> Baixar P/ UpSeller</button>
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

  // ==========================================
  // RENDERIZAÇÃO: ADMIN DO INQUILINO (FORNECEDOR)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {adminView !== 'menu' ? (<button onClick={() => setAdminView('menu')} className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"><ChevronLeft className="w-6 h-6 text-white" /></button>) : (<div className="bg-slate-800 p-2 rounded-lg border border-slate-700"><Package className="w-6 h-6 text-blue-400" /></div>)}
            <div><h1 className="font-black text-white text-xl">Fornecedor PRO</h1></div>
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
            <button onClick={() => setAdminView('stock')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 col-span-2"><div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center"><Package size={28} className="text-blue-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Estoque</h3></div></button>
            <button onClick={() => setAdminView('add')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 col-span-2"><div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center"><Plus size={28} className="text-green-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Criar Produto</h3></div></button>
          </div>
        )}

        {adminView === 'stock' && (
          <>
            <div className="bg-slate-900 p-3 md:p-4 rounded-2xl flex items-center gap-3 border border-blue-900/30 relative overflow-hidden shadow-lg animate-in slide-in-from-right">
              <div className="absolute right-0 top-0 p-4 opacity-10"><ScanBarcode size={100} /></div>
              <div className="flex-1 relative z-10"><label className="text-[10px] md:text-xs text-blue-400 font-bold mb-1 flex items-center gap-2"><ScanBarcode size={14}/> BUSCAR PRODUTO NO ESTOQUE</label><input autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtrar por nome, SKU..." className="w-full bg-slate-950 border-2 border-blue-500/30 rounded-xl px-4 py-3 text-lg text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none" /></div>
            </div>
            <div className="space-y-3 pb-20 animate-in slide-in-from-bottom-4 mt-6">
              {Object.entries(groupedAdminProducts).length === 0 ? (<div className="text-center text-slate-500 py-10">Nenhum produto encontrado</div>) : Object.entries(groupedAdminProducts).map(([name, group]) => (
                <div key={name} className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xl group overflow-hidden">
                  
                  <div onClick={() => toggleGroup(name)} className="p-2 md:p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors rounded-xl">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                        {group.info.image ? <img src={group.info.image} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon className="p-2 text-slate-700"/>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm md:text-base truncate">{String(name)}</div>
                        <div className="text-[10px] md:text-xs font-bold text-blue-400 mt-2 bg-blue-500/10 px-2 py-1 inline-block rounded-md">{group.items.length} variações</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openGroupEdit(name, group); }} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 p-3 rounded-xl transition-colors shadow-sm hidden md:block"><Pencil size={18} /></button>
                      <div className="text-right bg-slate-950 px-4 py-2 rounded-xl border border-slate-800"><div className="text-2xl font-black text-white">{group.total}</div><div className="text-[10px] text-slate-500 uppercase font-bold">Total</div></div>
                      <div className="bg-slate-800 p-2 rounded-xl text-slate-400">{expandedGroups[name] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</div>
                    </div>
                  </div>

                  {expandedGroups[name] && (
                    <div className="bg-slate-950 border-t border-slate-800 p-3 mt-2 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                      <div className="md:hidden flex justify-end mb-2"><button onClick={(e) => { e.stopPropagation(); openGroupEdit(name, group); }} className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Pencil size={12} /> Editar Modelo</button></div>
                      {group.items.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-black bg-slate-800 text-white px-2 py-1 rounded">{String(p.size || '')}</span><span className="text-xs text-slate-400 uppercase font-bold">{String(p.color || '')}</span></div><div className="text-[10px] text-slate-600 font-mono flex items-center gap-1"><ScanBarcode size={10} /> {p.barcode ? String(p.barcode) : '---'}</div></div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 overflow-hidden h-10 shadow-sm"><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, Number(p.quantity) - 1); }} className="w-10 h-full hover:bg-slate-800 text-slate-400 hover:text-white font-black text-lg">-</button><div className="w-12 text-center font-black text-white text-sm">{Number(p.quantity)}</div><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, Number(p.quantity) + 1); }} className="w-10 h-full hover:bg-slate-800 text-slate-400 hover:text-white font-black text-lg">+</button></div>
                            <button onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-blue-400 bg-slate-950 border border-slate-800 rounded-lg"><Pencil size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {adminView === 'add' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden relative animate-in slide-in-from-right">
            <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-800/50"><h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><Layers size={24} className="text-green-500" /> Gerador de Variações</h2></div>
            <div className="p-4 md:p-6 space-y-6 md:space-y-8">
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50">
                <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Package size={16} className="text-blue-400" /> 1. Produto Pai</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm text-slate-400 block mb-1">Nome*</label><input value={baseName} onChange={e => setBaseName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                    <div><label className="text-sm text-slate-400 block mb-1">SKU Base*</label><input value={baseSku} onChange={e => setBaseSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                    <div><label className="text-sm text-slate-400 block mb-1">Preço Padrão (R$)*</label><input value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="Ex: 59,90" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                    
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Link da Foto (URL Pública)</label>
                        <input type="text" value={baseImage} onChange={(e) => setBaseImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" placeholder="https://..." />
                        {baseImage && (<div className="mt-2 w-16 h-16 rounded overflow-hidden border border-slate-700"><img src={baseImage} className="w-full h-full object-cover" /></div>)}
                    </div>
                    
                    <div className="md:col-span-2"><label className="text-sm text-slate-400 block mb-1 flex items-center gap-2"><Download size={14}/> Descrição do Anúncio (Opcional - Para exportação UpSeller)</label><textarea value={baseDescription} onChange={e => setBaseDescription(e.target.value)} rows={3} placeholder="Descreva o produto com detalhes de material, conforto e estilo..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"></textarea></div>
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
              {generatedRows.length > 0 && (<div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Variações ({generatedRows.length})</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU</th><th className="p-2">Barcode</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></td></tr>))}</tbody></table></div></div>)}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-xl px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} {isSavingBatch ? 'SALVANDO...' : 'GERAR VARIAÇÕES'}</button></div>
            </div>
          </div>
        )}

        {/* --- MODAL DE EDIÇÃO DE GRUPO --- */}
        {editingGroup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                 <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="text-blue-400" size={24}/> Editar Modelo</h2><p className="text-xs text-slate-400 mt-1">Atualiza {editingGroup.items.length} variações.</p></div>
                 <button type="button" onClick={handleDeleteGroup} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 md:px-3 md:py-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"><Trash2 size={16} /> <span className="hidden md:inline">Excluir Tudo</span></button>
              </div>
              <form onSubmit={handleSaveGroupEdit} className="space-y-4">
                <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Nome do Modelo</label><input value={editingGroup.name} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Preço Geral (R$)</label><input value={editingGroup.price || ''} onChange={e => setEditingGroup({...editingGroup, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" type="number" required /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block uppercase flex items-center gap-1"><Download size={12}/> Descrição (UpSeller)</label><textarea value={editingGroup.description} onChange={e => setEditingGroup({...editingGroup, description: e.target.value})} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none"></textarea></div>
                
                <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Peso(g)</label><input type="number" value={editingGroup.weight} onChange={e => setEditingGroup({...editingGroup, weight: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"/></div>
                    <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">C(cm)</label><input type="number" value={editingGroup.length} onChange={e => setEditingGroup({...editingGroup, length: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"/></div>
                    <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">L(cm)</label><input type="number" value={editingGroup.width} onChange={e => setEditingGroup({...editingGroup, width: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"/></div>
                    <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase">A(cm)</label><input type="number" value={editingGroup.height} onChange={e => setEditingGroup({...editingGroup, height: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"/></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase">NCM</label><input value={editingGroup.ncm} onChange={e => setEditingGroup({...editingGroup, ncm: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"/></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase">CEST</label><input value={editingGroup.cest} onChange={e => setEditingGroup({...editingGroup, cest: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"/></div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link da Nova Foto</label>
                    <input type="text" value={editingGroup.image || ''} onChange={(e) => setEditingGroup({...editingGroup, image: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500" placeholder="https://..." />
                    {editingGroup.image && (<div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-700"><img src={editingGroup.image} className="w-full h-full object-cover" /></div>)}
                </div>
                
                <div className="flex gap-3 pt-6 border-t border-slate-800">
                   <button type="button" onClick={() => setEditingGroup(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-colors">Cancelar</button>
                   <button type="submit" disabled={isSavingBatch} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors">{isSavingBatch ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-blue-400"/> Editar Variação</h2>
                  <button type="button" onClick={handleDeleteProductFromModal} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"><Trash2 size={14} /> Excluir Variação</button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Produto</label><input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">SKU</label><input value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:border-blue-500 outline-none" /></div>
                   <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cód. Barras</label><input value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:border-blue-500 outline-none" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Preço (R$)</label><input value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" type="number" required /></div>
                    <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cor</label><input value={editingProduct.color} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required /></div>
                    <div className="col-span-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tamanho</label><input value={editingProduct.size} onChange={e => setEditingProduct({...editingProduct, size: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required /></div>
                </div>
                
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link da Foto Específica</label>
                    <input type="text" value={editingProduct.image || ''} onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500" placeholder="https://..." />
                    {editingProduct.image && (<div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-700"><img src={editingProduct.image} className="w-full h-full object-cover" /></div>)}
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-800">
                   <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-colors">Cancelar</button>
                   <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors"><Save size={18}/> Salvar Edição</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}