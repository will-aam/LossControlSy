"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Plus,
  Image as ImageIcon,
  Menu,
  FileText,
  Store,
  Grid,
  AlertCircle,
  Settings,
  User,
  Calendar,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function BottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainNavItems = [
    { icon: LayoutDashboard, label: "Início", href: "/dashboard" },
    { icon: BarChart2, label: "Relatórios", href: "/relatorios" },
  ];

  const secondaryNavItems = [
    { icon: ImageIcon, label: "Galeria", href: "/galeria" },
  ];

  const moreMenuOptions = [
    { icon: Calendar, label: "Eventos", href: "/eventos" },
    { icon: Store, label: "Catálogo", href: "/catalogo" },
    { icon: Grid, label: "Categorias", href: "/categorias" },
    { icon: AlertCircle, label: "Motivos", href: "/motivos" },
    { icon: BarChart2, label: "Vendas", href: "/vendas" },
    { icon: Receipt, label: "NFe (Custos)", href: "/nfe-importacao" },
  ];

  const systemOptions = [
    { icon: Settings, label: "Configurações", href: "#" },
    { icon: User, label: "Perfil", href: "#" },
  ];

  // Hide bottom nav completely on the event creation page to give it full screen
  if (pathname === "/eventos/novo") {
    return null;
  }

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t pb-safe">
        <nav className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon size={22} className={isActive ? "fill-primary/20" : ""} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Botão Centralizado de Ação (Eventos) */}
          <div className="relative -top-5 flex justify-center w-full">
            <Link
              href="/eventos/novo"
              className={cn(
                "flex items-center justify-center w-14 h-14 rounded-full shadow-lg text-primary-foreground transition-transform hover:scale-105 active:scale-95",
                pathname === "/eventos/novo" ? "bg-primary/90 shadow-primary/40" : "bg-primary shadow-primary/30"
              )}
            >
              <Plus size={28} />
            </Link>
          </div>

          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon size={22} className={isActive ? "fill-primary/20" : ""} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Botão de Mais Opções */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isMenuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Menu size={22} />
                <span className="text-[10px] font-medium">Mais</span>
              </button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="rounded-t-2xl px-2 pb-6 max-h-[85vh]">
              <SheetHeader className="px-4 text-left border-b pb-4 mb-4">
                <SheetTitle>Mais Opções</SheetTitle>
              </SheetHeader>
              
              <div className="grid grid-cols-4 gap-4 px-2">
                {moreMenuOptions.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors",
                        isActive ? "bg-primary/15 text-primary" : "bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <item.icon size={24} className={isActive ? "text-primary" : ""} />
                      <span className="text-[10px] font-medium text-center">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 mb-2 border-t pt-4 px-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sistema</h4>
                <div className="space-y-1">
                  {systemOptions.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                        <item.icon size={18} />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </>
  );
}
