"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Upload,
  X,
  Loader2,
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Evidencia } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buscarEventosParaVinculo } from "@/app/actions/galeria";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Atualizamos a tipagem para aceitar os novos campos
  onSave: (
    data: Partial<Evidencia> & { eventoId?: string; dataPersonalizada?: Date },
  ) => Promise<void>;
}

export function UploadDialog({
  open,
  onOpenChange,
  onSave,
}: UploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");

  // Novos Estados
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [openEventos, setOpenEventos] = useState(false);
  const [selectedEventoId, setSelectedEventoId] = useState("");
  const [eventosList, setEventosList] = useState<
    { id: string; label: string }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega lista de eventos ao abrir
  useEffect(() => {
    if (open) {
      buscarEventosParaVinculo().then((res) => {
        if (res.success && res.data) {
          setEventosList(res.data);
        }
      });
      // Reseta data para hoje ao abrir
      setDate(new Date());
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter((file) => {
        // Aumentei o limite para 15MB já que vamos usar R2 e redimensionamento no futuro
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`Arquivo ${file.name} muito grande (max 15MB)`);
          return false;
        }
        return true;
      });

      setFiles((prev) => [...prev, ...validFiles]);
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    toast.info("Enviando evidências...");

    try {
      for (const file of files) {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await onSave({
          url: base64String, // O backend vai jogar pro R2
          motivo: motivo || "Galeria Detalhada",
          // Passamos os novos campos
          dataPersonalizada: date,
          eventoId: selectedEventoId || undefined,
        });
      }

      // Limpa formulário
      setFiles([]);
      setPreviews([]);
      setMotivo("");
      setSelectedEventoId("");
      setDate(new Date());
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao processar fotos.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Evidência Detalhada</DialogTitle>
          <DialogDescription>
            Registre fotos retroativas ou vincule a perdas já lançadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. SELETOR DE DATA */}
          <div className="flex flex-col space-y-2">
            <Label>Data da Ocorrência</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    date.toLocaleDateString("pt-BR")
                  ) : (
                    <span>Selecione a data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 2. SELETOR DE EVENTO (BUSCA) */}
          <div className="flex flex-col space-y-2">
            <Label>Vincular a Evento (Opcional)</Label>
            <Popover open={openEventos} onOpenChange={setOpenEventos}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openEventos}
                  className="w-full justify-between overflow-hidden"
                >
                  {selectedEventoId
                    ? eventosList.find((ev) => ev.id === selectedEventoId)
                        ?.label
                    : "Procurar evento..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Busque por produto ou data..." />
                  <CommandList>
                    <CommandEmpty>
                      Nenhum evento recente encontrado.
                    </CommandEmpty>
                    <CommandGroup heading="Últimos lançamentos">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setSelectedEventoId("");
                          setOpenEventos(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedEventoId === ""
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        -- Sem Vínculo (Avulso) --
                      </CommandItem>
                      {eventosList.map((ev) => (
                        <CommandItem
                          key={ev.id}
                          value={ev.label} // O value é usado para busca textual
                          onSelect={() => {
                            setSelectedEventoId(ev.id);
                            setOpenEventos(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedEventoId === ev.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="truncate">{ev.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[10px] text-muted-foreground">
              *Ao vincular, a foto será associada automaticamente ao item do
              evento.
            </p>
          </div>

          {/* 3. ÁREA DE UPLOAD */}
          <div
            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <div className="bg-primary/10 p-3 rounded-full mb-2">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Toque para adicionar fotos</p>
            <p className="text-xs text-muted-foreground">
              Suporta JPG, PNG, WEBP
            </p>
          </div>

          {/* PREVIEWS */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {previews.map((src, index) => (
                <div
                  key={index}
                  className="relative group aspect-square rounded-md overflow-hidden border"
                >
                  <img
                    src={src}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 4. MOTIVO */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Observação</Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Foto tirada dias depois..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar e Vincular"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
