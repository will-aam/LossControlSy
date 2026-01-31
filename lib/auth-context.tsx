"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User, UserRole } from "./mock-data";
import {
  hasPermission,
  Permission,
  getNavItemsForRole,
  NavItem,
} from "./permissions";
// Importa o serviço de Storage que criamos
import { StorageService } from "./storage";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (permission: Permission) => boolean;
  navItems: NavItem[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Começa null para esperar o carregamento do Storage
  const [user, setUser] = useState<User | null>(null);

  // lib/auth-context.tsx (Trecho do useEffect)

  useEffect(() => {
    // 1. Verifica se tem um ID de usuário salvo na sessão
    const activeUserId = localStorage.getItem("losscontrol_active_user_id");
    const users = StorageService.getUsers();

    if (activeUserId) {
      const returningUser = users.find((u) => u.id === activeUserId);
      if (returningUser) {
        setUser(returningUser);
        return;
      }
    }

    // Se não tiver ninguém logado, NÃO LOGA AUTOMÁTICO.
    // Deixa o user como null. Isso vai forçar o redirecionamento para o login.
    setUser(null);
  }, []);

  // Função de Logout (Adicione isso no Contexto)
  const logout = () => {
    setUser(null);
    localStorage.removeItem("losscontrol_active_user_id");
    // O redirecionamento acontece no componente ou middleware
  };

  const switchRole = (role: UserRole) => {
    // Busca usuários reais do storage
    const users = StorageService.getUsers();
    const foundUser = users.find((u) => u.role === role);

    if (foundUser) {
      setUser(foundUser);
    } else {
      // Fallback: Cria um usuário temporário em memória para testar o perfil
      // Isso é útil se você deletar todos os usuários do storage
      const tempUser: User = {
        id: `temp-${role}`,
        nome: `Usuário ${role.charAt(0).toUpperCase() + role.slice(1)} (Temp)`,
        email: `${role}@teste.com`,
        role: role,
        avatar: "",
      };
      setUser(tempUser);
    }
  };

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const navItems = user ? getNavItemsForRole(user.role) : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        switchRole,
        hasPermission: checkPermission,
        navItems,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
