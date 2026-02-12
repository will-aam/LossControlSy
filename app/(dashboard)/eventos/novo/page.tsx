// app/(dashboard)/eventos/novo/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ItemSearch } from "@/components/forms/item-search";
import { Item } from "@/lib/types";
import { formatCurrency, compressImage } from "@/lib/utils"; // <--- Importei compressImage
import { useAuth } from "@/lib/auth-context";
import { createEvento, CreateEventoData } from "@/app/actions/eventos";
import { getMotivos, createMotivo } from "@/app/actions/motivos";

import {
  Plus,
  Trash2,
  Camera,
  Send,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  Loader2,
  ChevronsUpDown,
  Check,
  Calendar as CalendarIcon,
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
import { cn } from "@/lib/utils";

const numberInputClass =
  "text-lg h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const customScrollbarClass =
  "overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full";

interface ItemLancamento {
  tempId: string;
  item: Item;
  quantidade: number;
  unidade: string;
  fotoUrl?: string;
  motivo: string;
}

export default function NovoEventoPage() {
  const router = useRouter();
  const { user, hasPermission, settings } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItemIdForPhoto, setActiveItemIdForPhoto] = useState<
    string | null
  >(null);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantidade, setQuantidade] = useState("");

  // ESTADO DA DATA (Padrão: Hoje)
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Controle de Motivos
  const [motivos, setMotivos] = useState<{ id: string; nome: string }[]>([]);
  const [selectedMotivo, setSelectedMotivo] = useState("");
  const [openMotivo, setOpenMotivo] = useState(false);

  const [itemsList, setItemsList] = useState<ItemLancamento[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [exigirFoto, setExigirFoto] = useState(false);

  useEffect(() => {
    if (settings) {
      setExigirFoto(settings.exigirFoto);
    }
    loadMotivos();
  }, [settings]);

  const loadMotivos = async () => {
    const result = await getMotivos();
    if (result.success && result.data) {
      setMotivos(result.data);
    }
  };

  const handleItemSelect = (item: Item | null) => {
    setSelectedItem(item);
  };

  const handleAddItem = async () => {
    if (!selectedItem || !quantidade || parseFloat(quantidade) <= 0) {
      return;
    }

    const motivoFinal = selectedMotivo.trim() || "Perda Operacional";

    const motivoExistente = motivos.find(
      (m) => m.nome.toLowerCase() === motivoFinal.toLowerCase(),
    );

    if (!motivoExistente && motivoFinal !== "Perda Operacional") {
      createMotivo(motivoFinal).then(() => loadMotivos());
    }

    const novoLancamento: ItemLancamento = {
      tempId: Math.random().toString(36).substr(2, 9),
      item: selectedItem,
      quantidade: parseFloat(quantidade),
      unidade: selectedItem.unidade,
      fotoUrl: undefined,
      motivo: motivoFinal,
    };

    setItemsList([novoLancamento, ...itemsList]);

    setSelectedItem(null);
    setQuantidade("");
    setSelectedMotivo("");

    toast.success("Item adicionado à lista");
  };

  const handleRemoveItem = (tempId: string) => {
    setItemsList(itemsList.filter((i) => i.tempId !== tempId));
  };

  const triggerPhotoInput = (tempId: string) => {
    setActiveItemIdForPhoto(tempId);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeItemIdForPhoto) {
      // Feedback visual imediato
      toast.loading("Processando imagem...", { id: "compress-toast" });

      try {
        // --- AQUI A MÁGICA: Comprime antes de salvar ---
        const compressedBase64 = await compressImage(file);

        setItemsList((prev) =>
          prev.map((item) => {
            if (item.tempId === activeItemIdForPhoto) {
              return { ...item, fotoUrl: compressedBase64 };
            }
            return item;
          }),
        );
        toast.dismiss("compress-toast");
        toast.success("Foto anexada!");
      } catch (error) {
        toast.dismiss("compress-toast");
        toast.error("Erro ao processar a foto. Tente novamente.");
        console.error(error);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setActiveItemIdForPhoto(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (itemsList.length === 0 || !user) return;

    if (exigirFoto) {
      const itensSemFoto = itemsList.filter((i) => !i.fotoUrl);
      if (itensSemFoto.length > 0) {
        toast.error(`Faltam ${itensSemFoto.length} fotos obrigatórias.`);
        return;
      }
    }

    setIsSubmitting(true);
    toast.loading("Enviando dados...", { id: "submit-toast" });

    try {
      const promises = itemsList.map(async (entry) => {
        const payload: CreateEventoData = {
          itemId: entry.item.id,
          quantidade: entry.quantidade,
          motivo: entry.motivo,
          fotos: entry.fotoUrl ? [entry.fotoUrl] : [],
          dataPersonalizada: date,
        };
        return createEvento(payload);
      });

      const results = await Promise.all(promises);
      const errors = results.filter((r) => !r.success);

      toast.dismiss("submit-toast");

      if (errors.length > 0) {
        // MOSTRA O ERRO REAL QUE VEIO DO SERVIDOR
        toast.error(`Erro: ${errors[0].message}`);
        console.error("Erros no envio:", errors);
      } else {
        setShowSuccess(true);
      }
    } catch (error: any) {
      toast.dismiss("submit-toast");
      console.error(error);
      // Tratamento de erro genérico
      toast.error(`Erro crítico: ${error.message || "Falha na conexão"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setItemsList([]);
    toast.success("Pronto! Pode lançar os próximos.");
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
      {/* INPUT DE ARQUIVO AJUSTADO 
          accept="image/*" -> Padrão universal para "Quero uma imagem". 
          No Android/iOS isso abre o menu "Câmera ou Galeria".
          Removemos 'capture' para dar a escolha ao usuário.
      */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Registrar Perda</h1>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                size="sm"
                className={cn(
                  "mt-1 justify-start text-left font-normal h-8",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {date ? (
                  date.toLocaleDateString("pt-BR")
                ) : (
                  <span>Selecione a data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
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

      {/* Área de Input */}
      <div className="flex flex-col xl:flex-row gap-3 items-end shrink-0 pb-2">
        {/* Produto */}
        <div className="flex-1 w-full relative min-w-50">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 ml-1 block">
            Produto
          </label>
          <div className="h-10">
            <ItemSearch
              onSelect={handleItemSelect}
              selectedItem={selectedItem}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Motivo */}
        <div className="w-full xl:w-64">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 ml-1 block">
            Motivo
          </label>
          <Popover open={openMotivo} onOpenChange={setOpenMotivo}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openMotivo}
                className="w-full h-10 justify-between font-normal"
              >
                {selectedMotivo || "Selecione ou digite..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-62.5 p-0">
              <Command>
                <CommandInput
                  placeholder="Buscar ou criar motivo..."
                  onValueChange={(val) => {
                    setSelectedMotivo(val);
                  }}
                />
                <CommandList>
                  <CommandEmpty>
                    <span className="text-muted-foreground text-xs">
                      "{selectedMotivo}" será criado ao adicionar.
                    </span>
                  </CommandEmpty>
                  <CommandGroup heading="Sugestões">
                    {motivos.map((motivo) => (
                      <CommandItem
                        key={motivo.id}
                        value={motivo.nome}
                        onSelect={(currentValue) => {
                          const originalName =
                            motivos.find(
                              (m) =>
                                m.nome.toLowerCase() ===
                                currentValue.toLowerCase(),
                            )?.nome || currentValue;
                          setSelectedMotivo(originalName);
                          setOpenMotivo(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedMotivo === motivo.nome
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {motivo.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Qtd e Unidade */}
        <div className="flex gap-2 w-full md:w-auto">
          <div className="w-24">
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
          <div className="w-16">
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

      {/* Tabela */}
      <div className="flex-1 border rounded-md overflow-hidden bg-background relative flex flex-col shadow-sm">
        <div className={`flex-1 ${customScrollbarClass}`}>
          <Table>
            <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
              <TableRow>
                <TableHead className="w-auto">Produto / Motivo</TableHead>
                <TableHead className="text-right w-24">Qtd.</TableHead>
                <TableHead className="text-center w-20">Foto</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsList.length > 0 ? (
                itemsList.map((entry) => (
                  <TableRow key={entry.tempId} className="hover:bg-muted/50">
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {entry.item.nome}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.motivo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2 font-medium">
                      {entry.quantidade}{" "}
                      <span className="text-[10px] text-muted-foreground">
                        {entry.unidade}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          entry.fotoUrl
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground/40 hover:text-primary"
                        } ${exigirFoto && !entry.fotoUrl ? "animate-pulse text-orange-500" : ""}`}
                        onClick={() => triggerPhotoInput(entry.tempId)}
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
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-muted/30 p-3 rounded-full">
                        <Plus className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <span className="text-sm">Lista vazia.</span>
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
                Fotos pendentes
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItemsList([])}
              disabled={isSubmitting}
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
              Registros salvos para {date?.toLocaleDateString("pt-BR")}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleSuccessClose} className="w-full" size="sm">
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
