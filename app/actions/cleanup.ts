"use server";

import { prisma } from "@/lib/prisma";
import { deleteFileFromStorage } from "./storage";
import { getKeyFromUrl } from "@/lib/utils";

export async function expireOldFiscalNotes() {
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  try {

    const notasParaExpirar = await prisma.notaFiscal.findMany({
      where: {
        dataUpload: { lt: trintaDiasAtras },
        OR: [
          { pdfUrl: { not: null } },
          { xmlUrl: { not: null } },
          { xmlContent: { not: null } },
        ],
      },
    });

    for (const nota of notasParaExpirar) {

      if (nota.pdfUrl) {
        const key = getKeyFromUrl(nota.pdfUrl);
        if (key) await deleteFileFromStorage(key);
      }
      if (nota.xmlUrl) {
        const key = getKeyFromUrl(nota.xmlUrl);
        if (key) await deleteFileFromStorage(key);
      }


      await prisma.notaFiscal.update({
        where: { id: nota.id },
        data: {
          pdfUrl: null,
          xmlUrl: null,
          xmlContent: null,
          observacoes:
            (nota.observacoes || "") + " [Arquivos expirados após 30 dias]",
        },
      });
    }

    return { success: true, count: notasParaExpirar.length };
  } catch (error) {
    console.error("Erro na rotina de limpeza:", error);
    return { success: false };
  }
}
