"use server";

import { prisma } from "@/lib/prisma";
import { requireServerPermission } from "@/lib/server-permissions";

export async function getRelatorioGeral(
  startDateStr: string,
  endDateStr: string
) {
  const auth = await requireServerPermission("relatorios:ver");
  if (!auth.success) return { success: false, data: null, message: auth.message };
  const session = auth.session;

  try {
    const minDate = new Date(`${startDateStr}T00:00:00Z`);
    const maxDate = new Date(`${endDateStr}T23:59:59Z`);

    // 1. Fetch Eventos (Perdas)
    const eventos = await prisma.evento.findMany({
      where: {
        ownerId: session.ownerId,
        dataHora: { gte: minDate, lte: maxDate },
        status: { notIn: ["rascunho", "rejeitado"] },
      },
      include: {
        item: {
          include: { categoria: true }
        },
        criadoPor: { select: { nome: true, email: true, role: true } },
      },
      orderBy: { dataHora: "desc" },
    });

    // 2. Fetch Vendas
    const vendas = await prisma.vendaDiaria.findMany({
      where: {
        ownerId: session.ownerId,
        data: { gte: minDate, lte: maxDate },
      },
      include: {
        itens: {
          include: {
            item: true,
          },
        },
      },
    });

    // 3. Aggregate Data
    // We want to combine this to get top items with Taxa de Perda
    const itemMap: Record<
      string,
      { item: any; qtdPerda: number; custoPerda: number; qtdVenda: number; faturamento: number }
    > = {};

    // Process Eventos
    for (const ev of eventos) {
      if (!ev.item) continue;
      const itemId = ev.item.id;
      if (!itemMap[itemId]) {
        itemMap[itemId] = { item: ev.item, qtdPerda: 0, custoPerda: 0, qtdVenda: 0, faturamento: 0 };
      }
      itemMap[itemId].qtdPerda += Number(ev.quantidade);
      itemMap[itemId].custoPerda += Number(ev.custoSnapshot || 0) * Number(ev.quantidade);
    }

    // Process Vendas
    for (const venda of vendas) {
      for (const vi of venda.itens) {
        if (!vi.item) continue;
        const itemId = vi.item.id;
        if (!itemMap[itemId]) {
          itemMap[itemId] = { item: vi.item, qtdPerda: 0, custoPerda: 0, qtdVenda: 0, faturamento: 0 };
        }
        itemMap[itemId].qtdVenda += Number(vi.quantidade);
        itemMap[itemId].faturamento += Number(vi.valorLiquido);
      }
    }

    // Convert to array and calculate Taxa de Perda
    const combinedItens = Object.values(itemMap).map((stat) => {
      let taxaPerda = 0;
      if (stat.faturamento > 0) {
        taxaPerda = (stat.custoPerda / stat.faturamento) * 100;
      } else if (stat.custoPerda > 0) {
        taxaPerda = 100; // If there is loss but 0 sales, consider it 100%
      }

      return {
        ...stat,
        taxaPerda,
      };
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify({
        eventos, // Return raw events for the client side charts
        combinedItens, // Return combined sales/losses for the Top Itens table
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar relatório geral:", error);
    return { success: false, data: null };
  }
}
