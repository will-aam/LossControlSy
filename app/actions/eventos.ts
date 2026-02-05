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
  fotos?: string[]; // Array de strings (Base64 ou URLs)
};

// 1. Listar Eventos (Dashboard e Lista)
export async function getEventos() {
  try {
    const eventos = await prisma.evento.findMany({
      orderBy: { dataHora: "desc" }, // Mais recentes primeiro
      include: {
        item: {
          include: { categoria: true }, // Traz dados do item e categoria
        },
        criadoPor: {
          select: { nome: true, email: true, role: true }, // Dados do autor
        },
        evidencias: true, // Fotos anexadas
      },
    });

    // Formata os números decimais para o Frontend
    const formattedEventos = eventos.map((ev) => ({
      ...ev,
      quantidade: Number(ev.quantidade),
      custoSnapshot: Number(ev.custoSnapshot),
      precoVendaSnapshot: Number(ev.precoVendaSnapshot),
      // Campos calculados para facilitar exibição
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
  // 1. Identificar Usuário Logado
  const session = await getSession();
  if (!session || !session.id) {
    return { success: false, message: "Usuário não autenticado." };
  }

  // 2. Validar Dados
  if (!data.itemId || !data.quantidade || data.quantidade <= 0) {
    return { success: false, message: "Item e Quantidade são obrigatórios." };
  }

  try {
    // 3. Buscar Item para pegar Preço Atual (Snapshot)
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      return { success: false, message: "Item não encontrado." };
    }

    // 4. Criar o Evento + Evidências numa única transação
    await prisma.evento.create({
      data: {
        dataHora: new Date(),
        motivo: data.motivo,
        status: "rascunho", // Começa como rascunho ou enviado (depende da sua regra, pus rascunho por segurança)
        quantidade: data.quantidade,
        unidade: item.unidade, // Copia a unidade do item

        // SNAPSHOTS: Salva o preço do momento da perda
        custoSnapshot: item.custo,
        precoVendaSnapshot: item.precoVenda,

        itemId: item.id,
        criadoPorId: session.id, // Link com usuário logado

        // Cria as fotos na tabela de Evidências automaticamente
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

// 3. Aprovar/Rejeitar Evento (Para Gestores)
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
