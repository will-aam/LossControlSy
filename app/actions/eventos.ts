// app/actions/eventos.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { requireServerPermission, checkServerPermission } from "@/lib/server-permissions";
import { EventoStatus } from "@prisma/client";
import { r2 } from "@/lib/r2";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { getKeyFromUrl } from "@/lib/utils";

export type CreateEventoData = {
  itemId: string;
  quantidade: number;
  motivo: string;
  fotos?: string[];
  dataPersonalizada?: Date;
};

async function uploadToR2(base64Image: string): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `eventos/${randomUUID()}.jpg`;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;

    if (!bucketName || !publicDomain) return null;

    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: "image/jpeg",
      }),
    );

    const domain = publicDomain.replace(/\/$/, "");
    return `${domain}/${fileName}`;
  } catch (error) {
    console.error("Erro no upload R2:", error);
    return null;
  }
}

// 1. Listar Eventos (ATUALIZADO: Inclui Notas Fiscais)
export async function getEventos() {
  const { session, hasAccess } = await checkServerPermission("eventos:ver_todos");
  if (!session) return { success: false, data: [] };

  try {
    const eventos = await prisma.evento.findMany({
      where: hasAccess 
        ? { ownerId: session.ownerId } 
        : { ownerId: session.ownerId, criadoPorId: session.id },
      orderBy: { dataHora: "desc" },
      include: {
        item: { include: { categoria: true } },
        criadoPor: { select: { nome: true, email: true, role: true } },
        evidencias: true,
        notasFiscais: {
          // NOVO: Traz info da nota vinculada ao item
          select: { id: true, numero: true, pdfUrl: true, xmlUrl: true },
        },
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
            custoMedio: Number((ev.item as any).custoMedio || 0),
          }
        : null,
    }));

    return { success: true, data: formattedEventos };
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return { success: false, data: [] };
  }
}

export async function createEvento(data: CreateEventoData) {
  const auth = await requireServerPermission("eventos:criar");
  if (!auth.success) return auth;
  const session = auth.session;
  try {
    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item || item.ownerId !== session.ownerId)
      return { success: false, message: "Item não encontrado." };

    const uploadedUrls: string[] = [];
    if (data.fotos) {
      for (const foto of data.fotos) {
        const url = foto.startsWith("http") ? foto : await uploadToR2(foto);
        if (url) {
          uploadedUrls.push(url);
        } else {
          return { success: false, message: "Falha ao enviar a imagem para o servidor. Verifique a conexão ou tente novamente." };
        }
      }
    }

    await prisma.evento.create({
      data: {
        dataHora: data.dataPersonalizada || new Date(),
        motivo: data.motivo,
        status: "rascunho",
        quantidade: data.quantidade,
        unidade: item.unidade,
        custoSnapshot: item.custo,
        precoVendaSnapshot: item.precoVenda,
        itemId: item.id,
        criadoPorId: session.id,
        ownerId: session.ownerId,
        evidencias: {
          create: uploadedUrls.map((url) => ({
            url,
            userId: session.id,
            motivo: data.motivo,
            ownerId: session.ownerId,
          })),
        },
      },
    });
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao salvar evento." };
  }
}

export async function updateEventoStatus(id: string, novoStatus: EventoStatus) {
  const auth = await requireServerPermission(
    ["aprovado", "rejeitado"].includes(novoStatus) ? "eventos:aprovar" : "eventos:editar"
  );
  if (!auth.success) return auth;
  const session = auth.session;
  try {
    await prisma.evento.update({
      where: { id, ownerId: session.ownerId },
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
    return { success: false, message: "Erro ao atualizar." };
  }
}

export async function deleteEvento(id: string) {
  const auth = await requireServerPermission("eventos:excluir");
  if (!auth.success) return auth;
  const session = auth.session;
  try {
    await prisma.evento.delete({ where: { id, ownerId: session.ownerId } });
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir." };
  }
}

export async function toggleNfeEmitidaLote(eventoIds: string[], nfeEmitida: boolean) {
  const auth = await requireServerPermission("eventos:editar");
  if (!auth.success) return auth;
  const session = auth.session;

  try {
    // Only update events that belong to the user's ownerId for security
    await prisma.evento.updateMany({
      where: {
        id: { in: eventoIds },
        ownerId: session.ownerId,
      },
      data: {
        nfeEmitida,
      },
    });
    
    revalidatePath("/eventos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar nfeEmitida em lote:", error);
    return { success: false, message: "Erro ao atualizar status da nota fiscal." };
  }
}

// 5. Buscar Nota do Lote (ATUALIZADO: Detecta Expiração)
export async function getNotaDoLote(dataString: string) {
  const auth = await requireServerPermission("notas:ver");
  if (!auth.success) return auth;
  const session = auth.session;

  try {
    const start = new Date(`${dataString}T00:00:00.000Z`);
    const end = new Date(`${dataString}T23:59:59.999Z`);

    const nota = await prisma.notaFiscal.findFirst({
      where: {
        ownerId: session.ownerId,
        OR: [
          { dataReferencia: { gte: start, lte: end } },
          { dataEmissao: { gte: start, lte: end }, dataReferencia: null },
        ],
      },
      select: { pdfUrl: true, xmlUrl: true, numero: true, xmlContent: true },
      orderBy: { dataUpload: "desc" },
    });

    if (!nota)
      return {
        success: false,
        message: "Nenhuma nota fiscal vinculada a este dia.",
      };

    // NOVO: Se o registro existe mas os arquivos foram apagados pelo Cron
    if (!nota.pdfUrl && !nota.xmlUrl && !nota.xmlContent) {
      return {
        success: false,
        isExpired: true, // Flag para o front-end
        message: `Nota Fiscal Nº ${nota.numero} expirou e o documento foi removido.`,
      };
    }

    let finalUrl = nota.pdfUrl || nota.xmlUrl;

    if (finalUrl && finalUrl.startsWith("http")) {
      const fileKey = getKeyFromUrl(finalUrl);
      if (fileKey && process.env.R2_BUCKET_NAME) {
        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
        });
        finalUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
      }
    } else if (nota.xmlContent) {
      finalUrl = `data:text/xml;base64,${Buffer.from(nota.xmlContent).toString("base64")}`;
    }

    return {
      success: true,
      url: finalUrl,
      filename: nota.numero
        ? `nota-${nota.numero}.pdf`
        : `nota-${dataString}.pdf`,
      type: nota.pdfUrl ? "pdf" : "xml",
    };
  } catch (error) {
    return { success: false, message: "Erro ao buscar nota fiscal." };
  }
}
