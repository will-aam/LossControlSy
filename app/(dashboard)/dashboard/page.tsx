"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { dashboardStats, formatCurrency, mockItems } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

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
  "var(--chart-1)",
];

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();

  if (!hasPermission("dashboard:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para visualizar o dashboard.
        </p>
        <Button asChild>
          <Link href="/eventos/novo">Registrar Perda</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das perdas e quebras
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Perdas Hoje</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.perdasHoje.quantidade}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(dashboardStats.perdasHoje.custo)} em custo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Perdas Semana</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.perdasSemana.quantidade}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(dashboardStats.perdasSemana.custo)} em custo
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
              {formatCurrency(dashboardStats.perdasMes.custo)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.perdasMes.quantidade} eventos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Perda em Venda
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(dashboardStats.perdasMes.precoVenda)}
            </div>
            <p className="text-xs text-muted-foreground">
              potencial não realizado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tendência Semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência Semanal</CardTitle>
            <CardDescription>
              Comparativo de custo vs. preço de venda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-75">
              <AreaChart data={dashboardStats.tendenciaSemanal}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="dia" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="custo"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="precoVenda"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Perdas por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Perdas por Categoria</CardTitle>
            <CardDescription>
              Distribuição de custos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-75">
              <BarChart
                data={dashboardStats.perdasPorCategoria}
                layout="vertical"
              >
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
                <Bar dataKey="custo" radius={4}>
                  {dashboardStats.perdasPorCategoria.map((_, index) => (
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

      {/* Top Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Itens com Maior Perda</CardTitle>
          <CardDescription>
            Itens que mais geraram perdas no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardStats.topItens.map((entry, index) => (
              <div
                key={entry.item.id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-medium">
                  #{index + 1}
                </div>
                {entry.item.imagemUrl && (
                  <img
                    src={entry.item.imagemUrl || "/placeholder.svg"}
                    alt={entry.item.nome}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.item.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.item.codigoInterno} - {entry.item.categoria}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {entry.quantidade} {entry.item.unidade}
                  </p>
                  <p className="text-sm text-destructive">
                    {formatCurrency(entry.custo)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
