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

// 2. Salvar Nota Fiscal (Versão Corrigida para URL R2)
export async function createNota(data: {
  numero?: string;
  serie?: string;
  emitente?: string;
  cnpjEmitente?: string;
  valorTotal?: number;
  dataEmissao?: Date;
  chaveAcesso?: string;

  xmlContent?: string; // Texto do XML

  pdfUrl?: string; // <--- AQUI MUDOU: Agora aceita URL string
  xmlUrl?: string; // <--- AQUI MUDOU: Agora aceita URL string

  fileName: string;
  eventoId?: string;
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
        dataEmissao: data.dataEmissao || new Date(),
        chaveAcesso: data.chaveAcesso,

        // Salvando os campos corretos agora
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
