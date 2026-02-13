"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { EventoStatus } from "@prisma/client";
import { r2 } from "@/lib/r2";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"; // Adicionado GetObjectCommand
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"; // Adicionado getSignedUrl
import { randomUUID } from "crypto";

export type CreateEventoData = {
  itemId: string;
  quantidade: number;
  motivo: string;
  fotos?: string[];
  dataPersonalizada?: Date;
};

// Função helper para extrair a KEY (nome do arquivo) da URL completa
// Função helper para extrair a KEY (nome do arquivo) da URL completa
function getKeyFromUrl(url: string): string | null {
  try {
    if (!url.startsWith("http")) return null; // Se não for URL, ignora
    const urlObj = new URL(url);

    // 1. Pega o caminho (ex: /eventos/Minha%20Foto.jpg)
    // 2. Remove a barra inicial (.substring(1))
    // 3. DECODIFICA para remover %20 e outros símbolos (decodeURIComponent)
    const rawPath = urlObj.pathname.substring(1);
    return decodeURIComponent(rawPath);
  } catch (e) {
    return null;
  }
}

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

// 5. Buscar Nota do Lote (COM ASSINATURA DE URL)
export async function getNotaDoLote(dataString: string) {
  try {
    const start = new Date(`${dataString}T00:00:00.000Z`);
    const end = new Date(`${dataString}T23:59:59.999Z`);

    // Busca nota onde dataReferencia bate com o dia
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

    // Fallback: Tenta buscar por dataEmissao
    if (!nota) {
      nota = await prisma.notaFiscal.findFirst({
        where: {
          dataEmissao: {
            gte: start,
            lte: end,
          },
          dataReferencia: null,
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

    let finalUrl = nota.pdfUrl || nota.xmlUrl;

    // --- GERAR URL ASSINADA SE FOR LINK DO R2 ---
    if (finalUrl && finalUrl.startsWith("http")) {
      const fileKey = getKeyFromUrl(finalUrl);
      if (fileKey && process.env.R2_BUCKET_NAME) {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
          });
          // Gera URL válida por 1 hora (3600 segundos)
          finalUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
        } catch (signError) {
          console.error("Erro ao assinar URL:", signError);
          // Se falhar a assinatura, tenta retornar a URL original como fallback
        }
      }
    } else if (nota.xmlContent) {
      // Se for conteúdo XML texto
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
    console.error("Erro ao buscar nota do lote:", error);
    return { success: false, message: "Erro ao buscar nota fiscal." };
  }
}
