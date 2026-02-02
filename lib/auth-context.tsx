"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, NavItem } from "@/lib/mock-data";
import { StorageService } from "@/lib/storage"; // Importar Storage
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Images,
  BarChart3,
  Settings,
  Tags,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

// Definição das Permissões por Cargo
type Permission =
  | "dashboard:ver"
  | "eventos:ver_todos" // Alterado para bater com o arquivo de eventos
  | "eventos:criar"
  | "eventos:editar"
  | "eventos:excluir" // Adicionado
  | "catalogo:ver"
  | "catalogo:criar"
  | "catalogo:editar"
  | "galeria:ver"
  | "relatorios:ver"
  | "configuracoes:ver";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  dono: [
    "dashboard:ver",
    "eventos:ver_todos",
    "eventos:criar",
    "eventos:editar",
    "eventos:excluir",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:editar",
    "galeria:ver",
    "relatorios:ver",
    "configuracoes:ver",
  ],
  gestor: [
    "dashboard:ver",
    "eventos:ver_todos",
    "eventos:criar",
    "eventos:editar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:editar",
    "galeria:ver",
    "relatorios:ver",
  ],
  fiscal: [
    "dashboard:ver",
    "eventos:ver_todos",
    "eventos:criar",
    "catalogo:ver",
    "galeria:ver",
  ],
  funcionario: [
    "eventos:criar", // Funcionário foca em registrar
    "catalogo:ver",
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

  // Verifica se já tem usuário logado ao abrir o app
  useEffect(() => {
    const checkAuth = () => {
      const storedUserId = localStorage.getItem("losscontrol_active_user_id");
      if (storedUserId) {
        // Busca o usuário atualizado do Storage
        const allUsers = StorageService.getUsers();
        const foundUser = allUsers.find((u) => u.id === storedUserId);

        if (foundUser) {
          setUser(foundUser);
        } else {
          // Se o usuário foi excluído mas o ID estava no cache, limpa
          localStorage.removeItem("losscontrol_active_user_id");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);

    // Simula delay de rede
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 1. Busca usuários reais do sistema
    const users = StorageService.getUsers();

    // 2. Tenta encontrar pelo email (case insensitive)
    const foundUser = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (foundUser) {
      // SUCESSO
      setUser(foundUser);
      localStorage.setItem("losscontrol_active_user_id", foundUser.id);
      toast.success(`Bem-vindo de volta, ${foundUser.nome.split(" ")[0]}!`);
    } else {
      // ERRO
      toast.error("Usuário não encontrado.", {
        description: "Verifique o e-mail ou contate o administrador.",
      });
      throw new Error("Credenciais inválidas");
    }

    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("losscontrol_active_user_id");
    // Redirecionamento é feito pelo componente que consome, ou useRouter aqui se preferir
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  };

  // Gera o menu dinamicamente com base nas permissões
  const navItems = React.useMemo(() => {
    const items: NavItem[] = [];

    if (hasPermission("dashboard:ver")) {
      items.push({
        title: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      });
    }

    // Todos podem ver a área de eventos (ou registrar ou ver todos)
    items.push({ title: "Eventos", href: "/eventos", icon: "ClipboardCheck" });

    if (hasPermission("catalogo:ver")) {
      items.push({ title: "Catálogo", href: "/catalogo", icon: "Package" });
    }

    // Categorias (Apenas Gestor/Dono - Regra implícita ou criar permissão específica)
    if (user?.role === "dono" || user?.role === "gestor") {
      items.push({ title: "Categorias", href: "/categorias", icon: "Tags" });
    }

    if (hasPermission("galeria:ver")) {
      items.push({ title: "Galeria", href: "/galeria", icon: "Images" });
    }

    if (hasPermission("relatorios:ver")) {
      items.push({
        title: "Relatórios",
        href: "/relatorios",
        icon: "BarChart3",
      });
    }

    if (hasPermission("configuracoes:ver")) {
      items.push({
        title: "Configurações",
        href: "/configuracoes",
        icon: "Settings",
      });
    }

    return items;
  }, [user]);

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
