"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
} from "recharts";

// CORREÇÃO: Removido o 'hsl()' que estava causando a cor preta
const chartConfig = {
  custo: { label: "Custo", color: "var(--chart-1)" },
  precoVenda: { label: "Preço Venda", color: "var(--chart-2)" },
};

const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface DashboardChartsProps {
  tendenciaSemanal: any[];
  perdasPorCategoria: any[];
}

export function DashboardCharts({
  tendenciaSemanal,
  perdasPorCategoria,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {/* Gráfico de Área (Tendência) */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Tendência Semanal</CardTitle>
          <CardDescription>Custo vs. Preço de Venda</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tendenciaSemanal}>
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
                <ChartTooltip content={<ChartTooltipContent />} />
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
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Barras (Categorias) */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Top Categorias (Mês)</CardTitle>
          <CardDescription>Onde estamos perdendo mais?</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={perdasPorCategoria}
                layout="vertical"
                margin={{ left: 0, right: 30 }}
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
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="custo" radius={4} barSize={32}>
                  {perdasPorCategoria.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={categoryColors[index % categoryColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
