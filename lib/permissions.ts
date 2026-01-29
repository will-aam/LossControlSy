// RBAC - Role Based Access Control
import { UserRole } from './mock-data'

export type Permission =
  | 'eventos:criar'
  | 'eventos:ver_todos'
  | 'eventos:aprovar'
  | 'eventos:editar'
  | 'eventos:exportar'
  | 'catalogo:ver'
  | 'catalogo:criar'
  | 'catalogo:editar'
  | 'galeria:ver'
  | 'relatorios:ver'
  | 'dashboard:ver'
  | 'configuracoes:ver'
  | 'usuarios:gerenciar'

const rolePermissions: Record<UserRole, Permission[]> = {
  funcionario: [
    'eventos:criar',
    'catalogo:ver',
  ],
  gestor: [
    'eventos:criar',
    'eventos:ver_todos',
    'eventos:aprovar',
    'eventos:editar',
    'catalogo:ver',
    'catalogo:criar',
    'catalogo:editar',
    'galeria:ver',
    'relatorios:ver',
    'dashboard:ver',
  ],
  fiscal: [
    'eventos:ver_todos',
    'eventos:exportar',
    'catalogo:ver',
    'galeria:ver',
    'relatorios:ver',
    'dashboard:ver',
  ],
  dono: [
    'eventos:criar',
    'eventos:ver_todos',
    'eventos:aprovar',
    'eventos:editar',
    'eventos:exportar',
    'catalogo:ver',
    'catalogo:criar',
    'catalogo:editar',
    'galeria:ver',
    'relatorios:ver',
    'dashboard:ver',
    'configuracoes:ver',
    'usuarios:gerenciar',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function getPermissions(role: UserRole): Permission[] {
  return rolePermissions[role] ?? []
}

// Navigation items based on role
export interface NavItem {
  title: string
  href: string
  icon: string
  permission?: Permission
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', permission: 'dashboard:ver' },
  { title: 'Registrar Perda', href: '/eventos/novo', icon: 'PlusCircle', permission: 'eventos:criar' },
  { title: 'Aprovações', href: '/eventos/aprovacoes', icon: 'ClipboardCheck', permission: 'eventos:aprovar' },
  { title: 'Eventos', href: '/eventos', icon: 'List', permission: 'eventos:ver_todos' },
  { title: 'Catálogo', href: '/catalogo', icon: 'Package', permission: 'catalogo:ver' },
  { title: 'Galeria', href: '/galeria', icon: 'Images', permission: 'galeria:ver' },
  { title: 'Relatórios', href: '/relatorios', icon: 'BarChart3', permission: 'relatorios:ver' },
  { title: 'Configurações', href: '/configuracoes', icon: 'Settings', permission: 'configuracoes:ver' },
]

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter(item => {
    if (!item.permission) return true
    return hasPermission(role, item.permission)
  })
}
