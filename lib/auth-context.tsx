"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { User, NavItem } from "@/lib/types";
import { StorageService } from "@/lib/storage";
import {
  loginAction,
  logoutAction,
  getClientSession,
} from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Package,
  Images,
  BarChart3,
  Settings,
  Tags,
  PlusCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// --- DEFINIÇÃO DE PERMISSÕES (Mantida a sua original) ---
type Permission =
  | "dashboard:ver"
  | "eventos:ver_todos"
  | "eventos:criar"
  | "eventos:editar"
  | "eventos:excluir"
  | "eventos:aprovar"
  | "eventos:exportar"
  | "catalogo:ver"
  | "catalogo:criar"
  | "catalogo:importar"
  | "catalogo:editar"
  | "catalogo:status"
  | "catalogo:excluir"
  | "categorias:ver"
  | "categorias:criar"
  | "categorias:editar"
  | "categorias:excluir"
  | "galeria:ver"
  | "galeria:upload"
  | "galeria:excluir"
  | "notas:ver"
  | "notas:upload"
  | "notas:excluir"
  | "relatorios:ver"
  | "configuracoes:ver";

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
    "notas:ver",
    "notas:upload",
    "notas:excluir",
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
    "notas:ver",
    "notas:upload",
    "notas:excluir",
    "relatorios:ver",
  ],
  fiscal: [
    "dashboard:ver",
    "eventos:ver_todos",
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
    "notas:ver",
    "notas:upload",
    "relatorios:ver",
  ],
  funcionario: [
    "eventos:criar",
    "catalogo:ver",
    "catalogo:criar",
    "catalogo:status",
    "categorias:ver",
    "categorias:criar",
    "categorias:editar",
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
  const [settings, setSettings] = useState(StorageService.getSettings()); // Mantendo settings locais por enquanto
  const router = useRouter();

  // Atualiza settings se o usuário mudar (compatibilidade)
  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, [user]);

  // --- NOVA LÓGICA: Verifica Sessão no Servidor ao Carregar ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionUser = await getClientSession(); // Pergunta ao servidor: "Quem sou eu?"
        if (sessionUser) {
          setUser(sessionUser);
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // --- NOVA LÓGICA: Login via Server Action ---
  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const result = await loginAction(email, password);

      if (result.success && result.user) {
        // Converte o retorno para o tipo User esperado (garantia de tipagem)
        const userData: User = {
          id: result.user.id,
          nome: result.user.nome,
          email: result.user.email,
          role: result.user.role as any, // Cast seguro pois os enums batem
          avatarUrl: result.user.avatarUrl || undefined,
        };

        setUser(userData);
        toast.success(`Bem-vindo, ${userData.nome.split(" ")[0]}!`);
        router.push("/dashboard"); // Redireciona para o dashboard
      } else {
        toast.error(result.message || "Credenciais inválidas");
      }
    } catch (error) {
      toast.error("Erro de conexão ao tentar entrar.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- NOVA LÓGICA: Logout ---
  const logout = async () => {
    await logoutAction(); // Limpa cookie no servidor
    setUser(null);
  };

  // --- LÓGICA MANTIDA: Permissões ---
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    if (
      user.role === "funcionario" &&
      (permission === "galeria:ver" || permission === "galeria:upload")
    ) {
      return settings.permitirFuncionarioGaleria;
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  };

  // --- LÓGICA MANTIDA: Itens do Menu ---
  const navItems = useMemo(() => {
    const items: NavItem[] = [];

    if (hasPermission("dashboard:ver")) {
      items.push({
        title: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      });
    }

    if (user?.role === "funcionario") {
      items.push({
        title: "Registrar Perda",
        href: "/eventos/novo",
        icon: "PlusCircle",
      });
    } else {
      if (hasPermission("eventos:ver_todos")) {
        items.push({
          title: "Eventos",
          href: "/eventos",
          icon: "ClipboardCheck",
        });
      }
    }

    if (hasPermission("catalogo:ver")) {
      items.push({ title: "Catálogo", href: "/catalogo", icon: "Package" });
    }

    if (hasPermission("categorias:ver")) {
      items.push({ title: "Categorias", href: "/categorias", icon: "Tags" });
    }

    if (hasPermission("galeria:ver")) {
      items.push({ title: "Galeria", href: "/galeria", icon: "Images" });
    }

    if (hasPermission("notas:ver")) {
      items.push({ title: "Notas Fiscais", href: "/notas", icon: "FileText" });
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
  }, [user, settings]);

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
