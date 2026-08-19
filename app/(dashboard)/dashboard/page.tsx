"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, FileCode2, PanelLeft, Search } from "lucide-react";

import { Kpi } from "@/components/dash/Kpi";
import { Carousel } from "@/components/dash/Carousel";
import { PageHeader } from "@/components/PageHeader";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { CriticalItems } from "@/components/dashboard/critical-items";
import { getDashboardStats } from "@/app/actions/dashboard";
import { DollarSign, AlertCircle, TrendingUp, PackageSearch, ArrowLeftRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { brl, pct, num } from "@/lib/format";

type ProdutoLinha = {
  codigo: string;
  descricao: string;
  categoria: string;
  chegou: number;
  vendido: number;
  perdido: number;
  custo: number;
  precoVenda: number;
  limitePerda: number;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeDias(inicio: string, fim: string): string[] {
  const out: string[] = [];
  const a = new Date(inicio + "T00:00:00Z");
  const b = new Date(fim + "T00:00:00Z");
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return out;
  for (let d = new Date(a); d <= b && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(isoDate(d));
  }
  return out;
}

type Totais = {
  faturamento: number;
  custoTotal: number;
  lucro: number;
  margem: number;
  chegou: number;
  vendido: number;
  perdido: number;
  perdaPct: number;
  perdaValor: number;
  ruptura: number;
  excesso: number;
  xmlsImportados: number;
  xmlsPendentes: number;
  itensXml: number;
};

function agregarReais(linhas: ProdutoLinha[], limiteGlobal: number, importados: number): Totais {
  const faturamento = linhas.reduce((s, l) => s + l.vendido * l.precoVenda, 0);
  const custoTotal = linhas.reduce((s, l) => s + l.chegou * l.custo, 0);
  const perdaValor = linhas.reduce((s, l) => s + l.perdido * l.custo, 0);
  const chegou = linhas.reduce((s, l) => s + l.chegou, 0);
  const vendido = linhas.reduce((s, l) => s + l.vendido, 0);
  const perdido = linhas.reduce((s, l) => s + l.perdido, 0);

  return {
    faturamento,
    custoTotal,
    lucro: faturamento - custoTotal,
    margem: faturamento ? ((faturamento - custoTotal) / faturamento) * 100 : 0,
    chegou,
    vendido,
    perdido,
    perdaPct: chegou ? (perdido / chegou) * 100 : 0,
    perdaValor,
    ruptura: linhas.filter((l) => l.chegou > 0 && l.vendido / l.chegou > 0.95).length,
    excesso: linhas.filter((l) => l.chegou > 0 && (l.perdido / l.chegou) * 100 > limiteGlobal).length,
    xmlsImportados: importados,
    xmlsPendentes: 0,
    itensXml: chegou,
  };
}

type Modo = "dia" | "semana" | "mes";

function weekStart(value: string) {
  // value: "2026-W33"
  const [y, w] = value.split("-W");
  const jan4 = new Date(Date.UTC(Number(y), 0, 4));
  const dow = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + (Number(w) - 1) * 7);
  return monday;
}

function periodoDias(modo: Modo, valor: string): string[] {
  if (!valor) return [];
  if (modo === "dia") return [valor];
  if (modo === "semana") {
    const s = weekStart(valor);
    const e = new Date(s);
    e.setUTCDate(s.getUTCDate() + 6);
    return rangeDias(isoDate(s), isoDate(e));
  }
  const [y, m] = valor.split("-").map(Number) as [number, number];
  const s = new Date(Date.UTC(y, m - 1, 1));
  const e = new Date(Date.UTC(y, m, 0));
  return rangeDias(isoDate(s), isoDate(e));
}

function rotulo(modo: Modo, valor: string) {
  if (!valor) return "—";
  if (modo === "dia") return valor.split("-").reverse().join("/");
  if (modo === "semana") {
    const s = weekStart(valor);
    return `sem. ${valor.split("-W")[1]} · ${isoDate(s).split("-").reverse().slice(0, 2).join("/")}`;
  }
  const [y, m] = valor.split("-");
  return `${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(m) - 1]}/${y}`;
}

const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / Math.abs(b)) * 100);

export default function Dashboard() {
  const [modo, setModo] = useState<Modo>("semana");
  const [pa, setPa] = useState("2026-W33");
  const [pb, setPb] = useState("2026-W32");
  const [busca, setBusca] = useState("");
  const [limiteGlobal, setLimiteGlobal] = useState(8);
  const [soAlertas, setSoAlertas] = useState(false);

  // --- Real DB Stats ---
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoadingStats(true);
      const result = await getDashboardStats();
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        toast.error("Erro ao carregar os dados reais do dashboard.");
      }
      setIsLoadingStats(false);
    }
    loadData();
  }, []);

  const [linhasA, setLinhasA] = useState<ProdutoLinha[]>([]);
  const [linhasB, setLinhasB] = useState<ProdutoLinha[]>([]);
  const [serie, setSerie] = useState<any[]>([]);
  const [xmlsA, setXmlsA] = useState(0);
  const [xmlsB, setXmlsB] = useState(0);
  const [isLoadingReal, setIsLoadingReal] = useState(false);

  const diasA = useMemo(() => periodoDias(modo, pa), [modo, pa]);
  const diasB = useMemo(() => periodoDias(modo, pb), [modo, pb]);

  useEffect(() => {
    async function loadRealData() {
      setIsLoadingReal(true);
      const { getRealDashboardMetrics } = await import("@/app/actions/dashboard");
      const result = await getRealDashboardMetrics(diasA, diasB);
      if (result.success && result.data) {
        setLinhasA(result.data.linhasA);
        setLinhasB(result.data.linhasB);
        setSerie(result.data.serie);
        setXmlsA(result.data.xmlsImportadosA);
        setXmlsB(result.data.xmlsImportadosB);
      } else {
        toast.error("Erro ao carregar métricas reais do dashboard.");
      }
      setIsLoadingReal(false);
    }
    loadRealData();
  }, [diasA, diasB]);

  const A = useMemo(() => agregarReais(linhasA, limiteGlobal, xmlsA), [linhasA, limiteGlobal, xmlsA]);
  const B = useMemo(() => agregarReais(linhasB, limiteGlobal, xmlsB), [linhasB, limiteGlobal, xmlsB]);

  const tabela = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhasA
      .map((l) => {
        const perdaPct = l.chegou ? (l.perdido / l.chegou) * 100 : 0;
        const giro = l.chegou ? (l.vendido / l.chegou) * 100 : 0;
        const limite = l.limitePerda > 0 ? Math.min(l.limitePerda, limiteGlobal) : limiteGlobal;
        const status: "ruptura" | "desperdicio" | "ok" =
          giro > 95 ? "ruptura" : perdaPct > limite ? "desperdicio" : "ok";
        return { ...l, perdaPct, giro, limite, status, faturou: l.vendido * l.precoVenda };
      })
      .filter((l) => (!q || l.descricao.toLowerCase().includes(q) || l.codigo.toLowerCase().includes(q)))
      .filter((l) => (!soAlertas ? true : l.status !== "ok"))
      .sort((a, b) => b.faturou - a.faturou);
  }, [linhasA, busca, limiteGlobal, soAlertas]);

  const rupturas = tabela.filter((l) => l.status === "ruptura");
  const desperdicios = tabela.filter((l) => l.status === "desperdicio");

  const inputType = modo === "dia" ? "date" : modo === "semana" ? "week" : "month";

  return (
    <>
      <PageHeader
        title="Painel de estufa"
        description={`${rotulo(modo, pa)} vs ${rotulo(modo, pb)} · ${num(A.xmlsImportados)} XMLs importados`}
      >
        <div className="flex items-center gap-1 rounded-lg bg-surface p-0.5 text-xs">
          {(["dia", "semana", "mes"] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setModo(m);
                if (m === "dia") {
                  setPa("2026-08-14");
                  setPb("2026-08-13");
                } else if (m === "semana") {
                  setPa("2026-W33");
                  setPb("2026-W32");
                } else {
                  setPa("2026-08");
                  setPb("2026-07");
                }
              }}
              className={`rounded-md px-3 py-1.5 capitalize transition-colors ${modo === m ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {m === "mes" ? "mês" : m}
            </button>
          ))}
        </div>
      </PageHeader>

      <main className="flex-1 overflow-y-auto space-y-6 px-4 py-5 md:px-8 md:py-6">
        {/* Filtros soltos */}
        <section className="flex flex-wrap items-end gap-x-5 gap-y-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Período</span>
            <input
              type={inputType}
              value={pa}
              onChange={(e) => setPa(e.target.value)}
              className="rounded-md bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none focus:bg-surface-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Comparar com</span>
            <input
              type={inputType}
              value={pb}
              onChange={(e) => setPb(e.target.value)}
              className="rounded-md bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none focus:bg-surface-2"
            />
          </label>
          <label className="hidden flex-col gap-1 md:flex">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Limite de perda ({limiteGlobal}%)
            </span>
            <input
              type="range"
              min={1}
              max={20}
              value={limiteGlobal}
              onChange={(e) => setLimiteGlobal(Number(e.target.value))}
              className="h-8 w-40 accent-[var(--primary)]"
            />
          </label>
          <label className="relative ml-auto flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto ou código"
              className="w-full rounded-md bg-surface py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-surface-2 md:w-64"
            />
          </label>
        </section>

        {/* KPIs essenciais — carrossel manual no mobile */}
        <section>
          <Carousel gridClass="md:grid-cols-4 xl:grid-cols-6">
            {[
              <Kpi 
                key="fat" 
                label="Faturou" 
                value={brl(A.faturamento)} 
                delta={delta(A.faturamento, B.faturamento)} 
                infoContent={
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 font-medium text-slate-100">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      Total arrecadado nas vendas
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Calculado multiplicando a <em>quantidade vendida</em> de cada produto pelo seu <em>preço de venda</em>.
                    </p>
                  </div>
                }
              />,
              <Kpi
                key="perda"
                label="Perda"
                value={pct(A.perdaPct)}
                delta={delta(A.perdaPct, B.perdaPct)}
                invert
                tone={A.perdaPct > limiteGlobal ? "negative" : "positive"}
                hint={`${brl(A.perdaValor)} · limite ${limiteGlobal}%`}
                infoContent={
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 font-medium text-slate-100">
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                      % de produtos descartados
                    </p>
                    <p className="text-muted-foreground text-xs">
                      <em>Perda %</em> = quantidade perdida ÷ quantidade que chegou × 100.
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Uma perda alta significa <strong>dinheiro jogado fora</strong>.
                    </p>
                  </div>
                }
              />,
              <Kpi
                key="lucro"
                label="Lucro"
                value={brl(A.lucro)}
                delta={delta(A.lucro, B.lucro)}
                hint={`margem ${pct(A.margem)}`}
                infoContent={
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 font-medium text-slate-100">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      O que sobrou de verdade
                    </p>
                    <p className="text-muted-foreground text-xs">
                      <em>Lucro</em> = Faturamento − Custo total das mercadorias vendidas e perdidas.
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Indicador principal da <strong>saúde financeira</strong> do período.
                    </p>
                  </div>
                }
              />,
              <Kpi
                key="rup"
                label="Ruptura"
                value={`${A.ruptura} itens`}
                tone={A.ruptura > 0 ? "warning" : "positive"}
                hint="venderam quase tudo"
                infoContent={
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 font-medium text-slate-100">
                      <PackageSearch className="h-4 w-4 text-amber-400" />
                      Prestígio em prateleira
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Sinaliza produtos que venderam <em>mais de 95% do estoque disponível</em>.
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Item muito procurado e corre <strong>grande risco de faltar</strong>, perdendo vendas futuras.
                    </p>
                  </div>
                }
              />,
              <Kpi
                key="cheg"
                label="Chegou vs perdeu"
                value={`${num(A.chegou)} / ${num(A.perdido)}`}
                hint={`vendidos ${num(A.vendido)}`}
                className="hidden xl:block"
                infoContent={
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 font-medium text-slate-100">
                      <ArrowLeftRight className="h-4 w-4 text-sky-400" />
                      Balanço de volume físico
                    </p>
                    <p className="text-muted-foreground text-xs">
                      <em>Chegou</em>: itens que entraram via Notas Fiscais.<br/>
                      <em>Perdeu</em>: itens descartados.
                    </p>
                  </div>
                }
              />,
              <Kpi
                key="xml"
                label="XMLs importados"
                value={num(A.xmlsImportados)}
                hint={`${num(A.itensXml)} itens · ${A.xmlsPendentes} pendentes`}
                className="hidden xl:block"
                infoContent={
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 font-medium text-slate-100">
                      <FileText className="h-4 w-4 text-indigo-400" />
                      Notas Fiscais processadas
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Cada XML alimenta automaticamente o seu <em>custo</em> e a quantidade que <strong>chegou</strong> ao estoque.
                    </p>
                  </div>
                }
              />,
            ]}
          </Carousel>
        </section>


        {/* Gráficos */}
        <section className="grid gap-2.5 lg:grid-cols-3">
          <div className="rounded-xl bg-surface p-4 lg:col-span-2">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[13px] font-medium">Faturamento por dia</h2>
              <span className="text-[11px] text-muted-foreground">
                linha clara: {rotulo(modo, pa)} · linha escura: {rotulo(modo, pb)}
              </span>
            </div>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--surface-3)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Line type="monotone" dataKey="Faturamento" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="comparado"
                    name="Comparado"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl bg-surface p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[13px] font-medium">% de perda por dia</h2>
              <span className="text-[11px] text-muted-foreground">limite {limiteGlobal}%</span>
            </div>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke="var(--surface-3)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="Perda" radius={[4, 4, 0, 0]} fill="var(--chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Decisão rápida */}
        <section className="grid gap-2.5 md:grid-cols-2">
          <Alerta
            titulo="Ruptura — repor mais"
            icone="ruptura"
            vazio="Nenhum item em risco de faltar."
            itens={rupturas.slice(0, 5).map((l) => ({
              codigo: l.codigo,
              descricao: l.descricao,
              info: `saída ${l.giro.toFixed(0)}% · sobrou ${l.chegou - l.vendido - l.perdido}`,
            }))}
          />
          <Alerta
            titulo="Desperdício — produzir menos"
            icone="desperdicio"
            vazio="Nenhum item acima do limite de perda."
            itens={desperdicios.slice(0, 5).map((l) => ({
              codigo: l.codigo,
              descricao: l.descricao,
              info: `perda ${pct(l.perdaPct)} (limite ${l.limite}%) · ${brl(l.perdido * l.custo)}`,
            }))}
          />
        </section>

        {/* Tabela */}
        <section className="rounded-xl bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-[13px] font-medium">Produtos · {rotulo(modo, pa)}</h2>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={soAlertas}
                onChange={(e) => setSoAlertas(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--primary)]"
              />
              somente alertas
            </label>
          </div>

          {/* Mobile: lista enxuta */}
          <ul className="space-y-2.5 md:hidden">
            {tabela.map((l) => (
              <li key={l.codigo} className="rounded-lg bg-surface-2 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm">{l.descricao}</span>
                  <span className="shrink-0 text-sm tabular-nums">{brl(l.faturou)}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className={l.perdaPct > l.limite ? "text-negative" : "text-positive"}>
                    perda {pct(l.perdaPct)}
                  </span>
                  <span>saída {l.giro.toFixed(0)}%</span>
                  <StatusTag status={l.status} />
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: tabela completa */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 text-left font-medium">Produto</th>
                  <th className="py-2 text-right font-medium">Chegou</th>
                  <th className="py-2 text-right font-medium">Vendeu</th>
                  <th className="py-2 text-right font-medium">Perdeu</th>
                  <th className="py-2 text-right font-medium">% perda</th>
                  <th className="py-2 text-right font-medium">Saída</th>
                  <th className="py-2 text-right font-medium">Faturou</th>
                  <th className="py-2 text-right font-medium">Lucro</th>
                  <th className="py-2 text-right font-medium">Markup</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {tabela.map((l) => (
                  <tr key={l.codigo} className="transition-colors hover:bg-surface-2">
                    <td className="max-w-[220px] truncate py-2 pr-3">
                      <span className="text-muted-foreground">{l.codigo}</span> {l.descricao}
                    </td>
                    <td className="py-2 text-right">{num(l.chegou)}</td>
                    <td className="py-2 text-right">{num(l.vendido)}</td>
                    <td className="py-2 text-right">{num(l.perdido)}</td>
                    <td className={`py-2 text-right ${l.perdaPct > l.limite ? "text-negative" : "text-positive"}`}>
                      {pct(l.perdaPct)}
                    </td>
                    <td className="py-2 text-right">{l.giro.toFixed(0)}%</td>
                    <td className="py-2 text-right">{brl(l.faturou)}</td>
                    <td className="py-2 text-right">{brl(l.faturou - l.chegou * l.custo)}</td>
                    <td className="py-2 text-right">{(l.precoVenda / l.custo).toFixed(2)}x</td>
                    <td className="py-2 text-right">
                      <StatusTag status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tabela.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
            )}
          </div>
        </section>

        {isLoadingReal && (
          <p className="flex items-center gap-2 pb-4 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Buscando dados em tempo real...
          </p>
        )}

        {/* === DADOS REAIS INTEGRADOS === */}
        <div className="pt-8 mt-8 border-t border-border">
          <h2 className="text-sm font-semibold mb-6 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Dados Reais do Sistema
          </h2>

          {isLoadingStats ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 bg-surface rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Calculando dados reais do banco...</p>
            </div>
          ) : stats ? (
            <div className="space-y-6 pb-8">
              <DashboardCharts
                tendenciaSemanal={stats.tendenciaSemanal}
                perdasPorCategoria={stats.perdasPorCategoria}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <CriticalItems topItens={stats.topItens} />
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}

function StatusTag({ status }: { status: "ruptura" | "desperdicio" | "ok" }) {
  const map = {
    ruptura: ["Ruptura", "text-warning"],
    desperdicio: ["Desperdício", "text-negative"],
    ok: ["Ok", "text-muted-foreground"],
  } as const;
  const [txt, cls] = map[status];
  return <span className={`text-[11px] ${cls}`}>{txt}</span>;
}

function Alerta({
  titulo,
  itens,
  vazio,
  icone,
}: {
  titulo: string;
  vazio: string;
  icone: "ruptura" | "desperdicio";
  itens: Array<{ codigo: string; descricao: string; info: string }>;
}) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-medium">
        <AlertTriangle className={`h-3.5 w-3.5 ${icone === "ruptura" ? "text-warning" : "text-negative"}`} />
        {titulo}
      </h2>
      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="space-y-2">
          {itens.map((i) => (
            <li key={i.codigo} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{i.descricao}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{i.info}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { ProdutoLinha };
