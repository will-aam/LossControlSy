"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  mockEventos,
  Evento,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import {
  FileSpreadsheet,
  Calendar,
  Search,
  ChevronRight,
  Package,
  AlertTriangle,
  Eye,
  Filter,
} from "lucide-react";

// Interface auxiliar para o agrupamento
interface LoteDiario {
  data: string; // DD/MM/YYYY
  dataOriginal: Date;
  eventos: Evento[];
  totalItens: number;
  totalCusto: number;
  statusDominante: string;
}

export default function EventosPage() {
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [loteSelecionado, setLoteSelecionado] = useState<LoteDiario | null>(
    null,
  );

  // 1. Agrupar eventos por data
  const lotesDiarios = useMemo(() => {
    const grupos: Record<string, Evento[]> = {};

    // Filtra e agrupa
    mockEventos.forEach((evento) => {
      // Filtro de busca simples (se houver texto digitado)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          evento.item?.nome.toLowerCase().includes(query) ||
          evento.criadoPor.nome.toLowerCase().includes(query);

        if (!matches) return;
      }

      const dataFormatada = formatDate(evento.dataHora);
      if (!grupos[dataFormatada]) {
        grupos[dataFormatada] = [];
      }
      grupos[dataFormatada].push(evento);
    });

    // Transforma em array e ordena (mais recente primeiro)
    return Object.entries(grupos)
      .map(([data, eventos]) => {
        const totalCusto = eventos.reduce(
          (acc, e) => acc + (e.custoSnapshot || 0) * e.quantidade,
          0,
        );

        // Lógica simples para definir "Status do Lote" (visual)
        // Se tiver algum rejeitado, marca alerta. Se todos aprovados, verde.
        let status = "Variado";
        const todosAprovados = eventos.every(
          (e) => e.status === "aprovado" || e.status === "exportado",
        );
        const temRejeicao = eventos.some((e) => e.status === "rejeitado");

        if (todosAprovados) status = "Aprovado";
        else if (temRejeicao) status = "Com Rejeições";
        else if (eventos.every((e) => e.status === "enviado"))
          status = "Pendente";

        return {
          data,
          dataOriginal: new Date(eventos[0].dataHora),
          eventos,
          totalItens: eventos.length,
          totalCusto,
          statusDominante: status,
        } as LoteDiario;
      })
      .sort((a, b) => b.dataOriginal.getTime() - a.dataOriginal.getTime());
  }, [searchQuery]);

  if (!hasPermission("eventos:ver_todos")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para visualizar os eventos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Histórico de Perdas
          </h1>
          <p className="text-muted-foreground">
            Visualize os registros agrupados por data de envio
          </p>
        </div>

        {/* Barra de Busca Simples */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar em todos os registros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Grid de Lotes (Pastas Diárias) */}
      {lotesDiarios.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {lotesDiarios.map((lote) => (
            <Card
              key={lote.data}
              className="hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setLoteSelecionado(lote)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {lote.data}
                </CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-primary group-hover:text-primary/80" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {formatCurrency(lote.totalCusto)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mb-4">
                  <Package className="mr-1 h-3 w-3" />
                  {lote.totalItens} registros
                </div>

                <div className="flex items-center justify-between mt-4">
                  <Badge
                    variant={
                      lote.statusDominante === "Aprovado"
                        ? "default"
                        : lote.statusDominante === "Com Rejeições"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {lote.statusDominante}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-muted/10">
          <Filter className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhum registro encontrado</h3>
          <p className="text-muted-foreground">
            Não encontramos perdas com os filtros atuais.
          </p>
        </div>
      )}

      {/* Modal de Detalhes (A "Planilha Aberta") */}
      <Dialog
        open={!!loteSelecionado}
        onOpenChange={(open) => !open && setLoteSelecionado(null)}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>
                  Registro de Perdas - {loteSelecionado?.data}
                </DialogTitle>
                <DialogDescription>
                  Detalhamento dos itens registrados nesta data.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loteSelecionado && (
            <div className="mt-4">
              {/* Resumo do Lote */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-bold">
                    Total Custo
                  </span>
                  <div className="text-lg font-semibold">
                    {formatCurrency(loteSelecionado.totalCusto)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-bold">
                    Total Itens
                  </span>
                  <div className="text-lg font-semibold">
                    {loteSelecionado.totalItens}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-bold">
                    Criado Por
                  </span>
                  <div className="text-sm font-medium mt-1">
                    {loteSelecionado.eventos[0].criadoPor.nome}
                  </div>
                </div>
              </div>

              {/* Tabela de Itens */}
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loteSelecionado.eventos.map((evento) => (
                      <TableRow key={evento.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {evento.item?.nome || "Item Desconhecido"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {evento.item?.codigoInterno}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {evento.item?.categoria}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {evento.quantidade} {evento.unidade}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatCurrency(evento.custoSnapshot || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            (evento.custoSnapshot || 0) * evento.quantidade,
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(evento.status)} bg-transparent border-current`}
                          >
                            {getStatusLabel(evento.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
