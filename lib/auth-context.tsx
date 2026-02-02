"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, NavItem } from "@/lib/mock-data";
import { StorageService } from "@/lib/storage";
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Images,
  BarChart3,
  Settings,
  Tags,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

// Definição Granular das Permissões
type Permission =
  // Dashboard
  | "dashboard:ver"

  // Eventos (Perdas)
  | "eventos:ver_todos" // Ver a lista/audit
  | "eventos:criar" // Registrar nova perda
  | "eventos:editar" // Editar registro existente
  | "eventos:excluir" // Excluir registro
  | "eventos:aprovar" // Aprovar/Rejeitar lotes
  | "eventos:exportar" // Botão exportar

  // Catálogo (Itens)
  | "catalogo:ver"
  | "catalogo:criar" // Criar um a um
  | "catalogo:importar" // Importar CSV (Bloqueado para funcionário)
  | "catalogo:editar" // Editar dados completos
  | "catalogo:status" // Apenas ativar/desativar (Para funcionário)
  | "catalogo:excluir"

  // Categorias
  | "categorias:ver"
  | "categorias:criar"
  | "categorias:editar"
  | "categorias:excluir"

  // Galeria
  | "galeria:ver"
  | "galeria:upload" // Adicionar foto na galeria (não no evento)
  | "galeria:excluir"

  // Outros
  | "relatorios:ver"
  | "configuracoes:ver";

// Matriz de Permissões por Cargo
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  dono: [
    "dashboard:ver",
    "eventos:ver_todos",
    "eventos:criar",
    "eventos:editar",
    "eventos:excluir",
    "eventos:aprovar",
    "eventos:exportar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:importar",
    "catalogo:editar",
    "catalogo:status",
    "catalogo:excluir",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver",
    "galeria:upload",
    "galeria:excluir",
    "relatorios:ver",
    "configuracoes:ver",
  ],
  gestor: [
    "dashboard:ver",
    "eventos:ver_todos",
    "eventos:criar",
    "eventos:editar",
    "eventos:excluir",
    "eventos:aprovar",
    "eventos:exportar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:importar",
    "catalogo:editar",
    "catalogo:status",
    "catalogo:excluir",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver",
    "galeria:upload",
    "galeria:excluir",
    "relatorios:ver",
    "configuracoes:ver", // Gestor pode ver configs (exceto deletar dono, tratado na UI)
  ],
  fiscal: [
    "dashboard:ver",
    "eventos:ver_todos",
    "eventos:exportar", // Vê tudo e exporta, mas NÃO cria/edita/aprova
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:importar",
    "catalogo:editar",
    "catalogo:status",
    "catalogo:excluir",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
    "categorias:excluir",
    "galeria:ver", // Vê galeria mas não sobe foto lá
    "relatorios:ver",
    "configuracoes:ver",
  ],
  funcionario: [
    "eventos:criar", // Só cria evento
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:status", // Cria e muda status, não edita dados full nem exclui
    "categorias:ver",
    "categorias:criar",
    "categorias:editar", // Categorias: cria/edita, não exclui
    // Galeria: A permissão 'galeria:ver' será dinâmica baseada na config
  ],
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  navItems: NavItem[];
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(StorageService.getSettings());

  // Atualiza settings periodicamente ou quando foca a janela (simples)
  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, [user]); // Atualiza settings sempre que user muda (login)

  useEffect(() => {
    const checkAuth = () => {
      const storedUserId = localStorage.getItem("losscontrol_active_user_id");
      if (storedUserId) {
        const allUsers = StorageService.getUsers();
        const foundUser = allUsers.find((u) => u.id === storedUserId);
        if (foundUser) {
          setUser(foundUser);
        } else {
          localStorage.removeItem("losscontrol_active_user_id");
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const users = StorageService.getUsers();
    const foundUser = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem("losscontrol_active_user_id", foundUser.id);
      toast.success(`Bem-vindo, ${foundUser.nome.split(" ")[0]}!`);
    } else {
      toast.error("Usuário não encontrado.");
      throw new Error("Credenciais inválidas");
    }
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("losscontrol_active_user_id");
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    // Regra Dinâmica: Funcionário e Galeria
    if (
      user.role === "funcionario" &&
      (permission === "galeria:ver" || permission === "galeria:upload")
    ) {
      return settings.permitirFuncionarioGaleria;
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  };

  // Gera o menu dinamicamente
  const navItems = React.useMemo(() => {
    const items: NavItem[] = [];

    // Dashboard
    if (hasPermission("dashboard:ver")) {
      items.push({
        title: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      });
    }

    // Lógica Especial para Eventos vs Registrar Novo
    if (user?.role === "funcionario") {
      // Funcionário vê "Registrar Perda" direto
      items.push({
        title: "Registrar Perda",
        href: "/eventos/novo",
        icon: "PlusCircle",
      });
    } else {
      // Outros veem a lista de auditoria (Eventos)
      if (hasPermission("eventos:ver_todos")) {
        items.push({
          title: "Eventos",
          href: "/eventos",
          icon: "ClipboardCheck",
        });
      }
    }

    // Catálogo
    if (hasPermission("catalogo:ver")) {
      items.push({ title: "Catálogo", href: "/catalogo", icon: "Package" });
    }

    // Categorias
    if (hasPermission("categorias:ver")) {
      items.push({ title: "Categorias", href: "/categorias", icon: "Tags" });
    }

    // Galeria (Depende da config para funcionário)
    if (hasPermission("galeria:ver")) {
      items.push({ title: "Galeria", href: "/galeria", icon: "Images" });
    }

    // Relatórios
    if (hasPermission("relatorios:ver")) {
      items.push({
        title: "Relatórios",
        href: "/relatorios",
        icon: "BarChart3",
      });
    }

    // Configurações
    if (hasPermission("configuracoes:ver")) {
      items.push({
        title: "Configurações",
        href: "/configuracoes",
        icon: "Settings",
      });
    }

    return items;
  }, [user, settings]); // Recalcula se settings mudar

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasPermission,
        navItems,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
