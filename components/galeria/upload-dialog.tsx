"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemSearch } from "@/components/forms/item-search";
// Importações Corrigidas
import { Item, Evidencia, Evento } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { StorageService } from "@/lib/storage";
import { X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

// CSS para esconder scrollbar
const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Evidencia>) => void;
}

export function UploadDialog({
  open,
  onOpenChange,
  onSave,
}: UploadDialogProps) {
  // Estado Global do Upload
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("produto");

  // Estado Vínculo Produto (Genérico)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Estado Vínculo Evento (Específico)
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedLoteKey, setSelectedLoteKey] = useState<string>("");
  const [selectedEventoId, setSelectedEventoId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar eventos ao abrir
  useEffect(() => {
    if (open) {
      setEventos(StorageService.getEventos());
    }
  }, [open]);

  // Agrupar eventos em Lotes (Memoizado)
  const lotesOptions = useMemo(() => {
    const grupos: Record<string, { label: string; eventos: Evento[] }> = {};

    eventos.forEach((ev) => {
      // Chave única para o lote: Data + Autor
      const dataFormatada = formatDate(ev.dataHora);
      const chave = `${dataFormatada}-${ev.criadoPor.nome}`;

      if (!grupos[chave]) {
        grupos[chave] = {
          label: `${dataFormatada} - ${ev.criadoPor.nome}`,
          eventos: [],
        };
      }
      grupos[chave].eventos.push(ev);
    });

    return Object.entries(grupos).map(([key, value]) => ({
      key,
      label: value.label,
      qtdItens: value.eventos.length,
      eventos: value.eventos,
    }));
  }, [eventos]);

  // Filtrar itens do lote selecionado
  const eventosDoLote = useMemo(() => {
    if (!selectedLoteKey) return [];
    return lotesOptions.find((l) => l.key === selectedLoteKey)?.eventos || [];
  }, [selectedLoteKey, lotesOptions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleClear = () => {
    setSelectedItem(null);
    setMotivo("");
    setPreviewUrl(null);
    setSelectedLoteKey("");
    setSelectedEventoId("");
    setActiveTab("produto");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!previewUrl) {
      toast.warning("Selecione uma imagem primeiro.");
      return;
    }

    setIsUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const dadosParaSalvar: Partial<Evidencia> = {
      url: previewUrl,
      motivo: motivo,
      dataUpload: new Date().toISOString(),
    };

    // Lógica de qual ID vincular baseado na Aba Ativa
    if (activeTab === "produto") {
      // Vínculo Genérico (apenas o Produto)
      if (selectedItem) dadosParaSalvar.itemId = selectedItem.id;
    } else {
      // Vínculo Específico (Evento de Perda Realizado)
      if (selectedEventoId) {
        dadosParaSalvar.eventoId = selectedEventoId;
        // Se vinculou evento, pegamos o Item ID dele automaticamente também
        const evento = eventos.find((e) => e.id === selectedEventoId);
        if (evento?.item?.id) dadosParaSalvar.itemId = evento.item.id;
      }
    }

    onSave(dadosParaSalvar);
    setIsUploading(false);
    handleClear();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125 max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header Fixo */}
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>Adicionar à Galeria</DialogTitle>
        </DialogHeader>

        {/* Corpo com Scroll Interno */}
        <div className={`flex-1 overflow-y-auto p-6 pt-2 ${hideScrollClass}`}>
          <div className="grid gap-4">
            {/* Área de Imagem */}
            <div className="flex flex-col gap-2">
              <Label>Evidência (Foto)</Label>
              <div
                className={`border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${
                  previewUrl
                    ? "border-primary/50 bg-black/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onClick={() => !previewUrl && fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain p-1"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewUrl(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="produto">Vincular Produto</TabsTrigger>
                <TabsTrigger value="evento">Vincular Perda (Lote)</TabsTrigger>
              </TabsList>

              {/* ABA 1: PRODUTO GENÉRICO */}
              <TabsContent value="produto" className="space-y-3 pt-2">
                <div className="flex flex-col gap-2">
                  <Label>Buscar Produto (Opcional)</Label>
                  <ItemSearch
                    selectedItem={selectedItem}
                    onSelect={setSelectedItem}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Use esta opção para fotos de produtos gerais, sem vínculo
                    com uma perda específica.
                  </p>
                </div>
              </TabsContent>

              {/* ABA 2: EVENTO / LOTE */}
              <TabsContent value="evento" className="space-y-3 pt-2">
                <div className="flex flex-col gap-3">
                  {/* Select 1: Lote */}
                  <div className="space-y-1">
                    <Label>1. Selecione o Lote / Data</Label>
                    <Select
                      value={selectedLoteKey}
                      onValueChange={(val) => {
                        setSelectedLoteKey(val);
                        setSelectedEventoId(""); // Reseta item ao mudar lote
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione data e responsável..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-50">
                        {lotesOptions.map((lote) => (
                          <SelectItem key={lote.key} value={lote.key}>
                            {lote.label} ({lote.qtdItens} itens)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select 2: Item do Lote */}
                  <div className="space-y-1">
                    <Label
                      className={
                        !selectedLoteKey ? "text-muted-foreground" : ""
                      }
                    >
                      2. Selecione o Item da Perda
                    </Label>
                    <Select
                      value={selectedEventoId}
                      onValueChange={setSelectedEventoId}
                      disabled={!selectedLoteKey}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedLoteKey
                              ? "Selecione o item..."
                              : "Selecione um lote primeiro"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-50">
                        {eventosDoLote.map((ev) => (
                          <SelectItem key={ev.id} value={ev.id}>
                            {ev.item?.nome || "Item desconhecido"} -{" "}
                            {ev.quantidade} {ev.unidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Motivo (Comum para ambos) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="motivo">Motivo / Observação</Label>
              <Textarea
                id="motivo"
                placeholder="Ex: Item avariado no estoque..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="resize-none h-20"
              />
            </div>
          </div>
        </div>

        {/* Footer Fixo */}
        <DialogFooter className="p-6 pt-2 shrink-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || !previewUrl}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
