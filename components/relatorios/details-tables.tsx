"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { formatCurrency, formatQuantity } from "@/lib/utils";

interface DetailsTablesProps {
  topItens: any[];
  topMotivos: any[];
}

export function DetailsTables({ topItens, topMotivos }: DetailsTablesProps) {
  return (
    <div className="space-y-6">
      {/* Tabela de Itens */}
      <Card>
        <CardHeader>
          <CardTitle>Top Itens com Maior Perda</CardTitle>
          <CardDescription>Ranking de itens por custo de perda</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Categoria
                </TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topItens.map((entry, index) => (
                <TableRow key={entry.item.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {entry.item.imagemUrl ? (
                        <img
                          src={entry.item.imagemUrl}
                          alt={entry.item.nome}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{entry.item.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.item.codigoInterno}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{entry.item.categoria}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(entry.qtd)}{" "}
                    <span className="text-[10px] text-muted-foreground">
                      {entry.item.unidade}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(entry.custo)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabela de Motivos */}
      <Card>
        <CardHeader>
          <CardTitle>Perdas por Motivo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="text-right">% do Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topMotivos.map((item) => {
                const total = topMotivos.reduce((acc, i) => acc + i.custo, 0);
                const percent =
                  total > 0 ? ((item.custo / total) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={item.motivo}>
                    <TableCell className="font-medium">{item.motivo}</TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(item.quantidade)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.custo)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {percent}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
