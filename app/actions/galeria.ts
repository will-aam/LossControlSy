"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

// 1. Listar Todas as Evidências (Galeria e Eventos)
export async function getEvidencias() {
  try {
    const evidencias = await prisma.evidencia.findMany({
      orderBy: { dataUpload: "desc" },
      include: {
        evento: {
          include: {
            item: {
              select: { nome: true, codigoInterno: true },
            },
          },
        },
        user: {
          select: { nome: true },
        },
      },
    });

    // CORREÇÃO DOS ERROS DE DECIMAL AQUI
    const formattedData = evidencias.map((ev) => ({
      ...ev,
      evento: ev.evento
        ? {
            ...ev.evento,
            // Convertendo todos os Decimals para Number
            quantidade: Number(ev.evento.quantidade),
            custoSnapshot: Number(ev.evento.custoSnapshot),
            precoVendaSnapshot: Number(ev.evento.precoVendaSnapshot),
            item: ev.evento.item,
          }
        : undefined,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Erro ao buscar galeria:", error);
    return { success: false, data: [] };
  }
}

// 2. Criar Evidência Avulsa
export async function createEvidenciaAvulsa(data: {
  url: string;
  motivo?: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    await prisma.evidencia.create({
      data: {
        url: data.url,
        motivo: data.motivo || "Upload Avulso",
        dataUpload: new Date(),
        userId: session.id,
      },
    });

    revalidatePath("/galeria");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao salvar foto." };
  }
}

// 3. Excluir Evidência
export async function deleteEvidencia(id: string) {
  try {
    const evidencia = await prisma.evidencia.findUnique({
      where: { id },
      include: { evento: true },
    });

    if (evidencia?.eventoId) {
      return {
        success: false,
        message:
          "Não é possível excluir fotos vinculadas a registros de perda.",
      };
    }

    await prisma.evidencia.delete({ where: { id } });
    revalidatePath("/galeria");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir foto." };
  }
}
