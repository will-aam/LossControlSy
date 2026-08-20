"use client";

import React, { useState } from "react";
import { UploadCloud, Calendar as CalendarIcon, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { importVendasCSV } from "@/app/actions/import-vendas";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const ACTIVE_COLUMNS = [0, 2, 3, 4, 8, 9]; // Índices das colunas importadas: A(0), C(2), D(3), E(4), I(8), J(9)

export function ImportVendasForm() {
  const [date, setDate] = useState<Date>();
  const [file, setFile] = useState<File | null>(null);

  const [csvPreview, setCsvPreview] = useState<string[][] | null>(null);
  const [totalRows, setTotalRows] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setUploadSuccess(false);
      setCsvPreview(null);
      setTotalRows(0);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
          toast.error("O arquivo parece estar vazio ou não possui dados suficientes.");
          setFile(null);
          return;
        }

        const separator = lines[0].includes(";") ? ";" : (lines[0].includes("\t") ? "\t" : ",");

        // Check max columns using the first line
        const headerCols = lines[0].split(separator);
        if (headerCols.length > 19) {
          toast.error("O arquivo possui mais de 19 colunas e foi recusado por segurança.");
          setFile(null);
          return;
        }

        // Generate preview
        const maxPreviewRows = Math.min(10, Math.ceil(lines.length * 0.4)); // Mostra 10 linhas ou 40% do total
        const preview = lines.slice(0, maxPreviewRows).map(line => {
          return line.split(separator).map(col => col.trim().replace(/^"|"$/g, ''));
        });

        setCsvPreview(preview);
        setTotalRows(lines.length);
        setFile(selectedFile);
      };

      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo selecionado.");
        setFile(null);
      };

      reader.readAsText(selectedFile, 'ISO-8859-1'); // Commonly used encoding for pt-BR CSVs
    }
  };

  const handleImport = async () => {
    if (!date || !file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("data", format(date, "yyyy-MM-dd"));

      const result = await importVendasCSV(formData);

      if (result.success) {
        toast.success(`Importação concluída com sucesso! ${result.count} registros processados.`);
        setUploadSuccess(true);
        setFile(null);
        setCsvPreview(null);
      } else {
        toast.error(result.error || "Erro ao importar o arquivo.");
      }
    } catch (error) {
      toast.error("Erro inesperado durante a importação.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const getColumnLetter = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Passo 1 */}
        <div className="bg-surface border rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="font-bold">1</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Selecione a Data</h3>
              <p className="text-sm text-muted-foreground">Qual o dia referente a este relatório?</p>
            </div>
          </div>

          <div className="pt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-12 rounded-xl",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setUploadSuccess(false);
                  }}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Passo 2 */}
        <div className={cn(
          "border rounded-2xl p-6 shadow-sm flex flex-col space-y-4 transition-all duration-300",
          !date ? "bg-surface/50 opacity-60 grayscale-[0.5]" : "bg-surface"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="font-bold">2</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Anexar Arquivo CSV</h3>
              <p className="text-sm text-muted-foreground">Envie o arquivo exportado do seu sistema ERP.</p>
            </div>
          </div>

          <div className="pt-2 flex-1 flex flex-col">
            <div className="relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-surface-2 transition-colors min-h-[160px]">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={!date || isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                title={!date ? "Selecione a data primeiro" : "Clique para selecionar o CSV"}
              />

              {file ? (
                <div className="flex flex-col items-center text-primary">
                  <FileSpreadsheet className="w-12 h-12 mb-3 opacity-80" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <UploadCloud className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">
                    {!date ? "Selecione a data para habilitar" : "Clique ou arraste o arquivo .csv aqui"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {csvPreview && (
        <div className="bg-surface border rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Pré-visualização de Dados
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </h3>
              <p className="text-sm text-muted-foreground">
                Exibindo {csvPreview.length} de {totalRows} linhas. As colunas em destaque serão importadas.
              </p>
            </div>
            <div className="flex items-center text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              Máximo: 19 colunas permitidas
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden shadow-inner bg-background">
            <ScrollArea className="w-full pb-4">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b">
                  <tr>
                    {csvPreview[0]?.map((_, colIndex) => {
                      const isActive = ACTIVE_COLUMNS.includes(colIndex);
                      return (
                        <th
                          key={colIndex}
                          className={cn(
                            "px-4 py-3 font-semibold whitespace-nowrap",
                            isActive ? "text-primary border-b-2 border-primary" : "text-muted-foreground/50 opacity-60"
                          )}
                        >
                          {getColumnLetter(colIndex)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      {row.map((cell, colIndex) => {
                        const isActive = ACTIVE_COLUMNS.includes(colIndex);
                        return (
                          <td
                            key={colIndex}
                            className={cn(
                              "px-4 py-2 whitespace-nowrap",
                              isActive
                                ? "text-foreground font-medium"
                                : "text-muted-foreground/40 bg-muted/10 opacity-50 grayscale"
                            )}
                          >
                            {cell || <span className="italic text-muted-foreground/30">vazio</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <div className="bg-primary/5 border border-primary/20 text-primary-700 rounded-xl p-4 flex gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-primary">Deseja continuar com a importação?</p>
              <p className="opacity-90 mt-1">Verifique se as colunas destacadas (Subgrupo, Cód. Item, Descrição, Quantidade, Valor Líquido, Preço Médio) contêm os dados corretos.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={handleImport}
          disabled={!date || !file || isUploading}
          className="w-full md:w-auto h-12 px-8 rounded-xl shadow-md transition-transform active:scale-95"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando Importação...
            </>
          ) : (
            "Confirmar Importação"
          )}
        </Button>
      </div>
    </div>
  );
}
