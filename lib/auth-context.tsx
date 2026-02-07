// lib/auth-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, NavItem, UserRole } from "@/lib/types";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  loginAction,
  logoutAction,
  getClientSession,
} from "@/app/actions/auth";
import { getSettings } from "@/app/actions/configuracoes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- Definição dos Menus (Sidebar) com Permissões Explicitas ---
interface NavItemWithPermission extends NavItem {
  permission: Permission; // Define qual permissão exata é necessária
}

const ALL_NAV_ITEMS: NavItemWithPermission[] = [
  {
    title: "Visão Geral",
    href: "/dashboard",
    icon: "LayoutDashboard",
    permission: "dashboard:ver",
  },
  {
    title: "Registrar Perda",
    href: "/eventos/novo",
    icon: "PlusCircle",
    permission: "eventos:criar",
  },
  {
    title: "Eventos / Perdas",
    href: "/eventos",
    icon: "ClipboardCheck",
    permission: "eventos:menu",
  },
  {
    title: "Catálogo",
    href: "/catalogo",
    icon: "Package",
    permission: "catalogo:ver",
  },
  {
    title: "Categorias",
    href: "/categorias",
    icon: "List",
    permission: "categorias:ver",
  },
  {
    title: "Galeria",
    href: "/galeria",
    icon: "Images",
    permission: "galeria:ver",
  },
  {
    title: "Notas Fiscais",
    href: "/notas",
    icon: "Tags",
    permission: "notas:ver",
  },
  {
    title: "Motivos",
    href: "/motivos",
    icon: "MessageSquareWarning",
    permission: "motivos:ver",
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    icon: "BarChart3",
    permission: "relatorios:ver",
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: "Settings",
    permission: "configuracoes:ver",
  },
];

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  navItems: NavItem[];
  settings: any;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const router = useRouter();

  const loadSettings = async () => {
    try {
      const result = await getSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações no contexto");
    }
  };

  // --- 1. Carregar Sessão ao Iniciar ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        const sessionUser = await getClientSession();
        if (sessionUser) {
          const safeUser: User = {
            ...sessionUser,
            ativo: sessionUser.ativo ?? true,
            ownerId: sessionUser.ownerId ?? null,
            avatarUrl: sessionUser.avatarUrl ?? undefined,
          };
          setUser(safeUser);
          await loadSettings();
        }
      } catch (error) {
        console.error("Erro ao restaurar sessão:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  // --- 2. Atualizar Menu quando Usuário/Settings mudar ---
  useEffect(() => {
    if (user) {
      const filteredNav = ALL_NAV_ITEMS.filter((item) => {
        // Regra especial para Galeria (Funcionario depende de Config)
        if (item.href === "/galeria" && user.role === "funcionario") {
          // Verifica se tem a permissão base E a configuração ativa
          const temPermissaoBase = hasPermission(user.role, item.permission);
          return (
            temPermissaoBase && settings?.permitirFuncionarioGaleria === true
          );
        }

        // Regra padrão: Verifica se o usuário tem a permissão exigida pelo item
        // Como o funcionario NÃO TEM "dashboard:ver", o item "Visão Geral" será removido aqui
        return hasPermission(user.role, item.permission);
      });

      setNavItems(filteredNav);
    } else {
      setNavItems([]);
    }
  }, [user, settings]);

  // --- Ações de Auth ---
  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const result = await loginAction(email, password);

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id,
          nome: result.user.nome,
          email: result.user.email,
          role: result.user.role as UserRole,
          avatarUrl: result.user.avatarUrl ?? undefined,
          ativo: result.user.ativo,
          ownerId: result.user.ownerId,
        };

        setUser(userData);
        await loadSettings();
        toast.success(`Bem-vindo, ${userData.nome.split(" ")[0]}!`);

        // --- REDIRECIONAMENTO BASEADO NO CARGO ---
        // Se for funcionário, manda para "Registrar Perda"
        // Se for gestor/dono/fiscal, manda para "Dashboard"
        if (userData.role === "funcionario") {
          router.push("/eventos/novo");
        } else {
          router.push("/dashboard");
        }
      } else {
        toast.error(result.message || "Falha ao entrar.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await logoutAction();
    setUser(null);
    setSettings(null);
    router.push("/login");
  };

  const checkPermission = (permission: string) => {
    if (!user) return false;
    return hasPermission(user.role, permission as any);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        navItems,
        settings,
        login,
        logout,
        hasPermission: checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
