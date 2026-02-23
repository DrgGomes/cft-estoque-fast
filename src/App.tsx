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
  ShoppingCart, MessageCircle, Minus, Truck, FileText, ShoppingBag
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

// Tipos
type Product = { id: string; sku?: string; barcode?: string; image?: string; name: string; color: string; size: string; quantity: number; price: number; updatedAt?: any; };
type VariationRow = { color: string; size: string; sku: string; barcode: string; };
type ScannedItem = { product: Product; count: number; };
type HistoryItem = { id: string; productId: string; productName: string; sku: string; image: string; type: 'entry' | 'exit' | 'correction'; amount: number; previousQty: number; newQty: number; timestamp: any; };
type CartItem = { product: Product; quantity: number; };
type PurchaseOrder = { id: string; orderCode: string; supplier: string; status: 'pending' | 'received'; items: { productId: string; sku: string; name: string; quantity: number }[]; totalItems: number; createdAt: any; receivedAt?: any; };

function App() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [adminView, setAdminView] = useState<'menu' | 'stock' | 'add' | 'history' | 'purchases' | 'create_purchase'>('menu');
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'review'>('select');
  
  // Atualizado para suportar as novas telas do revendedor
  const [userView, setUserView] = useState<'dashboard' | 'stock' | 'cart' | 'orders'>('dashboard');
  
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

  // Estados Admin
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

  // Estados Scanner
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanError, setScanError] = useState('');
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{type: 'success' | 'error' | 'magic', msg: string} | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    if ("Notification" in window && Notification.permission === "granted") setPermissionGranted(true);
    return () => unsubscribe();
  }, []);

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

  // --- CÂMERA E FUNÇÕES DE SCANNER ---
  const startCamera = () => {
    if (scannerRef.current?.isScanning) return;
    setScanError('');
    setCameraLoading(true);
    setTimeout(() => {
        if (!document.getElementById("reader")) { setScanError("Erro: Elemento de vídeo não encontrado."); setCameraLoading(false); return; }
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => { handleProcessCode(decodedText); }, (errorMessage) => {}).then(() => { setIsScanning(true); setCameraLoading(false); }).catch(err => { console.error("Erro ao iniciar câmera", err); setScanError("Erro ao abrir câmera. Verifique permissões."); setCameraLoading(false); setIsScanning(false); });
    }, 500);
  };
  const stopCamera = () => { if (scannerRef.current && scannerRef.current.isScanning) { scannerRef.current.stop().then(() => { scannerRef.current?.clear(); setIsScanning(false); }).catch(err => { console.error("Erro ao parar", err); setIsScanning(false); }); } };
  useEffect(() => { if (!showQuickEntry) { if (scannerRef.current) { try { if (scannerRef.current.isScanning) { scannerRef.current.stop().then(() => scannerRef.current?.clear()); } else { scannerRef.current.clear(); } } catch(e) {} } setIsScanning(false); setCameraLoading(false); } }, [showQuickEntry]);
  
  const handleProcessCode = async (code: string) => { 
    const term = code.trim(); 
    if (!term) return; 
    const now = Date.now(); 
    if (term === lastScanRef.current.code && now - lastScanRef.current.time < 2500) return; 
    lastScanRef.current = { code: term, time: now }; 
    if (term.startsWith('PED-')) { 
      const order = purchases.find(p => p.orderCode === term); 
      if (!order) { playSound('error'); setLastScannedFeedback({ type: 'error', msg: `Pedido inválido` }); return; } 
      if (order.status === 'received') { playSound('error'); setLastScannedFeedback({ type: 'error', msg: `Pedido já recebido` }); return; } 
      await handleReceiveOrder(order); 
      setLastScannedFeedback({ type: 'magic', msg: `PEDIDO RECEBIDO!` }); return; 
    } 
    const found = products.find(p => (p.sku && p.sku.toLowerCase() === term.toLowerCase()) || (p.barcode && p.barcode.toLowerCase() === term.toLowerCase())); 
    if (found) { 
      playSound('success'); 
      setLastScannedFeedback({ type: 'success', msg: `Lido: ${found.name}` }); 
      setScannedItems(prev => { 
        const existingIndex = prev.findIndex(item => item.product.id === found.id); 
        if (existingIndex >= 0) { 
          const newList = [...prev]; 
          newList[existingIndex].count += 1; 
          return newList; 
        } else { 
          return [{ product: found, count: 1 }, ...prev]; 
        } 
      }); 
      setQuickScanInput(''); 
    } else { 
      playSound('error'); 
      setLastScannedFeedback({ type: 'error', msg: `Produto não encontrado` }); 
    } 
    setTimeout(() => setLastScannedFeedback(null), 3000); 
  };
  
  const handleReceiveOrder = async (order: PurchaseOrder) => { 
    setIsSavingBatch(true); 
    try { 
      const batch = writeBatch(db); 
      const orderRef = doc(db, PURCHASES_COLLECTION, order.id); 
      batch.update(orderRef, { status: 'received', receivedAt: serverTimestamp() }); 
      for (const item of order.items) { 
        const currentProduct = products.find(p => p.id === item.productId); 
        if (currentProduct) { 
          const productRef = doc(db, PRODUCTS_COLLECTION, item.productId); 
          const newQty = currentProduct.quantity + item.quantity; 
          batch.update(productRef, { quantity: newQty, updatedAt: serverTimestamp() }); 
          const historyRef = doc(collection(db, HISTORY_COLLECTION)); 
          batch.set(historyRef, { productId: item.productId, productName: item.name, sku: item.sku, image: '', type: 'entry', amount: item.quantity, previousQty: currentProduct.quantity, newQty: newQty, timestamp: serverTimestamp() }); 
        } 
      } 
      await batch.commit(); 
      playSound('magic'); 
      alert(`SUCESSO! Pedido ${order.orderCode} recebido.`); 
      setShowQuickEntry(false); 
    } catch (e) { 
      console.error(e); 
      playSound('error'); 
      alert("Erro ao processar."); 
    } finally { 
      setIsSavingBatch(false); 
    } 
  };
  
  // --- CARRINHO DE COMPRAS E PEDIDOS ---
  const handleAddToPurchaseCart = (product: Product) => { setPurchaseCart(prev => { const existing = prev.find(item => item.product.id === product.id); if (existing) return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item); return [...prev, { product, quantity: 1 }]; }); };
  const handleRemoveFromPurchaseCart = (id: string) => setPurchaseCart(prev => prev.filter(i => i.product.id !== id));
  const handleUpdatePurchaseCartQty = (id: string, delta: number) => { setPurchaseCart(prev => prev.map(item => { if (item.product.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) }; return item; }).filter(item => item.quantity > 0)); };
  const handleCreatePurchaseOrder = async () => { if (!supplierName || purchaseCart.length === 0) return alert("Defina fornecedor e produtos."); setIsSavingBatch(true); try { const orderCode = `PED-${Math.floor(Math.random() * 900000) + 100000}`; const itemsData = purchaseCart.map(i => ({ productId: i.product.id, sku: i.product.sku || '', name: i.product.name, quantity: i.quantity })); await addDoc(collection(db, PURCHASES_COLLECTION), { orderCode, supplier: supplierName, status: 'pending', items: itemsData, totalItems: purchaseCart.reduce((a, b) => a + b.quantity, 0), createdAt: serverTimestamp() }); setPurchaseCart([]); setSupplierName(''); setAdminView('purchases'); setPurchaseStep('select'); playSound('success'); alert(`Pedido ${orderCode} criado!`); } catch (e) { console.error(e); alert("Erro ao criar pedido."); } finally { setIsSavingBatch(false); } };
  const handleUpdateScannedQty = (productId: string, delta: number) => { setScannedItems(prev => prev.map(item => { if (item.product.id === productId) { const newQty = item.count + delta; return newQty > 0 ? { ...item, count: newQty } : item; } return item; })); };
  const handleRemoveScannedItem = (productId: string) => { setScannedItems(prev => prev.filter(item => item.product.id !== productId)); };
  
  // --- GERADOR DE PRODUTOS E CRUD ---
  useEffect(() => { const newRows: VariationRow[] = []; colors.forEach(color => { sizes.forEach(size => { const cleanSku = baseSku.toUpperCase().replace(/\s+/g, ''); const cleanColor = color.toUpperCase(); const cleanSize = size.toUpperCase().replace(/\s+/g, ''); const autoSku = cleanSku && cleanColor && cleanSize ? `${cleanSku}-${cleanColor}-${cleanSize}` : ''; const existingRow = generatedRows.find(r => r.color === color && r.size === size); newRows.push({ color, size, sku: autoSku, barcode: existingRow ? existingRow.barcode : '' }); });}); setGeneratedRows(newRows); }, [colors, sizes, baseSku]);
  const addColor = () => { if (tempColor && !colors.includes(tempColor)) { setColors([...colors, tempColor]); setTempColor(''); } };
  const addSize = () => { if (tempSize && !sizes.includes(tempSize)) { setSizes([...sizes, tempSize]); setTempSize(''); } };
  const removeColor = (c: string) => setColors(colors.filter(item => item !== c));
  const removeSize = (s: string) => setSizes(sizes.filter(item => item !== s));
  const updateRowBarcode = (index: number, val: string) => { const updated = [...generatedRows]; updated[index].barcode = val; setGeneratedRows(updated); };
  
  const handleSaveBatch = async () => { if (!baseName || !baseSku || generatedRows.length === 0) { alert("Preencha dados."); return; } setIsSavingBatch(true); const processedImage = processImageUrl(baseImage); const priceNumber = parseFloat(basePrice.replace(',', '.').replace('R$', '').trim()) || 0; try { const batch = writeBatch(db); generatedRows.forEach(row => { const docRef = doc(collection(db, PRODUCTS_COLLECTION)); batch.set(docRef, { name: baseName, image: processedImage, sku: row.sku, barcode: row.barcode, color: row.color, size: row.size, price: priceNumber, quantity: 0, updatedAt: serverTimestamp() }); }); await batch.commit(); setBaseSku(''); setBaseName(''); setBaseImage(''); setBasePrice(''); setColors([]); setSizes([]); setAdminView('stock'); alert("Sucesso!"); } catch (e) { console.error(e); alert("Erro."); } finally { setIsSavingBatch(false); } };
  const handleUpdateQuantity = async (product: Product, newQty: number) => { if (newQty < 0) return; const diff = newQty - product.quantity; if (diff === 0) return; const type = diff > 0 ? 'entry' : 'exit'; try { const batch = writeBatch(db); const productRef = doc(db, PRODUCTS_COLLECTION, product.id); batch.update(productRef, { quantity: newQty, updatedAt: serverTimestamp() }); const historyRef = doc(collection(db, HISTORY_COLLECTION)); batch.set(historyRef, { productId: product.id, productName: product.name, sku: product.sku || '', image: product.image || '', type: type, amount: Math.abs(diff), previousQty: product.quantity, newQty: newQty, timestamp: serverTimestamp() }); await batch.commit(); } catch (e) { console.error(e); alert("Erro."); } };
  const handleDeleteProduct = async (id: string) => { if (confirm('Excluir?')) await deleteDoc(doc(db, PRODUCTS_COLLECTION, id)); };
  const handleSaveEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingProduct) return; const priceNumber = typeof editingProduct.price === 'string' ? parseFloat(editingProduct.price) : editingProduct.price; const processedImage = processImageUrl(editingProduct.image || ''); try { const productRef = doc(db, PRODUCTS_COLLECTION, editingProduct.id); await updateDoc(productRef, { ...editingProduct, price: priceNumber, image: processedImage, updatedAt: serverTimestamp() }); setEditingProduct(null); } catch (error) { alert("Erro ao editar."); } };
  const openGroupEdit = (groupName: string, groupData: any) => { setEditingGroup({ oldName: groupName, name: groupData.info.name, image: groupData.info.image || '', price: groupData.info.price || 0, items: groupData.items }); };
  const handleSaveGroupEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingGroup) return; setIsSavingBatch(true); const priceNumber = typeof editingGroup.price === 'string' ? parseFloat(editingGroup.price) : editingGroup.price; const processedImage = processImageUrl(editingGroup.image || ''); try { const batch = writeBatch(db); editingGroup.items.forEach((item) => { const ref = doc(db, PRODUCTS_COLLECTION, item.id); batch.update(ref, { name: editingGroup.name, image: processedImage, price: priceNumber, updatedAt: serverTimestamp() }); }); await batch.commit(); setEditingGroup(null); alert("Modelo inteiro atualizado com sucesso!"); } catch (error) { console.error(error); alert("Erro ao atualizar o modelo."); } finally { setIsSavingBatch(false); } };
  const handleQuickScanSubmit = (e: React.FormEvent) => { e.preventDefault(); handleProcessCode(quickScanInput); };
  const handleCommitQuickEntry = async () => { if (scannedItems.length === 0) return; setIsSavingBatch(true); try { const batch = writeBatch(db); scannedItems.forEach(item => { const docRef = doc(db, PRODUCTS_COLLECTION, item.product.id); const newTotal = item.product.quantity + item.count; batch.update(docRef, { quantity: newTotal, updatedAt: serverTimestamp() }); const historyRef = doc(collection(db, HISTORY_COLLECTION)); batch.set(historyRef, { productId: item.product.id, productName: item.product.name, sku: item.product.sku || '', image: item.product.image || '', type: 'entry', amount: item.count, previousQty: item.product.quantity, newQty: newTotal, timestamp: serverTimestamp() }); }); await batch.commit(); setScannedItems([]); setShowQuickEntry(false); alert("Entrada realizada!"); } catch (e) { console.error(e); alert("Erro ao salvar."); } finally { setIsSavingBatch(false); } };
  
  const handleAddToCart = (product: Product) => { if (product.quantity <= 0) return alert("Produto sem estoque!"); setCart(prev => { const existing = prev.find(item => item.product.id === product.id); if (existing) { if (existing.quantity >= product.quantity) { alert("Máximo atingido!"); return prev; } return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item); } return [...prev, { product, quantity: 1 }]; }); playSound('success'); };
  const handleRemoveFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));
  const handleUpdateCartQty = (productId: string, delta: number) => { setCart(prev => { return prev.map(item => { if (item.product.id === productId) { const newQty = item.quantity + delta; if (newQty <= 0) return item; if (newQty > item.product.quantity) { alert("Estoque insuficiente!"); return item; } return { ...item, quantity: newQty }; } return item; }); }); };
  
  const generateWhatsAppMessage = () => { if (!customerName) return alert("Digite o nome do cliente!"); if (cart.length === 0) return alert("Carrinho vazio!"); const now = new Date(); const orderId = Math.floor(Math.random() * 900000) + 100000; let message = `🛒 *PEDIDO:* ${orderId}\n\n🗓️ *DATA* ${now.toLocaleDateString('pt-BR')}\n⌚ *HORA:* ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n🫱🏻‍🫲🏼 *CLIENTE: ${customerName.toUpperCase()}*\n\n`; let totalPedido = 0; cart.forEach(item => { const displaySku = item.product.sku || `${item.product.name} ${item.product.color} ${item.product.size}`; const price = item.product.price || 0; const subtotal = price * item.quantity; totalPedido += subtotal; message += `${displaySku} --- ${item.quantity}x (${formatCurrency(price)})\n`; message += `-\n`; }); message += `\n💰 *TOTAL: ${formatCurrency(totalPedido)}*`; window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank'); };
  
  const groupProducts = (items: Product[]) => { const groups: Record<string, { info: Product, total: number, items: Product[] }> = {}; items.forEach(product => { const key = product.name; if (!groups[key]) groups[key] = { info: product, total: 0, items: [] }; groups[key].items.push(product); groups[key].total += product.quantity; }); Object.values(groups).forEach(group => group.items.sort((a, b) => (a.size > b.size ? 1 : -1))); return groups; };
  const toggleGroup = (groupName: string) => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  const formatDate = (timestamp: any) => { if (!timestamp) return '...'; const date = timestamp.toDate(); return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date); };

  const groupedProducts = groupProducts(filteredProducts);
  const groupedAdminProducts = groupProducts(filteredProducts);

  // --- RENDER ---

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

  // --- TELA DO REVENDEDOR (NOVO DESIGN PREMIUM) ---
  if (selectedRole === 'user') {
    return (
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
        
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
            <button onClick={() => setUserView('stock')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'stock' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Package size={20} /> Fazer Pedido</button>
            <button onClick={() => setUserView('orders')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${userView === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ClipboardList size={20} /> Meus Pedidos</button>
          </nav>
          <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2"><LogOut size={20} /> Sair da conta</button>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          
          {/* Topbar (Mobile e Carrinho) */}
          <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="md:hidden bg-blue-600 text-white p-2 rounded-lg"><RefreshCw size={20} /></div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 hidden md:block">
                  {userView === 'dashboard' ? 'Dashboard' : userView === 'stock' ? 'Catálogo de Produtos' : userView === 'cart' ? 'Finalizar Compra' : 'Histórico de Pedidos'}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => setUserView('cart')} className="relative bg-slate-100 hover:bg-slate-200 p-3 rounded-xl transition-colors text-slate-600">
                <ShoppingCart size={20} />
                {cart.length > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">{cart.length}</span>)}
              </button>
              {/* Menu Mobile */}
              <button onClick={handleLogout} className="md:hidden text-xs bg-slate-100 p-3 rounded-xl text-red-500"><LogOut size={20} /></button>
            </div>
          </header>

          <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">

            {/* --- VIEW: DASHBOARD --- */}
            {userView === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                {/* Métricas */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><ShoppingBag size={28} /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Total Comprado (Mês)</p><p className="text-2xl font-black text-slate-800">R$ 0,00</p></div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Package size={28} /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Pedidos Realizados</p><p className="text-2xl font-black text-slate-800">0</p></div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Zap size={28} /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Seu Top Produto</p><p className="text-lg font-bold text-slate-800 truncate">Nenhum ainda</p></div>
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Ferramentas e Links */}
                  <section className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Smartphone className="text-blue-500"/> Central de Ferramentas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <a href="#" className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-green-500 hover:shadow-md transition flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition"><MessageCircle size={24} /></div>
                        <div><h4 className="font-bold text-slate-800">Grupo VIP (WhatsApp)</h4><p className="text-xs text-slate-500 mt-1">Avisos e reposições.</p></div>
                      </a>
                      <a href="#" className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition"><ImageIcon size={24} /></div>
                        <div><h4 className="font-bold text-slate-800">Fotos p/ Divulgar</h4><p className="text-xs text-slate-500 mt-1">Acesse o Google Drive.</p></div>
                      </a>
                    </div>
                  </section>

                  {/* Atualizações */}
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4 flex items-center gap-2"><Bell className="text-orange-500"/> Mural de Avisos</h3>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                        <div><p className="text-sm font-bold text-slate-800">Bem-vindo ao DropFast!</p><p className="text-xs text-slate-500 mt-1">Comece a vender agora mesmo.</p></div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* --- VIEW: ESTOQUE --- */}
            {userView === 'stock' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                    <input type="text" placeholder="Buscar modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
                 </div>
                 
                 <div className="space-y-3 pb-20">
                   {loading ? <p className="text-center text-slate-400">Carregando catálogo...</p> : Object.keys(groupedProducts).length === 0 ? <p className="text-center text-slate-400 py-10">Nenhum produto encontrado.</p> : Object.entries(groupedProducts).map(([name, group]) => (
                     <div key={name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                       <div onClick={() => toggleGroup(name)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                         <div className="flex items-center gap-4 min-w-0">
                           <div className="w-16 h-16 shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">{group.info.image ? <img src={group.info.image} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-8 h-8" />}</div>
                           <div className="min-w-0"><h3 className="font-bold text-slate-800 text-base leading-tight truncate">{name}</h3><div className="text-xs font-bold text-slate-500 mt-1">{group.info.sku ? group.info.sku.split('-')[0] : ''}</div><div className="text-[11px] text-slate-400 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded-full">{group.items.length} variações</div></div>
                         </div>
                         <div className="flex items-center gap-4">
                           <div className="text-right"><div className="text-2xl font-black text-blue-600">{group.total}</div><div className="text-[10px] text-slate-400 uppercase font-bold">No Estoque</div></div>
                           {expandedGroups[name] ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
                         </div>
                       </div>
                       
                       {expandedGroups[name] && (<div className="bg-slate-50 border-t border-slate-100 p-3 space-y-2 animate-in slide-in-from-top-2">
                         {group.items.map(p => (
                           <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                             <div className="flex items-center gap-3">
                               <span className="text-sm font-black bg-slate-800 text-white w-10 h-10 flex items-center justify-center rounded-lg">{p.size}</span>
                               <span className="text-xs text-slate-600 uppercase font-bold">{p.color}</span>
                             </div>
                             <div className="flex items-center gap-4">
                               <div className="text-sm font-black text-green-600">{formatCurrency(p.price || 0)}</div>
                               {p.quantity > 0 ? (
                                 <div className="flex items-center gap-3">
                                   <span className="text-slate-600 font-medium text-xs bg-slate-100 px-2 py-1 rounded">{p.quantity} unid.</span>
                                   <button onClick={() => handleAddToCart(p)} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors flex items-center gap-1 shadow-md hover:scale-105 active:scale-95"><Plus size={16} /> <span className="text-xs font-bold uppercase hidden sm:inline">Add</span></button>
                                 </div>
                               ) : (<span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded border border-red-100">ESGOTADO</span>)}
                             </div>
                           </div>
                         ))}
                       </div>)}
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {/* --- VIEW: ORDERS (HISTÓRICO DE PEDIDOS) --- */}
            {userView === 'orders' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="text-blue-600"/> Histórico de Pedidos</h3>
                </div>
                <div className="p-10 text-center text-slate-500">
                    <Truck size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-slate-800">Nenhum pedido registrado ainda.</p>
                    <p className="text-sm mt-2">Assim que você fizer a primeira compra, ela aparecerá aqui com o status.</p>
                </div>
              </div>
            )}

            {/* --- VIEW: CARRINHO --- */}
            {userView === 'cart' && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-2xl mx-auto animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><ShoppingCart className="text-blue-600" /> Resumo do Pedido</h2>
                  <button onClick={() => setUserView('stock')} className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"><ChevronLeft size={16}/> Voltar</button>
                </div>
                <div className="p-6 space-y-6">
                  {cart.length === 0 ? (
                    <div className="text-center py-10 text-slate-400"><ShoppingCart size={48} className="mx-auto mb-2 opacity-20" /><p>Seu carrinho está vazio.</p></div>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                        {cart.map(item => (
                          <div key={item.product.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">{item.product.image ? <img src={item.product.image} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-300"/>}</div>
                              <div>
                                <div className="text-sm font-bold text-slate-800">{item.product.sku ? item.product.sku.split('-')[0] : item.product.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5"><span className="font-bold">{item.product.color}</span> • Tam: <span className="font-bold">{item.product.size}</span></div>
                                <div className="text-sm text-green-600 font-black mt-1">{formatCurrency(item.product.price || 0)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                <button onClick={() => handleUpdateCartQty(item.product.id, -1)} className="px-3 py-2 hover:bg-slate-200 text-slate-600 font-bold">-</button>
                                <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                                <button onClick={() => handleUpdateCartQty(item.product.id, 1)} className="px-3 py-2 hover:bg-slate-200 text-slate-600 font-bold">+</button>
                              </div>
                              <button onClick={() => handleRemoveFromCart(item.product.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-800 shadow-inner text-white">
                        <span className="font-bold text-slate-400">TOTAL ESTIMADO:</span>
                        <span className="font-black text-2xl text-green-400">{formatCurrency(cart.reduce((acc, item) => acc + ((item.product.price || 0) * item.quantity), 0))}</span>
                      </div>
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Nome do Cliente Final*</label>
                        <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ex: Maria Silva" className="w-full border-2 border-slate-200 rounded-xl p-4 text-base focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all" />
                      </div>
                      <button onClick={generateWhatsAppMessage} disabled={!customerName} className={`w-full py-5 rounded-xl font-black text-white flex items-center justify-center gap-2 shadow-xl transition-all ${!customerName ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-green-500 hover:bg-green-600 hover:scale-[1.02] active:scale-95'}`}>
                        <MessageCircle size={24} /> ENVIAR PEDIDO E FINALIZAR
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </main>

        {/* Menu Inferior (Mobile Only) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <button onClick={() => setUserView('dashboard')} className={`flex flex-col items-center gap-1 ${userView === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}><Layers size={20} /><span className="text-[10px] font-bold">Início</span></button>
          <button onClick={() => setUserView('stock')} className={`flex flex-col items-center gap-1 ${userView === 'stock' ? 'text-blue-600' : 'text-slate-400'}`}><Package size={20} /><span className="text-[10px] font-bold">Fazer Pedido</span></button>
          <button onClick={() => setUserView('orders')} className={`flex flex-col items-center gap-1 ${userView === 'orders' ? 'text-blue-600' : 'text-slate-400'}`}><ClipboardList size={20} /><span className="text-[10px] font-bold">Meus Pedidos</span></button>
        </nav>
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
            <button onClick={handleLogout} className="text-xs bg-slate-800 border border-slate-700 p-2 md:px-3 md:py-2 rounded-lg flex items-center gap-1 hover:bg-slate-700"><LogOut size={16} /> <span className="hidden md:inline">Sair</span></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6 relative">
        {adminView === 'menu' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <button onClick={() => setAdminView('stock')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center"><Package size={24} className="text-blue-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Estoque</h3></div></button>
            <button onClick={() => { setAdminView('purchases'); setPurchaseStep('select'); }} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center"><Truck size={24} className="text-orange-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Compras</h3></div></button>
            <button onClick={() => { setShowQuickEntry(true); setShowCamera(false); setScannedItems([]); }} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center"><Zap size={24} className="text-yellow-400 fill-yellow-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Entrada Rápida</h3></div></button>
            <button onClick={() => setAdminView('add')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"><Plus size={24} className="text-green-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Novo Produto</h3></div></button>
            <button onClick={() => setAdminView('history')} className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg"><div className="w-12 h-12 md:w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center"><ClipboardList size={24} className="text-purple-400" /></div><div className="text-center"><h3 className="font-bold text-white text-sm md:text-xl">Relatório</h3></div></button>
          </div>
        )}

        {adminView === 'purchases' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
               <div className="flex items-center gap-2"><Truck className="text-orange-400" /><h2 className="text-lg font-bold text-white">Pedidos de Compra</h2></div>
               <button onClick={() => { setAdminView('create_purchase'); setPurchaseStep('select'); }} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={16}/> Criar Pedido</button>
            </div>
            <div className="p-4 space-y-3">
               {purchases.length === 0 ? <p className="text-slate-500 text-center py-8">Nenhum pedido encontrado.</p> : purchases.map(order => (
                 <div key={order.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                       <div><div className="text-white font-bold text-lg">{order.supplier}</div><div className="text-xs text-slate-500 font-mono">ID: {order.orderCode} • {formatDate(order.createdAt)}</div></div>
                       {order.status === 'pending' ? (<span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded border border-yellow-500/30 uppercase font-bold">Pendente</span>) : (<span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded border border-green-500/30 uppercase font-bold">Recebido</span>)}
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-sm text-slate-400">{order.totalItems} itens: {order.items.map(i => `${i.name} (${i.quantity})`).join(', ').substring(0, 50)}...</div>
                    {order.status === 'pending' && (<div className="flex gap-3"><div className="flex-1 bg-slate-800 rounded flex items-center justify-center gap-2 text-slate-400 text-xs py-2 border border-slate-700"><ScanBarcode size={14}/> Bipe: <span className="font-mono font-bold text-white">{order.orderCode}</span></div><button onClick={() => handleReceiveOrder(order)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Check size={16}/> Receber Manualmente</button></div>)}
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* --- CRIADOR DE PEDIDO DE COMPRA --- */}
        {adminView === 'create_purchase' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[85vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center shrink-0">
               <h2 className="text-lg font-bold text-white flex items-center gap-2"><Plus className="text-green-400" /> Novo Pedido</h2>
               <button onClick={() => { setAdminView('purchases'); setPurchaseStep('select'); }} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X size={20}/></button>
            </div>

            {purchaseStep === 'select' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-3 border-b border-slate-800 shrink-0">
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar produto..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                   {filteredProducts.map(p => {
                     const inCart = purchaseCart.find(item => item.product.id === p.id);
                     return (
                      <div key={p.id} className="flex items-center justify-between bg-slate-950 p-3 rounded border border-slate-800">
                         <div className="min-w-0 flex-1 mr-2">
                            <div className="text-slate-200 font-bold text-sm truncate">{p.name}</div>
                            <div className="text-xs text-slate-500 flex gap-2"><span>{p.color}</span><span className="bg-slate-800 px-1 rounded">{p.size}</span></div>
                         </div>
                         {inCart ? (
                           <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 shrink-0">
                              <button onClick={() => handleUpdatePurchaseCartQty(p.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white"><Minus size={14}/></button>
                              <span className="w-8 text-center font-bold text-white text-sm">{inCart.quantity}</span>
                              <button onClick={() => handleUpdatePurchaseCartQty(p.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white"><Plus size={14}/></button>
                           </div>
                         ) : (
                           <button onClick={() => handleAddToPurchaseCart(p)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg flex items-center gap-1 shrink-0"><Plus size={16}/> <span className="text-xs font-bold uppercase">Add</span></button>
                         )}
                      </div>
                     );
                   })}
                </div>

                {purchaseCart.length > 0 && (
                  <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
                    <button onClick={() => setPurchaseStep('review')} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-2"><ShoppingBag size={20} />{purchaseCart.reduce((a,b)=>a+b.quantity,0)} Itens Selecionados - Avançar</button>
                  </div>
                )}
              </div>
            )}

            {purchaseStep === 'review' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900 shrink-0">
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fornecedor</label>
                   <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Nome do Fornecedor..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-white focus:border-orange-500 outline-none" autoFocus />
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900">
                   <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-400">ITENS DO PEDIDO</span><button onClick={() => setPurchaseStep('select')} className="text-xs text-blue-400 hover:underline">Editar lista</button></div>
                   {purchaseCart.map(item => (
                      <div key={item.product.id} className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
                         <div className="text-sm text-slate-300"><span className="font-bold text-white">{item.quantity}x</span> {item.product.name} <span className="text-slate-500 text-xs">({item.product.size})</span></div>
                         <button onClick={() => handleRemoveFromPurchaseCart(item.product.id)} className="text-red-500 p-2"><Trash2 size={14}/></button>
                      </div>
                   ))}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 flex gap-3">
                   <button onClick={() => setPurchaseStep('select')} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-lg font-bold">Voltar</button>
                   <button onClick={handleCreatePurchaseOrder} className="flex-[2] bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><FileText size={18}/> GERAR PEDIDO</button>
                </div>
              </div>
            )}
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
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 md:w-16 h-16 shrink-0 bg-slate-100 rounded-md border overflow-hidden flex items-center justify-center">
                        {group.info.image ? <img src={group.info.image} className="w-full h-full object-cover" /> : <ImageIcon className="p-2 text-slate-300"/>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">{name}</div>
                        <div className="text-sm font-bold text-slate-700 mt-0.5">{group.info.sku ? group.info.sku.split('-')[0] : '---'}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{group.items.length} variações</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openGroupEdit(name, group); }} 
                        className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 rounded-lg transition-colors shadow-sm"
                        title="Editar Modelo"
                      >
                        <Pencil size={16} />
                      </button>

                      <div className="text-right bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        <div className="text-xl font-bold text-slate-800">{group.total}</div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold">Total</div>
                      </div>
                      {expandedGroups[name] ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </div>
                  </div>

                  {expandedGroups[name] && (
                    <div className="bg-slate-50 border-t border-slate-100 p-2 space-y-2 animate-in slide-in-from-top-2">
                      {group.items.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded">{p.size}</span><span className="text-xs text-slate-600 uppercase font-bold">{p.color}</span></div><div className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><ScanBarcode size={10} /> {p.barcode || '---'}</div></div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden h-8"><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, p.quantity - 1); }} className="w-8 h-full hover:bg-slate-200 text-slate-600 font-bold">-</button><div className="w-10 text-center font-bold text-slate-800 text-sm">{p.quantity}</div><button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(p, p.quantity + 1); }} className="w-8 h-full hover:bg-slate-200 text-slate-600 font-bold">+</button></div>
                            <button onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-500 bg-white border border-slate-200 rounded-lg" title="Editar variação"><Pencil size={14} /></button>
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
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Package size={16} className="text-blue-400" /> 1. Produto Pai</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-400 block mb-1">Nome*</label><input value={baseName} onChange={e => setBaseName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div>
                <div><label className="text-sm text-slate-400 block mb-1">SKU Base*</label><input value={baseSku} onChange={e => setBaseSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                <div><label className="text-sm text-slate-400 block mb-1">Preço (R$)*</label><input value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="Ex: 59,90" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div>
                <div><label className="text-sm text-slate-400 block mb-1">Foto (URL Google Drive)</label><input value={baseImage} onChange={e => setBaseImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-xs" /></div>
              </div></div>
              <div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Layers size={16} className="text-blue-400" /> 2. Grade</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-sm text-slate-400 block mb-2">Cores (Enter)</label><div className="flex gap-2 mb-2"><input value={tempColor} onChange={e => setTempColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{colors.map(c => <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button></span>)}</div></div><div><label className="text-sm text-slate-400 block mb-2">Tamanhos (Enter)</label><div className="flex gap-2 mb-2"><input value={tempSize} onChange={e => setTempSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{sizes.map(s => <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button></span>)}</div></div></div></div>
              {generatedRows.length > 0 && (<div className="bg-slate-950/50 p-4 md:p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Variações ({generatedRows.length})</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU</th><th className="p-2">Barcode</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></td></tr>))}</tbody></table></div></div>)}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-lg px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} {isSavingBatch ? 'SALVANDO...' : 'GERAR'}</button></div>
            </div>
          </div>
        )}

        {/* --- MODAL DE EDIÇÃO EM LOTE --- */}
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

        {/* --- MODAL DE EDIÇÃO INDIVIDUAL --- */}
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