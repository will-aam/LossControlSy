"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Package, X, Barcode, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Item, mockItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ItemSearchProps {
  onSelect: (item: Item | null) => void;
  selectedItem: Item | null;
  className?: string;
}

// Busca tolerante a falhas (typos)
function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText.includes(lowerQuery)) return true;

  let textIndex = 0;
  for (let i = 0; i < lowerQuery.length; i++) {
    const char = lowerQuery[i];
    const foundIndex = lowerText.indexOf(char, textIndex);
    if (foundIndex === -1) return false;
    textIndex = foundIndex + 1;
  }
  return true;
}

export function ItemSearch({
  onSelect,
  selectedItem,
  className,
}: ItemSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    if (!query.trim())
      return mockItems.filter((i) => i.status === "ativo").slice(0, 5);

    return mockItems
      .filter((item) => {
        if (item.status !== "ativo") return false;
        return (
          fuzzyMatch(item.nome, query) ||
          fuzzyMatch(item.codigoInterno, query) ||
          (item.codigoBarras && fuzzyMatch(item.codigoBarras, query))
        );
      })
      .slice(0, 8);
  }, [query]);

  const handleSelect = (item: Item) => {
    onSelect(item);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
  };

  // MODO VISUALIZAÇÃO (ITEM SELECIONADO)
  // Agora é compacto, parece um Input, não um Card gigante
  if (selectedItem) {
    return (
      <div className={cn("relative flex items-center", className)}>
        <div className="flex h-10 w-full items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm ring-offset-background">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Check className="h-3 w-3 text-primary" />
            </div>
            <span className="truncate font-medium">{selectedItem.nome}</span>
            <span className="text-muted-foreground hidden sm:inline-block">
              ({selectedItem.codigoInterno})
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 ml-2 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // MODO BUSCA
  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Busque por nome ou código..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-100">
          <ScrollArea className="max-h-70">
            {filteredItems.length > 0 ? (
              <div className="p-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent transition-colors group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-muted group-hover:bg-background transition-colors border">
                      {item.imagemUrl ? (
                        <img
                          src={item.imagemUrl}
                          alt=""
                          className="h-full w-full object-cover rounded"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {item.nome}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{item.codigoInterno}</span>
                        {item.codigoBarras && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <Barcode className="h-3 w-3" />
                            <span>{item.codigoBarras}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5"
                    >
                      {item.unidade}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum item encontrado.
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
