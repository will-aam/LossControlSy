"use client";

import React from "react"; // Import necessário para usar React.Fragment
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";

const pathTitles: Record<string, string> = {
  dashboard: "Dashboard",
  eventos: "Eventos",
  novo: "Registrar Perda",
  catalogo: "Catálogo",
  galeria: "Galeria",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
};

export function Header() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {pathSegments.map((segment, index) => {
            const isLast = index === pathSegments.length - 1;
            const href = "/" + pathSegments.slice(0, index + 1).join("/");
            const title = pathTitles[segment] || segment;

            // Correção: Usamos React.Fragment para colocar o Item e o Separador como irmãos,
            // evitando que um <li> fique dentro de outro <li>.
            return (
              <React.Fragment key={href}>
                <BreadcrumbItem>
                  {!isLast ? (
                    <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{title}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {/* O separador agora fica fora do BreadcrumbItem */}
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
