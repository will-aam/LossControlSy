"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ArrowRight, CalendarDays, DollarSign, Package } from "lucide-react";

export function HistoricoNFeList({ historico }: { historico: any[] }) {
  if (!historico || historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface border rounded-2xl border-dashed">
        <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4 text-muted-foreground">
          <FileText size={32} />
        </div>
        <p className="text-muted-foreground font-medium text-center">Nenhuma NFe importada ainda.</p>
        <p className="text-sm text-muted-foreground/70 text-center max-w-sm mt-1">
          Importe arquivos XML para visualizar o histórico de custos de compras aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {historico.map((nfe) => (
        <Link
          key={nfe.id}
          href={`/nfe-importacao/${nfe.id}`}
          className="bg-surface border rounded-2xl p-5 hover:border-primary/50 transition-all active:scale-[0.98] group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground line-clamp-1">
                    NFe Nº {nfe.numero || "Desconhecido"}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {nfe.emitente || "Fornecedor Desconhecido"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays size={14} /> Importação</span>
                <span className="font-medium text-foreground">
                  {format(new Date(nfe.dataImportacao), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign size={14} /> Total</span>
                <span className="font-medium text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(nfe.valorTotal || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Package size={14} /> Itens</span>
                <span className="font-medium text-foreground">
                  {nfe._count.itens} lidos
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t flex items-center justify-end text-primary text-sm font-medium group-hover:gap-2 transition-all">
            Ver detalhes <ArrowRight size={16} className="ml-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}
