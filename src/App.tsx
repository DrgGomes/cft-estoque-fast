import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  Bell,
  Package,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Plus,
  Smartphone,
  LogOut,
  Zap,
  Save,
  ScanBarcode,
  Image as ImageIcon,
  Search,
  Tag
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

// --- NOVO TIPO DE DADO (MAIS COMPLETO) ---
type Product = {
  id: string;
  sku: string;          // Código interno (Ex: 6204-PRETO-40)
  barcode: string;      // Código de barras para bipar
  image: string;        // URL da foto
  name: string;         // Nome (Sapato Social Trones)
  color: string;        // Variante Cor
  size: string;         // Variante Tamanho
  quantity: number;
  updatedAt?: any;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filtro de Busca (Funciona com Leitor de Código de Barras)
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) ||
        p.sku.toLowerCase().includes(lowerTerm) ||
        p.barcode.includes(lowerTerm) // Aqui o leitor de código de barras vai achar
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // --- Funções de Admin ---
  const handleAddProduct = async (formData: any) => {
    try {
      await addDoc(collection(db, PRODUCTS_COLLECTION), {
        ...formData,
        quantity: 0,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Erro ao adicionar:", e);
    }
  };

  const handleUpdateQuantity = async (id: string, newQty: number) => {
    if (newQty < 0) return;
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(productRef, {
      quantity: newQty,
      updatedAt: serverTimestamp(),
    });
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
          {/* Barra de Busca Cliente */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Buscar por modelo, cor ou tamanho..."
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
                {/* Foto do Produto */}
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
                    <div className="text-xs text-slate-500 mt-1 font-mono">SKU: {product.sku}</div>
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
                      <span className="text-[9px] font-bold text-green-600 uppercase">Disponível</span>
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
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-lg border border-slate-700"><Package className="w-6 h-6 text-blue-400" /></div>
            <div><h1 className="font-bold text-white">Painel ERP</h1></div>
          </div>
          <button onClick={() => setSelectedRole(null)} className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1"><LogOut size={14} /> Sair</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Formulário de Cadastro Avançado */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
          <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Plus size={16} /> Cadastrar Variação (SKU Único)
          </h2>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              handleAddProduct({
                sku: form.sku.value,
                barcode: form.barcode.value,
                image: form.image.value,
                name: form.name.value,
                color: form.color.value,
                size: form.size.value,
              });
              // Limpa apenas campos variáveis, mantem nome e foto pra agilizar
              form.sku.value = '';
              form.barcode.value = '';
              form.size.value = '';
              form.sku.focus(); // Volta o foco para SKU/Barcode
            }}
            className="grid grid-cols-1 md:grid-cols-6 gap-4"
          >
            {/* Linha 1: Identificação Visual */}
            <div className="md:col-span-4">
              <label className="text-xs text-slate-500 font-bold mb-1 block">NOME DO PRODUTO (PAI)</label>
              <input name="name" placeholder="Ex: Sapato Social Trones" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 font-bold mb-1 block flex items-center gap-1"><ImageIcon size={12}/> LINK DA FOTO (URL)</label>
              <input name="image" placeholder="https://..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>

            {/* Linha 2: Variação Específica */}
            <div className="md:col-span-2">
               <label className="text-xs text-slate-500 font-bold mb-1 block text-blue-400">COR</label>
               <input name="color" placeholder="Ex: Preto" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="md:col-span-1">
               <label className="text-xs text-slate-500 font-bold mb-1 block text-blue-400">TAM.</label>
               <input name="size" placeholder="40" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            
            {/* Linha 3: Identificação de Sistema */}
            <div className="md:col-span-1">
               <label className="text-xs text-slate-500 font-bold mb-1 block">SKU</label>
               <input name="sku" placeholder="6204-PR-40" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2">
               <label className="text-xs text-slate-500 font-bold mb-1 block flex items-center gap-1"><ScanBarcode size={12}/> CÓDIGO BARRAS</label>
               <div className="flex gap-2">
                 <input name="barcode" placeholder="Bipe aqui..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                 <button type="submit" className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 flex items-center justify-center font-bold uppercase text-xs tracking-wider">
                   <Plus size={16} className="mr-1"/> Criar
                 </button>
               </div>
            </div>
          </form>
        </div>

        {/* Barra de Busca e Ação Rápida (Leitor) */}
        <div className="bg-slate-800 p-4 rounded-xl flex items-center gap-3 border border-blue-900/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10"><ScanBarcode size={100} /></div>
          <div className="flex-1 relative z-10">
            <label className="text-xs text-blue-300 font-bold mb-1 block flex items-center gap-2">
              <ScanBarcode size={14}/> BIPAR ENTRADA/SAÍDA (BUSCA RÁPIDA)
            </label>
            <input 
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Clique aqui e bipe o código de barras..." 
              className="w-full bg-slate-950 border-2 border-blue-600/50 rounded-lg px-4 py-3 text-lg text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none placeholder:text-slate-600" 
            />
          </div>
        </div>

        {/* Lista de Estoque */}
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
                    <span className="font-mono bg-slate-100 px-1 rounded">SKU: {product.sku}</span>
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
      </main>
    </div>
  );
}

export default App;