"use client";

import React, { useState } from "react";
import { UploadCloud, Calendar as CalendarIcon, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { importVendasCSV } from "@/app/actions/import-vendas";
import { toast } from "sonner";

export function ImportVendasForm() {
  const [date, setDate] = useState<Date>();
  const [file, setFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadSuccess(false);
    }
  };

  const handleImport = async () => {
    if (!date || !file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("data", date.toISOString());

      const result = await importVendasCSV(formData);

      if (result.success) {
        toast.success(`Importação concluída com sucesso! ${result.count} registros processados.`);
        setUploadSuccess(true);
        setFile(null);
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

      <div className="flex justify-end pt-2">
        <Button 
          size="lg" 
          onClick={handleImport} 
          disabled={!date || !file || isUploading}
          className="w-full md:w-auto h-12 px-8 rounded-xl"
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
