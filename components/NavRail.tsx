"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  User,
  Calendar,
  FileText,
  BarChart2,
  Grid,
  AlertCircle,
  Store,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarProvider";

export function NavRail() {
  const pathname = usePathname();
  const { navAberto: aberto } = useSidebar();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: FileText, label: "Notas", href: "/notas" },
    { icon: Store, label: "Catálogo", href: "/catalogo" },
    { icon: Grid, label: "Categorias", href: "/categorias" },
    { icon: AlertCircle, label: "Motivos", href: "/motivos" },
    { icon: BarChart2, label: "Relatórios", href: "/relatorios" },
    { icon: Calendar, label: "Eventos", href: "/eventos" },
    { icon: ImageIcon, label: "Galeria", href: "/galeria" },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out bg-background flex flex-col items-center py-4",
        aberto ? "w-56 items-start px-4" : "w-14 md:w-16 hidden md:flex"
      )}
    >
      <nav className="flex-1 w-full space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center p-3 rounded-xl transition-colors",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                aberto ? "justify-start gap-3 w-full" : "justify-center"
              )}
            >
              <item.icon size={20} />
              {aberto && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto w-full space-y-2 flex flex-col items-center">
        <button className={cn(
          "p-3 rounded-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors flex items-center",
          aberto ? "justify-start gap-3 w-full" : "justify-center"
        )}>
          <Settings size={20} />
          {aberto && <span className="font-medium">Configurações</span>}
        </button>
        <button className={cn(
          "p-3 rounded-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors flex items-center",
          aberto ? "justify-start gap-3 w-full" : "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center">
            <User size={16} />
          </div>
          {aberto && <span className="font-medium">Perfil</span>}
        </button>
      </div>
    </aside>
  );
}
