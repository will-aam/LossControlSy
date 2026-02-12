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
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Evidencia } from "@/lib/types";
import { cn, compressImage, formatDateTime } from "@/lib/utils";
import { buscarEventosParaVinculo } from "@/app/actions/galeria";
import { getMotivos, createMotivo } from "@/app/actions/motivos";
import { EvidenciaDisplay } from "@/app/(dashboard)/galeria/page";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    data: Partial<Evidencia> & { eventoId?: string; dataPersonalizada?: Date },
  ) => Promise<void>;
  editMode?: boolean;
  initialData?: EvidenciaDisplay | null;
}

export function UploadDialog({
  open,
  onOpenChange,
  onSave,
  editMode = false,
  initialData,
}: UploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false);

  // No modo detalhado/edição, é apenas 1 arquivo
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  // Estados do Formulário
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Vínculo com Evento
  const [selectedEventoId, setSelectedEventoId] = useState("none");
  const [eventosList, setEventosList] = useState<
    { id: string; label: string; dataOriginal: Date; itemNome: string }[]
  >([]);
  const [openEventos, setOpenEventos] = useState(false);

  // Motivos (Select/Combobox)
  const [motivos, setMotivos] = useState<{ id: string; nome: string }[]>([]);
  const [selectedMotivo, setSelectedMotivo] = useState("");
  const [openMotivo, setOpenMotivo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega dados iniciais
  useEffect(() => {
    if (open) {
      // 1. Carregar Eventos
      buscarEventosParaVinculo().then((res) => {
        if (res.success && res.data) {
          // Mapeia para incluir o nome do item e data original para facilitar
          const mapped = res.data.map((e) => ({
            ...e,
            // O label já vem formatado do server action
            // Garantimos que a data venha como objeto Date
            dataOriginal: new Date(e.dataOriginal),
            itemNome: e.label.split(" - ")[1]?.split(" (")[0] || "Item",
          }));
          setEventosList(mapped);
        }
      });

      // 2. Carregar Motivos
      loadMotivos();

      // 3. Preencher se for Edição
      if (editMode && initialData) {
        setPreview(initialData.url);
        // Se já tem evento, seleciona
        if (initialData.evento) {
          setSelectedEventoId(initialData.evento.id);
          // A data será atualizada pelo useEffect do selectedEventoId
        } else {
          setSelectedEventoId("none");
          setDate(new Date(initialData.dataUpload));
        }
        setSelectedMotivo(initialData.motivo || "");
      } else {
        // Reset para criação
        setFile(null);
        setPreview("");
        setSelectedEventoId("none");
        setDate(new Date());
        setSelectedMotivo("");
      }
    }
  }, [open, editMode, initialData]);

  const loadMotivos = async () => {
    const result = await getMotivos();
    if (result.success && result.data) {
      setMotivos(result.data);
    }
  };

  // Efeito: Ao selecionar um evento, preencher a data e travar
  useEffect(() => {
    if (selectedEventoId && selectedEventoId !== "none") {
      const evento = eventosList.find((e) => e.id === selectedEventoId);
      if (evento) {
        setDate(evento.dataOriginal);
        // Se não tiver motivo selecionado, tenta sugerir algo ou deixa vazio
        if (!selectedMotivo) setSelectedMotivo("Registro vinculado");
      }
    }
  }, [selectedEventoId, eventosList]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("Arquivo muito grande (max 20MB)");
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSaveAction = async () => {
    // Validação
    if (!editMode && !file) {
      toast.error("Selecione uma foto.");
      return;
    }
    if (selectedEventoId === "none" && !editMode) {
      // No modo criação detalhada, evento é obrigatório segundo sua regra
      toast.error("Selecione um evento para vincular.");
      return;
    }

    setIsUploading(true);
    toast.info(editMode ? "Atualizando..." : "Enviando...");

    try {
      // 1. Processar Motivo (Criar se não existir)
      let motivoFinal = selectedMotivo.trim();
      if (motivoFinal) {
        const existe = motivos.find(
          (m) => m.nome.toLowerCase() === motivoFinal.toLowerCase(),
        );
        if (!existe) {
          await createMotivo(motivoFinal);
          loadMotivos();
        }
      }

      // 2. Preparar Imagem (apenas se for novo upload)
      let base64String = "";
      if (file) {
        base64String = await compressImage(file);
      }

      // 3. Salvar
      await onSave({
        url: base64String, // Se vazio (edição sem troca de foto), o pai trata
        motivo: motivoFinal,
        dataPersonalizada: date,
        eventoId: selectedEventoId === "none" ? undefined : selectedEventoId,
      });

      // Limpeza (se não for fechar automático pelo pai)
      if (!editMode) {
        setFile(null);
        setPreview("");
        setSelectedMotivo("");
        setSelectedEventoId("none");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao processar.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMode ? "Completar Cadastro" : "Adicionar Evidência Detalhada"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Adicione informações à foto avulsa."
              : "Vincule uma nova foto a um evento existente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. SELEÇÃO DE EVENTO (Obrigatório na criação, Opcional na edição) */}
          <div className="flex flex-col space-y-2">
            <Label>
              Evento / Perda <span className="text-red-500">*</span>
            </Label>
            <Popover open={openEventos} onOpenChange={setOpenEventos}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openEventos}
                  className="w-full justify-between overflow-hidden"
                >
                  {selectedEventoId && selectedEventoId !== "none"
                    ? eventosList.find((ev) => ev.id === selectedEventoId)
                        ?.label
                    : "Selecione o evento..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-75 p-0">
                <Command>
                  <CommandInput placeholder="Buscar por item ou data..." />
                  <CommandList>
                    <CommandEmpty>Nenhum evento encontrado.</CommandEmpty>
                    <CommandGroup>
                      {/* Opção de "Sem Vínculo" apenas na edição ou se permitido */}
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setSelectedEventoId("none");
                          setOpenEventos(false);
                          // Destrava a data para hoje
                          setDate(new Date());
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedEventoId === "none"
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        -- Sem Vínculo (Avulso) --
                      </CommandItem>

                      {eventosList.map((ev) => (
                        <CommandItem
                          key={ev.id}
                          value={ev.label}
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
          </div>

          {/* 2. DATA (Automática do evento ou manual se avulso) */}
          <div className="flex flex-col space-y-2">
            <Label>Data da Ocorrência</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  disabled={selectedEventoId !== "none"} // Trava se tiver evento
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                    selectedEventoId !== "none" && "opacity-80 bg-muted",
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
                  disabled={selectedEventoId !== "none"}
                />
              </PopoverContent>
            </Popover>
            {selectedEventoId !== "none" && (
              <p className="text-[10px] text-muted-foreground">
                *Data vinculada ao evento selecionado.
              </p>
            )}
          </div>

          {/* 3. FOTO (Preview ou Upload) */}
          <div className="flex flex-col space-y-2">
            <Label>Evidência Fotográfica</Label>

            {/* Área de Preview/Upload */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden h-48",
                !file && !preview ? "hover:bg-muted/50" : "border-primary/50",
              )}
              onClick={() => !editMode && fileInputRef.current?.click()} // Só clica se não for edição (você disse "não trocar a foto")
            >
              {preview ? (
                <div className="relative w-full h-full flex items-center justify-center group">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  {!editMode && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium">
                      Trocar Foto
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-primary/10 p-3 rounded-full mb-2">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Toque para adicionar</p>
                  <p className="text-xs text-muted-foreground">
                    1 Foto por vez
                  </p>
                </>
              )}

              {/* Input escondido - desativado em modo edição */}
              {!editMode && (
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
              )}
            </div>
            {editMode && (
              <p className="text-[10px] text-amber-600">
                *A foto não pode ser alterada na edição, apenas os dados.
              </p>
            )}
          </div>

          {/* 4. MOTIVO (SELECT/COMBOBOX) */}
          <div className="flex flex-col space-y-2">
            <Label>Motivo / Observação</Label>
            <Popover open={openMotivo} onOpenChange={setOpenMotivo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openMotivo}
                  className="w-full justify-between"
                >
                  {selectedMotivo || "Selecione ou digite..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-75 p-0">
                <Command>
                  <CommandInput
                    placeholder="Buscar ou criar motivo..."
                    onValueChange={(val) => setSelectedMotivo(val)}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <span className="text-muted-foreground text-xs">
                        "{selectedMotivo}" será criado ao salvar.
                      </span>
                    </CommandEmpty>
                    <CommandGroup heading="Sugestões">
                      {motivos.map((motivo) => (
                        <CommandItem
                          key={motivo.id}
                          value={motivo.nome}
                          onSelect={(currentValue) => {
                            // Garante que pega o nome original com case correto
                            const original =
                              motivos.find(
                                (m) =>
                                  m.nome.toLowerCase() ===
                                  currentValue.toLowerCase(),
                              )?.nome || currentValue;
                            setSelectedMotivo(original);
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
            onClick={handleSaveAction}
            disabled={(!file && !editMode) || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : editMode ? (
              "Atualizar Dados"
            ) : (
              "Salvar Foto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
