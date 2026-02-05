"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ItemSearch } from "@/components/forms/item-search";
// Importações Corrigidas e Actions
import { Item } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { StorageService } from "@/lib/storage"; // Mantido apenas para Settings por enquanto
import { createEvento, CreateEventoData } from "@/app/actions/eventos";

import {
  Plus,
  Trash2,
  Camera,
  Send,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  Loader2,
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

// CSS para esconder as setas do input number
const numberInputClass =
  "text-lg h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// CSS Customizado para a Scrollbar da Tabela (Fina e Discreta)
const customScrollbarClass =
  "overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full";

interface ItemLancamento {
  tempId: string;
  item: Item;
  quantidade: number;
  unidade: string;
  fotoUrl?: string;
}

export default function NovoEventoPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [itemsList, setItemsList] = useState<ItemLancamento[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Estado para a configuração de exigir foto (Ainda via Storage Local por enquanto)
  const [exigirFoto, setExigirFoto] = useState(false);

  // Carregar configurações ao iniciar
  useEffect(() => {
    // TODO: Migrar Settings para o Banco na próxima etapa
    const settings = StorageService.getSettings();
    setExigirFoto(settings.exigirFoto);
  }, []);

  const handleItemSelect = (item: Item | null) => {
    setSelectedItem(item);
  };

  const handleAddItem = () => {
    if (!selectedItem || !quantidade || parseFloat(quantidade) <= 0) {
      return;
    }

    const novoLancamento: ItemLancamento = {
      tempId: Math.random().toString(36).substr(2, 9),
      item: selectedItem,
      quantidade: parseFloat(quantidade),
      unidade: selectedItem.unidade,
      fotoUrl: undefined,
    };

    setItemsList([novoLancamento, ...itemsList]);

    // Reset inteligente
    setSelectedItem(null);
    setQuantidade("");

    toast.success("Item adicionado à lista");
  };

  const handleRemoveItem = (tempId: string) => {
    setItemsList(itemsList.filter((i) => i.tempId !== tempId));
  };

  const handleAddPhoto = (tempId: string) => {
    // Em um app real, aqui abriria o input de arquivo ou câmera
    // Simulando uma URL de foto para teste
    const mockPhoto =
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400";

    setItemsList(
      itemsList.map((entry) => {
        if (entry.tempId === tempId) return { ...entry, fotoUrl: mockPhoto };
        return entry;
      }),
    );
    toast.success("Foto anexada (Simulação)");
  };

  const handleSubmit = async () => {
    if (itemsList.length === 0 || !user) return;

    // --- VALIDAÇÃO DA REGRA DE NEGÓCIO ---
    if (exigirFoto) {
      const itensSemFoto = itemsList.filter((i) => !i.fotoUrl);
      if (itensSemFoto.length > 0) {
        toast.error(
          `A empresa exige foto para todos os itens. Faltam ${itensSemFoto.length} fotos.`,
        );
        return; // Interrompe o envio
      }
    }
    // -------------------------------------

    setIsSubmitting(true);

    try {
      // Envia cada item como um evento separado para o Banco de Dados
      // Usamos Promise.all para enviar tudo em paralelo e esperar terminar
      const promises = itemsList.map(async (entry) => {
        const payload: CreateEventoData = {
          itemId: entry.item.id,
          quantidade: entry.quantidade,
          motivo: "Perda Operacional", // Poderia vir de um select no futuro
          fotos: entry.fotoUrl ? [entry.fotoUrl] : [],
        };
        return createEvento(payload);
      });

      const results = await Promise.all(promises);

      // Verifica se algum deu erro
      const errors = results.filter((r) => !r.success);

      if (errors.length > 0) {
        toast.error(
          `Erro ao salvar ${errors.length} itens. Verifique o console.`,
        );
        console.error(errors);
      } else {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro crítico ao salvar eventos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setItemsList([]);
    router.push("/eventos"); // Redireciona para a lista de eventos
  };

  if (!hasPermission("eventos:criar")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4 max-w-6xl mx-auto w-full overflow-hidden">
      {/* 1. Header */}
      <div className="flex items-center justify-between shrink-0 px-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Registrar Perda</h1>
          <p className="text-muted-foreground text-sm">
            Data do registro: {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground block">
            Total Estimado
          </span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(
              itemsList.reduce(
                (acc, cur) => acc + (cur.item.custo || 0) * cur.quantidade,
                0,
              ),
            )}
          </span>
        </div>
      </div>

      {/* 2. Área de Input */}
      <div className="flex flex-col md:flex-row gap-3 items-end shrink-0 pb-2">
        <div className="flex-1 w-full relative">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 ml-1 block">
            Produto
          </label>
          <div className="h-10">
            {/* Componente de Busca - Já está conectado ao banco se o catalogo estiver ok */}
            <ItemSearch
              onSelect={handleItemSelect}
              selectedItem={selectedItem}
              className="w-full h-full"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="w-28">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 ml-1 block">
              Qtd.
            </label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              className={numberInputClass}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            />
          </div>

          <div className="w-20">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 ml-1 block">
              Unid.
            </label>
            <div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-muted/50 text-sm text-muted-foreground font-medium">
              {selectedItem ? selectedItem.unidade : "-"}
            </div>
          </div>
        </div>

        <Button
          onClick={handleAddItem}
          disabled={!selectedItem || !quantidade}
          className="h-10 w-full md:w-auto px-6"
        >
          Adicionar
        </Button>
      </div>

      {/* 3. Tabela */}
      <div className="flex-1 border rounded-md overflow-hidden bg-background relative flex flex-col shadow-sm">
        <div className={`flex-1 ${customScrollbarClass}`}>
          <Table>
            <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
              <TableRow>
                <TableHead className="w-30">Código</TableHead>
                <TableHead className="w-auto">Produto</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center w-20">Foto</TableHead>
                <TableHead className="w-12.5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsList.length > 0 ? (
                itemsList.map((entry) => (
                  <TableRow key={entry.tempId} className="hover:bg-muted/50">
                    <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                      {entry.item.codigoInterno}
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="font-medium text-sm">
                        {entry.item.nome}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-2 font-medium">
                      {entry.quantidade}{" "}
                      <span className="text-[10px] text-muted-foreground">
                        {entry.unidade}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-2 text-muted-foreground text-sm">
                      {formatCurrency(
                        (entry.item.custo || 0) * entry.quantidade,
                      )}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          entry.fotoUrl
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground/30 hover:text-primary"
                        } ${exigirFoto && !entry.fotoUrl ? "animate-pulse text-orange-500" : ""}`}
                        onClick={() => handleAddPhoto(entry.tempId)}
                        title={
                          exigirFoto && !entry.fotoUrl
                            ? "Foto Obrigatória"
                            : "Adicionar Foto"
                        }
                      >
                        {entry.fotoUrl ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleRemoveItem(entry.tempId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground border-none"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-muted/30 p-3 rounded-full">
                        <Plus className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <span className="text-sm">
                        A lista está vazia. Adicione itens acima.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {itemsList.length > 0 && (
          <div className="p-3 bg-muted/20 border-t flex justify-end gap-3 shrink-0 items-center">
            {exigirFoto && itemsList.some((i) => !i.fotoUrl) && (
              <span className="text-xs text-orange-600 font-medium flex items-center mr-auto">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Fotos obrigatórias pendentes
              </span>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItemsList([])}
              disabled={isSubmitting}
              className="text-muted-foreground"
            >
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-3 w-3" /> Finalizar
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-center">Sucesso!</DialogTitle>
            <DialogDescription className="text-center text-xs">
              As perdas foram registradas no sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleSuccessClose} className="w-full" size="sm">
              Ok, ver lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
