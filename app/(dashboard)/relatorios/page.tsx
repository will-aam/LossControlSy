// app/(dashboard)/relatorios/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getEventos } from "@/app/actions/eventos";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, Calendar, Loader2, Download } from "lucide-react";
import { Evento, Item } from "@/lib/types";
import { toast } from "sonner";
import { generateReportPDF } from "@/lib/pdf-generator";

// Componentes Refatorados
import { SummaryCards } from "@/components/relatorios/summary-cards";
import { ChartsOverview } from "@/components/relatorios/charts-overview";
import { DetailsTables } from "@/components/relatorios/details-tables";

export default function RelatoriosPage() {
  const { hasPermission } = useAuth();
  const [periodo, setPeriodo] = useState<
    "semana" | "mes" | "trimestre" | "ano"
  >("mes");
  const [selectedTab, setSelectedTab] = useState("visao-geral");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const result = await getEventos();
      if (result.success && result.data) {
        const mappedEventos: Evento[] = (result.data as any[]).map((ev) => ({
          id: ev.id,
          dataHora: ev.dataHora,
          motivo: ev.motivo,
          status: ev.status,
          quantidade: Number(ev.quantidade),
          unidade: ev.unidade,
          custoSnapshot: Number(ev.custoSnapshot),
          precoVendaSnapshot: Number(ev.precoVendaSnapshot),
          item: ev.item
            ? {
                id: ev.item.id,
                nome: ev.item.nome,
                codigoInterno: ev.item.codigoInterno,
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
          notasFiscais: ev.notasFiscais || [],
        }));
        setEventos(mappedEventos);
      } else {
        toast.error("Erro ao carregar relatórios");
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const hoje = new Date();
    let dataInicioGlobal = new Date();

    // 1. DATA DE CORTE BASEADA NO FILTRO
    if (periodo === "semana") dataInicioGlobal.setDate(hoje.getDate() - 7);
    if (periodo === "mes") dataInicioGlobal.setMonth(hoje.getMonth() - 1);
    if (periodo === "trimestre") dataInicioGlobal.setMonth(hoje.getMonth() - 3);
    if (periodo === "ano") dataInicioGlobal.setFullYear(hoje.getFullYear() - 1);
    dataInicioGlobal.setHours(0, 0, 0, 0);

    const baseEventos = eventos.filter(
      (e) => e.status !== "rascunho" && e.status !== "rejeitado",
    );

    // Eventos estritamente dentro do período selecionado (Para as tabelas e cards)
    const validEventos = baseEventos.filter(
      (e) => new Date(e.dataHora) >= dataInicioGlobal,
    );

    // --- 2. GRÁFICO DE TENDÊNCIA (SEMPRE EM MESES COMO SOLICITADO) ---
    let qtdMesesChart = 6;
    if (periodo === "trimestre") qtdMesesChart = 3;
    if (periodo === "ano") qtdMesesChart = 12;

    const chartDataMap: Record<
      string,
      { custo: number; venda: number; qtd: number }
    > = {};
    const mesesNomes = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    // Inicializa o eixo X (Ex: Jan, Fev, Mar...)
    for (let i = qtdMesesChart - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key =
        qtdMesesChart > 6
          ? `${mesesNomes[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`
          : mesesNomes[d.getMonth()];
      chartDataMap[key] = { custo: 0, venda: 0, qtd: 0 };
    }

    const dataInicioChart = new Date(
      hoje.getFullYear(),
      hoje.getMonth() - qtdMesesChart + 1,
      1,
    );

    baseEventos.forEach((ev) => {
      const d = new Date(ev.dataHora);
      // O Gráfico usa sua própria linha do tempo para mostrar a evolução
      if (d >= dataInicioChart) {
        const key =
          qtdMesesChart > 6
            ? `${mesesNomes[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`
            : mesesNomes[d.getMonth()];
        if (chartDataMap[key]) {
          chartDataMap[key].custo += (ev.custoSnapshot || 0) * ev.quantidade;
          chartDataMap[key].venda +=
            (ev.precoVendaSnapshot || 0) * ev.quantidade;
          chartDataMap[key].qtd += ev.quantidade;
        }
      }
    });

    const monthlyData = Object.entries(chartDataMap).map(([mes, val]) => ({
      mes,
      ...val,
    }));

    // --- 3. MOTIVOS E ITENS COM DRILL-DOWN (Usa APENAS os dados do período filtrado) ---
    const motivosMap: Record<
      string,
      {
        qtd: number;
        custo: number;
        itens: Record<
          string,
          { nome: string; qtd: number; custo: number; unidade: string }
        >;
      }
    > = {};

    validEventos.forEach((ev) => {
      const motivo = ev.motivo || "Não especificado";
      if (!motivosMap[motivo])
        motivosMap[motivo] = { qtd: 0, custo: 0, itens: {} };

      motivosMap[motivo].qtd += ev.quantidade;
      motivosMap[motivo].custo += (ev.custoSnapshot || 0) * ev.quantidade;

      if (ev.item) {
        const itemId = ev.item.id;
        if (!motivosMap[motivo].itens[itemId]) {
          motivosMap[motivo].itens[itemId] = {
            nome: ev.item.nome,
            qtd: 0,
            custo: 0,
            unidade: ev.unidade,
          };
        }
        motivosMap[motivo].itens[itemId].qtd += ev.quantidade;
        motivosMap[motivo].itens[itemId].custo +=
          (ev.custoSnapshot || 0) * ev.quantidade;
      }
    });

    const topMotivosPerdas = Object.entries(motivosMap)
      .map(([motivo, val]) => ({
        motivo,
        quantidade: val.qtd,
        custo: val.custo,
        topItens: Object.values(val.itens)
          .sort((a, b) => b.custo - a.custo)
          .slice(0, 3),
      }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    // --- 4. DIA DA SEMANA ---
    const diasMap: Record<string, { qtd: number; custo: number }> = {
      Domingo: { qtd: 0, custo: 0 },
      Segunda: { qtd: 0, custo: 0 },
      Terça: { qtd: 0, custo: 0 },
      Quarta: { qtd: 0, custo: 0 },
      Quinta: { qtd: 0, custo: 0 },
      Sexta: { qtd: 0, custo: 0 },
      Sábado: { qtd: 0, custo: 0 },
    };

    validEventos.forEach((ev) => {
      const d = new Date(ev.dataHora);
      const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
      const simpleKey = (dia.charAt(0).toUpperCase() + dia.slice(1)).split(
        "-",
      )[0];
      const normalizedKey =
        Object.keys(diasMap).find((k) => k.startsWith(simpleKey)) || "Outro";

      if (diasMap[normalizedKey]) {
        diasMap[normalizedKey].qtd += ev.quantidade;
        diasMap[normalizedKey].custo += (ev.custoSnapshot || 0) * ev.quantidade;
      }
    });

    const perdasPorDiaSemana = Object.entries(diasMap).map(([dia, val]) => ({
      dia,
      quantidade: val.qtd,
      custo: val.custo,
    }));

    // --- 5. TOP ITENS GERAL ---
    const itemMap: Record<string, { item: Item; qtd: number; custo: number }> =
      {};
    validEventos.forEach((ev) => {
      if (!ev.item) return;
      if (!itemMap[ev.item.id])
        itemMap[ev.item.id] = { item: ev.item, qtd: 0, custo: 0 };
      itemMap[ev.item.id].qtd += ev.quantidade;
      itemMap[ev.item.id].custo += (ev.custoSnapshot || 0) * ev.quantidade;
    });

    const topItens = Object.values(itemMap)
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 10);

    // Retorna os eventos validados para os Cards usarem no cálculo
    return {
      monthlyData,
      topMotivosPerdas,
      perdasPorDiaSemana,
      topItens,
      validEventos,
    };
  }, [eventos, periodo]); // <-- O Array agora escuta o periodo, refazendo o calculo instantaneamente

  const summary = useMemo(() => {
    // CORREÇÃO MESTRA: Calcula os Cards baseado nos eventos do PERÍODO, não do gráfico
    const totalCusto = stats.validEventos.reduce(
      (acc, e) => acc + (e.custoSnapshot || 0) * e.quantidade,
      0,
    );
    const totalVenda = stats.validEventos.reduce(
      (acc, e) => acc + (e.precoVendaSnapshot || 0) * e.quantidade,
      0,
    );
    const totalQtd = stats.validEventos.reduce(
      (acc, e) => acc + e.quantidade,
      0,
    );

    let diasNoPeriodo = 30;
    if (periodo === "semana") diasNoPeriodo = 7;
    if (periodo === "trimestre") diasNoPeriodo = 90;
    if (periodo === "ano") diasNoPeriodo = 365;

    const mediaQtdDia = Math.round(totalQtd / diasNoPeriodo) || 0;

    return {
      totalCusto,
      totalVenda,
      totalQtd,
      mediaQtdDia,
      margemPerda:
        totalVenda > 0
          ? (((totalVenda - totalCusto) / totalVenda) * 100).toFixed(1)
          : "0.0",
    };
  }, [stats, periodo]);

  const handleDownloadPDF = () => {
    try {
      const periodoTexto = {
        semana: "Última Semana",
        mes: "Último Mês",
        trimestre: "Último Trimestre",
        ano: "Último Ano",
      }[periodo];
      const reportData = {
        summary: {
          totalCusto: summary.totalCusto,
          totalVenda: summary.totalVenda,
          totalQtd: summary.totalQtd,
          margemPerda: summary.margemPerda,
        },
        topItens: stats.topItens,
        topMotivos: stats.topMotivosPerdas,
        periodoTexto: periodoTexto || "Período Geral",
      };
      generateReportPDF(reportData);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      toast.error("Ocorreu um erro ao gerar o relatório.");
    }
  };

  if (!hasPermission("relatorios:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada das perdas e tendências
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="gap-2 border-primary/20 hover:bg-primary/5"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as any)}>
            <SelectTrigger className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Última Semana</SelectItem>
              <SelectItem value="mes">Último Mês</SelectItem>
              <SelectItem value="trimestre">Último Trimestre</SelectItem>
              <SelectItem value="ano">Último Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SummaryCards summary={summary} />

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="detalhes">Detalhes por Item</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6 space-y-6">
          <ChartsOverview
            monthlyData={stats.monthlyData}
            perdasPorDiaSemana={stats.perdasPorDiaSemana}
          />
        </TabsContent>

        <TabsContent value="detalhes" className="mt-6 space-y-6">
          <DetailsTables
            topItens={stats.topItens}
            topMotivos={stats.topMotivosPerdas}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
