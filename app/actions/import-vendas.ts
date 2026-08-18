"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function importVendasCSV(formData: FormData) {
  const user = await getSession();
  if (!user) {
    return { success: false, error: "Não autorizado." };
  }
  
  const ownerId = user.ownerId || user.id;

  const file = formData.get("file") as File;
  const data = formData.get("data") as string;

  if (!file || !data) {
    return { success: false, error: "Arquivo e data são obrigatórios." };
  }

  try {
    const text = await file.text();
    // Split by new line, handling Windows (\r\n) and Unix (\n)
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    
    // We assume the first line might be a header or not. 
    // The user said the file has 16 columns. 
    // Let's assume the first line is header if it doesn't look like data (contains letters in numeric fields).
    // Or we just skip it if it's the header. We'll always skip the first line assuming it's the header.
    let startIndex = 1;
    
    // If the file is smaller than 2 lines, it has no data.
    if (lines.length < 2) {
      return { success: false, error: "O arquivo parece estar vazio ou não possui dados suficientes." };
    }

    const parseBrazilianDecimal = (val: string) => {
      if (!val) return 0;
      // Trata possíveis valores como "1.234,56"
      const cleanVal = val.replace(/\./g, "").replace(",", ".");
      const parsed = parseFloat(cleanVal);
      return isNaN(parsed) ? 0 : parsed;
    };

    let processedCount = 0;

    // A VendaDiaria for the selected date
    const [year, month, day] = data.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)); // Normalize time to noon UTC to avoid timezone shift

    // Find or create VendaDiaria for this date and owner
    let vendaDiaria = await prisma.vendaDiaria.findUnique({
      where: {
        data_ownerId: {
          data: dateObj,
          ownerId,
        }
      }
    });

    if (!vendaDiaria) {
      vendaDiaria = await prisma.vendaDiaria.create({
        data: {
          data: dateObj,
          ownerId,
        }
      });
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Separator could be ";" or "\t". Let's assume ";" as it is standard for Brazilian CSVs.
      // But we will also support "," if ";" is not found.
      const separator = line.includes(";") ? ";" : (line.includes("\t") ? "\t" : ",");
      const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, '')); // Remove outer quotes if any
      
      if (cols.length < 10) continue; // Pular linhas incompletas

      const codSubgrupo = cols[0]; // Letra A
      const codItem = cols[2];     // Letra C
      const descItem = cols[3];    // Letra D
      const qtdStr = cols[4];      // Letra E
      const valLiquidoStr = cols[7]; // Letra H
      const valPrecoMedioStr = cols[9]; // Letra J

      if (!codSubgrupo || !codItem) continue; // Dados essenciais ausentes

      // 1. Verificar/Criar Subgrupo
      let subgrupo = await prisma.subgrupo.findUnique({
        where: { codigo_ownerId: { codigo: codSubgrupo, ownerId } }
      });
      if (!subgrupo) {
        subgrupo = await prisma.subgrupo.create({
          data: {
            codigo: codSubgrupo,
            ownerId,
          }
        });
      }

      // 2. Verificar/Criar Item
      let item = await prisma.item.findUnique({
        where: { codigoInterno_ownerId: { codigoInterno: codItem, ownerId } }
      });
      
      const qtd = parseBrazilianDecimal(qtdStr);
      
      if (!item) {
        const hasFraction = qtd % 1 !== 0;
        
        item = await prisma.item.create({
          data: {
            codigoInterno: codItem,
            codigoBarras: codItem,
            nome: descItem || "Item Desconhecido",
            unidade: hasFraction ? "KG" : "UN",
            custo: 0, // Como não temos o custo de cadastro no CSV (só da venda), iniciamos zerado ou com o preço médio?
            precoVenda: parseBrazilianDecimal(valPrecoMedioStr),
            subgrupoId: subgrupo.id,
            ownerId,
          }
        });
      }

      // 3. Criar VendaItem
      const valLiquido = parseBrazilianDecimal(valLiquidoStr);
      const precoMedio = parseBrazilianDecimal(valPrecoMedioStr);

      await prisma.vendaItem.create({
        data: {
          vendaDiariaId: vendaDiaria.id,
          itemId: item.id,
          quantidade: qtd,
          valorLiquido: valLiquido,
          precoMedio: precoMedio,
        }
      });
      
      processedCount++;
    }

    revalidatePath("/vendas");
    return { success: true, count: processedCount };
  } catch (error: any) {
    console.error("Erro ao importar vendas:", error);
    return { success: false, error: "Erro interno ao processar o arquivo CSV. " + (error.message || "") };
  }
}

export async function deleteVenda(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Não autorizado." };
  
  const ownerId = session.ownerId || session.id;

  try {
    await prisma.vendaDiaria.delete({
      where: {
        id,
        ownerId,
      }
    });

    revalidatePath("/vendas");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir venda:", error);
    return { success: false, error: "Erro interno ao excluir a venda. " + (error.message || "") };
  }
}

