"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Função helper de upload (mesma do eventos.ts)
async function uploadToR2(base64Image: string): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `galeria/${randomUUID()}.jpg`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: "image/jpeg",
        ACL: "public-read",
      }),
    );

    return process.env.R2_PUBLIC_DOMAIN
      ? `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`
      : fileName;
  } catch (error) {
    console.error("Erro R2:", error);
    return null;
  }
}

// 1. Listar
export async function getEvidencias() {
  try {
    const evidencias = await prisma.evidencia.findMany({
      orderBy: { dataUpload: "desc" },
      include: {
        evento: {
          include: {
            item: { select: { nome: true, codigoInterno: true } },
          },
        },
        user: { select: { nome: true } },
      },
    });

    const formattedData = evidencias.map((ev) => ({
      ...ev,
      evento: ev.evento
        ? {
            ...ev.evento,
            quantidade: Number(ev.evento.quantidade),
            custoSnapshot: Number(ev.evento.custoSnapshot),
            precoVendaSnapshot: Number(ev.evento.precoVendaSnapshot),
            item: ev.evento.item,
          }
        : undefined,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// 2. Criar Evidência (Atualizado para R2 e Vinculação)
export async function createEvidenciaAvulsa(data: {
  url: string;
  motivo?: string;
  eventoId?: string; // NOVO: Permite vincular a um evento existente
}) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    // Faz o upload real
    const r2Url = await uploadToR2(data.url);
    if (!r2Url)
      return { success: false, message: "Falha no upload da imagem." };

    await prisma.evidencia.create({
      data: {
        url: r2Url, // Salva a URL curta do R2
        motivo: data.motivo || "Upload Galeria",
        dataUpload: new Date(),
        userId: session.id,
        eventoId: data.eventoId || null, // Vincula se tiver ID
      },
    });

    revalidatePath("/galeria");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao salvar foto." };
  }
}

// 3. Excluir
export async function deleteEvidencia(id: string) {
  try {
    // Opcional: Aqui você poderia também deletar do R2 se quisesse limpar espaço
    await prisma.evidencia.delete({ where: { id } });
    revalidatePath("/galeria");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir foto." };
  }
}

// 4. Listar Eventos Recentes (Para o Select do Dialog)
export async function getEventosRecentes() {
  try {
    const eventos = await prisma.evento.findMany({
      take: 20, // Pega os últimos 20
      orderBy: { dataHora: "desc" },
      include: {
        item: { select: { nome: true } },
      },
    });

    return {
      success: true,
      data: eventos.map((e) => ({
        id: e.id,
        label: `${new Date(e.dataHora).toLocaleDateString()} - ${e.item?.nome || "Item desconhecido"} (${Number(e.quantidade)} ${e.unidade})`,
      })),
    };
  } catch (error) {
    return { success: false, data: [] };
  }
}
