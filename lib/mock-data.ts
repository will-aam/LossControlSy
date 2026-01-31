// Mock Data for Sistema de Controle de Perdas

export type UserRole = "funcionario" | "gestor" | "fiscal" | "dono";

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Item {
  id: string;
  codigoInterno: string;
  codigoBarras?: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  unidade: "UN" | "KG";
  custo: number;
  precoVenda: number;
  imagemUrl?: string;
  status: "ativo" | "inativo";
}

export type EventoStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "rejeitado"
  | "exportado";

export interface Evento {
  id: string;
  dataHora: string;
  item?: Item;
  quantidade: number;
  unidade: "UN" | "KG";
  custoSnapshot?: number;
  precoVendaSnapshot?: number;
  motivo?: string;
  status: EventoStatus;
  criadoPor: User;
  aprovadoPor?: User;
  evidencias: Evidencia[];
}

export interface Evidencia {
  id: string;
  url: string;
  dataUpload: string;
  eventoId?: string;
}
// Adicione esta Interface
export interface CategoriaData {
  id: string;
  nome: string;
  descricao?: string;
  status: "ativa" | "inativa";
  itemCount?: number; // Para mostrar quantos itens tem nessa categoria (visual)
}

// Adicione este Mock
export const mockCategoriasList: CategoriaData[] = [
  { id: "1", nome: "Frutas", status: "ativa", itemCount: 12 },
  { id: "2", nome: "Verduras", status: "ativa", itemCount: 8 },
  { id: "3", nome: "Laticínios", status: "ativa", itemCount: 15 },
  { id: "4", nome: "Carnes", status: "ativa", itemCount: 5 },
  { id: "5", nome: "Padaria", status: "ativa", itemCount: 20 },
  { id: "6", nome: "Bebidas", status: "ativa", itemCount: 30 },
  { id: "7", nome: "Limpeza", status: "inativa", itemCount: 0 },
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: "1",
    nome: "João Silva",
    email: "joao@empresa.com",
    role: "funcionario",
  },
  { id: "2", nome: "Maria Santos", email: "maria@empresa.com", role: "gestor" },
  {
    id: "3",
    nome: "Carlos Oliveira",
    email: "carlos@empresa.com",
    role: "fiscal",
  },
  { id: "4", nome: "Ana Costa", email: "ana@empresa.com", role: "dono" },
];

// Current logged user (for demo)
export const currentUser: User = mockUsers[1]; // Gestor by default

// Mock Items (Catalog)
export const mockItems: Item[] = [
  {
    id: "1",
    codigoInterno: "FRT001",
    codigoBarras: "7891234567890",
    nome: "Banana Prata",
    categoria: "Frutas",
    subcategoria: "Tropicais",
    unidade: "KG",
    custo: 3.5,
    precoVenda: 5.99,
    imagemUrl:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200",
    status: "ativo",
  },
  {
    id: "2",
    codigoInterno: "FRT002",
    codigoBarras: "7891234567891",
    nome: "Maçã Fuji",
    categoria: "Frutas",
    subcategoria: "Importadas",
    unidade: "KG",
    custo: 8.0,
    precoVenda: 12.99,
    imagemUrl:
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200",
    status: "ativo",
  },
  {
    id: "3",
    codigoInterno: "VEG001",
    codigoBarras: "7891234567892",
    nome: "Tomate Italiano",
    categoria: "Verduras",
    subcategoria: "Legumes",
    unidade: "KG",
    custo: 4.5,
    precoVenda: 7.99,
    imagemUrl:
      "https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=200",
    status: "ativo",
  },
  {
    id: "4",
    codigoInterno: "LAT001",
    codigoBarras: "7891234567893",
    nome: "Leite Integral 1L",
    categoria: "Laticínios",
    subcategoria: "Leites",
    unidade: "UN",
    custo: 4.0,
    precoVenda: 5.49,
    imagemUrl:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200",
    status: "ativo",
  },
  {
    id: "5",
    codigoInterno: "LAT002",
    codigoBarras: "7891234567894",
    nome: "Iogurte Natural 170g",
    categoria: "Laticínios",
    subcategoria: "Iogurtes",
    unidade: "UN",
    custo: 2.5,
    precoVenda: 3.99,
    imagemUrl:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200",
    status: "ativo",
  },
  {
    id: "6",
    codigoInterno: "CAR001",
    codigoBarras: "7891234567895",
    nome: "Filé de Frango",
    categoria: "Carnes",
    subcategoria: "Aves",
    unidade: "KG",
    custo: 15.0,
    precoVenda: 22.99,
    imagemUrl:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200",
    status: "ativo",
  },
  {
    id: "7",
    codigoInterno: "PAD001",
    codigoBarras: "7891234567896",
    nome: "Pão Francês",
    categoria: "Padaria",
    subcategoria: "Pães",
    unidade: "UN",
    custo: 0.35,
    precoVenda: 0.59,
    imagemUrl:
      "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200",
    status: "ativo",
  },
  {
    id: "8",
    codigoInterno: "VEG002",
    codigoBarras: "7891234567897",
    nome: "Alface Americana",
    categoria: "Verduras",
    subcategoria: "Folhas",
    unidade: "UN",
    custo: 2.0,
    precoVenda: 3.49,
    imagemUrl:
      "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=200",
    status: "ativo",
  },
  {
    id: "9",
    codigoInterno: "BEB001",
    codigoBarras: "7891234567898",
    nome: "Suco de Laranja 1L",
    categoria: "Bebidas",
    subcategoria: "Sucos",
    unidade: "UN",
    custo: 5.0,
    precoVenda: 8.99,
    status: "ativo",
  },
  {
    id: "10",
    codigoInterno: "FRT003",
    codigoBarras: "7891234567899",
    nome: "Morango",
    categoria: "Frutas",
    subcategoria: "Vermelhas",
    unidade: "UN",
    custo: 8.0,
    precoVenda: 14.99,
    imagemUrl:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200",
    status: "ativo",
  },
];

// Mock Evidencias
export const mockEvidencias: Evidencia[] = [
  {
    id: "e1",
    url: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400",
    dataUpload: "2025-01-28T10:30:00",
  },
  {
    id: "e2",
    url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
    dataUpload: "2025-01-28T11:15:00",
  },
  {
    id: "e3",
    url: "https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=400",
    dataUpload: "2025-01-27T09:45:00",
  },
  {
    id: "e4",
    url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
    dataUpload: "2025-01-27T14:20:00",
  },
  {
    id: "e5",
    url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
    dataUpload: "2025-01-26T16:30:00",
  },
  {
    id: "e6",
    url: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400",
    dataUpload: "2025-01-26T08:00:00",
  },
];

// Mock Eventos
export const mockEventos: Evento[] = [
  {
    id: "ev1",
    dataHora: "2025-01-29T08:30:00",
    item: mockItems[0],
    quantidade: 2.5,
    unidade: "KG",
    custoSnapshot: 3.5,
    precoVendaSnapshot: 5.99,
    motivo: "Produto maduro demais",
    status: "enviado",
    criadoPor: mockUsers[0],
    evidencias: [mockEvidencias[0]],
  },
  {
    id: "ev2",
    dataHora: "2025-01-29T09:15:00",
    item: mockItems[1],
    quantidade: 1.2,
    unidade: "KG",
    custoSnapshot: 8.0,
    precoVendaSnapshot: 12.99,
    motivo: "Danos no transporte",
    status: "enviado",
    criadoPor: mockUsers[0],
    evidencias: [mockEvidencias[1]],
  },
  {
    id: "ev3",
    dataHora: "2025-01-28T14:00:00",
    item: mockItems[2],
    quantidade: 3.0,
    unidade: "KG",
    custoSnapshot: 4.5,
    precoVendaSnapshot: 7.99,
    motivo: "Validade vencida",
    status: "aprovado",
    criadoPor: mockUsers[0],
    aprovadoPor: mockUsers[1],
    evidencias: [mockEvidencias[2]],
  },
  {
    id: "ev4",
    dataHora: "2025-01-28T10:30:00",
    item: mockItems[3],
    quantidade: 6,
    unidade: "UN",
    custoSnapshot: 4.0,
    precoVendaSnapshot: 5.49,
    motivo: "Embalagem danificada",
    status: "aprovado",
    criadoPor: mockUsers[0],
    aprovadoPor: mockUsers[1],
    evidencias: [mockEvidencias[3]],
  },
  {
    id: "ev5",
    dataHora: "2025-01-27T16:45:00",
    item: mockItems[4],
    quantidade: 12,
    unidade: "UN",
    custoSnapshot: 2.5,
    precoVendaSnapshot: 3.99,
    motivo: "Refrigeração falhou",
    status: "rejeitado",
    criadoPor: mockUsers[0],
    aprovadoPor: mockUsers[1],
    evidencias: [mockEvidencias[4]],
  },
  {
    id: "ev6",
    dataHora: "2025-01-27T08:00:00",
    item: mockItems[5],
    quantidade: 1.8,
    unidade: "KG",
    custoSnapshot: 15.0,
    precoVendaSnapshot: 22.99,
    motivo: "Perda por manipulação",
    status: "exportado",
    criadoPor: mockUsers[0],
    aprovadoPor: mockUsers[1],
    evidencias: [mockEvidencias[5]],
  },
  {
    id: "ev7",
    dataHora: "2025-01-26T11:30:00",
    item: mockItems[6],
    quantidade: 25,
    unidade: "UN",
    custoSnapshot: 0.35,
    precoVendaSnapshot: 0.59,
    motivo: "Sobra do dia anterior",
    status: "exportado",
    criadoPor: mockUsers[0],
    aprovadoPor: mockUsers[1],
    evidencias: [],
  },
  {
    id: "ev8",
    dataHora: "2025-01-26T09:00:00",
    quantidade: 5,
    unidade: "UN",
    motivo: "Item não identificado - produto sem código",
    status: "enviado",
    criadoPor: mockUsers[0],
    evidencias: [],
  },
];

// Categories for filtering
export const categorias = [
  "Frutas",
  "Verduras",
  "Laticínios",
  "Carnes",
  "Padaria",
  "Bebidas",
];

// Motivos comuns de perda
export const motivosComuns = [
  "Validade vencida",
  "Produto maduro demais",
  "Danos no transporte",
  "Embalagem danificada",
  "Refrigeração falhou",
  "Perda por manipulação",
  "Sobra do dia anterior",
  "Queda/acidente",
  "Contaminação",
  "Outro",
];

// Dashboard Stats
export const dashboardStats = {
  perdasHoje: {
    quantidade: 4,
    custo: 45.75,
    precoVenda: 72.45,
  },
  perdasSemana: {
    quantidade: 28,
    custo: 312.5,
    precoVenda: 498.2,
  },
  perdasMes: {
    quantidade: 156,
    custo: 2450.8,
    precoVenda: 3890.45,
  },
  pendentesAprovacao: 3,
  topItens: [
    { item: mockItems[0], quantidade: 15.5, custo: 54.25 },
    { item: mockItems[6], quantidade: 120, custo: 42.0 },
    { item: mockItems[3], quantidade: 24, custo: 96.0 },
    { item: mockItems[2], quantidade: 8.5, custo: 38.25 },
    { item: mockItems[4], quantidade: 18, custo: 45.0 },
  ],
  perdasPorCategoria: [
    { categoria: "Frutas", custo: 850.0, precoVenda: 1350.0 },
    { categoria: "Laticínios", custo: 520.0, precoVenda: 780.0 },
    { categoria: "Padaria", custo: 380.0, precoVenda: 580.0 },
    { categoria: "Verduras", custo: 340.0, precoVenda: 520.0 },
    { categoria: "Carnes", custo: 280.0, precoVenda: 480.0 },
    { categoria: "Bebidas", custo: 80.0, precoVenda: 180.0 },
  ],
  tendenciaSemanal: [
    { dia: "Seg", custo: 120, precoVenda: 190 },
    { dia: "Ter", custo: 95, precoVenda: 150 },
    { dia: "Qua", custo: 140, precoVenda: 220 },
    { dia: "Qui", custo: 85, precoVenda: 135 },
    { dia: "Sex", custo: 165, precoVenda: 260 },
    { dia: "Sáb", custo: 200, precoVenda: 320 },
    { dia: "Dom", custo: 75, precoVenda: 115 },
  ],
};

// Helper functions
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function getStatusColor(status: EventoStatus): string {
  const colors: Record<EventoStatus, string> = {
    rascunho: "bg-muted text-muted-foreground",
    enviado: "bg-info/20 text-info",
    aprovado: "bg-success/20 text-success",
    rejeitado: "bg-destructive/20 text-destructive",
    exportado: "bg-muted text-muted-foreground",
  };
  return colors[status];
}

export function getStatusLabel(status: EventoStatus): string {
  const labels: Record<EventoStatus, string> = {
    rascunho: "Rascunho",
    enviado: "Enviado",
    aprovado: "Aprovado",
    rejeitado: "Rejeitado",
    exportado: "Exportado",
  };
  return labels[status];
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    funcionario: "Funcionário",
    gestor: "Gestor",
    fiscal: "Fiscal",
    dono: "Proprietário",
  };
  return labels[role];
}
