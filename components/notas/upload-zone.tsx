"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, FileCode, X, CheckCircle, Plus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { NotaFiscal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  // Função auxiliar para processar XML
  const parseXmlFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

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

        setPreviewData(data);
        // Atualiza o pai com o novo XML e o PDF que já existia (se houver)
        onFilesSelected(file, pdfFile, data);
        toast.success("XML processado com sucesso!");
      } catch (error) {
        console.error("Erro XML:", error);
        toast.error("Erro ao ler XML.");
      }
    };
    reader.readAsText(file);
  };

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      let newXml = xmlFile;
      let newPdf = pdfFile;
      let foundNew = false;

      Array.from(files).forEach((file) => {
        if (
          file.type === "text/xml" ||
          file.name.toLowerCase().endsWith(".xml")
        ) {
          newXml = file;
          setXmlFile(file);
          parseXmlFile(file); // O parse vai chamar o onFilesSelected
          foundNew = true;
        } else if (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          newPdf = file;
          setPdfFile(file);
          foundNew = true;
        }
      });

      if (!foundNew) {
        toast.error("Apenas arquivos XML e PDF são aceitos.");
        return;
      }

      // Se só atualizou PDF (sem XML novo), precisamos notificar o pai aqui
      // Se atualizou XML, o reader.onload lá em cima vai notificar
      if (newPdf !== pdfFile && newXml === xmlFile) {
        onFilesSelected(newXml, newPdf, previewData);
      }
    },
    [xmlFile, pdfFile, previewData, onFilesSelected],
  );

  // Eventos de Drag & Drop
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
    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
    // Resetar input para permitir selecionar o mesmo arquivo novamente se necessário
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (type: "xml" | "pdf") => {
    if (type === "xml") {
      setXmlFile(null);
      setPreviewData({});
      onFilesSelected(null, pdfFile, {});
    } else {
      setPdfFile(null);
      onFilesSelected(xmlFile, null, previewData);
    }
  };

  // Se já temos arquivos, mostramos o status deles
  if (xmlFile || pdfFile) {
    return (
      <div className="space-y-4">
        {/* Área menor para adicionar o arquivo que falta */}
        {(!xmlFile || !pdfFile) && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex items-center justify-center w-full p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer bg-muted/20 border-muted-foreground/20 hover:bg-muted/40",
              isDragging && "border-primary bg-primary/5",
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
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Arraste o arquivo {xmlFile ? "PDF" : "XML"} faltante aqui
            </p>
          </div>
        )}

        {/* Lista de Arquivos Preparados */}
        <div className="grid gap-3">
          {xmlFile && (
            <div className="flex items-center justify-between p-3 rounded-md bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-blue-100 rounded text-blue-600 dark:bg-blue-900 dark:text-blue-300 shrink-0">
                  <FileCode className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{xmlFile.name}</p>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400">
                    XML da Nota Processado
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeFile("xml")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {pdfFile && (
            <div className="flex items-center justify-between p-3 rounded-md bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-red-100 rounded text-red-600 dark:bg-red-900 dark:text-red-300 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{pdfFile.name}</p>
                  <p className="text-xs text-red-600/80 dark:text-red-400">
                    PDF (DANFE) Anexado
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeFile("pdf")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Preview dos Dados (Só aparece se tiver XML) */}
        {previewData.emitente && (
          <div className="rounded-lg border p-4 bg-card text-sm shadow-sm">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <CheckCircle className="h-3 w-3 text-green-500" />{" "}
              Pré-visualização dos Dados
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-xs block mb-1">
                  Emitente
                </span>
                <p
                  className="font-medium truncate"
                  title={previewData.emitente}
                >
                  {previewData.emitente}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block mb-1">
                  Valor Total
                </span>
                <p className="font-medium">
                  {formatCurrency(previewData.valorTotal || 0)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block mb-1">
                  Data Emissão
                </span>
                <p className="font-medium">
                  {previewData.dataEmissao
                    ? new Date(previewData.dataEmissao).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block mb-1">
                  Número
                </span>
                <p className="font-medium">{previewData.numero}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Estado Inicial (Vazio)
  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full min-h-55 rounded-xl border-2 border-dashed transition-all cursor-pointer bg-muted/5",
        isDragging
          ? "border-primary bg-primary/5 scale-[0.99]"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple // Permite selecionar vários de uma vez
        className="hidden"
        accept=".xml,.pdf"
        onChange={handleInputChange}
      />

      <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
        <div className="p-4 rounded-full bg-background shadow-sm border">
          <Upload className="h-8 w-8 text-muted-foreground/70" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">
            Clique ou arraste seus arquivos
          </p>
          <p className="text-sm text-muted-foreground max-w-50 mx-auto">
            Solte o <span className="text-blue-600 font-medium">XML</span> e o{" "}
            <span className="text-red-600 font-medium">PDF</span> aqui juntos ou
            separados.
          </p>
        </div>
      </div>
    </div>
  );
}
