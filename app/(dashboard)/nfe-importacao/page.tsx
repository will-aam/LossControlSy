import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ImportNFeForm } from "@/components/nfe/ImportNFeForm";
import { HistoricoNFeList } from "@/components/nfe/HistoricoNFeList";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const metadata = {
  title: "Importação de NFe | Controle",
};

export default async function NFeImportacaoPage() {
  const user = await getSession();
  if (!user || !user.ownerId) {
    redirect("/login");
  }

  // Buscar histórico de NFe
  const historicoRaw = await prisma.nFeCompra.findMany({
    where: { ownerId: user.ownerId },
    orderBy: { dataImportacao: "desc" },
    include: {
      _count: {
        select: { itens: true }
      }
    }
  });

  const historico = historicoRaw.map(nfe => ({
    ...nfe,
    valorTotal: nfe.valorTotal ? Number(nfe.valorTotal) : null
  }));

  return (
    <>
      <PageHeader
        title="Importação de NFe"
        description="Importe arquivos XML das notas fiscais e mapeie os produtos."
      />
      <main className="flex-1 space-y-6 px-4 py-5 md:px-8 md:py-6 overflow-y-auto">
        {/* Formulário de Importação (oculto no mobile) */}
        <div className="hidden md:block">
          <ImportNFeForm />
        </div>

        {/* Aviso para mobile */}
        <div className="md:hidden bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl text-sm font-medium text-center">
          A importação de XML só está disponível pelo computador.
        </div>

        <div>
          <HistoricoNFeList historico={historico} />
        </div>
      </main>
    </>
  );
}
