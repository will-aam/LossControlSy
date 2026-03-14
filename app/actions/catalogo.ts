// app/actions/catalogo.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ItemUnidade } from "@prisma/client";
import { Item } from "@/lib/types";
import { getSession } from "@/lib/session"; // NOVO

// Tipo para criação de item
export type CreateItemData = {
  nome: string;
  codigoBarras?: string;
  codigoInterno?: string;
  unidade: string;
  preco?: number;
  custo?: number;
  categoriaId: string;
  fotoUrl?: string;
};

// Helper de Unidade
function parseUnidade(unidade: string): ItemUnidade {
  const u = unidade.toUpperCase();
  if (Object.values(ItemUnidade).includes(u as ItemUnidade)) {
    return u as ItemUnidade;
  }
  return "UN";
}

// Helper para gerar código interno
function generateInternalCode() {
  return `ITEM-${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")}`;
}

// 1. Listar Itens (Filtrados por loja)
export async function getItens() {
  const session = await getSession();
  if (!session) return { success: false, data: [] };

  try {
    const itens = await prisma.item.findMany({
      where: { ownerId: session.ownerId }, // NOVO: Filtro de isolamento
      orderBy: { nome: "asc" },
      include: {
        categoria: true,
      },
    });

    const formattedItens = itens.map((item) => ({
      ...item,
      custo: Number(item.custo),
      precoVenda: Number(item.precoVenda),
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
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  if (!data.nome || !data.categoriaId) {
    return { success: false, message: "Nome e Categoria são obrigatórios." };
  }

  try {
    // Verifica Código de Barras apenas NA MESMA LOJA
    if (data.codigoBarras) {
      const existeCodigo = await prisma.item.findFirst({
        where: {
          codigoBarras: data.codigoBarras,
          ownerId: session.ownerId,
        },
      });
      if (existeCodigo) {
        return {
          success: false,
          message: "Você já possui um item com este código de barras.",
        };
      }
    }

    let finalCodigoInterno = data.codigoInterno;

    // Verifica Código Interno apenas NA MESMA LOJA
    if (finalCodigoInterno) {
      const existeInterno = await prisma.item.findFirst({
        where: {
          codigoInterno: finalCodigoInterno,
          ownerId: session.ownerId,
        },
      });
      if (existeInterno) {
        return {
          success: false,
          message: "Este Código Interno já está em uso na sua loja.",
        };
      }
    } else {
      finalCodigoInterno = generateInternalCode();
    }

    await prisma.item.create({
      data: {
        nome: data.nome,
        codigoBarras: data.codigoBarras || null,
        codigoInterno: finalCodigoInterno,
        unidade: parseUnidade(data.unidade),
        precoVenda: data.preco || 0,
        custo: data.custo || 0,
        categoriaId: data.categoriaId,
        imagemUrl: data.fotoUrl || null,
        status: "ativo",
        ownerId: session.ownerId, // NOVO: Amarra o item à loja
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
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    // Validação de posse
    const itemExistente = await prisma.item.findUnique({ where: { id } });
    if (!itemExistente || itemExistente.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Item não encontrado ou sem permissão.",
      };
    }

    if (data.codigoBarras) {
      const existeOutro = await prisma.item.findFirst({
        where: {
          codigoBarras: data.codigoBarras,
          ownerId: session.ownerId,
          id: { not: id },
        },
      });
      if (existeOutro) {
        return {
          success: false,
          message:
            "Este código de barras já pertence a outro item da sua loja.",
        };
      }
    }

    await prisma.item.update({
      where: { id },
      data: {
        nome: data.nome,
        codigoInterno: data.codigoInterno,
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
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item || item.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Item não encontrado ou sem permissão.",
      };
    }

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
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item || item.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Item não encontrado ou sem permissão.",
      };
    }

    await prisma.item.delete({ where: { id } });

    revalidatePath("/catalogo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar item:", error);
    return { success: false, message: "Erro ao excluir item." };
  }
}

// 6. IMPORTAÇÃO EM MASSA (AJUSTADA PARA MULTI-TENANT)
export async function importarItens(itensImportados: Item[]) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    let count = 0;
    const categoriaCache = new Map<string, string>();

    for (const item of itensImportados) {
      if (!item.nome) continue;

      const nomeCategoria = item.categoria || "Geral";
      let categoriaId = categoriaCache.get(nomeCategoria);

      if (!categoriaId) {
        const catExistente = await prisma.categoria.findFirst({
          where: {
            nome: { equals: nomeCategoria, mode: "insensitive" },
            ownerId: session.ownerId, // Busca apenas categorias da própria loja
          },
        });

        if (catExistente) {
          categoriaId = catExistente.id;
        } else {
          const novaCat = await prisma.categoria.create({
            data: {
              nome: nomeCategoria,
              status: "ativa",
              ownerId: session.ownerId, // Cria categoria vinculada à loja
            },
          });
          categoriaId = novaCat.id;
        }
        categoriaCache.set(nomeCategoria, categoriaId);
      }

      // Upsert agora precisa considerar o ownerId na chave única composta
      await prisma.item.upsert({
        where: {
          codigoInterno_ownerId: {
            // NOVO: Usa a chave composta definida no schema
            codigoInterno: item.codigoInterno,
            ownerId: session.ownerId,
          },
        },
        update: {
          nome: item.nome,
          precoVenda: item.precoVenda,
          custo: item.custo,
          unidade: parseUnidade(item.unidade),
          categoriaId: categoriaId,
        },
        create: {
          codigoInterno: item.codigoInterno,
          nome: item.nome,
          codigoBarras: item.codigoBarras || null,
          precoVenda: item.precoVenda || 0,
          custo: item.custo || 0,
          unidade: parseUnidade(item.unidade),
          categoriaId: categoriaId,
          status: "ativo",
          ownerId: session.ownerId, // Vincula à loja
        },
      });

      count++;
    }

    revalidatePath("/catalogo");
    return { success: true, count };
  } catch (error) {
    console.error("Erro na importação:", error);
    return { success: false, message: "Falha ao processar importação." };
  }
}
