"use server";

import { r2 } from "@/lib/r2";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"; // Adicionado GetObjectCommand
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

/**
 * Helper para extrair a KEY (caminho/nome) da URL completa
 */
export function getKeyFromUrl(url: string): string | null {
  try {
    if (!url.startsWith("http")) return null;
    const urlObj = new URL(url);
    // Remove a barra inicial e decodifica (ex: %20 vira espaço)
    return decodeURIComponent(urlObj.pathname.substring(1));
  } catch (e) {
    return null;
  }
}

/**
 * Gera URL para Upload (PUT) com suporte a PASTAS
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  folder: string = "geral", // <--- Novo parâmetro: Pasta
) {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME não definido no .env");
  }

  // Agora o nome do arquivo inclui a pasta: "notas/uuid-arquivo.pdf"
  const uniqueFileName = `${folder}/${randomUUID()}-${fileName.replace(/\s+/g, "_")}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: uniqueFileName,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

  const publicUrl = `${process.env.R2_PUBLIC_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`}/${uniqueFileName}`;

  return {
    uploadUrl: signedUrl,
    fileKey: uniqueFileName,
    publicUrl: publicUrl,
  };
}

/**
 * Deleta um arquivo do Cloudflare R2
 */
export async function deleteFileFromStorage(fileKey: string) {
  if (!R2_BUCKET_NAME) return;

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    await r2.send(command);
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar arquivo do R2:", error);
    return { success: false, error };
  }
}

/**
 * Gera URL assinada para DOWNLOAD (GET)
 * Usado para abrir arquivos em buckets privados
 */
export async function getPresignedDownloadUrl(fileKey: string) {
  if (!R2_BUCKET_NAME) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });
    // Link válido por 1 hora
    return await getSignedUrl(r2, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("Erro ao gerar link de download:", error);
    return null;
  }
}
