"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Importações
import { Evidencia } from "@/lib/types";
import {
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
} from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { UploadDialog } from "@/components/galeria/upload-dialog";
import {
  getEvidencias,
  createEvidenciaAvulsa,
  deleteEvidencia,
} from "@/app/actions/galeria";

import {
  Search,
  Calendar,
  AlertTriangle,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Camera,
  MoreVertical,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Interface ajustada para aceitar dados parciais do banco sem reclamar
interface EvidenciaDisplay {
  id: string;
  url: string;
  dataUpload: string;
  motivo?: string;
  itemId?: string;
  user?: { nome: string };
  evento?: {
    id: string;
    status: string;
    quantidade: number;
    unidade: string;
    motivo?: string;
    item?: {
      nome: string;
      codigoInterno: string;
    };
  };
}

export default function GaleriaPage() {
  const { hasPermission } = useAuth();

  // Dados
  const [evidencias, setEvidencias] = useState<EvidenciaDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros e Seleção
  const [selectedDate, setSelectedDate] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");

  // Controle do Modal de Visualização
  const [selectedPhoto, setSelectedPhoto] = useState<EvidenciaDisplay | null>(
    null,
  );
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const [photoIndex, setPhotoIndex] = useState(0);

  // Modais e Upload
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<EvidenciaDisplay | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await getEvidencias();

    if (result.success && result.data) {
      // Mapeamento com tipagem flexível para evitar erro de Evento incompleto
      const mappedData: EvidenciaDisplay[] = (result.data as any[]).map(
        (ev) => ({
          id: ev.id,
          url: ev.url,
          dataUpload: ev.dataUpload,
          motivo: ev.motivo,
          itemId: ev.evento?.itemId,
          user: ev.user,
          evento: ev.evento
            ? {
                id: ev.evento.id,
                status: ev.evento.status,
                quantidade: Number(ev.evento.quantidade),
                unidade: ev.evento.unidade,
                motivo: ev.evento.motivo,
                item: ev.evento.item
                  ? {
                      nome: ev.evento.item.nome,
                      codigoInterno: ev.evento.item.codigoInterno,
                    }
                  : undefined,
              }
            : undefined,
        }),
      );
      setEvidencias(mappedData);
    } else {
      toast.error("Erro ao carregar galeria.");
    }
    setIsLoading(false);
  };

  // --- AÇÕES DE UPLOAD ---

  const handleQuickUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const result = await createEvidenciaAvulsa({
          url: base64String,
          motivo: "Upload Rápido",
        });

        if (result.success) {
          toast.success("Foto adicionada à galeria");
          loadData();
        } else {
          toast.error("Erro ao salvar foto.");
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDetailedSave = async (data: Partial<Evidencia>) => {
    if (!data.url) return;

    const result = await createEvidenciaAvulsa({
      url: data.url,
      motivo: data.motivo,
    });

    if (result.success) {
      toast.success("Foto registrada com detalhes!");
      loadData();
      setShowUploadDialog(false);
    } else {
      toast.error("Erro ao salvar.");
    }
  };

  // --- AÇÃO DE EXCLUSÃO ---
  const confirmDelete = async () => {
    if (!photoToDelete) return;

    if (photoToDelete.evento) {
      toast.error(
        "Não é possível excluir fotos vinculadas a eventos auditados aqui.",
      );
    } else {
      const result = await deleteEvidencia(photoToDelete.id);

      if (result.success) {
        toast.success("Foto removida.");
        loadData();
        // Se apagou a foto que estava aberta no viewer, fecha o viewer
        if (selectedPhoto?.id === photoToDelete.id) {
          setIsViewerOpen(false);
          setSelectedPhoto(null);
        }
      } else {
        toast.error(result.message);
      }
    }
    setPhotoToDelete(null);
  };

  // --- FILTROS ---
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    evidencias.forEach((ev) => dates.add(formatDate(ev.dataUpload)));
    return Array.from(dates).sort((a, b) => {
      const [da, ma, ya] = a.split("/");
      const [db, mb, yb] = b.split("/");
      return (
        new Date(`${yb}-${mb}-${db}`).getTime() -
        new Date(`${ya}-${ma}-${da}`).getTime()
      );
    });
  }, [evidencias]);

  const filteredEvidencias = useMemo(() => {
    let filtered = evidencias;

    if (selectedDate !== "todas") {
      filtered = filtered.filter(
        (ev) => formatDate(ev.dataUpload) === selectedDate,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ev) =>
          (ev.evento?.item?.nome || "").toLowerCase().includes(query) ||
          (ev.evento?.item?.codigoInterno || "")
            .toLowerCase()
            .includes(query) ||
          (ev.motivo || "").toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [evidencias, selectedDate, searchQuery]);

  // --- NAVEGAÇÃO DO VIEWER ---
  const handlePhotoClick = (photo: EvidenciaDisplay, index: number) => {
    setSelectedPhoto(photo);
    setPhotoIndex(index);
    setIsViewerOpen(true);
  };

  const handlePrevPhoto = () => {
    const newIndex =
      photoIndex > 0 ? photoIndex - 1 : filteredEvidencias.length - 1;
    setSelectedPhoto(filteredEvidencias[newIndex]);
    setPhotoIndex(newIndex);
  };

  const handleNextPhoto = () => {
    const newIndex =
      photoIndex < filteredEvidencias.length - 1 ? photoIndex + 1 : 0;
    setSelectedPhoto(filteredEvidencias[newIndex]);
    setPhotoIndex(newIndex);
  };

  if (!hasPermission("galeria:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header e Ações */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Galeria</h1>
          <p className="text-muted-foreground">
            Visualize evidências de eventos e fotos avulsas.
          </p>
        </div>

        {/* BOTÕES DE UPLOAD (Protegidos por permissão) */}
        {hasPermission("galeria:upload") && (
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleQuickUpload}
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              Foto Rápida
            </Button>

            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Detalhado
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row bg-background/95 backdrop-blur z-10 py-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por item ou motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-full sm:w-48">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as datas</SelectItem>
            {uniqueDates.map((date) => (
              <SelectItem key={date} value={date}>
                {date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Fotos */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEvidencias.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 pb-10">
          {filteredEvidencias.map((evidencia, index) => (
            <Card
              key={evidencia.id}
              className="group relative overflow-hidden border-0 shadow-sm ring-1 ring-border/50"
            >
              <CardContent
                className="p-0 aspect-square relative cursor-pointer"
                onClick={() => handlePhotoClick(evidencia, index)}
              >
                <img
                  src={evidencia.url || "/placeholder.svg"}
                  alt={`Evidência ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Overlay Gradiente */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-medium truncate">
                    {evidencia.evento?.item?.nome || "Foto Avulsa"}
                  </p>
                  <p className="text-white/70 text-[10px]">
                    {formatDate(evidencia.dataUpload)}
                  </p>
                </div>

                {/* Ícone de Zoom */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="h-6 w-6 rounded-full bg-transparent p-1.5 text-white">
                    <ZoomIn className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>

              {/* Botão de Menu/Excluir (ABSOLUTAMENTE ACIMA DE TUDO) */}
              {/* Só mostra se NÃO for evento e tiver permissão */}
              {!evidencia.evento && hasPermission("galeria:excluir") && (
                <div
                  className="absolute top-2 right-2 z-20"
                  onClick={(e) => {
                    e.stopPropagation(); // Impede abrir o viewer ao clicar no menu
                  }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoToDelete(evidencia);
                        }}
                      >
                        <Trash2 className="mr-2 h-3 w-3" /> Excluir Foto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-muted/5">
          <div className="bg-muted/50 p-4 rounded-full mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Nenhuma foto encontrada</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            Tente ajustar os filtros ou adicione novas fotos usando os botões
            acima.
          </p>
        </div>
      )}

      {/* Modal Visualizador */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-black/95 border-none [&>button]:hidden">
          <DialogTitle className="sr-only">
            Visualizar Evidência:{" "}
            {selectedPhoto?.evento?.item?.nome || "Foto Avulsa"}
          </DialogTitle>

          <div className="relative w-full h-full flex flex-col">
            {/* Header Flutuante */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 bg-linear-to-b from-black/80 to-transparent">
              <div>
                <h2 className="text-white font-medium text-sm">
                  {selectedPhoto?.evento?.item?.nome || "Registro de Galeria"}
                </h2>
                <p className="text-white/70 text-xs">
                  {selectedPhoto && formatDateTime(selectedPhoto.dataUpload)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-white hover:bg-white/20"
                onClick={() => setIsViewerOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Imagem Principal */}
            <div className="relative flex-1 bg-black min-h-[50vh] max-h-[80vh] flex items-center justify-center">
              {selectedPhoto && (
                <img
                  src={selectedPhoto.url || "/placeholder.svg"}
                  alt="Evidência Detalhada"
                  className="max-h-full max-w-full object-contain"
                />
              )}

              {/* Navegação */}
              {filteredEvidencias.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full h-10 w-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevPhoto();
                    }}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full h-10 w-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextPhoto();
                    }}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>

            {/* Footer com Detalhes */}
            <div className="bg-background p-4 border-t">
              <div className="flex items-start gap-4">
                {selectedPhoto?.evento ? (
                  // Se for vinculado a evento
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {selectedPhoto.evento.item?.codigoInterno}
                      </Badge>
                      <Badge
                        className={getStatusColor(
                          selectedPhoto.evento.status as any,
                        )}
                      >
                        {getStatusLabel(selectedPhoto.evento.status as any)}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      Quantidade:{" "}
                      <strong>
                        {selectedPhoto.evento.quantidade}{" "}
                        {selectedPhoto.evento.unidade}
                      </strong>
                    </p>
                    {selectedPhoto.evento.motivo && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Motivo: {selectedPhoto.evento.motivo}
                      </p>
                    )}
                  </div>
                ) : (
                  // Se for foto avulsa
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">Avulso</Badge>
                    </div>
                    <p className="text-sm text-foreground">
                      {selectedPhoto?.motivo || "Sem observações registradas."}
                    </p>
                  </div>
                )}

                {/* Botão de Excluir no Viewer */}
                {!selectedPhoto?.evento && hasPermission("galeria:excluir") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setPhotoToDelete(selectedPhoto);
                      // Não fecha o viewer agora, espera confirmação
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload Detalhado */}
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSave={handleDetailedSave}
      />

      {/* Alerta de Exclusão */}
      <AlertDialog
        open={!!photoToDelete}
        onOpenChange={(open) => !open && setPhotoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá a foto da galeria permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
