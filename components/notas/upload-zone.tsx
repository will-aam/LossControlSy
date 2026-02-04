"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, FileCode, X, CheckCircle, Plus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { NotaFiscal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { parsePdfInvoice } from "@/lib/pdf-parser";

interface UploadZoneProps {
  onFilesSelected: (
    xmlFile: File | null,
    pdfFile: File | null,
    parsedData: Partial<NotaFiscal>,
  ) => void;
  isUploading: boolean;
}

export function UploadZone({ onFilesSelected, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Partial<NotaFiscal>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PROCESSAMENTO DE XML ---
  // Recebe o PDF atual como argumento para evitar estado desatualizado
  const parseXmlFile = (file: File, currentPdf: File | null) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
          throw new Error("XML inválido");
        }

        const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
        const ide = xmlDoc.getElementsByTagName("ide")[0];
        const emit = xmlDoc.getElementsByTagName("emit")[0];
        const total = xmlDoc.getElementsByTagName("total")[0];

        const data: Partial<NotaFiscal> = {
          xmlContent: text,
          chaveAcesso: infNFe?.getAttribute("Id")?.replace("NFe", "") || "",
          numero: ide?.getElementsByTagName("nNF")[0]?.textContent || "",
          serie: ide?.getElementsByTagName("serie")[0]?.textContent || "",
          dataEmissao:
            ide?.getElementsByTagName("dhEmi")[0]?.textContent ||
            ide?.getElementsByTagName("dEmi")[0]?.textContent ||
            "",
          emitente: emit?.getElementsByTagName("xNome")[0]?.textContent || "",
          cnpjEmitente:
            emit?.getElementsByTagName("CNPJ")[0]?.textContent || "",
          valorTotal: parseFloat(
            total?.getElementsByTagName("vNF")[0]?.textContent || "0",
          ),
          naturezaOperacao:
            ide?.getElementsByTagName("natOp")[0]?.textContent || "",
        };

        setPreviewData((prev) => {
          const newData = { ...prev, ...data };
          // FIX: setTimeout evita o erro "Cannot update component while rendering"
          setTimeout(() => onFilesSelected(file, currentPdf, newData), 0);
          return newData;
        });

        toast.success("XML processado com sucesso!");
      } catch (error) {
        console.error("Erro XML:", error);
        toast.error("Erro ao ler XML.");
        // Mesmo com erro, envia os arquivos
        setTimeout(() => onFilesSelected(file, currentPdf, previewData), 0);
      }
    };
    reader.readAsText(file);
  };

  // --- PROCESSAMENTO DE PDF ---
  // Recebe o XML atual como argumento
  const processPdfFile = async (file: File, currentXml: File | null) => {
    try {
      const pdfData = await parsePdfInvoice(file);

      setPreviewData((prev) => {
        const newData = { ...pdfData, ...prev }; // XML (prev) tem prioridade, mas PDF preenche lacunas

        if (!prev.emitente && pdfData.emitente) {
          toast.success("Dados extraídos do PDF!");
        }

        // FIX: setTimeout para evitar o erro do React
        setTimeout(() => onFilesSelected(currentXml, file, newData), 0);
        return newData;
      });
    } catch (error) {
      console.error("Erro ao ler PDF:", error);
      setTimeout(() => onFilesSelected(currentXml, file, previewData), 0);
    }
  };

  // Processa múltiplos arquivos (Drag & Drop ou Input)
  const processFiles = useCallback(
    (files: FileList | File[]) => {
      let newXml = xmlFile;
      let newPdf = pdfFile;
      let hasXml = false;
      let hasPdf = false;

      // 1. Identificar arquivos novos
      Array.from(files).forEach((file) => {
        if (
          file.type === "text/xml" ||
          file.name.toLowerCase().endsWith(".xml")
        ) {
          newXml = file;
          hasXml = true;
        } else if (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          newPdf = file;
          hasPdf = true;
        }
      });

      if (!hasXml && !hasPdf) {
        toast.error("Apenas arquivos XML e PDF são aceitos.");
        return;
      }

      // 2. Atualizar estado local
      setXmlFile(newXml);
      setPdfFile(newPdf);

      // 3. Processar arquivos passando o contexto correto (o outro arquivo)
      if (hasXml && newXml) {
        parseXmlFile(newXml, newPdf);
      }

      if (hasPdf && newPdf) {
        processPdfFile(newPdf, newXml);
      }

      // Se trocou apenas um arquivo e não precisa processar (ex: trocou PDF mas falhou leitura)
      // a função de processamento acima cuida da notificação ao pai.
    },
    [xmlFile, pdfFile],
  ); // eslint-disable-line

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (type: "xml" | "pdf") => {
    if (type === "xml") {
      setXmlFile(null);
      setPreviewData((prev) => {
        const newData = { ...prev, xmlContent: undefined };
        setTimeout(() => onFilesSelected(null, pdfFile, newData), 0);
        return newData;
      });
    } else {
      setPdfFile(null);
      setTimeout(() => onFilesSelected(xmlFile, null, previewData), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4 w-full">
      {/* Área Principal de Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed transition-all cursor-pointer",
          xmlFile || pdfFile
            ? "min-h-20 p-4 bg-muted/20"
            : "min-h-45 p-6 bg-muted/5",
          isDragging
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".xml,.pdf"
          onChange={handleInputChange}
        />

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {!xmlFile && !pdfFile && (
            <div className="p-3 rounded-full bg-background shadow-sm border mb-2">
              <Upload className="h-6 w-6 text-muted-foreground/70" />
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">
              {xmlFile && pdfFile
                ? "Trocar arquivos"
                : xmlFile
                  ? "Adicionar PDF (arraste ou clique)"
                  : pdfFile
                    ? "Adicionar XML (arraste ou clique)"
                    : "Clique ou arraste XML e PDF"}
            </p>
            {!xmlFile && !pdfFile && (
              <p className="text-xs text-muted-foreground">
                Suporta upload simultâneo ou separado
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Arquivos */}
      {(xmlFile || pdfFile) && (
        <div className="grid gap-2">
          {xmlFile && (
            <div className="flex items-center justify-between p-2.5 rounded-md bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 bg-blue-100 rounded text-blue-600 dark:bg-blue-900 dark:text-blue-300 shrink-0">
                  <FileCode className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{xmlFile.name}</p>
                  <p className="text-[10px] text-blue-600/80 dark:text-blue-400">
                    XML Processado
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile("xml");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {pdfFile && (
            <div className="flex items-center justify-between p-2.5 rounded-md bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 bg-red-100 rounded text-red-600 dark:bg-red-900 dark:text-red-300 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{pdfFile.name}</p>
                  <p className="text-[10px] text-red-600/80 dark:text-red-400">
                    PDF Processado
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile("pdf");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Preview Compacto */}
      {previewData.emitente && (
        <div className="rounded-lg border p-3 bg-card text-xs shadow-sm">
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-wider text-[10px]">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {xmlFile ? "Dados do XML" : "Dados do PDF"}
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Emitente:</span>
              <span className="font-medium truncate max-w-37.5 text-right">
                {previewData.emitente}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-medium">
                {formatCurrency(previewData.valorTotal || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">
                {previewData.dataEmissao
                  ? new Date(previewData.dataEmissao).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número:</span>
              <span className="font-medium">{previewData.numero || "-"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
