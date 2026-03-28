export interface Tenant {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  primaryColor?: string;
  cnpj?: string;
  createdAt?: any;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  sku?: string;
  parentSku?: string;
  barcode?: string;
  color?: string;
  size: string;
  price: number;
  quantity: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  ncm?: string;
  cest?: string;
  material?: string;
  sole?: string;
  fastening?: string;
  driveLink?: string;
  updatedAt?: any;
}

export interface VariationRow {
  color: string;
  size: string;
  sku: string;
  barcode: string;
}

export interface HistoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  image: string;
  type: 'entry' | 'exit';
  amount: number;
  previousQty: number;
  newQty: number;
  timestamp: any;
}

export interface PurchaseOrder {
  id: string;
  userId: string;
  userName: string;
  items: any[];
  totalValue: number;
  status: 'pendente' | 'aprovado' | 'enviado' | 'entregue' | 'cancelado';
  createdAt: any;
}

export interface Notice {
  id: string;
  type: 'text' | 'banner';
  title: string;
  content?: string;
  imageUrl?: string;
  createdAt: any;
}

export interface QuickLink {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon: string;
  order: number;
  createdAt?: any;
}

export interface Showcase {
  id: string;
  name: string;
  linkId: string;
  config: {
    showPrice: boolean;
    priceMarkup: number;
  };
  models: string[];
  createdAt: any;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'revendedor';
  creditBalance: number;
  tenantId: string;
  completedLessons?: string[];
  createdAt: any;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  type: 'troca' | 'devolucao';
  status: 'pendente' | 'aceito' | 'aguardando_devolucao' | 'concluido' | 'recusado';
  productId: string;
  productInfo: string;
  productValue: number;
  reason?: string;
  adminNote?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface AcademyLesson {
  id: string;
  season?: string;
  episode?: number;
  title: string;
  description: string;
  youtubeUrl: string;
  bannerUrl?: string;
  materialLinks?: string;
  createdAt: any;
}