"use client";

import React, { useEffect, useState } from "react";
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
  ChevronsUpDown,
  LogOut,
  ShieldCheck,
  Sparkles,
  MessageSquareWarning,
  UserPlus,
  RefreshCcw, // Ícone de troca
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// Interface para contas salvas no navegador
interface SavedAccount {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, navItems, setUser, logout } = useAuth();
  const { isMobile } = useSidebar();
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  if (!user) return null;

  const initials = user.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // --- LÓGICA DE CONTAS SALVAS ---
  useEffect(() => {
    // 1. Carregar contas do localStorage
    const stored = localStorage.getItem("losscontrol_saved_accounts");
    let accounts: SavedAccount[] = stored ? JSON.parse(stored) : [];

    // 2. Adicionar/Atualizar o usuário atual na lista
    const currentUserData: SavedAccount = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };

    // Remove a versão antiga do usuário atual se existir e adiciona a nova no topo
    accounts = accounts.filter((acc) => acc.email !== user.email);
    accounts.unshift(currentUserData);

    // Salva de volta (mantendo no máximo 5 contas recentes)
    const limitedAccounts = accounts.slice(0, 5);
    localStorage.setItem(
      "losscontrol_saved_accounts",
      JSON.stringify(limitedAccounts),
    );
    setSavedAccounts(limitedAccounts);
  }, [user]);

  const handleLogout = async () => {
    await logout(); // Usa a função do contexto que limpa o cookie
    router.push("/login");
  };

  const handleSwitchAccount = async (email: string) => {
    await logout();
    // Redireciona para login já com o email preenchido na URL
    router.push(`/login?email=${encodeURIComponent(email)}`);
  };

  const handleAddAccount = async () => {
    await logout();
    router.push("/login");
  };

  // Filtra a lista para não mostrar o usuário logado atualmente nas opções de troca
  const otherAccounts = savedAccounts.filter((acc) => acc.email !== user.email);

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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.nome} />
                    ) : null}
                    <AvatarFallback
                      className={`rounded-lg ${roleColors[user.role]}`}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.nome}</span>
                    <span className="truncate text-xs text-muted-foreground capitalize">
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback
                        className={`rounded-lg ${roleColors[user.role]}`}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.nome}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* --- SEÇÃO DE TROCA DE CONTAS --- */}
                {otherAccounts.length > 0 && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                        Alternar conta
                      </DropdownMenuLabel>
                      {otherAccounts.map((acc) => (
                        <DropdownMenuItem
                          key={acc.email}
                          onClick={() => handleSwitchAccount(acc.email)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 rounded-md border">
                              <AvatarFallback
                                className={`text-[10px] ${roleColors[acc.role]}`}
                              >
                                {acc.nome.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">
                                {acc.nome}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-30">
                                {acc.email}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem
                  onClick={handleAddAccount}
                  className="cursor-pointer"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar outra conta
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
