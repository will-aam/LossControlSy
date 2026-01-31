"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle, // Importado DialogTitle
} from "@/components/ui/dialog";
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
import {
  Evidencia,
  Evento,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
} from "@/lib/mock-data";
import { StorageService } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { UploadDialog } from "@/components/galeria/upload-dialog";
import {
  Search,
  Calendar,
  AlertTriangle,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Package,
  X,
  Plus,
  Trash2,
  Camera,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Interface estendida para exibição
interface EvidenciaDisplay extends Evidencia {
  evento?: Evento;
}

export default function GaleriaPage() {
  const { hasPermission } = useAuth();

  // Dados
  const [evidencias, setEvidencias] = useState<EvidenciaDisplay[]>([]);

  // Filtros e Seleção
  const [selectedDate, setSelectedDate] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<EvidenciaDisplay | null>(
    null,
  );
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

  const loadData = () => {
    const allData = StorageService.getAllEvidencias();
    setEvidencias(allData);
  };

  // --- AÇÕES DE UPLOAD ---

  // 1. Upload Rápido (Apenas seleciona e salva com data)
  const handleQuickUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file); // Em prod, usaria upload real

      const novaEvidencia: Evidencia = {
        id: Math.random().toString(36).substr(2, 9),
        url: url,
        dataUpload: new Date().toISOString(),
        motivo: "Upload Rápido",
        // Sem item vinculado
      };

      StorageService.saveEvidenciaAvulsa(novaEvidencia);
      loadData();
      toast.success("Foto adicionada à galeria");
    }
    // Limpa input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 2. Upload Detalhado (Vem do Modal)
  const handleDetailedSave = (data: Partial<Evidencia>) => {
    const novaEvidencia: Evidencia = {
      id: Math.random().toString(36).substr(2, 9),
      url: data.url || "",
      dataUpload: data.dataUpload || new Date().toISOString(),
      motivo: data.motivo,
      itemId: data.itemId,
    };

    StorageService.saveEvidenciaAvulsa(novaEvidencia);
    loadData();
    toast.success("Foto registrada com detalhes!");
  };

  // --- AÇÃO DE EXCLUSÃO ---
  const confirmDelete = () => {
    if (!photoToDelete) return;

    if (photoToDelete.evento) {
      toast.error(
        "Não é possível excluir fotos vinculadas a eventos auditados aqui.",
      );
    } else {
      StorageService.deleteEvidenciaAvulsa(photoToDelete.id);
      loadData();
      toast.success("Foto removida.");
      if (selectedPhoto?.id === photoToDelete.id) setSelectedPhoto(null);
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
          ev.evento?.item?.nome.toLowerCase().includes(query) ||
          ev.evento?.item?.codigoInterno.toLowerCase().includes(query) ||
          ev.motivo?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [evidencias, selectedDate, searchQuery]);

  // --- NAVEGAÇÃO DO VIEWER ---
  const handlePhotoClick = (photo: EvidenciaDisplay, index: number) => {
    setSelectedPhoto(photo);
    setPhotoIndex(index);
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

        {/* BOTÕES DE UPLOAD */}
        <div className="flex gap-2">
          {/* Input Oculto para Upload Rápido */}
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
      {filteredEvidencias.length > 0 ? (
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
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-6 w-6 rounded-full bg-transparent hover:bg-black/70 p-1.5  text-white">
                    <ZoomIn className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>

              {/* Botão de Menu/Excluir (Só aparece se não for de evento auditado ou se for admin) */}
              {!evidencia.evento && (
                <div
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-transparent hover:bg-black/70 text-white"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive text-xs"
                        onClick={() => setPhotoToDelete(evidencia)}
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
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={(open) => !open && setSelectedPhoto(null)}
      >
        {/* CORREÇÃO: [&>button]:hidden remove o X padrão duplicado */}
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-black/95 border-none [&>button]:hidden">
          {/* CORREÇÃO: DialogTitle Oculto para Acessibilidade */}
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
                className="rounded-full"
                onClick={() => setSelectedPhoto(null)}
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
                        className={getStatusColor(selectedPhoto.evento.status)}
                      >
                        {getStatusLabel(selectedPhoto.evento.status)}
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

                {/* Botão de Excluir no Viewer (apenas avulsas) */}
                {!selectedPhoto?.evento && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setPhotoToDelete(selectedPhoto);
                      setSelectedPhoto(null);
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
