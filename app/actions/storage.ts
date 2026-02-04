"use server";

import { r2 } from "@/lib/r2";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

/**
 * Gera uma URL assinada para upload direto no Cloudflare R2
 * O arquivo não passa pelo servidor Next.js, vai direto do navegador para o R2.
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
) {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME não definido no .env");
  }

  // Gera um nome único para evitar sobreposição de arquivos
  // Ex: "perda-01.jpg" vira "a1b2c3d4-perda-01.jpg"
  const uniqueFileName = `${randomUUID()}-${fileName.replace(/\s+/g, "_")}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: uniqueFileName,
    ContentType: contentType,
    // ACL: "public-read" // Descomente se quiser arquivos públicos por padrão (não recomendado para dados sensíveis)
  });

  // A URL expira em 1 hora (3600 segundos)
  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

  // Retornamos a URL para upload e a URL pública final (onde o arquivo ficará)
  // Nota: Se você usar um domínio personalizado no R2, ajuste a publicUrl aqui.
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
