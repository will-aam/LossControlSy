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

export interface NotaFiscal {
  id: string;
  dataUpload: string; // Data em que você subiu o arquivo
  uploadedBy: User; // Quem subiu (Fiscal, Dono, etc.)

  // Arquivos
  pdfUrl?: string; // Link para o PDF (simulado no LocalStorage)
  xmlContent?: string; // O conteúdo texto do XML para leitura futura

  // Metadados extraídos do XML (ou preenchidos manualmente)
  numero?: string;
  serie?: string;
  emitente?: string; // xNome
  cnpjEmitente?: string;
  dataEmissao?: string; // dhEmi
  valorTotal?: number; // vNF
  naturezaOperacao?: string; // natOp
  chaveAcesso?: string;

  // Vínculos
  eventoId?: string; // Para vincular a uma perda específica (opcional)
  observacoes?: string;
}
