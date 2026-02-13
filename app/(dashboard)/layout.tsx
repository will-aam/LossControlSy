import React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />

      {/* SidebarInset é o container do conteúdo principal */}
      <SidebarInset>
        {/* CABEÇALHO MOBILE - Só aparece em telas pequenas (md:hidden) */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          {/* Lado Esquerdo: Botão do Menu */}
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>

          {/* Centro: Título do App */}
          <div className="font-semibold text-sm">Loss Control</div>

          {/* Lado Direito: Espaço vazio para manter o título centralizado ou avatar futuro */}
          <div className="w-8" />
        </header>

        {/* Conteúdo da Página */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
