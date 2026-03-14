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
    // Verifica se o motivo pertence à loja antes de permitir a edição
    const motivo = await prisma.motivo.findUnique({ where: { id } });
    if (!motivo || motivo.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Motivo não encontrado ou sem permissão.",
      };
    }

    await prisma.motivo.update({
      where: { id },
      data: { nome: nome.trim() },
    });
    revalidatePath("/motivos");
    return { success: true };
  } catch (error) {
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
