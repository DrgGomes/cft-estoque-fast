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
  writeBatch
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
  StopCircle
} from 'lucide-react';
import { Html5QrcodeScanner } from "html5-qrcode";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDG8hpJggHKpWBLaILx2WJrD-Jw7XcKvRg",
  authDomain: "cft-drop---estoque-flash.firebaseapp.com",
  projectId: "cft-drop---estoque-flash",
  storageBucket: "cft-drop---estoque-flash.firebasestorage.app",
  messagingSenderId: "513670906518",
  appId: "1:513670906518:web:eec3f177a4779f3ddf78b7"
};

// --- Inicialização ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "estoque-loja";

const PRODUCTS_COLLECTION = `artifacts/${appId}/public/data/products`;

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

type VariationRow = {
  color: string;
  size: string;
  sku: string;
  barcode: string;
};

type ScannedItem = {
  product: Product;
  count: number;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminView, setAdminView] = useState<'list' | 'add'>('list');
  
  // Estados do Gerador de Grade
  const [baseSku, setBaseSku] = useState('');
  const [baseName, setBaseName] = useState('');
  const [baseImage, setBaseImage] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [tempColor, setTempColor] = useState('');
  const [tempSize, setTempSize] = useState('');
  const [generatedRows, setGeneratedRows] = useState<VariationRow[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Estados de Edição
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // --- ESTADOS DA ENTRADA RÁPIDA & CÂMERA ---
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanError, setScanError] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);

  // Autenticação e Busca
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth).catch((e) => console.error(e));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
      setFilteredProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  // --- LÓGICA DA CÂMERA (AJUSTADA PARA TRASEIRA) ---
  useEffect(() => {
    if (showCamera && showQuickEntry) {
      setTimeout(() => {
        // Configurações para forçar câmera traseira
        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            // AQUI ESTÁ O SEGREDO: facingMode environment = Traseira
            videoConstraints: {
              facingMode: "environment"
            }
          },
          false
        );

        scanner.render((decodedText) => {
          handleProcessCode(decodedText);
        }, (error) => {
          // Ignora erros de frame vazio
        });

        scannerRef.current = scanner;
      }, 100);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e: any) => console.error(e));
        scannerRef.current = null;
      }
    }
  }, [showCamera, showQuickEntry]);

  const handleProcessCode = (code: string) => {
    setScanError('');
    const term = code.trim().toLowerCase();
    if (!term) return;

    const found = products.find(p => 
      (p.sku && p.sku.toLowerCase() === term) || 
      (p.barcode && p.barcode.toLowerCase() === term)
    );

    if (found) {
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
      setScanError(`Produto não cadastrado: ${code}`);
    }
  };

  // --- LÓGICA DA GRADE ---
  useEffect(() => {
    const newRows: VariationRow[] = [];
    colors.forEach(color => {
      sizes.forEach(size => {
        const cleanSku = baseSku.toUpperCase().replace(/\s+/g, '');
        const cleanColor = color.toUpperCase();
        const cleanSize = size.toUpperCase().replace(/\s+/g, '');
        const autoSku = cleanSku && cleanColor && cleanSize ? `${cleanSku}-${cleanColor}-${cleanSize}` : '';
        const existingRow = generatedRows.find(r => r.color === color && r.size === size);
        newRows.push({ color, size, sku: autoSku, barcode: existingRow ? existingRow.barcode : '' });
      });
    });
    setGeneratedRows(newRows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setBaseSku(''); setBaseName(''); setBaseImage(''); setColors([]); setSizes([]); setAdminView('list');
      alert("Sucesso!");
    } catch (e) { console.error(e); alert("Erro."); } finally { setIsSavingBatch(false); }
  };

  const handleUpdateQuantity = async (id: string, newQty: number) => {
    if (newQty < 0) return;
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(productRef, { quantity: newQty, updatedAt: serverTimestamp() });
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

  // --- LÓGICA DA ENTRADA RÁPIDA ---
  const handleQuickScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessCode(quickScanInput);
  };

  const handleCommitQuickEntry = async () => {
    if (scannedItems.length === 0) return;
    setIsSavingBatch(true);
    try {
      const batch = writeBatch(db);
      scannedItems.forEach(item => {
        const docRef = doc(db, PRODUCTS_COLLECTION, item.product.id);
        const newTotal = item.product.quantity + item.count;
        batch.update(docRef, { quantity: newTotal, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      setScannedItems([]);
      setShowQuickEntry(false);
      alert("Entrada realizada!");
    } catch (e) { console.error(e); alert("Erro ao salvar."); } finally { setIsSavingBatch(false); }
  };

  // --- UI ---

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-700"><RefreshCw className="w-8 h-8 text-blue-500" /></div>
            <h1 className="text-2xl font-bold text-white">Sistema ERP Flash</h1>
            <p className="text-slate-400 text-sm mt-2">Controle de Estoque Avançado</p>
          </div>
          <div className="flex flex-col gap-4 w-full">
            <button onClick={() => { const s = prompt("Senha ADM:"); if (s === "1234") setSelectedRole('admin'); else alert("Erro!"); }} className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-3 border border-slate-700"><Package size={20} /> <span>Sou Fornecedor (Painel)</span></button>
            <button onClick={() => setSelectedRole('user')} className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-3"><Smartphone size={20} /> <span>Sou Revendedor (Alertas)</span></button>
          </div>
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
              <div className="bg-white/20 p-2 rounded-lg"><Bell className="w-6 h-6" /></div>
              <div><h1 className="font-bold text-lg">Estoque</h1><div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span><span className="text-xs text-blue-100 font-medium">Online</span></div></div>
            </div>
            <button onClick={() => setSelectedRole(null)} className="text-xs bg-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1"><LogOut size={14} /> Sair</button>
          </div>
        </header>
        <main className="max-w-md mx-auto p-4 space-y-4">
          <div className="relative"><Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="space-y-3 pb-20">
            {loading ? <p className="text-center text-slate-400">Carregando...</p> : filteredProducts.length === 0 ? <p className="text-center text-slate-400">Nada encontrado.</p> : filteredProducts.map((p) => (
              <div key={p.id} className={`bg-white p-3 rounded-xl border-2 shadow-sm flex gap-3 ${p.quantity === 0 ? 'border-red-100 bg-red-50' : 'border-transparent'}`}>
                <div className="w-20 h-20 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">{p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-8 h-8" />}</div>
                <div className="flex-1 flex flex-col justify-between"><div><h3 className="font-bold text-slate-800 text-sm leading-tight">{p.name}</h3><div className="text-xs text-slate-500 mt-1 font-mono">SKU: {p.sku || '-'}</div><div className="flex gap-1 mt-2 flex-wrap"><span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border uppercase">{p.color}</span><span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border">{p.size}</span></div></div></div>
                <div className="flex flex-col items-end justify-center min-w-[70px]">{p.quantity > 0 ? <><span className="text-2xl font-bold text-green-600">{p.quantity}</span><span className="text-[9px] font-bold text-green-600 uppercase">Disp.</span></> : <div className="bg-red-100 text-red-600 px-2 py-1 rounded text-center"><span className="font-bold text-[10px] uppercase block">Esgotado</span></div>}</div>
              </div>
            ))}
          </div>
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
            <div className="bg-slate-800 p-2 rounded-lg border border-slate-700"><Package className="w-6 h-6 text-blue-400" /></div>
            <div><h1 className="font-bold text-white">Painel ERP</h1></div>
          </div>
          <div className="flex items-center gap-3">
            {adminView === 'list' && (
              <>
                <button 
                  onClick={() => { setShowQuickEntry(true); setShowCamera(false); setTimeout(() => scanInputRef.current?.focus(), 100); }}
                  className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20 border border-blue-500/50"
                >
                  <Zap size={18} className="fill-white" /> ENTRADA RÁPIDA
                </button>
                <button 
                  onClick={() => setAdminView('add')}
                  className="text-sm bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                >
                  <Plus size={18} /> Novo Produto
                </button>
              </>
            )}
            <button onClick={() => setSelectedRole(null)} className="text-xs bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-700"><LogOut size={16} /> Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6 relative">
        {adminView === 'list' ? (
          <>
            <div className="bg-slate-800 p-4 rounded-xl flex items-center gap-3 border border-blue-900/30 relative overflow-hidden shadow-lg">
              <div className="absolute right-0 top-0 p-4 opacity-10"><ScanBarcode size={100} /></div>
              <div className="flex-1 relative z-10">
                <label className="text-xs text-blue-300 font-bold mb-1 block flex items-center gap-2"><ScanBarcode size={14}/> BUSCAR NA LISTA ABAIXO</label>
                <input autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtrar produtos..." className="w-full bg-slate-950 border-2 border-blue-600/50 rounded-lg px-4 py-3 text-lg text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none" />
              </div>
            </div>
            <div className="space-y-3 pb-20">
              {filteredProducts.map((p) => (
                <div key={p.id} className="bg-white p-2 rounded-xl flex items-center justify-between shadow-sm group border-l-4 border-slate-300 hover:border-blue-500 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded border overflow-hidden">{p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <ImageIcon className="p-2 text-slate-300"/>}</div>
                    <div><div className="font-bold text-slate-900 text-sm">{p.name}</div><div className="text-xs text-slate-500 flex gap-2 mt-0.5"><span className="font-mono bg-slate-100 px-1 rounded">SKU: {p.sku}</span>{p.barcode && <span className="font-mono bg-slate-100 px-1 rounded flex items-center gap-1"><ScanBarcode size={10}/> {p.barcode}</span>}</div><div className="flex gap-1 mt-1"><span className="text-[10px] font-bold text-white bg-slate-600 px-1.5 py-0.5 rounded">{p.color}</span><span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">{p.size}</span></div></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden h-10"><button onClick={() => handleUpdateQuantity(p.id, p.quantity - 1)} className="w-8 h-full hover:bg-slate-200 text-slate-600 font-bold">-</button><div className="w-12 text-center font-bold text-slate-800 text-lg">{p.quantity}</div><button onClick={() => handleUpdateQuantity(p.id, p.quantity + 1)} className="w-8 h-full hover:bg-slate-200 text-slate-600 font-bold">+</button></div>
                    <button onClick={() => setEditingProduct(p)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden relative">
            <button onClick={() => setAdminView('list')} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full hover:bg-slate-700"><X size={20} /></button>
            <div className="p-6 border-b border-slate-800 bg-slate-800/50"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers size={24} className="text-green-500" /> Gerador de Variações</h2><p className="text-slate-400 text-sm mt-1">Monte a grade completa.</p></div>
            <div className="p-6 space-y-8">
              <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Package size={16} className="text-blue-400" /> 1. Produto Pai</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-sm text-slate-400 block mb-1">Nome*</label><input value={baseName} onChange={e => setBaseName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /></div><div><label className="text-sm text-slate-400 block mb-1">SKU Base*</label><input value={baseSku} onChange={e => setBaseSku(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono" /></div><div className="md:col-span-2"><label className="text-sm text-slate-400 block mb-1">Foto (URL)</label><input value={baseImage} onChange={e => setBaseImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-xs" /></div></div></div>
              <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Layers size={16} className="text-blue-400" /> 2. Grade</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="text-sm text-slate-400 block mb-2">Cores (Enter)</label><div className="flex gap-2 mb-2"><input value={tempColor} onChange={e => setTempColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColor()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{colors.map(c => <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button></span>)}</div></div><div><label className="text-sm text-slate-400 block mb-2">Tamanhos (Enter)</label><div className="flex gap-2 mb-2"><input value={tempSize} onChange={e => setTempSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" /><button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{sizes.map(s => <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">{s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button></span>)}</div></div></div></div>
              {generatedRows.length > 0 && (<div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50"><h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Variações ({generatedRows.length})</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="p-2">Tam</th><th className="p-2">Cor</th><th className="p-2">SKU</th><th className="p-2">Barcode</th></tr></thead><tbody>{generatedRows.map((row, idx) => (<tr key={idx} className="border-b border-slate-800/50"><td className="p-2 text-sm text-white font-bold">{row.size}</td><td className="p-2 text-sm text-slate-300">{row.color}</td><td className="p-2"><input disabled value={row.sku} className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono" /></td><td className="p-2"><input value={row.barcode} onChange={(e) => updateRowBarcode(idx, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></td></tr>))}</tbody></table></div></div>)}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm"><button onClick={handleSaveBatch} disabled={isSavingBatch || generatedRows.length === 0} className={`rounded-lg px-8 py-4 flex items-center font-bold gap-2 shadow-lg ${isSavingBatch || generatedRows.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} {isSavingBatch ? 'SALVANDO...' : 'GERAR ESTOQUE EM MASSA'}</button></div>
            </div>
          </div>
        )}

        {/* --- POPUP DE ENTRADA RÁPIDA COM CAMERA TRASEIRA --- */}
        {showQuickEntry && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-blue-500/30 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="text-yellow-400 fill-yellow-400" /> Entrada Rápida</h2>
                <button onClick={() => { setShowQuickEntry(false); setScannedItems([]); setShowCamera(false); }} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700"><X size={24} /></button>
              </div>
              <div className="p-6 bg-slate-900/50 border-b border-slate-800">
                
                {/* AREA DA CAMERA */}
                {showCamera ? (
                  <div className="mb-4 rounded-xl overflow-hidden border-2 border-blue-500 relative bg-black">
                    <div id="reader" className="w-full h-64"></div>
                    <button onClick={() => setShowCamera(false)} className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg"><StopCircle size={14}/> PARAR CÂMERA</button>
                  </div>
                ) : (
                   <button onClick={() => setShowCamera(true)} className="w-full mb-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-blue-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"><Camera size={20} /> ABRIR CÂMERA DO CELULAR</button>
                )}

                <form onSubmit={handleQuickScanSubmit}>
                  <div className="relative">
                    <div className="absolute left-4 top-4 text-blue-400 animate-pulse"><ScanBarcode size={24} /></div>
                    <input ref={scanInputRef} value={quickScanInput} onChange={e => setQuickScanInput(e.target.value)} placeholder="Digite o SKU ou Bipe aqui..." className="w-full bg-slate-950 border-2 border-blue-500 rounded-xl pl-14 pr-4 py-4 text-xl text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 placeholder:text-slate-600 shadow-inner font-mono" autoFocus={!showCamera} />
                  </div>
                </form>
                {scanError && (<div className="mt-3 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2"><AlertCircle size={18} /> {scanError}</div>)}
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
                {scannedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50"><ScanBarcode size={64} className="mb-4" /><p className="text-lg font-medium">Lista vazia</p></div>
                ) : (
                  <div className="space-y-2">
                    {scannedItems.map((item, idx) => (
                      <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between animate-in slide-in-from-left">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-800 rounded border border-slate-700 overflow-hidden flex-shrink-0">{item.product.image ? <img src={item.product.image} className="w-full h-full object-cover" /> : <ImageIcon className="p-3 text-slate-500" />}</div>
                          <div><div className="font-bold text-white">{item.product.name}</div><div className="text-xs text-slate-400 font-mono">{item.product.sku}</div><div className="flex gap-2 mt-1"><span className="text-[10px] bg-slate-800 px-1.5 rounded border border-slate-700 text-slate-300">{item.product.color}</span><span className="text-[10px] bg-slate-800 px-1.5 rounded border border-slate-700 text-slate-300">{item.product.size}</span></div></div>
                        </div>
                        <div className="flex items-center gap-4"><div className="bg-green-600/20 text-green-400 font-bold text-xl px-4 py-2 rounded-lg border border-green-500/30">+{item.count}</div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                <div className="text-slate-400 text-sm"><span className="text-white font-bold">{scannedItems.reduce((acc, item) => acc + item.count, 0)}</span> itens na lista</div>
                <button onClick={handleCommitQuickEntry} disabled={scannedItems.length === 0 || isSavingBatch} className={`px-8 py-4 rounded-xl font-bold flex items-center gap-2 text-lg transition-all ${scannedItems.length === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20 hover:scale-105'}`}>{isSavingBatch ? <RefreshCw className="animate-spin" /> : <Check size={24} />}{isSavingBatch ? '...' : 'CONFIRMAR'}</button>
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
                <div className="grid grid-cols-2 gap-4">
                   <input value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono" placeholder="SKU" />
                   <input value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono" placeholder="Barcode" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <input value={editingProduct.color} onChange={e => setEditingProduct({...editingProduct, color: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" placeholder="Cor" />
                   <input value={editingProduct.size} onChange={e => setEditingProduct({...editingProduct, size: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" placeholder="Tam" />
                </div>
                <input value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs" placeholder="URL Imagem" />
                <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-slate-800 text-white py-3 rounded-lg">Cancelar</button>
                   <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg">Salvar</button>
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