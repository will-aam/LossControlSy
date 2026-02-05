"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ItemUnidade } from "@prisma/client";

// Tipo para criação de item
export type CreateItemData = {
  nome: string;
  codigoBarras?: string;
  codigoInterno?: string; // Agora é opcional no envio, mas pode ser passado
  unidade: string;
  preco?: number;
  custo?: number; // Adicionando custo se quiser enviar
  categoriaId: string;
  fotoUrl?: string;
};

// Helper de Unidade
function parseUnidade(unidade: string): ItemUnidade {
  if (Object.values(ItemUnidade).includes(unidade as ItemUnidade)) {
    return unidade as ItemUnidade;
  }
  return "UN";
}

// Helper para gerar código interno APENAS se não vier preenchido
function generateInternalCode() {
  return `ITEM-${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")}`;
}

// 1. Listar Itens
export async function getItens() {
  try {
    const itens = await prisma.item.findMany({
      orderBy: { nome: "asc" },
      include: {
        categoria: true,
      },
    });

    // CORREÇÃO DO ERRO "Decimal objects are not supported":
    // Convertemos os campos Decimal para Number (float) antes de enviar para o React
    const formattedItens = itens.map((item) => ({
      ...item,
      custo: Number(item.custo),
      precoVenda: Number(item.precoVenda),
      // Campos extras para compatibilidade com a interface antiga se precisar
      preco: Number(item.precoVenda),
    }));

    return { success: true, data: formattedItens };
  } catch (error) {
    console.error("Erro ao buscar itens:", error);
    return { success: false, data: [] };
  }
}

// 2. Criar Item
export async function createItem(data: CreateItemData) {
  if (!data.nome || !data.categoriaId) {
    return { success: false, message: "Nome e Categoria são obrigatórios." };
  }

  try {
    // Validação de Código de Barras (Se existir)
    if (data.codigoBarras) {
      const existeCodigo = await prisma.item.findFirst({
        where: { codigoBarras: data.codigoBarras },
      });
      if (existeCodigo) {
        return {
          success: false,
          message: "Já existe um item com este código de barras.",
        };
      }
    }

    // Validação de Código Interno (Se foi passado manualmente)
    let finalCodigoInterno = data.codigoInterno;

    if (finalCodigoInterno) {
      // Se o usuário mandou um código, verifica se já existe
      const existeInterno = await prisma.item.findUnique({
        where: { codigoInterno: finalCodigoInterno },
      });
      if (existeInterno) {
        return {
          success: false,
          message: "Já existe um item com este Código Interno.",
        };
      }
    } else {
      // Se não mandou, gera automático
      finalCodigoInterno = generateInternalCode();
    }

    await prisma.item.create({
      data: {
        nome: data.nome,
        codigoBarras: data.codigoBarras || null,
        codigoInterno: finalCodigoInterno, // Usa o manual ou o gerado
        unidade: parseUnidade(data.unidade),
        precoVenda: data.preco || 0,
        custo: data.custo || 0,
        categoriaId: data.categoriaId,
        imagemUrl: data.fotoUrl || null,
        status: "ativo",
      },
    });

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar item:", error);
    return { success: false, message: "Erro ao cadastrar item." };
  }
}

// 3. Atualizar Item
export async function updateItem(id: string, data: Partial<CreateItemData>) {
  try {
    if (data.codigoBarras) {
      const existeOutro = await prisma.item.findFirst({
        where: {
          codigoBarras: data.codigoBarras,
          id: { not: id },
        },
      });
      if (existeOutro) {
        return {
          success: false,
          message: "Este código de barras já pertence a outro item.",
        };
      }
    }

    await prisma.item.update({
      where: { id },
      data: {
        nome: data.nome,
        codigoInterno: data.codigoInterno, // Permite atualizar o código interno se necessário
        codigoBarras: data.codigoBarras,
        unidade: data.unidade ? parseUnidade(data.unidade) : undefined,
        precoVenda: data.preco !== undefined ? data.preco : undefined,
        custo: data.custo !== undefined ? data.custo : undefined,
        categoriaId: data.categoriaId,
        imagemUrl: data.fotoUrl,
      },
    });

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    return { success: false, message: "Erro ao atualizar item." };
  }
}

// 4. Alternar Status
export async function toggleItemStatus(id: string) {
  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return { success: false, message: "Item não encontrado." };

    const novoStatus = item.status === "ativo" ? "inativo" : "ativo";

    await prisma.item.update({
      where: { id },
      data: { status: novoStatus },
    });

    revalidatePath("/catalogo");
    return { success: true, newStatus: novoStatus };
  } catch (error) {
    return { success: false, message: "Erro ao alterar status." };
  }
}

// 5. Deletar Item
export async function deleteItem(id: string) {
  try {
    await prisma.item.delete({
      where: { id },
    });

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar item:", error);
    return { success: false, message: "Erro ao excluir item." };
  }
}
