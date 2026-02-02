"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Line,
  LineChart,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { StorageService } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import {
  AlertTriangle,
  Download,
  TrendingDown,
  Calendar,
  Package,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Evento, Item } from "@/lib/types";

const chartConfig = {
  custo: {
    label: "Custo",
    color: "var(--chart-1)",
  },
  precoVenda: {
    label: "Preço Venda",
    color: "var(--chart-2)",
  },
  quantidade: {
    label: "Quantidade",
    color: "var(--chart-3)",
  },
};

const pieColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function RelatoriosPage() {
  const { hasPermission } = useAuth();
  const [periodo, setPeriodo] = useState<
    "semana" | "mes" | "trimestre" | "ano"
  >("mes");
  const [selectedTab, setSelectedTab] = useState("visao-geral");
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Carregar dados reais
  useEffect(() => {
    setEventos(StorageService.getEventos());
  }, []);

  // --- CÁLCULOS DINÂMICOS ---

  const stats = useMemo(() => {
    // Filtrar eventos válidos (aprovados ou enviados, dependendo da regra de negócio)
    // Para relatórios, geralmente consideramos perdas confirmadas (aprovadas/exportadas)
    // Mas para visualização geral, podemos incluir 'enviado' como pendente
    const validEventos = eventos.filter(
      (e) => e.status !== "rascunho" && e.status !== "rejeitado",
    );

    // 1. Dados Mensais (Últimos 6 meses)
    const monthlyDataMap: Record<
      string,
      { custo: number; venda: number; qtd: number }
    > = {};
    const meses = [
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

    // Inicializa últimos 6 meses
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = meses[d.getMonth()];
      monthlyDataMap[key] = { custo: 0, venda: 0, qtd: 0 };
    }

    validEventos.forEach((ev) => {
      const d = new Date(ev.dataHora);
      const key = meses[d.getMonth()];
      if (monthlyDataMap[key]) {
        monthlyDataMap[key].custo += (ev.custoSnapshot || 0) * ev.quantidade;
        monthlyDataMap[key].venda +=
          (ev.precoVendaSnapshot || 0) * ev.quantidade;
        monthlyDataMap[key].qtd += ev.quantidade;
      }
    });

    const monthlyData = Object.entries(monthlyDataMap).map(([mes, val]) => ({
      mes,
      ...val,
    }));

    // 2. Top Motivos
    const motivosMap: Record<string, { qtd: number; custo: number }> = {};
    validEventos.forEach((ev) => {
      const motivo = ev.motivo || "Não especificado";
      if (!motivosMap[motivo]) motivosMap[motivo] = { qtd: 0, custo: 0 };
      motivosMap[motivo].qtd += ev.quantidade;
      motivosMap[motivo].custo += (ev.custoSnapshot || 0) * ev.quantidade;
    });

    const topMotivosPerdas = Object.entries(motivosMap)
      .map(([motivo, val]) => ({
        motivo,
        quantidade: val.qtd,
        custo: val.custo,
      }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5);

    // 3. Perdas por Dia da Semana
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
      const diaKey = dia.charAt(0).toUpperCase() + dia.slice(1); // Capitalize

      // Normalização simples para garantir match com as chaves
      const normalizedKey =
        Object.keys(diasMap).find(
          (k) => k.toLowerCase() === diaKey.toLowerCase(),
        ) || "Outro";

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

    // 4. Por Categoria
    const catMap: Record<string, { custo: number; venda: number }> = {};
    validEventos.forEach((ev) => {
      const cat = ev.item?.categoria || "Outros";
      if (!catMap[cat]) catMap[cat] = { custo: 0, venda: 0 };
      catMap[cat].custo += (ev.custoSnapshot || 0) * ev.quantidade;
      catMap[cat].venda += (ev.precoVendaSnapshot || 0) * ev.quantidade;
    });

    const perdasPorCategoria = Object.entries(catMap)
      .map(([cat, val]) => ({ categoria: cat, ...val }))
      .sort((a, b) => b.custo - a.custo);

    // 5. Top Itens
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

    return {
      monthlyData,
      topMotivosPerdas,
      perdasPorDiaSemana,
      perdasPorCategoria,
      topItens,
    };
  }, [eventos]);

  // Calculate summary stats (simples, baseado no total carregado)
  const summary = useMemo(() => {
    const totalCusto = stats.monthlyData.reduce((acc, m) => acc + m.custo, 0);
    const totalVenda = stats.monthlyData.reduce((acc, m) => acc + m.venda, 0);
    const totalQtd = stats.monthlyData.reduce((acc, m) => acc + m.qtd, 0);
    const mediaQtdDia = Math.round(totalQtd / 180) || 0; // ~6 months

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
  }, [stats]);

  if (!hasPermission("relatorios:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para ver os relatórios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada das perdas e tendências
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={periodo}
            onValueChange={(v) =>
              setPeriodo(v as "semana" | "mes" | "trimestre" | "ano")
            }
          >
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
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Perdas (Custo)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalCusto)}
            </div>
            <p className="text-xs text-muted-foreground">
              no período selecionado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Perda em Venda
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary.totalVenda)}
            </div>
            <p className="text-xs text-muted-foreground">
              receita não realizada
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Eventos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQtd}</div>
            <p className="text-xs text-muted-foreground">
              ~{summary.mediaQtdDia} eventos/dia
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Margem de Perda
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.margemPerda}%</div>
            <p className="text-xs text-muted-foreground">
              diferença custo vs. venda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="categorias">Por Categoria</TabsTrigger>
          <TabsTrigger value="itens">Por Item</TabsTrigger>
          <TabsTrigger value="motivos">Por Motivo</TabsTrigger>
        </TabsList>

        {/* Visão Geral Tab */}
        <TabsContent value="visao-geral" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tendência Mensal */}
            <Card>
              <CardHeader>
                <CardTitle>Tendência Mensal</CardTitle>
                <CardDescription>
                  Evolução de perdas nos últimos 6 meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-75">
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis
                      className="text-xs"
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="custo"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ fill: "var(--chart-1)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="venda"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      dot={{ fill: "var(--chart-2)" }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Perdas por Dia da Semana */}
            <Card>
              <CardHeader>
                <CardTitle>Perdas por Dia da Semana</CardTitle>
                <CardDescription>
                  Identificar dias com maior incidência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-75">
                  <BarChart data={stats.perdasPorDiaSemana}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="dia" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="quantidade"
                      fill="var(--chart-3)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Período</CardTitle>
              <CardDescription>Detalhamento mensal de perdas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Preço Venda</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.monthlyData.map((row) => (
                    <TableRow key={row.mes}>
                      <TableCell className="font-medium">{row.mes}</TableCell>
                      <TableCell className="text-right">{row.qtd}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.custo)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.venda)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(row.venda - row.custo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Categoria Tab */}
        <TabsContent value="categorias" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>
                  Participação de cada categoria no total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-75">
                  <PieChart>
                    <Pie
                      data={stats.perdasPorCategoria}
                      dataKey="custo"
                      nameKey="categoria"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ categoria, percent }) =>
                        `${categoria} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {stats.perdasPorCategoria.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparativo por Categoria</CardTitle>
                <CardDescription>Custo vs. Preço de Venda</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-75">
                  <BarChart data={stats.perdasPorCategoria} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <YAxis
                      dataKey="categoria"
                      type="category"
                      className="text-xs"
                      width={80}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="custo"
                      fill="var(--chart-1)"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="venda"
                      fill="var(--chart-2)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Preço Venda</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.perdasPorCategoria.map((cat) => {
                    const total = stats.perdasPorCategoria.reduce(
                      (acc, c) => acc + c.custo,
                      0,
                    );
                    const percent =
                      total > 0
                        ? ((cat.custo / total) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <TableRow key={cat.categoria}>
                        <TableCell className="font-medium">
                          {cat.categoria}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cat.custo)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cat.venda)}
                        </TableCell>
                        <TableCell className="text-right">{percent}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Item Tab */}
        <TabsContent value="itens" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Itens com Maior Perda</CardTitle>
              <CardDescription>
                Ranking de itens por custo de perda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Perda Venda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topItens.map((entry, index) => (
                    <TableRow key={entry.item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {entry.item.imagemUrl ? (
                            <img
                              src={entry.item.imagemUrl || "/placeholder.svg"}
                              alt={entry.item.nome}
                              className="h-8 w-8 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{entry.item.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.item.codigoInterno}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.item.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.qtd} {entry.item.unidade}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.custo)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(entry.qtd * entry.item.precoVenda)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Motivo Tab */}
        <TabsContent value="motivos" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Perdas por Motivo</CardTitle>
                <CardDescription>
                  Distribuição de eventos por causa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-75">
                  <BarChart data={stats.topMotivosPerdas}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="motivo"
                      className="text-xs"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="quantidade"
                      fill="var(--chart-4)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custo por Motivo</CardTitle>
                <CardDescription>
                  Impacto financeiro de cada causa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topMotivosPerdas.map((item, index) => {
                    const maxCusto = Math.max(
                      ...stats.topMotivosPerdas.map((i) => i.custo),
                    );
                    const percent =
                      maxCusto > 0 ? (item.custo / maxCusto) * 100 : 0;
                    return (
                      <div key={item.motivo} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.motivo}</span>
                          <span className="font-medium">
                            {formatCurrency(item.custo)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor:
                                pieColors[index % pieColors.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tabela de Motivos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Custo Médio</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topMotivosPerdas.map((item) => {
                    const total = stats.topMotivosPerdas.reduce(
                      (acc, i) => acc + i.custo,
                      0,
                    );
                    const percent =
                      total > 0
                        ? ((item.custo / total) * 100).toFixed(1)
                        : "0.0";
                    const media =
                      item.quantidade > 0 ? item.custo / item.quantidade : 0;
                    return (
                      <TableRow key={item.motivo}>
                        <TableCell className="font-medium">
                          {item.motivo}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantidade}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.custo)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(media)}
                        </TableCell>
                        <TableCell className="text-right">{percent}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
