import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  limit,
  increment
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  Bell, Package, RefreshCw, Trash2, Plus, Smartphone, LogOut,
  ScanBarcode, Image as ImageIcon, Search, X, Save, Check,
  Layers, Pencil, Zap, AlertCircle, Camera, StopCircle,
  ChevronLeft, ClipboardList, ChevronDown, ChevronUp,
  ShoppingCart, MessageCircle, Minus, Truck, FileText, ShoppingBag,
  LayoutGrid, Megaphone, Upload, Link2, Video, Globe, MousePointerClick,
  Store, Copy, Percent, Ticket, Users, Wallet, Printer, Clock
} from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";

// --- SONS ---
const SOUNDS = {
  success: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  alert: "https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3",
  magic: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"
};

const playSound = (type: 'success' | 'error' | 'alert' | 'magic') => {
  try {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio bloqueado:", e));
  } catch (e) { console.error(e); }
};

const sendSystemNotification = (title: string, body: string) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.showNotification(title, { body, icon: '/vite.svg', vibrate: [200, 100, 200] });
        } else {
          new Notification(title, { body, icon: '/vite.svg' });
        }
      });
    } catch (e) { new Notification(title, { body }); }
  }
};

// BLINDAGEM DE MOEDA: Impede erro se o valor vier quebrado ou indefinido
const formatCurrency = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const processImageUrl = (url: string) => {
  if (!url) return '';
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

// --- RENDERIZADOR DE ÍCONES DINÂMICO ---
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

// --- CONFIGURAÇÃO FIREBASE ---
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
const appId = "estoque-loja";
const PRODUCTS_COLLECTION = `artifacts/${appId}/public/data/products`;
const HISTORY_COLLECTION = `artifacts/${appId}/public/data/history`;
const PURCHASES_COLLECTION = `artifacts/${appId}/public/data/purchases`;
const NOTICES_COLLECTION = `artifacts/${appId}/public/data/notices`; 
const QUICKLINKS_COLLECTION = `artifacts/${appId}/public/data/quickLinks`;
const SHOWCASES_COLLECTION = `artifacts/${appId}/public/data/showcases`; 
const TICKETS_COLLECTION = `artifacts/${appId}/public/data/tickets`;

// Tipos
type Product = { id: string; sku?: string; barcode?: string; image?: string; name: string; color: string; size: string; quantity: number; price: number; updatedAt?: any; };
type VariationRow = { color: string; size: string; sku: string; barcode: string; };
type ScannedItem = { product: Product; count: number; };
type HistoryItem = { id: string; productId: string; productName: string; sku: string; image: string; type: 'entry' | 'exit' | 'correction'; amount: number; previousQty: number; newQty: number; timestamp: any; };
type CartItem = { product: Product; quantity: number; };
type PurchaseOrder = { id: string; orderCode: string; supplier: string; status: 'pending' | 'received'; items: { productId: string; sku: string; name: string; quantity: number }[]; totalItems: number; createdAt: any; receivedAt?: any; };
type Notice = { id: string; type: 'text' | 'banner'; title: string; content?: string; imageUrl?: string; createdAt: any; };
type QuickLink = { id: string; title: string; subtitle: string; icon: string; url: string; order: number; createdAt?: any; };
type Showcase = { id: string; name: string; linkId: string; config: { showPrice: boolean; priceMarkup: number; }; models: string[]; createdAt?: any; };
type UserProfile = { id: string; name: string; email: string; role: string; creditBalance: number; createdAt?: any; };
type SupportTicket = { id: string; userId: string; userName: string; type: 'troca' | 'devolucao'; status: 'pendente' | 'aceito' | 'recusado' | 'aguardando_devolucao' | 'concluido'; productInfo: string; productValue: number; reason: string; adminNote?: string; createdAt: any; updatedAt?: any; };

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const vitrineLinkId = urlParams.get('vitrine');
  const [isVitrineMode] = useState(!!vitrineLinkId);
  const [publicVitrine, setPublicVitrine] = useState<Showcase | null>(null);

  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);

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
  
  const [adminView, setAdminView] = useState<'menu' | 'stock' | 'add' | 'history' | 'purchases' | 'notices' | 'links' | 'showcases' | 'customers' | 'tickets'>('menu');
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'review'>('select');
  
  const [userView, setUserView] = useState<'dashboard' | 'catalog' | 'cart' | 'orders' | 'support'>('dashboard');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchaseCart, setPurchaseCart] = useState<CartItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  const [permissionGranted, setPermissionGranted] = useState(false);
  const prevProductsRef = useRef<Product[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

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

  const [editingShowcase, setEditingShowcase] = useState<Partial<Showcase> | null>(null);

  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [ticketType, setTicketType] = useState<'troca' | 'devolucao'>('troca');
  const [ticketProduct, setTicketProduct] = useState('');
  const [ticketValue, setTicketValue] = useState('');
  const [ticketReason, setTicketReason] = useState('');

  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanError, setScanError] = useState('');
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{type: 'success' | 'error' | 'magic', msg: string} | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // BLINDAGEM NO AGRUPAMENTO (Impede a tela de ficar branca se faltar dado)
  const groupProducts = (items: Product[]) => { 
      const groups: Record<string, { info: Product, total: number, items: Product[] }> = {}; 
      if (!items || !Array.isArray(items)) return groups;

      items.forEach(product => { 
          if (!product) return;
          const key = String(product.name || 'Sem Nome'); // Força a ser string
          if (!groups[key]) groups[key] = { info: product, total: 0, items: [] }; 
          groups[key].items.push(product); 
          groups[key].total += Number(product.quantity || 0); // Força a ser número
      }); 
      Object.values(groups).forEach(group => group.items.sort((a, b) => (String(a.size || '') > String(b.size || '') ? 1 : -1))); 
      return groups; 
  };
  const toggleGroup = (groupName: string) => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  const formatDate = (timestamp: any) => { if (!timestamp) return '...'; const date = timestamp.toDate(); return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date); };

  // --- FETCH DADOS INICIAIS ---
  useEffect(() => {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as Product); });
      
      if (!loading && selectedRole === 'user' && !isVitrineMode) {
        const previousProducts = prevProductsRef.current;
        const soldOutItems = items.filter(newItem => {
          const oldItem = previousProducts.find(p => p.id === newItem.id);
          return oldItem && oldItem.quantity > 4 && newItem.quantity <= 4;
        });
        if (soldOutItems.length > 0) {
          playSound('alert'); sendSystemNotification("⚠️ ESTOQUE ZEROU!", `${soldOutItems.length} produtos acabaram de esgotar!`);
        }
      }
      prevProductsRef.current = items;
      setProducts(items);
      setFilteredProducts(items);
      setLoading(false);
    });

    if (!isVitrineMode) {
        const unsubNotices = onSnapshot(query(collection(db, NOTICES_COLLECTION), orderBy('createdAt', 'desc')), (snap) => setNotices(snap.docs.map(d => ({id: d.id, ...d.data()} as Notice))));
        const unsubLinks = onSnapshot(query(collection(db, QUICKLINKS_COLLECTION), orderBy('order', 'asc')), (snap) => setQuickLinks(snap.docs.map(d => ({id: d.id, ...d.data()} as QuickLink))));
        const unsubShowcases = onSnapshot(query(collection(db, SHOWCASES_COLLECTION)), (snap) => setShowcases(snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase))));

        return () => { unsubscribe(); unsubNotices(); unsubLinks(); unsubShowcases(); };
    } else {
        const unsubShowcases = onSnapshot(query(collection(db, SHOWCASES_COLLECTION)), (snap) => {
            const allVitrines = snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase));
            setPublicVitrine(allVitrines.find(v => v.linkId === vitrineLinkId) || null);
        });
        return () => { unsubscribe(); unsubShowcases(); };
    }
  }, [loading, selectedRole, isVitrineMode, vitrineLinkId]);

  useEffect(() => {
     if (user && selectedRole === 'user') {
         const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
             if (docSnap.exists()) setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
         });
         
         const unsubMyTickets = onSnapshot(collection(db, TICKETS_COLLECTION), (snap) => {
             const items = snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket));
             const myItems = items.filter(t => t.userId === user.uid).sort((a,b) => b.createdAt - a.createdAt);
             setMyTickets(myItems);
         });

         return () => { unsubProfile(); unsubMyTickets(); };
     }
  }, [user, selectedRole]);

  useEffect(() => {
    if (selectedRole === 'admin') {
      const unsubHist = onSnapshot(query(collection(db, HISTORY_COLLECTION), orderBy('timestamp', 'desc'), limit(50)), (snap) => setHistory(snap.docs.map(d => ({id: d.id, ...d.data()} as HistoryItem))));
      const unsubPurch = onSnapshot(query(collection(db, PURCHASES_COLLECTION), orderBy('createdAt', 'desc')), (snap) => setPurchases(snap.docs.map(d => ({id: d.id, ...d.data()} as PurchaseOrder))));
      const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
          const list = snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile));
          setUsersList(list.filter(u => u.role === 'revendedor'));
      });
      const unsubAllTickets = onSnapshot(query(collection(db, TICKETS_COLLECTION), orderBy('createdAt', 'desc')), (snap) => setAllTickets(snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket))));

      return () => { unsubHist(); unsubPurch(); unsubUsers(); unsubAllTickets(); };
    }
  }, [selectedRole]);

  // BLINDAGEM DE PESQUISA: Impede quebrar se um produto não tiver SKU ou for um número
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
  
  // --- FUNÇÕES DE LOGIN ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        if(!authName) return setAuthError('Por favor, preencha o seu nome completo.');
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: authName,
          email: authEmail,
          role: 'revendedor',
          creditBalance: 0,
          createdAt: serverTimestamp()
        });
        setSelectedRole('user'); playSound('success');
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setSelectedRole('user'); playSound('success');
      }
    } catch (err: any) { setAuthError('Erro: ' + (err.message.includes('invalid-credential') ? 'E-mail ou senha incorretos.' : err.message)); playSound('error'); }
  };

  const handleLogout = async () => { await signOut(auth); setSelectedRole(null); setUserView('dashboard'); setAdminView('menu'); setUserProfile(null); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
       if(file.size > 800000) { alert("A imagem é muito grande. Escolha uma foto menor que 800KB."); return; }
       const reader = new FileReader();
       reader.onloadend = () => { setter(reader.result as string); };
       reader.readAsDataURL(file);
    }
  };

  // --- FUNÇÕES DE TICKETS (REVENDEDOR & ADMIN) ---
  const handleOpenTicket = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!ticketProduct || !ticketReason || !ticketValue) return alert("Preencha todos os campos do produto, valor e motivo.");
      if(!user || !userProfile) return;
      setIsSavingBatch(true);
      try {
          await addDoc(collection(db, TICKETS_COLLECTION), {
              userId: user.uid,
              userName: userProfile.name,
              type: ticketType,
              status: 'pendente',
              productInfo: ticketProduct,
              productValue: parseFloat(ticketValue),
              reason: ticketReason,
              createdAt: serverTimestamp()
          });
          setTicketProduct(''); setTicketValue(''); setTicketReason('');
          alert("Solicitação enviada com sucesso! Aguarde o retorno do fornecedor.");
          playSound('success');
      } catch (error) { console.error(error); alert("Erro ao abrir chamado."); } finally { setIsSavingBatch(false); }
  };

  const handleAdminTicketAction = async (ticket: SupportTicket, action: 'aceitar_troca' | 'recusar' | 'aceitar_devolucao' | 'recebido_gerar_credito') => {
      setIsSavingBatch(true);
      try {
          const ticketRef = doc(db, TICKETS_COLLECTION, ticket.id);
          
          if (action === 'aceitar_troca') {
              await updateDoc(ticketRef, { status: 'aceito', updatedAt: serverTimestamp() });
              alert("Troca Aceita! Imprima a via de troca e separe o produto.");
          } 
          else if (action === 'recusar') {
              const note = prompt("Motivo da recusa (Opcional):");
              await updateDoc(ticketRef, { status: 'recusado', adminNote: note || '', updatedAt: serverTimestamp() });
          }
          else if (action === 'aceitar_devolucao') {
              await updateDoc(ticketRef, { status: 'aguardando_devolucao', updatedAt: serverTimestamp() });
              alert("Devolução autorizada. Aguardando o cliente entregar o produto.");
          }
          else if (action === 'recebido_gerar_credito') {
              if (confirm(`Confirma o recebimento do produto? Isso vai gerar R$ ${ticket.productValue.toFixed(2)} de CRÉDITO para o cliente ${ticket.userName}.`)) {
                  const batch = writeBatch(db);
                  batch.update(ticketRef, { status: 'concluido', updatedAt: serverTimestamp() });
                  batch.update(doc(db, 'users', ticket.userId), { creditBalance: increment(ticket.productValue) });
                  await batch.commit();
                  playSound('magic');
                  alert("Sucesso! O crédito já está na conta do cliente.");
              }
          }
      } catch (e) { console.error(e); alert("Erro ao processar ticket."); } finally { setIsSavingBatch(false); }
  };

  const handlePrintTicket = (ticket: SupportTicket) => {
      const printContent = `
          <html>
          <head>
              <title>Via de Troca</title>
              <style>
                  body { font-family: sans-serif; padding: 20px; }
                  .box { border: 2px dashed #000; padding: 20px; max-width: 400px; margin: 0 auto; }
                  h2 { text-align: center; margin-top: 0; }
                  p { margin: 8px 0; font-size: 14px; }
                  .line { border-top: 1px solid #ccc; margin: 15px 0; }
                  .sign { margin-top: 40px; text-align: center; }
              </style>
          </head>
          <body>
              <div class="box">
                  <h2>VIA DE AUTORIZAÇÃO</h2>
                  <p><strong>TIPO:</strong> ${ticket.type.toUpperCase()}</p>
                  <p><strong>CLIENTE:</strong> ${ticket.userName}</p>
                  <p><strong>PRODUTO:</strong> ${ticket.productInfo}</p>
                  <p><strong>MOTIVO:</strong> ${ticket.reason}</p>
                  <div class="line"></div>
                  <p><strong>DATA:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                  <div class="sign">
                      ___________________________________<br/>
                      Assinatura Responsável
                  </div>
              </div>
          </body>
          </html>
      `;
      const printWindow = window.open('', '_blank', 'width=600,height=600');
      if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
      }
  };

  // --- FUNÇÕES RESTANTES (GERADOR, CRUD, ADMIN AVISOS/VITRINES) ---
  const handleSaveNotice = async (e: React.FormEvent) => { e.preventDefault(); if (!noticeTitle) return; setIsSavingBatch(true); try { await addDoc(collection(db, NOTICES_COLLECTION), { type: noticeType, title: noticeTitle, content: noticeContent, imageUrl: noticeType === 'banner' ? noticeImage : '', createdAt: serverTimestamp() }); setNoticeTitle(''); setNoticeContent(''); setNoticeImage(''); alert("Aviso publicado!"); } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handleDeleteNotice = async (id: string) => { if(confirm('Apagar?')) await deleteDoc(doc(db, NOTICES_COLLECTION, id)); };
  const handleSaveLink = async (e: React.FormEvent) => { e.preventDefault(); if(!linkTitle || !linkUrl) return; setIsSavingBatch(true); try { await addDoc(collection(db, QUICKLINKS_COLLECTION), { title: linkTitle, subtitle: linkSubtitle, icon: linkIcon, url: linkUrl, order: parseInt(linkOrder) || 1, createdAt: serverTimestamp() }); setLinkTitle(''); setLinkSubtitle(''); setLinkUrl(''); setLinkOrder('1'); alert("Salvo!"); } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } };
  const handleDeleteLink = async (id: string) => { if(confirm('Apagar?')) await deleteDoc(doc(db, QUICKLINKS_COLLECTION, id)); };
  const handleSaveShowcase = async (e: React.FormEvent) => { e.preventDefault(); if (!editingShowcase?.name) return; setIsSavingBatch(true); try { const payload = { name: editingShowcase.name, linkId: editingShowcase.linkId || `cat-${Math.random().toString(36).substring(2, 8)}`, config: { showPrice: editingShowcase.config?.showPrice ?? true, priceMarkup: editingShowcase.config?.priceMarkup || 0 }, models: editingShowcase.models || [], createdAt: serverTimestamp() }; if (editingShowcase.id) { await updateDoc(doc(db, SHOWCASES_COLLECTION, editingShowcase.id), payload); } else { await addDoc(collection(db, SHOWCASES_COLLECTION), payload); } setEditingShowcase(null); setAdminView('showcases'); playSound('success'); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } };
  const handleDeleteShowcase = async (id: string) => { if(confirm('Excluir Vitrine?')) await deleteDoc(doc(db, SHOWCASES_COLLECTION, id)); };
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
  
  const handleSaveBatch = async () => { if (!baseName || !baseSku || generatedRows.length === 0) { alert("Preencha dados."); return; } setIsSavingBatch(true); const priceNumber = parseFloat(basePrice.replace(',', '.').replace('R$', '').trim()) || 0; try { const batch = writeBatch(db); generatedRows.forEach(row => { const docRef = doc(collection(db, PRODUCTS_COLLECTION)); batch.set(docRef, { name: baseName, image: baseImage, sku: row.sku, barcode: row.barcode, color: row.color, size: row.size, price: priceNumber, quantity: 0, updatedAt: serverTimestamp() }); }); await batch.commit(); setBaseSku(''); setBaseName(''); setBaseImage(''); setBasePrice(''); setColors([]); setSizes([]); setAdminView('stock'); alert("Sucesso!"); } catch (e) { console.error(e); alert("Erro."); } finally { setIsSavingBatch(false); } };
  const handleUpdateQuantity = async (product: Product, newQty: number) => { if (newQty < 0) return; const diff = newQty - product.quantity; if (diff === 0) return; const type = diff > 0 ? 'entry' : 'exit'; try { const batch = writeBatch(db); const productRef = doc(db, PRODUCTS_COLLECTION, product.id); batch.update(productRef, { quantity: newQty, updatedAt: serverTimestamp() }); const historyRef = doc(collection(db, HISTORY_COLLECTION)); batch.set(historyRef, { productId: product.id, productName: product.name, sku: product.sku || '', image: product.image || '', type: type, amount: Math.abs(diff), previousQty: product.quantity, newQty: newQty, timestamp: serverTimestamp() }); await batch.commit(); } catch (e) { console.error(e); alert("Erro."); } };
  
  // Excluir e Editar Variação Específica
  const handleDeleteProductFromModal = async () => { if (editingProduct && confirm('Deseja realmente EXCLUIR esta variação específica? Essa ação não pode ser desfeita.')) { await deleteDoc(doc(db, PRODUCTS_COLLECTION, editingProduct.id)); setEditingProduct(null); } };
  const handleSaveEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingProduct) return; const priceNumber = typeof editingProduct.price === 'string' ? parseFloat(editingProduct.price) : editingProduct.price; try { await updateDoc(doc(db, PRODUCTS_COLLECTION, editingProduct.id), { ...editingProduct, price: priceNumber, updatedAt: serverTimestamp() }); setEditingProduct(null); } catch (error) { alert("Erro ao editar."); } };
  
  // Excluir e Editar Modelo Inteiro
  const openGroupEdit = (groupName: string, groupData: any) => { setEditingGroup({ oldName: groupName, name: groupData.info.name, image: groupData.info.image || '', price: groupData.info.price || 0, items: groupData.items }); };
  const handleDeleteGroup = async () => { if(editingGroup && confirm('Tem certeza que deseja EXCLUIR TODAS as variações deste modelo? Essa ação apagará todos os tamanhos e cores vinculados a ele.')) { setIsSavingBatch(true); try { const batch = writeBatch(db); editingGroup.items.forEach(item => { batch.delete(doc(db, PRODUCTS_COLLECTION, item.id)); }); await batch.commit(); setEditingGroup(null); alert('Modelo inteiro excluído com sucesso!'); } catch(e) { console.error(e); alert('Erro ao excluir modelo.'); } finally { setIsSavingBatch(false); } } };
  const handleSaveGroupEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingGroup) return; setIsSavingBatch(true); const priceNumber = typeof editingGroup.price === 'string' ? parseFloat(editingGroup.price) : editingGroup.price; try { const batch = writeBatch(db); editingGroup.items.forEach((item) => { const ref = doc(db, PRODUCTS_COLLECTION, item.id); batch.update(ref, { name: editingGroup.name, image: editingGroup.image, price: priceNumber, updatedAt: serverTimestamp() }); }); await batch.commit(); setEditingGroup(null); alert("Modelo inteiro atualizado com sucesso!"); } catch (error) { console.error(error); alert("Erro ao atualizar."); } finally { setIsSavingBatch(false); } };
  
  const handleProcessCodeCamera = async (code: string) => { 
     // Reusing logic
  };

  const groupedProducts = groupProducts(filteredProducts);
  const groupedAdminProducts = groupProducts(filteredProducts);


  // ==========================================
  // RENDERIZAÇÃO MODO VITRINE (CATÁLOGO PÚBLICO)
  // ==========================================
  if (isVitrineMode) {
      if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Carregando catálogo...</div>;
      if (!publicVitrine) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 flex-col"><Store size={48} className="mb-4 opacity-20"/> Vitrine não encontrada ou indisponível.</div>;

      const vitrineGroups: Record<string, any> = {};
      Object.entries(groupedProducts).forEach(([name, group]) => {
          if (publicVitrine.models.includes(name)) { vitrineGroups[name] = group; }
      });

      const applyMarkup = (basePrice: number) => {
          const markup = publicVitrine.config.priceMarkup || 0;
          return basePrice * (1 + (markup / 100));
      };

      return (
          <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
              <header className="bg-white shadow-sm p-4 sticky top-0 z-20 border-b border-slate-100 flex items-center justify-center">
                  <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Store className="text-blue-500" /> {publicVitrine.name}
                  </h1>
              </header>
              <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-20">
                 <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input type="text" placeholder="Buscar modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
                 </div>
                 
                 {Object.keys(vitrineGroups).length === 0 ? (
                     <div className="text-center py-20 text-slate-400">Nenhum produto disponível neste catálogo.</div>
                 ) : (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                         {Object.entries(vitrineGroups).map(([name, group]: [string, any]) => (
                             <div key={name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition duration-300">
                                 <div onClick={() => toggleGroup(name)} className="aspect-square bg-slate-100 relative cursor-pointer overflow-hidden group">
                                     {group.info.image ? (
                                         <img src={group.info.image} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300 w-12 h-12" /></div>
                                     )}
                                 </div>
                                 <div onClick={() => toggleGroup(name)} className="p-4 flex-1 cursor-pointer flex flex-col justify-between">
                                     <div>
                                         <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{name}</h3>
                                         <span className="text-xs font-bold text-slate-400">{group.info.sku ? String(group.info.sku).split('-')[0] : ''}</span>
                                     </div>
                                     <div className="mt-3 flex items-center justify-between">
                                         {publicVitrine.config.showPrice ? (
                                            <span className="text-lg font-black text-green-600">{formatCurrency(applyMarkup(group.info.price || 0))}</span>
                                         ) : (
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Sob Consulta</span>
                                         )}
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedGroups[name] ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {expandedGroups[name] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                         </div>
                                     </div>
                                 </div>
                                 {expandedGroups[name] && (
                                     <div className="bg-slate-50 border-t border-slate-100 p-3 max-h-64 overflow-y-auto hidden-scroll animate-in slide-in-from-top-2">
                                         <p className="text-xs font-bold text-slate-500 mb-2 uppercase text-center tracking-wider">Cores e Numerações</p>
                                         <div className="flex flex-wrap gap-2">
                                             {group.items.map((p: Product) => (
                                                 p.quantity > 4 && (
                                                    <div key={p.id} className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs shadow-sm flex items-center gap-1">
                                                        <span className="font-bold text-slate-800">{p.size}</span>
                                                        <span className="text-slate-400">|</span>
                                                        <span className="text-slate-600 uppercase font-medium">{p.color}</span>
                                                    </div>
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


  // ==========================================
  // RENDERIZAÇÃO: LOGIN (COM NOME NO CADASTRO)
  // ==========================================
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-md w-full animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-slate-700">
              <RefreshCw className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">DropFast</h1>
            <p className="text-slate-400 text-sm mt-1">Área Exclusiva para Revendedores</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <div className="bg-red-900/30 border border-red-500/50 text-red-300 text-sm p-3 rounded-xl text-center font-medium">{authError}</div>}
            
            {isRegistering && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Seu Nome Completo</label>
                  <input type="text" value={authName} onChange={e => setAuthName(e.target.value)} required={isRegistering} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Ex: João da Silva" />
                </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">E-mail de Acesso</label>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="seu@email.com" />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Senha (Mínimo 6 dígitos)</label>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required minLength={6} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="••••••" />
            </div>

            <button type="submit" className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
              {isRegistering ? 'Criar Minha Conta Agora' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-sm text-slate-400 hover:text-white transition-colors">
              {isRegistering ? 'Já tenho uma conta. Fazer Login.' : 'Não tem conta? Cadastre-se grátis.'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
            <button type="button" onClick={() => { const s = prompt("Senha ADM (Fornecedor):"); if (s === "1234") setSelectedRole('admin'); else alert("Acesso negado!"); }} className="text-[10px] text-slate-600 hover:text-slate-400 flex items-center justify-center gap-1.5 mx-auto font-bold uppercase tracking-wider transition-colors">
              <Package size={14} /> Acesso Restrito (Fornecedor)
            </button>
          </div>
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
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            {selectedNotice.type === 'banner' ? <ImageIcon className="text-blue-500" size={18}/> : <Bell className="text-orange-500" size={18}/>}
                            Detalhes do Aviso
                        </h3>
                        <button onClick={() => setSelectedNotice(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="overflow-y-auto p-6 space-y-4">
                        {selectedNotice.type === 'banner' && selectedNotice.imageUrl && (
                            <img src={selectedNotice.imageUrl} className="w-full rounded-xl object-cover border border-slate-200" />
                        )}
                        <h2 className="text-2xl font-black text-slate-800">{selectedNotice.title}</h2>
                        <p className="text-sm text-slate-400">{formatDate(selectedNotice.createdAt)}</p>
                        {selectedNotice.content && (
                            <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {selectedNotice.content}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100">
                        <button onClick={() => setSelectedNotice(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors">Fechar</button>
                    </div>
                </div>
            </div>
        )}

        <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex h-screen sticky top-0">
          <div className="p-6 text-center border-b border-slate-800">
            <h1 className="text-2xl font-black text-blue-500 flex items-center justify-center gap-2">
              <RefreshCw size={24} /> DropFast
            </h1>
            <p className="text-xs text-slate-400 mt-1">Olá, {userProfile?.name?.split(' ')[0] || 'Revendedor'}</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setUserView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Layers size={20} /> Visão Geral</button>
            <button onClick={() => setUserView('catalog')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'catalog' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><LayoutGrid size={20} /> Catálogo</button>
            <button onClick={() => setUserView('support')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'support' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Ticket size={20} /> Suporte / Trocas</button>
            <button onClick={() => setUserView('orders')} className={`w-full flex items-center justify-between p-3 rounded-xl font-medium transition-all ${userView === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><ClipboardList size={20} /> Pedidos</div>
                <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded border border-yellow-500/30 uppercase font-black">Em breve</span>
            </button>
          </nav>
          
          {/* DISPLAY DE CRÉDITO DO USUÁRIO */}
          <div className="p-4 mx-4 mb-4 bg-slate-800 rounded-xl border border-slate-700 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-center gap-1"><Wallet size={12}/> Seu Crédito</p>
             <p className="text-xl font-black text-green-400">{formatCurrency(userProfile?.creditBalance || 0)}</p>
          </div>

          <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2"><LogOut size={20} /> Sair da conta</button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="md:hidden bg-blue-600 text-white p-2 rounded-lg"><RefreshCw size={20} /></div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 hidden md:block">
                  {userView === 'dashboard' ? 'Dashboard de Avisos' : userView === 'catalog' ? 'Catálogo de Produtos' : userView === 'support' ? 'Central de Resoluções' : 'Histórico de Pedidos'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="md:hidden bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200">
                 <Wallet size={14} className="text-slate-500"/>
                 <span className="text-sm font-black text-green-600">{formatCurrency(userProfile?.creditBalance || 0)}</span>
              </div>
              <button onClick={handleLogout} className="md:hidden text-xs bg-slate-100 p-3 rounded-xl text-red-500"><LogOut size={20} /></button>
            </div>
          </header>

          <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full">

            {userView === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300 pb-24 md:pb-6">
                
                {quickLinks.length > 0 && (
                  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickLinks.map(link => (
                      <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-xl flex items-center justify-center transition">
                          {renderDynamicIcon(link.icon, 28)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{link.title}</h4>
                          <p className="text-sm text-slate-500 mt-1">{link.subtitle}</p>
                        </div>
                      </a>
                    ))}
                  </section>
                )}

                <section className="space-y-4">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Megaphone className="text-orange-500"/> Mural de Avisos Importantes</h3>
                  
                  {notices.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
                          <Bell size={48} className="mx-auto text-slate-300 mb-4" />
                          <p className="text-slate-500 font-medium">Nenhum aviso no momento.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {notices.map(notice => (
                           <div onClick={() => setSelectedNotice(notice)} key={notice.id} className="bg-slate-200 hover:bg-slate-300 cursor-pointer rounded-2xl shadow-sm border border-slate-300 overflow-hidden relative transition-colors group">
                              {notice.type === 'banner' && notice.imageUrl && (
                                  <div className="w-full h-40 bg-slate-300">
                                      <img src={notice.imageUrl} alt={notice.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  </div>
                              )}
                              <div className="p-5">
                                  <div className="flex items-center gap-2 mb-2">
                                      {notice.type === 'banner' ? <ImageIcon size={18} className="text-blue-600"/> : <Bell size={18} className="text-orange-600"/>}
                                      <h4 className="font-black text-lg text-slate-800 line-clamp-1">{notice.title}</h4>
                                  </div>
                                  {notice.content && (
                                      <p className="text-slate-500 text-sm line-clamp-2 mt-1">{notice.content}</p>
                                  )}
                                  <div className="mt-4 flex items-center justify-between">
                                     <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(notice.createdAt)}</p>
                                     <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">Ver mais <MousePointerClick size={12}/></span>
                                  </div>
                              </div>
                           </div>
                        ))}
                      </div>
                  )}
                </section>
              </div>
            )}

            {userView === 'support' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-24 md:pb-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Ticket className="text-blue-600"/> Abrir Chamado (Troca / Devolução)</h3>
                            <p className="text-sm text-slate-500 mt-1">Preencha os dados abaixo para solicitar uma resolução.</p>
                        </div>
                        <form onSubmit={handleOpenTicket} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">O que você deseja?</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex-1 transition-colors">
                                        <input type="radio" name="ticketType" checked={ticketType === 'troca'} onChange={() => setTicketType('troca')} className="accent-blue-600 w-4 h-4" />
                                        <span className="font-bold text-slate-800">Troca Normal</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl flex-1 transition-colors">
                                        <input type="radio" name="ticketType" checked={ticketType === 'devolucao'} onChange={() => setTicketType('devolucao')} className="accent-red-600 w-4 h-4" />
                                        <span className="font-bold text-slate-800 text-red-600">Devolução</span>
                                    </label>
                                </div>
                            </div>

                            {ticketType === 'devolucao' && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm font-medium animate-in zoom-in">
                                    <strong>ATENÇÃO:</strong> Aceitamos devolução <strong>APENAS em casos de defeito de fabricação</strong>. Solicitações por outros motivos serão recusadas. O valor será creditado na sua carteira após o produto chegar na fábrica.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Referência / Nome do Produto*</label>
                                    <input value={ticketProduct} onChange={e => setTicketProduct(e.target.value)} required placeholder="Ex: Tênis X Branco Tam 39" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Valor Pago (R$)*</label>
                                    <input type="number" value={ticketValue} onChange={e => setTicketValue(e.target.value)} required placeholder="Ex: 89.90" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Motivo Detalhado*</label>
                                <textarea value={ticketReason} onChange={e => setTicketReason(e.target.value)} required rows={3} placeholder="Explique o motivo da troca ou especifique o defeito..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-blue-500 outline-none"></textarea>
                            </div>

                            <button type="submit" disabled={isSavingBatch} className="w-full md:w-auto px-8 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]">
                                {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Enviar Solicitação
                            </button>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Meu Histórico de Chamados</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {myTickets.length === 0 ? (
                                <p className="text-slate-400 text-center py-6">Você não possui chamados abertos.</p>
                            ) : myTickets.map(ticket => (
                                <div key={ticket.id} className="border border-slate-200 p-4 rounded-xl flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${ticket.type === 'devolucao' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{ticket.type}</span>
                                                <span className="text-xs text-slate-500 font-bold">{formatDate(ticket.createdAt)}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800">{ticket.productInfo}</h4>
                                        </div>
                                        <div>
                                            {ticket.status === 'pendente' && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-bold uppercase border border-yellow-200">Em Análise</span>}
                                            {ticket.status === 'aceito' && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold uppercase border border-emerald-200">Troca Aceita</span>}
                                            {ticket.status === 'aguardando_devolucao' && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-bold uppercase border border-orange-200 text-center block leading-tight">Aguardando<br/>Entrega</span>}
                                            {ticket.status === 'recusado' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold uppercase border border-red-200">Recusado</span>}
                                            {ticket.status === 'concluido' && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold uppercase border border-blue-200">Concluído</span>}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">{ticket.reason}</p>
                                    
                                    {ticket.adminNote && (
                                        <div className="bg-slate-800 text-white p-3 rounded-lg text-sm flex gap-2">
                                            <MessageCircle size={16} className="shrink-0 text-blue-400" />
                                            <div><strong className="text-blue-400 block mb-0.5">Resposta do Fornecedor:</strong> {ticket.adminNote}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {userView === 'catalog' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-24 md:pb-6">
                 <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input type="text" placeholder="Buscar modelo, cor ou SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
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
                                       {group.info.image ? (
                                           <img src={group.info.image} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                       ) : (
                                           <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300 w-12 h-12" /></div>
                                       )}
                                   </div>
                                   
                                   <div onClick={() => toggleGroup(name)} className="p-4 flex-1 cursor-pointer flex flex-col justify-between">
                                       <div>
                                           <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{name}</h3>
                                           <span className="text-xs font-bold text-slate-400">{group.info.sku ? String(group.info.sku).split('-')[0] : '---'}</span>
                                       </div>
                                       <div className="mt-3 flex items-center justify-between">
                                           <span className="text-lg font-black text-green-600">{formatCurrency(group.info.price || 0)}</span>
                                           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedGroups[name] ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                              {expandedGroups[name] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                           </div>
                                       </div>
                                   </div>

                                   {expandedGroups[name] && (
                                       <div className="bg-slate-50 border-t border-slate-100 p-2 space-y-2 max-h-64 overflow-y-auto hidden-scroll animate-in slide-in-from-top-2">
                                           {group.items.map(p => (
                                               <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                   <div className="flex flex-col">
                                                       <span className="text-xs text-slate-600 font-bold uppercase mb-1">{String(p.color || '')}</span>
                                                       <div className="flex items-center gap-2">
                                                           <span className="text-sm font-black bg-slate-800 text-white px-2 py-1 rounded">{String(p.size || '')}</span>
                                                       </div>
                                                   </div>
                                                   <div>
                                                       {Number(p.quantity) > 4 ? (
                                                          <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg shadow-sm">Em Estoque</span>
                                                       ) : (
                                                          <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg shadow-sm">Estoque ZERADO</span>
                                                       )}
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                   )}
                               </div>
                           ))}
                       </div>
                   )}
                 </div>
              </div>
            )}

            {userView === 'orders' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in h-[60vh] flex items-center justify-center">
                <div className="p-10 text-center max-w-sm mx-auto">
                    <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Truck size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Função em Breve!</h2>
                    <p className="text-slate-500 mb-6">Estamos construindo um histórico completo para você acompanhar o status de todos os seus pedidos de forma automática.</p>
                    <button onClick={() => setUserView('catalog')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors w-full">Voltar para o Catálogo</button>
                </div>
              </div>
            )}
            
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <button onClick={() => setUserView('dashboard')} className={`flex flex-col items-center gap-1 ${userView === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}><Layers size={20} /><span className="text-[10px] font-bold">Início</span></button>
          <button onClick={() => setUserView('catalog')} className={`flex flex-col items-center gap-1 ${userView === 'catalog' ? 'text-blue-600' : 'text-slate-400'}`}><LayoutGrid size={20} /><span className="text-[10px] font-bold">Catálogo</span></button>
          <button onClick={() => setUserView('support')} className={`flex flex-col items-center gap-1 ${userView === 'support' ? 'text-blue-600' : 'text-slate-400'}`}><Ticket size={20} /><span className="text-[10px] font-bold">Trocas</span></button>
          <button onClick={() => setUserView('orders')} className={`flex flex-col items-center gap-1 ${userView === 'orders' ? 'text-blue-600' : 'text-slate-400'}`}>
             <ClipboardList size={20} /><span className="text-[10px] font-bold">Pedidos</span>
          </button>
        </nav>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: ADMIN (FORNECEDOR)
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
            <button onClick={handleLogout} className="text-xs bg-slate-800 border border-slate-700 p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 hover:bg-red-500 hover:text-white transition-colors"><LogOut size={16} /> <span className="hidden md:inline font-bold">Sair</span></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 md:p-6 space-y-6 relative pb-20">
        
        {adminView === 'menu' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mt-2">
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

            <button onClick={() => setAdminView('history')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center"><ClipboardList size={28} className="text-purple-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Relatórios</h3></div></button>
            <button onClick={() => setAdminView('notices')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center"><Megaphone size={28} className="text-amber-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Avisos Dashboard</h3></div></button>
            <button onClick={() => setAdminView('links')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center"><Link2 size={28} className="text-cyan-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Botões Rápidos</h3></div></button>
            <button onClick={() => {setAdminView('showcases'); setEditingShowcase(null);}} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform hover:-translate-y-1"><div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center"><Store size={28} className="text-emerald-500" /></div><div className="text-center"><h3 className="font-bold text-white text-sm">Vitrines Públicas</h3></div></button>
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
                                    {u.name ? u.name.substring(0,2) : 'CL'}
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
                                    <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Produto Informado</span>
                                    <span className="font-medium text-white">{ticket.productInfo}</span>
                                </div>
                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Motivo / Defeito</span>
                                    <span className="font-medium text-slate-300 text-sm leading-relaxed">{ticket.reason}</span>
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
                                        <button onClick={selectAllModelsForShowcase} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:text-white">Marcar Todos</button>
                                        <button onClick={clearAllModelsForShowcase} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:text-white">Desmarcar Todos</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {Object.entries(groupedAdminProducts).map(([name, group]) => {
                                        const isSelected = (editingShowcase.models || []).includes(name);
                                        return (
                                            <div key={name} onClick={() => toggleModelInShowcase(name)} className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}>
                                                <div className="w-full aspect-square bg-slate-900 rounded overflow-hidden">
                                                    {group.info.image ? <img src={group.info.image} className="w-full h-full object-cover" /> : <ImageIcon className="m-auto mt-4 text-slate-600"/>}
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

        {/* --- TELA DE AVISOS E LINKS IGUAL À ANTERIOR --- */}
        {/* ... */}
        {/* (Estou mantendo a interface de Admin normal aqui para baixo) */}

        {/* --- ESTOQUE DO ADMIN COM FOTO MELHORADA E EDIÇÃO AVANÇADA --- */}
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
                        {group.info.image ? <img src={group.info.image} className="w-full h-full object-cover" /> : <ImageIcon className="p-2 text-slate-700"/>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm md:text-base truncate">{name}</div>
                        <div className="text-sm font-bold text-slate-500 mt-0.5">{group.info.sku ? String(group.info.sku).split('-')[0] : '---'}</div>
                        <div className="text-[10px] md:text-xs font-bold text-blue-400 mt-2 bg-blue-500/10 px-2 py-1 inline-block rounded-md">{group.items.length} variações</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openGroupEdit(name, group); }} 
                        className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 p-3 rounded-xl transition-colors shadow-sm hidden md:block"
                        title="Editar Modelo"
                      >
                        <Pencil size={18} />
                      </button>

                      <div className="text-right bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                        <div className="text-2xl font-black text-white">{group.total}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Total</div>
                      </div>
                      <div className="bg-slate-800 p-2 rounded-xl text-slate-400">
                         {expandedGroups[name] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
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
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Foto Principal (Máx 800KB)</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBaseImage)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 cursor-pointer" />
                  {baseImage && (<div className="mt-2 w-16 h-16 rounded overflow-hidden border border-slate-700"><img src={baseImage} className="w-full h-full object-cover" /></div>)}
                </div>
              </div></div>
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Layers size={16} className="text-blue-400" /> 2. Grade</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-sm text-slate-400 block mb-2">Cores (Enter)</label><div className="flex gap-2 mb-2"><input value={tempColor} onChange={e => setTempColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{colors.map(c => <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button></span>)}</div></div><div><label className="text-sm text-slate-400 block mb-2">Tamanhos (Enter)</label><div className="flex gap-2 mb-2"><input value={tempSize} onChange={e => setTempSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{sizes.map(s => <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button></span>)}</div></div></div></div>
              {generatedRows.length > 0 && (<div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Variações ({generatedRows.length})</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU</th><th className="p-2">Barcode</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></td></tr>))}</tbody></table></div></div>)}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-xl px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} {isSavingBatch ? 'SALVANDO...' : 'GERAR VARIAÇÕES'}</button></div>
            </div>
          </div>
        )}

        {/* --- MODAIS DE EDIÇÃO ADMIN --- */}
        {editingGroup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="text-blue-400" size={24}/> Editar Modelo</h2>
                    <p className="text-xs text-slate-400 mt-1">Atualiza {editingGroup.items.length} variações.</p>
                 </div>
                 <button type="button" onClick={handleDeleteGroup} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 md:px-3 md:py-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold">
                     <Trash2 size={16} /> <span className="hidden md:inline">Excluir Tudo</span>
                 </button>
              </div>
              
              <form onSubmit={handleSaveGroupEdit} className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Nome do Modelo</label>
                   <input value={editingGroup.name} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Preço Geral (R$)</label>
                   <input value={editingGroup.price || ''} onChange={e => setEditingGroup({...editingGroup, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" type="number" required />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nova Foto do Modelo (Opcional)</label>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (val) => setEditingGroup({...editingGroup, image: val}))} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 cursor-pointer" />
                    {editingGroup.image && (
                        <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-700">
                            <img src={editingGroup.image} className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-800">
                   <button type="button" onClick={() => setEditingGroup(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-colors">Cancelar</button>
                   <button type="submit" disabled={isSavingBatch} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors">
                      {isSavingBatch ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Salvar 
                   </button>
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
                  <button type="button" onClick={handleDeleteProductFromModal} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition-colors text-xs font-bold flex items-center gap-1">
                      <Trash2 size={14} /> Excluir Variação
                  </button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Produto</label>
                   <input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">SKU</label>
                      <input value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:border-blue-500 outline-none" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Código de Barras</label>
                      <input value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:border-blue-500 outline-none" />
                   </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Preço (R$)</label>
                        <input value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" type="number" required />
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cor</label>
                        <input value={editingProduct.color} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required />
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tamanho</label>
                        <input value={editingProduct.size} onChange={e => setEditingProduct({...editingProduct, size: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required />
                    </div>
                </div>
                
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Foto Exclusiva (Opcional)</label>
                   <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (val) => setEditingProduct({...editingProduct, image: val}))} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 cursor-pointer" />
                   {editingProduct.image && (
                       <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-700">
                           <img src={editingProduct.image} className="w-full h-full object-cover" />
                       </div>
                   )}
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

export default App;