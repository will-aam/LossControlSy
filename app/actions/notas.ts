"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { deleteFileFromStorage, getPresignedDownloadUrl } from "./storage"; // Removido getKeyFromUrl daqui

// ADICIONADO: Importando do local correto (utils)
import { getKeyFromUrl } from "@/lib/utils";

// 1. Listar Notas
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

// 2. Salvar Nota
export async function createNota(data: any) {
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
        dataReferencia: data.dataReferencia,
        naturezaOperacao: data.naturezaOperacao,
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
    // 1. Buscar a nota para pegar os URLs antes de deletar
    const nota = await prisma.notaFiscal.findUnique({
      where: { id },
      select: { pdfUrl: true, xmlUrl: true },
    });

    if (nota) {
      // 2. Tentar deletar PDF do R2
      if (nota.pdfUrl) {
        const key = getKeyFromUrl(nota.pdfUrl);
        if (key) await deleteFileFromStorage(key);
      }
      // 3. Tentar deletar XML do R2
      if (nota.xmlUrl) {
        const key = getKeyFromUrl(nota.xmlUrl);
        if (key) await deleteFileFromStorage(key);
      }
    }

    // 4. Deletar do banco
    await prisma.notaFiscal.delete({ where: { id } });

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    return { success: false, message: "Erro ao excluir nota." };
  }
}

// 4. Nova Action: Gerar Link de Download Seguro
export async function getDownloadLink(url: string) {
  try {
    const key = getKeyFromUrl(url);
    if (!key) return null;

    // Gera link assinado válido por 1h
    const signedUrl = await getPresignedDownloadUrl(key);
    return signedUrl;
  } catch (e) {
    return null;
  }
}
