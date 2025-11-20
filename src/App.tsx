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
  Search,
  X
} from 'lucide-react';

// --- Configuração Firebase (A SUA CONFIGURAÇÃO) ---
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
const appId = "estoque-loja"; // Nome da coleção no banco

// Coleção pública
const PRODUCTS_COLLECTION = `artifacts/${appId}/public/data/products`;

// Tipos
type Product = {
  id: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  updatedAt?: any;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  // Autenticação Anônima
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch((error) =>
          console.error("Erro no login anônimo:", error)
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // Escutar Produtos em Tempo Real
  useEffect(() => {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Funções de Admin ---
  const handleAddProduct = async (name: string, color: string, size: string) => {
    if (!name || !color || !size) return;
    try {
      await addDoc(collection(db, PRODUCTS_COLLECTION), {
        name,
        color,
        size,
        quantity: 0, // Começa zerado ou mude para 10
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

  // --- TELA DE LOGIN (AQUI ESTÁ A SENHA) ---
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin-slow" />
            </div>
            <h1 className="text-2xl font-bold text-white">CFT DROP - Estoque</h1>
            <p className="text-slate-400 text-sm mt-2">Selecione seu acesso</p>
          </div>

          <div className="space-y-4">
            {/* BOTÃO DE ADM COM SENHA */}
            <button
              onClick={() => {
                const senha = prompt("Digite a senha de ADM:");
                if (senha === "1234") { // --- SUA SENHA AQUI ---
                  setSelectedRole('admin');
                } else {
                  alert("Senha incorreta!");
                }
              }}
              className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-3 border border-slate-700 group"
            >
              <Package className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Sou Fornecedor (Painel)</span>
            </button>

            {/* BOTÃO DE REVENDEDOR DIRETO */}
            <button
              onClick={() => setSelectedRole('user')}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-3 group"
            >
              <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Sou Revendedor (Alertas)</span>
            </button>
          </div>

          <p className="text-center text-slate-500 text-xs mt-8">
            Acesso seguro e monitorado.
          </p>
        </div>
      </div>
    );
  }

  // --- TELA DO REVENDEDOR (CLIENTE) ---
  if (selectedRole === 'user') {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Cabeçalho Azul */}
        <header className="bg-blue-600 text-white p-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Central de Alertas</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-xs text-blue-100 font-medium">Online • Tempo Real</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSelectedRole(null)}
              className="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto p-4 space-y-4">
          {/* Aviso de Alerta */}
          <div className="bg-blue-500 text-white p-4 rounded-xl shadow-md flex items-start gap-3">
             <Zap className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" />
             <div>
               <h3 className="font-bold text-sm">Modo Alerta Ativo</h3>
               <p className="text-xs text-blue-100 mt-1">
                 Não feche esta aba. O sistema atualizará automaticamente quando o estoque mudar.
               </p>
             </div>
          </div>

          <div className="flex justify-between items-center mt-6 mb-2 px-1">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-400" />
              Estoque
            </h2>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-medium">
              {products.length} itens cadastrados
            </span>
          </div>

          {/* Lista de Produtos */}
          <div className="space-y-3 pb-20">
            {loading ? (
               <p className="text-center text-slate-400 py-10">Carregando estoque...</p>
            ) : products.length === 0 ? (
               <p className="text-center text-slate-400 py-10">Nenhum produto cadastrado.</p>
            ) : (
              products.map((product) => (
                <div 
                  key={product.id} 
                  className={`bg-white p-4 rounded-xl border-2 shadow-sm transition-all ${
                    product.quantity === 0 ? 'border-red-100 bg-red-50' : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{product.name}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase">
                          ● {product.color}
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {product.size}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {product.quantity > 0 ? (
                        <>
                          <span className="block text-2xl font-bold text-green-600">{product.quantity}</span>
                          <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Disponível</span>
                        </>
                      ) : (
                        <div className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <AlertTriangle size={14} />
                          <span className="font-bold text-xs uppercase">Esgotado</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- TELA DO ADMIN (FORNECEDOR) ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header Admin */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight">Painel Administrativo</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-xs text-slate-400">Online • Tempo Real</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setSelectedRole(null)}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Formulário de Cadastro */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg">
          <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Plus size={16} /> Cadastrar Novo Produto
          </h2>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              handleAddProduct(
                form.prodName.value,
                form.prodColor.value,
                form.prodSize.value
              );
              form.reset();
            }}
            className="grid grid-cols-4 gap-3"
          >
            <div className="col-span-4 md:col-span-2">
              <label className="text-xs text-slate-500 font-bold mb-1 block">PRODUTO</label>
              <input 
                name="prodName" 
                placeholder="Ex: Camiseta DryFit" 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-slate-500 font-bold mb-1 block">COR</label>
              <input 
                name="prodColor" 
                placeholder="Preto" 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-slate-500 font-bold mb-1 block">TAM.</label>
              <div className="flex gap-2">
                <input 
                  name="prodSize" 
                  placeholder="G" 
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 flex items-center justify-center transition-colors"
                >
                  <Save size={18} />
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-between items-center px-1">
           <h2 className="font-bold text-white flex items-center gap-2">
             <Package className="w-5 h-5 text-slate-500" />
             Estoque
           </h2>
           <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">
             {products.length} itens cadastrados
           </span>
        </div>

        {/* Lista Admin */}
        <div className="space-y-3 pb-20">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="bg-white p-4 rounded-xl flex items-center justify-between shadow-sm group"
            >
              <div>
                <div className="font-bold text-slate-900">{product.name}</div>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                    {product.color}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {product.size}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                  <button 
                    onClick={() => handleUpdateQuantity(product.id, product.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-600 font-bold transition-colors"
                  >
                    -
                  </button>
                  <div className="w-10 text-center font-bold text-slate-800 text-lg">
                    {product.quantity}
                  </div>
                  <button 
                    onClick={() => handleUpdateQuantity(product.id, product.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-600 font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => handleUpdateQuantity(product.id, 0)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-lg border border-red-100 transition-colors flex items-center gap-1"
                >
                  <AlertTriangle size={14} /> ZERAR
                </button>

                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir produto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;