"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Evento, EventoStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  getEventos,
  updateEventoStatus,
  deleteEvento,
  getNotaDoLote, // Importamos a nova função
} from "@/app/actions/eventos";

import {
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";

// Importando os novos componentes
import { EventosToolbar } from "@/components/eventos/eventos-toolbar";
import {
  EventosGrid,
  LoteDiario,
  BatchStatus,
} from "@/components/eventos/eventos-grid";
import { EventosTable } from "@/components/eventos/eventos-table";

type ViewMode = "pastas" | "lista-completa";

const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function EventosPage() {
  const { hasPermission, settings } = useAuth();

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

  // Dados do Banco
  const [eventosDoBanco, setEventosDoBanco] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ações
  const [eventoToDelete, setEventoToDelete] = useState<string | null>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await getEventos();

    if (result.success && result.data) {
      // Mapeamento para garantir compatibilidade
      const mappedEventos: Evento[] = (result.data as any[]).map((ev) => ({
        id: ev.id,
        dataHora: ev.dataHora,
        motivo: ev.motivo,
        status: ev.status as EventoStatus,
        quantidade: Number(ev.quantidade),
        unidade: ev.unidade,
        custoSnapshot: Number(ev.custoSnapshot),
        precoVendaSnapshot: Number(ev.precoVendaSnapshot),
        item: ev.item
          ? {
              id: ev.item.id,
              nome: ev.item.nome,
              codigoInterno: ev.item.codigoInterno,
              codigoBarras: ev.item.codigoBarras,
              categoria: ev.item.categoria?.nome || "Sem Categoria",
              unidade: ev.item.unidade,
              custo: Number(ev.item.custo),
              precoVenda: Number(ev.item.precoVenda),
              status: ev.item.status,
              imagemUrl: ev.item.imagemUrl,
            }
          : undefined,
        criadoPor: ev.criadoPor,
        evidencias: ev.evidencias,
      }));

      setEventosDoBanco(mappedEventos);
    } else {
      toast.error("Erro ao carregar eventos.");
    }
    setIsLoading(false);
  };

  // Resetar página quando mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, dateRange, globalSearch, statusFilter, loteSelecionado]);

  // Lógica de Filtragem
  const eventosFiltradosGlobalmente = useMemo(() => {
    return eventosDoBanco.filter((evento) => {
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
          evento.criadoPor?.nome.toLowerCase().includes(s);
        if (!matches) return false;
      }
      // 3. Status
      if (statusFilter !== "todos") {
        const targetStatus =
          statusFilter === "pendente" ? "enviado" : statusFilter;
        // Se filtro for pendente, aceita rascunho e enviado
        if (targetStatus === "enviado" && evento.status === "rascunho")
          return true;
        if (evento.status !== targetStatus) return false;
      }
      return true;
    });
  }, [eventosDoBanco, dateRange, globalSearch, statusFilter]);

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
          autor: eventos[0].criadoPor?.nome || "Sistema",
        } as LoteDiario;
      })
      .sort((a, b) => b.dataOriginal.getTime() - a.dataOriginal.getTime());
  }, [eventosFiltradosGlobalmente, viewMode]);

  // Paginação
  const dadosPaginados = useMemo(() => {
    let dados: any[] = [];
    const itemsPerPage = viewMode === "pastas" && !loteSelecionado ? 10 : 15;

    if (loteSelecionado) {
      const eventosAtualizadosDoLote = eventosFiltradosGlobalmente.filter(
        (e) => formatDate(e.dataHora) === loteSelecionado.data,
      );
      dados = eventosAtualizadosDoLote;
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
  ]);

  // --- AÇÕES COM ATUALIZAÇÃO OTIMISTA ---

  const handleStatusChange = async (eventoId: string, novoStatus: string) => {
    const statusTyped = novoStatus as EventoStatus;

    // 1. Atualização Otimista
    setEventosDoBanco((prev) =>
      prev.map((ev) =>
        ev.id === eventoId ? { ...ev, status: statusTyped } : ev,
      ),
    );

    // 2. Chama o Backend
    const result = await updateEventoStatus(eventoId, statusTyped);

    if (result.success) {
      toast.success("Status atualizado");
    } else {
      toast.error(result.message);
      loadData();
    }
  };

  const handleAprovarLoteInteiro = async () => {
    if (!loteSelecionado) return;

    const idsParaAprovar = loteSelecionado.eventos.map((e) => e.id);

    // 1. Atualização Otimista
    setEventosDoBanco((prev) =>
      prev.map((ev) =>
        idsParaAprovar.includes(ev.id) ? { ...ev, status: "aprovado" } : ev,
      ),
    );

    const promises = idsParaAprovar.map((id) =>
      updateEventoStatus(id, "aprovado"),
    );

    await Promise.all(promises);
    toast.success("Lote aprovado!");
  };

  const confirmDelete = async () => {
    if (eventoToDelete) {
      setEventosDoBanco((prev) =>
        prev.filter((ev) => ev.id !== eventoToDelete),
      );

      const result = await deleteEvento(eventoToDelete);

      if (result.success) {
        toast.success("Evento excluído");
      } else {
        toast.error(result.message);
        loadData();
      }
      setEventoToDelete(null);
    }
  };

  // --- NOVA FUNÇÃO: DOWNLOAD DO LOTE (NOTA FISCAL) ---
  const handleDownloadLote = async (lote: LoteDiario) => {
    toast.info("Buscando nota fiscal vinculada...");

    const dataString = lote.dataOriginal.toISOString().split("T")[0];

    const result = await getNotaDoLote(dataString);

    if (result.success && result.url) {
      // Cria link temporário para download
      const link = document.createElement("a");
      link.href = result.url;
      link.download = result.filename || `nota-${lote.data}.pdf`;
      link.target = "_blank"; // Abre em nova aba se for view
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Nota fiscal encontrada!");
    } else {
      toast.error(result.message || "Nenhuma nota encontrada para esta data.");
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

  // Se estiver dentro de um lote (Visualização Detalhada do Lote)
  if (loteSelecionado) {
    const eventosDoLote = dadosPaginados.currentItems as Evento[];
    const todosOk =
      eventosDoLote.length > 0 &&
      eventosDoLote.every((e) => ["aprovado", "exportado"].includes(e.status));

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
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-3">
                {loteSelecionado.data}
              </h1>
              <p className="text-sm text-muted-foreground">
                Autor: {loteSelecionado.autor}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!todosOk && hasPermission("eventos:aprovar") && (
              <Button
                onClick={handleAprovarLoteInteiro}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Aprovar Tudo
              </Button>
            )}
          </div>
        </div>

        <EventosTable
          data={eventosDoLote}
          onStatusChange={handleStatusChange}
          onDelete={setEventoToDelete}
          onViewDetails={(ev) => console.log("Detalhes", ev)}
        />

        <PaginationControls
          currentPage={currentPage}
          totalPages={dadosPaginados.totalPages}
          totalItems={dadosPaginados.totalItems}
          onPageChange={setCurrentPage}
        />

        <AlertDialogDelete
          open={!!eventoToDelete}
          onOpenChange={(open) => !open && setEventoToDelete(null)}
          onConfirm={confirmDelete}
        />
      </div>
    );
  }

  // Visualização Principal (Pastas ou Lista)
  return (
    <div
      className={`flex flex-col h-[calc(100vh-2rem)] space-y-4 overflow-hidden ${hideScrollClass}`}
    >
      <EventosToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      <div className="flex-1 min-h-0 border rounded-md bg-card relative overflow-hidden shadow-sm">
        <div
          className={`absolute inset-0 overflow-y-auto ${hideScrollClass} p-2`}
        >
          {isLoading ? (
            <div className="flex justify-center items-center h-full gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /> Carregando...
            </div>
          ) : viewMode === "pastas" ? (
            <EventosGrid
              lotes={dadosPaginados.currentItems as LoteDiario[]}
              onSelect={setLoteSelecionado}
              onDownload={handleDownloadLote} // Passamos a nova função de download aqui
            />
          ) : (
            <EventosTable
              data={dadosPaginados.currentItems as Evento[]}
              onStatusChange={handleStatusChange}
              onDelete={setEventoToDelete}
              onViewDetails={(ev) => console.log(ev)}
            />
          )}
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={dadosPaginados.totalPages}
        totalItems={dadosPaginados.totalItems}
        onPageChange={setCurrentPage}
      />

      <AlertDialogDelete
        open={!!eventoToDelete}
        onOpenChange={(open) => !open && setEventoToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// Componentes Auxiliares Locais Tipados (Para não dar erro de 'any')

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between py-2 border-t mt-auto shrink-0">
      <div className="text-xs text-muted-foreground">
        Mostrando {totalItems} registros
      </div>
      <div className="space-x-2 flex items-center">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs font-medium w-16 text-center">
          {currentPage} / {Math.max(1, totalPages)}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface AlertDialogDeleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function AlertDialogDelete({
  open,
  onOpenChange,
  onConfirm,
}: AlertDialogDeleteProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso excluirá o registro permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
