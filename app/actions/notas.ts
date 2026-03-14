// app/actions/notas.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { deleteFileFromStorage, getPresignedDownloadUrl } from "./storage";

// ADICIONADO: Importando do local correto (utils)
import { getKeyFromUrl } from "@/lib/utils";

// 1. Listar Notas (Filtradas pela loja atual)
export async function getNotas() {
  const session = await getSession();
  if (!session) return { success: false, data: [] };

  try {
    const notas = await prisma.notaFiscal.findMany({
      where: { ownerId: session.ownerId }, // NOVO: Filtro de isolamento
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
    // Verifica se a nota já foi importada NA MESMA LOJA
    if (data.chaveAcesso) {
      const existe = await prisma.notaFiscal.findFirst({
        where: {
          chaveAcesso: data.chaveAcesso,
          ownerId: session.ownerId,
        },
      });
      if (existe) {
        return {
          success: false,
          message:
            "Esta nota fiscal já foi importada anteriormente para sua loja.",
        };
      }
    }

    await prisma.notaFiscal.create({
      data: {
        uploadedById: session.id,
        ownerId: session.ownerId, // NOVO: Amarra a nota à loja (Mandatório no novo schema)
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

// 3. Excluir Nota (Com validação de posse)
export async function deleteNota(id: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    // 1. Buscar a nota e verificar se pertence à loja antes de qualquer ação
    const nota = await prisma.notaFiscal.findUnique({
      where: { id },
      select: { pdfUrl: true, xmlUrl: true, ownerId: true },
    });

    if (!nota || nota.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Nota não encontrada ou sem permissão para excluir.",
      };
    }

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

    // 4. Deletar do banco (Sabendo agora que o registro pertence à loja)
    await prisma.notaFiscal.delete({ where: { id } });

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    return { success: false, message: "Erro ao excluir nota." };
  }
}

// 4. Gerar Link de Download Seguro (Com verificação de sessão)
export async function getDownloadLink(url: string) {
  const session = await getSession();
  if (!session) return null; // Apenas usuários logados podem baixar arquivos

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
