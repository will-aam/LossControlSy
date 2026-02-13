"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, ChevronRightSquare, Loader2 } from "lucide-react"; // Import Loader2
import { formatCurrency, cn } from "@/lib/utils";
import { Evento } from "@/lib/types";
import { toast } from "sonner";
import { useState } from "react"; // Import useState

export type BatchStatus = "pendente" | "aprovado" | "rejeitado";

export interface LoteDiario {
  data: string;
  dataOriginal: Date;
  eventos: Evento[];
  totalCusto: number;
  status: BatchStatus;
  autor: string;
}

interface EventosGridProps {
  lotes: LoteDiario[];
  onSelect: (lote: LoteDiario) => void;
  onDownload: (lote: LoteDiario) => Promise<void>; // Mudança para Promise
}

export function EventosGrid({ lotes, onSelect, onDownload }: EventosGridProps) {
  const [downloadingDate, setDownloadingDate] = useState<string | null>(null);

  if (lotes.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/5">
        Nenhum lote encontrado.
      </div>
    );
  }

  const handleIconClick = async (e: React.MouseEvent, lote: LoteDiario) => {
    e.stopPropagation();

    if (lote.status !== "aprovado") {
      toast.error("Apenas lotes aprovados podem ser baixados/impressos.");
      return;
    }

    setDownloadingDate(lote.data);
    try {
      await onDownload(lote);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloadingDate(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {lotes.map((lote) => (
        <div
          key={lote.data}
          className="group flex items-center justify-between p-3 rounded-md border bg-background hover:bg-muted/40 hover:border-primary/30 transition-all cursor-pointer shadow-sm"
          onClick={() => onSelect(lote)}
        >
          <div className="flex items-center gap-4">
            {/* Ícone de Arquivo / Botão de Download */}
            <div
              onClick={(e) => handleIconClick(e, lote)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                lote.status === "aprovado"
                  ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 hover:scale-105 cursor-pointer"
                  : lote.status === "rejeitado"
                    ? "bg-red-500/10 text-red-600 border-red-500/20 cursor-not-allowed opacity-70"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-70",
              )}
              title={
                lote.status === "aprovado"
                  ? "Baixar Nota Fiscal do Dia"
                  : "Necessário aprovação para baixar"
              }
            >
              {downloadingDate === lote.data ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold">{lote.data}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{lote.autor}</span>
                <span>•</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-4 px-1 text-[10px] border-0 bg-transparent p-0 font-normal",
                    lote.status === "aprovado"
                      ? "text-green-600"
                      : lote.status === "rejeitado"
                        ? "text-red-600"
                        : "text-muted-foreground",
                  )}
                >
                  {lote.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 md:gap-12">
            <div className="hidden md:block text-right">
              <p className="text-[10px] text-muted-foreground uppercase">
                Itens
              </p>
              <p className="text-sm font-medium">{lote.eventos.length}</p>
            </div>
            <div className="text-right min-w-20">
              <p className="text-[10px] text-muted-foreground uppercase">
                Total
              </p>
              <p className="text-sm font-bold">
                {formatCurrency(lote.totalCusto)}
              </p>
            </div>
            <ChevronRightSquare className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}
