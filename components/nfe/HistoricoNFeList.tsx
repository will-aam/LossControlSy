"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ArrowRight, CalendarDays, DollarSign, Package, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="w-full">
      {/* MOBILE: Cards (Escondido em telas md ou maiores) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {historico.map((nfe) => {
          // A principal data exibida deve ser a da Nota (Emissão). 
          // Se não existir, caímos para a de importação.
          const dataPrincipal = nfe.dataEmissao ? new Date(nfe.dataEmissao) : new Date(nfe.dataImportacao);
          const total = nfe.totalCount || 0;
          const mapped = nfe.mappedCount || 0;
          const isFullyMapped = total > 0 && mapped === total;
          
          return (
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
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays size={14} /> Emissão
                    </span>
                    <span className="font-medium text-foreground">
                      {format(dataPrincipal, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle size={14} /> Status
                    </span>
                    {isFullyMapped ? (
                      <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        100% Mapeado
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        {mapped}/{total} Pendentes
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <DollarSign size={14} /> Total
                    </span>
                    <span className="font-medium text-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(nfe.valorTotal || 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t flex items-center justify-end text-primary text-sm font-medium group-hover:gap-2 transition-all">
                Ver detalhes <ArrowRight size={16} className="ml-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* DESKTOP: Tabela (Escondida no mobile) */}
      <div className="hidden md:block bg-surface p-2 rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-muted-foreground">
                <th className="font-semibold p-4">Número</th>
                <th className="font-semibold p-4">Emitente</th>
                <th className="font-semibold p-4">Data da Nota</th>
                <th className="font-semibold p-4">Status</th>
                <th className="font-semibold p-4 text-right">Valor Total</th>
                <th className="font-semibold p-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((nfe) => {
                const dataPrincipal = nfe.dataEmissao ? new Date(nfe.dataEmissao) : new Date(nfe.dataImportacao);
                const total = nfe.totalCount || 0;
                const mapped = nfe.mappedCount || 0;
                const isFullyMapped = total > 0 && mapped === total;
                
                return (
                  <tr key={nfe.id} className="group transition-colors">
                    <td className="p-4 align-middle">
                      <div className="font-medium text-foreground">NFe {nfe.numero || "-"}</div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground truncate max-w-[250px]" title={nfe.emitente}>
                      {nfe.emitente || "Fornecedor Desconhecido"}
                    </td>
                    <td className="p-4 align-middle">
                      {format(dataPrincipal, "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-4 align-middle">
                      {isFullyMapped ? (
                        <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full whitespace-nowrap">
                          100% Mapeado
                        </span>
                      ) : (
                        <span className="text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full whitespace-nowrap">
                          {mapped}/{total} Mapeados
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-right font-medium">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(nfe.valorTotal || 0))}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <Button variant="ghost" size="sm" asChild className="rounded-xl hover:text-primary">
                        <Link href={`/nfe-importacao/${nfe.id}`}>
                          Detalhes
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
