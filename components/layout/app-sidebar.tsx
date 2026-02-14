"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  ShieldCheck,
  Sparkles,
  MessageSquareWarning,
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
  SidebarTrigger,
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
  MessageSquareWarning,
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
  // Hook para controlar o estado do sidebar (aberto/fechado)
  const { state } = useSidebar();

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
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-2">
          {/* Logo e Título (Só aparecem se aberto) */}
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden overflow-hidden transition-all">
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Loss Control</span>
              <span className="truncate text-xs text-muted-foreground">
                Controle de Perdas
              </span>
            </div>
          </div>

          {/* Botão de Colapso (Trigger) - Agora dentro do Sidebar */}
          <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:bg-muted group-data-[collapsible=icon]:mx-auto" />
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

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        size="sm"
                        className="text-muted-foreground hover:text-emerald-600 hover:bg-emerald-600/10 data-[state=open]:bg-emerald-600/10 "
                      >
                        <Sparkles className="h-4 w-4 text-emerald-400 " />
                        <span>Novidades!</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>

                    {state === "expanded" && (
                      <TooltipContent
                        side="top"
                        align="start"
                        sideOffset={10}
                        className="max-w-62.5 p-3 shadow-lg" // Define o formato de bloco e largura
                      >
                        <p className="text-sm leading-relaxed">
                          <strong>Acesso rápido à NF-e: </strong> Agora
                          disponível via ícone de arquivo na listagem de
                          Eventos.
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
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
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 shrink-0 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:mt-2"
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
