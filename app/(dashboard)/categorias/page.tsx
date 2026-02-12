"use client";

import { CategoriesManager } from "@/components/cadastros/categories-manager";
import { Separator } from "@/components/ui/separator";
import { FolderTree } from "lucide-react";

export default function CategoriasPage() {
  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-background">
      <main className="container mx-auto max-w-5xl space-y-6 p-4 md:py-8">
        {/* Cabeçalho Bonito */}
        {/* <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary/80">
            <FolderTree className="h-6 w-6" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Classificação & Atributos
            </h2>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Gerencie as categorias para organizar seu catálogo de produtos de
            forma eficiente.
          </p>
        </div> */}

        {/* <Separator /> */}

        {/* Área de Conteúdo */}
        <div className="space-y-6">
          {/* Card Explicativo (Estilo do Exemplo) */}
          <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-l-primary/50 flex flex-col gap-1">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FolderTree className="h-4 w-4" /> Gestão de Categorias
            </h3>
            <p className="text-xs text-muted-foreground">
              Crie grupos como "Bebidas", "Limpeza" ou "Mercearia" para
              facilitar a busca e relatórios.
            </p>
          </div>

          {/* O Gerenciador Real */}
          <CategoriesManager />
        </div>
      </main>
    </div>
  );
}
