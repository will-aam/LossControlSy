"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
// Removemos o AuthProvider daqui, importamos apenas o hook useAuth
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

// Layout Principal do Dashboard
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Lógica de Proteção de Rota
  useEffect(() => {
    const timer = setTimeout(() => {
      // Se não tem usuário, chuta pro login
      if (!user) {
        router.push("/login");
      }
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [user, router]);

  // Tela de carregamento enquanto verifica
  if (isChecking && !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se passou a verificação e não tem user (está redirecionando), não renderiza nada
  if (!user) return null;

  return (
    // REMOVIDO <AuthProvider> DAQUI POIS JÁ ESTÁ NO ROOT
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
