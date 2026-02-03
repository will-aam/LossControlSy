"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Estado para controlar qual card está na frente (0 a 3)
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useEffect(() => {
    setEventos(StorageService.getEventos());
  }, []);

  // Rotação automática dos cards (Deck)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % 4); // 4 é o número de cards
    }, 5000); // 5 segundos
    return () => clearInterval(interval);
  }, []);

  // Função para passar para o próximo card ao clicar
  const handleCardClick = () => {
    setActiveCardIndex((prev) => (prev + 1) % 4);
  };

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

    // Calcular o percentual para cada item em relação ao maior valor
    const maxCusto = Math.max(...topItens.map((item) => item.custo), 1);
    const topItensComPercentual = topItens.map((item) => ({
      ...item,
      percentual: (item.custo / maxCusto) * 100,
    }));

    return {
      perdasHoje,
      perdasSemana,
      perdasMes,
      perdasPorCategoria,
      topItens: topItensComPercentual,
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

      {/* --- MOBILE: STACKED DECK (BARALHO) --- */}
      <div className="block md:hidden py-4 px-2">
        <div
          className="relative w-full h-40" // Altura fixa para o container do baralho
          onClick={handleCardClick}
        >
          {cardsData.map((card, index) => {
            // Calcula a posição relativa ao card ativo
            // 0 = ativo, 1 = próximo, 2 = seguinte...
            const position = (index - activeCardIndex + 4) % 4;

            // Define estilos baseados na posição
            let zIndex = 0;
            let scale = 1;
            let translateX = 0;
            let opacity = 1;
            let rotate = 0; // Opcional: leve rotação para dar charme

            if (position === 0) {
              // Card Ativo (Frente)
              zIndex = 30;
              scale = 1;
              translateX = 0;
              opacity = 1;
            } else if (position === 1) {
              // Card 2 (Atrás)
              zIndex = 20;
              scale = 0.95;
              translateX = 12; // Desloca levemente para direita
              opacity = 0.9;
            } else if (position === 2) {
              // Card 3 (Fundo)
              zIndex = 10;
              scale = 0.9;
              translateX = 24; // Desloca mais para direita
              opacity = 0.7;
            } else {
              // Card 4 (Escondido atrás do ativo, pronto para aparecer)
              zIndex = 0;
              scale = 0.85;
              translateX = 0;
              opacity = 0; // Invisível para não atrapalhar
            }

            return (
              <Card
                key={index}
                className={`absolute inset-0 transition-all duration-500 ease-in-out cursor-pointer shadow-lg border bg-card`}
                style={{
                  zIndex: zIndex,
                  transform: `translateX(${translateX}px) scale(${scale})`,
                  opacity: opacity,
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 pl-6">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </CardHeader>
                <CardContent className="pl-6">
                  <div className={`text-3xl font-bold ${card.valueColor}`}>
                    {card.mainValue}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subText}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {/* Indicador de instrução sutil */}
        <p className="text-[10px] text-center text-muted-foreground mt-2 opacity-50">
          Toque no cartão para ver o próximo
        </p>
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

      {/* --- GRÁFICOS COM TABS (MOBILE) / GRID (DESKTOP) --- */}
      <div className="block md:hidden">
        <Tabs defaultValue="tendencia" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="tendencia">Tendência</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
          </TabsList>

          <TabsContent value="tendencia">
            <Card>
              <CardHeader>
                <CardTitle>Tendência Semanal</CardTitle>
                <CardDescription>Custo vs. Preço de Venda</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <AreaChart data={stats.tendenciaSemanal}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="dia"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${v}`}
                      className="text-xs"
                      width={40}
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
          </TabsContent>

          <TabsContent value="categorias">
            <Card>
              <CardHeader>
                <CardTitle>Top Categorias (Mês)</CardTitle>
                <CardDescription>Onde estamos perdendo mais?</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart
                    data={stats.perdasPorCategoria}
                    layout="vertical"
                    margin={{ left: 0, right: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <YAxis
                      dataKey="categoria"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={80}
                      className="text-[10px] font-medium"
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
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden md:grid gap-4 grid-cols-1 lg:grid-cols-2">
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

      {/* Seção Top 5 Itens Críticos - Versão Minimalista e Mobile-First */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Top 5 Itens Críticos</CardTitle>
          <CardDescription className="text-sm">
            Maior prejuízo este mês
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stats.topItens.length > 0 ? (
            <div className="divide-y">
              {stats.topItens.map((entry, index) => (
                <div
                  key={entry.item.id}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    {entry.item.imagemUrl ? (
                      <img
                        src={entry.item.imagemUrl}
                        alt={entry.item.nome}
                        className="w-10 h-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {entry.item.nome}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {entry.qtd} {entry.item.unidade}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-medium text-destructive">
                          {formatCurrency(entry.custo)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso visual para representar o impacto */}
                  <div className="mt-2 ml-11">
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-destructive/70 to-destructive rounded-full transition-all duration-500"
                        style={{ width: `${entry.percentual}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma perda registrada neste mês</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
