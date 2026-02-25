import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, updateDoc, addDoc, deleteDoc, setDoc, getDoc,
  serverTimestamp, query, orderBy, onSnapshot, writeBatch, limit, increment, where, getDocs, arrayUnion, arrayRemove
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
  Play, Film, GraduationCap, CheckCircle2, Circle, Building2, PaintBucket, ExternalLink, Download
} from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";

// --- SONS ---
const SOUNDS = {
  success: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  alert: "https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3",
  magic: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"
};

const playSound = (type: 'success' | 'error' | 'alert' | 'magic') => { try { const audio = new Audio(SOUNDS[type]); audio.volume = 0.5; audio.play().catch(e => console.log("Audio", e)); } catch (e) {} };
const formatCurrency = (value: any) => { const num = Number(value); if (isNaN(num)) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num); };
const processImageUrl = (url: string) => { if (!url) return ''; const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/); return match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url; };
const getYoutubeId = (url: string) => { if (!url) return null; const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/); return match ? match[1] : null; };
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

// Coleção Raiz do SaaS
const TENANTS_COLLECTION = `saas_tenants`;

// Tipos
type Tenant = { id: string; name: string; domain: string; logoUrl: string; primaryColor: string; createdAt?: any; };
type Product = { id: string; sku?: string; barcode?: string; image?: string; name: string; description?: string; color: string; size: string; quantity: number; price: number; updatedAt?: any; };
type VariationRow = { color: string; size: string; sku: string; barcode: string; };
type ScannedItem = { product: Product; count: number; };
type HistoryItem = { id: string; productId: string; productName: string; sku: string; image: string; type: 'entry' | 'exit' | 'correction'; amount: number; previousQty: number; newQty: number; timestamp: any; };
type CartItem = { product: Product; quantity: number; };
type PurchaseOrder = { id: string; orderCode: string; supplier: string; status: 'pending' | 'received'; items: { productId: string; sku: string; name: string; quantity: number }[]; totalItems: number; createdAt: any; receivedAt?: any; };
type Notice = { id: string; type: 'text' | 'banner'; title: string; content?: string; imageUrl?: string; createdAt: any; };
type QuickLink = { id: string; title: string; subtitle: string; icon: string; url: string; order: number; createdAt?: any; };
type Showcase = { id: string; name: string; linkId: string; config: { showPrice: boolean; priceMarkup: number; }; models: string[]; createdAt?: any; };
type UserProfile = { id: string; name: string; email: string; role: string; creditBalance: number; completedLessons?: string[]; tenantId: string; createdAt?: any; };
type SupportTicket = { id: string; userId: string; userName: string; type: 'troca' | 'devolucao'; status: 'pendente' | 'aceito' | 'recusado' | 'aguardando_devolucao' | 'concluido'; productId: string; productInfo: string; productValue: number; reason: string; adminNote?: string; createdAt: any; updatedAt?: any; };
type AcademyLesson = { id: string; season: string; episode: number; title: string; description: string; youtubeUrl: string; bannerUrl: string; materialLinks: string; createdAt: any; };

export default function App() {
  const [globalLoading, setGlobalLoading] = useState(true);
  
  // --- MOTOR MULTI-TENANT E PREVIEW ---
  const urlParams = newSearchParams(window.location.search);
  const previewTenantId = urlParams.get('preview'); 
  const vitrineLinkId = urlParams.get('vitrine');
  
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
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'review'>('select');
  const [userView, setUserView] = useState<'dashboard' | 'catalog' | 'cart' | 'orders' | 'support' | 'academy'>('dashboard');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchaseCart, setPurchaseCart] = useState<CartItem[]>([]);
  
  const prevProductsRef = useRef<Product[]>([]);
  
  // ========================================================================
  // CORREÇÃO CRÍTICA: FUNÇÃO DE EXPANDIR O CATÁLOGO
  // ========================================================================
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
  const [generatedRows, setGeneratedRows] = useState<VariationRow[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ oldName: string, name: string, description: string, image: string, price: number, items: Product[] } | null>(null);

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

  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  
  // ========================================================================
  // 1. LEITOR DE DOMÍNIOS E MODO PREVIEW
  // ========================================================================
  useEffect(() => {
    const fetchTenant = async () => {
      if (previewTenantId) {
        const docRef = doc(db, TENANTS_COLLECTION, previewTenantId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCurrentTenant({ id: docSnap.id, ...docSnap.data() } as Tenant);
          setIsSuperAdminMode(false);
        } else {
          alert("Erro no Preview: Empresa não encontrada.");
          setIsSuperAdminMode(true);
        }
        setGlobalLoading(false);
        return;
      }

      const q = query(collection(db, TENANTS_COLLECTION), where("domain", "==", currentDomain));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const tenantData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Tenant;
        setCurrentTenant(tenantData);
        setIsSuperAdminMode(false);
      } else {
        setIsSuperAdminMode(true);
      }
      setGlobalLoading(false);
    };
    fetchTenant();
  }, [currentDomain, previewTenantId]);

  // ========================================================================
  // 2. BUSCA DE DADOS ISOLADA (Usando getCol)
  // ========================================================================
  useEffect(() => {
    if (!currentTenant) return;

    const q = query(collection(db, getCol('products')), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as Product); });
      
      if (!loading && selectedRole === 'user' && !isVitrineMode) {
        const previousProducts = prevProductsRef.current;
        const soldOutItems = items.filter(newItem => {
          const oldItem = previousProducts.find(p => p.id === newItem.id);
          return oldItem && oldItem.quantity > 4 && newItem.quantity <= 4;
        });
        if (soldOutItems.length > 0) { playSound('alert'); sendSystemNotification("⚠️ ESTOQUE ZEROU!", `${soldOutItems.length} produtos acabaram de esgotar!`); }
      }
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
    } else {
        const unsubShowcases = onSnapshot(query(collection(db, getCol('showcases'))), (snap) => {
            const allVitrines = snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase));
            setPublicVitrine(allVitrines.find(v => v.linkId === vitrineLinkId) || null);
        });
        return () => { unsubscribe(); unsubShowcases(); };
    }
  }, [currentTenant, loading, isVitrineMode, vitrineLinkId]);

  useEffect(() => {
     if (user && selectedRole === 'user' && currentTenant) {
         const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
             if (docSnap.exists()) setUserProfile({ id: docSnap.id, completedLessons: [], ...docSnap.data() } as UserProfile);
         });
         
         const unsubMyTickets = onSnapshot(collection(db, getCol('tickets')), (snap) => {
             const items = snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket));
             const myItems = items.filter(t => t.userId === user.uid).sort((a,b) => b.createdAt - a.createdAt);
             setMyTickets(myItems);
         });

         return () => { unsubProfile(); unsubMyTickets(); };
     }
  }, [user, selectedRole, currentTenant]);

  useEffect(() => {
    if (selectedRole === 'admin' && currentTenant) {
      const unsubHist = onSnapshot(query(collection(db, getCol('history')), orderBy('timestamp', 'desc'), limit(300)), (snap) => setHistory(snap.docs.map(d => ({id: d.id, ...d.data()} as HistoryItem))));
      const unsubPurch = onSnapshot(query(collection(db, getCol('purchases')), orderBy('createdAt', 'desc')), (snap) => setPurchases(snap.docs.map(d => ({id: d.id, ...d.data()} as PurchaseOrder))));
      const unsubUsers = onSnapshot(query(collection(db, 'users'), where('tenantId', '==', currentTenant.id)), (snap) => {
          setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)).filter(u => u.role === 'revendedor'));
      });
      const unsubAllTickets = onSnapshot(query(collection(db, getCol('tickets')), orderBy('createdAt', 'desc')), (snap) => setAllTickets(snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket))));

      return () => { unsubHist(); unsubPurch(); unsubUsers(); unsubAllTickets(); };
    }
  }, [selectedRole, currentTenant]);

  useEffect(() => {
    if (searchTerm.trim() === '') { setFilteredProducts(products); } 
    else {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = products.filter(p => {
         const name = String(p.name || '').toLowerCase();
         const sku = String(p.sku || '').toLowerCase();
         const barcode = String(p.barcode || '').toLowerCase();
         return name.includes(lowerTerm) || sku.includes(lowerTerm) || barcode.includes(lowerTerm);
      });
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // ==========================================
  // CÁLCULOS PREDITIVOS E ACADEMY
  // ==========================================
  const predictiveData = useMemo(() => {
      if (adminView !== 'predictive' || products.length === 0) return null;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const exitStats: Record<string, number> = {};
      
      history.forEach(h => {
          if (h.type === 'exit') {
              const date = h.timestamp?.toDate ? h.timestamp.toDate() : new Date();
              if (date >= thirtyDaysAgo) exitStats[h.productId] = (exitStats[h.productId] || 0) + h.amount;
          }
      });

      const insights = products.map(p => {
          const exits30d = exitStats[p.id] || 0;
          const velocityPerDay = exits30d / 30; 
          const daysRemaining = velocityPerDay > 0 ? (p.quantity / velocityPerDay) : Infinity;
          return { ...p, exits30d, velocityPerDay, daysRemaining };
      });

      const toProduce = insights.filter(p => (p.daysRemaining <= 15 || p.quantity <= 4) && p.velocityPerDay > 0).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 10);
      const topSellers = [...insights].filter(p => p.exits30d > 0).sort((a, b) => b.exits30d - a.exits30d).slice(0, 10);
      const deadStock = insights.filter(p => p.quantity > 10 && p.exits30d === 0).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

      return { toProduce, topSellers, deadStock, totalExits: Object.values(exitStats).reduce((a,b)=>a+b, 0) };
  }, [adminView, products, history]);

  const academySeasons = useMemo(() => {
      const seasonsObj: Record<string, AcademyLesson[]> = {};
      lessons.forEach(l => {
          if (!seasonsObj[l.season]) seasonsObj[l.season] = [];
          seasonsObj[l.season].push(l);
      });
      return Object.entries(seasonsObj).map(([name, eps]) => ({
          name,
          episodes: eps.sort((a,b) => a.episode - b.episode)
      })).sort((a,b) => a.name.localeCompare(b.name));
  }, [lessons]);

  const availableSeasons = useMemo(() => Array.from(new Set(lessons.map(l => l.season))), [lessons]);

  useEffect(() => {
      if (adminView === 'academy' && academySeasonMode === 'existing' && academySeason) {
          const eps = lessons.filter(l => l.season === academySeason);
          setAcademyEpisode(String(eps.length + 1));
      } else if (academySeasonMode === 'new') {
          setAcademyEpisode('1');
      }
  }, [academySeason, academySeasonMode, lessons, adminView]);

  const groupProducts = (items: Product[]) => { 
      const groups: Record<string, { info: Product, total: number, items: Product[] }> = {}; 
      if (!items || !Array.isArray(items)) return groups;
      items.forEach(product => { 
          if (!product) return;
          const key = String(product.name || 'Sem Nome');
          if (!groups[key]) groups[key] = { info: product, total: 0, items: [] }; 
          groups[key].items.push(product); 
          groups[key].total += Number(product.quantity || 0);
      }); 
      Object.values(groups).forEach(group => group.items.sort((a, b) => (String(a.size || '') > String(b.size || '') ? 1 : -1))); 
      return groups; 
  };
  const groupedProducts = groupProducts(filteredProducts);
  const groupedAdminProducts = groupProducts(filteredProducts);

  // ==========================================
  // EXPORTAÇÃO UPSELLER COM ESTRUTURA EXATA DO CLIENTE
  // ==========================================
  const handleExportToUpSeller = (groupName: string, groupData: any) => {
      let csvContent = "\uFEFF"; 
      
      // Cabeçalho Exato da Planilha do UpSeller (Não alterar para não quebrar a importação)
      const headerRow = [
        `"SPU*\\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)"`,
        `"SKU*\\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)"`,
        `"Título*\\n(Obrigatório, 1-500 caracteres)"`,
        `"Apelido do Produto\\n(1-500 caracteres)"`,
        `"Usar apelido como título da NFe"`,
        `"Variantes1*\\n(Obrigatório, 1-14 caracteres)"`,
        `"Valor da Variante1*\\n(Obrigatório, 1-30 caracteres)"`,
        `"Variantes2\\n(limite 1-14 caracteres)"`,
        `"Valor da Variante2\\n(limite 1-30 caracteres)"`,
        `"Variantes3\\n(limite 1-14 caracteres)"`,
        `"Valor da Variante3\\n(limite 1-30 caracteres)"`,
        `"Variantes4\\n(limite 1-14 caracteres)"`,
        `"Valor da Variante4\\n(limite 1-30 caracteres)"`,
        `"Variantes5\\n(limite 1-14 caracteres)"`,
        `"Valor da Variante5\\n(limite 1-30 caracteres)"`,
        `"Preço de varejo\\n(limite 0-999999999)"`,
        `"Custo de Compra\\n(limite 0-999999999)"`,
        `"Quantidade\\n(limite 0-999999999, Se não for preenchido, não será registrado na Lista de Estoque)"`,
        `"N° do Estante\\n(Apenas estantes existentes, serão filtrados se o estante selecionado estiver cheio ou ficará cheio após a importação)"`,
        `"Código de Barras\\n(Limite de 8 a 14 caracteres, separe vários códigos de barras com vírgulas)"`,
        `"Apelido de SKU\\n（Limite a letras, números e caracteres especiais; separe vários apelidos de SKU com vírgulas; máximo de 20 entradas）"`,
        `"Imagem"`,
        `"Peso (g)\\n(limite 1-999999)"`,
        `"Comprimento (cm)\\n(limite 1-999999)"`,
        `"Largura (cm)\\n(limite 1-999999)"`,
        `"Altura (cm)\\n(limite 1-999999)"`,
        `"NCM\\n(limite 8 dígitos)"`,
        `"CEST\\n(limite 7 dígitos)"`,
        `"Unidade\\n(Selecionar UN/KG/Par)"`,
        `"Origem\\n(Selecionar 0/1/2/3/4/5/6/7/8)"`,
        `"Link do Fornecedor"`
      ].join(',');

      csvContent += headerRow + "\n";

      groupData.items.forEach((p: Product) => {
          const skuPai = p.sku ? p.sku.split('-')[0] : 'SKU';
          const tituloCompleto = p.description ? `${p.name} - ${p.description}` : p.name;
          
          const row = [
              `"${skuPai}"`,           // SPU*
              `"${p.sku || ''}"`,      // SKU*
              `"${tituloCompleto}"`,   // Título* (Juntei com a descrição para não perder)
              `""`,                    // Apelido do Produto
              `"N"`,                   // Usar apelido NFe
              `"Cor"`,                 // Variantes1*
              `"${p.color || ''}"`,    // Valor da Variante1*
              `"Tamanho"`,             // Variantes2
              `"${p.size || ''}"`,     // Valor da Variante2
              `""`,`""`,               // Var3, Val3
              `""`,`""`,               // Var4, Val4
              `""`,`""`,               // Var5, Val5
              `${p.price || 0}`,       // Preço de varejo
              `${p.price || 0}`,       // Custo de Compra
              `200`,                   // Quantidade
              `""`,                    // Estante
              `"${p.barcode || ''}"`,  // Código de Barras
              `""`,                    // Apelido de SKU
              `"${p.image || ''}"`,    // Imagem
              `800`,                   // Peso (g)
              `33`,                    // Comprimento (cm)
              `12`,                    // Largura (cm)
              `19`,                    // Altura (cm)
              `""`,                    // NCM
              `""`,                    // CEST
              `"UN"`,                  // Unidade
              `"0"`,                   // Origem
              `""`                     // Link do Fornecedor
          ].join(',');
          csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `UpSeller_${groupName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playSound('magic');
  };

  // ==========================================
  // FUNÇÕES DE AÇÃO GERAIS
  // ==========================================
  useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); }); if ("Notification" in window && Notification.permission === "granted") setPermissionGranted(true); return () => unsubscribe(); }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError('');
    if(!currentTenant) return setAuthError('Domínio não cadastrado no sistema.');
    try {
      if (isRegistering) {
        if(!authName) return setAuthError('Preencha seu nome.');
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', userCredential.user.uid), { name: authName, email: authEmail, role: 'revendedor', creditBalance: 0, tenantId: currentTenant.id, createdAt: serverTimestamp() });
        setSelectedRole('user'); playSound('success');
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setSelectedRole('user'); playSound('success');
      }
    } catch (err: any) { setAuthError('Erro: E-mail ou senha incorretos.'); playSound('error'); }
  };

  const handleLogout = async () => { await signOut(auth); setSelectedRole(null); setUserView('dashboard'); setAdminView('menu'); setUserProfile(null); };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => { const file = e.target.files?.[0]; if (file) { if(file.size > 800000) { alert("Imagem muito grande. Máx 800KB."); return; } const reader = new FileReader(); reader.onloadend = () => { setter(reader.result as string); }; reader.readAsDataURL(file); } };

  // --- FUNÇÕES DE SAAS (SUPER ADMIN) ---
  const handleCreateTenant = async (e: React.FormEvent) => {
      e.preventDefault(); if (!newTenantName || !newTenantDomain) return; setIsSavingBatch(true);
      try {
          const cleanDomain = newTenantDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
          await addDoc(collection(db, TENANTS_COLLECTION), { name: newTenantName, domain: cleanDomain, logoUrl: newTenantLogo, primaryColor: newTenantColor, createdAt: serverTimestamp() });
          setNewTenantName(''); setNewTenantDomain(''); setNewTenantLogo(''); setNewTenantColor('#2563eb'); alert("Empresa criada!");
      } catch (error) { console.error(error); } finally { setIsSavingBatch(false); }
  };

  // --- FUNÇÕES DE TICKETS ---
  const handleOpenTicket = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(!currentTenant || !user || !userProfile) return; 
      
      const returnProd = products.find(p => p.id === ticketReturnProductId);
      if (!returnProd) return alert("Selecione o produto que vai devolver.");

      let finalProductInfo = '';
      let finalValue = returnProd.price || 0;

      if (ticketType === 'troca') {
          const desiredProd = products.find(p => p.id === ticketDesiredProductId);
          if (!desiredProd) return alert("Selecione o produto desejado para a troca.");
          finalProductInfo = `DEVOLVE: ${returnProd.name} (Cor: ${returnProd.color} | Tam: ${returnProd.size})\nDESEJA: ${desiredProd.name} (Cor: ${desiredProd.color} | Tam: ${desiredProd.size})`;
      } else {
          if (!ticketReason) return alert("Preencha o motivo do defeito.");
          finalProductInfo = `DEVOLVE: ${returnProd.name} (Cor: ${returnProd.color} | Tam: ${returnProd.size})`;
      }

      setIsSavingBatch(true); 
      try { 
          await addDoc(collection(db, getCol('tickets')), { 
              userId: user.uid, userName: userProfile.name, type: ticketType, status: 'pendente', 
              productId: returnProd.id, productInfo: finalProductInfo, productValue: finalValue, 
              reason: ticketType === 'devolucao' ? ticketReason : 'Troca Normal', createdAt: serverTimestamp() 
          }); 
          setTicketReturnProductId(''); setTicketDesiredProductId(''); setTicketReason(''); 
          alert("Solicitação enviada!"); playSound('success'); 
      } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } 
  };

  const handleAdminTicketAction = async (ticket: SupportTicket, action: 'aceitar_troca' | 'recusar' | 'aceitar_devolucao' | 'recebido_gerar_credito') => { setIsSavingBatch(true); try { const ticketRef = doc(db, getCol('tickets'), ticket.id); if (action === 'aceitar_troca') { await updateDoc(ticketRef, { status: 'aceito', updatedAt: serverTimestamp() }); alert("Troca Aceita!"); } else if (action === 'recusar') { const note = prompt("Motivo da recusa (Opcional):"); await updateDoc(ticketRef, { status: 'recusado', adminNote: note || '', updatedAt: serverTimestamp() }); } else if (action === 'aceitar_devolucao') { await updateDoc(ticketRef, { status: 'aguardando_devolucao', updatedAt: serverTimestamp() }); alert("Devolução autorizada."); } else if (action === 'recebido_gerar_credito') { if (confirm(`Gerar crédito de R$ ${ticket.productValue.toFixed(2)} para ${ticket.userName}?`)) { const batch = writeBatch(db); batch.update(ticketRef, { status: 'concluido', updatedAt: serverTimestamp() }); batch.update(doc(db, 'users', ticket.userId), { creditBalance: increment(ticket.productValue) }); await batch.commit(); playSound('magic'); alert("Crédito gerado!"); } } } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handlePrintTicket = (ticket: SupportTicket) => { const printContent = `<html><head><title>Via de Troca</title><style>body { font-family: sans-serif; padding: 20px; } .box { border: 2px dashed #000; padding: 20px; max-width: 400px; margin: 0 auto; } h2 { text-align: center; margin-top: 0; } p { margin: 8px 0; font-size: 14px; } .line { border-top: 1px solid #ccc; margin: 15px 0; } .sign { margin-top: 40px; text-align: center; }</style></head><body><div class="box"><h2>VIA DE AUTORIZAÇÃO</h2><p><strong>TIPO:</strong> ${ticket.type.toUpperCase()}</p><p><strong>CLIENTE:</strong> ${ticket.userName}</p><p><strong>DADOS:</strong><br/> ${ticket.productInfo.replace(/\n/g, '<br/>')}</p><p><strong>MOTIVO:</strong> ${ticket.reason}</p><div class="line"></div><p><strong>DATA:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p><div class="sign">___________________________________<br/>Assinatura Responsável</div></div></body></html>`; const printWindow = window.open('', '_blank', 'width=600,height=600'); if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 250); } };
  
  const handleSaveAcademy = async (e: React.FormEvent) => { e.preventDefault(); const finalSeason = academySeasonMode === 'new' ? academyNewSeason : academySeason; if (!finalSeason || !academyTitle || !academyYoutube) return; setIsSavingBatch(true); try { await addDoc(collection(db, getCol('academy')), { season: finalSeason, episode: parseInt(academyEpisode) || 1, title: academyTitle, description: academyDesc, youtubeUrl: academyYoutube, bannerUrl: academyBanner, materialLinks: academyLinks, createdAt: serverTimestamp() }); setAcademyTitle(''); setAcademyDesc(''); setAcademyYoutube(''); setAcademyBanner(''); setAcademyLinks(''); setAcademyEpisode(String(parseInt(academyEpisode)+1)); alert("Aula publicada!"); playSound('success'); } catch(e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handleDeleteAcademy = async (id: string) => { if(confirm('Excluir?')) await deleteDoc(doc(db, getCol('academy'), id)); };
  const toggleLessonCompletion = async (lessonId: string) => { if (!user) return; const isCompleted = userProfile?.completedLessons?.includes(lessonId); try { await updateDoc(doc(db, 'users', user.uid), { completedLessons: isCompleted ? arrayRemove(lessonId) : arrayUnion(lessonId) }); } catch (e) { console.error(e); } };
  const academyProgress = Math.round(((userProfile?.completedLessons?.length || 0) / (lessons.length || 1)) * 100);

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
  
  useEffect(() => { const newRows: VariationRow[] = []; colors.forEach(color => { sizes.forEach(size => { const cleanSku = baseSku.toUpperCase().replace(/\s+/g, ''); const cleanColor = color.toUpperCase(); const cleanSize = size.toUpperCase().replace(/\s+/g, ''); const autoSku = cleanSku && cleanColor && cleanSize ? `${cleanSku}-${cleanColor}-${cleanSize}` : ''; const existingRow = generatedRows.find(r => r.color === color && r.size === size); newRows.push({ color, size, sku: autoSku, barcode: existingRow ? existingRow.barcode : '' }); });}); setGeneratedRows(newRows); }, [colors, sizes, baseSku]);
  const addColor = () => { if (tempColor && !colors.includes(tempColor)) { setColors([...colors, tempColor]); setTempColor(''); } };
  const addSize = () => { if (tempSize && !sizes.includes(tempSize)) { setSizes([...sizes, tempSize]); setTempSize(''); } };
  const removeColor = (c: string) => setColors(colors.filter(item => item !== c));
  const removeSize = (s: string) => setSizes(sizes.filter(item => item !== s));
  const updateRowBarcode = (index: number, val: string) => { const updated = [...generatedRows]; updated[index].barcode = val; setGeneratedRows(updated); };
  
  const handleSaveBatch = async () => { if (!baseName || !baseSku || generatedRows.length === 0) return; setIsSavingBatch(true); const priceNumber = parseFloat(basePrice.replace(',', '.').replace('R$', '').trim()) || 0; try { const batch = writeBatch(db); generatedRows.forEach(row => { const docRef = doc(collection(db, getCol('products'))); batch.set(docRef, { name: baseName, description: baseDescription, image: baseImage, sku: row.sku, barcode: row.barcode, color: row.color, size: row.size, price: priceNumber, quantity: 0, updatedAt: serverTimestamp() }); }); await batch.commit(); setBaseSku(''); setBaseName(''); setBaseDescription(''); setBaseImage(''); setBasePrice(''); setColors([]); setSizes([]); setAdminView('stock'); alert("Sucesso!"); } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handleUpdateQuantity = async (product: Product, newQty: number) => { if (newQty < 0) return; const diff = newQty - product.quantity; if (diff === 0) return; const type = diff > 0 ? 'entry' : 'exit'; try { const batch = writeBatch(db); const productRef = doc(db, getCol('products'), product.id); batch.update(productRef, { quantity: newQty, updatedAt: serverTimestamp() }); const historyRef = doc(collection(db, getCol('history'))); batch.set(historyRef, { productId: product.id, productName: product.name, sku: product.sku || '', image: product.image || '', type: type, amount: Math.abs(diff), previousQty: product.quantity, newQty: newQty, timestamp: serverTimestamp() }); await batch.commit(); } catch (e) { console.error(e); } };
  const handleDeleteProductFromModal = async () => { if (editingProduct && confirm('Excluir?')) { await deleteDoc(doc(db, getCol('products'), editingProduct.id)); setEditingProduct(null); } };
  const handleSaveEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingProduct) return; const priceNumber = typeof editingProduct.price === 'string' ? parseFloat(editingProduct.price) : editingProduct.price; try { await updateDoc(doc(db, getCol('products'), editingProduct.id), { ...editingProduct, price: priceNumber, updatedAt: serverTimestamp() }); setEditingProduct(null); } catch (error) { alert("Erro."); } };
  const openGroupEdit = (groupName: string, groupData: any) => { setEditingGroup({ oldName: groupName, name: groupData.info.name, description: groupData.info.description || '', image: groupData.info.image || '', price: groupData.info.price || 0, items: groupData.items }); };
  const handleDeleteGroup = async () => { if(editingGroup && confirm('Excluir todas as variações deste modelo?')) { setIsSavingBatch(true); try { const batch = writeBatch(db); editingGroup.items.forEach(item => { batch.delete(doc(db, getCol('products'), item.id)); }); await batch.commit(); setEditingGroup(null); alert('Excluído!'); } catch(e) { console.error(e); } finally { setIsSavingBatch(false); } } };
  const handleSaveGroupEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingGroup) return; setIsSavingBatch(true); const priceNumber = typeof editingGroup.price === 'string' ? parseFloat(editingGroup.price) : editingGroup.price; try { const batch = writeBatch(db); editingGroup.items.forEach((item) => { const ref = doc(db, getCol('products'), item.id); batch.update(ref, { name: editingGroup.name, description: editingGroup.description, image: editingGroup.image, price: priceNumber, updatedAt: serverTimestamp() }); }); await batch.commit(); setEditingGroup(null); alert("Atualizado!"); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } };

  // ========================================================================
  // RENDERIZAÇÃO: CARREGAMENTO GLOBAL
  // ========================================================================
  if (globalLoading) {
      return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500 w-12 h-12"/></div>;
  }

  // ========================================================================
  // RENDERIZAÇÃO: SUPER ADMIN (Painel Geral do SaaS)
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

  // ========================================================================
  // RENDERIZAÇÃO: VITRINE PÚBLICA (Com Cores do Inquilino)
  // ========================================================================
  const brandColor = currentTenant?.primaryColor || '#2563eb'; 
  const brandName = currentTenant?.name || 'DropFast';
  const brandLogo = currentTenant?.logoUrl || null;

  if (isVitrineMode) {
      if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Carregando catálogo...</div>;
      if (!publicVitrine) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 flex-col"><Store size={48} className="mb-4 opacity-20"/> Vitrine não encontrada ou indisponível.</div>;

      const vitrineGroups: Record<string, any> = {};
      Object.entries(groupedProducts).forEach(([name, group]) => {
          if (publicVitrine.models.includes(name)) { vitrineGroups[name] = group; }
      });

      const applyMarkup = (basePrice: number) => { return basePrice * (1 + (publicVitrine.config.priceMarkup || 0) / 100); };

      return (
          <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
              <header className="bg-white shadow-sm p-4 sticky top-0 z-20 border-b border-slate-100 flex items-center justify-center gap-3">
                  {brandLogo && <img src={brandLogo} className="h-8 object-contain" alt="Logo"/>}
                  <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><Store style={{ color: brandColor }} /> {publicVitrine.name}</h1>
              </header>
              <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-20">
                 <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input type="text" placeholder="Buscar modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 text-lg" style={{ outlineColor: brandColor }} />
                 </div>
                 
                 {Object.keys(vitrineGroups).length === 0 ? (<div className="text-center py-20 text-slate-400">Nenhum produto disponível neste catálogo.</div>) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                         {Object.entries(vitrineGroups).map(([name, group]: [string, any]) => (
                             <div key={name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition duration-300">
                                 <div onClick={() => toggleGroup(name)} className="aspect-square bg-slate-100 relative cursor-pointer overflow-hidden group">
                                     {group.info.image ? (<img src={group.info.image} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300 w-12 h-12" /></div>)}
                                 </div>
                                 <div onClick={() => toggleGroup(name)} className="p-4 flex-1 cursor-pointer flex flex-col justify-between">
                                     <div>
                                         <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{name}</h3>
                                         <span className="text-xs font-bold text-slate-400">{group.info.sku ? String(group.info.sku).split('-')[0] : ''}</span>
                                     </div>
                                     <div className="mt-3 flex items-center justify-between">
                                         {publicVitrine.config.showPrice ? (<span className="text-lg font-black" style={{ color: brandColor }}>{formatCurrency(applyMarkup(group.info.price || 0))}</span>) : (<span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Sob Consulta</span>)}
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedGroups[name] ? 'text-white' : 'bg-slate-100 text-slate-400'}`} style={expandedGroups[name] ? { backgroundColor: brandColor } : {}}>
                                            {expandedGroups[name] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                         </div>
                                     </div>
                                 </div>
                                 {expandedGroups[name] && (
                                     <div className="bg-slate-50 border-t border-slate-100 p-3 max-h-64 overflow-y-auto hidden-scroll animate-in slide-in-from-top-2">
                                         <p className="text-xs font-bold text-slate-500 mb-2 uppercase text-center tracking-wider">Cores e Numerações</p>
                                         <div className="flex flex-wrap gap-2">
                                             {group.items.map((p: Product) => (
                                                 Number(p.quantity) > 4 && (
                                                    <div key={p.id} className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs shadow-sm flex items-center gap-1"><span className="font-bold text-slate-800">{String(p.size)}</span><span className="text-slate-400">|</span><span className="text-slate-600 uppercase font-medium">{String(p.color)}</span></div>
                                                 )
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

  // ========================================================================
  // RENDERIZAÇÃO: LOGIN DA EMPRESA
  // ========================================================================
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
          <div className="mt-8 pt-6 border-t border-slate-100 text-center"><button type="button" onClick={() => { const s = prompt("Senha ADM da Fábrica:"); if (s === "1234") setSelectedRole('admin'); else alert("Acesso negado!"); }} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5 mx-auto font-bold uppercase tracking-wider transition-colors"><Package size={14} /> Acesso Restrito (Fornecedor)</button></div>
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
            <button onClick={() => setUserView('support')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'support' ? 'text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} style={userView === 'support' ? {backgroundColor: brandColor} : {}}><Ticket size={20} /> Suporte / Trocas</button>
          </nav>
          <div className="p-4 mx-4 mb-4 bg-slate-800 rounded-xl border border-slate-700 text-center"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-center gap-1"><Wallet size={12}/> Seu Crédito</p><p className="text-xl font-black text-green-400">{formatCurrency(userProfile?.creditBalance || 0)}</p></div>
          <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2"><LogOut size={20} /> Sair</button></div>
        </aside>

        <main className={`flex-1 flex flex-col h-screen overflow-y-auto ${userView === 'academy' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
          <header className={`${userView === 'academy' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b`}>
            <div className="flex items-center gap-3">
              <div className={`md:hidden p-2 rounded-lg text-white`} style={{backgroundColor: brandColor}}><RefreshCw size={20} /></div>
              <div><h2 className={`text-xl font-bold hidden md:block ${userView === 'academy' ? 'text-white' : 'text-slate-800'}`}>{userView === 'dashboard' ? 'Dashboard de Avisos' : userView === 'catalog' ? 'Catálogo de Produtos' : userView === 'academy' ? 'Academy' : userView === 'support' ? 'Central de Resoluções' : 'Histórico'}</h2></div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`md:hidden px-3 py-1.5 rounded-lg flex items-center gap-2 border ${userView === 'academy' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}><Wallet size={14} className={userView === 'academy' ? 'text-slate-400' : 'text-slate-500'}/><span className="text-sm font-black text-green-500">{formatCurrency(userProfile?.creditBalance || 0)}</span></div>
              <button onClick={handleLogout} className={`md:hidden text-xs p-3 rounded-xl text-red-500 ${userView === 'academy' ? 'bg-slate-800' : 'bg-slate-100'}`}><LogOut size={20} /></button>
            </div>
          </header>

          <div className={`p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full pb-24 md:pb-6`}>

            {/* --- VIEW: DASHBOARD --- */}
            {userView === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                {quickLinks.length > 0 && (
                  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickLinks.map(link => (
                      <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition flex items-center gap-4" style={{ '--tw-border-opacity': '1' } as any} onMouseOver={(e) => e.currentTarget.style.borderColor = brandColor} onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}>
                        <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center transition" style={{ color: brandColor, backgroundColor: `${brandColor}15` }}>{renderDynamicIcon(link.icon, 28)}</div>
                        <div><h4 className="font-bold text-slate-800 text-lg transition-colors">{link.title}</h4><p className="text-sm text-slate-500 mt-1">{link.subtitle}</p></div>
                      </a>
                    ))}
                  </section>
                )}

                <section className="space-y-4">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Megaphone className="text-orange-500"/> Mural de Avisos Importantes</h3>
                  {notices.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center"><Bell size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-medium">Nenhum aviso no momento.</p></div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {notices.map(notice => (
                           <div onClick={() => setSelectedNotice(notice)} key={notice.id} className="bg-slate-200 hover:bg-slate-300 cursor-pointer rounded-2xl shadow-sm border border-slate-300 overflow-hidden relative transition-colors group">
                              {notice.type === 'banner' && notice.imageUrl && (<div className="w-full h-40 bg-slate-300"><img src={notice.imageUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>)}
                              <div className="p-5">
                                  <div className="flex items-center gap-2 mb-2">{notice.type === 'banner' ? <ImageIcon style={{color:brandColor}} size={18}/> : <Bell className="text-orange-600" size={18}/>}<h4 className="font-black text-lg text-slate-800 line-clamp-1">{notice.title}</h4></div>
                                  {notice.content && (<p className="text-slate-500 text-sm line-clamp-2 mt-1">{notice.content}</p>)}
                                  <div className="mt-4 flex items-center justify-between"><p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(notice.createdAt)}</p><span className="text-xs font-bold group-hover:underline flex items-center gap-1" style={{color: brandColor}}>Ver mais <MousePointerClick size={12}/></span></div>
                              </div>
                           </div>
                        ))}
                      </div>
                  )}
                </section>
              </div>
            )}

            {/* --- VIEW: ACADEMY (NETFLIX) --- */}
            {userView === 'academy' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{backgroundColor: `${brandColor}20`}}><GraduationCap style={{color: brandColor}} size={32} /></div>
                        <div className="flex-1 w-full text-center md:text-left">
                            <h3 className="font-black text-lg text-white mb-2">Seu Progresso na Jornada</h3>
                            <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden relative"><div className="h-full transition-all duration-1000 ease-out" style={{ width: `${academyProgress}%`, backgroundColor: brandColor }}></div></div>
                            <p className="text-slate-400 text-xs mt-2 font-bold">{userProfile?.completedLessons?.length || 0} de {lessons.length} aulas concluídas ({academyProgress}%)</p>
                        </div>
                    </div>

                    {activeLesson ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                <button onClick={() => setActiveLesson(null)} className="text-slate-400 hover:text-white flex items-center gap-2 font-bold text-sm bg-slate-800 px-4 py-2 rounded-lg w-fit transition-colors"><ChevronLeft size={16}/> Voltar</button>
                                <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 w-full aspect-video">
                                    {getYoutubeId(activeLesson.youtubeUrl) ? (<iframe src={`https://www.youtube.com/embed/${getYoutubeId(activeLesson.youtubeUrl)}?autoplay=1&rel=0`} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen></iframe>) : (<div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900 font-bold">Vídeo Indisponível</div>)}
                                </div>
                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                                    <span className="font-black text-sm uppercase tracking-widest" style={{color: brandColor}}>{activeLesson.season} - Ep {activeLesson.episode}</span>
                                    <h1 className="text-2xl md:text-3xl font-black text-white mt-1 mb-4">{activeLesson.title}</h1>
                                    <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{activeLesson.description}</p>
                                    {activeLesson.materialLinks && (
                                        <div className="mt-6 pt-6 border-t border-slate-800">
                                            <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Link2 size={18} style={{color: brandColor}}/> Materiais Complementares</h3>
                                            <a href={activeLesson.materialLinks} target="_blank" rel="noreferrer" className="inline-block bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl text-sm font-bold transition-colors" style={{color: brandColor}}>Acessar Links / Materiais</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[70vh]">
                                <div className="p-4 border-b border-slate-800 bg-slate-800/50"><h3 className="font-black text-white">Conteúdo do Módulo</h3></div>
                                <div className="flex-1 overflow-y-auto hidden-scroll p-2 space-y-2">
                                    {lessons.filter(l => l.season === activeLesson.season).sort((a,b)=> a.episode - b.episode).map((ep) => {
                                        const isCompleted = userProfile?.completedLessons?.includes(ep.id);
                                        const isActive = activeLesson.id === ep.id;
                                        return (
                                            <div key={ep.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${isActive ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50 border border-transparent'}`}>
                                                <button onClick={(e) => { e.stopPropagation(); toggleLessonCompletion(ep.id); }} className="shrink-0 transition-colors" style={{color: isCompleted ? '#22c55e' : '#94a3b8'}}>
                                                    {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                                </button>
                                                <div onClick={() => setActiveLesson(ep)} className="flex-1 min-w-0">
                                                    <h4 className={`font-bold text-sm truncate ${isActive ? '' : 'text-slate-200'}`} style={isActive ? {color: brandColor} : {}}>{ep.episode}. {ep.title}</h4>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{isCompleted ? 'Concluído' : 'Pendente'}</span>
                                                </div>
                                                {isActive && <Play size={16} shrink-0 fill="currentColor" style={{color: brandColor}}/>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {lessons.length > 0 && (
                                <div className="relative w-full h-[300px] md:h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group">
                                    <img src={lessons[0].bannerUrl || 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?q=80&w=2070&auto=format&fit=crop'} loading="lazy" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Hero" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3">
                                        <div className="flex items-center gap-2 mb-2"><Film size={16} style={{color:brandColor}}/><span className="font-black text-xs uppercase tracking-widest" style={{color:brandColor}}>Comece por aqui</span></div>
                                        <h2 className="text-2xl md:text-5xl font-black text-white mb-2 leading-tight">{lessons[0].title}</h2>
                                        <p className="text-slate-300 text-xs md:text-sm line-clamp-2 mb-6 max-w-xl">{lessons[0].description}</p>
                                        <button onClick={() => setActiveLesson(lessons[0])} className="bg-white text-black hover:bg-slate-200 px-6 py-3 rounded-lg font-black flex items-center gap-2 transition-transform hover:scale-105 shadow-xl"><Play fill="black" size={20} /> Assistir Agora</button>
                                    </div>
                                </div>
                            )}

                            {lessons.length === 0 ? (
                                <div className="text-center py-20 text-slate-500 font-bold">Nenhuma aula disponível no momento.</div>
                            ) : (
                                <div className="space-y-10">
                                    {academySeasons.map((season, idx) => (
                                        <div key={idx}>
                                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-l-4 pl-3" style={{borderColor:brandColor}}>{season.name}</h3>
                                            <div className="flex overflow-x-auto gap-4 pb-4 hidden-scroll snap-x">
                                                {season.episodes.map(ep => {
                                                    const isCompleted = userProfile?.completedLessons?.includes(ep.id);
                                                    return (
                                                    <div key={ep.id} onClick={() => setActiveLesson(ep)} className="snap-start shrink-0 w-[260px] md:w-[320px] cursor-pointer group">
                                                        <div className="w-full aspect-video bg-slate-800 rounded-xl overflow-hidden relative shadow-lg border-2 border-slate-800 group-hover:border-slate-500 transition-colors">
                                                            {ep.bannerUrl ? (<img src={ep.bannerUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />) : (<div className="w-full h-full flex items-center justify-center text-slate-600"><Film size={40}/></div>)}
                                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                                <div className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 duration-300 shadow-xl backdrop-blur-sm" style={{backgroundColor: `${brandColor}E6`}}>
                                                                    <Play fill="white" size={24} className="ml-1"/>
                                                                </div>
                                                            </div>
                                                            <span className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg backdrop-blur">Ep {ep.episode}</span>
                                                            {isCompleted && <span className="absolute top-2 right-2 text-green-500 bg-black/80 rounded-full"><CheckCircle2 size={16}/></span>}
                                                        </div>
                                                        <div className="mt-3 pr-2">
                                                            <h4 className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors line-clamp-1">{ep.title}</h4>
                                                        </div>
                                                    </div>
                                                )})}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* --- VIEW: SUPORTE E TROCAS --- */}
            {userView === 'support' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Ticket style={{color:brandColor}}/> Abrir Chamado</h3>
                            <p className="text-sm text-slate-500 mt-1">Selecione o produto do catálogo que você comprou e relate o problema.</p>
                        </div>
                        <form onSubmit={handleOpenTicket} className="p-6 space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">1. O que você deseja fazer?</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 p-4 rounded-xl flex-1 transition-colors">
                                        <input type="radio" name="ticketType" checked={ticketType === 'troca'} onChange={() => {setTicketType('troca'); setTicketReason(''); setTicketDesiredProductId('');}} className="w-5 h-5" style={{accentColor: brandColor}} />
                                        <div><span className="font-bold text-slate-800 block">Troca Normal</span><span className="text-[10px] text-slate-500 font-medium">Trocar uma peça por outra</span></div>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 p-4 rounded-xl flex-1 transition-colors">
                                        <input type="radio" name="ticketType" checked={ticketType === 'devolucao'} onChange={() => {setTicketType('devolucao'); setTicketDesiredProductId('');}} className="accent-red-600 w-5 h-5" />
                                        <div><span className="font-bold text-slate-800 text-red-600 block">Devolução (Defeito)</span><span className="text-[10px] text-slate-500 font-medium">Devolver e gerar crédito</span></div>
                                    </label>
                                </div>
                            </div>

                            {ticketType === 'devolucao' && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm font-medium animate-in zoom-in">
                                    <strong>ATENÇÃO:</strong> Aceitamos devolução <strong>APENAS em casos de defeito de fabricação</strong>. Solicitações por outros motivos serão recusadas. O valor será creditado na sua carteira.
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">2. Selecione o Produto que vai devolver*</label>
                                <select value={ticketReturnProductId} onChange={(e) => {setTicketReturnProductId(e.target.value); const p = products.find(x => x.id === e.target.value); setTicketValue(p?.price || 0);}} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none font-medium text-sm focus:ring-2" style={{'--tw-ring-color':brandColor} as any}>
                                    <option value="">-- Clique para escolher no catálogo --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{String(p.name)} - Cor: {String(p.color)} - Tam: {String(p.size)} (R$ {formatCurrency(p.price)})</option>
                                    ))}
                                </select>
                            </div>

                            {ticketType === 'troca' && (
                                <div className="p-5 rounded-xl space-y-4 animate-in slide-in-from-top-2" style={{backgroundColor: `${brandColor}10`, borderColor: `${brandColor}30`, borderWidth: '1px'}}>
                                    <div className="flex items-center gap-2 font-bold mb-2" style={{color: brandColor}}><RefreshCw size={18}/> <span>3. Escolha a nova peça:</span></div>
                                    <div>
                                        <label className="text-xs font-bold uppercase mb-1 block" style={{color: brandColor}}>Selecione o Produto Desejado*</label>
                                        <select value={ticketDesiredProductId} onChange={(e) => setTicketDesiredProductId(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-800 outline-none font-medium text-sm shadow-sm focus:ring-2" style={{'--tw-ring-color':brandColor} as any}>
                                            <option value="">-- Clique para escolher a nova peça --</option>
                                            {products.filter(p => p.quantity > 4).map(p => (
                                                <option key={p.id} value={p.id}>{String(p.name)} - Cor: {String(p.color)} - Tam: {String(p.size)}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] mt-2 font-medium" style={{color: brandColor}}>*Apenas produtos com estoque disponível aparecem nesta lista.</p>
                                    </div>
                                </div>
                            )}
                            
                            {ticketType === 'devolucao' && (
                                <div className="animate-in slide-in-from-top-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">3. Motivo da Devolução (Qual o defeito?)*</label>
                                    <textarea value={ticketReason} onChange={e => setTicketReason(e.target.value)} required rows={3} placeholder="Explique qual defeito o produto apresentou..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 outline-none text-sm focus:ring-2" style={{'--tw-ring-color':brandColor} as any}></textarea>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                                <button type="submit" disabled={isSavingBatch || !ticketReturnProductId || (ticketType === 'troca' && !ticketDesiredProductId)} className={`w-full md:w-auto px-8 py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg transition-transform ${isSavingBatch || !ticketReturnProductId || (ticketType === 'troca' && !ticketDesiredProductId) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'text-white hover:scale-[1.02]'}`} style={(!isSavingBatch && ticketReturnProductId && (ticketType !== 'troca' || ticketDesiredProductId)) ? {backgroundColor: brandColor} : {}}>
                                    {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Enviar Solicitação
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800 text-lg">Meu Histórico de Chamados</h3></div>
                        <div className="p-4 space-y-3">
                            {myTickets.length === 0 ? (<p className="text-slate-400 text-center py-6">Você não possui chamados abertos.</p>) : myTickets.map(ticket => (
                                <div key={ticket.id} className="border border-slate-200 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-1.5 h-full`} style={{backgroundColor: ticket.type === 'devolucao' ? '#ef4444' : brandColor}}></div>
                                    <div className="pl-3 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2"><span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${ticket.type === 'devolucao' ? 'bg-red-100 text-red-700' : 'text-white'}`} style={ticket.type === 'troca' ? {backgroundColor: brandColor} : {}}>{ticket.type}</span><span className="text-xs text-slate-500 font-bold">{formatDate(ticket.createdAt)}</span></div>
                                            </div>
                                            <div>
                                                {ticket.status === 'pendente' && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-bold uppercase border border-yellow-200">Em Análise</span>}
                                                {ticket.status === 'aceito' && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold uppercase border border-emerald-200">Troca Aceita</span>}
                                                {ticket.status === 'aguardando_devolucao' && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-bold uppercase border border-orange-200 text-center block leading-tight">Aguardando<br/>Entrega</span>}
                                                {ticket.status === 'recusado' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold uppercase border border-red-200">Recusado</span>}
                                                {ticket.status === 'concluido' && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold uppercase border border-blue-200">Concluído</span>}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm"><p className="font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.productInfo}</p></div>
                                        {ticket.type === 'devolucao' && ticket.reason && (<p className="text-sm text-slate-600"><strong>Motivo:</strong> {ticket.reason}</p>)}
                                        {ticket.adminNote && (<div className="bg-slate-800 text-white p-3 rounded-lg text-sm flex gap-2"><MessageCircle size={16} className="shrink-0 text-blue-400" /><div><strong className="text-blue-400 block mb-0.5">Resposta do Fornecedor:</strong> {ticket.adminNote}</div></div>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW: CATÁLOGO COM EXPORTAÇÃO UPSELLER --- */}
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
                                       <div className="bg-slate-50 border-t border-slate-100 p-3 max-h-72 overflow-y-auto hidden-scroll animate-in slide-in-from-top-2 flex flex-col justify-between">
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
                                           {/* BOTÃO MÁGICO DO UPSELLER */}
                                           <button onClick={(e) => { e.stopPropagation(); handleExportToUpSeller(name, group); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs shadow-md mt-auto">
                                               <Download size={16}/> Exportar para UpSeller
                                           </button>
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
          <button onClick={() => {setUserView('academy'); setActiveLesson(null);}} className={`flex flex-col items-center gap-1 ${userView === 'academy' ? '' : 'text-slate-400'}`} style={userView === 'academy' ? {color: brandColor} : {}}><Play size={20} /><span className="text-[10px] font-bold">Aulas</span></button>
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
            <button onClick={() => setAdminView('predictive')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 col-span-2 md:col-span-2 lg:col-span-1 border-t-4 border-t-fuchsia-500"><div className="w-14 h-14 bg-fuchsia-500/10 rounded-full flex items-center justify-center"><BrainCircuit size={28} className="text-fuchsia-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Inteligência IA</h3></div></button>
            <button onClick={() => setAdminView('stock')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center"><Package size={28} className="text-blue-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Estoque</h3></div></button>
            <button onClick={() => setAdminView('add')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center"><Plus size={28} className="text-green-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Criar Produto</h3></div></button>
            <button onClick={() => { setShowQuickEntry(true); setScannedItems([]); }} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-yellow-500/10 rounded-full flex items-center justify-center"><Zap size={28} className="text-yellow-500 fill-yellow-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Entrada Rápida</h3></div></button>
            <button onClick={() => { setAdminView('purchases'); setPurchaseStep('select'); }} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-orange-500/10 rounded-full flex items-center justify-center"><Truck size={28} className="text-orange-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Pedidos Compra</h3></div></button>
            
            <button onClick={() => setAdminView('customers')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center"><Users size={28} className="text-indigo-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Clientes / Wallet</h3></div></button>
            <button onClick={() => setAdminView('tickets')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 relative">
                <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center"><Ticket size={28} className="text-rose-500" /></div>
                <div className="text-center"><h3 className="font-bold text-white text-sm">Chamados</h3></div>
                {allTickets.filter(t => t.status === 'pendente').length > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{allTickets.filter(t => t.status === 'pendente').length}</span>}
            </button>

            <button onClick={() => setAdminView('academy')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 border-b-4 border-b-red-600"><div className="w-14 h-14 bg-red-600/10 rounded-full flex items-center justify-center"><GraduationCap size={28} className="text-red-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Jornada Alunos</h3></div></button>

            <button onClick={() => setAdminView('history')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center"><ClipboardList size={28} className="text-purple-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Relatórios</h3></div></button>
            <button onClick={() => setAdminView('notices')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center"><Megaphone size={28} className="text-amber-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Avisos Dashboard</h3></div></button>
            <button onClick={() => setAdminView('links')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center"><Link2 size={28} className="text-cyan-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Botões Rápidos</h3></div></button>
            <button onClick={() => {setAdminView('showcases'); setEditingShowcase(null);}} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1 col-span-2 md:col-span-1"><div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center"><Store size={28} className="text-emerald-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Vitrines Públicas</h3></div></button>
          </div>
        )}

        {/* --- TELA: INTELIGÊNCIA PREDITIVA (DASHBOARD IA) --- */}
        {adminView === 'predictive' && predictiveData && (
            <div className="space-y-6 animate-in slide-in-from-right">
                <div className="p-5 border-b border-slate-800 bg-slate-900 rounded-2xl shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-3"><BrainCircuit className="text-fuchsia-500" size={28}/><h2 className="text-xl font-black text-white">Inteligência Preditiva</h2></div>
                    <div className="bg-fuchsia-500/20 text-fuchsia-400 px-4 py-2 rounded-lg font-bold text-sm">Análise dos Últimos 30 Dias</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 rounded-2xl border border-red-900/50 shadow-lg overflow-hidden">
                        <div className="p-4 bg-red-500/10 border-b border-red-900/50 flex items-center gap-2">
                            <AlertTriangle className="text-red-500" size={20} />
                            <h3 className="font-bold text-red-500">Fila de Produção Urgente</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-400 mb-3">Modelos com estoque no fim (menos de 15 dias) que estão vendendo rápido.</p>
                            {predictiveData.toProduce.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Tudo sob controle.</p> : predictiveData.toProduce.map(p => (
                                <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-red-900/30 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{String(p.name)}</h4>
                                        <span className="text-xs text-slate-400">{String(p.color)} - Tam {String(p.size)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-red-400 font-black text-lg">{Number(p.quantity)} un</span>
                                        <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded">Fura em {Math.ceil(p.daysRemaining)} dias</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl border border-emerald-900/50 shadow-lg overflow-hidden">
                        <div className="p-4 bg-emerald-500/10 border-b border-emerald-900/50 flex items-center gap-2">
                            <TrendingUp className="text-emerald-500" size={20} />
                            <h3 className="font-bold text-emerald-500">Campeões de Venda</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-400 mb-3">Os modelos com mais saídas nos últimos 30 dias.</p>
                            {predictiveData.topSellers.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Sem dados recentes.</p> : predictiveData.topSellers.map((p, idx) => (
                                <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-emerald-900/30 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-emerald-500 font-black text-lg">#{idx + 1}</span>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">{String(p.name)}</h4>
                                            <span className="text-xs text-slate-400">{String(p.color)} - Tam {String(p.size)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-emerald-400 font-black">{p.exits30d} saídas</span>
                                        <span className="text-[10px] text-slate-500">{(p.velocityPerDay).toFixed(1)} un/dia</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl border border-blue-900/50 shadow-lg overflow-hidden">
                        <div className="p-4 bg-blue-500/10 border-b border-blue-900/50 flex items-center gap-2">
                            <TrendingDown className="text-blue-500" size={20} />
                            <h3 className="font-bold text-blue-500">Estoque Encalhado</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-400 mb-3">Produtos com muito estoque (mais de 10) e ZERO vendas em 30 dias. Faça uma promoção!</p>
                            {predictiveData.deadStock.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Estoque girando bem.</p> : predictiveData.deadStock.map(p => (
                                <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-blue-900/30 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{String(p.name)}</h4>
                                        <span className="text-xs text-slate-400">{String(p.color)} - Tam {String(p.size)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-blue-400 font-black">{Number(p.quantity)} un</span>
                                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">Capital Travado</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- TELA: JORNADA DE ALUNOS (ADMIN ACADEMY) --- */}
        {adminView === 'academy' && (
           <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right">
                 <div className="p-5 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-3"><GraduationCap className="text-red-500" size={24}/><h2 className="text-xl font-black text-white">Criar Nova Aula</h2></div>
                 </div>
                 <form onSubmit={handleSaveAcademy} className="p-5 space-y-5">
                    
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">1. Organização do Módulo</label>
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="seasonMode" checked={academySeasonMode === 'existing'} onChange={() => setAcademySeasonMode('existing')} className="accent-red-500" />
                                <span className="text-sm font-bold">Módulo Existente</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="seasonMode" checked={academySeasonMode === 'new'} onChange={() => {setAcademySeasonMode('new'); setAcademySeason('');}} className="accent-red-500" />
                                <span className="text-sm font-bold">Criar Novo Módulo</span>
                            </label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                {academySeasonMode === 'existing' ? (
                                    <select value={academySeason} onChange={e => setAcademySeason(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 outline-none">
                                        <option value="">-- Selecione o Módulo --</option>
                                        {availableSeasons.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                ) : (
                                    <input value={academyNewSeason} onChange={e => setAcademyNewSeason(e.target.value)} required placeholder="Ex: Módulo 1: Primeiros Passos" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 outline-none" />
                                )}
                            </div>
                            <div>
                                <input type="number" value={academyEpisode} onChange={e => setAcademyEpisode(e.target.value)} required min="1" placeholder="Número da Aula (Ordem)" title="Número do Episódio (Ordem)" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-red-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título do Vídeo*</label>
                            <input value={academyTitle} onChange={e => setAcademyTitle(e.target.value)} required placeholder="Ex: Como anunciar no Mercado Livre" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-red-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link do YouTube*</label>
                            <input value={academyYoutube} onChange={e => setAcademyYoutube(e.target.value)} required placeholder="https://youtube.com/watch?v=..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-red-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição da Aula</label>
                        <textarea value={academyDesc} onChange={e => setAcademyDesc(e.target.value)} rows={3} placeholder="Explique sobre o que é o vídeo..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-red-500 outline-none"></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Capa do Vídeo / Banner (Opcional)</label>
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setAcademyBanner)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-red-500/20 file:text-red-400 hover:file:bg-red-500/30 cursor-pointer" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link de Materiais Complementares (Opcional)</label>
                            <input value={academyLinks} onChange={e => setAcademyLinks(e.target.value)} placeholder="Link do Google Drive, PDF, etc..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-red-500 outline-none" />
                        </div>
                    </div>
                    
                    <button type="submit" disabled={isSavingBatch} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] mt-4">
                        {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Publicar Aula
                    </button>
                 </form>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                 <div className="p-5 border-b border-slate-800 bg-slate-800/50">
                    <h2 className="text-lg font-bold text-white">Catálogo de Aulas Publicadas</h2>
                 </div>
                 <div className="p-5 space-y-6">
                     {academySeasons.length === 0 ? <p className="text-slate-500 text-center py-4">Nenhuma aula cadastrada.</p> : academySeasons.map((season, idx) => (
                         <div key={idx}>
                             <h3 className="font-black text-white text-lg mb-3 pb-2 border-b border-slate-800 flex items-center gap-2">
                                 <GraduationCap className="text-red-500" size={20}/> {season.name}
                             </h3>
                             <div className="space-y-3 pl-2 border-l-2 border-slate-800">
                                 {season.episodes.map(ep => (
                                     <div key={ep.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-colors ml-2">
                                         <div className="flex items-center gap-4">
                                            {ep.bannerUrl ? (
                                                <div className="w-24 h-16 bg-slate-800 rounded-lg overflow-hidden shrink-0"><img src={ep.bannerUrl} loading="lazy" className="w-full h-full object-cover"/></div>
                                            ) : (
                                                <div className="w-24 h-16 bg-slate-800 rounded-lg shrink-0 flex items-center justify-center"><Film className="text-slate-500"/></div>
                                            )}
                                            <div>
                                                <span className="text-[10px] text-red-500 font-black uppercase tracking-wider block mb-1">Aula {ep.episode}</span>
                                                <h4 className="font-bold text-white text-sm">{ep.title}</h4>
                                            </div>
                                         </div>
                                         <button onClick={() => handleDeleteAcademy(ep.id)} className="bg-red-500/10 text-red-400 p-3 rounded-lg hover:bg-red-500/20 transition-colors shrink-0"><Trash2 size={18}/></button>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     ))}
                 </div>
              </div>
           </div>
        )}

        {/* --- TELA DE CLIENTES (ADMIN) --- */}
        {adminView === 'customers' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-right">
                <div className="p-5 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                    <div className="flex items-center gap-3"><Users className="text-indigo-400" size={24}/><h2 className="text-xl font-black text-white">Revendedores Cadastrados</h2></div>
                    <div className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded font-bold text-sm">Total: {usersList.length}</div>
                </div>
                <div className="p-5 space-y-3">
                    {usersList.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhum cliente cadastrado.</p> : usersList.map(u => (
                        <div key={u.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-black text-lg uppercase">
                                    {u.name ? String(u.name).substring(0,2) : 'CL'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{u.name || 'Sem Nome'}</h3>
                                    <p className="text-sm text-slate-500">{u.email}</p>
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg flex items-center gap-3 min-w-[200px] justify-between">
                                <span className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1"><Wallet size={14}/> Crédito Atual</span>
                                <span className="text-lg font-black text-green-400">{formatCurrency(u.creditBalance || 0)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- TELA DE TICKETS / CHAMADOS (ADMIN) --- */}
        {adminView === 'tickets' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-right">
                <div className="p-5 border-b border-slate-800 bg-slate-800/30">
                    <div className="flex items-center gap-3"><Ticket className="text-rose-400" size={24}/><h2 className="text-xl font-black text-white">Central de Resoluções</h2></div>
                    <p className="text-sm text-slate-400 mt-1">Gerencie trocas e devoluções solicitadas pelos revendedores.</p>
                </div>
                <div className="p-5 space-y-4">
                    {allTickets.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhum chamado aberto no momento.</p> : allTickets.map(ticket => (
                        <div key={ticket.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${ticket.type === 'devolucao' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>{ticket.type}</span>
                                        <span className="text-xs text-slate-500 font-mono">{formatDate(ticket.createdAt)}</span>
                                        {ticket.status === 'pendente' && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded uppercase animate-pulse border border-yellow-500/30">Novo</span>}
                                        {ticket.status === 'aguardando_devolucao' && <span className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-orange-500/30 flex items-center gap-1"><Clock size={10}/> Esperando Peça</span>}
                                        {ticket.status === 'aceito' && <span className="text-emerald-500 text-[10px] font-black uppercase"><Check size={12} className="inline"/> Autorizado</span>}
                                        {ticket.status === 'concluido' && <span className="text-blue-500 text-[10px] font-black uppercase">Finalizado</span>}
                                        {ticket.status === 'recusado' && <span className="text-red-500 text-[10px] font-black uppercase">Recusado</span>}
                                    </div>
                                    <h3 className="font-bold text-white text-lg">{ticket.userName}</h3>
                                </div>
                                <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-right">
                                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Valor Ref.</span>
                                    <span className="font-black text-green-400">{formatCurrency(ticket.productValue)}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Dados da Solicitação</span>
                                    <span className="font-medium text-white whitespace-pre-wrap leading-relaxed block">{ticket.productInfo}</span>
                                </div>
                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Motivo / Defeito</span>
                                    <span className="font-medium text-slate-300 text-sm leading-relaxed block">{ticket.reason}</span>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-wrap gap-2">
                                {ticket.status === 'pendente' && ticket.type === 'troca' && (
                                    <>
                                        <button onClick={() => handleAdminTicketAction(ticket, 'aceitar_troca')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Check size={16}/> Aceitar Troca</button>
                                        <button onClick={() => handleAdminTicketAction(ticket, 'recusar')} className="bg-slate-800 hover:bg-slate-700 text-red-400 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><X size={16}/> Recusar</button>
                                    </>
                                )}
                                
                                {ticket.status === 'pendente' && ticket.type === 'devolucao' && (
                                    <>
                                        <button onClick={() => handleAdminTicketAction(ticket, 'aceitar_devolucao')} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Clock size={16}/> Autorizar (Aguardar Peça)</button>
                                        <button onClick={() => handleAdminTicketAction(ticket, 'recusar')} className="bg-slate-800 hover:bg-slate-700 text-red-400 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><X size={16}/> Recusar (Sem Defeito)</button>
                                    </>
                                )}

                                {ticket.status === 'aguardando_devolucao' && ticket.type === 'devolucao' && (
                                    <button onClick={() => handleAdminTicketAction(ticket, 'recebido_gerar_credito')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 animate-bounce"><Wallet size={18}/> Produto Entregue - Gerar Crédito (R$ {ticket.productValue.toFixed(2)})</button>
                                )}

                                {ticket.status === 'aceito' && ticket.type === 'troca' && (
                                    <button onClick={() => handlePrintTicket(ticket)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Printer size={16}/> Imprimir Via de Troca</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- TELA DE VITRINES PÚBLICAS (ADMIN) --- */}
        {adminView === 'showcases' && (
            <div className="space-y-6 animate-in slide-in-from-right">
                {!editingShowcase ? (
                    <>
                        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl">
                            <div className="flex items-center gap-2"><Store className="text-emerald-400" /><h2 className="text-lg font-bold text-white">Vitrines Digitais</h2></div>
                            <button onClick={() => setEditingShowcase({ config: { showPrice: true, priceMarkup: 0 }, models: [] })} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={16}/> Nova Vitrine</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {showcases.length === 0 ? (
                                <p className="text-slate-500 p-4 col-span-2 text-center">Nenhuma vitrine criada. Crie uma para divulgar seu catálogo.</p>
                            ) : showcases.map(showcase => (
                                <div key={showcase.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
                                    <div>
                                        <h3 className="font-bold text-xl text-white flex items-center gap-2">{showcase.name}</h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {showcase.config.showPrice 
                                                ? `Mostra Preço ${showcase.config.priceMarkup > 0 ? `(+${showcase.config.priceMarkup}%)` : '(Original)'}` 
                                                : 'Preço Oculto'} 
                                            • {showcase.models.length} Modelos
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => copyShowcaseLink(showcase.linkId)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-blue-400 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm"><Copy size={16}/> Copiar Link</button>
                                        <button onClick={() => setEditingShowcase(showcase)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm"><Pencil size={16}/> Editar</button>
                                        <button onClick={() => handleDeleteShowcase(showcase.id)} className="bg-slate-800 hover:bg-slate-700 text-red-400 p-2 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                         <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white">{editingShowcase.id ? 'Editar Vitrine' : 'Nova Vitrine'}</h2>
                            <button onClick={() => setEditingShowcase(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X size={20}/></button>
                         </div>
                         <div className="p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Catálogo/Vitrine</label>
                                    <input value={editingShowcase.name || ''} onChange={e => setEditingShowcase({...editingShowcase, name: e.target.value})} placeholder="Ex: Catálogo Inverno Varejo" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" />
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-white">
                                        <input type="checkbox" checked={editingShowcase.config?.showPrice} onChange={e => setEditingShowcase({...editingShowcase, config: {...editingShowcase.config!, showPrice: e.target.checked}})} className="w-5 h-5 accent-emerald-500 rounded" />
                                        Exibir Preços
                                    </label>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Percent size={14}/> Acréscimo no Preço (%)</label>
                                    <input type="number" disabled={!editingShowcase.config?.showPrice} value={editingShowcase.config?.priceMarkup || 0} onChange={e => setEditingShowcase({...editingShowcase, config: {...editingShowcase.config!, priceMarkup: parseFloat(e.target.value) || 0}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none disabled:opacity-50" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-white text-lg">Selecionar Produtos</h3>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={selectAllModelsForShowcase} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:text-white">Marcar Todos</button>
                                        <button type="button" onClick={clearAllModelsForShowcase} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:text-white">Desmarcar Todos</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {Object.entries(groupedAdminProducts).map(([name, group]) => {
                                        const isSelected = (editingShowcase.models || []).includes(name);
                                        return (
                                            <div key={name} onClick={() => toggleModelInShowcase(name)} className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}>
                                                <div className="w-full aspect-square bg-slate-900 rounded overflow-hidden">
                                                    {group.info.image ? <img src={group.info.image} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon className="m-auto mt-4 text-slate-600"/>}
                                                </div>
                                                <span className="text-sm font-bold text-white line-clamp-1">{name}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <button onClick={handleSaveShowcase} disabled={isSavingBatch} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors mt-4">
                                {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Salvar Vitrine Pública
                            </button>
                         </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TELA DE AVISOS (ADMIN) --- */}
        {adminView === 'notices' && (
           <div className="space-y-6">
              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right">
                 <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-2"><Megaphone className="text-amber-400" /><h2 className="text-lg font-bold text-white">Adicionar Aviso / Banner</h2></div>
                 </div>
                 <form onSubmit={handleSaveNotice} className="p-4 md:p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tipo de Publicação</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 p-3 rounded-lg flex-1">
                                <input type="radio" name="noticeType" checked={noticeType === 'text'} onChange={() => setNoticeType('text')} className="accent-amber-500" />
                                <span className="font-bold text-sm">Aviso Normal</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 p-3 rounded-lg flex-1">
                                <input type="radio" name="noticeType" checked={noticeType === 'banner'} onChange={() => setNoticeType('banner')} className="accent-amber-500" />
                                <span className="font-bold text-sm">Banner com Imagem</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título Importante*</label>
                        <input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} required placeholder="Ex: Novo Catálogo de Inverno!" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Texto do Aviso {noticeType === 'banner' && '(Aparecerá quando clicado)'}</label>
                        <textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} rows={4} placeholder="Digite a mensagem detalhada..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none"></textarea>
                    </div>
                    {noticeType === 'banner' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Escolha a Foto do Banner (Máx 800KB)</label>
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNoticeImage)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30 cursor-pointer" />
                            {noticeImage && (<div className="mt-4 p-2 bg-slate-800 rounded-lg border border-slate-700"><img src={noticeImage} className="h-32 object-cover rounded shadow-md" /></div>)}
                        </div>
                    )}
                    <button type="submit" disabled={isSavingBatch} className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors mt-4">
                        {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Megaphone size={20} />} Publicar no Dashboard
                    </button>
                 </form>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                 <div className="p-4 border-b border-slate-800 bg-slate-800/50"><h2 className="text-lg font-bold text-white">Avisos Ativos</h2></div>
                 <div className="p-4 space-y-3">
                     {notices.length === 0 ? <p className="text-slate-500 text-center py-4">Nenhum aviso ativo.</p> : notices.map(notice => (
                         <div key={notice.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-start">
                             <div>
                                 <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${notice.type === 'banner' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{notice.type}</span><h3 className="font-bold text-white text-sm">{notice.title}</h3></div>
                                 <p className="text-xs text-slate-500">{formatDate(notice.createdAt)}</p>
                             </div>
                             <button onClick={() => handleDeleteNotice(notice.id)} className="bg-red-500/10 text-red-400 p-2 rounded hover:bg-red-500/20"><Trash2 size={16}/></button>
                         </div>
                     ))}
                 </div>
              </div>
           </div>
        )}

        {/* --- TELA DE BOTÕES RÁPIDOS (ADMIN) --- */}
        {adminView === 'links' && (
           <div className="space-y-6">
              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right">
                 <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center"><div className="flex items-center gap-2"><Link2 className="text-cyan-400" /><h2 className="text-lg font-bold text-white">Criar Botão Rápido</h2></div></div>
                 <form onSubmit={handleSaveLink} className="p-4 md:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Botão*</label><input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Subtítulo</label><input value={linkSubtitle} onChange={e => setLinkSubtitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link de Destino*</label><input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ícone</label><select value={linkIcon} onChange={e => setLinkIcon(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"><option value="MessageCircle">WhatsApp</option><option value="ImageIcon">Fotos/Drive</option><option value="Globe">Site</option><option value="Link2">Link Padrão</option></select></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ordem</label><input type="number" value={linkOrder} onChange={e => setLinkOrder(e.target.value)} required min="1" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" /></div>
                        </div>
                    </div>
                    <button type="submit" disabled={isSavingBatch} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors mt-4">{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Salvar Botão</button>
                 </form>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                 <div className="p-4 border-b border-slate-800 bg-slate-800/50"><h2 className="text-lg font-bold text-white">Botões Ativos</h2></div>
                 <div className="p-4 space-y-3">
                     {quickLinks.map(link => (
                         <div key={link.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center"><div className="flex items-center gap-4"><div className="bg-slate-800 p-3 rounded-lg text-slate-300">{renderDynamicIcon(link.icon, 20)}</div><div><div className="flex items-center gap-2"><h3 className="font-bold text-white text-sm">{link.title}</h3><span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Ordem: {link.order}</span></div><p className="text-xs text-blue-400 truncate max-w-[200px]">{link.url}</p></div></div><button onClick={() => handleDeleteLink(link.id)} className="bg-red-500/10 text-red-400 p-2 rounded hover:bg-red-500/20"><Trash2 size={16}/></button></div>
                     ))}
                 </div>
              </div>
           </div>
        )}

        {/* --- ESTOQUE DO ADMIN --- */}
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
                        <div className="text-sm font-bold text-slate-500 mt-0.5">{group.info.sku ? String(group.info.sku).split('-')[0] : '---'}</div>
                        <div className="text-[10px] md:text-xs font-bold text-blue-400 mt-2 bg-blue-500/10 px-2 py-1 inline-block rounded-md">{group.items.length} variações</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openGroupEdit(name, group); }} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 p-3 rounded-xl transition-colors shadow-sm hidden md:block" title="Editar Modelo"><Pencil size={18} /></button>
                      <div className="text-right bg-slate-950 px-4 py-2 rounded-xl border border-slate-800"><div className="text-2xl font-black text-white">{group.total}</div><div className="text-[10px] text-slate-500 uppercase font-bold">Total</div></div>
                      <div className="bg-slate-800 p-2 rounded-xl text-slate-400">{expandedGroups[name] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</div>
                    </div>
                  </div>

                  {expandedGroups[name] && (
                    <div className="bg-slate-950 border-t border-slate-800 p-3 mt-2 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                      <div className="md:hidden flex justify-end mb-2">
                          <button onClick={(e) => { e.stopPropagation(); openGroupEdit(name, group); }} className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Pencil size={12} /> Editar Modelo</button>
                      </div>
                      {group.items.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-black bg-slate-800 text-white px-2 py-1 rounded">{String(p.size || '')}</span><span className="text-xs text-slate-400 uppercase font-bold">{String(p.color || '')}</span></div><div className="text-[10px] text-slate-600 font-mono flex items-center gap-1"><ScanBarcode size={10} /> {p.barcode ? String(p.barcode) : '---'}</div></div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 overflow-hidden h-10 shadow-sm"><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, Number(p.quantity) - 1); }} className="w-10 h-full hover:bg-slate-800 text-slate-400 hover:text-white font-black text-lg">-</button><div className="w-12 text-center font-black text-white text-sm">{Number(p.quantity)}</div><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, Number(p.quantity) + 1); }} className="w-10 h-full hover:bg-slate-800 text-slate-400 hover:text-white font-black text-lg">+</button></div>
                            <button onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-blue-400 bg-slate-950 border border-slate-800 rounded-lg" title="Editar variação"><Pencil size={16} /></button>
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

        {/* --- TELA DE GERAÇÃO DE GRADE --- */}
        {adminView === 'add' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden relative animate-in slide-in-from-right">
            <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-800/50"><h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><Layers size={24} className="text-green-500" /> Gerador de Variações</h2></div>
            <div className="p-4 md:p-6 space-y-6 md:space-y-8">
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Package size={16} className="text-blue-400" /> 1. Produto Pai</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-400 block mb-1">Nome*</label><input value={baseName} onChange={e => setBaseName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                <div><label className="text-sm text-slate-400 block mb-1">SKU Base*</label><input value={baseSku} onChange={e => setBaseSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                <div><label className="text-sm text-slate-400 block mb-1">Preço Padrão (R$)*</label><input value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="Ex: 59,90" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                <div><label className="text-sm text-slate-400 block mb-1">Foto Principal</label><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBaseImage)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 cursor-pointer" />{baseImage && (<div className="mt-2 w-16 h-16 rounded overflow-hidden border border-slate-700"><img src={baseImage} className="w-full h-full object-cover" /></div>)}</div>
                <div className="md:col-span-2"><label className="text-sm text-slate-400 block mb-1 flex items-center gap-2"><Download size={14}/> Descrição do Anúncio (Opcional - Para exportação UpSeller)</label><textarea value={baseDescription} onChange={e => setBaseDescription(e.target.value)} rows={3} placeholder="Descreva o produto com detalhes de material, conforto e estilo..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"></textarea></div>
              </div></div>
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Layers size={16} className="text-blue-400" /> 2. Grade</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-sm text-slate-400 block mb-2">Cores (Enter)</label><div className="flex gap-2 mb-2"><input value={tempColor} onChange={e => setTempColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{colors.map(c => <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button></span>)}</div></div><div><label className="text-sm text-slate-400 block mb-2">Tamanhos (Enter)</label><div className="flex gap-2 mb-2"><input value={tempSize} onChange={e => setTempSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{sizes.map(s => <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button></span>)}</div></div></div></div>
              {generatedRows.length > 0 && (<div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Variações ({generatedRows.length})</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU</th><th className="p-2">Barcode</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></td></tr>))}</tbody></table></div></div>)}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-xl px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} {isSavingBatch ? 'SALVANDO...' : 'GERAR VARIAÇÕES'}</button></div>
            </div>
          </div>
        )}

        {/* --- MODAIS DE EDIÇÃO --- */}
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
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nova Foto do Modelo</label><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (val) => setEditingGroup({...editingGroup, image: val}))} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 cursor-pointer" />{editingGroup.image && (<div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-700"><img src={editingGroup.image} className="w-full h-full object-cover" /></div>)}</div>
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
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Foto Exclusiva</label><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (val) => setEditingProduct({...editingProduct, image: val}))} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 cursor-pointer" />{editingProduct.image && (<div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-700"><img src={editingProduct.image} className="w-full h-full object-cover" /></div>)}</div>
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