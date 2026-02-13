"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

// 1. Listar Notas Fiscais
export async function getNotas() {
  try {
    const notas = await prisma.notaFiscal.findMany({
      orderBy: { dataUpload: "desc" },
      include: {
        uploadedBy: {
          select: { nome: true, email: true },
        },
      },
    });

    const formatted = notas.map((nota) => ({
      ...nota,
      valorTotal: Number(nota.valorTotal),
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Erro ao buscar notas:", error);
    return { success: false, data: [] };
  }
}

// 2. Salvar Nota Fiscal
export async function createNota(data: {
  numero?: string;
  serie?: string;
  emitente?: string;
  cnpjEmitente?: string;
  valorTotal?: number;
  dataEmissao?: Date; // Data da nota em si
  dataReferencia?: Date; // <--- NOVO: Data do lote de perdas
  chaveAcesso?: string;

  xmlContent?: string;
  pdfUrl?: string;
  xmlUrl?: string;

  fileName: string;
  eventoId?: string; // Legado, mantido por compatibilidade
}) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    if (data.chaveAcesso) {
      const existe = await prisma.notaFiscal.findFirst({
        where: { chaveAcesso: data.chaveAcesso },
      });
      if (existe) {
        return {
          success: false,
          message: "Nota fiscal já importada anteriormente.",
        };
      }
    }

    await prisma.notaFiscal.create({
      data: {
        uploadedById: session.id,
        dataUpload: new Date(),

        numero: data.numero,
        serie: data.serie,
        emitente: data.emitente || "Fornecedor Desconhecido",
        cnpjEmitente: data.cnpjEmitente,
        valorTotal: data.valorTotal || 0,
        dataEmissao: data.dataEmissao,

        // Salvando no campo correto agora
        dataReferencia: data.dataReferencia, // Data do lote

        chaveAcesso: data.chaveAcesso,
        xmlContent: data.xmlContent,
        pdfUrl: data.pdfUrl,
        xmlUrl: data.xmlUrl,

        eventoId: data.eventoId,
        observacoes: `Arquivo original: ${data.fileName}`,
      },
    });

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar nota:", error);
    return { success: false, message: "Erro ao salvar no banco de dados." };
  }
}

// 3. Excluir Nota
export async function deleteNota(id: string) {
  try {
    await prisma.notaFiscal.delete({ where: { id } });
    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir nota." };
  }
}
