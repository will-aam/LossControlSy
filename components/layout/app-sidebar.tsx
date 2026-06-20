"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  PlusCircle,
  ClipboardCheck,
  List,
  Package,
  Images,
  BarChart3,
  Settings,
  Tags,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getRoleLabel } from "@/lib/utils";
import { UserRole } from "@/lib/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  PlusCircle,
  ClipboardCheck,
  List,
  Package,
  Images,
  BarChart3,
  Settings,
  Tags,
};

const roleColors: Record<UserRole, string> = {
  funcionario: "bg-blue-500 text-white",
  gestor: "bg-purple-500 text-white",
  fiscal: "bg-orange-500 text-white",
  dono: "bg-emerald-600 text-white",
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, navItems, logout } = useAuth();

  // Pegando o estado e a função de toggle do Sidebar
  const { state, toggleSidebar } = useSidebar();

  if (!user) return null;

  const initials = user.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header com Logo e Botão de Toggle Minimalista */}
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex items-center justify-between p-2">
          {/* Área da Logo (Some quando recolhido) */}
          <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                Sistema de Controle de Perda
              </span>
            </div>
          </div>

          {/* Botão de Toggle Intuitivo */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:h-10"
            title={state === "expanded" ? "Recolher menu" : "Expandir menu"}
          >
            {state === "expanded" ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
            <span className="sr-only">Alternar menu</span>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className="transition-all duration-200"
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border/50">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-sidebar-accent/50 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:justify-center">
          {/* Informações do Usuário */}
          <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:hidden">
            <Avatar className="h-9 w-9 rounded-lg border">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.nome} />
              ) : null}
              <AvatarFallback className={`rounded-lg ${roleColors[user.role]}`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-foreground">
                {user.nome}
              </span>
              <span className="truncate text-xs text-muted-foreground capitalize">
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>

          {/* Botão de Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 shrink-0 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:mt-0"
            title="Sair do sistema"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
