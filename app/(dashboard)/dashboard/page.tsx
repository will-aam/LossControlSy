"use client";

import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEventos } from "@/app/actions/eventos";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Evento, Item } from "@/lib/types";
import { toast } from "sonner";

// Novos componentes
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { CriticalItems } from "@/components/dashboard/critical-items";

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const result = await getEventos();
      if (result.success && result.data) {
        // Mapeamento
        const mappedEventos: Evento[] = (result.data as any[]).map((ev) => ({
          id: ev.id,
          dataHora: ev.dataHora,
          motivo: ev.motivo,
          status: ev.status,
          quantidade: Number(ev.quantidade),
          unidade: ev.unidade,
          custoSnapshot: Number(ev.custoSnapshot),
          precoVendaSnapshot: Number(ev.precoVendaSnapshot),
          item: ev.item
            ? {
                id: ev.item.id,
                nome: ev.item.nome,
                codigoInterno: ev.item.codigoInterno,
                categoria: ev.item.categoria?.nome || "Sem Categoria",
                unidade: ev.item.unidade,
                custo: Number(ev.item.custo),
                precoVenda: Number(ev.item.precoVenda),
                status: ev.item.status,
                imagemUrl: ev.item.imagemUrl,
              }
            : undefined,
          criadoPor: ev.criadoPor,
          evidencias: ev.evidencias,
        }));
        setEventos(mappedEventos);
      } else {
        toast.error("Erro ao carregar dashboard.");
      }
      setIsLoading(false);
    }
    loadData();
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

    // Inicializa últimos 7 dias
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
          // Tenta encontrar chave exata ou aproximada para evitar bugs de locale
          const keyEncontrada = Object.keys(tendenciaMap).find(
            (k) => k === diaKey,
          );
          if (keyEncontrada) {
            tendenciaMap[keyEncontrada].custo += custoTotal;
            tendenciaMap[keyEncontrada].venda += vendaTotal;
          }
        }
      }
      if (dataEv >= inicioMes) {
        perdasMes.qtd += 1;
        perdasMes.custo += custoTotal;
        perdasMes.venda += vendaTotal;

        const cat = (ev.item?.categoria as any) || "Outros";
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

  if (!hasPermission("dashboard:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando dashboard...</p>
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

      {/* Cartões de Resumo */}
      <DashboardCards stats={stats} />

      {/* Tabs Mobile / Grid Desktop */}
      <div className="block md:hidden">
        <Tabs defaultValue="tendencia" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="tendencia">Tendência</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
          </TabsList>
          <TabsContent value="tendencia">
            <DashboardCharts
              tendenciaSemanal={stats.tendenciaSemanal}
              perdasPorCategoria={[]}
            />
            {/* Nota: Em mobile, separamos os gráficos. O componente DashboardCharts renderiza os dois,
                 então se quiser separação real, teria que componentizar ainda mais. 
                 Para simplificar, vou renderizar tudo junto no mobile por enquanto ou ajustar o componente charts.
                 Para esta versão, o DashboardCharts já adapta a altura.
             */}
          </TabsContent>
          <TabsContent value="categorias">
            {/* Reutilizando, mas o ideal seria separar se quiser abas distintas. 
                 Vou deixar as abas controlando a visibilidade via CSS ou classes se necessário,
                 mas aqui vou simplificar renderizando o componente completo que é responsivo.
             */}
            <DashboardCharts
              tendenciaSemanal={[]}
              perdasPorCategoria={stats.perdasPorCategoria}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: Renderiza tudo */}
      <div className="hidden md:block">
        <DashboardCharts
          tendenciaSemanal={stats.tendenciaSemanal}
          perdasPorCategoria={stats.perdasPorCategoria}
        />
      </div>

      {/* Lista de Itens Críticos */}
      <CriticalItems topItens={stats.topItens} />
    </div>
  );
}
