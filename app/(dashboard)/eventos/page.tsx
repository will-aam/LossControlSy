"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
// Importações corrigidas
import { Evento, EventoStatus } from "@/lib/types";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { StorageService } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import {
  FileText,
  Search,
  ArrowLeft,
  CheckCircle2,
  LayoutList,
  LayoutGrid,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronRightSquare,
  Download,
  AlertTriangle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Plus,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import {
  isWithinInterval,
  startOfDay,
  endOfDay,
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
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

  // Dados Locais (Inicialmente vazio)
  const [eventosLocais, setEventosLocais] = useState<Evento[]>([]);

  // Configurações de Segurança
  const [settings, setSettings] = useState<any>({ bloquearAprovados: false });

  // Ações
  const [eventoToDelete, setEventoToDelete] = useState<string | null>(null);

  // Carregar dados do Storage
  useEffect(() => {
    setEventosLocais(StorageService.getEventos());
    setSettings(StorageService.getSettings());
  }, []);

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
      // 2. Busca Texto (Nome ou Código)
      if (globalSearch) {
        const s = globalSearch.toLowerCase();
        const matches =
          (evento.item?.nome || "").toLowerCase().includes(s) ||
          (evento.item?.codigoInterno || "").toLowerCase().includes(s) ||
          evento.criadoPor.nome.toLowerCase().includes(s);
        if (!matches) return false;
      }
      // 3. Status (Agora aplica em AMBOS os modos se selecionado)
      if (statusFilter !== "todos") {
        // Mapeamento visual: 'pendente' na UI = 'enviado' no banco
        const targetStatus =
          statusFilter === "pendente" ? "enviado" : statusFilter;
        if (evento.status !== targetStatus) return false;
      }
      return true;
    });
  }, [eventosLocais, dateRange, globalSearch, statusFilter]);

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
    const itemsPerPage = viewMode === "pastas" && !loteSelecionado ? 10 : 15; // Mais itens na lista

    if (loteSelecionado) {
      dados = loteSelecionado.eventos.filter((e) => {
        if (!globalSearch) return true;
        const s = globalSearch.toLowerCase();
        return (
          (e.item?.nome || "").toLowerCase().includes(s) ||
          (e.item?.codigoInterno || "").toLowerCase().includes(s)
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
  const handleStatusChange = (eventoId: string, novoStatus: string) => {
    const statusTyped = novoStatus as EventoStatus;

    // Atualiza estado local
    const novosEventos = eventosLocais.map((ev) =>
      ev.id === eventoId ? { ...ev, status: statusTyped } : ev,
    );
    setEventosLocais(novosEventos);

    // Salva no Storage
    const eventoAlterado = novosEventos.find((ev) => ev.id === eventoId);
    if (eventoAlterado) StorageService.saveEvento(eventoAlterado);

    // Atualiza lote selecionado se existir
    if (loteSelecionado) {
      setLoteSelecionado((prev) => {
        if (!prev) return null;
        const eventosLote = prev.eventos.map((ev) =>
          ev.id === eventoId ? { ...ev, status: statusTyped } : ev,
        );

        const todosOk = eventosLote.every((e) =>
          ["aprovado", "exportado"].includes(e.status),
        );
        const temRejeitado = eventosLote.some((e) => e.status === "rejeitado");
        const status = todosOk
          ? "aprovado"
          : temRejeitado
            ? "rejeitado"
            : "pendente";

        return { ...prev, eventos: eventosLote, status };
      });
    }
    toast.success("Status atualizado");
  };

  const handleAprovarLoteInteiro = () => {
    if (!loteSelecionado) return;

    const novosEventos = eventosLocais.map((ev) => {
      if (loteSelecionado.eventos.some((le) => le.id === ev.id)) {
        const atualizado = { ...ev, status: "aprovado" as EventoStatus };
        // Salva cada um no storage
        StorageService.saveEvento(atualizado);
        return atualizado;
      }
      return ev;
    });

    setEventosLocais(novosEventos);
    setLoteSelecionado((prev) =>
      prev
        ? {
            ...prev,
            eventos: prev.eventos.map((e) => ({
              ...e,
              status: "aprovado" as EventoStatus,
            })),
            status: "aprovado",
          }
        : null,
    );
    toast.success("Lote aprovado!");
  };

  // --- FUNÇÃO DE EXPORTAÇÃO CSV ---
  const handleExportar = () => {
    if (!loteSelecionado) return;

    // 1. Validar se todos estão aprovados
    const todosAprovados = loteSelecionado.eventos.every(
      (e) => e.status === "aprovado" || e.status === "exportado",
    );

    if (!todosAprovados) {
      toast.error("Exportação bloqueada", {
        description: "Todos os itens do lote precisam estar APROVADOS.",
      });
      return;
    }

    // 2. Montar cabeçalhos (Ponto e vírgula para Excel Brasil)
    const headers = [
      "Item",
      "Código Interno",
      "Código de Barras",
      "Categoria",
      "Unidade",
      "Quantidade",
      "Custo Unitário",
      "Custo Total",
      "Venda Unitária",
      "Venda Total",
    ];

    // 3. Montar linhas
    const rows = loteSelecionado.eventos.map((ev) => {
      const custoUnit = ev.custoSnapshot || 0;
      const vendaUnit = ev.precoVendaSnapshot || 0;
      const custoTotal = custoUnit * ev.quantidade;
      const vendaTotal = vendaUnit * ev.quantidade;

      // Função para limpar string e evitar quebrar o CSV
      const clean = (str: string | undefined) =>
        `"${(str || "").replace(/"/g, '""')}"`;

      // Formatar número para padrão BR (com vírgula) se desejar, ou manter ponto
      // Para CSV universal, manter ponto é mais seguro, mas Excel BR prefere vírgula.
      // Vamos usar replace('.', ',') para compatibilidade com Excel em PT-BR.
      const fmtNum = (num: number) => num.toFixed(2).replace(".", ",");

      return [
        clean(ev.item?.nome),
        clean(ev.item?.codigoInterno),
        clean(ev.item?.codigoBarras),
        clean(ev.item?.categoria),
        clean(ev.unidade),
        ev.quantidade.toString().replace(".", ","),
        fmtNum(custoUnit),
        fmtNum(custoTotal),
        fmtNum(vendaUnit),
        fmtNum(vendaTotal),
      ].join(";");
    });

    // 4. Criar Blob com BOM para acentos funcionarem no Excel
    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // 5. Download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `perdas_${loteSelecionado.data.replace(/\//g, "-")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Opcional: Marcar como exportado
    // handleStatusChange(ev.id, 'exportado') ... se desejar mudar o status após baixar
    toast.success("Arquivo CSV baixado com sucesso!");
  };

  const confirmDelete = () => {
    if (eventoToDelete) {
      const evento = eventosLocais.find((e) => e.id === eventoToDelete);
      if (
        evento &&
        settings?.bloquearAprovados &&
        evento.status === "aprovado"
      ) {
        toast.error("Ação bloqueada pelas configurações de segurança.");
        setEventoToDelete(null);
        return;
      }

      const novosEventos = eventosLocais.filter((e) => e.id !== eventoToDelete);
      setEventosLocais(novosEventos);

      // Simulação de persistência
      StorageService.saveEvento({ ...evento, status: "rejeitado" } as Evento); // Ou realmente deletar do storage se tiver método

      toast.success("Evento excluído");
      setEventoToDelete(null);

      if (loteSelecionado) {
        setLoteSelecionado((prev) =>
          prev
            ? {
                ...prev,
                eventos: prev.eventos.filter((e) => e.id !== eventoToDelete),
              }
            : null,
        );
      }
    }
  };

  if (!hasPermission("eventos:ver_todos")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  // Componente de Paginação
  const PaginationControls = () => (
    <div className="flex items-center justify-between py-2 border-t mt-auto shrink-0">
      <div className="text-xs text-muted-foreground">
        Mostrando {dadosPaginados.currentItems.length} de{" "}
        {dadosPaginados.totalItems} registros
      </div>
      <div className="space-x-2 flex items-center">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs font-medium w-16 text-center">
          {currentPage} / {Math.max(1, dadosPaginados.totalPages)}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
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

  // Componente de Filtro de Data
  const DateFilter = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 border-dashed text-xs px-3",
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
          <CommandList className={hideScrollClass}>
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

  // RENDER DETALHE DO LOTE
  if (loteSelecionado) {
    const isLoteAprovado = loteSelecionado.status === "aprovado";

    return (
      <div
        className={`flex flex-col h-[calc(100vh-2rem)] space-y-4 ${hideScrollClass}`}
      >
        <div className="flex items-center justify-between shrink-0">
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
                Autor: {loteSelecionado.autor}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* BOTÃO EXPORTAR: Só aparece aqui e só habilita se aprovado */}
            {hasPermission("eventos:exportar") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportar}
                disabled={!isLoteAprovado} // Desabilita visualmente se não estiver aprovado
                className={
                  !isLoteAprovado ? "opacity-50 cursor-not-allowed" : ""
                }
                title={
                  !isLoteAprovado ? "Aprove todos os itens para baixar" : ""
                }
              >
                <Download className="mr-2 h-4 w-4" /> Baixar CSV
              </Button>
            )}

            {loteSelecionado.status === "pendente" &&
              hasPermission("eventos:aprovar") && (
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

        <div className="flex-1 border rounded-md bg-card overflow-hidden relative shadow-sm">
          <div
            className={`absolute inset-0 overflow-y-auto ${hideScrollClass}`}
          >
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 bg-card z-20 shadow-sm">
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-45">Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPaginados.currentItems.map((evento: Evento) => {
                  const isLocked =
                    settings?.bloquearAprovados && evento.status === "aprovado";
                  return (
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
                        {/* Select de Status - Desabilitado para Fiscal */}
                        <Select
                          value={
                            evento.status === "enviado"
                              ? "pendente"
                              : evento.status
                          }
                          onValueChange={(v) =>
                            handleStatusChange(
                              evento.id,
                              v === "pendente" ? "enviado" : v,
                            )
                          }
                          disabled={
                            isLocked || !hasPermission("eventos:editar")
                          }
                        >
                          <SelectTrigger
                            className={`h-8 w-full ${getStatusColor(evento.status)} border-transparent text-xs ${isLocked ? "opacity-70 cursor-not-allowed" : ""}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          {hasPermission("eventos:editar") && (
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="aprovado">Aprovado</SelectItem>
                              <SelectItem value="rejeitado">
                                Rejeitado
                              </SelectItem>
                            </SelectContent>
                          )}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                            </DropdownMenuItem>
                            {hasPermission("eventos:editar") && (
                              <DropdownMenuItem
                                disabled={isLocked}
                                title={isLocked ? "Bloqueado" : ""}
                              >
                                {isLocked ? (
                                  <Lock className="mr-2 h-4 w-4 opacity-50" />
                                ) : (
                                  <Edit className="mr-2 h-4 w-4" />
                                )}
                                <span className={isLocked ? "opacity-50" : ""}>
                                  Editar
                                </span>
                              </DropdownMenuItem>
                            )}
                            {hasPermission("eventos:excluir") && (
                              <DropdownMenuItem
                                className={`focus:text-destructive ${isLocked ? "opacity-50 cursor-not-allowed" : "text-destructive"}`}
                                disabled={isLocked}
                                onClick={() =>
                                  !isLocked && setEventoToDelete(evento.id)
                                }
                              >
                                {isLocked ? (
                                  <Lock className="mr-2 h-4 w-4" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
          </div>
        </div>
        <PaginationControls />

        {/* Alerta de Exclusão */}
        <AlertDialog
          open={!!eventoToDelete}
          onOpenChange={(open) => !open && setEventoToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso excluirá o registro de perda permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // RENDER PÁGINA PRINCIPAL
  return (
    <div
      className={`flex flex-col h-[calc(100vh-2rem)] space-y-4 overflow-hidden ${hideScrollClass}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Histórico de Perdas
          </h1>
          <p className="text-muted-foreground">
            Gerencie e audite os registros de perdas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* BOTÃO EXPORTAR REMOVIDO DAQUI (Só faz sentido dentro do lote) */}

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

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-3 items-end shrink-0 bg-background z-10 py-1">
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

        <div className="w-full md:w-auto">
          <span className="text-xs font-medium mb-1.5 block text-muted-foreground ml-1">
            Período
          </span>
          <DateFilter />
        </div>

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

      {/* CONTEÚDO */}
      <div className="flex-1 min-h-0 border rounded-md bg-card relative overflow-hidden shadow-sm">
        <div
          className={`absolute inset-0 overflow-y-auto ${hideScrollClass} p-2`}
        >
          {viewMode === "pastas" ? (
            <div className="flex flex-col gap-2">
              {dadosPaginados.currentItems.map((lote: LoteDiario) => (
                <div
                  key={lote.data}
                  className="group flex items-center justify-between p-3 rounded-md border bg-background hover:bg-muted/40 hover:border-primary/30 transition-all cursor-pointer shadow-sm"
                  onClick={() => setLoteSelecionado(lote)}
                >
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

                  <div className="flex items-center gap-6 md:gap-12">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Itens
                      </p>
                      <p className="text-sm font-medium">
                        {lote.eventos.length}
                      </p>
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
              {dadosPaginados.totalItems === 0 && (
                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                  Nenhum lote encontrado.
                </div>
              )}
            </div>
          ) : (
            // TABELA LISTA COMPLETA (MODO LISTA)
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-45">Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPaginados.currentItems.map((evento: Evento) => {
                  const isLocked =
                    settings?.bloquearAprovados && evento.status === "aprovado";
                  return (
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
                        <Badge
                          variant={
                            evento.status === "aprovado"
                              ? "default"
                              : evento.status === "rejeitado"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {evento.status === "enviado"
                            ? "Pendente"
                            : evento.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                            </DropdownMenuItem>
                            {hasPermission("eventos:editar") && (
                              <DropdownMenuItem
                                disabled={isLocked}
                                title={isLocked ? "Bloqueado" : ""}
                              >
                                {isLocked ? (
                                  <Lock className="mr-2 h-4 w-4 opacity-50" />
                                ) : (
                                  <Edit className="mr-2 h-4 w-4" />
                                )}
                                <span className={isLocked ? "opacity-50" : ""}>
                                  Editar
                                </span>
                              </DropdownMenuItem>
                            )}
                            {hasPermission("eventos:excluir") && (
                              <DropdownMenuItem
                                className={`focus:text-destructive ${isLocked ? "opacity-50 cursor-not-allowed" : "text-destructive"}`}
                                disabled={isLocked}
                                onClick={() =>
                                  !isLocked && setEventoToDelete(evento.id)
                                }
                              >
                                {isLocked ? (
                                  <Lock className="mr-2 h-4 w-4" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {dadosPaginados.totalItems === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum item corresponde aos filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
          )}
        </div>
      </div>

      <PaginationControls />

      {/* Alerta de Exclusão */}
      <AlertDialog
        open={!!eventoToDelete}
        onOpenChange={(open) => !open && setEventoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá o registro de perda permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
