"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { EventoStatus } from "@prisma/client";
import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

export type CreateEventoData = {
  itemId: string;
  quantidade: number;
  motivo: string;
  fotos?: string[];
  dataPersonalizada?: Date;
};

// URL Pública do seu R2 (Fallback de segurança)
const R2_DOMAIN_FALLBACK =
  "https://pub-4209581585804561a086053351239c05.r2.dev";

async function uploadToR2(base64Image: string): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `eventos/${randomUUID()}.jpg`;
    const bucketName = process.env.R2_BUCKET_NAME || "losscontrolsy";

    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: "image/jpeg",
      }),
    );

    // Tenta pegar do .env, se falhar, usa o fallback hardcoded
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || R2_DOMAIN_FALLBACK;
    const domain = publicDomain.replace(/\/$/, ""); // Remove barra final se houver

    // Retorna: https://.../eventos/uuid.jpg
    return `${domain}/${fileName}`;
  } catch (error) {
    console.error("Erro CRÍTICO no upload R2:", error);
    return null;
  }
}

// 1. Listar Eventos
export async function getEventos() {
  try {
    const eventos = await prisma.evento.findMany({
      orderBy: { dataHora: "desc" },
      include: {
        item: { include: { categoria: true } },
        criadoPor: { select: { nome: true, email: true, role: true } },
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

// 2. Criar Evento
export async function createEvento(data: CreateEventoData) {
  const session = await getSession();
  if (!session || !session.id)
    return { success: false, message: "Não autorizado." };

  if (!data.itemId || !data.quantidade || data.quantidade <= 0) {
    return { success: false, message: "Dados inválidos." };
  }

  try {
    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item) return { success: false, message: "Item não encontrado." };

    // UPLOAD DAS FOTOS
    const uploadedUrls: string[] = [];
    if (data.fotos && data.fotos.length > 0) {
      for (const fotoBase64 of data.fotos) {
        if (fotoBase64.startsWith("http")) {
          uploadedUrls.push(fotoBase64);
        } else {
          const url = await uploadToR2(fotoBase64);
          if (url) uploadedUrls.push(url);
        }
      }
    }

    const dataDoEvento = data.dataPersonalizada || new Date();

    await prisma.evento.create({
      data: {
        dataHora: dataDoEvento,
        motivo: data.motivo,
        status: "rascunho",
        quantidade: data.quantidade,
        unidade: item.unidade,
        custoSnapshot: item.custo,
        precoVendaSnapshot: item.precoVenda,
        itemId: item.id,
        criadoPorId: session.id,
        evidencias: {
          create: uploadedUrls.map((url) => ({
            url: url,
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

// 3. Status
export async function updateEventoStatus(id: string, novoStatus: EventoStatus) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };
  try {
    await prisma.evento.update({
      where: { id },
      data: {
        status: novoStatus,
        aprovadoPorId: ["aprovado", "rejeitado"].includes(novoStatus)
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

// 4. Delete
export async function deleteEvento(id: string) {
  try {
    await prisma.evento.delete({ where: { id } });
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir evento." };
  }
}
