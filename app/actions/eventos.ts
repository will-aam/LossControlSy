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

// Função helper de upload para o R2
async function uploadToR2(base64Image: string): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `eventos/${randomUUID()}.jpg`;

    const bucketName = process.env.R2_BUCKET_NAME;
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;

    if (!bucketName || !publicDomain) {
      console.error(
        "ERRO DE CONFIGURAÇÃO: Verifique R2_BUCKET_NAME e R2_PUBLIC_DOMAIN no arquivo .env",
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
    return `${domain}/${fileName}`;
  } catch (error) {
    console.error("Erro no upload R2:", error);
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

// 5. Buscar Nota do Lote
export async function getNotaDoLote(dataString: string) {
  try {
    // A dataString vem como "YYYY-MM-DD"
    // Vamos buscar uma nota que tenha dataReferencia no mesmo dia.
    // Como dataReferencia é DateTime, precisamos do intervalo.

    // Converte string YYYY-MM-DD para Date local
    // Importante: new Date("2023-10-06") é UTC. new Date("2023-10-06T00:00") é local.
    // Vamos assumir que dataString é YYYY-MM-DD e construir o intervalo UTC para garantir.
    const start = new Date(`${dataString}T00:00:00.000Z`);
    const end = new Date(`${dataString}T23:59:59.999Z`);

    // Busca nota onde dataReferencia bate com o dia
    // Se não achar por dataReferencia, faz fallback para dataEmissao (para compatibilidade ou erro de cadastro)
    let nota = await prisma.notaFiscal.findFirst({
      where: {
        dataReferencia: {
          gte: start,
          lte: end,
        },
      },
      select: {
        pdfUrl: true,
        xmlUrl: true,
        numero: true,
        xmlContent: true,
      },
      orderBy: { dataUpload: "desc" },
    });

    // Fallback: Tenta buscar por dataEmissao se não achou por dataReferencia
    if (!nota) {
      nota = await prisma.notaFiscal.findFirst({
        where: {
          dataEmissao: {
            gte: start,
            lte: end,
          },
          dataReferencia: null, // Só busca aqui se não tiver sido explicitamente vinculado a outro dia
        },
        select: {
          pdfUrl: true,
          xmlUrl: true,
          numero: true,
          xmlContent: true,
        },
        orderBy: { dataUpload: "desc" },
      });
    }

    if (!nota) {
      return {
        success: false,
        message: "Nenhuma nota fiscal encontrada para esta data.",
      };
    }

    return {
      success: true,
      url:
        nota.pdfUrl ||
        nota.xmlUrl ||
        (nota.xmlContent
          ? `data:text/xml;base64,${Buffer.from(nota.xmlContent).toString("base64")}`
          : null),
      filename: nota.numero
        ? `nota-${nota.numero}.pdf`
        : `nota-${dataString}.pdf`,
      type: nota.pdfUrl ? "pdf" : "xml",
    };
  } catch (error) {
    console.error("Erro ao buscar nota do lote:", error);
    return { success: false, message: "Erro ao buscar nota fiscal." };
  }
}
