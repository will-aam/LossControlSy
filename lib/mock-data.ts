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
      "data:image/jpeg;base64,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",
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
