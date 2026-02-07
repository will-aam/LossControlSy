// lib/permissions.ts
// RBAC - Role Based Access Control
import { UserRole } from "./types";

export type Permission =
  // Eventos
  | "eventos:criar"
  | "eventos:ver_todos"
  | "eventos:aprovar"
  | "eventos:editar"
  | "eventos:exportar"
  | "eventos:excluir"
  | "eventos:menu"

  // Motivos
  | "motivos:ver"
  | "motivos:criar"
  | "motivos:editar"
  | "motivos:excluir"

  // Catálogo
  | "catalogo:ver"
  | "catalogo:criar"
  | "catalogo:editar"
  | "catalogo:status"
  | "catalogo:importar"
  | "catalogo:excluir"

  // Categorias
  | "categorias:ver"
  | "categorias:criar"
  | "categorias:editar"
  | "categorias:excluir"

  // Galeria
  | "galeria:ver"
  | "galeria:upload"
  | "galeria:excluir"

  // Notas Fiscais
  | "notas:ver"
  | "notas:upload"
  | "notas:excluir"

  // Outros
  | "relatorios:ver"
  | "dashboard:ver"
  | "configuracoes:ver"
  | "usuarios:gerenciar";

const rolePermissions: Record<UserRole, Permission[]> = {
  funcionario: [
    // REMOVIDO: "dashboard:ver",
    "eventos:menu",
    "eventos:criar",
    "catalogo:ver",
    "catalogo:status",
    "catalogo:criar",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
  ],
  gestor: [
    "eventos:menu",
    "eventos:criar",
    "eventos:ver_todos",
    "eventos:aprovar",
    "eventos:editar",
    "eventos:excluir",
    "eventos:exportar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:status",
    "catalogo:editar",
    "catalogo:excluir",
    "catalogo:importar",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver",
    "galeria:upload",
    "galeria:excluir",
    "notas:ver",
    "notas:upload",
    "notas:excluir",
    "relatorios:ver",
    "dashboard:ver",
    "motivos:ver",
    "motivos:criar",
    "motivos:editar",
    "motivos:excluir",
  ],
  fiscal: [
    "eventos:ver_todos",
    "eventos:exportar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:status",
    "catalogo:editar",
    "catalogo:importar",
    "catalogo:excluir",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver",
    "galeria:upload",
    "notas:ver",
    "notas:upload",
    "relatorios:ver",
    "dashboard:ver",
  ],
  dono: [
    "eventos:menu",
    "eventos:criar",
    "eventos:ver_todos",
    "eventos:aprovar",
    "eventos:editar",
    "eventos:excluir",
    "eventos:exportar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:status",
    "catalogo:editar",
    "catalogo:excluir",
    "catalogo:importar",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver",
    "galeria:upload",
    "galeria:excluir",
    "notas:ver",
    "notas:upload",
    "notas:excluir",
    "relatorios:ver",
    "dashboard:ver",
    "configuracoes:ver",
    "usuarios:gerenciar",
    "motivos:ver",
    "motivos:criar",
    "motivos:editar",
    "motivos:excluir",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return rolePermissions[role] ?? [];
}
