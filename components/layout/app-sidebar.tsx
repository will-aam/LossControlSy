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
  ShieldCheck,
  Sparkles,
  MessageSquareWarning,
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button"; // Importando Button para o logout
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Loss Control</span>
                <span className="truncate text-xs text-muted-foreground">
                  Controle de Perdas
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                <SidebarMenuButton
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Novidades v1.0</span>
                </SidebarMenuButton>
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
