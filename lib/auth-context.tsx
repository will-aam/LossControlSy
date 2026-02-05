"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { User, NavItem } from "@/lib/types";
import {
  loginAction,
  logoutAction,
  getClientSession,
} from "@/app/actions/auth";
import { getSettings } from "@/app/actions/configuracoes"; // Importa a action
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
  MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";

// --- DEFINIÇÃO DE PERMISSÕES ---
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
  | "motivos:ver"
  | "motivos:criar"
  | "motivos:editar"
  | "motivos:excluir"
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
    "motivos:ver",
    "motivos:criar",
    "motivos:editar",
    "motivos:excluir",
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
    "motivos:ver",
    "motivos:criar",
    "motivos:editar",
    "motivos:excluir",
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
    "motivos:ver",
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

// Tipo para as configurações globais
interface AppSettings {
  empresaNome: string;
  exigirFoto: boolean;
  bloquearAprovados: boolean;
  permitirFuncionarioGaleria: boolean;
}

interface AuthContextType {
  user: User | null;
  settings: AppSettings; // Agora exportamos as settings
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

  // Estado padrão das configurações
  const [settings, setSettings] = useState<AppSettings>({
    empresaNome: "Minha Empresa",
    exigirFoto: false,
    bloquearAprovados: true,
    permitirFuncionarioGaleria: false,
  });

  const router = useRouter();

  // Carrega Usuário e Configurações do Banco
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Carrega Sessão
        const sessionUser = await getClientSession();
        if (sessionUser) {
          setUser(sessionUser);
        }

        // 2. Carrega Configurações
        const configResult = await getSettings();
        if (configResult.success && configResult.data) {
          setSettings({
            empresaNome: configResult.data.empresaNome,
            exigirFoto: configResult.data.exigirFoto,
            bloquearAprovados: configResult.data.bloquearAprovados,
            permitirFuncionarioGaleria:
              configResult.data.permitirFuncionarioGaleria,
          });
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []); // Executa apenas uma vez no mount

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const result = await loginAction(email, password);

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id,
          nome: result.user.nome,
          email: result.user.email,
          role: result.user.role as any,
          avatarUrl: result.user.avatarUrl || undefined,
        };

        setUser(userData);

        // Recarrega configs ao logar
        const configResult = await getSettings();
        if (configResult.success && configResult.data) {
          setSettings(configResult.data as any);
        }

        toast.success(`Bem-vindo, ${userData.nome.split(" ")[0]}!`);
        router.push("/dashboard");
      } else {
        toast.error(result.message || "Credenciais inválidas");
      }
    } catch (error) {
      toast.error("Erro de conexão ao tentar entrar.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await logoutAction();
    setUser(null);
  };

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

    if (hasPermission("motivos:ver")) {
      items.push({
        title: "Motivos de Perda",
        href: "/motivos",
        icon: "MessageSquareWarning",
      });
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
        settings, // Exportando settings para quem precisar
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
