// Definições de Tipos do Sistema (Sem dados falsos)

export type UserRole = "funcionario" | "gestor" | "fiscal" | "dono";

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

export interface Item {
  id: string;
  codigoInterno: string;
  codigoBarras?: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  unidade: "UN" | "KG" | "CX" | "L"; // Adicionei mais unidades comuns
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

export interface Evidencia {
  id: string;
  url: string;
  dataUpload: string;
  eventoId?: string;
  motivo?: string;
  itemId?: string;
}

export interface Evento {
  id: string;
  dataHora: string;
  item?: Item;
  quantidade: number;
  unidade: string;
  custoSnapshot?: number;
  precoVendaSnapshot?: number;
  motivo?: string;
  status: EventoStatus;
  criadoPor: User;
  aprovadoPor?: User;
  evidencias: Evidencia[];
}

export interface CategoriaData {
  id: string;
  nome: string;
  descricao?: string;
  status: "ativa" | "inativa";
  itemCount?: number;
}
