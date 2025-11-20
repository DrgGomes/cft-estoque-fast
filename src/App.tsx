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
  signInWithCustomToken,
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
} from 'lucide-react';

// --- Configuração Firebase ---
const firebaseConfig = {
  apiKey: 'AIzaSyDG8hpJggHKpWBLaILx2WJrD-Jw7XcKvRg',
  authDomain: 'cft-drop---estoque-flash.firebaseapp.com',
  projectId: 'cft-drop---estoque-flash',
  storageBucket: 'cft-drop---estoque-flash.firebasestorage.app',
  messagingSenderId: '513670906518',
  appId: '1:513670906518:web:eec3f177a4779f3ddf78b7',
};


// --- INICIALIZAÇÃO (Cole isso logo abaixo da configuração) ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "estoque-loja";

// Coleção pública para que todos os revendedores vejam os mesmos dados em tempo real
const PRODUCTS_COLLECTION = `artifacts/${appId}/public/data/products`;

// --- Componentes UI ---

const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const Badge = ({ children, type = 'neutral' }) => {
  const colors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    danger: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
    neutral: 'bg-slate-100 text-slate-800 border-slate-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  return (
    <span
      className={`px-2 py-1 rounded-md text-xs font-bold border ${
        colors[type] || colors.neutral
      }`}
    >
      {children}
    </span>
  );
};

// --- Lógica Principal ---

export default function App() {
  const [user, setUser] = useState(null);
  // Tenta recuperar o papel salvo no navegador (localStorage) ao iniciar
  const [role, setRole] = useState(
    () => localStorage.getItem('stock_app_role') || null
  );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  // Estado para formulário de novo produto
  const [newProdName, setNewProdName] = useState('');
  const [newProdColor, setNewProdColor] = useState('');
  const [newProdSize, setNewProdSize] = useState('');
  const [newProdQty, setNewProdQty] = useState(10);

  // Referência para comparar estado anterior e detectar mudanças para zero
  const prevProductsRef = useRef({});

  // 1. Autenticação Anônima (Login Invisível)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Erro na autenticação:', error);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // 2. Solicitar Permissão de Notificação do Browser
  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      // Silencioso se não suportar
    } else if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  // 3. Função para Selecionar Papel e Salvar na Memória
  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    localStorage.setItem('stock_app_role', selectedRole);
    if (selectedRole === 'reseller') {
      requestNotificationPermission();
    }
  };

  // 4. Função de Logout (Limpa memória)
  const handleLogout = () => {
    setRole(null);
    localStorage.removeItem('stock_app_role');
    setAlerts([]);
  };

  // 5. Disparar Notificação Real
  const sendSystemNotification = (productName, detail) => {
    if (Notification.permission === 'granted') {
      // Tenta enviar notificação persistente
      try {
        new Notification('🚨 ESTOQUE ZERADO!', {
          body: `${productName} (${detail}) acabou de esgotar! Pause seus anúncios agora.`,
          icon: 'https://cdn-icons-png.flaticon.com/512/564/564619.png',
          tag: productName, // Evita spam da mesma notificação
        });
      } catch (e) {
        console.log('Erro notificação', e);
      }
    }
  };

  // 6. Listener do Firestore em Tempo Real
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, PRODUCTS_COLLECTION));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const currentProducts = [];
        const currentMap = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const item = { id: doc.id, ...data };
          currentProducts.push(item);
          currentMap[doc.id] = item.quantity;

          // LÓGICA DE DETECÇÃO DE QUEDA PARA ZERO (Somente para Revendedores)
          if (role === 'reseller') {
            const prevQty = prevProductsRef.current[doc.id];

            // Se existia uma quantidade anterior conhecida (> 0) e agora é 0
            // Verifica se prevQty !== undefined para evitar alerta ao carregar a página pela primeira vez
            if (prevQty !== undefined && prevQty > 0 && item.quantity === 0) {
              const alertMsg = {
                id: Date.now(),
                title: `ESGOTOU: ${item.name}`,
                subtitle: `${item.color} - Tam: ${item.size}`,
                time: new Date().toLocaleTimeString(),
              };

              // Adiciona ao log visual
              setAlerts((prev) => [alertMsg, ...prev]);

              // Toca som de alerta
              try {
                const audio = new Audio(
                  'https://actions.google.com/sounds/v1/alarms/beep_short.ogg'
                );
                audio
                  .play()
                  .catch((e) => console.log('Interação necessária para audio'));
              } catch (e) {
                console.log('Audio play failed', e);
              }

              // Notificação do Sistema
              sendSystemNotification(item.name, `${item.color} / ${item.size}`);
            }
          }
        });

        // Ordenar: Esgotados primeiro, depois por nome
        currentProducts.sort((a, b) => {
          if (a.quantity === 0 && b.quantity !== 0) return -1;
          if (a.quantity !== 0 && b.quantity === 0) return 1;
          return a.name.localeCompare(b.name);
        });

        setProducts(currentProducts);
        prevProductsRef.current = currentMap;
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar produtos:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  // --- Ações do Fornecedor ---

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProdName) return;
    await addDoc(collection(db, PRODUCTS_COLLECTION), {
      name: newProdName,
      color: newProdColor || 'Única',
      size: newProdSize || 'U',
      quantity: parseInt(newProdQty),
      updatedAt: serverTimestamp(),
    });
    setNewProdName('');
    setNewProdColor('');
    setNewProdSize('');
  };

  const handleUpdateStock = async (id, newQty) => {
    const qty = parseInt(newQty);
    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
      quantity: qty < 0 ? 0 : qty,
      updatedAt: serverTimestamp(),
    });
  };

  const handleDelete = async (id) => {
    if (confirm('Remover este produto do catálogo?')) {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
    }
  };

  // --- Renderização ---

  if (!user)
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400 animate-pulse">
        Conectando ao servidor...
      </div>
    );

  // Tela de Seleção de Perfil (Aparece apenas se não tiver papel salvo)
  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-black flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 p-4 rounded-full shadow-inner">
              <RefreshCw className="w-10 h-10 text-slate-800" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Controle de Estoque
          </h1>
          <p className="text-slate-500 mb-8">
            Configure este dispositivo para iniciar.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleRoleSelect('admin')}
              className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
            >
              <Package
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
              Sou Fornecedor (Painel)
            </button>
            <button
              onClick={() => {
                const senha = prompt("Digite a senha de administrador:");
                if (senha === "1234") { // 446000
                  setSelectedRole('admin');
                } else {
                  alert("Senha incorreta! Acesso negado.");
                }
              }}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 group"
            >
              <Smartphone
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
              Sou Revendedor (Alertas)
            </button>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Seu acesso será salvo neste navegador.
          </p>
        </div>
      </div>
    );
  }

  // Layout Principal
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 ${
          role === 'admin' ? 'bg-slate-900' : 'bg-blue-600'
        } text-white shadow-lg transition-colors duration-300`}
      >
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-full">
              {role === 'admin' ? (
                <Package className="text-slate-200" />
              ) : (
                <Bell className="text-yellow-300 animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                {role === 'admin'
                  ? 'Painel Administrativo'
                  : 'Central de Alertas'}
              </h1>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    loading ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                ></div>
                <p className="text-xs opacity-80">
                  {loading ? 'Sincronizando...' : 'Online • Tempo Real'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
            title="Sair e trocar de perfil"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* ÁREA DO REVENDEDOR: Alertas Recentes */}
        {role === 'reseller' && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-4 shadow-lg text-white flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Zap className="fill-yellow-300 text-yellow-300" size={20} />{' '}
                  Modo Alerta Ativo
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Não feche esta aba. O sistema avisará quando acabar estoque.
                </p>
              </div>
            </div>

            {alerts.length > 0 && (
              <div className="animate-in slide-in-from-top-4 duration-500 space-y-2">
                <div className="flex justify-between items-end px-1">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Histórico de Alertas
                  </h3>
                  <button
                    onClick={() => setAlerts([])}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Limpar histórico
                  </button>
                </div>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex justify-between items-center animate-bounce-short"
                  >
                    <div>
                      <h4 className="font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle size={16} /> {alert.title}
                      </h4>
                      <p className="text-slate-600 text-sm mt-1">
                        {alert.subtitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-mono text-slate-400">
                        {alert.time}
                      </span>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">
                        Esgotado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ÁREA DO FORNECEDOR: Adicionar Produto */}
        {role === 'admin' && (
          <Card className="p-5 border-slate-300 bg-slate-50">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-green-600" /> Cadastrar Novo
              Produto
            </h3>
            <form
              onSubmit={handleAddProduct}
              className="grid grid-cols-2 gap-3 md:grid-cols-12 items-end"
            >
              <div className="col-span-2 md:col-span-5">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                  Produto
                </label>
                <input
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 outline-none"
                  placeholder="Ex: Camiseta DryFit"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                  Cor
                </label>
                <input
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  placeholder="Preto"
                  value={newProdColor}
                  onChange={(e) => setNewProdColor(e.target.value)}
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                  Tam.
                </label>
                <input
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  placeholder="G"
                  value={newProdSize}
                  onChange={(e) => setNewProdSize(e.target.value)}
                />
              </div>
              <div className="col-span-2 md:col-span-3">
                <button
                  type="submit"
                  className="w-full p-2.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Salvar
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* LISTA DE PRODUTOS (Visível para Ambos) */}
        <div>
          <div className="flex justify-between items-end mb-4 px-1">
            <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2">
              <Package className="text-slate-400" size={20} />
              Estoque
            </h3>
            <span className="text-sm font-medium text-slate-500 bg-white px-2 py-1 rounded border">
              {products.length} itens cadastrados
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-slate-200 rounded-xl animate-pulse"
                  ></div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">
                  Seu estoque está vazio.
                </p>
                {role === 'admin' && (
                  <p className="text-slate-400 text-sm">
                    Use o formulário acima para começar.
                  </p>
                )}
              </div>
            ) : (
              products.map((product) => (
                <Card
                  key={product.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 transition-all duration-300 ${
                    product.quantity === 0
                      ? 'bg-red-50 border-red-200 ring-1 ring-red-200'
                      : 'hover:border-blue-300'
                  }`}
                >
                  {/* Informações do Produto */}
                  <div className="flex-1 mb-4 sm:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={`font-bold text-lg ${
                          product.quantity === 0
                            ? 'text-red-700 line-through decoration-red-300'
                            : 'text-slate-800'
                        }`}
                      >
                        {product.name}
                      </h4>
                      {product.quantity === 0 && (
                        <Badge type="danger">ESGOTADO</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        <div
                          className="w-3 h-3 rounded-full border border-slate-300"
                          style={{
                            backgroundColor:
                              product.color === 'Branco'
                                ? '#fff'
                                : product.color === 'Preto'
                                ? '#000'
                                : 'gray',
                          }}
                        ></div>
                        {product.color}
                      </span>
                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono">
                        {product.size}
                      </span>
                    </div>
                  </div>

                  {/* Controles */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    {role === 'admin' ? (
                      // Controles do Fornecedor
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-sm">
                          <button
                            onClick={() =>
                              handleUpdateStock(
                                product.id,
                                product.quantity - 1
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 font-bold transition-colors"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) =>
                              handleUpdateStock(product.id, e.target.value)
                            }
                            className={`w-14 text-center font-mono text-lg font-bold bg-transparent outline-none ${
                              product.quantity === 0
                                ? 'text-red-600'
                                : 'text-slate-800'
                            }`}
                          />

                          <button
                            onClick={() =>
                              handleUpdateStock(
                                product.id,
                                product.quantity + 1
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {/* BOTÃO DE PÂNICO: ZERAR IMEDIATAMENTE */}
                        <button
                          onClick={() => handleUpdateStock(product.id, 0)}
                          className="h-10 px-4 bg-red-100 hover:bg-red-600 hover:text-white text-red-700 font-bold rounded-lg border border-red-200 flex items-center gap-2 transition-all shadow-sm"
                          title="Zerar estoque imediatamente"
                        >
                          <AlertTriangle size={16} />{' '}
                          <span className="hidden sm:inline">ZERAR</span>
                        </button>

                        <div className="w-px h-8 bg-slate-200 mx-1"></div>

                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                          title="Excluir produto"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ) : (
                      // Visão do Revendedor
                      <div className="text-right flex items-center gap-3">
                        <div className="text-right">
                          <span
                            className={`text-3xl font-bold font-mono tracking-tight ${
                              product.quantity > 5
                                ? 'text-green-600'
                                : product.quantity > 0
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {product.quantity}
                          </span>
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Disponível
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
