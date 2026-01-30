"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileSpreadsheet,
  Search,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  LayoutList,
  LayoutGrid,
  AlertCircle,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

const ITEMS_PER_PAGE = 10;

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

  // =================================================================================
  // LÓGICA DE FILTRAGEM COM DATA AVANÇADA
  // =================================================================================
  const eventosFiltradosGlobalmente = useMemo(() => {
    return eventosLocais.filter((evento) => {
      // 1. Filtro de Data (Range)
      if (dateRange?.from) {
        const eventoDate = new Date(evento.dataHora);
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to || dateRange.from);

        if (!isWithinInterval(eventoDate, { start, end })) {
          return false;
        }
      }

      // 2. Filtro de Busca Texto (apenas na Lista Completa ou Lote Detalhado)
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const matches =
          evento.item?.nome.toLowerCase().includes(s) ||
          evento.item?.codigoInterno.toLowerCase().includes(s) ||
          evento.criadoPor.nome.toLowerCase().includes(s);
        if (!matches) return false;
      }

      // 3. Filtro Status (apenas na Lista Completa)
      if (viewMode === "lista-completa" && statusFilter !== "todos") {
        if (evento.status !== statusFilter) return false;
      }

      return true;
    });
  }, [eventosLocais, dateRange, globalSearch, statusFilter, viewMode]);

  // =================================================================================
  // LÓGICA DE AGRUPAMENTO (VISÃO PASTAS)
  // =================================================================================
  const lotesDiarios = useMemo(() => {
    // Se estiver em modo lista, não calcula lotes pra economizar
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

  // =================================================================================
  // PAGINAÇÃO
  // =================================================================================
  // Dados finais a serem exibidos (paginados)
  const dadosPaginados = useMemo(() => {
    let dados: any[] = [];

    if (loteSelecionado) {
      // Se tiver lote selecionado, a fonte é o lote (filtrado pela busca local se houver)
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
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = dados.slice(startIndex, endIndex);

    return { currentItems, totalPages, totalItems };
  }, [
    loteSelecionado,
    viewMode,
    lotesDiarios,
    eventosFiltradosGlobalmente,
    currentPage,
    globalSearch,
  ]);

  // =================================================================================
  // AÇÕES
  // =================================================================================
  const handleStatusChange = (eventoId: string, novoStatus: EventoStatus) => {
    setEventosLocais((prev) =>
      prev.map((ev) => {
        if (ev.id === eventoId) {
          return { ...ev, status: novoStatus };
        }
        return ev;
      }),
    );

    // Se estivermos vendo um lote, precisamos atualizar o estado do lote selecionado também para refletir na UI
    if (loteSelecionado) {
      setLoteSelecionado((prev) => {
        if (!prev) return null;
        const novosEventos = prev.eventos.map((ev) =>
          ev.id === eventoId ? { ...ev, status: novoStatus } : ev,
        );

        // Recalcula status do lote
        let statusLote: BatchStatus = "pendente";
        const todosOk = novosEventos.every((e) =>
          ["aprovado", "exportado"].includes(e.status),
        );
        const temRejeitado = novosEventos.some((e) => e.status === "rejeitado");
        if (todosOk) statusLote = "aprovado";
        else if (temRejeitado) statusLote = "rejeitado";

        return { ...prev, eventos: novosEventos, status: statusLote };
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

    // Atualiza lote selecionado visualmente
    setLoteSelecionado((prev) =>
      prev
        ? {
            ...prev,
            eventos: prev.eventos.map((e) => ({ ...e, status: "aprovado" })),
            status: "aprovado",
          }
        : null,
    );

    toast.success("Todos os itens do lote foram aprovados!");
  };

  if (!hasPermission("eventos:ver_todos")) return null;

  // Componente de Paginação Reutilizável
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
          Anterior
        </Button>
        <div className="inline-flex items-center px-2 text-sm font-medium">
          Página {currentPage} de {Math.max(1, dadosPaginados.totalPages)}
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
          Próximo
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // =================================================================================
  // RENDER: DETALHE DO LOTE (MODO AUDITORIA)
  // =================================================================================
  if (loteSelecionado) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLoteSelecionado(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3">
                Registro: {loteSelecionado.data}
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
              <p className="text-muted-foreground">
                Autor: {loteSelecionado.autor} • Total:{" "}
                {formatCurrency(loteSelecionado.totalCusto)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar neste lote..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            {loteSelecionado.status === "pendente" && (
              <Button
                onClick={handleAprovarLoteInteiro}
                className="bg-success hover:bg-success/90 text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Aprovar Tudo
              </Button>
            )}
          </div>
        </div>

        <div className="border rounded-md bg-card shadow-sm">
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
                  <TableCell className="font-medium">
                    {evento.item?.nome}
                    {evento.motivo && (
                      <p className="text-xs text-muted-foreground font-normal">
                        Motivo: {evento.motivo}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {evento.quantidade} {evento.unidade}
                  </TableCell>
                  <TableCell className="text-right font-medium">
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
                        className={`h-8 w-full ${getStatusColor(evento.status)} border-transparent`}
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Histórico de Perdas
          </h1>
          <p className="text-muted-foreground">
            {viewMode === "pastas"
              ? "Lotes agrupados por dia"
              : "Todos os registros detalhados"}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === "pastas" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("pastas")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Lotes
          </Button>
          <Button
            variant={viewMode === "lista-completa" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("lista-completa")}
            className="gap-2"
          >
            <LayoutList className="h-4 w-4" />
            Lista
          </Button>
        </div>
      </div>

      {/* BARRA DE FILTROS AVANÇADA */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
        {/* Filtro de Data (Comum a ambos) */}
        <div className="w-full md:w-75">
          <span className="text-xs font-medium mb-1.5 block text-muted-foreground">
            Período
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione uma data ou período</span>
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

        {viewMode === "lista-completa" && (
          <>
            <div className="flex-1 w-full">
              <span className="text-xs font-medium mb-1.5 block text-muted-foreground">
                Buscar
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Item, código ou autor..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full md:w-40">
              <span className="text-xs font-medium mb-1.5 block text-muted-foreground">
                Status
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
          </>
        )}

        {/* Botão limpar filtros */}
        {(dateRange || globalSearch || statusFilter !== "todos") && (
          <Button
            variant="ghost"
            onClick={() => {
              setDateRange(undefined);
              setGlobalSearch("");
              setStatusFilter("todos");
            }}
            className="text-muted-foreground"
          >
            Limpar
          </Button>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {viewMode === "pastas" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dadosPaginados.currentItems.map((lote: LoteDiario) => (
              <Card
                key={lote.data}
                className="hover:border-primary/50 transition-all cursor-pointer group hover:shadow-md"
                onClick={() => setLoteSelecionado(lote)}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  {lote.status === "aprovado" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : lote.status === "rejeitado" ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">
                      Dia
                    </p>
                    <h3 className="text-lg font-bold tracking-tight">
                      {lote.data}
                    </h3>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {lote.eventos.length} itens
                      </p>
                      <p className="font-semibold text-sm">
                        {formatCurrency(lote.totalCusto)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      Abrir
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {dadosPaginados.totalItems === 0 && (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhum lote encontrado neste período.
            </div>
          )}
          <PaginationControls />
        </>
      ) : (
        <div className="border rounded-md bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
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
                  <TableCell className="text-xs whitespace-nowrap">
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
