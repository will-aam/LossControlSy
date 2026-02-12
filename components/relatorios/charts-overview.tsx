"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatQuantity } from "@/lib/utils";

const chartConfig = {
  custo: { label: "Custo", color: "var(--chart-1)" },
  precoVenda: { label: "Preço Venda", color: "var(--chart-2)" },
  quantidade: { label: "Quantidade", color: "var(--chart-3)" },
};

interface ChartsOverviewProps {
  monthlyData: any[];
  perdasPorDiaSemana: any[];
}

export function ChartsOverview({
  monthlyData,
  perdasPorDiaSemana,
}: ChartsOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de Linha (Mensal) */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal</CardTitle>
            <CardDescription>
              Evolução de perdas nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="h-64 md:h-80 w-full"
            >
              <LineChart
                data={monthlyData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => `R$${v}`}
                  width={40}
                  tickLine={false}
                  axisLine={false}
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

        {/* Gráfico de Barras (Dias Semana) */}
        <Card>
          <CardHeader>
            <CardTitle>Perdas por Dia da Semana</CardTitle>
            <CardDescription>
              Identificar dias com maior incidência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="h-64 md:h-80 w-full"
            >
              <BarChart
                data={perdasPorDiaSemana}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="dia"
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis className="text-xs" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantidade" fill="var(--chart-3)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Período</CardTitle>
          <CardDescription>Detalhamento mensal</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  Preço Venda
                </TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((row) => (
                <TableRow key={row.mes}>
                  <TableCell className="font-medium">{row.mes}</TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(row.qtd)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.custo)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {formatCurrency(row.venda)}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    {formatCurrency(row.venda - row.custo)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
