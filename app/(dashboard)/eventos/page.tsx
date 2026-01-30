"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Calendar } from "@/components/ui/calendar";
import {
  mockEventos,
  Evento,
  formatCurrency,
  formatDate,
  getStatusColor,
  EventoStatus,
} from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import {
  FileText,
  Search,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  LayoutList,
  LayoutGrid,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronRightSquare,
  ListFilter,
} from "lucide-react";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Tipos
type ViewMode = "pastas" | "lista-completa";
type BatchStatus = "pendente" | "aprovado" | "rejeitado";

interface LoteDiario {
  data: string;
  dataOriginal: Date;
  eventos: Evento[];
  totalCusto: number;
  status: BatchStatus;
  autor: string;
}

// Classe utilitária para esconder scrollbar mantendo funcionalidade
const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function EventosPage() {
  const { hasPermission } = useAuth();

  // Estados de Navegação e Filtro
  const [viewMode, setViewMode] = useState<ViewMode>("pastas");
  const [loteSelecionado, setLoteSelecionado] = useState<LoteDiario | null>(
    null,
  );

  // Filtros
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Dados Locais
  const [eventosLocais, setEventosLocais] = useState<Evento[]>(mockEventos);

  // Resetar página quando mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, dateRange, globalSearch, statusFilter, loteSelecionado]);

  // Lógica de Filtragem
  const eventosFiltradosGlobalmente = useMemo(() => {
    return eventosLocais.filter((evento) => {
      // 1. Data
      if (dateRange?.from) {
        const eventoDate = new Date(evento.dataHora);
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to || dateRange.from);
        if (!isWithinInterval(eventoDate, { start, end })) return false;
      }
      // 2. Busca Texto
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const matches =
          evento.item?.nome.toLowerCase().includes(s) ||
          evento.item?.codigoInterno.toLowerCase().includes(s) ||
          evento.criadoPor.nome.toLowerCase().includes(s);
        if (!matches) return false;
      }
      // 3. Status
      if (viewMode === "lista-completa" && statusFilter !== "todos") {
        if (evento.status !== statusFilter) return false;
      }
      return true;
    });
  }, [eventosLocais, dateRange, globalSearch, statusFilter, viewMode]);

  // Lógica de Agrupamento (Lotes)
  const lotesDiarios = useMemo(() => {
    if (viewMode === "lista-completa") return [];

    const grupos: Record<string, Evento[]> = {};

    eventosFiltradosGlobalmente.forEach((evento) => {
      const dataFormatada = formatDate(evento.dataHora);
      if (!grupos[dataFormatada]) grupos[dataFormatada] = [];
      grupos[dataFormatada].push(evento);
    });

    return Object.entries(grupos)
      .map(([data, eventos]) => {
        let status: BatchStatus = "pendente";
        const todosOk = eventos.every((e) =>
          ["aprovado", "exportado"].includes(e.status),
        );
        const temRejeitado = eventos.some((e) => e.status === "rejeitado");

        if (todosOk) status = "aprovado";
        else if (temRejeitado) status = "rejeitado";

        return {
          data,
          dataOriginal: new Date(eventos[0].dataHora),
          eventos,
          totalCusto: eventos.reduce(
            (acc, e) => acc + (e.custoSnapshot || 0) * e.quantidade,
            0,
          ),
          status,
          autor: eventos[0].criadoPor.nome,
        } as LoteDiario;
      })
      .sort((a, b) => b.dataOriginal.getTime() - a.dataOriginal.getTime());
  }, [eventosFiltradosGlobalmente, viewMode]);

  // Paginação
  const dadosPaginados = useMemo(() => {
    let dados: any[] = [];
    const itemsPerPage = viewMode === "pastas" && !loteSelecionado ? 10 : 5; // Lotes lista 10, Tabela lista 5

    if (loteSelecionado) {
      dados = loteSelecionado.eventos.filter((e) => {
        if (!globalSearch) return true;
        const s = globalSearch.toLowerCase();
        return (
          e.item?.nome.toLowerCase().includes(s) ||
          e.item?.codigoInterno.toLowerCase().includes(s)
        );
      });
    } else if (viewMode === "pastas") {
      dados = lotesDiarios;
    } else {
      dados = eventosFiltradosGlobalmente;
    }

    const totalItems = dados.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = dados.slice(startIndex, endIndex);

    return { currentItems, totalPages, totalItems, itemsPerPage };
  }, [
    loteSelecionado,
    viewMode,
    lotesDiarios,
    eventosFiltradosGlobalmente,
    currentPage,
    globalSearch,
  ]);

  // Ações
  const handleStatusChange = (eventoId: string, novoStatus: EventoStatus) => {
    setEventosLocais((prev) =>
      prev.map((ev) =>
        ev.id === eventoId ? { ...ev, status: novoStatus } : ev,
      ),
    );
    if (loteSelecionado) {
      setLoteSelecionado((prev) => {
        if (!prev) return null;
        const novosEventos = prev.eventos.map((ev) =>
          ev.id === eventoId ? { ...ev, status: novoStatus } : ev,
        );
        // Recalcula status simples
        const todosOk = novosEventos.every((e) =>
          ["aprovado", "exportado"].includes(e.status),
        );
        const temRejeitado = novosEventos.some((e) => e.status === "rejeitado");
        const status = todosOk
          ? "aprovado"
          : temRejeitado
            ? "rejeitado"
            : "pendente";
        return { ...prev, eventos: novosEventos, status };
      });
    }
    toast.success("Status atualizado");
  };

  const handleAprovarLoteInteiro = () => {
    if (!loteSelecionado) return;
    const novosEventos = eventosLocais.map((ev) => {
      if (loteSelecionado.eventos.some((le) => le.id === ev.id)) {
        return { ...ev, status: "aprovado" as EventoStatus };
      }
      return ev;
    });
    setEventosLocais(novosEventos);
    setLoteSelecionado((prev) =>
      prev
        ? {
            ...prev,
            eventos: prev.eventos.map((e) => ({ ...e, status: "aprovado" })),
            status: "aprovado",
          }
        : null,
    );
    toast.success("Lote aprovado!");
  };

  if (!hasPermission("eventos:ver_todos")) return null;

  // Componente de Paginação
  const PaginationControls = () => (
    <div className="flex items-center justify-end space-x-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        Mostrando {dadosPaginados.currentItems.length} de{" "}
        {dadosPaginados.totalItems} registros
      </div>
      <div className="space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="inline-flex items-center px-2 text-sm font-medium">
          {currentPage} / {Math.max(1, dadosPaginados.totalPages)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCurrentPage((p) => Math.min(dadosPaginados.totalPages, p + 1))
          }
          disabled={
            currentPage === dadosPaginados.totalPages ||
            dadosPaginados.totalPages === 0
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // =================================================================================
  // RENDER: DETALHE DO LOTE
  // =================================================================================
  if (loteSelecionado) {
    return (
      <div
        className={`space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ${hideScrollClass}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLoteSelecionado(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-3">
                {loteSelecionado.data}
                <Badge
                  variant={
                    loteSelecionado.status === "aprovado"
                      ? "default"
                      : loteSelecionado.status === "rejeitado"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {loteSelecionado.status.toUpperCase()}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Autor: {loteSelecionado.autor} • Total:{" "}
                {formatCurrency(loteSelecionado.totalCusto)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar no lote..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {loteSelecionado.status === "pendente" && (
              <Button
                onClick={handleAprovarLoteInteiro}
                className="bg-success hover:bg-success/90 text-white h-9"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aprovar Tudo
              </Button>
            )}
          </div>
        </div>

        <div className="border rounded-md bg-background shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-45">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosPaginados.currentItems.map((evento: Evento) => (
                <TableRow key={evento.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {evento.item?.codigoInterno}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {evento.item?.nome}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {evento.quantidade} {evento.unidade}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(
                      (evento.custoSnapshot || 0) * evento.quantidade,
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={evento.status}
                      onValueChange={(v) =>
                        handleStatusChange(evento.id, v as EventoStatus)
                      }
                    >
                      <SelectTrigger
                        className={`h-8 w-full ${getStatusColor(evento.status)} border-transparent text-xs`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="rejeitado">Rejeitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationControls />
      </div>
    );
  }

  // =================================================================================
  // RENDER: PÁGINA PRINCIPAL
  // =================================================================================
  return (
    <div className={`space-y-6 ${hideScrollClass}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Histórico de Perdas
          </h1>
          <p className="text-muted-foreground">
            Gerencie e audite os registros de perdas.
          </p>
        </div>

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
              // Reseta filtros ao trocar de modo se necessário, mas data pode manter
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

      {/* ÁREA DE FILTROS */}
      <div className="flex flex-col gap-4">
        {/* MODO PASTAS: Filtro de Data Global aparece aqui */}
        {viewMode === "pastas" && (
          <div className="w-full md:w-75">
            <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
              Período
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !dateRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}{" "}
                        - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione uma data...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* MODO LISTA: Filtros de Busca e Status (Data foi para a Tabela) */}
        {viewMode === "lista-completa" && (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
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
          </div>
        )}

        {/* Botão limpar filtros */}
        {(dateRange || globalSearch || statusFilter !== "todos") && (
          <div className="flex justify-start">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setDateRange(undefined);
                setGlobalSearch("");
                setStatusFilter("todos");
              }}
              className="text-muted-foreground h-auto p-0 px-1"
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {viewMode === "pastas" ? (
        // === VIEW 1: LOTES RETANGULARES ===
        <>
          <div className="flex flex-col gap-2">
            {dadosPaginados.currentItems.map((lote: LoteDiario) => (
              <div
                key={lote.data}
                className="group flex items-center justify-between p-3 rounded-md border bg-background hover:bg-muted/40 hover:border-primary/30 transition-all cursor-pointer shadow-sm"
                onClick={() => setLoteSelecionado(lote)}
              >
                {/* Esquerda: Data e Status */}
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border",
                      lote.status === "aprovado"
                        ? "bg-success/10 text-success border-success/20"
                        : lote.status === "rejeitado"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{lote.data}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{lote.autor}</span>
                      <span>•</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 px-1 text-[10px] border-0 bg-transparent p-0 font-normal",
                          lote.status === "aprovado"
                            ? "text-success"
                            : lote.status === "rejeitado"
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {lote.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Direita: Valores e Seta */}
                <div className="flex items-center gap-6 md:gap-12">
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Itens
                    </p>
                    <p className="text-sm font-medium">{lote.eventos.length}</p>
                  </div>
                  <div className="text-right min-w-20">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Total
                    </p>
                    <p className="text-sm font-bold">
                      {formatCurrency(lote.totalCusto)}
                    </p>
                  </div>
                  <ChevronRightSquare className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </div>
              </div>
            ))}
          </div>
          {dadosPaginados.totalItems === 0 && (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/5">
              Nenhum lote encontrado.
            </div>
          )}
          <PaginationControls />
        </>
      ) : (
        // === VIEW 2: LISTA COMPLETA ===
        <div className="border rounded-md bg-background shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                {/* COLUNA DATA AGORA É O FILTRO */}
                <TableHead className="w-45">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 gap-2 font-semibold text-xs hover:bg-muted/80"
                      >
                        Data
                        <ListFilter className="h-3.5 w-3.5" />
                        {dateRange && (
                          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </TableHead>

                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-45">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosPaginados.currentItems.map((evento: Evento) => (
                <TableRow key={evento.id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDate(evento.dataHora)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {evento.item?.codigoInterno}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {evento.item?.nome}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {evento.quantidade} {evento.unidade}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(
                      (evento.custoSnapshot || 0) * evento.quantidade,
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={evento.status}
                      onValueChange={(v) =>
                        handleStatusChange(evento.id, v as EventoStatus)
                      }
                    >
                      <SelectTrigger
                        className={`h-8 w-full ${getStatusColor(evento.status)} border-transparent text-xs`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="rejeitado">Rejeitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {dadosPaginados.totalItems === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum item corresponde aos filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="border-t px-4">
            <PaginationControls />
          </div>
        </div>
      )}
    </div>
  );
}
