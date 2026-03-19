// components/dashboard/dashboard-charts.tsx
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
      <Card className="col-span-1 shadow-sm flex flex-col">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">
            Tendência Semanal
          </CardTitle>
          <CardDescription>Custo vs. Preço de Venda</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 px-2 md:px-6 pb-4">
          {/* CORREÇÃO: Altura fixa segura e largura total */}
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* CORREÇÃO: Margens ajustadas para não cortar valores no mobile */}
              <AreaChart
                data={tendenciaSemanal}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="dia"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-[10px] md:text-xs text-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${v}`}
                  className="text-[10px] md:text-xs text-muted-foreground"
                  width={45} // Ligeiramente maior para caber os números
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
      <Card className="col-span-1 shadow-sm flex flex-col">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">
            Top Categorias (Mês)
          </CardTitle>
          <CardDescription>Onde estamos perdendo mais?</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 px-2 md:px-6 pb-4">
          {/* CORREÇÃO: Altura fixa segura e largura total */}
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* CORREÇÃO: Margens ajustadas para dar espaço aos rótulos no mobile */}
              <BarChart
                data={perdasPorCategoria}
                layout="vertical"
                margin={{ top: 0, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  className="stroke-muted"
                />
                <YAxis
                  dataKey="categoria"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={90} // Espaço reservado para o nome da categoria
                  className="text-[10px] md:text-xs font-medium text-muted-foreground"
                />
                <XAxis type="number" hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="custo" radius={4} barSize={28}>
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
