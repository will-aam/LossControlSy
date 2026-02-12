"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package } from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/utils";

interface CriticalItemsProps {
  topItens: any[];
}

export function CriticalItems({ topItens }: CriticalItemsProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Top 5 Itens Críticos</CardTitle>
        <CardDescription className="text-sm">
          Maior prejuízo este mês
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {topItens.length > 0 ? (
          <div className="divide-y">
            {topItens.map((entry, index) => (
              <div
                key={entry.item.id}
                className="p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  {entry.item.imagemUrl ? (
                    <img
                      src={entry.item.imagemUrl}
                      alt={entry.item.nome}
                      className="w-10 h-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {entry.item.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatQuantity(entry.qtd)} {entry.item.unidade}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs font-medium text-destructive">
                        {formatCurrency(entry.custo)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Barra de Progresso Visual */}
                <div className="mt-2 ml-11">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-destructive/70 to-destructive rounded-full transition-all duration-500"
                      style={{ width: `${entry.percentual}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma perda registrada neste mês</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
