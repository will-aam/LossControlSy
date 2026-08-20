"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

// 1. Listar Motivos (Filtra apenas os da loja do usuário logado)
export async function getMotivos() {
  const session = await getSession();
  if (!session) return { success: false, data: [] };

  try {
    const motivos = await prisma.motivo.findMany({
      where: { ownerId: session.ownerId }, // Garante o isolamento dos dados
      orderBy: { nome: "asc" },
    });
    return { success: true, data: motivos };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// 2. Criar Motivo (Vincula obrigatoriamente à loja do usuário)
export async function createMotivo(nome: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  if (!nome || !nome.trim())
    return { success: false, message: "Nome obrigatório" };

  try {
    const nomeFormatado = nome.trim();

    // Verifica se o motivo já existe DENTRO DA MESMA LOJA (Case insensitive)
    const existente = await prisma.motivo.findFirst({
      where: {
        nome: { equals: nomeFormatado, mode: "insensitive" },
        ownerId: session.ownerId,
      },
    });

    if (existente) {
      return { success: true, data: existente };
    }

    // Limite de 15 motivos
    const totalMotivos = await prisma.motivo.count({
      where: { ownerId: session.ownerId },
    });

    if (totalMotivos >= 15) {
      return {
        success: false,
        message: "Limite de 15 motivos atingido. Exclua um motivo para criar outro.",
      };
    }

    // RESOLVE O ERRO: Agora passamos o ownerId obrigatório
    const novo = await prisma.motivo.create({
      data: {
        nome: nomeFormatado,
        ownerId: session.ownerId,
      },
    });

    revalidatePath("/motivos");
    return { success: true, data: novo };
  } catch (error) {
    console.error("Erro ao criar motivo:", error);
    return { success: false, message: "Erro ao criar motivo." };
  }
}

// 3. Atualizar Motivo (Com validação de posse)
export async function updateMotivo(id: string, nome: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const nomeFormatado = nome.trim();

    // Verifica se o motivo pertence à loja antes de permitir a edição
    const motivoAntigo = await prisma.motivo.findUnique({ where: { id } });
    if (!motivoAntigo || motivoAntigo.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Motivo não encontrado ou sem permissão.",
      };
    }

    if (motivoAntigo.nome === nomeFormatado) {
      return { success: true };
    }

    // Verifica se JÁ EXISTE outro motivo com esse novo nome na mesma loja
    const motivoExistente = await prisma.motivo.findFirst({
      where: {
        nome: { equals: nomeFormatado, mode: "insensitive" },
        ownerId: session.ownerId,
        id: { not: id }, // Garante que não é o próprio
      },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar todas as Evidencias que usavam o nome antigo
      await tx.evidencia.updateMany({
        where: { motivo: motivoAntigo.nome, ownerId: session.ownerId },
        data: { motivo: nomeFormatado },
      });

      // 2. Atualizar todos os Eventos que usavam o nome antigo
      await tx.evento.updateMany({
        where: { motivo: motivoAntigo.nome, ownerId: session.ownerId },
        data: { motivo: nomeFormatado },
      });

      if (motivoExistente) {
        // Se existe, a gente MESCLA (deleta o antigo, pois as evidências/eventos já apontam pro novo nome)
        await tx.motivo.delete({
          where: { id },
        });
      } else {
        // Se não existe, apenas renomeamos o atual
        await tx.motivo.update({
          where: { id },
          data: { nome: nomeFormatado },
        });
      }
    });

    revalidatePath("/motivos");
    revalidatePath("/eventos");
    
    return { success: true };
  } catch (error) {
    console.error("Erro ao mesclar/atualizar motivo:", error);
    return { success: false, message: "Erro ao atualizar." };
  }
}

// 4. Deletar Motivo (Com validação de posse)
export async function deleteMotivo(id: string) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    // Verifica se o motivo pertence à loja antes de permitir a exclusão
    const motivo = await prisma.motivo.findUnique({ where: { id } });
    if (!motivo || motivo.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Motivo não encontrado ou sem permissão.",
      };
    }

    await prisma.motivo.delete({
      where: { id },
    });
    revalidatePath("/motivos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir." };
  }
}
