"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
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
import { Evento, Item } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { StorageService } from "@/lib/storage";
import Autoplay from "embla-carousel-autoplay";

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

  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));

  useEffect(() => {
    setEventos(StorageService.getEventos());
  }, []);

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

  const cardsData = [
    {
      title: "Perdas Hoje",
      icon: TrendingDown,
      mainValue: stats.perdasHoje.qtd,
      subText: `${formatCurrency(stats.perdasHoje.custo)} em custo`,
      iconColor: "text-muted-foreground",
      valueColor: "text-foreground",
      borderColor: "border-primary/20",
    },
    {
      title: "Perdas Semana",
      icon: Package,
      mainValue: stats.perdasSemana.qtd,
      subText: `${formatCurrency(stats.perdasSemana.custo)} em custo`,
      iconColor: "text-muted-foreground",
      valueColor: "text-foreground",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Custo Mensal",
      icon: DollarSign,
      mainValue: formatCurrency(stats.perdasMes.custo),
      subText: `${stats.perdasMes.qtd} eventos aprovados`,
      iconColor: "text-muted-foreground",
      valueColor: "text-foreground",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Perda em Venda (Mês)",
      icon: AlertTriangle,
      mainValue: formatCurrency(stats.perdasMes.venda),
      subText: "potencial não realizado",
      iconColor: "text-destructive",
      valueColor: "text-destructive",
      borderColor: "border-destructive/20",
    },
  ];

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

      {/* --- MOBILE: CARROSSEL ESTILO WALLET (LATERAL) --- */}
      <div className="block md:hidden py-4 px-4 overflow-visible">
        <Carousel
          plugins={[plugin.current]}
          className="w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
          opts={{
            loop: true,
            align: "center",
          }}
        >
          {/* Removido -ml-2 para centralizar melhor e ajustar o stack */}
          <CarouselContent className="py-2">
            {cardsData.map((card, index) => (
              /* ALTERAÇÃO AQUI: basis-full faz o card ocupar 100% da largura, escondendo o próximo */
              <CarouselItem key={index} className="basis-full">
                <div className="relative group mr-4">
                  {" "}
                  {/* mr-4 cria espaço para a sombra sair na direita sem cortar */}
                  {/* Stack Layer 2 (Mais atrás e à direita) */}
                  <div className="absolute top-2 bottom-2 -right-2 w-full bg-foreground/5 rounded-xl z-[-2] scale-y-[0.85] transition-all duration-500" />
                  {/* Stack Layer 1 (Atrás e à direita) */}
                  <div className="absolute top-1 bottom-1 -right-1 w-full bg-foreground/10 rounded-xl z-[-1] scale-y-[0.92] transition-all duration-500" />
                  {/* Cartão Principal */}
                  <Card className="relative shadow-sm border bg-card transition-all duration-300 active:scale-[0.98]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">
                        {card.title}
                      </CardTitle>
                      <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${card.valueColor}`}>
                        {card.mainValue}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {card.subText}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* --- DESKTOP: GRID PADRÃO --- */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cardsData.map((card, index) => (
          <Card key={index} className={`border-l-4 ${card.borderColor}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.valueColor}`}>
                {card.mainValue}
              </div>
              <p className="text-xs text-muted-foreground">{card.subText}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- GRÁFICOS --- */}
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
