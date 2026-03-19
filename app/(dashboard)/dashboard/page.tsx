// app/(dashboard)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDashboardStats } from "@/app/actions/dashboard"; // Nova action importada
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Componentes
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { CriticalItems } from "@/components/dashboard/critical-items";

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados já processados do servidor
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const result = await getDashboardStats();

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        toast.error("Erro ao carregar os dados do dashboard.");
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  if (!hasPermission("dashboard:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          Calculando dados do dashboard...
        </p>
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

      <DashboardCards stats={stats} />

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
          </TabsContent>
          <TabsContent value="categorias">
            <DashboardCharts
              tendenciaSemanal={[]}
              perdasPorCategoria={stats.perdasPorCategoria}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden md:block">
        <DashboardCharts
          tendenciaSemanal={stats.tendenciaSemanal}
          perdasPorCategoria={stats.perdasPorCategoria}
        />
      </div>

      <CriticalItems topItens={stats.topItens} />
    </div>
  );
}
