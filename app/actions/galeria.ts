"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Função helper de upload para o R2 (Igual ao eventos.ts)
async function uploadToR2(base64Image: string): Promise<string | null> {
  try {
    // Limpa o prefixo do base64 se houver
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `galeria/${randomUUID()}.jpg`;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      console.error("ERRO: R2_BUCKET_NAME não definido.");
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

    // Retorna a URL pública correta
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;
    if (publicDomain) {
      const domain = publicDomain.replace(/\/$/, "");
      return `${domain}/${fileName}`;
    }

    console.warn("ATENÇÃO: R2_PUBLIC_DOMAIN ausente.");
    return fileName;
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

// 2. Criar Evidência (AGORA COM DATA E VÍNCULO)
export async function createEvidenciaAvulsa(data: {
  url: string;
  motivo?: string;
  eventoId?: string; // Vínculo com evento
  dataPersonalizada?: Date | string; // Data retroativa
}) {
  const session = await getSession();
  if (!session) return { success: false, message: "Não autorizado" };

  try {
    // Upload para R2
    const r2Url = await uploadToR2(data.url);
    if (!r2Url)
      return { success: false, message: "Falha no upload da imagem." };

    // Define a data: ou a escolhida ou agora
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

// 4. Buscar Eventos para Vínculo (NOVA)
export async function buscarEventosParaVinculo() {
  try {
    // Busca os últimos 50 eventos para vincular fotos
    const eventos = await prisma.evento.findMany({
      take: 50,
      orderBy: { dataHora: "desc" },
      include: {
        item: {
          select: { nome: true, codigoInterno: true, unidade: true },
        },
      },
    });

    // Formata para o combobox
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
