"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 1. Listar Motivos (Ordem alfabética)
export async function getMotivos() {
  try {
    const motivos = await prisma.motivo.findMany({
      orderBy: { nome: "asc" },
    });
    return { success: true, data: motivos };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// 2. Criar Motivo (Se não existir)
export async function createMotivo(nome: string) {
  if (!nome || !nome.trim())
    return { success: false, message: "Nome obrigatório" };

  try {
    // Normaliza para evitar duplicatas tipo "Quebra" e "quebra"
    const nomeFormatado = nome.trim();

    // Verifica se já existe (Case insensitive busca manual ou trust unique)
    // O Prisma unique é case sensitive por padrão no Postgres,
    // mas vamos tentar criar e se der erro de unique, retornamos o existente.

    const existente = await prisma.motivo.findFirst({
      where: { nome: { equals: nomeFormatado, mode: "insensitive" } },
    });

    if (existente) {
      return { success: true, data: existente }; // Já existe, retorna sucesso
    }

    const novo = await prisma.motivo.create({
      data: { nome: nomeFormatado },
    });

    revalidatePath("/motivos");
    return { success: true, data: novo };
  } catch (error) {
    console.error("Erro ao criar motivo:", error);
    return { success: false, message: "Erro ao criar motivo." };
  }
}

// 3. Atualizar Motivo
export async function updateMotivo(id: string, nome: string) {
  try {
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

// 4. Deletar Motivo
export async function deleteMotivo(id: string) {
  try {
    await prisma.motivo.delete({
      where: { id },
    });
    revalidatePath("/motivos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir." };
  }
}
