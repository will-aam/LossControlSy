"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemSearch } from "@/components/forms/item-search";
import { Item, formatCurrency } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import {
  Plus,
  Trash2,
  Camera,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Interface local para os itens que estão sendo lançados na tabela
interface ItemLancamento {
  tempId: string; // ID temporário para controle da lista
  item: Item;
  quantidade: number;
  unidade: "UN" | "KG";
  fotoUrl?: string; // Foto opcional
}

export default function NovoEventoPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();

  // Estados para o Input (Topo)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<"UN" | "KG">("UN");

  // Estado da "Planilha" (Lista de Itens)
  const [itemsList, setItemsList] = useState<ItemLancamento[]>([]);

  // Estados de controle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sincroniza unidade quando seleciona item
  const handleItemSelect = (item: Item | null) => {
    setSelectedItem(item);
    if (item) {
      setUnidade(item.unidade);
    }
  };

  // Adicionar item à tabela (Enter ou Botão)
  const handleAddItem = () => {
    if (!selectedItem || !quantidade || parseFloat(quantidade) <= 0) {
      return;
    }

    const novoLancamento: ItemLancamento = {
      tempId: Math.random().toString(36).substr(2, 9),
      item: selectedItem,
      quantidade: parseFloat(quantidade),
      unidade: unidade,
      fotoUrl: undefined, // Começa sem foto
    };

    setItemsList([novoLancamento, ...itemsList]); // Adiciona no topo

    // Limpar inputs para o próximo
    setSelectedItem(null);
    setQuantidade("");
    // Mantém a unidade anterior ou reseta, a seu critério. Resetando para evitar confusão.
    setUnidade("UN");

    toast.success("Item adicionado à lista");
  };

  // Remover item da tabela
  const handleRemoveItem = (tempId: string) => {
    setItemsList(itemsList.filter((i) => i.tempId !== tempId));
  };

  // Simular adição de foto (Mock)
  const handleAddPhoto = (tempId: string) => {
    const mockPhoto =
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400";

    setItemsList(
      itemsList.map((entry) => {
        if (entry.tempId === tempId) {
          return { ...entry, fotoUrl: mockPhoto };
        }
        return entry;
      }),
    );

    toast.success("Foto anexada ao item");
  };

  // Calcular totais do lote (para visualização)
  const totalCustoLote = itemsList.reduce((acc, curr) => {
    return acc + curr.item.custo * curr.quantidade;
  }, 0);

  // Enviar tudo (Criação do Lote)
  const handleSubmit = async () => {
    if (itemsList.length === 0) return;

    setIsSubmitting(true);

    // Aqui nós criaríamos o objeto de "Lote" ou enviariamos um array de eventos
    // Simulação de API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setShowSuccess(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setItemsList([]); // Limpa a tabela
  };

  if (!hasPermission("eventos:criar")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para registrar perdas.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Registrar Perdas
          </h1>
          <p className="text-muted-foreground">
            Adicione itens à lista e envie o lote completo. Data do registro:{" "}
            {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-muted-foreground">
            Total Estimado do Lote
          </p>
          <p className="text-2xl font-bold">{formatCurrency(totalCustoLote)}</p>
        </div>
      </div>

      {/* ÁREA DE INPUT (O "FORMULÁRIO RÁPIDO") */}
      <Card className="border-2 border-primary/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Busca de Item */}
            <div className="flex-1 w-full">
              <span className="text-sm font-medium mb-2 block">
                Buscar Produto
              </span>
              <ItemSearch
                onSelect={handleItemSelect}
                selectedItem={selectedItem}
              />
            </div>

            {/* Quantidade e Unidade */}
            <div className="flex gap-2 w-full md:w-auto">
              <div className="w-24">
                <span className="text-sm font-medium mb-2 block">Qtd.</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItem();
                  }}
                />
              </div>
              <div className="w-24">
                <span className="text-sm font-medium mb-2 block">Unid.</span>
                <Select
                  value={unidade}
                  onValueChange={(v) => setUnidade(v as "UN" | "KG")}
                  disabled={!!selectedItem} // Se item selecionado, trava na unidade do item
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">UN</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botão Adicionar */}
            <Button
              onClick={handleAddItem}
              disabled={!selectedItem || !quantidade}
              className="w-full md:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* A "PLANILHA" (TABELA DE ITENS) */}
      {itemsList.length > 0 ? (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex justify-between items-center">
              <span>Itens no Lote ({itemsList.length})</span>
              <span className="sm:hidden text-sm font-normal text-muted-foreground">
                Total: {formatCurrency(totalCustoLote)}
              </span>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center w-25">Foto</TableHead>
                  <TableHead className="w-12.5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsList.map((entry) => (
                  <TableRow key={entry.tempId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{entry.item.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.item.codigoInterno} • {entry.item.categoria}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.quantidade}{" "}
                      <span className="text-xs text-muted-foreground">
                        {entry.unidade}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.item.custo)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.item.custo * entry.quantidade)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant={entry.fotoUrl ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleAddPhoto(entry.tempId)}
                        title={entry.fotoUrl ? "Foto anexada" : "Anexar foto"}
                      >
                        {entry.fotoUrl ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          <Camera className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                        onClick={() => handleRemoveItem(entry.tempId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 bg-muted/20 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setItemsList([])}
              disabled={isSubmitting}
            >
              Limpar Lista
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Enviando..." : "Finalizar e Enviar Lote"}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
          <div className="bg-muted rounded-full p-4 mb-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Lista Vazia</h3>
          <p className="text-muted-foreground max-w-sm mt-1">
            Utilize a barra de pesquisa acima para começar a adicionar itens ao
            lote de perdas de hoje.
          </p>
        </div>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <DialogTitle className="text-center">
              Lote Enviado com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-center">
              Os registros foram salvos e agrupados na data de hoje.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleSuccessClose} className="w-full">
              Iniciar Novo Lote
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
