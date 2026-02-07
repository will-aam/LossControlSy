import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { EventoStatus, UserRole } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateString));
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch (e) {
    return dateString;
  }
}

export function getStatusColor(status: EventoStatus): string {
  const colors: Record<EventoStatus, string> = {
    rascunho: "bg-muted text-muted-foreground",
    enviado: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    aprovado: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejeitado: "bg-red-500/15 text-red-700 dark:text-red-400",
    exportado: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  };
  return colors[status] || "bg-muted";
}

export function getStatusLabel(status: EventoStatus): string {
  const labels: Record<EventoStatus, string> = {
    rascunho: "Rascunho",
    enviado: "Pendente",
    aprovado: "Aprovado",
    rejeitado: "Rejeitado",
    exportado: "Exportado",
  };
  return labels[status] || status;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    funcionario: "Funcionário",
    gestor: "Gestor",
    fiscal: "Fiscal",
    dono: "Proprietário",
  };
  return labels[role] || role;
}
