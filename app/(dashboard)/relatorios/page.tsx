'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
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
  ResponsiveContainer,
  Line,
  LineChart,
  Legend,
} from 'recharts'
import {
  dashboardStats,
  mockEventos,
  mockItems,
  formatCurrency,
  categorias,
} from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import {
  AlertTriangle,
  Download,
  TrendingDown,
  Calendar,
  Package,
  DollarSign,
  BarChart3,
  PieChartIcon,
  FileSpreadsheet,
} from 'lucide-react'

const chartConfig = {
  custo: {
    label: 'Custo',
    color: 'var(--chart-1)',
  },
  precoVenda: {
    label: 'Preço Venda',
    color: 'var(--chart-2)',
  },
  quantidade: {
    label: 'Quantidade',
    color: 'var(--chart-3)',
  },
}

const pieColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

// Extended data for reports
const monthlyData = [
  { mes: 'Ago', custo: 2100, precoVenda: 3200, quantidade: 145 },
  { mes: 'Set', custo: 1850, precoVenda: 2900, quantidade: 128 },
  { mes: 'Out', custo: 2350, precoVenda: 3650, quantidade: 162 },
  { mes: 'Nov', custo: 2680, precoVenda: 4100, quantidade: 185 },
  { mes: 'Dez', custo: 3200, precoVenda: 4850, quantidade: 220 },
  { mes: 'Jan', custo: 2450, precoVenda: 3890, quantidade: 156 },
]

const topMotivosPerdas = [
  { motivo: 'Validade vencida', quantidade: 45, custo: 890 },
  { motivo: 'Produto maduro', quantidade: 38, custo: 720 },
  { motivo: 'Danos no transporte', quantidade: 28, custo: 580 },
  { motivo: 'Embalagem danificada', quantidade: 22, custo: 340 },
  { motivo: 'Refrigeração falhou', quantidade: 15, custo: 420 },
]

const perdasPorDiaSemana = [
  { dia: 'Segunda', custo: 380, quantidade: 24 },
  { dia: 'Terça', custo: 290, quantidade: 18 },
  { dia: 'Quarta', custo: 420, quantidade: 28 },
  { dia: 'Quinta', custo: 310, quantidade: 20 },
  { dia: 'Sexta', custo: 480, quantidade: 32 },
  { dia: 'Sábado', custo: 520, quantidade: 35 },
  { dia: 'Domingo', custo: 250, quantidade: 15 },
]

export default function RelatoriosPage() {
  const { hasPermission } = useAuth()
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'trimestre' | 'ano'>('mes')
  const [selectedTab, setSelectedTab] = useState('visao-geral')

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalCusto = monthlyData.reduce((acc, m) => acc + m.custo, 0)
    const totalVenda = monthlyData.reduce((acc, m) => acc + m.precoVenda, 0)
    const totalQtd = monthlyData.reduce((acc, m) => acc + m.quantidade, 0)
    const mediaQtdDia = Math.round(totalQtd / 180) // ~6 months
    
    return {
      totalCusto,
      totalVenda,
      totalQtd,
      mediaQtdDia,
      margemPerda: ((totalVenda - totalCusto) / totalVenda * 100).toFixed(1),
    }
  }, [])

  if (!hasPermission('relatorios:ver')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para ver os relatórios.</p>
      </div>
    )
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
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as 'semana' | 'mes' | 'trimestre' | 'ano')}>
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
            <CardTitle className="text-sm font-medium">Total Perdas (Custo)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalCusto)}</div>
            <p className="text-xs text-muted-foreground">no período selecionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Perda em Venda</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalVenda)}</div>
            <p className="text-xs text-muted-foreground">receita não realizada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQtd}</div>
            <p className="text-xs text-muted-foreground">~{summary.mediaQtdDia} eventos/dia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margem de Perda</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.margemPerda}%</div>
            <p className="text-xs text-muted-foreground">diferença custo vs. venda</p>
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
                <CardDescription>Evolução de perdas nos últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="custo"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--chart-1)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="precoVenda"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--chart-2)' }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Perdas por Dia da Semana */}
            <Card>
              <CardHeader>
                <CardTitle>Perdas por Dia da Semana</CardTitle>
                <CardDescription>Identificar dias com maior incidência</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={perdasPorDiaSemana}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dia" className="text-xs" />
                    <YAxis className="text-xs" />
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
                  {monthlyData.map((row) => (
                    <TableRow key={row.mes}>
                      <TableCell className="font-medium">{row.mes}</TableCell>
                      <TableCell className="text-right">{row.quantidade}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.custo)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.precoVenda)}</TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(row.precoVenda - row.custo)}
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
                <CardDescription>Participação de cada categoria no total</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={dashboardStats.perdasPorCategoria}
                      dataKey="custo"
                      nameKey="categoria"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ categoria, percent }) => `${categoria} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {dashboardStats.perdasPorCategoria.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
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
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={dashboardStats.perdasPorCategoria} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <YAxis dataKey="categoria" type="category" className="text-xs" width={80} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="custo" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="precoVenda" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
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
                  {dashboardStats.perdasPorCategoria.map((cat) => {
                    const total = dashboardStats.perdasPorCategoria.reduce((acc, c) => acc + c.custo, 0)
                    const percent = ((cat.custo / total) * 100).toFixed(1)
                    return (
                      <TableRow key={cat.categoria}>
                        <TableCell className="font-medium">{cat.categoria}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cat.custo)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cat.precoVenda)}</TableCell>
                        <TableCell className="text-right">{percent}%</TableCell>
                      </TableRow>
                    )
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
              <CardDescription>Ranking de itens por custo de perda</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Perda Venda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardStats.topItens.map((entry, index) => (
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
                            <p className="text-xs text-muted-foreground">{entry.item.codigoInterno}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.item.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.quantidade} {entry.item.unidade}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.custo)}</TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(entry.quantidade * entry.item.precoVenda)}
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
                <CardDescription>Distribuição de eventos por causa</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={topMotivosPerdas}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="motivo" className="text-xs" angle={-45} textAnchor="end" height={80} />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantidade" fill="var(--chart-4)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custo por Motivo</CardTitle>
                <CardDescription>Impacto financeiro de cada causa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topMotivosPerdas.map((item, index) => {
                    const maxCusto = Math.max(...topMotivosPerdas.map(i => i.custo))
                    const percent = (item.custo / maxCusto) * 100
                    return (
                      <div key={item.motivo} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.motivo}</span>
                          <span className="font-medium">{formatCurrency(item.custo)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: pieColors[index % pieColors.length],
                            }}
                          />
                        </div>
                      </div>
                    )
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
                  {topMotivosPerdas.map((item) => {
                    const total = topMotivosPerdas.reduce((acc, i) => acc + i.custo, 0)
                    const percent = ((item.custo / total) * 100).toFixed(1)
                    const media = item.custo / item.quantidade
                    return (
                      <TableRow key={item.motivo}>
                        <TableCell className="font-medium">{item.motivo}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.custo)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(media)}</TableCell>
                        <TableCell className="text-right">{percent}%</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
