"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Evidencia, User } from "@/lib/types";
import { StorageService } from "@/lib/storage";
import { getPresignedUploadUrl } from "@/app/actions/storage";
import imageCompression from "browser-image-compression";

interface UploadDialogProps {
  children: React.ReactNode;
  user: User | null;
  onUploadSuccess: () => void;
}

export function UploadDialog({
  children,
  user,
  onUploadSuccess,
}: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);

      // Criar previews locais
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Função de compressão
  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 0.8, // Máximo 800KB
      maxWidthOrHeight: 1920, // Redimensiona para Full HD se for maior
      useWebWorker: true,
      fileType: "image/webp", // Converte para WebP (mais leve que JPEG)
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Erro na compressão:", error);
      return file; // Se falhar, usa o original
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;

    setIsUploading(true);
    toast.info("Comprimindo e enviando fotos...");

    try {
      // Processa cada arquivo sequencialmente
      for (const file of files) {
        // 1. Comprimir
        const compressedFile = await compressImage(file);

        // 2. Pegar URL assinada
        // Usamos a extensão .webp pois a compressão converte
        const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
          fileName,
          compressedFile.type,
        );

        // 3. Enviar para o R2
        await fetch(uploadUrl, {
          method: "PUT",
          body: compressedFile,
          headers: { "Content-Type": compressedFile.type },
        });

        // 4. Salvar Metadados (Link) no "Banco"
        const novaEvidencia: Evidencia = {
          id: Math.random().toString(36).substr(2, 9),
          url: publicUrl, // Salva o link da nuvem
          dataUpload: new Date().toISOString(),
          motivo: motivo || "Upload avulso na galeria",
        };

        StorageService.saveEvidenciaAvulsa(novaEvidencia);
      }

      toast.success(`${files.length} fotos enviadas com sucesso!`);
      setFiles([]);
      setPreviews([]);
      setMotivo("");
      setOpen(false);
      onUploadSuccess();
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar fotos. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Evidência</DialogTitle>
          <DialogDescription>
            Fotos serão comprimidas e salvas na nuvem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Área de Seleção */}
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
            <p className="text-sm font-medium">Clique para selecionar fotos</p>
            <p className="text-xs text-muted-foreground">
              Suporta JPG, PNG, WEBP
            </p>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
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
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo / Observação</Label>
            <Textarea
              id="motivo"
              placeholder="Descreva o motivo desta evidência..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Salvar Fotos"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
