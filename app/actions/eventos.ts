"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { EventoStatus } from "@prisma/client";

// Tipo de entrada de dados para criar evento
export type CreateEventoData = {
  itemId: string;
  quantidade: number;
  motivo: string;
  fotos?: string[];
  dataPersonalizada?: Date; // <--- NOVO CAMPO
};

// 1. Listar Eventos (Dashboard e Lista)
export async function getEventos() {
  try {
    const eventos = await prisma.evento.findMany({
      orderBy: { dataHora: "desc" },
      include: {
        item: {
          include: { categoria: true },
        },
        criadoPor: {
          select: { nome: true, email: true, role: true },
        },
        evidencias: true,
      },
    });

    const formattedEventos = eventos.map((ev) => ({
      ...ev,
      quantidade: Number(ev.quantidade),
      custoSnapshot: Number(ev.custoSnapshot),
      precoVendaSnapshot: Number(ev.precoVendaSnapshot),
      valorTotal: Number(ev.precoVendaSnapshot) * Number(ev.quantidade),
      item: ev.item
        ? {
            ...ev.item,
            custo: Number(ev.item.custo),
            precoVenda: Number(ev.item.precoVenda),
          }
        : null,
    }));

    return { success: true, data: formattedEventos };
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return { success: false, data: [] };
  }
}

// 2. Criar Evento (Registrar Perda)
export async function createEvento(data: CreateEventoData) {
  const session = await getSession();
  if (!session || !session.id) {
    return { success: false, message: "Usuário não autenticado." };
  }

  if (!data.itemId || !data.quantidade || data.quantidade <= 0) {
    return { success: false, message: "Item e Quantidade são obrigatórios." };
  }

  try {
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      return { success: false, message: "Item não encontrado." };
    }

    // LÓGICA DE DATA: Usa a personalizada ou a atual
    const dataDoEvento = data.dataPersonalizada || new Date();

    await prisma.evento.create({
      data: {
        dataHora: dataDoEvento, // <--- APLICA A DATA AQUI
        motivo: data.motivo,
        status: "rascunho",
        quantidade: data.quantidade,
        unidade: item.unidade,
        custoSnapshot: item.custo,
        precoVendaSnapshot: item.precoVenda,
        itemId: item.id,
        criadoPorId: session.id,
        evidencias: {
          create: data.fotos?.map((fotoUrl) => ({
            url: fotoUrl,
            userId: session.id,
            motivo: data.motivo,
          })),
        },
      },
    });

    revalidatePath("/eventos");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar perda:", error);
    return { success: false, message: "Erro ao salvar evento." };
  }
}

// 3. Aprovar/Rejeitar Evento
export async function updateEventoStatus(id: string, novoStatus: EventoStatus) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    await prisma.evento.update({
      where: { id },
      data: {
        status: novoStatus,
        aprovadoPorId:
          novoStatus === "aprovado" || novoStatus === "rejeitado"
            ? session.id
            : undefined,
      },
    });

    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao atualizar status." };
  }
}

// 4. Excluir Evento
export async function deleteEvento(id: string) {
  try {
    await prisma.evento.delete({ where: { id } });
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir evento." };
  }
}
