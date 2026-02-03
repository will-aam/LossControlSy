"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, FileCode, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { NotaFiscal } from "@/lib/types";

interface UploadZoneProps {
  onFileSelect: (file: File, parsedData?: Partial<NotaFiscal>) => void;
  isUploading: boolean;
}

export function UploadZone({ onFileSelect, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<Partial<NotaFiscal> | null>(
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processa o arquivo (seja por drop ou input)
  const processFile = useCallback(
    (file: File) => {
      if (!file) return;

      // Validação básica
      const isXml =
        file.type === "text/xml" || file.name.toLowerCase().endsWith(".xml");
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (!isXml && !isPdf) {
        toast.error("Formato inválido. Use apenas .XML ou .PDF");
        return;
      }

      setFileName(file.name);

      if (isXml) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            // Correção do erro de parsing e estrutura do XML 4.00
            const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
            const ide = xmlDoc.getElementsByTagName("ide")[0];
            const emit = xmlDoc.getElementsByTagName("emit")[0];
            const total = xmlDoc.getElementsByTagName("total")[0];

            // Extração segura dos dados
            const dados: Partial<NotaFiscal> = {
              xmlContent: text,
              chaveAcesso: infNFe?.getAttribute("Id")?.replace("NFe", "") || "",
              numero: ide?.getElementsByTagName("nNF")[0]?.textContent || "",
              serie: ide?.getElementsByTagName("serie")[0]?.textContent || "",
              dataEmissao:
                ide?.getElementsByTagName("dhEmi")[0]?.textContent ||
                ide?.getElementsByTagName("dEmi")[0]?.textContent ||
                "",
              emitente:
                emit?.getElementsByTagName("xNome")[0]?.textContent || "",
              cnpjEmitente:
                emit?.getElementsByTagName("CNPJ")[0]?.textContent || "",
              valorTotal: parseFloat(
                total?.getElementsByTagName("vNF")[0]?.textContent || "0",
              ),
              naturezaOperacao:
                ide?.getElementsByTagName("natOp")[0]?.textContent || "",
            };

            setPreviewData(dados);
            onFileSelect(file, dados);
            toast.success("XML lido com sucesso!");
          } catch (error) {
            console.error("Erro no parser XML:", error);
            toast.error("Erro ao ler XML. O arquivo pode estar corrompido.");
            // Passa o arquivo mesmo sem os dados parseados
            onFileSelect(file, {});
          }
        };
        reader.readAsText(file);
      } else {
        // É PDF
        setPreviewData(null);
        onFileSelect(file, {});
      }
    },
    [onFileSelect],
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const resetSelection = () => {
    setFileName(null);
    setPreviewData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Renderização condicional: Área de Drop ou Preview do Arquivo
  if (fileName) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between rounded-lg border p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-md",
                fileName.endsWith(".xml")
                  ? "bg-blue-100 text-blue-600"
                  : "bg-red-100 text-red-600",
              )}
            >
              {fileName.endsWith(".xml") ? (
                <FileCode className="h-6 w-6" />
              ) : (
                <FileText className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm truncate max-w-50">
                {fileName}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> Pronto para
                upload
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetSelection}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview dos dados extraídos do XML */}
        {previewData && previewData.emitente && (
          <div className="rounded-lg border border-accent p-4 text-sm  dark:border-blue-900">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
              <FileCode className="h-4 w-4" /> Dados Identificados
            </h4>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Emitente</span>
                <span className="font-medium">{previewData.emitente}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Valor Total</span>
                <span className="font-medium text-base">
                  {formatCurrency(previewData.valorTotal || 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Número</span>
                <span className="font-medium">{previewData.numero}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Data</span>
                <span className="font-medium">
                  {previewData.dataEmissao
                    ? new Date(previewData.dataEmissao).toLocaleDateString()
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full min-h-50 rounded-lg border-2 border-dashed transition-all cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5 scale-[0.99]"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".xml,.pdf"
        onChange={handleInputChange}
      />

      <div className="flex flex-col items-center justify-center gap-2 text-center p-6">
        <div className="p-3 rounded-full bg-muted shadow-sm">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Clique ou arraste seu arquivo aqui
          </p>
          <p className="text-xs text-muted-foreground">
            Suporta XML (NFe) e PDF
          </p>
        </div>
      </div>
    </div>
  );
}
