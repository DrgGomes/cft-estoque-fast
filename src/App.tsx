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
  limit
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
  Store, Copy, Percent
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

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
const SHOWCASES_COLLECTION = `artifacts/${appId}/public/data/showcases`; // Nova coleção para Vitrines

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

function App() {
  // Verificação de URL para Modo Vitrine Pública
  const urlParams = new URLSearchParams(window.location.search);
  const vitrineLinkId = urlParams.get('vitrine');
  const [isVitrineMode] = useState(!!vitrineLinkId);
  const [publicVitrine, setPublicVitrine] = useState<Showcase | null>(null);

  const [user, setUser] = useState<any>(null);
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
  
  const [adminView, setAdminView] = useState<'menu' | 'stock' | 'add' | 'history' | 'purchases' | 'create_purchase' | 'notices' | 'links' | 'showcases'>('menu');
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'review'>('select');
  
  const [userView, setUserView] = useState<'dashboard' | 'catalog' | 'cart' | 'orders'>('dashboard');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchaseCart, setPurchaseCart] = useState<CartItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  const [permissionGranted, setPermissionGranted] = useState(false);
  const prevProductsRef = useRef<Product[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // --- ESTADOS DE LOGIN / AUTENTICAÇÃO ---
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Estados Admin - Produtos
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

  // Estados Admin - Avisos e Links
  const [noticeType, setNoticeType] = useState<'text' | 'banner'>('text');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeImage, setNoticeImage] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkSubtitle, setLinkSubtitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkIcon, setLinkIcon] = useState('Link2');
  const [linkOrder, setLinkOrder] = useState('1');

  // Estados Admin - Editor de Vitrine
  const [editingShowcase, setEditingShowcase] = useState<Partial<Showcase> | null>(null);

  // Estados User - Modal de Aviso
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  // Estados Scanner
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanError, setScanError] = useState('');
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{type: 'success' | 'error' | 'magic', msg: string} | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // --- FUNÇÕES GERAIS ---
  const groupProducts = (items: Product[]) => { 
      const groups: Record<string, { info: Product, total: number, items: Product[] }> = {}; 
      items.forEach(product => { 
          const key = product.name; 
          if (!groups[key]) groups[key] = { info: product, total: 0, items: [] }; 
          groups[key].items.push(product); 
          groups[key].total += product.quantity; 
      }); 
      Object.values(groups).forEach(group => group.items.sort((a, b) => (a.size > b.size ? 1 : -1))); 
      return groups; 
  };
  const toggleGroup = (groupName: string) => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  const formatDate = (timestamp: any) => { if (!timestamp) return '...'; const date = timestamp.toDate(); return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date); };

  // --- FETCH DADOS INICIAIS (Produtos carregam sempre, mesmo no modo público) ---
  useEffect(() => {
    // Buscar Produtos
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as Product); });
      
      // Notificação de estoque zerado apenas se for usuário logado normal
      if (!loading && selectedRole === 'user' && !isVitrineMode) {
        const previousProducts = prevProductsRef.current;
        const soldOutItems = items.filter(newItem => {
          const oldItem = previousProducts.find(p => p.id === newItem.id);
          return oldItem && oldItem.quantity > 4 && newItem.quantity <= 4;
        });
        if (soldOutItems.length > 0) {
          playSound('alert');
          sendSystemNotification("⚠️ ESTOQUE ZEROU!", `${soldOutItems.length} produtos acabaram de esgotar!`);
        }
      }
      prevProductsRef.current = items;
      setProducts(items);
      setFilteredProducts(items);
      setLoading(false);
    });

    // Se NÃO for modo vitrine, carrega o resto (Avisos, Links, etc)
    if (!isVitrineMode) {
        const qNotices = query(collection(db, NOTICES_COLLECTION), orderBy('createdAt', 'desc'));
        const unsubNotices = onSnapshot(qNotices, (snap) => setNotices(snap.docs.map(d => ({id: d.id, ...d.data()} as Notice))));

        const qLinks = query(collection(db, QUICKLINKS_COLLECTION), orderBy('order', 'asc'));
        const unsubLinks = onSnapshot(qLinks, (snap) => setQuickLinks(snap.docs.map(d => ({id: d.id, ...d.data()} as QuickLink))));

        const qShowcases = query(collection(db, SHOWCASES_COLLECTION));
        const unsubShowcases = onSnapshot(qShowcases, (snap) => setShowcases(snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase))));

        return () => { unsubscribe(); unsubNotices(); unsubLinks(); unsubShowcases(); };
    } else {
        // Se for Modo Vitrine, busca as configs da Vitrine Específica
        const qShowcases = query(collection(db, SHOWCASES_COLLECTION));
        const unsubShowcases = onSnapshot(qShowcases, (snap) => {
            const allVitrines = snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase));
            const found = allVitrines.find(v => v.linkId === vitrineLinkId);
            setPublicVitrine(found || null);
        });
        return () => { unsubscribe(); unsubShowcases(); };
    }
  }, [loading, selectedRole, isVitrineMode, vitrineLinkId]);

  useEffect(() => {
    if (selectedRole === 'admin') {
      const q = query(collection(db, HISTORY_COLLECTION), orderBy('timestamp', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: HistoryItem[] = [];
        snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as HistoryItem); });
        setHistory(items);
      });
      const q2 = query(collection(db, PURCHASES_COLLECTION), orderBy('createdAt', 'desc'));
      const unsubscribe2 = onSnapshot(q2, (snapshot) => {
        const items: PurchaseOrder[] = [];
        snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as PurchaseOrder); });
        setPurchases(items);
      });
      return () => { unsubscribe(); unsubscribe2(); };
    }
  }, [selectedRole]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
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
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: authEmail,
          role: 'revendedor',
          createdAt: serverTimestamp()
        });
        setSelectedRole('user');
        playSound('success');
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setSelectedRole('user');
        playSound('success');
      }
    } catch (err: any) {
      setAuthError('Erro: ' + (err.message.includes('invalid-credential') ? 'E-mail ou senha incorretos.' : err.message));
      playSound('error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setSelectedRole(null);
    setUserView('dashboard');
    setAdminView('menu');
  };

  // --- FUNÇÕES DE AVISOS, LINKS E IMAGENS (ADMIN) ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
       if(file.size > 800000) { 
           alert("A imagem é muito grande. Escolha uma foto menor que 800KB.");
           return;
       }
       const reader = new FileReader();
       reader.onloadend = () => {
          setter(reader.result as string);
       };
       reader.readAsDataURL(file);
    }
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle) return alert('Preencha o título do aviso.');
    if (noticeType === 'banner' && !noticeImage) return alert('Faça o upload da imagem do banner.');
    setIsSavingBatch(true);
    try {
      await addDoc(collection(db, NOTICES_COLLECTION), {
        type: noticeType,
        title: noticeTitle,
        content: noticeContent,
        imageUrl: noticeType === 'banner' ? noticeImage : '',
        createdAt: serverTimestamp()
      });
      setNoticeTitle(''); setNoticeContent(''); setNoticeImage('');
      alert("Aviso publicado com sucesso!");
    } catch (e) { console.error(e); alert("Erro ao publicar aviso."); } finally { setIsSavingBatch(false); }
  };

  const handleDeleteNotice = async (id: string) => { if(confirm('Apagar este aviso?')) await deleteDoc(doc(db, NOTICES_COLLECTION, id)); };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!linkTitle || !linkUrl) return alert("Preencha título e link.");
    setIsSavingBatch(true);
    try {
      await addDoc(collection(db, QUICKLINKS_COLLECTION), { title: linkTitle, subtitle: linkSubtitle, icon: linkIcon, url: linkUrl, order: parseInt(linkOrder) || 1, createdAt: serverTimestamp() });
      setLinkTitle(''); setLinkSubtitle(''); setLinkUrl(''); setLinkOrder('1'); alert("Botão salvo com sucesso!");
    } catch (e) { console.error(e); alert("Erro ao salvar botão."); } finally { setIsSavingBatch(false); }
  };

  const handleDeleteLink = async (id: string) => { if(confirm('Apagar este botão?')) await deleteDoc(doc(db, QUICKLINKS_COLLECTION, id)); };

  // --- FUNÇÕES DE VITRINES (ADMIN) ---
  const handleSaveShowcase = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingShowcase?.name) return alert("Dê um nome para a Vitrine.");
      setIsSavingBatch(true);
      try {
          const payload = {
              name: editingShowcase.name,
              linkId: editingShowcase.linkId || `cat-${Math.random().toString(36).substring(2, 8)}`,
              config: {
                  showPrice: editingShowcase.config?.showPrice ?? true,
                  priceMarkup: editingShowcase.config?.priceMarkup || 0
              },
              models: editingShowcase.models || [],
              createdAt: serverTimestamp()
          };

          if (editingShowcase.id) {
              await updateDoc(doc(db, SHOWCASES_COLLECTION, editingShowcase.id), payload);
          } else {
              await addDoc(collection(db, SHOWCASES_COLLECTION), payload);
          }
          setEditingShowcase(null);
          setAdminView('showcases');
          playSound('success');
      } catch (error) {
          console.error(error); alert("Erro ao salvar vitrine.");
      } finally {
          setIsSavingBatch(false);
      }
  };

  const handleDeleteShowcase = async (id: string) => { if(confirm('Excluir esta Vitrine e invalidar o link?')) await deleteDoc(doc(db, SHOWCASES_COLLECTION, id)); };

  const toggleModelInShowcase = (modelName: string) => {
      setEditingShowcase(prev => {
          if (!prev) return prev;
          const models = prev.models || [];
          if (models.includes(modelName)) return { ...prev, models: models.filter(m => m !== modelName) };
          return { ...prev, models: [...models, modelName] };
      });
  };

  const selectAllModelsForShowcase = () => {
      const allNames = Object.keys(groupedAdminProducts);
      setEditingShowcase(prev => prev ? { ...prev, models: allNames } : prev);
  };
  const clearAllModelsForShowcase = () => setEditingShowcase(prev => prev ? { ...prev, models: [] } : prev);

  const copyShowcaseLink = (linkId: string) => {
      const url = `${window.location.origin}${window.location.pathname}?vitrine=${linkId}`;
      navigator.clipboard.writeText(url);
      alert("Link copiado para a área de transferência!");
  };

  // --- GERADOR DE PRODUTOS E CRUD ---
  useEffect(() => { const newRows: VariationRow[] = []; colors.forEach(color => { sizes.forEach(size => { const cleanSku = baseSku.toUpperCase().replace(/\s+/g, ''); const cleanColor = color.toUpperCase(); const cleanSize = size.toUpperCase().replace(/\s+/g, ''); const autoSku = cleanSku && cleanColor && cleanSize ? `${cleanSku}-${cleanColor}-${cleanSize}` : ''; const existingRow = generatedRows.find(r => r.color === color && r.size === size); newRows.push({ color, size, sku: autoSku, barcode: existingRow ? existingRow.barcode : '' }); });}); setGeneratedRows(newRows); }, [colors, sizes, baseSku]);
  const addColor = () => { if (tempColor && !colors.includes(tempColor)) { setColors([...colors, tempColor]); setTempColor(''); } };
  const addSize = () => { if (tempSize && !sizes.includes(tempSize)) { setSizes([...sizes, tempSize]); setTempSize(''); } };
  const removeColor = (c: string) => setColors(colors.filter(item => item !== c));
  const removeSize = (s: string) => setSizes(sizes.filter(item => item !== s));
  const updateRowBarcode = (index: number, val: string) => { const updated = [...generatedRows]; updated[index].barcode = val; setGeneratedRows(updated); };
  
  const handleSaveBatch = async () => { if (!baseName || !baseSku || generatedRows.length === 0) { alert("Preencha dados."); return; } setIsSavingBatch(true); const priceNumber = parseFloat(basePrice.replace(',', '.').replace('R$', '').trim()) || 0; try { const batch = writeBatch(db); generatedRows.forEach(row => { const docRef = doc(collection(db, PRODUCTS_COLLECTION)); batch.set(docRef, { name: baseName, image: baseImage, sku: row.sku, barcode: row.barcode, color: row.color, size: row.size, price: priceNumber, quantity: 0, updatedAt: serverTimestamp() }); }); await batch.commit(); setBaseSku(''); setBaseName(''); setBaseImage(''); setBasePrice(''); setColors([]); setSizes([]); setAdminView('stock'); alert("Sucesso!"); } catch (e) { console.error(e); alert("Erro."); } finally { setIsSavingBatch(false); } };
  const handleUpdateQuantity = async (product: Product, newQty: number) => { if (newQty < 0) return; const diff = newQty - product.quantity; if (diff === 0) return; const type = diff > 0 ? 'entry' : 'exit'; try { const batch = writeBatch(db); const productRef = doc(db, PRODUCTS_COLLECTION, product.id); batch.update(productRef, { quantity: newQty, updatedAt: serverTimestamp() }); const historyRef = doc(collection(db, HISTORY_COLLECTION)); batch.set(historyRef, { productId: product.id, productName: product.name, sku: product.sku || '', image: product.image || '', type: type, amount: Math.abs(diff), previousQty: product.quantity, newQty: newQty, timestamp: serverTimestamp() }); await batch.commit(); } catch (e) { console.error(e); alert("Erro."); } };
  const handleDeleteProduct = async (id: string) => { if (confirm('Excluir?')) await deleteDoc(doc(db, PRODUCTS_COLLECTION, id)); };
  const handleSaveEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingProduct) return; const priceNumber = typeof editingProduct.price === 'string' ? parseFloat(editingProduct.price) : editingProduct.price; try { const productRef = doc(db, PRODUCTS_COLLECTION, editingProduct.id); await updateDoc(productRef, { ...editingProduct, price: priceNumber, updatedAt: serverTimestamp() }); setEditingProduct(null); } catch (error) { alert("Erro ao editar."); } };
  const openGroupEdit = (groupName: string, groupData: any) => { setEditingGroup({ oldName: groupName, name: groupData.info.name, image: groupData.info.image || '', price: groupData.info.price || 0, items: groupData.items }); };
  const handleSaveGroupEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingGroup) return; setIsSavingBatch(true); const priceNumber = typeof editingGroup.price === 'string' ? parseFloat(editingGroup.price) : editingGroup.price; try { const batch = writeBatch(db); editingGroup.items.forEach((item) => { const ref = doc(db, PRODUCTS_COLLECTION, item.id); batch.update(ref, { name: editingGroup.name, image: editingGroup.image, price: priceNumber, updatedAt: serverTimestamp() }); }); await batch.commit(); setEditingGroup(null); alert("Modelo inteiro atualizado com sucesso!"); } catch (error) { console.error(error); alert("Erro ao atualizar."); } finally { setIsSavingBatch(false); } };
  
  // --- CARRINHO DE COMPRAS E PEDIDOS (Revendedor Logado) ---
  const handleRemoveFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));
  const handleUpdateCartQty = (productId: string, delta: number) => { setCart(prev => { return prev.map(item => { if (item.product.id === productId) { const newQty = item.quantity + delta; if (newQty <= 0) return item; if (newQty > (item.product.quantity - 4)) { alert("Quantidade máxima disponível atingida!"); return item; } return { ...item, quantity: newQty }; } return item; }); }); };
  const generateWhatsAppMessage = () => { if (!customerName) return alert("Digite o nome do cliente!"); if (cart.length === 0) return alert("Carrinho vazio!"); const now = new Date(); const orderId = Math.floor(Math.random() * 900000) + 100000; let message = `🛒 *PEDIDO:* ${orderId}\n\n🗓️ *DATA* ${now.toLocaleDateString('pt-BR')}\n⌚ *HORA:* ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n🫱🏻‍🫲🏼 *CLIENTE: ${customerName.toUpperCase()}*\n\n`; let totalPedido = 0; cart.forEach(item => { const displaySku = item.product.sku || `${item.product.name} ${item.product.color} ${item.product.size}`; const price = item.product.price || 0; const subtotal = price * item.quantity; totalPedido += subtotal; message += `${displaySku} --- ${item.quantity}x (${formatCurrency(price)})\n`; message += `-\n`; }); message += `\n💰 *TOTAL: ${formatCurrency(totalPedido)}*`; window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank'); };
  
  const groupedProducts = groupProducts(filteredProducts);
  const groupedAdminProducts = groupProducts(filteredProducts);


  // ==========================================
  // RENDERIZAÇÃO MODO VITRINE (CATÁLOGO PÚBLICO)
  // ==========================================
  if (isVitrineMode) {
      if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Carregando catálogo...</div>;
      if (!publicVitrine) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 flex-col"><Store size={48} className="mb-4 opacity-20"/> Vitrine não encontrada ou indisponível.</div>;

      // Filtrar produtos baseados nos modelos selecionados na vitrine
      const vitrineGroups: Record<string, any> = {};
      Object.entries(groupedProducts).forEach(([name, group]) => {
          if (publicVitrine.models.includes(name)) {
              vitrineGroups[name] = group;
          }
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
                                         <span className="text-xs font-bold text-slate-400">{group.info.sku ? group.info.sku.split('-')[0] : ''}</span>
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
                                             {/* No catálogo público, simplificamos as variações para mostrar apenas o que tem cor/tamanho */}
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
  // RENDERIZAÇÃO DE LOGIN
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
        
        {/* MODAL DE AVISO (POP-UP) */}
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

        {/* MENU LATERAL (Sidebar - Desktop) */}
        <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex h-screen sticky top-0">
          <div className="p-6 text-center border-b border-slate-800">
            <h1 className="text-2xl font-black text-blue-500 flex items-center justify-center gap-2">
              <RefreshCw size={24} /> DropFast
            </h1>
            <p className="text-xs text-slate-400 mt-1">Área do Revendedor</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setUserView('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Layers size={20} /> Visão Geral</button>
            <button onClick={() => setUserView('catalog')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'catalog' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><LayoutGrid size={20} /> Catálogo</button>
            <button onClick={() => setUserView('orders')} className={`w-full flex items-center justify-between p-3 rounded-xl font-medium transition-all ${userView === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><ClipboardList size={20} /> Pedidos</div>
                <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded border border-yellow-500/30 uppercase font-black">Em breve</span>
            </button>
          </nav>
          <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2"><LogOut size={20} /> Sair da conta</button>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          
          <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="md:hidden bg-blue-600 text-white p-2 rounded-lg"><RefreshCw size={20} /></div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 hidden md:block">
                  {userView === 'dashboard' ? 'Dashboard de Avisos' : userView === 'catalog' ? 'Catálogo de Produtos' : userView === 'cart' ? 'Finalizar Compra' : 'Histórico de Pedidos'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleLogout} className="md:hidden text-xs bg-slate-100 p-3 rounded-xl text-red-500"><LogOut size={20} /></button>
            </div>
          </header>

          <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full">

            {/* --- VIEW: DASHBOARD (AVISOS E BANNERS) --- */}
            {userView === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300 pb-24 md:pb-6">
                
                {/* Botões Rápidos (Dinâmicos via Firebase) */}
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

                {/* Mural de Avisos e Banners */}
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

            {/* --- VIEW: CATÁLOGO (GRID COM FOTOS GRANDES E ESTOQUE OCULTO) --- */}
            {userView === 'catalog' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input type="text" placeholder="Buscar modelo, cor ou SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
                 </div>
                 
                 <div className="pb-24">
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
                                           <span className="text-xs font-bold text-slate-400">{group.info.sku ? group.info.sku.split('-')[0] : ''}</span>
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
                                                       <span className="text-xs text-slate-600 font-bold uppercase mb-1">{p.color}</span>
                                                       <div className="flex items-center gap-2">
                                                           <span className="text-sm font-black bg-slate-800 text-white px-2 py-1 rounded">{p.size}</span>
                                                       </div>
                                                   </div>
                                                   <div>
                                                       {p.quantity > 4 ? (
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

            {/* --- VIEW: ORDERS (HISTÓRICO DE PEDIDOS - EM BREVE) --- */}
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

        {/* Menu Inferior (Mobile Only) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <button onClick={() => setUserView('dashboard')} className={`flex flex-col items-center gap-1 ${userView === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}><Layers size={20} /><span className="text-[10px] font-bold">Início</span></button>
          <button onClick={() => setUserView('catalog')} className={`flex flex-col items-center gap-1 ${userView === 'catalog' ? 'text-blue-600' : 'text-slate-400'}`}><LayoutGrid size={20} /><span className="text-[10px] font-bold">Catálogo</span></button>
          <button onClick={() => setUserView('orders')} className={`flex flex-col items-center gap-1 ${userView === 'orders' ? 'text-blue-600' : 'text-slate-400'}`}>
             <div className="relative">
                 <ClipboardList size={20} />
                 <span className="absolute -top-1 -right-2 bg-yellow-500 w-2 h-2 rounded-full"></span>
             </div>
             <span className="text-[10px] font-bold">Pedidos</span>
          </button>
        </nav>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: ADMIN (FORNECEDOR)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {adminView !== 'menu' ? (<button onClick={() => setAdminView('menu')} className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"><ChevronLeft className="w-6 h-6 text-white" /></button>) : (<div className="bg-slate-800 p-2 rounded-lg border border-slate-700"><Package className="w-6 h-6 text-blue-400" /></div>)}
            <div><h1 className="font-bold text-white md:block">Painel ERP</h1></div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={handleLogout} className="text-xs bg-slate-800 border border-slate-700 p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 hover:bg-slate-700"><LogOut size={16} /> <span className="hidden md:inline">Sair</span></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6 relative pb-20">
        {adminView === 'menu' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <button onClick={() => setAdminView('stock')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center"><Package size={24} className="text-blue-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Estoque</h3></div></button>
            <button onClick={() => { setAdminView('purchases'); setPurchaseStep('select'); }} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center"><Truck size={24} className="text-orange-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Compras</h3></div></button>
            <button onClick={() => { setShowQuickEntry(true); setScannedItems([]); }} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center"><Zap size={24} className="text-yellow-400 fill-yellow-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Entrada Rápida</h3></div></button>
            <button onClick={() => setAdminView('add')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"><Plus size={24} className="text-green-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Novo Produto</h3></div></button>
            <button onClick={() => setAdminView('history')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center"><ClipboardList size={24} className="text-purple-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Relatório</h3></div></button>
            <button onClick={() => setAdminView('notices')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center"><Megaphone size={24} className="text-orange-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Avisos</h3></div></button>
            <button onClick={() => setAdminView('links')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg border-b-4 border-b-blue-500"><div className="w-12 h-12 md:w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center"><Link2 size={24} className="text-blue-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Botões Rápidos</h3></div></button>
            <button onClick={() => {setAdminView('showcases'); setEditingShowcase(null);}} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg border-b-4 border-b-emerald-500"><div className="w-12 h-12 md:w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center"><Store size={24} className="text-emerald-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Vitrines Públicas</h3></div></button>
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
                            
                            {/* CONFIGURAÇÕES BÁSICAS */}
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
                                    <p className="text-[10px] text-slate-500 mt-1">Coloque 0 para mostrar o preço original, ou ex: 50 para aumentar 50%.</p>
                                </div>
                            </div>

                            {/* SELEÇÃO DE PRODUTOS */}
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

        {/* --- TELA DE AVISOS (ADMIN) --- */}
        {adminView === 'notices' && (
           <div className="space-y-6">
              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right">
                 <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-2"><Megaphone className="text-orange-400" /><h2 className="text-lg font-bold text-white">Adicionar Aviso / Banner</h2></div>
                 </div>
                 <form onSubmit={handleSaveNotice} className="p-4 md:p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tipo de Publicação</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 p-3 rounded-lg flex-1">
                                <input type="radio" name="noticeType" checked={noticeType === 'text'} onChange={() => setNoticeType('text')} className="accent-orange-500" />
                                <span className="font-bold text-sm">Aviso Normal</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 p-3 rounded-lg flex-1">
                                <input type="radio" name="noticeType" checked={noticeType === 'banner'} onChange={() => setNoticeType('banner')} className="accent-orange-500" />
                                <span className="font-bold text-sm">Banner com Imagem</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título Importante*</label>
                        <input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} required placeholder="Ex: Novo Catálogo de Inverno!" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none" />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Texto do Aviso {noticeType === 'banner' && '(Aparecerá quando clicado)'}</label>
                        <textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} rows={4} placeholder="Digite a mensagem detalhada..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none"></textarea>
                    </div>

                    {noticeType === 'banner' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Escolha a Foto do Banner (Máx 800KB)</label>
                            <input 
                               type="file" 
                               accept="image/*" 
                               onChange={(e) => handleImageUpload(e, setNoticeImage)} 
                               className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-orange-500/20 file:text-orange-400 hover:file:bg-orange-500/30 cursor-pointer" 
                            />
                            {noticeImage && (
                               <div className="mt-4 p-2 bg-slate-800 rounded-lg border border-slate-700">
                                   <p className="text-xs text-slate-400 mb-2">Pré-visualização:</p>
                                   <img src={noticeImage} alt="Preview" className="h-32 object-cover rounded shadow-md" />
                               </div>
                            )}
                        </div>
                    )}
                    
                    <button type="submit" disabled={isSavingBatch} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors mt-4">
                        {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Megaphone size={20} />} Publicar no Dashboard
                    </button>
                 </form>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                 <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                    <h2 className="text-lg font-bold text-white">Avisos Ativos</h2>
                 </div>
                 <div className="p-4 space-y-3">
                     {notices.length === 0 ? <p className="text-slate-500 text-center py-4">Nenhum aviso ativo.</p> : notices.map(notice => (
                         <div key={notice.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-start">
                             <div>
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${notice.type === 'banner' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{notice.type}</span>
                                     <h3 className="font-bold text-white text-sm">{notice.title}</h3>
                                 </div>
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
                 <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-2"><Link2 className="text-blue-400" /><h2 className="text-lg font-bold text-white">Criar Botão Rápido</h2></div>
                 </div>
                 <form onSubmit={handleSaveLink} className="p-4 md:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Botão*</label>
                            <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} required placeholder="Ex: Grupo VIP" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Subtítulo (Opcional)</label>
                            <input value={linkSubtitle} onChange={e => setLinkSubtitle(e.target.value)} placeholder="Ex: Novidades em tempo real" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Link de Destino (URL)*</label>
                            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required placeholder="https://" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ícone</label>
                                <select value={linkIcon} onChange={e => setLinkIcon(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none appearance-none">
                                    <option value="MessageCircle">WhatsApp (Chat)</option>
                                    <option value="ImageIcon">Fotos / Drive</option>
                                    <option value="Video">Vídeo / YouTube</option>
                                    <option value="Globe">Site Público</option>
                                    <option value="ShoppingBag">Sacola</option>
                                    <option value="FileText">Documento</option>
                                    <option value="Smartphone">Celular</option>
                                    <option value="Link2">Link (Padrão)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ordem</label>
                                <input type="number" value={linkOrder} onChange={e => setLinkOrder(e.target.value)} required min="1" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" disabled={isSavingBatch} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors mt-4">
                        {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} Salvar Botão
                    </button>
                 </form>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                 <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                    <h2 className="text-lg font-bold text-white">Botões Ativos</h2>
                 </div>
                 <div className="p-4 space-y-3">
                     {quickLinks.length === 0 ? <p className="text-slate-500 text-center py-4">Nenhum botão configurado.</p> : quickLinks.map(link => (
                         <div key={link.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                             <div className="flex items-center gap-4">
                                 <div className="bg-slate-800 p-3 rounded-lg text-slate-300">
                                     {renderDynamicIcon(link.icon, 20)}
                                 </div>
                                 <div>
                                     <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-sm">{link.title}</h3>
                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Ordem: {link.order}</span>
                                     </div>
                                     <p className="text-xs text-blue-400 truncate max-w-[200px] md:max-w-md">{link.url}</p>
                                 </div>
                             </div>
                             <button onClick={() => handleDeleteLink(link.id)} className="bg-red-500/10 text-red-400 p-2 rounded hover:bg-red-500/20"><Trash2 size={16}/></button>
                         </div>
                     ))}
                 </div>
              </div>
           </div>
        )}

        {/* --- ESTOQUE DO ADMIN COM FOTO MELHORADA --- */}
        {adminView === 'stock' && (
          <>
            <div className="bg-slate-800 p-3 md:p-4 rounded-xl flex items-center gap-3 border border-blue-900/30 relative overflow-hidden shadow-lg animate-in slide-in-from-right">
              <div className="absolute right-0 top-0 p-4 opacity-10"><ScanBarcode size={100} /></div>
              <div className="flex-1 relative z-10"><label className="text-[10px] md:text-xs text-blue-300 font-bold mb-1 block flex items-center gap-2"><ScanBarcode size={14}/> BUSCAR</label><input autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtrar..." className="w-full bg-slate-950 border-2 border-blue-600/50 rounded-lg px-3 py-2 md:px-4 md:py-3 text-base md:text-lg text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none" /></div>
            </div>
            <div className="space-y-3 pb-20 animate-in slide-in-from-bottom-4">
              {Object.entries(groupedAdminProducts).length === 0 ? (<div className="text-center text-slate-500 py-10">Nenhum produto encontrado</div>) : Object.entries(groupedAdminProducts).map(([name, group]) => (
                <div key={name} className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm group overflow-hidden">
                  
                  <div onClick={() => toggleGroup(name)} className="p-2 md:p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* IMAGEM DO PRODUTO NO ADMIN - MAIOR E QUADRADA */}
                      <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-slate-100 rounded-lg border overflow-hidden flex items-center justify-center">
                        {group.info.image ? <img src={group.info.image} className="w-full h-full object-cover" /> : <ImageIcon className="p-2 text-slate-300"/>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm md:text-base truncate">{name}</div>
                        <div className="text-sm font-bold text-slate-700 mt-0.5">{group.info.sku ? group.info.sku.split('-')[0] : '---'}</div>
                        <div className="text-[10px] md:text-xs font-bold text-slate-400 mt-1 bg-slate-100 px-2 py-0.5 inline-block rounded-md">{group.items.length} variações</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openGroupEdit(name, group); }} 
                        className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-3 rounded-lg transition-colors shadow-sm hidden md:block"
                        title="Editar Modelo"
                      >
                        <Pencil size={18} />
                      </button>

                      <div className="text-right bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                        <div className="text-2xl font-black text-slate-800">{group.total}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Total</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg">
                         {expandedGroups[name] ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {expandedGroups[name] && (
                    <div className="bg-slate-50 border-t border-slate-100 p-2 mt-2 space-y-2 animate-in slide-in-from-top-2">
                      <div className="md:hidden flex justify-end mb-2">
                          <button onClick={(e) => { e.stopPropagation(); openGroupEdit(name, group); }} className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm text-xs font-bold flex items-center gap-1"><Pencil size={12} /> Editar Modelo em Lote</button>
                      </div>
                      {group.items.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-black bg-slate-800 text-white px-2 py-1 rounded">{p.size}</span><span className="text-xs text-slate-600 uppercase font-bold">{p.color}</span></div><div className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><ScanBarcode size={10} /> {p.barcode || '---'}</div></div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden h-9 shadow-sm"><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, p.quantity - 1); }} className="w-10 h-full hover:bg-slate-200 text-slate-600 font-black text-lg">-</button><div className="w-12 text-center font-black text-slate-800 text-sm">{p.quantity}</div><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, p.quantity + 1); }} className="w-10 h-full hover:bg-slate-200 text-slate-600 font-black text-lg">+</button></div>
                            <button onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-500 bg-white border border-slate-200 rounded-lg" title="Editar variação"><Pencil size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-lg"><Trash2 size={16} /></button>
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
                <div><label className="text-sm text-slate-400 block mb-1">Preço (R$)*</label><input value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="Ex: 59,90" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                
                {/* UPLOAD DE IMAGEM NO CADASTRO DE PRODUTO */}
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Foto Principal (Máx 800KB)</label>
                  <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, setBaseImage)} 
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 cursor-pointer" 
                  />
                  {baseImage && (
                      <div className="mt-2 w-16 h-16 rounded overflow-hidden border border-slate-700">
                          <img src={baseImage} className="w-full h-full object-cover" />
                      </div>
                  )}
                </div>

              </div></div>
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Layers size={16} className="text-blue-400" /> 2. Grade</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-sm text-slate-400 block mb-2">Cores (Enter)</label><div className="flex gap-2 mb-2"><input value={tempColor} onChange={e => setTempColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{colors.map(c => <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button></span>)}</div></div><div><label className="text-sm text-slate-400 block mb-2">Tamanhos (Enter)</label><div className="flex gap-2 mb-2"><input value={tempSize} onChange={e => setTempSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{sizes.map(s => <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button></span>)}</div></div></div></div>
              {generatedRows.length > 0 && (<div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Variações ({generatedRows.length})</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU</th><th className="p-2">Barcode</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></td></tr>))}</tbody></table></div></div>)}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-lg px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} {isSavingBatch ? 'SALVANDO...' : 'GERAR'}</button></div>
            </div>
          </div>
        )}

        {/* --- MODAIS DE EDIÇÃO ADMIN --- */}
        {editingGroup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-slate-900 p-6 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h2 className="text-xl font-bold text-white">Editar Modelo em Lote</h2>
                    <p className="text-xs text-slate-400">Isso atualizará todas as {editingGroup.items.length} variações.</p>
                 </div>
                 <div className="bg-blue-500/20 p-2 rounded-lg"><Layers className="text-blue-400" size={24}/></div>
              </div>
              
              <form onSubmit={handleSaveGroupEdit} className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Nome do Modelo</label>
                   <input value={editingGroup.name} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none" required />
                </div>
                
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Preço Geral (R$)</label>
                   <input value={editingGroup.price || ''} onChange={e => setEditingGroup({...editingGroup, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none" type="number" required />
                </div>

                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Link da Foto (Google Drive ou URL)</label>
                   <input value={editingGroup.image || ''} onChange={e => setEditingGroup({...editingGroup, image: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-xs focus:border-blue-500 outline-none" />
                </div>

                <div className="flex gap-3 pt-6">
                   <button type="button" onClick={() => setEditingGroup(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors">Cancelar</button>
                   <button type="submit" disabled={isSavingBatch} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-colors">
                      {isSavingBatch ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} 
                      Atualizar Grade
                   </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 p-6 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Editar Variação Específica</h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" placeholder="Nome" />
                <div className="grid grid-cols-2 gap-4"><input value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono" placeholder="SKU" /><input value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono" placeholder="Barcode" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                    <input 
                        value={editingProduct.price || ''} 
                        onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} 
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" 
                        placeholder="Preço (R$)" 
                        type="number"
                    />
                    <input value={editingProduct.color} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" placeholder="Cor" />
                </div>
                
                <input value={editingProduct.size} onChange={e => setEditingProduct({...editingProduct, size: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" placeholder="Tam" />
                <input value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs" placeholder="URL Imagem" />
                <div className="flex gap-3 pt-4"><button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-slate-800 text-white py-3 rounded-lg">Cancelar</button><button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg">Salvar</button></div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;