"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, ChevronRightSquare } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Evento } from "@/lib/types";

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
}

export function EventosGrid({ lotes, onSelect }: EventosGridProps) {
  if (lotes.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/5">
        Nenhum lote encontrado.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {lotes.map((lote) => (
        <div
          key={lote.data}
          className="group flex items-center justify-between p-3 rounded-md border bg-background hover:bg-muted/40 hover:border-primary/30 transition-all cursor-pointer shadow-sm"
          onClick={() => onSelect(lote)}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border",
                lote.status === "aprovado"
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : lote.status === "rejeitado"
                    ? "bg-red-500/10 text-red-600 border-red-500/20"
                    : "bg-muted text-muted-foreground",
              )}
            >
              <FileText className="h-4 w-4" />
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
