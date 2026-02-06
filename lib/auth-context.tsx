"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, NavItem, UserRole } from "@/lib/types";
import { getPermissions, hasPermission } from "@/lib/permissions";
import {
  LayoutDashboard,
  Package,
  List,
  ClipboardCheck,
  Images,
  BarChart3,
  Settings,
  Tags,
  MessageSquareWarning,
} from "lucide-react";
import {
  loginAction,
  logoutAction,
  getClientSession,
} from "@/app/actions/auth";
import { getSettings } from "@/app/actions/configuracoes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- Definição dos Menus (Sidebar) ---
const ALL_NAV_ITEMS: NavItem[] = [
  { title: "Visão Geral", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Catálogo", href: "/catalogo", icon: "Package" },
  { title: "Categorias", href: "/categorias", icon: "List" },
  { title: "Eventos / Perdas", href: "/eventos", icon: "ClipboardCheck" },
  { title: "Galeria", href: "/galeria", icon: "Images" },
  { title: "Notas Fiscais", href: "/notas", icon: "Tags" },
  { title: "Motivos", href: "/motivos", icon: "MessageSquareWarning" },
  { title: "Relatórios", href: "/relatorios", icon: "BarChart3" },
  { title: "Configurações", href: "/configuracoes", icon: "Settings" },
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
      const userPermissions = getPermissions(user.role);

      const filteredNav = ALL_NAV_ITEMS.filter((item) => {
        if (item.href === "/galeria" && user.role === "funcionario") {
          return settings?.permitirFuncionarioGaleria === true;
        }

        const resource = item.href.replace("/", "");
        const permissionKey = `${resource}:ver`;

        if (resource === "dashboard") return true;

        const perms = userPermissions as string[];
        return perms.includes(permissionKey) || perms.includes("*");
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
        router.push("/dashboard");
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
    // --- CORREÇÃO AQUI ---
    // Passamos 'user.role' em vez de 'user'
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
