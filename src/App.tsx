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
  ArrowRight
} from 'lucide-react';

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

// Tipo de dado
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

// Tipo para a tabela de geração
type VariationRow = {
  color: string;
  size: string;
  sku: string;
  barcode: string;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminView, setAdminView] = useState<'list' | 'add'>('list');
  
  // Estados para o Gerador de Grade
  const [baseSku, setBaseSku] = useState('');
  const [baseName, setBaseName] = useState('');
  const [baseImage, setBaseImage] = useState('');
  
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [tempColor, setTempColor] = useState('');
  const [tempSize, setTempSize] = useState('');
  
  const [generatedRows, setGeneratedRows] = useState<VariationRow[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth).catch((e) => console.error(e));
    });
    return () => unsubscribe();
  }, []);

  // Buscar Produtos
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

  // Filtro de Busca
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

  // --- LÓGICA DE GERAÇÃO DE GRADE ---
  
  // Atualiza a tabela sempre que Cores, Tamanhos ou SKU Base mudarem
  useEffect(() => {
    const newRows: VariationRow[] = [];
    
    colors.forEach(color => {
      sizes.forEach(size => {
        // Gera o SKU Automaticamente: PAI - COR - TAMANHO
        // Ex: 6204-PRETO-37/38
        const cleanSku = baseSku.toUpperCase().replace(/\s+/g, '');
        const cleanColor = color.toUpperCase();
        const cleanSize = size.toUpperCase().replace(/\s+/g, '');
        
        const autoSku = cleanSku && cleanColor && cleanSize 
          ? `${cleanSku}-${cleanColor}-${cleanSize}` 
          : '';

        // Tenta manter o código de barras se já existia nessa combinação, senão vazio
        const existingRow = generatedRows.find(r => r.color === color && r.size === size);

        newRows.push({
          color,
          size,
          sku: autoSku,
          barcode: existingRow ? existingRow.barcode : ''
        });
      });
    });

    setGeneratedRows(newRows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, sizes, baseSku]);

  const addColor = () => {
    if (tempColor && !colors.includes(tempColor)) {
      setColors([...colors, tempColor]);
      setTempColor('');
    }
  };

  const addSize = () => {
    if (tempSize && !sizes.includes(tempSize)) {
      setSizes([...sizes, tempSize]);
      setTempSize('');
    }
  };

  const removeColor = (c: string) => setColors(colors.filter(item => item !== c));
  const removeSize = (s: string) => setSizes(sizes.filter(item => item !== s));

  const updateRowBarcode = (index: number, val: string) => {
    const updated = [...generatedRows];
    updated[index].barcode = val;
    setGeneratedRows(updated);
  };

  // --- SALVAR TUDO (BATCH WRITE) ---
  const handleSaveBatch = async () => {
    if (!baseName || !baseSku || generatedRows.length === 0) {
      alert("Preencha o nome, SKU base e adicione variações.");
      return;
    }

    setIsSavingBatch(true);
    try {
      const batch = writeBatch(db);
      
      generatedRows.forEach(row => {
        const docRef = doc(collection(db, PRODUCTS_COLLECTION)); // Cria ID novo
        batch.set(docRef, {
          name: baseName,
          image: baseImage,
          sku: row.sku,
          barcode: row.barcode,
          color: row.color,
          size: row.size,
          quantity: 0, // Começa zerado
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      
      // Limpa tudo após salvar
      setBaseSku('');
      setBaseName('');
      setBaseImage('');
      setColors([]);
      setSizes([]);
      setAdminView('list');
      alert(`${generatedRows.length} produtos gerados com sucesso!`);

    } catch (e) {
      console.error(e);
      alert("Erro ao salvar em massa.");
    } finally {
      setIsSavingBatch(false);
    }
  };


  const handleUpdateQuantity = async (id: string, newQty: number) => {
    if (newQty < 0) return;
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(productRef, { quantity: newQty, updatedAt: serverTimestamp() });
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
    }
  };

  // --- TELA DE LOGIN ---
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-700">
              <RefreshCw className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Sistema ERP Flash</h1>
            <p className="text-slate-400 text-sm mt-2">Controle de Estoque Avançado</p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={() => {
                const senha = prompt("Digite a senha de ADM:");
                if (senha === "1234") setSelectedRole('admin');
                else alert("Senha incorreta!");
              }}
              className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-3 border border-slate-700"
            >
              <Package size={20} /> <span>Sou Fornecedor (Painel)</span>
            </button>

            <button
              onClick={() => setSelectedRole('user')}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-3"
            >
              <Smartphone size={20} /> <span>Sou Revendedor (Alertas)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA DO CLIENTE (REVENDEDOR) ---
  if (selectedRole === 'user') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-blue-600 text-white p-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><Bell className="w-6 h-6" /></div>
              <div>
                <h1 className="font-bold text-lg">Estoque Disponível</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-xs text-blue-100 font-medium">Atualizado Agora</span>
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedRole(null)} className="text-xs bg-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1"><LogOut size={14} /> Sair</button>
          </div>
        </header>

        <main className="max-w-md mx-auto p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3 pb-20">
            {loading ? <p className="text-center text-slate-400">Carregando...</p> : 
             filteredProducts.length === 0 ? <p className="text-center text-slate-400">Nenhum produto encontrado.</p> :
             filteredProducts.map((product) => (
              <div key={product.id} className={`bg-white p-3 rounded-xl border-2 shadow-sm flex gap-3 ${product.quantity === 0 ? 'border-red-100 bg-red-50' : 'border-transparent'}`}>
                <div className="w-20 h-20 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-slate-300 w-8 h-8" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{product.name}</h3>
                    <div className="text-xs text-slate-500 mt-1 font-mono">SKU: {product.sku || '---'}</div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border uppercase">{product.color}</span>
                      <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border">{product.size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center min-w-[70px]">
                  {product.quantity > 0 ? (
                    <>
                      <span className="text-2xl font-bold text-green-600">{product.quantity}</span>
                      <span className="text-[9px] font-bold text-green-600 uppercase">Disp.</span>
                    </>
                  ) : (
                    <div className="bg-red-100 text-red-600 px-2 py-1 rounded text-center">
                      <span className="font-bold text-[10px] uppercase block">Esgotado</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // --- TELA DO ADMIN (FORNECEDOR) ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-lg border border-slate-700"><Package className="w-6 h-6 text-blue-400" /></div>
            <div><h1 className="font-bold text-white">Painel ERP</h1></div>
          </div>
          
          <div className="flex items-center gap-3">
            {adminView === 'list' && (
              <button 
                onClick={() => setAdminView('add')}
                className="text-sm bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-green-900/20"
              >
                <Plus size={18} /> Novo Produto
              </button>
            )}
            <button onClick={() => setSelectedRole(null)} className="text-xs bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        
        {adminView === 'list' ? (
          // === VISÃO DA LISTA DE PRODUTOS ===
          <>
            <div className="bg-slate-800 p-4 rounded-xl flex items-center gap-3 border border-blue-900/30 relative overflow-hidden shadow-lg">
              <div className="absolute right-0 top-0 p-4 opacity-10"><ScanBarcode size={100} /></div>
              <div className="flex-1 relative z-10">
                <label className="text-xs text-blue-300 font-bold mb-1 block flex items-center gap-2">
                  <ScanBarcode size={14}/> BIPAR ENTRADA/SAÍDA
                </label>
                <input 
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Clique aqui e bipe..." 
                  className="w-full bg-slate-950 border-2 border-blue-600/50 rounded-lg px-4 py-3 text-lg text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none placeholder:text-slate-600 transition-all" 
                />
              </div>
            </div>

            <div className="space-y-3 pb-20">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white p-2 rounded-xl flex items-center justify-between shadow-sm group border-l-4 border-slate-300 hover:border-blue-500 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded border overflow-hidden">
                      {product.image ? <img src={product.image} className="w-full h-full object-cover"/> : <ImageIcon className="p-2 text-slate-300"/>}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                      <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                        <span className="font-mono bg-slate-100 px-1 rounded">SKU: {product.sku || '-'}</span>
                        {product.barcode && <span className="font-mono bg-slate-100 px-1 rounded flex items-center gap-1"><ScanBarcode size={10}/> {product.barcode}</span>}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <span className="text-[10px] font-bold text-white bg-slate-600 px-1.5 py-0.5 rounded">{product.color}</span>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">{product.size}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden h-10">
                      <button onClick={() => handleUpdateQuantity(product.id, product.quantity - 1)} className="w-8 h-full hover:bg-slate-200 text-slate-600 font-bold">-</button>
                      <div className="w-12 text-center font-bold text-slate-800 text-lg">{product.quantity}</div>
                      <button onClick={() => handleUpdateQuantity(product.id, product.quantity + 1)} className="w-8 h-full hover:bg-slate-200 text-slate-600 font-bold">+</button>
                    </div>
                    <button onClick={() => handleDeleteProduct(product.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>

        ) : (

          // === NOVA TELA DE GERAÇÃO DE GRADE (MUITO MAIS RÁPIDA) ===
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden relative">
            <button 
              onClick={() => setAdminView('list')}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full hover:bg-slate-700"
            >
              <X size={20} />
            </button>

            <div className="p-6 border-b border-slate-800 bg-slate-800/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers size={24} className="text-green-500" /> Gerador de Variações
              </h2>
              <p className="text-slate-400 text-sm mt-1">Monte a grade completa e gere todos os SKUs de uma vez.</p>
            </div>
            
            <div className="p-6 space-y-8">
              
              {/* PASSO 1: INFORMAÇÕES BASE */}
              <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800/50">
                <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Package size={16} className="text-blue-400" /> 1. Informações do Produto Pai
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Nome do Produto*</label>
                    <input value={baseName} onChange={e => setBaseName(e.target.value)} placeholder="Ex: Sapato Social Trones" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">SKU Base / Referência*</label>
                    <input value={baseSku} onChange={e => setBaseSku(e.target.value)} placeholder="Ex: 6204" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none font-mono" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-400 block mb-1">Link da Foto</label>
                    <input value={baseImage} onChange={e => setBaseImage(e.target.value)} placeholder="https://..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none text-xs" />
                  </div>
                </div>
              </div>

              {/* PASSO 2: DEFINIR CORES E TAMANHOS */}
              <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800/50">
                <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Layers size={16} className="text-blue-400" /> 2. Definir Grade
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CORES */}
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">Adicionar Cores (Digite e aperte Enter)</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        value={tempColor}
                        onChange={e => setTempColor(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addColor()}
                        placeholder="Ex: Preto" 
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-green-500 outline-none"
                      />
                      <button onClick={addColor} className="bg-slate-800 px-3 rounded text-slate-300 hover:bg-slate-700"><Plus size={16}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(c => (
                        <span key={c} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">
                          {c} <button onClick={() => removeColor(c)}><X size={12} className="text-red-400"/></button>
                        </span>
                      ))}
                      {colors.length === 0 && <span className="text-xs text-slate-600 italic">Nenhuma cor adicionada</span>}
                    </div>
                  </div>

                  {/* TAMANHOS */}
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">Adicionar Tamanhos (Digite e aperte Enter)</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        value={tempSize}
                        onChange={e => setTempSize(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addSize()}
                        placeholder="Ex: 37/38" 
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-green-500 outline-none"
                      />
                      <button onClick={addSize} className="bg-slate-800 px-3 rounded text-slate-300 hover:bg-slate-700"><Plus size={16}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map(s => (
                        <span key={s} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-700">
                          {s} <button onClick={() => removeSize(s)}><X size={12} className="text-red-400"/></button>
                        </span>
                      ))}
                       {sizes.length === 0 && <span className="text-xs text-slate-600 italic">Nenhum tamanho adicionado</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* PASSO 3: TABELA AUTOMÁTICA */}
              {generatedRows.length > 0 && (
                <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800/50 border-l-4 border-l-green-500/50 animate-in slide-in-from-bottom-4 fade-in duration-500">
                  <h3 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Check size={16} className="text-green-400" /> 3. Variações Geradas ({generatedRows.length})
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">SKU Preenchido em Massa</span>
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-xs text-slate-500 border-b border-slate-800">
                          <th className="p-2">Tamanho</th>
                          <th className="p-2">Cor</th>
                          <th className="p-2 w-1/3">SKU (Automático)</th>
                          <th className="p-2 w-1/3">Código de Barras (Opcional)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                            <td className="p-2 text-sm text-white font-bold">{row.size}</td>
                            <td className="p-2 text-sm text-slate-300">{row.color}</td>
                            <td className="p-2">
                              <input 
                                disabled
                                value={row.sku} 
                                className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-green-400 font-mono cursor-not-allowed" 
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                value={row.barcode}
                                onChange={(e) => updateRowBarcode(idx, e.target.value)}
                                placeholder="EAN..."
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none" 
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botão Salvar Batch */}
              <div className="flex justify-end pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 p-4 backdrop-blur-sm">
                <button 
                  onClick={handleSaveBatch}
                  disabled={isSavingBatch || generatedRows.length === 0}
                  className={`rounded-lg px-8 py-4 flex items-center font-bold gap-2 transition-all shadow-lg ${
                    isSavingBatch || generatedRows.length === 0 
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-500 text-white hover:shadow-green-500/20 hover:scale-[1.02]'
                  }`}
                >
                  {isSavingBatch ? <RefreshCw className="animate-spin" /> : <Save size={20} />} 
                  {isSavingBatch ? 'SALVANDO...' : 'GERAR ESTOQUE EM MASSA'}
                </button>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;