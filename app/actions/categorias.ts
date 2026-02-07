// app/actions/categorias.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 1. Listar Categorias
export async function getCategorias() {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nome: "asc" },
      // Trazemos todas, inclusive inativas se houver, para gestão
    });
    return { success: true, data: categorias };
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return { success: false, data: [] };
  }
}

// 2. Criar Categoria
export async function createCategoria(nome: string) {
  if (!nome) return { success: false, message: "Nome é obrigatório" };

  try {
    // Verifica se já existe uma com esse nome exato
    const existe = await prisma.categoria.findUnique({
      where: { nome },
    });

    if (existe) {
      return {
        success: false,
        message: "Já existe uma categoria com este nome.",
      };
    }

    await prisma.categoria.create({
      data: { nome, status: "ativa" },
    });

    revalidatePath("/categorias"); // Atualiza a tela de listagem automaticamente
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return { success: false, message: "Erro interno ao criar categoria." };
  }
}

// 3. Atualizar Categoria
export async function updateCategoria(id: string, nome: string) {
  try {
    await prisma.categoria.update({
      where: { id },
      data: { nome },
    });
    revalidatePath("/categorias");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return { success: false, message: "Erro ao atualizar." };
  }
}

// 4. Deletar Categoria
export async function deleteCategoria(id: string) {
  try {
    // Segurança: Verifica se tem itens usando essa categoria antes de deletar
    const itensVinculados = await prisma.item.count({
      where: { categoriaId: id },
    });

    if (itensVinculados > 0) {
      return {
        success: false,
        message:
          "Não é possível excluir: existem itens cadastrados nesta categoria.",
      };
    }

    await prisma.categoria.delete({
      where: { id },
    });

    revalidatePath("/categorias");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar categoria:", error);
    return { success: false, message: "Erro ao excluir." };
  }
}
