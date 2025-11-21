import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  limit
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  Bell,
  Package,
  RefreshCw,
  Trash2,
  Plus,
  Smartphone,
  LogOut,
  ScanBarcode,
  Image as ImageIcon,
  Search,
  X,
  Save,
  Check,
  Layers,
  Pencil,
  Zap,
  AlertCircle,
  Camera,
  StopCircle,
  BellRing,
  ChevronLeft,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  MessageCircle,
  Minus,
  RotateCcw
} from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";

// --- SONS ---
const SOUNDS = {
  success: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  alert: "https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3"
};

const playSound = (type: 'success' | 'error' | 'alert') => {
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

// Tipos
type Product = {
  id: string;
  sku?: string;          
  barcode?: string;      
  image?: string;        
  name: string;         
  color: string;        
  size: string;         
  quantity: number;
  updatedAt?: any;
};

type VariationRow = { color: string; size: string; sku: string; barcode: string; };
type ScannedItem = { product: Product; count: number; };
type HistoryItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  image: string;
  type: 'entry' | 'exit' | 'correction';
  amount: number;
  previousQty: number;
  newQty: number;
  timestamp: any;
};
type CartItem = { product: Product; quantity: number; };

function App() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminView, setAdminView] = useState<'menu' | 'stock' | 'add' | 'history'>('menu');
  const [userView, setUserView] = useState<'stock' | 'cart'>('stock');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const prevProductsRef = useRef<Product[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Estados Admin
  const [baseSku, setBaseSku] = useState('');
  const [baseName, setBaseName] = useState('');
  const [baseImage, setBaseImage] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [tempColor, setTempColor] = useState('');
  const [tempSize, setTempSize] = useState('');
  const [generatedRows, setGeneratedRows] = useState<VariationRow[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Estados Entrada Rápida
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanError, setScanError] = useState('');
  
  // Feedback visual do scan
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth).catch((e) => console.error(e));
    });
    if ("Notification" in window && Notification.permission === "granted") setPermissionGranted(true);
    return () => unsubscribe();
  }, []);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) { alert("Navegador sem suporte."); return; }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setPermissionGranted(true);
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        try { reg.showNotification("✅ Notificações Ativadas!", { body: "Agora você receberá alertas de estoque.", icon: '/vite.svg', vibrate: [200] }); } catch(e){}
      } else { new Notification("✅ Notificações Ativadas!"); }
    }
  };

  useEffect(() => {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as Product); });

      if (!loading && selectedRole === 'user') {
        const previousProducts = prevProductsRef.current;
        const soldOutItems = items.filter(newItem => {
          const oldItem = previousProducts.find(p => p.id === newItem.id);
          return oldItem && oldItem.quantity > 0 && newItem.quantity === 0;
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
    return () => unsubscribe();
  }, [loading, selectedRole]);

  useEffect(() => {
    if (selectedRole === 'admin') {
      const q = query(collection(db, HISTORY_COLLECTION), orderBy('timestamp', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: HistoryItem[] = [];
        snapshot.forEach((doc) => { items.push({ id: doc.id, ...doc.data() } as HistoryItem); });
        setHistory(items);
      });
      return () => unsubscribe();
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

  // --- FUNÇÃO DE START CÂMERA MANUAL ---
  const startCamera = () => {
    if (scannerRef.current?.isScanning) return;

    setScanError('');
    setCameraLoading(true);

    setTimeout(() => {
        if (!document.getElementById("reader")) {
            setScanError("Erro: Elemento de vídeo não encontrado.");
            setCameraLoading(false);
            return;
        }

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        // Configuração padrão sem aspectRatio para evitar cortes
        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 }
        };

        html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            handleProcessCode(decodedText);
          },
          (errorMessage) => {}
        ).then(() => {
          setIsScanning(true);
          setCameraLoading(false);
        }).catch(err => {
          console.error("Erro ao iniciar câmera", err);
          setScanError("Erro ao abrir câmera. Verifique permissões.");
          setCameraLoading(false);
          setIsScanning(false);
        });

    }, 500);
  };

  const stopCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setIsScanning(false);
      }).catch(err => {
          console.error("Erro ao parar", err);
          setIsScanning(false);
      });
    }
  };

  // Cleanup
  useEffect(() => {
      if (!showQuickEntry) {
          if (scannerRef.current) {
              try {
                  if (scannerRef.current.isScanning) {
                      scannerRef.current.stop().then(() => scannerRef.current?.clear());
                  } else {
                      scannerRef.current.clear();
                  }
              } catch(e) { console.log("Cleanup error", e) }
          }
          setIsScanning(false);
          setCameraLoading(false);
      }
  }, [showQuickEntry]);

  const handleProcessCode = (code: string) => {
    const term = code.trim().toLowerCase();
    if (!term) return;
    
    const now = Date.now();
    if (term === lastScanRef.current.code && now - lastScanRef.current.time < 2500) return; 
    lastScanRef.current = { code: term, time: now };

    const found = products.find(p => (p.sku && p.sku.toLowerCase() === term) || (p.barcode && p.barcode.toLowerCase() === term));
    
    if (found) {
      playSound('success');
      setLastScannedFeedback({ type: 'success', msg: `Lido: ${found.name}` });
      setScannedItems(prev => {
        const existingIndex = prev.findIndex(item => item.product.id === found.id);
        if (existingIndex >= 0) { const newList = [...prev]; newList[existingIndex].count += 1; return newList; }
        else { return [{ product: found, count: 1 }, ...prev]; }
      });
      setQuickScanInput(''); 
    } else { 
      playSound('error'); 
      setLastScannedFeedback({ type: 'error', msg: `Não encontrado: ${code}` });
    }

    setTimeout(() => setLastScannedFeedback(null), 3000);
  };

  const handleUpdateScannedQty = (productId: string, delta: number) => {
    setScannedItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.count + delta;
        return newQty > 0 ? { ...item, count: newQty } : item;
      }
      return item;
    }));
  };

  const handleRemoveScannedItem = (productId: string) => {
    setScannedItems(prev => prev.filter(item => item.product.id !== productId));
  };

  // ... (Grade, CRUD, etc.)
  useEffect(() => {
    const newRows: VariationRow[] = [];
    colors.forEach(color => { sizes.forEach(size => {
        const cleanSku = baseSku.toUpperCase().replace(/\s+/g, ''); const cleanColor = color.toUpperCase(); const cleanSize = size.toUpperCase().replace(/\s+/g, '');
        const autoSku = cleanSku && cleanColor && cleanSize ? `${cleanSku}-${cleanColor}-${cleanSize}` : '';
        const existingRow = generatedRows.find(r => r.color === color && r.size === size);
        newRows.push({ color, size, sku: autoSku, barcode: existingRow ? existingRow.barcode : '' });
    });}); setGeneratedRows(newRows);
  }, [colors, sizes, baseSku]);

  const addColor = () => { if (tempColor && !colors.includes(tempColor)) { setColors([...colors, tempColor]); setTempColor(''); } };
  const addSize = () => { if (tempSize && !sizes.includes(tempSize)) { setSizes([...sizes, tempSize]); setTempSize(''); } };
  const removeColor = (c: string) => setColors(colors.filter(item => item !== c));
  const removeSize = (s: string) => setSizes(sizes.filter(item => item !== s));
  const updateRowBarcode = (index: number, val: string) => { const updated = [...generatedRows]; updated[index].barcode = val; setGeneratedRows(updated); };

  const handleSaveBatch = async () => {
    if (!baseName || !baseSku || generatedRows.length === 0) { alert("Preencha dados."); return; }
    setIsSavingBatch(true);
    try {
      const batch = writeBatch(db);
      generatedRows.forEach(row => {
        const docRef = doc(collection(db, PRODUCTS_COLLECTION));
        batch.set(docRef, { name: baseName, image: baseImage, sku: row.sku, barcode: row.barcode, color: row.color, size: row.size, quantity: 0, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      setBaseSku(''); setBaseName(''); setBaseImage(''); setColors([]); setSizes([]); setAdminView('stock'); alert("Sucesso!");
    } catch (e) { console.error(e); alert("Erro."); } finally { setIsSavingBatch(false); }
  };

  const handleUpdateQuantity = async (product: Product, newQty: number) => {
    if (newQty < 0) return;
    const diff = newQty - product.quantity;
    if (diff === 0) return;
    const type = diff > 0 ? 'entry' : 'exit';
    try {
      const batch = writeBatch(db);
      const productRef = doc(db, PRODUCTS_COLLECTION, product.id);
      batch.update(productRef, { quantity: newQty, updatedAt: serverTimestamp() });
      const historyRef = doc(collection(db, HISTORY_COLLECTION));
      batch.set(historyRef, { productId: product.id, productName: product.name, sku: product.sku || '', image: product.image || '', type: type, amount: Math.abs(diff), previousQty: product.quantity, newQty: newQty, timestamp: serverTimestamp() });
      await batch.commit();
    } catch (e) { console.error(e); alert("Erro."); }
  };

  const handleDeleteProduct = async (id: string) => { if (confirm('Excluir?')) await deleteDoc(doc(db, PRODUCTS_COLLECTION, id)); };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const productRef = doc(db, PRODUCTS_COLLECTION, editingProduct.id);
      await updateDoc(productRef, { ...editingProduct, updatedAt: serverTimestamp() });
      setEditingProduct(null);
    } catch (error) { alert("Erro ao editar."); }
  };
  const handleQuickScanSubmit = (e: React.FormEvent) => { e.preventDefault(); handleProcessCode(quickScanInput); };
  const handleCommitQuickEntry = async () => {
    if (scannedItems.length === 0) return;
    setIsSavingBatch(true);
    try {
      const batch = writeBatch(db);
      scannedItems.forEach(item => {
        const docRef = doc(db, PRODUCTS_COLLECTION, item.product.id);
        const newTotal = item.product.quantity + item.count;
        batch.update(docRef, { quantity: newTotal, updatedAt: serverTimestamp() });
        const historyRef = doc(collection(db, HISTORY_COLLECTION));
        batch.set(historyRef, { productId: item.product.id, productName: item.product.name, sku: item.product.sku || '', image: item.product.image || '', type: 'entry', amount: item.count, previousQty: item.product.quantity, newQty: newTotal, timestamp: serverTimestamp() });
      });
      await batch.commit();
      setScannedItems([]); setShowQuickEntry(false); alert("Entrada realizada!");
    } catch (e) { console.error(e); alert("Erro ao salvar."); } finally { setIsSavingBatch(false); }
  };
  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) return alert("Produto sem estoque!");
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) { alert("Máximo atingido!"); return prev; }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    playSound('success');
  };
  const handleRemoveFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));
  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return item;
          if (newQty > item.product.quantity) { alert("Estoque insuficiente!"); return item; }
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };
  const generateWhatsAppMessage = () => {
    if (!customerName) return alert("Digite o nome do cliente!");
    if (cart.length === 0) return alert("Carrinho vazio!");
    const now = new Date();
    const orderId = Math.floor(Math.random() * 900000) + 100000;
    let message = `🛒 *PEDIDO:* ${orderId}\n\n🗓️ *DATA* ${now.toLocaleDateString('pt-BR')}\n⌚ *HORA:* ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n🫱🏻‍🫲🏼 *CLIENTE: ${customerName.toUpperCase()}*\n\n`;
    cart.forEach(item => { const displaySku = item.product.sku || `${item.product.name} ${item.product.color} ${item.product.size}`; message += `${displaySku} --- ${item.quantity}\n-\n`; });
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };
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

  const groupedProducts = groupProducts(filteredProducts);
  const groupedAdminProducts = groupProducts(filteredProducts);

  // --- RENDER ---

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full">
          <div className="flex flex-col items-center mb-8"><div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-700"><RefreshCw className="w-8 h-8 text-blue-500" /></div><h1 className="text-2xl font-bold text-white">Sistema ERP Flash</h1><p className="text-slate-400 text-sm mt-2">Controle de Estoque Avançado</p></div>
          <div className="flex flex-col gap-4 w-full"><button onClick={() => { const s = prompt("Senha ADM:"); if (s === "1234") setSelectedRole('admin'); else alert("Erro!"); }} className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-3 border border-slate-700"><Package size={20} /> <span>Sou Fornecedor (Painel)</span></button><button onClick={() => setSelectedRole('user')} className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-3"><Smartphone size={20} /> <span>Sou Revendedor (Alertas)</span></button></div>
        </div>
      </div>
    );
  }

  if (selectedRole === 'user') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-blue-600 text-white p-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              {userView === 'cart' ? (<button onClick={() => setUserView('stock')} className="bg-blue-700 p-2 rounded-lg hover:bg-blue-800 transition-colors"><ChevronLeft size={24}/></button>) : (<div className="bg-white/20 p-2 rounded-lg"><Bell className="w-6 h-6" /></div>)}
              <div><h1 className="font-bold text-lg">{userView === 'stock' ? 'Estoque' : 'Seu Pedido'}</h1><div className="flex items-center gap-1.5">{userView === 'stock' ? (<><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span><span className="text-xs text-blue-100 font-medium">Online</span></>) : (<span className="text-xs text-blue-100 font-medium">Finalizar Compra</span>)}</div></div>
            </div>
            <div className="flex items-center gap-2">
              {userView === 'stock' && (<button onClick={() => setUserView('cart')} className="relative bg-blue-800 hover:bg-blue-900 p-2 rounded-lg transition-colors"><ShoppingCart size={20} />{cart.length > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{cart.length}</span>)}</button>)}
              <button onClick={() => setSelectedRole(null)} className="text-xs bg-blue-700 px-3 py-2 rounded-lg flex items-center gap-1"><LogOut size={16} /></button>
            </div>
          </div>
        </header>
        <main className="max-w-md mx-auto p-4 space-y-4">
          {userView === 'stock' && (<><div className="relative"><Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" /><input type="text" placeholder="Buscar modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div className="space-y-3 pb-20">{loading ? <p className="text-center text-slate-400">Carregando...</p> : Object.keys(groupedProducts).length === 0 ? <p className="text-center text-slate-400">Nada encontrado.</p> : Object.entries(groupedProducts).map(([name, group]) => (<div key={name} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"><div onClick={() => toggleGroup(name)} className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"><div className="flex items-center gap-3 min-w-0"><div className="w-14 h-14 shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">{group.info.image ? <img src={group.info.image} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-8 h-8" />}</div><div className="min-w-0"><h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{name}</h3><div className="text-xs font-bold text-slate-500 mt-0.5">{group.info.sku ? group.info.sku.split('-')[0] : ''}</div><div className="text-[10px] text-slate-400 mt-1">{group.items.length} variações</div></div></div><div className="flex items-center gap-3"><div className="text-right"><div className="text-2xl font-bold text-blue-600">{group.total}</div><div className="text-[9px] text-slate-400 uppercase">Total</div></div>{expandedGroups[name] ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}</div></div>{expandedGroups[name] && (<div className="bg-slate-50 border-t border-slate-100 p-2 space-y-2 animate-in slide-in-from-top-2">{group.items.map(p => (<div key={p.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200"><div className="flex items-center gap-2"><span className="text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded">{p.size}</span><span className="text-xs text-slate-600 uppercase">{p.color}</span></div><div className="flex items-center gap-3">{p.quantity > 0 ? (<><span className="text-green-600 font-bold text-sm">{p.quantity} un</span><button onClick={() => handleAddToCart(p)} className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-md transition-colors flex items-center gap-1 shadow-sm"><Plus size={14} /> <span className="text-[10px] font-bold uppercase">Add</span></button></>) : (<span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">ESGOTADO</span>)}</div></div>))}</div>)}</div>))}</div></>)}
          {userView === 'cart' && (<div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"><div className="p-4 border-b border-slate-100 bg-slate-50"><h2 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="text-blue-600" /> Resumo do Pedido</h2></div><div className="p-4 space-y-4">{cart.length === 0 ? (<div className="text-center py-10 text-slate-400"><ShoppingCart size={48} className="mx-auto mb-2 opacity-20" /><p>Seu carrinho está vazio.</p><button onClick={() => setUserView('stock')} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Voltar para o estoque</button></div>) : (<><div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">{cart.map(item => (<div key={item.product.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">{item.product.image ? <img src={item.product.image} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-300"/>}</div><div><div className="text-xs font-bold text-slate-800">{item.product.sku ? item.product.sku.split('-')[0] : item.product.name}</div><div className="text-[10px] text-slate-500">{item.product.color} - {item.product.size}</div></div></div><div className="flex items-center gap-2"><div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden"><button onClick={() => handleUpdateCartQty(item.product.id, -1)} className="px-2 py-1 hover:bg-slate-100 text-slate-600">-</button><span className="text-xs font-bold px-1">{item.quantity}</span><button onClick={() => handleUpdateCartQty(item.product.id, 1)} className="px-2 py-1 hover:bg-slate-100 text-slate-600">+</button></div><button onClick={() => handleRemoveFromCart(item.product.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button></div></div>))}</div><div className="pt-4 border-t border-slate-100"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Cliente Final*</label><input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ex: Maria Silva" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" /></div><button onClick={generateWhatsAppMessage} disabled={!customerName} className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all ${!customerName ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-[1.02]'}`}><MessageCircle size={20} /> ENVIAR PEDIDO NO ZAP</button></>)}</div></div>)}
        </main>
      </div>
    );
  }

  // --- ADMIN ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {adminView !== 'menu' ? (<button onClick={() => setAdminView('menu')} className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"><ChevronLeft className="w-6 h-6 text-white" /></button>) : (<div className="bg-slate-800 p-2 rounded-lg border border-slate-700"><Package className="w-6 h-6 text-blue-400" /></div>)}
            <div><h1 className="font-bold text-white md:block">Painel ERP</h1></div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setSelectedRole(null)} className="text-xs bg-slate-800 border border-slate-700 p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 hover:bg-slate-700"><LogOut size={16} /> <span className="hidden md:inline">Sair</span></button>
          </div>
        </div>
      </header>

      {/* ESTILO FORÇADO PARA GARANTIR VIDEO FULL SCREEN */}
      <style>{`
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 0;
        }
      `}</style>

      <main className="max-w-6xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6 relative">
        {adminView === 'menu' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <button onClick={() => setAdminView('stock')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500/20 rounded-full flex items-center justify-center"><Package size={24} className="text-blue-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Estoque</h3></div></button>
            <button onClick={() => { setShowQuickEntry(true); setShowCamera(false); setScannedItems([]); }} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 md:h-16 bg-yellow-500/20 rounded-full flex items-center justify-center"><Zap size={24} className="text-yellow-400 fill-yellow-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Entrada Rápida</h3></div></button>
            <button onClick={() => setAdminView('add')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 md:h-16 bg-green-500/20 rounded-full flex items-center justify-center"><Plus size={24} className="text-green-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Novo Produto</h3></div></button>
            <button onClick={() => setAdminView('history')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 md:h-16 bg-purple-500/20 rounded-full flex items-center justify-center"><ClipboardList size={24} className="text-purple-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Relatório</h3></div></button>
          </div>
        )}

        {adminView === 'history' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-800/50"><ClipboardList className="text-purple-400" /><h2 className="text-lg font-bold text-white">Movimentações Recentes</h2></div>
            <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="text-xs text-slate-500 border-b border-slate-800 uppercase"><th className="p-4">Tempo</th><th className="p-4">Produto / SKU</th><th className="p-4 text-center">Tipo</th><th className="p-4 text-right">Detalhe</th></tr></thead><tbody className="divide-y divide-slate-800">{history.length === 0 ? (<tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhuma movimentação registrada.</td></tr>) : history.map((item) => (<tr key={item.id} className="hover:bg-slate-800/30 transition-colors"><td className="p-4 align-top"><div className="text-sm text-white font-mono">{formatDate(item.timestamp).split(' ')[0]}</div><div className="text-xs text-slate-500 font-mono">{formatDate(item.timestamp).split(' ')[1]}</div></td><td className="p-4 align-top"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-800 rounded border border-slate-700 overflow-hidden shrink-0">{item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ImageIcon className="p-2 text-slate-500"/>}</div><div><div className="text-sm font-bold text-slate-200">{item.productName}</div><div className="text-xs text-slate-500 font-mono">{item.sku}</div></div></div></td><td className="p-4 align-top text-center">{item.type === 'entry' ? (<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20"><TrendingUp size={12} /> ENTRADA</span>) : item.type === 'exit' ? (<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20"><TrendingDown size={12} /> SAÍDA</span>) : (<span className="text-xs text-slate-500">Correção</span>)}</td><td className="p-4 align-top text-right"><div className="flex items-center justify-end gap-2 text-sm font-mono"><span className="text-slate-400">{item.previousQty}</span><ArrowRight size={12} className="text-slate-600" /><span className="text-white font-bold">{item.newQty}</span></div><div className={`text-xs font-bold mt-1 ${item.type === 'entry' ? 'text-green-500' : 'text-red-500'}`}>{item.type === 'entry' ? '+' : '-'}{item.amount}</div></td></tr>))}</tbody></table></div>
          </div>
        )}

        {adminView === 'stock' && (
          <>
            <div className="bg-slate-800 p-3 md:p-4 rounded-xl flex items-center gap-3 border border-blue-900/30 relative overflow-hidden shadow-lg animate-in slide-in-from-right">
              <div className="absolute right-0 top-0 p-4 opacity-10"><ScanBarcode size={100} /></div>
              <div className="flex-1 relative z-10"><label className="text-[10px] md:text-xs text-blue-300 font-bold mb-1 block flex items-center gap-2"><ScanBarcode size={14}/> BUSCAR</label><input autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtrar..." className="w-full bg-slate-950 border-2 border-blue-600/50 rounded-lg px-3 py-2 md:px-4 md:py-3 text-base md:text-lg text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none" /></div>
            </div>
            <div className="space-y-3 pb-20 animate-in slide-in-from-bottom-4">
              {Object.entries(groupedAdminProducts).length === 0 ? (<div className="text-center text-slate-500 py-10">Nenhum produto encontrado</div>) : Object.entries(groupedAdminProducts).map(([name, group]) => (
                <div key={name} className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm group overflow-hidden">
                  <div onClick={() => toggleGroup(name)} className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0"><div className="w-14 h-14 md:w-16 md:h-16 shrink-0 bg-slate-100 rounded-md border overflow-hidden flex items-center justify-center">{group.info.image ? <img src={group.info.image} className="w-full h-full object-cover" /> : <ImageIcon className="p-2 text-slate-300"/>}</div><div className="min-w-0"><div className="font-bold text-slate-900 text-sm truncate">{name}</div><div className="text-sm font-bold text-slate-700 mt-0.5">{group.info.sku ? group.info.sku.split('-')[0] : '---'}</div><div className="text-[10px] text-slate-400 mt-1">{group.items.length} variações</div></div></div>
                    <div className="flex items-center gap-3"><div className="text-right bg-slate-100 px-3 py-1 rounded-lg border border-slate-200"><div className="text-xl font-bold text-slate-800">{group.total}</div><div className="text-[9px] text-slate-500 uppercase font-bold">Total</div></div>{expandedGroups[name] ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}</div>
                  </div>
                  {expandedGroups[name] && (
                    <div className="bg-slate-50 border-t border-slate-100 p-2 space-y-2 animate-in slide-in-from-top-2">
                      {group.items.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded">{p.size}</span><span className="text-xs text-slate-600 uppercase font-bold">{p.color}</span></div><div className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><ScanBarcode size={10} /> {p.barcode || '---'}</div></div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden h-8"><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, p.quantity - 1); }} className="w-8 h-full hover:bg-slate-200 text-slate-600 font-bold">-</button><div className="w-10 text-center font-bold text-slate-800 text-sm">{p.quantity}</div><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, p.quantity + 1); }} className="w-8 h-full hover:bg-slate-200 text-slate-600 font-bold">+</button></div>
                            <button onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-500 bg-white border border-slate-200 rounded-lg"><Pencil size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 bg-white border border-slate-200 rounded-lg"><Trash2 size={14} /></button>
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
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Package size={16} className="text-blue-400" /> 1. Produto Pai</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-sm text-slate-400 block mb-1">Nome*</label><input value={baseName} onChange={e => setBaseName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div><div><label className="text-sm text-slate-400 block mb-1">SKU Base*</label><input value={baseSku} onChange={e => setBaseSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div><div className="md:col-span-2"><label className="text-sm text-slate-400 block mb-1">Foto (URL)</label><input value={baseImage} onChange={e => setBaseImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-xs" /></div></div></div>
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Layers size={16} className="text-blue-400" /> 2. Grade</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-sm text-slate-400 block mb-2">Cores (Enter)</label><div className="flex gap-2 mb-2"><input value={tempColor} onChange={e => setTempColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{colors.map(c => <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button></span>)}</div></div><div><label className="text-sm text-slate-400 block mb-2">Tamanhos (Enter)</label><div className="flex gap-2 mb-2"><input value={tempSize} onChange={e => setTempSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{sizes.map(s => <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button></span>)}</div></div></div></div>
              {generatedRows.length > 0 && (<div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Variações ({generatedRows.length})</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU</th><th className="p-2">Barcode</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></td></tr>))}</tbody></table></div></div>)}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-lg px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} {isSavingBatch ? 'SALVANDO...' : 'GERAR'}</button></div>
            </div>
          </div>
        )}

        {/* --- POPUP DE ENTRADA RÁPIDA (NOVO FLUXO) --- */}
        {showQuickEntry && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex-1 relative bg-black overflow-hidden">
              
              {/* ÁREA DA CÂMERA (SÓ APARECE QUANDO LIGA) */}
              <div 
                id="reader" 
                className="w-full h-full object-cover"
                style={{ display: isScanning ? 'block' : 'none' }}
              ></div>

              {/* BOTÃO DE LIGAR CÂMERA (QUANDO ESTÁ DESLIGADA) */}
              {!isScanning && !cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 z-10 bg-slate-900">
                  <button 
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-full font-bold text-xl shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center gap-3 animate-pulse"
                  >
                    <Camera size={32} /> TOCAR PARA LIGAR CÂMERA
                  </button>
                  {scanError && <p className="text-red-400 text-sm font-bold mt-4 bg-red-900/20 p-2 rounded">{scanError}</p>}
                  <p className="text-slate-500 text-sm">Necessário permissão do navegador</p>
                </div>
              )}

              {/* LOADING (QUANDO ESTÁ LIGANDO) */}
              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black z-20">
                  <RefreshCw className="animate-spin text-blue-500 mb-2" size={48} />
                  <p>Iniciando câmera...</p>
                </div>
              )}

              {/* OVERLAYS (SÓ QUANDO ESCANEANDO) */}
              {isScanning && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
                    </div>
                  </div>
                  <button onClick={stopCamera} className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full z-50 font-bold shadow-lg flex items-center gap-2"><StopCircle size={20} /> PARAR</button>
                </>
              )}

              {/* BOTÃO FECHAR (X) GERAL */}
              {!isScanning && !cameraLoading && (
                <button onClick={() => setShowQuickEntry(false)} className="absolute top-4 right-4 bg-slate-800 text-white p-2 rounded-full z-50"><X size={24} /></button>
              )}

              {/* FEEDBACK VISUAL (O "Coloridinho") */}
              {lastScannedFeedback && (
                <div className={`absolute top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 animate-in fade-in zoom-in duration-300 pointer-events-none z-50 ${
                  lastScannedFeedback.type === 'success' ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'
                }`}>
                  {lastScannedFeedback.type === 'success' ? <Check size={24} /> : <AlertCircle size={24} />}
                  {lastScannedFeedback.msg}
                </div>
              )}
            </div>

            {/* GAVETA INFERIOR */}
            <div className="bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] flex flex-col max-h-[40vh]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ITENS BIPADOS</span>
                  <span className="text-xl font-black text-slate-800">{scannedItems.reduce((a, b) => a + b.count, 0)} UNIDADES</span>
                </div>
                <button 
                  onClick={handleCommitQuickEntry}
                  disabled={scannedItems.length === 0 || isSavingBatch}
                  className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all ${scannedItems.length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-green-600 text-white hover:scale-105'}`}
                >
                  {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Check size={20} />} SALVAR
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {scannedItems.map((item) => (
                  <div key={item.product.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                        {item.product.image ? <img src={item.product.image} className="w-full h-full object-cover" /> : <ImageIcon className="p-2 text-slate-300"/>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate w-32">{item.product.name}</div>
                        <div className="text-xs text-slate-500 font-mono flex gap-1">
                          <span className="bg-slate-100 px-1 rounded">{item.product.size}</span>
                          <span className="uppercase">{item.product.color}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* CONTROLES +/- */}
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                      <button onClick={() => handleUpdateScannedQty(item.product.id, -1)} className="w-8 h-8 bg-white rounded shadow-sm flex items-center justify-center text-slate-600 font-bold active:scale-90 transition-transform"><Minus size={14}/></button>
                      <span className="w-6 text-center font-bold text-slate-800">{item.count}</span>
                      <button onClick={() => handleUpdateScannedQty(item.product.id, 1)} className="w-8 h-8 bg-blue-600 text-white rounded shadow-sm flex items-center justify-center font-bold active:scale-90 transition-transform"><Plus size={14}/></button>
                    </div>
                    <button onClick={() => handleRemoveScannedItem(item.product.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                  </div>
                ))}
                {scannedItems.length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-sm">
                    Clique em LIGAR CÂMERA ou digite abaixo.
                  </div>
                )}
              </div>
              
              <div className="p-2 bg-white border-t border-slate-100 pb-6">
                 <form onSubmit={handleQuickScanSubmit}>
                    <input 
                      value={quickScanInput}
                      onChange={e => setQuickScanInput(e.target.value)}
                      placeholder="Digitar código manual..." 
                      className="w-full bg-slate-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                 </form>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL DE EDIÇÃO --- */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 p-6 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Editar Produto</h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" placeholder="Nome" />
                <div className="grid grid-cols-2 gap-4"><input value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono" placeholder="SKU" /><input value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono" placeholder="Barcode" /></div>
                <div className="grid grid-cols-2 gap-4"><input value={editingProduct.color} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" placeholder="Cor" /><input value={editingProduct.size} onChange={e => setEditingProduct({...editingProduct, size: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" placeholder="Tam" /></div>
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