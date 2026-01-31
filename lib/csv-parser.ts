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

      const lines = text.split("\n").filter((line) => line.trim() !== "");
      const newItems: Item[] = [];

      // Começa do índice 1 para pular o cabeçalho
      // Formato esperado (separado por ponto e vírgula):
      // 0: cod_item (código interno)
      // 1: des_item (nome)
      // 2: categoria
      // 3: sgl_unidade (unidade)
      // 4: cod_barra (código de barras) [NOVO]
      // 5: val_custo_unitario (custo)
      // 6: val_preco_venda (preço)

      for (let i = 1; i < lines.length; i++) {
        // Usando ponto e vírgula (;) pois valores monetários BR usam vírgula
        const cols = lines[i].split(";");

        // Validação básica (agora esperamos pelo menos 7 colunas)
        if (cols.length < 6) continue;

        // Função auxiliar para converter "1,62" em 1.62
        const parseMoney = (val: string) => {
          if (!val) return 0;
          return parseFloat(val.replace(".", "").replace(",", ".")) || 0;
        };

        const newItem: Item = {
          id: Math.random().toString(36).substr(2, 9),
          codigoInterno: cols[0]?.trim() || `CSV-${i}`,
          nome: cols[1]?.trim() || "Item Importado",
          categoria: cols[2]?.trim() || "Geral",
          unidade: (cols[3]?.trim() as "UN" | "KG") || "UN",
          codigoBarras: cols[4]?.trim() || "",
          custo: parseMoney(cols[5]),
          precoVenda: parseMoney(cols[6]),
          status: "ativo",
          imagemUrl: "",
        };
        newItems.push(newItem);
      }

      resolve(newItems);
    };

    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };

    reader.readAsText(file);
  });
}
