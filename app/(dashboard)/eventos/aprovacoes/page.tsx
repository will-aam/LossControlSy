"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  EventoStatus,
} from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarDays,
  Check,
  X,
  PackageOpen,
} from "lucide-react";
import { toast } from "sonner";

// Interface para o agrupamento
interface LotePendente {
  id: string; // Usaremos a data como ID
  data: string;
  dataOriginal: Date;
  eventos: Evento[];
  totalCusto: number;
  autor: string;
}

export default function AprovacoesPage() {
  const { hasPermission } = useAuth();

  // Estado local para simular aprovação em tempo real
  const [eventosLocais, setEventosLocais] = useState<Evento[]>(mockEventos);

  // 1. Filtrar apenas PENDENTES (enviado) e Agrupar por data
  const lotesPendentes = useMemo(() => {
    const pendentes = eventosLocais.filter((e) => e.status === "enviado");
    const grupos: Record<string, Evento[]> = {};

    pendentes.forEach((evento) => {
      const dataFormatada = formatDate(evento.dataHora);
      if (!grupos[dataFormatada]) {
        grupos[dataFormatada] = [];
      }
      grupos[dataFormatada].push(evento);
    });

    return Object.entries(grupos)
      .map(([data, eventos]) => {
        return {
          id: data,
          data,
          dataOriginal: new Date(eventos[0].dataHora),
          eventos,
          totalCusto: eventos.reduce(
            (acc, e) => acc + (e.custoSnapshot || 0) * e.quantidade,
            0,
          ),
          autor: eventos[0].criadoPor.nome,
        } as LotePendente;
      })
      .sort((a, b) => a.dataOriginal.getTime() - b.dataOriginal.getTime()); // Mais antigos primeiro (FIFO)
  }, [eventosLocais]);

  // Ações
  const handleApproveBatch = (lote: LotePendente) => {
    // Atualiza todos os itens do lote para APROVADO
    const novosEventos = eventosLocais.map((ev) => {
      if (lote.eventos.some((le) => le.id === ev.id)) {
        return { ...ev, status: "aprovado" as EventoStatus };
      }
      return ev;
    });
    setEventosLocais(novosEventos);
    toast.success(`Lote de ${lote.data} aprovado com sucesso!`);
  };

  const handleRejectItem = (eventoId: string) => {
    // Rejeita um item específico
    const novosEventos = eventosLocais.map((ev) => {
      if (ev.id === eventoId) {
        return { ...ev, status: "rejeitado" as EventoStatus };
      }
      return ev;
    });
    setEventosLocais(novosEventos);
    toast.warning("Item rejeitado.");
  };

  if (!hasPermission("eventos:aprovar")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para aprovar eventos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pendências de Aprovação
        </h1>
        <p className="text-muted-foreground">
          Revise os lotes enviados pelos funcionários.
        </p>
      </div>

      {/* Lista de Lotes */}
      {lotesPendentes.length > 0 ? (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {lotesPendentes.map((lote) => (
              <AccordionItem
                key={lote.id}
                value={lote.id}
                className="border rounded-lg bg-card px-4 mb-4"
              >
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4 flex-1">
                    <AccordionTrigger className="hover:no-underline py-0 pr-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <CalendarDays className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            Lote: {lote.data}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lote.eventos.length} itens • Enviado por{" "}
                            {lote.autor}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground uppercase font-bold">
                        Total Custo
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(lote.totalCusto)}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleApproveBatch(lote)}
                      className="bg-success hover:bg-success/90 text-white gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar Lote
                    </Button>
                  </div>
                </div>

                <AccordionContent className="pt-2 pb-4 border-t mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Motivo</TableHead>
                        <TableHead className="w-25"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lote.eventos.map((evento) => (
                        <TableRow key={evento.id}>
                          <TableCell>
                            <span className="font-medium">
                              {evento.item?.nome}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({evento.item?.codigoInterno})
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {evento.quantidade} {evento.unidade}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              (evento.custoSnapshot || 0) * evento.quantidade,
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {evento.motivo || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 w-full justify-start"
                              onClick={() => handleRejectItem(evento.id)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Rejeitar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-muted/10">
          <CheckCircle2 className="h-12 w-12 text-success mb-4" />
          <h3 className="text-lg font-semibold">Tudo Limpo!</h3>
          <p className="text-muted-foreground mt-1">
            Não há lotes pendentes de aprovação no momento.
          </p>
        </div>
      )}
    </div>
  );
}
