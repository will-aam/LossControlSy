"use strict";
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

interface NFeItemExtracted {
  cProd: string;
  xProd: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
}

function extractTagValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

export async function importNFeXML(formData: FormData) {
  try {
    const user = await getSession();
    if (!user || !user.ownerId) {
      return { success: false, error: "Usuário não autenticado ou sem permissão." };
    }

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "Nenhum arquivo enviado." };

    const xmlText = await file.text();

    // Validar se é NFe
    if (!xmlText.includes("<nfeProc") && !xmlText.includes("<NFe")) {
      return { success: false, error: "Arquivo não parece ser um XML de NFe válido." };
    }

    // Extrair dados do cabeçalho
    const numero = extractTagValue(xmlText, "nNF");
    const emitente = extractTagValue(xmlText, "xNome"); // do grupo <emit>
    const dataEmissaoRaw = extractTagValue(xmlText, "dhEmi") || extractTagValue(xmlText, "dEmi");
    const valorTotalRaw = extractTagValue(xmlText, "vNF");
    
    const dataEmissao = dataEmissaoRaw ? new Date(dataEmissaoRaw) : null;
    const valorTotal = valorTotalRaw ? parseFloat(valorTotalRaw) : 0;

    // Extrair os itens (grupo <det>)
    const detGroups = xmlText.split(/<det /i).slice(1);
    const itensNFe: NFeItemExtracted[] = [];

    for (const det of detGroups) {
      const prodGroupMatch = det.match(/<prod>([\s\S]*?)<\/prod>/i);
      if (prodGroupMatch) {
        const prodXml = prodGroupMatch[1];
        
        const cProd = extractTagValue(prodXml, "cProd");
        const xProd = extractTagValue(prodXml, "xProd");
        const uCom = extractTagValue(prodXml, "uCom");
        const qComRaw = extractTagValue(prodXml, "qCom");
        const vUnComRaw = extractTagValue(prodXml, "vUnCom");
        const vProdRaw = extractTagValue(prodXml, "vProd");

        if (cProd && xProd) {
          itensNFe.push({
            cProd,
            xProd,
            uCom: uCom || "",
            qCom: qComRaw ? parseFloat(qComRaw) : 0,
            vUnCom: vUnComRaw ? parseFloat(vUnComRaw) : 0,
            vProd: vProdRaw ? parseFloat(vProdRaw) : 0,
          });
        }
      }
    }

    if (itensNFe.length === 0) {
      return { success: false, error: "Nenhum produto encontrado no XML." };
    }

    // Tentar mapear itens automaticamente
    const mappedItemsToSave = [];
    
    // Buscar todos os códigos de fornecedor conhecidos dessa loja
    const mappedSuppliers = await prisma.itemFornecedor.findMany({
      where: { item: { ownerId: user.ownerId } }
    });

    for (const nfeItem of itensNFe) {
      // Procura se tem algum ItemFornecedor para esse cProd
      const match = mappedSuppliers.find((s: any) => s.codigoFornecedor === nfeItem.cProd);
      
      mappedItemsToSave.push({
        codigoFornecedor: nfeItem.cProd,
        descricaoFornecedor: nfeItem.xProd,
        unidade: nfeItem.uCom,
        quantidade: nfeItem.qCom,
        valorUnitario: nfeItem.vUnCom,
        valorTotal: nfeItem.vProd,
        itemId: match ? match.itemId : null
      });
    }

    // Salvar no Banco
    const nfe = await prisma.nFeCompra.create({
      data: {
        numero,
        emitente,
        dataEmissao,
        valorTotal,
        xmlContent: xmlText,
        ownerId: user.ownerId,
        itens: {
          create: mappedItemsToSave
        }
      }
    });

    revalidatePath("/nfe-importacao");
    return { success: true, count: itensNFe.length, nfeId: nfe.id };
  } catch (error: any) {
    console.error("Erro importNFeXML:", error);
    return { success: false, error: error.message || "Erro interno." };
  }
}

export async function mapItemToCatalog(nfeItemId: string, catalogItemId: string, codigoFornecedor: string) {
  try {
    const user = await getSession();
    if (!user || !user.ownerId) return { success: false, error: "Não autorizado." };

    // 1. Atualizar a tabela NFeCompraItem
    const updatedItem = await prisma.nFeCompraItem.update({
      where: { id: nfeItemId },
      data: { itemId: catalogItemId }
    });

    // 2. Salvar a associação para compras futuras
    // Usa upsert para não criar duplicidade caso aconteça condição de corrida
    await prisma.itemFornecedor.upsert({
      where: {
        itemId_codigoFornecedor: {
          itemId: catalogItemId,
          codigoFornecedor: codigoFornecedor
        }
      },
      update: {},
      create: {
        itemId: catalogItemId,
        codigoFornecedor: codigoFornecedor
      }
    });

    // 3. Atualizar TODOS os itens de notas passadas que tinham esse código
    // (Opcional, mas muito bom UX para o usuário)
    await prisma.nFeCompraItem.updateMany({
      where: {
        codigoFornecedor: codigoFornecedor,
        nfeCompra: { ownerId: user.ownerId }, // apenas notas da loja
        itemId: null // que ainda não estão mapeados
      },
      data: {
        itemId: catalogItemId
      }
    });

    revalidatePath("/nfe-importacao");
    revalidatePath(`/nfe-importacao/${updatedItem.nfeCompraId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro mapItemToCatalog:", error);
    return { success: false, error: error.message || "Erro interno ao mapear item." };
  }
}

export async function deleteNFeImport(id: string) {
  try {
    const user = await getSession();
    if (!user || !user.ownerId) return { success: false, error: "Não autorizado." };

    await prisma.nFeCompra.delete({
      where: {
        id,
        ownerId: user.ownerId
      }
    });

    revalidatePath("/nfe-importacao");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir NFe:", error);
    return { success: false, error: "Falha ao excluir a importação da Nota." };
  }
}
