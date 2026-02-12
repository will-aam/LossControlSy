"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Função helper de upload para o R2
async function uploadToR2(base64Image: string): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `galeria/${randomUUID()}.jpg`;

    const bucketName = process.env.R2_BUCKET_NAME;
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;

    if (!bucketName || !publicDomain) {
      console.error(
        "ERRO DE CONFIGURAÇÃO: Verifique R2_BUCKET_NAME e R2_PUBLIC_DOMAIN no .env",
      );
      return null;
    }

    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: "image/jpeg",
      }),
    );

    const domain = publicDomain.replace(/\/$/, "");
    const fullUrl = `${domain}/${fileName}`;
    return fullUrl;
  } catch (error) {
    console.error("Erro R2:", error);
    return null;
  }
}

// 1. Listar Evidências
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
      // Se não tiver http, tenta corrigir (legado)
      url:
        ev.url.startsWith("http") || ev.url.startsWith("data:")
          ? ev.url
          : `${process.env.R2_PUBLIC_DOMAIN?.replace(/\/$/, "")}/${ev.url}`,
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

// 2. Criar Evidência
export async function createEvidenciaAvulsa(data: {
  url: string;
  motivo?: string;
  eventoId?: string;
  dataPersonalizada?: Date | string;
}) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const r2Url = await uploadToR2(data.url);
    if (!r2Url)
      return { success: false, message: "Falha no upload da imagem." };

    const dataFinal = data.dataPersonalizada
      ? new Date(data.dataPersonalizada)
      : new Date();

    await prisma.evidencia.create({
      data: {
        url: r2Url,
        motivo: data.motivo || "Upload Galeria",
        dataUpload: dataFinal,
        userId: session.id,
        eventoId: data.eventoId || null,
      },
    });

    revalidatePath("/galeria");
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar evidencia:", error);
    return { success: false, message: "Erro ao salvar foto." };
  }
}

// 3. Excluir Evidência
export async function deleteEvidencia(id: string) {
  try {
    await prisma.evidencia.delete({ where: { id } });
    revalidatePath("/galeria");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir foto." };
  }
}

// 4. Buscar Eventos para Vínculo
export async function buscarEventosParaVinculo() {
  try {
    const eventos = await prisma.evento.findMany({
      take: 50,
      orderBy: { dataHora: "desc" },
      include: {
        item: {
          select: { nome: true, codigoInterno: true, unidade: true },
        },
      },
    });

    return {
      success: true,
      data: eventos.map((e) => ({
        id: e.id,
        label: `${new Date(e.dataHora).toLocaleDateString("pt-BR")} - ${e.item?.nome} (${Number(e.quantidade)} ${e.unidade})`,
        dataOriginal: e.dataHora,
      })),
    };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// 5. Atualizar Evidência (Edição) - AGORA FORA DA OUTRA FUNÇÃO
export async function updateEvidencia(
  id: string,
  data: {
    motivo?: string;
    eventoId?: string;
    dataPersonalizada?: Date | string;
  },
) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    const dataFinal = data.dataPersonalizada
      ? new Date(data.dataPersonalizada)
      : undefined;

    await prisma.evidencia.update({
      where: { id },
      data: {
        motivo: data.motivo,
        eventoId: data.eventoId === "none" ? null : data.eventoId,
        dataUpload: dataFinal,
      },
    });

    revalidatePath("/galeria");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar evidencia:", error);
    return { success: false, message: "Erro ao atualizar foto." };
  }
}
