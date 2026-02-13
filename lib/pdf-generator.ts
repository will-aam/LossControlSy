import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, formatQuantity } from "./utils";
import { Evento } from "./types";

// Tipos para os dados do relatório
interface ReportData {
  summary: {
    totalCusto: number;
    totalVenda: number;
    totalQtd: number;
    margemPerda: string;
  };
  topItens: any[];
  topMotivos: any[];
  periodoTexto: string;
}

// Configurações visuais
const COMPANY_NAME = "Loss Control System";
const PRIMARY_COLOR = "#1a1a1a"; // Preto suave
const ACCENT_COLOR = "#404040"; // Cinza escuro para detalhes

// Helper para adicionar cabeçalho padrão
const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.width;

  // Linha superior decorativa
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.5);
  doc.line(14, 15, pageWidth - 14, 15);

  // Nome da Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(PRIMARY_COLOR);
  doc.text(COMPANY_NAME, 14, 25);

  // Data de Emissão (Direita)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  const dataEmissao = `Emissão: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`;
  doc.text(dataEmissao, pageWidth - 14, 25, { align: "right" });

  // Título do Relatório
  doc.setFontSize(14);
  doc.setTextColor(PRIMARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 14, 38);

  // Subtítulo (Ex: Período ou Lote)
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(ACCENT_COLOR);
    doc.text(subtitle, 14, 44);
  }
};

// --- 1. GERAR PDF DE RELATÓRIO GERAL (DASHBOARD) ---
export const generateReportPDF = (data: ReportData) => {
  const doc = new jsPDF();

  addHeader(
    doc,
    "Relatório Gerencial de Perdas",
    `Período: ${data.periodoTexto}`,
  );

  let finalY = 50;

  // 1. Cards de Resumo
  const summaryData = [
    ["CUSTO TOTAL", "PERDA VENDA", "OCORRÊNCIAS", "MARGEM"],
    [
      formatCurrency(data.summary.totalCusto),
      formatCurrency(data.summary.totalVenda),
      formatQuantity(data.summary.totalQtd),
      `${data.summary.margemPerda}%`,
    ],
  ];

  autoTable(doc, {
    startY: finalY,
    head: [summaryData[0]],
    body: [summaryData[1]],
    theme: "plain",
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [80, 80, 80],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    styles: {
      halign: "center",
      fontSize: 12,
      fontStyle: "bold",
      cellPadding: 6,
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
  });

  // @ts-ignore
  finalY = doc.lastAutoTable.finalY + 15;

  // 2. Tabela de Ranking
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY_COLOR);
  doc.text("Ranking de Itens Críticos", 14, finalY);

  const itensData = data.topItens.map((item, index) => [
    index + 1,
    item.item.codigoInterno || "-",
    item.item.nome,
    `${formatQuantity(item.qtd)} ${item.item.unidade}`,
    formatCurrency(item.custo),
    formatCurrency(item.qtd * (item.item.precoVenda || 0)),
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [["#", "CÓD.", "PRODUTO", "QTD.", "CUSTO TOTAL", "VENDA PERDIDA"]],
    body: itensData,
    theme: "grid",
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: "auto" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
      5: { halign: "right", textColor: [200, 50, 50] },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  // @ts-ignore
  finalY = doc.lastAutoTable.finalY + 15;

  // Quebra de página se necessário
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }

  // 3. Motivos
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY_COLOR);
  doc.text("Distribuição por Motivo", 14, finalY);

  const motivosData = data.topMotivos.map((m) => [
    m.motivo,
    formatQuantity(m.quantidade),
    formatCurrency(m.custo),
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [["MOTIVO", "QTD.", "IMPACTO (R$)"]],
    body: motivosData,
    theme: "grid",
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontSize: 9,
    },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right", fontStyle: "bold" },
    },
  });

  doc.save(`relatorio_gerencial_${new Date().toISOString().split("T")[0]}.pdf`);
};

// --- 2. GERAR PDF DE EVENTOS (LOTE / INDIVIDUAL) ---
export const generateEventPDF = (
  eventos: Evento[],
  titulo: string = "Relatório de Lote",
) => {
  const doc = new jsPDF();

  // Se for um lote de um dia específico, tentamos pegar a data do primeiro item
  const dataReferencia =
    eventos.length > 0
      ? formatDate(eventos[0].dataHora)
      : formatDate(new Date().toISOString());
  const subtitulo =
    eventos.length > 1
      ? `Data de Referência: ${dataReferencia}`
      : `Registro Individual`;

  addHeader(doc, titulo, subtitulo);

  let finalY = 50;
  let totalCustoGeral = 0;

  // Prepara os dados para uma tabela única consolidada
  const tableRows = eventos.map((evento, index) => {
    const custoTotal = (evento.custoSnapshot || 0) * Number(evento.quantidade);
    totalCustoGeral += custoTotal;

    return [
      index + 1,
      evento.item?.codigoInterno || "-",
      evento.item?.nome || "Item desconhecido",
      evento.motivo || "-",
      `${formatQuantity(Number(evento.quantidade))} ${evento.unidade}`,
      formatCurrency(Number(evento.custoSnapshot)),
      formatCurrency(custoTotal),
    ];
  });

  // Tabela Consolidada
  autoTable(doc, {
    startY: finalY,
    head: [["#", "CÓD.", "PRODUTO", "MOTIVO", "QTD.", "UNIT.", "TOTAL"]],
    body: tableRows,
    theme: "grid",
    // Estilo do Cabeçalho
    headStyles: {
      fillColor: [240, 240, 240], // Cinza bem claro
      textColor: [0, 0, 0], // Texto preto
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      fontStyle: "bold",
      fontSize: 8,
    },
    // Estilo do Corpo
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [50, 50, 50],
      lineWidth: 0.1,
      lineColor: [230, 230, 230],
    },
    // Estilo das Colunas
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: "auto", fontStyle: "bold" }, // Nome do produto em negrito
      3: { cellWidth: 30 },
      4: { halign: "right", cellWidth: 20 },
      5: { halign: "right", cellWidth: 25 },
      6: { halign: "right", cellWidth: 25, fontStyle: "bold" }, // Total em negrito
    },
    // Zebra striping leve
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
  });

  // @ts-ignore
  finalY = doc.lastAutoTable.finalY + 10;

  // --- CARD DE TOTALIZAÇÃO ---
  // Verifica se cabe na página, senão quebra
  if (finalY > 250) {
    doc.addPage();
    finalY = 20;
  }

  // Caixa Totalizadora
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(doc.internal.pageSize.width - 80, finalY, 66, 12, 1, 1, "FD");

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("TOTAL GERAL:", doc.internal.pageSize.width - 75, finalY + 8);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(
    formatCurrency(totalCustoGeral),
    doc.internal.pageSize.width - 18,
    finalY + 8,
    { align: "right" },
  );

  // --- ÁREA DE ASSINATURAS ---
  // Posiciona no rodapé da página
  const pageHeight = doc.internal.pageSize.height;
  let signY = pageHeight - 40;

  // Se a tabela for muito longa e estiver perto do fim, adiciona página para assinaturas
  if (finalY > signY - 20) {
    doc.addPage();
    signY = pageHeight - 40;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);

  // Assinatura 1: Autor/Responsável
  doc.line(20, signY, 90, signY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Autor / Responsável", 55, signY + 5, { align: "center" });

  // Assinatura 2: Auditoria
  doc.line(120, signY, 190, signY);
  doc.text("Auditoria / Conferência", 155, signY + 5, { align: "center" });

  // Nome do arquivo
  const nomeArquivo =
    eventos.length === 1
      ? `registro_individual_${formatDate(eventos[0].dataHora).replace(/\//g, "-")}.pdf`
      : `lote_${dataReferencia.replace(/\//g, "-")}.pdf`;

  doc.save(nomeArquivo);
};
