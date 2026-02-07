"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ItemUnidade } from "@prisma/client";
import { Item } from "@/lib/types"; // Importamos o tipo Item

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
  if (!data.nome || !data.categoriaId) {
    return { success: false, message: "Nome e Categoria são obrigatórios." };
  }

  try {
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

    let finalCodigoInterno = data.codigoInterno;

    if (finalCodigoInterno) {
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

// 6. IMPORTAÇÃO EM MASSA (NOVA FUNÇÃO)
export async function importarItens(itensImportados: Item[]) {
  try {
    let count = 0;

    // Cache simples de categorias para não consultar o banco a cada linha
    const categoriaCache = new Map<string, string>();

    for (const item of itensImportados) {
      if (!item.nome) continue; // Pula linhas inválidas

      // 1. Resolver Categoria (Find or Create)
      // O CSV traz o nome da categoria. Precisamos do ID.
      const nomeCategoria = item.categoria || "Geral";
      let categoriaId = categoriaCache.get(nomeCategoria);

      if (!categoriaId) {
        // Tenta achar no banco
        const catExistente = await prisma.categoria.findFirst({
          where: { nome: { equals: nomeCategoria, mode: "insensitive" } },
        });

        if (catExistente) {
          categoriaId = catExistente.id;
        } else {
          // Cria nova categoria se não existir
          const novaCat = await prisma.categoria.create({
            data: { nome: nomeCategoria, status: "ativa" },
          });
          categoriaId = novaCat.id;
        }
        // Salva no cache
        categoriaCache.set(nomeCategoria, categoriaId);
      }

      // 2. Salvar ou Atualizar Item (Upsert)
      // Usamos o codigoInterno como chave única para saber se atualizamos ou criamos
      await prisma.item.upsert({
        where: { codigoInterno: item.codigoInterno },
        update: {
          nome: item.nome,
          precoVenda: item.precoVenda,
          custo: item.custo,
          unidade: parseUnidade(item.unidade),
          categoriaId: categoriaId,
          // Não atualizamos codigoBarras ou Imagem para não sobrescrever dados manuais
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
