// Definições de Tipos do Sistema (Sem dados falsos)

export type UserRole = "dono" | "gestor" | "fiscal" | "funcionario";

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  avatarUrl?: string; // Atualizado de 'avatar' para 'avatarUrl'
  createdAt?: string;
  // Outros campos opcionais que podem vir do banco
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

export interface NotaFiscal {
  id: string;
  dataUpload: string;
  uploadedBy: User;

  // Arquivos
  pdfUrl?: string; // URL do PDF no R2
  xmlUrl?: string; // NOVO: URL do XML no R2
  xmlContent?: string; // Conteúdo texto do XML (para leitura/backup)

  // Metadados
  numero?: string;
  serie?: string;
  emitente?: string;
  cnpjEmitente?: string;
  dataEmissao?: string;
  valorTotal?: number;
  naturezaOperacao?: string;
  chaveAcesso?: string;

  // Vínculos
  eventoId?: string;
  observacoes?: string;
}
