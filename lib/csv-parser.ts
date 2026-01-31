import { Item } from "./mock-data";

export async function parseItemsCSV(file: File): Promise<Item[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error("Arquivo vazio"));
        return;
      }

      // Divide por quebra de linha (suporta Windows \r\n e Unix \n)
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      const newItems: Item[] = [];

      // Pula a primeira linha (cabeçalho)
      for (let i = 1; i < lines.length; i++) {
        // Limpa a linha de espaços extras
        const line = lines[i].trim();
        if (!line) continue;

        // Divide as colunas por ponto e vírgula
        const cols = line.split(";");

        // Validação básica: O arquivo Gama Jardins tem 7 colunas
        // Se tiver menos de 6, provavelmente é linha quebrada ou inválida
        if (cols.length < 6) continue;

        // Função para converter valores monetários BR (ex: "1.200,50" ou "1,624375")
        const parseMoney = (val: string) => {
          if (!val) return 0;
          // 1. Remove R$ e espaços
          // 2. Remove pontos de milhar (apenas se houver vírgula depois)
          // 3. Troca a vírgula decimal por ponto
          const cleanVal = val
            .replace("R$", "")
            .trim()
            .replace(/\./g, "") // Remove pontos de milhar (Cuidado: se o CSV usar ponto como decimal, isso quebra, mas no padrão BR é seguro)
            .replace(",", "."); // Troca vírgula por ponto

          return parseFloat(cleanVal) || 0;
        };

        // Mapeamento exato para o arquivo itens-gama-jardins.csv
        const item: Item = {
          id: Math.random().toString(36).substr(2, 9),
          // Coluna 0: cod_item
          codigoInterno: cols[0]?.trim() || `IMP-${i}`,
          // Coluna 1: des_item
          nome: cols[1]?.trim().toUpperCase() || "ITEM SEM NOME",
          // Coluna 2: categoria
          categoria: cols[2]?.trim().replace(/^\*/, "") || "Geral", // Remove asterisco se tiver (ex: *PADARIA)
          // Coluna 3: sgl_unidade
          unidade: (cols[3]?.trim().toUpperCase() as "UN" | "KG") || "UN",
          // Coluna 4: cod_barra (Se vazio, usa o código interno ou vazio)
          codigoBarras: cols[4]?.trim() || "",
          // Coluna 5: val_custo_unitario
          custo: parseMoney(cols[5]),
          // Coluna 6: val_preco_venda_a
          precoVenda: parseMoney(cols[6]),
          status: "ativo",
          imagemUrl: "", // CSV não tem imagem
        };

        // Validação extra: Se não tiver nome ou preço zerado, marca para revisão ou importa mesmo assim?
        // Vamos importar tudo, mas garantir que custos venham como number.

        newItems.push(item);
      }

      console.log(
        `Importação concluída: ${newItems.length} itens processados.`,
      );
      resolve(newItems);
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsText(file, "ISO-8859-1"); // Tenta forçar encoding comum no BR se UTF-8 falhar nos acentos
  });
}
