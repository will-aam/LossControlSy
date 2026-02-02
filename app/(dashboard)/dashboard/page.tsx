"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from "recharts";
import { TrendingDown, AlertTriangle, DollarSign, Package } from "lucide-react";
import { Evento, Item } from "@/lib/types"; // Importação Corrigida
import { formatCurrency } from "@/lib/utils"; // Importação Corrigida
import { useAuth } from "@/lib/auth-context";
import { StorageService } from "@/lib/storage";

const chartConfig = {
  custo: {
    label: "Custo",
    color: "var(--chart-1)",
  },
  precoVenda: {
    label: "Preço Venda",
    color: "var(--chart-2)",
  },
};

const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Carrega dados
  useEffect(() => {
    setEventos(StorageService.getEventos());
  }, []);

  // --- CÁLCULOS ---
  const stats = useMemo(() => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0));
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - 7);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    let perdasHoje = { qtd: 0, custo: 0 };
    let perdasSemana = { qtd: 0, custo: 0 };
    let perdasMes = { qtd: 0, custo: 0, venda: 0 };

    const perdasPorCatMap: Record<string, number> = {};
    const topItensMap: Record<
      string,
      { item: Item; qtd: number; custo: number }
    > = {};
    const tendenciaMap: Record<string, { custo: number; venda: number }> = {};

    // Inicializa últimos 7 dias para o gráfico
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const diaKey = d.toLocaleDateString("pt-BR", { weekday: "short" });
      tendenciaMap[diaKey] = { custo: 0, venda: 0 };
    }

    eventos.forEach((ev) => {
      if (ev.status === "rascunho" || ev.status === "rejeitado") return;

      const dataEv = new Date(ev.dataHora);
      const custoTotal = (ev.custoSnapshot || 0) * ev.quantidade;
      const vendaTotal = (ev.precoVendaSnapshot || 0) * ev.quantidade;

      if (dataEv >= inicioHoje) {
        perdasHoje.qtd += 1;
        perdasHoje.custo += custoTotal;
      }
      if (dataEv >= inicioSemana) {
        perdasSemana.qtd += 1;
        perdasSemana.custo += custoTotal;

        const diffDays = Math.floor(
          (new Date().getTime() - dataEv.getTime()) / (1000 * 3600 * 24),
        );
        if (diffDays <= 7) {
          const diaKey = dataEv.toLocaleDateString("pt-BR", {
            weekday: "short",
          });
          if (tendenciaMap[diaKey]) {
            tendenciaMap[diaKey].custo += custoTotal;
            tendenciaMap[diaKey].venda += vendaTotal;
          }
        }
      }
      if (dataEv >= inicioMes) {
        perdasMes.qtd += 1;
        perdasMes.custo += custoTotal;
        perdasMes.venda += vendaTotal;

        const cat = ev.item?.categoria || "Outros";
        perdasPorCatMap[cat] = (perdasPorCatMap[cat] || 0) + custoTotal;

        if (ev.item) {
          if (!topItensMap[ev.item.id]) {
            topItensMap[ev.item.id] = { item: ev.item, qtd: 0, custo: 0 };
          }
          topItensMap[ev.item.id].qtd += ev.quantidade;
          topItensMap[ev.item.id].custo += custoTotal;
        }
      }
    });

    const perdasPorCategoria = Object.entries(perdasPorCatMap)
      .map(([cat, val]) => ({ categoria: cat, custo: val }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    const topItens = Object.values(topItensMap)
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    const tendenciaSemanal = Object.entries(tendenciaMap).map(
      ([dia, vals]) => ({
        dia,
        ...vals,
      }),
    );

    return {
      perdasHoje,
      perdasSemana,
      perdasMes,
      perdasPorCategoria,
      topItens,
      tendenciaSemanal,
    };
  }, [eventos]);

  if (!hasPermission("dashboard:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das perdas e quebras
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Perdas Hoje</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.perdasHoje.qtd}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.perdasHoje.custo)} em custo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Perdas Semana</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.perdasSemana.qtd}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.perdasSemana.custo)} em custo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.perdasMes.custo)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.perdasMes.qtd} eventos aprovados/enviados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Perda em Venda (Mês)
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats.perdasMes.venda)}
            </div>
            <p className="text-xs text-muted-foreground">
              potencial não realizado
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tendência Semanal</CardTitle>
            <CardDescription>Custo vs. Preço de Venda</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-75 w-full">
              <AreaChart data={stats.tendenciaSemanal}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dia"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="custo"
                  stroke="var(--color-custo)"
                  fill="var(--color-custo)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="venda"
                  stroke="var(--color-precoVenda)"
                  fill="var(--color-precoVenda)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Categorias (Mês)</CardTitle>
            <CardDescription>Onde estamos perdendo mais?</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-75 w-full">
              <BarChart
                data={stats.perdasPorCategoria}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <YAxis
                  dataKey="categoria"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  className="text-xs font-medium"
                />
                <XAxis type="number" hide />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="custo" radius={4}>
                  {stats.perdasPorCategoria.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={categoryColors[index % categoryColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Itens Críticos (Mês)</CardTitle>
          <CardDescription>Itens que mais geraram prejuízo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topItens.length > 0 ? (
              stats.topItens.map((entry, index) => (
                <div
                  key={entry.item.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-medium shrink-0">
                      #{index + 1}
                    </div>
                    {entry.item.imagemUrl ? (
                      <img
                        src={entry.item.imagemUrl}
                        alt={entry.item.nome}
                        className="h-10 w-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{entry.item.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.item.codigoInterno}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between sm:block sm:text-right pl-14 sm:pl-0">
                    <p className="font-medium">
                      {entry.qtd} {entry.item.unidade}
                    </p>
                    <p className="text-sm text-destructive font-bold">
                      {formatCurrency(entry.custo)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma perda registrada neste mês.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
