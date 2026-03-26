import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, doc, updateDoc, addDoc, deleteDoc, setDoc, getDoc, serverTimestamp, query, onSnapshot, writeBatch, where, getDocs, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

// IMPORTANDO NOSSA NOVA ESTRUTURA
import { auth, db, TENANTS_COLLECTION } from './firebase';
import { Tenant, Product, VariationRow, HistoryItem, PurchaseOrder, Notice, QuickLink, Showcase, UserProfile, SupportTicket, AcademyLesson } from './types';

// IMPORTANDO AS TELAS (PÁGINAS)
import Login from './pages/Login';
import SuperAdmin from './pages/SuperAdmin';
import Revendedor from './pages/Revendedor';
import Fornecedor from './pages/Fornecedor';

// --- SONS GERAIS ---
const SOUNDS = {
  success: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  error: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
  magic: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"
};
const playSound = (type: 'success' | 'error' | 'magic') => { try { const audio = new Audio(SOUNDS[type]); audio.volume = 0.5; audio.play().catch(e => console.log("Audio", e)); } catch (e) {} };
const sortByDateDesc = (a: any, b: any, fieldName: string) => { const tA = a[fieldName]?.toMillis ? a[fieldName].toMillis() : 0; const tB = b[fieldName]?.toMillis ? b[fieldName].toMillis() : 0; return tB - tA; };
const parseImages = (rawInput: string) => { if (!rawInput) return ''; return rawInput.split(/[\n, ]+/).filter(u => u.trim().startsWith('http')).join(','); };

export default function App() {
  const [globalLoading, setGlobalLoading] = useState(true);
  const urlParams = new URLSearchParams(window.location.search);
  const previewTenantId = urlParams.get('preview'); 
  const vitrineLinkId = urlParams.get('vitrine');
  const isVitrineMode = !!vitrineLinkId;
  const currentDomain = window.location.hostname;
  
  // ESTADOS GERAIS
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [superAdminAuthenticated, setSuperAdminAuthenticated] = useState(false);
  const [saasTenants, setSaasTenants] = useState<Tenant[]>([]);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const getCol = (name: string) => `saas_tenants/${currentTenant?.id}/${name}`;

  // LISTAS DE DADOS DO BANCO
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [publicVitrine, setPublicVitrine] = useState<Showcase | null>(null);

  // CONTROLES DE INTERFACE
  const [adminView, setAdminView] = useState<'menu'|'stock'|'add'|'history'|'purchases'|'notices'|'links'|'showcases'|'customers'|'tickets'|'predictive'|'academy'>('menu');
  const [userView, setUserView] = useState<'dashboard'|'catalog'|'support'|'academy'|'integrations'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  // COMPARTILHAMENTO DE ESTADOS (PROPS PARA AS TELAS)
  const [authName, setAuthName] = useState(''); const [authEmail, setAuthEmail] = useState(''); const [authPassword, setAuthPassword] = useState(''); const [isRegistering, setIsRegistering] = useState(false); const [authError, setAuthError] = useState('');
  const [newTenantName, setNewTenantName] = useState(''); const [newTenantDomain, setNewTenantDomain] = useState(''); const [newTenantLogo, setNewTenantLogo] = useState(''); const [newTenantColor, setNewTenantColor] = useState('#2563eb');
  
  // ESTADOS DO FORNECEDOR (PRODUTOS)
  const [baseSku, setBaseSku] = useState(''); const [baseName, setBaseName] = useState(''); const [baseDescription, setBaseDescription] = useState(''); const [baseImage, setBaseImage] = useState(''); const [basePrice, setBasePrice] = useState('');
  const [colors, setColors] = useState<string[]>([]); const [sizes, setSizes] = useState<string[]>([]); const [tempColor, setTempColor] = useState(''); const [tempSize, setTempSize] = useState('');
  const [baseWeight, setBaseWeight] = useState('800'); const [baseLength, setBaseLength] = useState('33'); const [baseWidth, setBaseWidth] = useState('12'); const [baseHeight, setBaseHeight] = useState('19'); const [baseNcm, setBaseNcm] = useState(''); const [baseCest, setBaseCest] = useState(''); const [baseMaterial, setBaseMaterial] = useState(''); const [baseSole, setBaseSole] = useState(''); const [baseFastening, setBaseFastening] = useState('');
  const [generatedRows, setGeneratedRows] = useState<VariationRow[]>([]); const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [adminViewingGroupName, setAdminViewingGroupName] = useState<string | null>(null);
  const [adminStockFilter, setAdminStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // ESTADOS DO REVENDEDOR E OUTROS
  const [selectedCatalogGroups, setSelectedCatalogGroups] = useState<string[]>([]);
  const [viewingProduct, setViewingProduct] = useState<{name: string, group: any} | null>(null);
  const [activeModalImage, setActiveModalImage] = useState<string>('');
  const [isShopeeSimulating, setIsShopeeSimulating] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [activeLesson, setActiveLesson] = useState<AcademyLesson | null>(null);
  const [ticketType, setTicketType] = useState<'troca' | 'devolucao'>('troca'); const [ticketReturnGroup, setTicketReturnGroup] = useState(''); const [ticketReturnProductId, setTicketReturnProductId] = useState(''); const [ticketDesiredGroup, setTicketDesiredGroup] = useState(''); const [ticketDesiredProductId, setTicketDesiredProductId] = useState(''); const [ticketReason, setTicketReason] = useState('');
  
  // ESTADOS SECUNDÁRIOS DE ADMIN
  const [noticeType, setNoticeType] = useState<'text' | 'banner'>('text'); const [noticeTitle, setNoticeTitle] = useState(''); const [noticeContent, setNoticeContent] = useState(''); const [noticeImage, setNoticeImage] = useState('');
  const [linkTitle, setLinkTitle] = useState(''); const [linkSubtitle, setLinkSubtitle] = useState(''); const [linkUrl, setLinkUrl] = useState(''); const [linkIcon, setLinkIcon] = useState('Link2'); const [linkOrder, setLinkOrder] = useState('1');
  const [academySeasonMode, setAcademySeasonMode] = useState<'existing' | 'new'>('existing'); const [academySeason, setAcademySeason] = useState(''); const [academyNewSeason, setAcademyNewSeason] = useState(''); const [academyEpisode, setAcademyEpisode] = useState('1'); const [academyTitle, setAcademyTitle] = useState(''); const [academyDesc, setAcademyDesc] = useState(''); const [academyYoutube, setAcademyYoutube] = useState(''); const [academyBanner, setAcademyBanner] = useState(''); const [academyLinks, setAcademyLinks] = useState('');
  const [editingShowcase, setEditingShowcase] = useState<Partial<Showcase> | null>(null);

  // ==========================================
  // EFEITOS (BANCO DE DADOS)
  // ==========================================
  useEffect(() => {
    const fetchTenant = async () => {
      if (previewTenantId) {
        const docRef = doc(db, TENANTS_COLLECTION, previewTenantId); const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { setCurrentTenant({ id: docSnap.id, ...docSnap.data() } as Tenant); setIsSuperAdminMode(false); } else { setIsSuperAdminMode(true); }
        setGlobalLoading(false); return;
      }
      const q = query(collection(db, TENANTS_COLLECTION), where("domain", "==", currentDomain)); const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) { setCurrentTenant({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Tenant); setIsSuperAdminMode(false); } else { setIsSuperAdminMode(true); }
      setGlobalLoading(false);
    };
    fetchTenant();
  }, [currentDomain, previewTenantId]);

  useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); }); return () => unsubscribe(); }, []);

  useEffect(() => {
    if (!currentTenant) return;
    const unsubProducts = onSnapshot(collection(db, getCol('products')), (snap) => { const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)); items.sort((a, b) => sortByDateDesc(a, b, 'updatedAt')); setProducts(items); setFilteredProducts(items); setLoading(false); });
    if (!isVitrineMode) {
        const unsubNotices = onSnapshot(collection(db, getCol('notices')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as Notice)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setNotices(items); });
        const unsubLinks = onSnapshot(collection(db, getCol('quickLinks')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as QuickLink)); items.sort((a, b) => a.order - b.order); setQuickLinks(items); });
        const unsubShowcases = onSnapshot(collection(db, getCol('showcases')), (snap) => setShowcases(snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase))));
        const unsubAcademy = onSnapshot(collection(db, getCol('academy')), (snap) => setLessons(snap.docs.map(d => ({id: d.id, ...d.data()} as AcademyLesson))));
        return () => { unsubProducts(); unsubNotices(); unsubLinks(); unsubShowcases(); unsubAcademy(); };
    } else {
        const unsubShowcases = onSnapshot(collection(db, getCol('showcases')), (snap) => { const allVitrines = snap.docs.map(d => ({id: d.id, ...d.data()} as Showcase)); setPublicVitrine(allVitrines.find(v => v.linkId === vitrineLinkId) || null); });
        return () => { unsubProducts(); unsubShowcases(); };
    }
  }, [currentTenant, loading, isVitrineMode, vitrineLinkId]);

  useEffect(() => {
     if (user && selectedRole === 'user' && currentTenant) {
         const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => { if (docSnap.exists()) setUserProfile({ id: docSnap.id, completedLessons: [], shopeeConnected: false, ...docSnap.data() } as UserProfile); });
         const unsubMyTickets = onSnapshot(collection(db, getCol('tickets')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setMyTickets(items.filter(t => t.userId === user.uid)); });
         return () => { unsubProfile(); unsubMyTickets(); };
     }
  }, [user, selectedRole, currentTenant]);

  useEffect(() => {
    if (selectedRole === 'admin' && currentTenant) {
      const unsubHist = onSnapshot(collection(db, getCol('history')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as HistoryItem)); items.sort((a, b) => sortByDateDesc(a, b, 'timestamp')); setHistory(items.slice(0, 300)); });
      const unsubUsers = onSnapshot(query(collection(db, 'users'), where('tenantId', '==', currentTenant.id)), (snap) => { setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)).filter(u => u.role === 'revendedor')); });
      const unsubAllTickets = onSnapshot(collection(db, getCol('tickets')), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as SupportTicket)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setAllTickets(items); });
      return () => { unsubHist(); unsubUsers(); unsubAllTickets(); };
    }
  }, [selectedRole, currentTenant]);

  useEffect(() => {
    if (isSuperAdminMode) { const unsub = onSnapshot(collection(db, TENANTS_COLLECTION), (snap) => { const items = snap.docs.map(d => ({id: d.id, ...d.data()} as Tenant)); items.sort((a, b) => sortByDateDesc(a, b, 'createdAt')); setSaasTenants(items); }); return () => unsub(); } 
  }, [isSuperAdminMode]);

  useEffect(() => { if (searchTerm.trim() === '') { setFilteredProducts(products); } else { const lowerTerm = searchTerm.toLowerCase(); setFilteredProducts(products.filter(p => { const name = String(p.name || '').toLowerCase(); const sku = String(p.sku || '').toLowerCase(); return name.includes(lowerTerm) || sku.includes(lowerTerm); })); } }, [searchTerm, products]);
  useEffect(() => { const newRows: VariationRow[] = []; colors.forEach(color => { sizes.forEach(size => { const cleanSku = baseSku.toUpperCase().replace(/\s+/g, ''); const cleanColor = color.toUpperCase(); const cleanSize = size.toUpperCase().replace(/\s+/g, ''); const autoSku = cleanSku && cleanColor && cleanSize ? `${cleanSku}-${cleanColor}-${cleanSize}` : ''; const existingRow = generatedRows.find(r => r.color === color && r.size === size); newRows.push({ color, size, sku: autoSku, barcode: existingRow ? existingRow.barcode : '' }); });}); setGeneratedRows(newRows); }, [colors, sizes, baseSku]);

  // ==========================================
  // FUNÇÕES CORE E MEMOS COMPARTILHADOS
  // ==========================================
  const groupProducts = (items: Product[]) => { 
      const groups: Record<string, { info: Product, total: number, items: Product[] }> = {}; 
      if (!items || !Array.isArray(items)) return groups;
      items.forEach(product => { if (!product) return; const key = String(product.name || 'Sem Nome'); if (!groups[key]) groups[key] = { info: product, total: 0, items: [] }; groups[key].items.push(product); groups[key].total += Number(product.quantity || 0); }); 
      Object.values(groups).forEach(group => { group.items.sort((a, b) => { const colorA = String(a.color || '').toLowerCase(); const colorB = String(b.color || '').toLowerCase(); if (colorA !== colorB) return colorA.localeCompare(colorB); const numA = parseFloat(a.size); const numB = parseFloat(b.size); if (!isNaN(numA) && !isNaN(numB)) return numA - numB; return String(a.size || '').localeCompare(String(b.size || '')); }); }); 
      return groups; 
  };
  const groupedProducts = groupProducts(filteredProducts);
  const groupedAdminProducts = groupProducts(filteredProducts);

  const toggleGroupSelection = (groupName: string, isSelected: boolean) => { setSelectedCatalogGroups(prev => isSelected ? [...prev, groupName] : prev.filter(name => name !== groupName)); };
  
  // Todas as funções (handleAuth, handleCreateTenant, handleSaveBatch, handleExportToUpSeller, etc...)
  // Vamos encapsulá-las num pacote gigante de propriedades (Props) para injetar nas telas filhas:
  const sharedProps = {
      currentTenant, isSuperAdminMode, superAdminAuthenticated, setSuperAdminAuthenticated, saasTenants, selectedRole, setSelectedRole, user, userProfile,
      loading, adminView, setAdminView, userView, setUserView, searchTerm, setSearchTerm,
      authName, setAuthName, authEmail, setAuthEmail, authPassword, setAuthPassword, isRegistering, setIsRegistering, authError, setAuthError,
      brandColor: currentTenant?.primaryColor || '#2563eb', brandName: currentTenant?.name || 'DropFast', brandLogo: currentTenant?.logoUrl || null,
      previewTenantId, isVitrineMode, publicVitrine, groupedProducts, groupedAdminProducts,
      products, filteredProducts, history, purchases, notices, quickLinks, showcases, lessons, usersList, allTickets, myTickets,
      // Todos os hooks e estados de edição
      baseSku, setBaseSku, baseName, setBaseName, baseDescription, setBaseDescription, baseImage, setBaseImage, basePrice, setBasePrice, colors, setColors, sizes, setSizes, tempColor, setTempColor, tempSize, setTempSize, baseWeight, setBaseWeight, baseLength, setBaseLength, baseWidth, setBaseWidth, baseHeight, setBaseHeight, baseNcm, setBaseNcm, baseCest, setBaseCest, baseMaterial, setBaseMaterial, baseSole, setBaseSole, baseFastening, setBaseFastening, generatedRows, isSavingBatch, setIsSavingBatch, editingProduct, setEditingProduct, editingGroup, setEditingGroup, adminViewingGroupName, setAdminViewingGroupName, adminStockFilter, setAdminStockFilter, selectedCatalogGroups, setSelectedCatalogGroups, viewingProduct, setViewingProduct, activeModalImage, setActiveModalImage, isShopeeSimulating, setIsShopeeSimulating, selectedNotice, setSelectedNotice, activeLesson, setActiveLesson, ticketType, setTicketType, ticketReturnGroup, setTicketReturnGroup, ticketReturnProductId, setTicketReturnProductId, ticketDesiredGroup, setTicketDesiredGroup, ticketDesiredProductId, setTicketDesiredProductId, ticketReason, setTicketReason,
      noticeType, setNoticeType, noticeTitle, setNoticeTitle, noticeContent, setNoticeContent, noticeImage, setNoticeImage, linkTitle, setLinkTitle, linkSubtitle, setLinkSubtitle, linkUrl, setLinkUrl, linkIcon, setLinkIcon, linkOrder, setLinkOrder, academySeasonMode, setAcademySeasonMode, academySeason, setAcademySeason, academyNewSeason, setAcademyNewSeason, academyEpisode, setAcademyEpisode, academyTitle, setAcademyTitle, academyDesc, setAcademyDesc, academyYoutube, setAcademyYoutube, academyBanner, setAcademyBanner, academyLinks, setAcademyLinks, editingShowcase, setEditingShowcase,
      // Passando as funções essenciais para a árvore
      handleLogout: async () => { await signOut(auth); setSelectedRole(null); setUserView('dashboard'); setAdminView('menu'); setUserProfile(null); },
      handleAuth: async (e: React.FormEvent) => { e.preventDefault(); setAuthError(''); if(!currentTenant) return setAuthError('Domínio não cadastrado no sistema.'); try { if (isRegistering) { if(!authName) return setAuthError('Preencha seu nome.'); const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword); await setDoc(doc(db, 'users', userCredential.user.uid), { name: authName, email: authEmail, role: 'revendedor', creditBalance: 0, tenantId: currentTenant.id, shopeeConnected: false, createdAt: serverTimestamp() }); setSelectedRole('user'); playSound('success'); } else { await signInWithEmailAndPassword(auth, authEmail, authPassword); setSelectedRole('user'); playSound('success'); } } catch (err: any) { setAuthError('Erro: E-mail ou senha incorretos.'); playSound('error'); } },
      handleCreateTenant: async (e: React.FormEvent) => { e.preventDefault(); if (!newTenantName || !newTenantDomain) return; setIsSavingBatch(true); try { const cleanDomain = newTenantDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase(); await addDoc(collection(db, TENANTS_COLLECTION), { name: newTenantName, domain: cleanDomain, logoUrl: newTenantLogo, primaryColor: newTenantColor, createdAt: serverTimestamp() }); setNewTenantName(''); setNewTenantDomain(''); setNewTenantLogo(''); setNewTenantColor('#2563eb'); alert("Empresa criada!"); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } },
      handleSaveBatch: async () => { if (!baseName || !baseSku || generatedRows.length === 0) return; setIsSavingBatch(true); const priceNumber = parseFloat(basePrice.replace(',', '.').replace('R$', '').trim()) || 0; const cleanImages = parseImages(baseImage); const safeParentSku = baseSku.toUpperCase().replace(/\s+/g, ''); try { const batch = writeBatch(db); generatedRows.forEach(row => { const docRef = doc(collection(db, getCol('products'))); batch.set(docRef, { name: baseName, description: baseDescription, image: cleanImages, sku: row.sku, barcode: row.barcode, color: row.color, size: row.size, price: priceNumber, quantity: 0, weight: parseFloat(baseWeight) || 800, length: parseFloat(baseLength) || 33, width: parseFloat(baseWidth) || 12, height: parseFloat(baseHeight) || 19, ncm: baseNcm, cest: baseCest, material: baseMaterial, sole: baseSole, fastening: baseFastening, parentSku: safeParentSku, updatedAt: serverTimestamp() }); }); await batch.commit(); setBaseSku(''); setBaseName(''); setBaseDescription(''); setBaseImage(''); setBasePrice(''); setColors([]); setSizes([]); setAdminView('stock'); setBaseMaterial(''); setBaseSole(''); setBaseFastening(''); alert("Sucesso!"); } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } },
      handleExportToUpSeller: (groupName: string, groupData: any) => { 
          const headerRow = ["SPU*\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)", "SKU*\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)", "Título*\n(Obrigatório, 1-500 caracteres)", "Apelido do Produto\n(1-500 caracteres)", "Usar apelido como título da NFe", "Variantes1*\n(Obrigatório, 1-14 caracteres)", "Valor da Variante1*\n(Obrigatório, 1-30 caracteres)", "Variantes2\n(limite 1-14 caracteres)", "Valor da Variante2\n(limite 1-30 caracteres)", "Variantes3\n(limite 1-14 caracteres)", "Valor da Variante3\n(limite 1-30 caracteres)", "Variantes4\n(limite 1-14 caracteres)", "Valor da Variante4\n(limite 1-30 caracteres)", "Variantes5\n(limite 1-14 caracteres)", "Valor da Variante5\n(limite 1-30 caracteres)", "Preço de varejo\n(limite 0-999999999)", "Custo de Compra\n(limite 0-999999999)", "Quantidade\n(limite 0-999999999, Se não for preenchido, não será registrado na Lista de Estoque)", "N° do Estante\n(Apenas estantes existentes, serão filtrados se o estante selecionado estiver cheio ou ficará cheio após a importação)", "Código de Barras\n(Limite de 8 a 14 caracteres, separe vários códigos de barras com vírgulas)", "Apelido de SKU\n（Limite a letras, números e caracteres especiais; separe vários apelidos de SKU com vírgulas; máximo de 20 entradas）", "Imagem", "Peso (g)\n(limite 1-999999)", "Comprimento (cm)\n(limite 1-999999)", "Largura (cm)\n(limite 1-999999)", "Altura (cm)\n(limite 1-999999)", "NCM\n(limite 8 dígitos)", "CEST\n(limite 7 dígitos)", "Unidade\n(Selecionar UN/KG/Par)", "Origem\n(Selecionar 0/1/2/3/4/5/6/7/8)", "Link do Fornecedor", "Material", "Solado", "Tipo de Ajuste"];
          const rows = [headerRow];
          groupData.items.forEach((p: Product) => { const skuPai = p.parentSku || (p.sku ? p.sku.split('-').slice(0, -2).join('-') : 'SKU'); const safeTitulo = p.name || ''; const finalImages = p.image ? p.image.replace(/,/g, '|') : ''; rows.push([skuPai, p.sku || '', safeTitulo, '', 'N', 'Cor', p.color || '', 'Tamanho', p.size || '', '', '', '', '', '', '', 189.90, p.price || 0, 500, '', p.barcode || '', '', finalImages, p.weight || 800, p.length || 33, p.width || 12, p.height || 19, p.ncm || '', p.cest || '', 'UN', 0, '', p.material || '', p.sole || '', p.fastening || '']); });
          const worksheet = XLSX.utils.aoa_to_sheet(rows); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos"); XLSX.writeFile(workbook, `UpSeller_${groupName.replace(/\s+/g, '_')}.xlsx`); playSound('magic');
      },
      handleBatchExportToUpSeller: () => {
          if (selectedCatalogGroups.length === 0) return;
          const headerRow = ["SPU*\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)", "SKU*\n(Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais)", "Título*\n(Obrigatório, 1-500 caracteres)", "Apelido do Produto\n(1-500 caracteres)", "Usar apelido como título da NFe", "Variantes1*\n(Obrigatório, 1-14 caracteres)", "Valor da Variante1*\n(Obrigatório, 1-30 caracteres)", "Variantes2\n(limite 1-14 caracteres)", "Valor da Variante2\n(limite 1-30 caracteres)", "Variantes3\n(limite 1-14 caracteres)", "Valor da Variante3\n(limite 1-30 caracteres)", "Variantes4\n(limite 1-14 caracteres)", "Valor da Variante4\n(limite 1-30 caracteres)", "Variantes5\n(limite 1-14 caracteres)", "Valor da Variante5\n(limite 1-30 caracteres)", "Preço de varejo\n(limite 0-999999999)", "Custo de Compra\n(limite 0-999999999)", "Quantidade\n(limite 0-999999999, Se não for preenchido, não será registrado na Lista de Estoque)", "N° do Estante\n(Apenas estantes existentes, serão filtrados se o estante selecionado estiver cheio ou ficará cheio após a importação)", "Código de Barras\n(Limite de 8 a 14 caracteres, separe vários códigos de barras com vírgulas)", "Apelido de SKU\n（Limite a letras, números e caracteres especiais; separe vários apelidos de SKU com vírgulas; máximo de 20 entradas）", "Imagem", "Peso (g)\n(limite 1-999999)", "Comprimento (cm)\n(limite 1-999999)", "Largura (cm)\n(limite 1-999999)", "Altura (cm)\n(limite 1-999999)", "NCM\n(limite 8 dígitos)", "CEST\n(limite 7 dígitos)", "Unidade\n(Selecionar UN/KG/Par)", "Origem\n(Selecionar 0/1/2/3/4/5/6/7/8)", "Link do Fornecedor", "Material", "Solado", "Tipo de Ajuste"];
          let rows = [headerRow];
          selectedCatalogGroups.forEach(groupName => {
              if (groupedProducts[groupName]) {
                  groupedProducts[groupName].items.forEach((p: Product) => {
                      const skuPai = p.parentSku || (p.sku ? p.sku.split('-').slice(0, -2).join('-') : 'SKU');
                      const finalImages = p.image ? p.image.replace(/,/g, '|') : '';
                      rows.push([skuPai, p.sku || '', p.name || '', '', 'N', 'Cor', p.color || '', 'Tamanho', p.size || '', '', '', '', '', '', '', 189.90, p.price || 0, 500, '', p.barcode || '', '', finalImages, p.weight || 800, p.length || 33, p.width || 12, p.height || 19, p.ncm || '', p.cest || '', 'UN', 0, '', p.material || '', p.sole || '', p.fastening || '']);
                  });
              }
          });
          const worksheet = XLSX.utils.aoa_to_sheet(rows); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos_Lote"); XLSX.writeFile(workbook, `UpSeller_Lote_${selectedCatalogGroups.length}_Modelos.xlsx`); playSound('magic'); setSelectedCatalogGroups([]); 
      },
      handleUpdateQuantity: async (product: Product, newQty: number) => { if (newQty < 0) return; const diff = newQty - product.quantity; if (diff === 0) return; const type = diff > 0 ? 'entry' : 'exit'; try { const batch = writeBatch(db); const productRef = doc(db, getCol('products'), product.id); batch.update(productRef, { quantity: newQty, updatedAt: serverTimestamp() }); const historyRef = doc(collection(db, getCol('history'))); batch.set(historyRef, { productId: product.id, productName: product.name, sku: product.sku || '', image: product.image || '', type: type, amount: Math.abs(diff), previousQty: product.quantity, newQty: newQty, timestamp: serverTimestamp() }); await batch.commit(); } catch (e) { console.error(e); } },
      handleOpenTicket: async (e: React.FormEvent) => { e.preventDefault(); if(!currentTenant || !user) { alert("Sessão expirada."); return; } const returnProd = products.find(p => p.id === ticketReturnProductId); if (!returnProd) return alert("Selecione o produto exato que você vai devolver."); let finalProductInfo = ''; let finalValue = returnProd.price || 0; if (ticketType === 'troca') { const desiredProd = products.find(p => p.id === ticketDesiredProductId); if (!desiredProd) return alert("Selecione o produto exato desejado para a troca."); finalProductInfo = `DEVOLVE: ${returnProd.name} (Cor: ${returnProd.color} | Tam: ${returnProd.size})\nDESEJA: ${desiredProd.name} (Cor: ${desiredProd.color} | Tam: ${desiredProd.size})`; } else { if (!ticketReason) return alert("Preencha o motivo do defeito."); finalProductInfo = `DEVOLVE: ${returnProd.name} (Cor: ${returnProd.color} | Tam: ${returnProd.size})`; } setIsSavingBatch(true); try { await addDoc(collection(db, getCol('tickets')), { userId: user.uid, userName: userProfile?.name || user.email || 'Revendedor', type: ticketType, status: 'pendente', productId: returnProd.id, productInfo: finalProductInfo, productValue: finalValue, reason: ticketType === 'devolucao' ? ticketReason : 'Troca Normal', createdAt: serverTimestamp() }); setTicketReturnGroup(''); setTicketReturnProductId(''); setTicketDesiredGroup(''); setTicketDesiredProductId(''); setTicketReason(''); alert("Solicitação de Suporte enviada com Sucesso!"); playSound('success'); } catch (error) { console.error(error); alert("Falha ao enviar chamado. Tente novamente."); } finally { setIsSavingBatch(false); } },
      handleAdminTicketAction: async (ticket: SupportTicket, action: 'aceitar_troca' | 'recusar' | 'aceitar_devolucao' | 'recebido_gerar_credito') => { setIsSavingBatch(true); try { const ticketRef = doc(db, getCol('tickets'), ticket.id); if (action === 'aceitar_troca') { await updateDoc(ticketRef, { status: 'aceito', updatedAt: serverTimestamp() }); alert("Troca Aceita!"); } else if (action === 'recusar') { const note = prompt("Motivo da recusa (Opcional):"); await updateDoc(ticketRef, { status: 'recusado', adminNote: note || '', updatedAt: serverTimestamp() }); } else if (action === 'aceitar_devolucao') { await updateDoc(ticketRef, { status: 'aguardando_devolucao', updatedAt: serverTimestamp() }); alert("Devolução autorizada."); } else if (action === 'recebido_gerar_credito') { if (confirm(`Gerar crédito de R$ ${ticket.productValue.toFixed(2)} para ${ticket.userName}?`)) { const batch = writeBatch(db); batch.update(ticketRef, { status: 'concluido', updatedAt: serverTimestamp() }); batch.update(doc(db, 'users', ticket.userId), { creditBalance: increment(ticket.productValue) }); await batch.commit(); playSound('magic'); alert("Crédito gerado!"); } } } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } },
      handlePrintTicket: (ticket: SupportTicket) => { const printContent = `<html><head><title>Via de Troca</title><style>body { font-family: sans-serif; padding: 20px; } .box { border: 2px dashed #000; padding: 20px; max-width: 400px; margin: 0 auto; } h2 { text-align: center; margin-top: 0; } p { margin: 8px 0; font-size: 14px; } .line { border-top: 1px solid #ccc; margin: 15px 0; } .sign { margin-top: 40px; text-align: center; }</style></head><body><div class="box"><h2>VIA DE AUTORIZAÇÃO</h2><p><strong>TIPO:</strong> ${ticket.type.toUpperCase()}</p><p><strong>CLIENTE:</strong> ${ticket.userName}</p><p><strong>DADOS:</strong><br/> ${ticket.productInfo.replace(/\n/g, '<br/>')}</p><p><strong>MOTIVO:</strong> ${ticket.reason}</p><div class="line"></div><p><strong>DATA:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p><div class="sign">___________________________________<br/>Assinatura Responsável</div></div></body></html>`; const printWindow = window.open('', '_blank', 'width=600,height=600'); if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 250); } },
      openGroupEdit: (groupName: string, groupData: any) => { const info = groupData.info; const resolvedParentSku = info.parentSku || (info.sku ? info.sku.split('-').slice(0, -2).join('-') : ''); setAdminViewingGroupName(null); setEditingGroup({ oldName: groupName, name: info.name, description: info.description || '', image: info.image || '', price: info.price || 0, weight: info.weight || 800, length: info.length || 33, width: info.width || 12, height: info.height || 19, ncm: info.ncm || '', cest: info.cest || '', material: info.material || '', sole: info.sole || '', fastening: info.fastening || '', parentSku: resolvedParentSku, items: groupData.items }); },
      handleSaveGroupEdit: async (e: React.FormEvent) => { e.preventDefault(); if (!editingGroup) return; setIsSavingBatch(true); const priceNumber = typeof editingGroup.price === 'string' ? parseFloat(editingGroup.price) : editingGroup.price; try { const batch = writeBatch(db); editingGroup.items.forEach((item: Product) => { const ref = doc(db, getCol('products'), item.id); batch.update(ref, { name: editingGroup.name, description: editingGroup.description, image: editingGroup.image, price: priceNumber, weight: editingGroup.weight, length: editingGroup.length, width: editingGroup.width, height: editingGroup.height, ncm: editingGroup.ncm, cest: editingGroup.cest, material: editingGroup.material, sole: editingGroup.sole, fastening: editingGroup.fastening, parentSku: editingGroup.parentSku.toUpperCase().replace(/\s+/g, ''), updatedAt: serverTimestamp() }); }); await batch.commit(); setEditingGroup(null); alert("Atualizado!"); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } },
      handleDeleteGroup: async () => { if(editingGroup && confirm('Excluir todas as variações deste modelo?')) { setIsSavingBatch(true); try { const batch = writeBatch(db); editingGroup.items.forEach((item: Product) => { batch.delete(doc(db, getCol('products'), item.id)); }); await batch.commit(); setEditingGroup(null); alert('Excluído!'); } catch(e) { console.error(e); } finally { setIsSavingBatch(false); } } },
      handleSaveEdit: async (e: React.FormEvent) => { e.preventDefault(); if (!editingProduct) return; const priceNumber = typeof editingProduct.price === 'string' ? parseFloat(editingProduct.price) : editingProduct.price; try { await updateDoc(doc(db, getCol('products'), editingProduct.id), { ...editingProduct, price: priceNumber, updatedAt: serverTimestamp() }); setEditingProduct(null); } catch (error) { alert("Erro."); } },
      handleDeleteProductFromModal: async () => { if (editingProduct && confirm('Excluir?')) { await deleteDoc(doc(db, getCol('products'), editingProduct.id)); setEditingProduct(null); } },
      toggleLessonCompletion: async (lessonId: string) => { if (!user) return; const isCompleted = userProfile?.completedLessons?.includes(lessonId); try { await updateDoc(doc(db, 'users', user.uid), { completedLessons: isCompleted ? arrayRemove(lessonId) : arrayUnion(lessonId) }); } catch (e) { console.error(e); } },
      handleSaveAcademy: async (e: React.FormEvent) => { e.preventDefault(); const finalSeason = academySeasonMode === 'new' ? academyNewSeason : academySeason; if (!finalSeason || !academyTitle || !academyYoutube) return; setIsSavingBatch(true); try { await addDoc(collection(db, getCol('academy')), { season: finalSeason, episode: parseInt(academyEpisode) || 1, title: academyTitle, description: academyDesc, youtubeUrl: academyYoutube, bannerUrl: academyBanner, materialLinks: academyLinks, createdAt: serverTimestamp() }); setAcademyTitle(''); setAcademyDesc(''); setAcademyYoutube(''); setAcademyBanner(''); setAcademyLinks(''); setAcademyEpisode(String(parseInt(academyEpisode)+1)); alert("Aula publicada!"); playSound('success'); } catch(e) { console.error(e); } finally { setIsSavingBatch(false); } },
      handleDeleteAcademy: async (id: string) => { if(confirm('Excluir?')) await deleteDoc(doc(db, getCol('academy'), id)); },
      handleSaveNotice: async (e: React.FormEvent) => { e.preventDefault(); if (!noticeTitle) return; setIsSavingBatch(true); try { await addDoc(collection(db, getCol('notices')), { type: noticeType, title: noticeTitle, content: noticeContent, imageUrl: noticeType === 'banner' ? noticeImage : '', createdAt: serverTimestamp() }); setNoticeTitle(''); setNoticeContent(''); setNoticeImage(''); alert("Aviso publicado!"); } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } },
      handleDeleteNotice: async (id: string) => { if(confirm('Apagar?')) await deleteDoc(doc(db, getCol('notices'), id)); },
      handleSaveLink: async (e: React.FormEvent) => { e.preventDefault(); if(!linkTitle || !linkUrl) return; setIsSavingBatch(true); try { await addDoc(collection(db, getCol('quickLinks')), { title: linkTitle, subtitle: linkSubtitle, icon: linkIcon, url: linkUrl, order: parseInt(linkOrder) || 1, createdAt: serverTimestamp() }); setLinkTitle(''); setLinkSubtitle(''); setLinkUrl(''); setLinkOrder('1'); alert("Salvo!"); } catch (e) { console.error(e); } finally { setIsSavingBatch(false); } },
      handleDeleteLink: async (id: string) => { if(confirm('Apagar?')) await deleteDoc(doc(db, getCol('quickLinks'), id)); },
      handleSaveShowcase: async (e: React.FormEvent) => { e.preventDefault(); if (!editingShowcase?.name) return; setIsSavingBatch(true); try { const payload = { name: editingShowcase.name, linkId: editingShowcase.linkId || `cat-${Math.random().toString(36).substring(2, 8)}`, config: { showPrice: editingShowcase.config?.showPrice ?? true, priceMarkup: editingShowcase.config?.priceMarkup || 0 }, models: editingShowcase.models || [], createdAt: serverTimestamp() }; if (editingShowcase.id) { await updateDoc(doc(db, getCol('showcases'), editingShowcase.id), payload); } else { await addDoc(collection(db, getCol('showcases')), payload); } setEditingShowcase(null); setAdminView('showcases'); playSound('success'); } catch (error) { console.error(error); } finally { setIsSavingBatch(false); } },
      handleDeleteShowcase: async (id: string) => { if(confirm('Excluir Vitrine?')) await deleteDoc(doc(db, getCol('showcases'), id)); },
      toggleModelInShowcase: (modelName: string) => { setEditingShowcase(prev => { if (!prev) return prev; const models = prev.models || []; if (models.includes(modelName)) return { ...prev, models: models.filter(m => m !== modelName) }; return { ...prev, models: [...models, modelName] }; }); },
      selectAllModelsForShowcase: () => { const allNames = Object.keys(groupedAdminProducts); setEditingShowcase(prev => prev ? { ...prev, models: allNames } : prev); },
      clearAllModelsForShowcase: () => setEditingShowcase(prev => prev ? { ...prev, models: [] } : prev),
      copyShowcaseLink: (linkId: string) => { const url = `${window.location.origin}${window.location.pathname}?vitrine=${linkId}`; navigator.clipboard.writeText(url); alert("Copiado!"); },
      handleConnectShopee, handleDisconnectShopee, handlePublishToShopee, toggleGroupSelection, addColor, addSize, updateRowBarcode, toggleGroup, setNewTenantName, setNewTenantDomain, setNewTenantLogo, setNewTenantColor
  };

  // ========================================================================
  // ROTEADOR DE PÁGINAS (DECIDE QUEM VÊ O QUÊ)
  // ========================================================================
  
  // 1. Carregando
  if (globalLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><RefreshCw className="animate-spin text-blue-500 w-12 h-12"/></div>;

  // 2. Tela do Super Admin (Você / Criar Lojas)
  if (isSuperAdminMode) {
      return <SuperAdmin {...sharedProps} />;
  }

  // 3. Vitrine Pública (Pessoas sem login vendo a loja)
  if (isVitrineMode) {
      // Como a Vitrine pública é simples e sem menu, ela usa a mesma casca visual do Revendedor, só que travada na view de vitrine
      return <Revendedor {...sharedProps} />;
  }

  // 4. Tela de Login do Revendedor (Se não estiver logado)
  if (!selectedRole) {
      return <Login {...sharedProps} />;
  }

  // 5. Painel do Revendedor Logado
  if (selectedRole === 'user') {
      return <Revendedor {...sharedProps} />;
  }

  // 6. Painel do Dono da Fábrica (Fornecedor) Logado
  if (selectedRole === 'admin') {
      return <Fornecedor {...sharedProps} />;
  }

  return null;
}