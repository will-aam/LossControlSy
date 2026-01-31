"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { User, UserRole, mockUsers } from "./mock-data";
import {
  hasPermission,
  Permission,
  getNavItemsForRole,
  NavItem,
} from "./permissions";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (permission: Permission) => boolean;
  navItems: NavItem[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(mockUsers[1]); // Gestor by default

  const switchRole = (role: UserRole) => {
    const newUser = mockUsers.find((u) => u.role === role);
    if (newUser) {
      setUser(newUser);
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
