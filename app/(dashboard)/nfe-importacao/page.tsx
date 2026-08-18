import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ImportNFeForm } from "@/components/nfe/ImportNFeForm";
import { HistoricoNFeList } from "@/components/nfe/HistoricoNFeList";
import { Receipt } from "lucide-react";

export const metadata = {
  title: "Importação de NFe | Controle",
};

export default async function NFeImportacaoPage() {
  const user = await getSession();
  if (!user || !user.ownerId) {
    redirect("/login");
  }

  // Buscar histórico de NFe
  const historico = await prisma.nFeCompra.findMany({
    where: { ownerId: user.ownerId },
    orderBy: { dataImportacao: "desc" },
    include: {
      _count: {
        select: { itens: true }
      }
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="text-primary" />
            Importação de NFe (XML)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Importe arquivos XML de Notas Fiscais para registrar custos e vincular produtos ao catálogo.
          </p>
        </div>
        
        <ImportNFeForm />
      </div>

      <div className="pt-4">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Histórico de Importações</h2>
        <HistoricoNFeList historico={historico} />
      </div>
    </div>
  );
}
