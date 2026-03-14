import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, formatQuantity } from "./utils";
import { Evento } from "./types";

// --- TIPOS ---
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

// --- CONFIGURAÇÕES VISUAIS (THEME) ---
const COLORS = {
  primary: [79, 70, 229] as [number, number, number], // Indigo-600
  secondary: [100, 116, 139] as [number, number, number], // Slate-500
  background: [248, 250, 252] as [number, number, number], // Slate-50
  white: [255, 255, 255] as [number, number, number],
  black: [15, 23, 42] as [number, number, number], // Slate-900
  danger: [220, 38, 38] as [number, number, number], // Red-600
  success: [22, 163, 74] as [number, number, number], // Green-600
  border: [226, 232, 240] as [number, number, number], // Slate-200
};

const COMPANY_NAME = "Loss Control System";
const FOOTER_TEXT = "Relatório gerado automaticamente pelo sistema.";

// --- HELPERS VISUAIS ---

const addModernHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.width;

  // 1. Faixa Superior (Banner)
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, "F");

  // 2. Nome da Empresa (Banner)
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_NAME, 14, 15);

  // 3. Data de Emissão (Banner)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dataEmissao = `Emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  doc.text(dataEmissao, pageWidth - 14, 15, { align: "right" });

  // 4. Título do Relatório (Abaixo do banner)
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 45);

  // 5. Subtítulo
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text(subtitle, 14, 52);
  }
};

const drawKpiCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  iconChar: string = "$",
) => {
  const height = 30;
  const radius = 3;

  // Fundo do card
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(x, y, width, height, radius, radius, "F");

  // Borda sutil
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, radius, radius, "S");

  // Ícone (círculo colorido)
  doc.setFillColor(...COLORS.background);
  doc.circle(x + 10, y + 10, 5, "F");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text(iconChar, x + 10, y + 12, { align: "center" });

  // Label
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(label, x + 20, y + 10);

  // Value
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.black);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 20, y + 22);

  return height;
};

const addFooter = (doc: jsPDF, pageNum: number) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(FOOTER_TEXT, 14, pageHeight - 10);
  doc.text(`Página ${pageNum}`, pageWidth - 14, pageHeight - 10, {
    align: "right",
  });

  doc.setDrawColor(...COLORS.border);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
};

// --- 1. RELATÓRIO GERENCIAL (DASHBOARD) ---
export const generateReportPDF = (data: ReportData) => {
  const doc = new jsPDF();
  let pageNum = 1;

  addModernHeader(
    doc,
    "Relatório Gerencial de Perdas",
    `Período: ${data.periodoTexto}`,
  );

  // --- SEÇÃO 1: KPIs (Cards) ---
  const kpiY = 60;
  const cardWidth = 43;
  const gap = 5;
  const pageWidth = doc.internal.pageSize.width;
  const startX = (pageWidth - (cardWidth * 4 + gap * 3)) / 2;

  // Card 1: Custo Total
  drawKpiCard(
    doc,
    startX,
    kpiY,
    cardWidth,
    "CUSTO TOTAL",
    formatCurrency(data.summary.totalCusto),
    "C",
  );
  // Card 2: Perda Venda
  drawKpiCard(
    doc,
    startX + cardWidth + gap,
    kpiY,
    cardWidth,
    "VENDA PERDIDA",
    formatCurrency(data.summary.totalVenda),
    "V",
  );
  // Card 3: Ocorrências
  drawKpiCard(
    doc,
    startX + (cardWidth + gap) * 2,
    kpiY,
    cardWidth,
    "OCORRÊNCIAS",
    formatQuantity(data.summary.totalQtd),
    "#",
  );
  // Card 4: Margem
  drawKpiCard(
    doc,
    startX + (cardWidth + gap) * 3,
    kpiY,
    cardWidth,
    "MARGEM",
    `${data.summary.margemPerda}%`,
    "%",
  );

  let finalY = kpiY + 45;

  // --- SEÇÃO 2: RANKING DE ITENS ---
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  doc.setFont("helvetica", "bold");
  doc.text("Top 10 Itens Críticos", 14, finalY);

  const itensData = data.topItens.map((item: any, index: number) => [
    index + 1,
    item.item.codigoInterno || "-",
    item.item.nome,
    `${formatQuantity(item.qtd)} ${item.item.unidade}`,
    formatCurrency(item.custo),
    formatCurrency(item.qtd * (item.item.precoVenda || 0)),
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [["RANK", "CÓD.", "PRODUTO", "QTD.", "CUSTO", "VENDA PERDIDA"]],
    body: itensData,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.secondary,
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.border,
      lineWidth: { top: 0, right: 0, bottom: 0.5, left: 0 },
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 25 },
      2: { cellWidth: "auto" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", textColor: COLORS.danger, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.row.index === 0 && data.section === "body") {
        data.cell.styles.fillColor = [254, 242, 242]; // Fundo vermelho claro
      }
    },
  });

  // @ts-ignore
  finalY = doc.lastAutoTable.finalY + 15;

  // --- SEÇÃO 3: MOTIVOS ---
  if (finalY > 230) {
    doc.addPage();
    addFooter(doc, pageNum);
    pageNum++;
    finalY = 20;
  }

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  doc.setFont("helvetica", "bold");
  doc.text("Análise por Motivo", 14, finalY);

  const motivosData = data.topMotivos.map((m: any) => {
    let motivoTexto = m.motivo.toUpperCase();
    if (m.topItens && m.topItens.length > 0) {
      const itensStr = m.topItens
        .map(
          (i: any) => `  • ${i.nome} (${formatQuantity(i.qtd)} ${i.unidade})`,
        )
        .join("\n");
      motivoTexto += `\n${itensStr}`;
    }
    return [motivoTexto, formatQuantity(m.quantidade), formatCurrency(m.custo)];
  });

  autoTable(doc, {
    startY: finalY + 4,
    head: [["MOTIVO / ITENS AFETADOS", "QTD", "IMPACTO"]],
    body: motivosData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.border,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 25, valign: "top" },
      2: { halign: "right", cellWidth: 35, fontStyle: "bold", valign: "top" },
    },
    alternateRowStyles: { fillColor: COLORS.background },
  });

  addFooter(doc, pageNum);
  doc.save(`relatorio_gerencial_${new Date().toISOString().split("T")[0]}.pdf`);
};

// --- 2. RELATÓRIO DE EVENTOS (LOTE/INDIVIDUAL) ---
export const generateEventPDF = (
  eventos: Evento[],
  titulo: string = "Relatório de Lote",
) => {
  const doc = new jsPDF();
  let pageNum = 1;

  const dataReferencia =
    eventos.length > 0
      ? formatDate(eventos[0].dataHora)
      : formatDate(new Date().toISOString());
  const subtitulo =
    eventos.length > 1
      ? `Data de Referência: ${dataReferencia}`
      : `Registro Individual`;

  addModernHeader(doc, titulo, subtitulo);

  let finalY = 60;
  let totalCustoGeral = 0;

  const tableRows = eventos.map((evento: Evento, index: number) => {
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

  autoTable(doc, {
    startY: finalY,
    head: [["#", "CÓDIGO", "PRODUTO", "MOTIVO", "QTD", "UNITÁRIO", "TOTAL"]],
    body: tableRows,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.secondary,
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: COLORS.border,
      lineWidth: { bottom: 0.5 },
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: "auto", fontStyle: "bold" },
      3: { cellWidth: 30 },
      4: { halign: "right", cellWidth: 20 },
      5: { halign: "right", cellWidth: 25 },
      6: { halign: "right", cellWidth: 25, textColor: COLORS.danger },
    },
    alternateRowStyles: { fillColor: COLORS.background },
  });

  // @ts-ignore
  finalY = doc.lastAutoTable.finalY + 10;

  // --- TOTALIZADOR ---
  if (finalY > 250) {
    doc.addPage();
    addFooter(doc, pageNum);
    pageNum++;
    finalY = 20;
  }

  const boxX = 14;
  const boxWidth = doc.internal.pageSize.width - 28;
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(boxX, finalY, boxWidth, 15, 2, 2, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.text("CUSTO TOTAL DO LOTE:", boxX + 5, finalY + 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totalCustoGeral), boxX + boxWidth - 5, finalY + 10, {
    align: "right",
  });

  // --- ASSINATURAS ---
  const pageHeight = doc.internal.pageSize.height;
  let signY = pageHeight - 50;

  if (finalY > signY - 30) {
    doc.addPage();
    signY = 40;
    pageNum++;
  }

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);

  doc.line(20, signY, 90, signY);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text("Autor / Responsável", 55, signY + 5, { align: "center" });

  doc.line(120, signY, 190, signY);
  doc.text("Auditoria / Conferência", 155, signY + 5, { align: "center" });

  addFooter(doc, pageNum);

  const nomeArquivo =
    eventos.length === 1
      ? `registro_individual_${formatDate(eventos[0].dataHora).replace(/\//g, "-")}.pdf`
      : `lote_${dataReferencia.replace(/\//g, "-")}.pdf`;

  doc.save(nomeArquivo);
};
