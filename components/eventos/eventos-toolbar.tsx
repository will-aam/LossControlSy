// componentes/eventos/eventos-toolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Search, LayoutList, LayoutGrid, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "pastas" | "lista-completa";

interface EventosToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
}

export function EventosToolbar({
  viewMode,
  setViewMode,
  globalSearch,
  setGlobalSearch,
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
}: EventosToolbarProps) {
  // Componente interno para o filtro de data
  const DateFilter = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 border-dashed text-xs px-3 w-full justify-start text-left font-normal",
            !dateRange && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "dd/MM/yy")} -{" "}
                {format(dateRange.to, "dd/MM/yy")}
              </>
            ) : (
              format(dateRange.from, "dd/MM/yyyy")
            )
          ) : (
            <span>Período</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar mês..." />
          <CommandList>
            <CommandEmpty>Nenhum período.</CommandEmpty>
            <CommandGroup heading="Atalhos">
              <CommandItem
                onSelect={() =>
                  setDateRange({
                    from: startOfMonth(new Date()),
                    to: endOfMonth(new Date()),
                  })
                }
              >
                Este Mês
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  setDateRange({
                    from: startOfMonth(subMonths(new Date(), 1)),
                    to: endOfMonth(subMonths(new Date(), 1)),
                  })
                }
              >
                Mês Passado
              </CommandItem>
              <CommandItem onSelect={() => setDateRange(undefined)}>
                Limpar Filtro
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <div className="p-2">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
                locale={ptBR}
              />
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex flex-col gap-4 shrink-0">
      {/* Linha Superior: Título e Alternância de Visualização */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Histórico de Perdas
          </h1>
          <p className="text-muted-foreground">
            Gerencie e audite os registros de perdas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-2 text-xs hover:bg-background/60",
                viewMode === "pastas" &&
                  "bg-background shadow-sm text-foreground hover:bg-background",
              )}
              onClick={() => {
                setViewMode("pastas");
                // Opcional: resetar dataRange ao mudar para pastas se desejar comportamento original
                setDateRange(undefined);
              }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Lotes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-2 text-xs hover:bg-background/60",
                viewMode === "lista-completa" &&
                  "bg-background shadow-sm text-foreground hover:bg-background",
              )}
              onClick={() => setViewMode("lista-completa")}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Lista
            </Button>
          </div>
        </div>
      </div>

      {/* Linha Inferior: Filtros */}
      <div className="flex flex-col md:flex-row gap-3 items-end bg-background z-10 py-1">
        {/* Busca Global */}
        <div className="flex-1 w-full">
          <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
            Buscar
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nome, código ou autor..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Filtro de Status */}
        <div className="w-full md:w-48">
          <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
            Status
          </span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Data */}
        <div className="w-full md:w-auto min-w-35">
          <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
            Período
          </span>
          <DateFilter />
        </div>

        {/* Botão Limpar */}
        {(dateRange || globalSearch || statusFilter !== "todos") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateRange(undefined);
              setGlobalSearch("");
              setStatusFilter("todos");
            }}
            className="text-muted-foreground h-9 self-end"
          >
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
