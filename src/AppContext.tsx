import React, { createContext, useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, addDoc, deleteDoc, setDoc, getDoc, serverTimestamp, query, onSnapshot, writeBatch, where, getDocs, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db, TENANTS_COLLECTION } from './firebase';
import { Tenant, Product, VariationRow, HistoryItem, PurchaseOrder, Notice, QuickLink, Showcase, UserProfile, SupportTicket, AcademyLesson, OrderItem, FinancialRecord } from './types';
import * as XLSX from 'xlsx';

const SOUNDS = { success: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3", magic: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3" };
export const playSound = (type: 'success' | 'error' | 'magic') => { try { const audio = new Audio(SOUNDS[type]); audio.volume = 0.5; audio.play().catch(e => console.log(e)); } catch (e) {} };
export const formatCurrency = (value: any) => { const num = Number(value); return isNaN(num) ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num); };
export const getYoutubeId = (url: string) => { const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/); return match ? match[1] : null; };
export const formatDate = (timestamp: any) => { if (timestamp?.toMillis) return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp.toMillis()); return '...'; };
export const sortByDateDesc = (a: any, b: any, fieldName: string) => (b[fieldName]?.toMillis?.() || 0) - (a[fieldName]?.toMillis?.() || 0);
export const parseImages = (rawInput: string) => (rawInput || '').split(/[\n, ]+/).filter(u => u.trim().startsWith('http')).join(',');

export const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [globalLoading, setGlobalLoading] = useState(true);
  const urlParams = new URLSearchParams(window.location.search);
  const previewTenantId = urlParams.get('preview'); const vitrineLinkId = urlParams.get('vitrine'); const isVitrineMode = !!vitrineLinkId; const currentDomain = window.location.hostname;
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  useEffect(() => { localStorage.setItem('theme', theme); if (theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null); const [isSuperAdminMode, setIsSuperAdminMode] = useState(false); const [saasTenants, setSaasTenants] = useState<Tenant[]>([]);
  const getCol = (name: string) => `saas_tenants/${currentTenant?.id}/${name}`;

  const [user, setUser] = useState<any>(null); const [userProfile, setUserProfile] = useState<UserProfile | null>(null); const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]); const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]); const [financeRecords, setFinanceRecords] = useState<FinancialRecord[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null); const [loading, setLoading] = useState(true); const [searchTerm, setSearchTerm] = useState('');
  const [adminView, setAdminView] = useState<'menu'|'orders'|'scanner_order'|'finance'|'stock'|'add'>('menu');
  const [userView, setUserView] = useState<'dashboard'|'catalog'|'orders'>('dashboard');
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Core Data Fetching
  useEffect(() => { const fetchTenant = async () => { if (previewTenantId) { const docRef = doc(db, TENANTS_COLLECTION, previewTenantId); const docSnap = await getDoc(docRef); if (docSnap.exists()) { setCurrentTenant({ id: docSnap.id, ...docSnap.data() } as Tenant); setIsSuperAdminMode(false); } else setIsSuperAdminMode(true); setGlobalLoading(false); return; } const q = query(collection(db, TENANTS_COLLECTION), where("domain", "==", currentDomain)); const querySnapshot = await getDocs(q); if (!querySnapshot.empty) { setCurrentTenant({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Tenant); setIsSuperAdminMode(false); } else setIsSuperAdminMode(true); setGlobalLoading(false); }; fetchTenant(); }, [currentDomain, previewTenantId]);
  useEffect(() => { if (!currentTenant) return; const unsubProducts = onSnapshot(collection(db, getCol('products')), (snap) => { const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)); items.sort((a, b) => sortByDateDesc(a, b, 'updatedAt')); setProducts(items); setFilteredProducts(items); setLoading(false); }); return () => unsubProducts(); }, [currentTenant]);
  useEffect(() => { if (user && selectedRole === 'user' && currentTenant) { const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => { if (docSnap.exists()) setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile); }); const unsubPurch = onSnapshot(query(collection(db, getCol('purchases')), where('userId', '==', user.uid)), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as PurchaseOrder)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setPurchases(items); }); return () => { unsubProfile(); unsubPurch(); }; } }, [user, selectedRole, currentTenant]);
  useEffect(() => { if (selectedRole === 'admin' && currentTenant) { const unsubPurch = onSnapshot(collection(db, getCol('purchases')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as PurchaseOrder)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setPurchases(items); }); const unsubFin = onSnapshot(collection(db, getCol('finance')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as FinancialRecord)); items.sort((a, b) => sortByDateDesc(a, b, 'date')); setFinanceRecords(items); }); return () => { unsubPurch(); unsubFin(); }; } }, [selectedRole, currentTenant]);
  useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u)); return () => unsubscribe(); }, []);
  useEffect(() => { if (searchTerm.trim() === '') setFilteredProducts(products); else { const lowerTerm = searchTerm.toLowerCase(); setFilteredProducts(products.filter(p => String(p.name||'').toLowerCase().includes(lowerTerm) || String(p.sku||'').toLowerCase().includes(lowerTerm))); } }, [searchTerm, products]);

  const groupProducts = (items: Product[]) => { const groups: Record<string, { info: Product, total: number, items: Product[] }> = {}; items.forEach(product => { const key = String(product.name || 'Sem Nome'); if (!groups[key]) groups[key] = { info: product, total: 0, items: [] }; groups[key].items.push(product); groups[key].total += Number(product.quantity || 0); }); return groups; };
  const groupedProducts = groupProducts(filteredProducts);

  // Cart & Order Logic
  const addToCart = (product: Product, quantity: number) => {
    if (quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      return [...prev, { productId: product.id, name: product.name, sku: product.sku||'', barcode: product.barcode||'', color: product.color||'', size: product.size, price: product.price, quantity, image: product.image?.split(',')[0]||'', scannedQty: 0 }];
    });
    playSound('magic');
  };
  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.productId !== productId));

  const checkoutOrder = async (labelsBase64: string[]) => {
    if (!user || cart.length === 0 || !currentTenant) return;
    setIsSavingBatch(true);
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    try {
      const orderRef = await addDoc(collection(db, getCol('purchases')), { tenantId: currentTenant.id, userId: user.uid, userName: userProfile?.name || 'Cliente', items: cart, totalValue: total, status: 'novo', paymentStatus: 'pendente', labels: labelsBase64, createdAt: serverTimestamp() });
      await addDoc(collection(db, getCol('finance')), { tenantId: currentTenant.id, type: 'in', description: `Pedido #${orderRef.id.slice(-6).toUpperCase()}`, value: total, status: 'pendente', orderId: orderRef.id, date: serverTimestamp() });
      setCart([]); alert("Pedido realizado com sucesso!"); playSound('success'); setUserView('orders');
    } catch (e) { console.error(e); alert("Erro ao finalizar pedido."); } finally { setIsSavingBatch(false); }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => { try { await updateDoc(doc(db, getCol('purchases'), orderId), { status: newStatus, updatedAt: serverTimestamp() }); playSound('success'); } catch (e) { console.error(e); } };
  const updateOrderPayment = async (orderId: string, newStatus: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, getCol('purchases'), orderId), { paymentStatus: newStatus, updatedAt: serverTimestamp() });
      const finRec = financeRecords.find(f => f.orderId === orderId);
      if (finRec) batch.update(doc(db, getCol('finance'), finRec.id), { status: newStatus });
      await batch.commit(); playSound('success');
    } catch (e) { console.error(e); }
  };

  // Auth
  const handleAuth = async (e: any, email: string, pass: string, isReg: boolean, name: string) => { e.preventDefault(); try { if (isReg) { const userCred = await createUserWithEmailAndPassword(auth, email, pass); await setDoc(doc(db, 'users', userCred.user.uid), { name, email, role: 'revendedor', creditBalance: 0, tenantId: currentTenant?.id, createdAt: serverTimestamp() }); setSelectedRole('user'); } else { await signInWithEmailAndPassword(auth, email, pass); setSelectedRole('user'); } playSound('success'); } catch (err) { alert('Erro no login.'); playSound('error'); } };
  const handleLogout = async () => { await signOut(auth); setSelectedRole(null); setUserView('dashboard'); setAdminView('menu'); setUserProfile(null); };

  const contextValue = {
    currentTenant, isSuperAdminMode, selectedRole, setSelectedRole, user, userProfile,
    brandColor: currentTenant?.primaryColor || '#2563eb', brandName: currentTenant?.name || 'DropFast', brandLogo: currentTenant?.logoUrl || null,
    loading, adminView, setAdminView, userView, setUserView, searchTerm, setSearchTerm, isSavingBatch, setIsSavingBatch,
    products, filteredProducts, groupedProducts, purchases, financeRecords, cart, setCart, addToCart, removeFromCart, checkoutOrder, updateOrderStatus, updateOrderPayment,
    handleLogout, handleAuth, theme, toggleTheme
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};