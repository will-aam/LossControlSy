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
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Evidencia } from "@/lib/types";
// REMOVIDO: import { StorageService } from "@/lib/storage";
// REMOVIDO: import { getPresignedUploadUrl } from "@/app/actions/storage";
// REMOVIDO: import imageCompression from "browser-image-compression";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Evidencia>) => Promise<void>; // Agora é assíncrono
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      // Limite simples de tamanho (ex: 5MB)
      const validFiles = newFiles.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Arquivo ${file.name} muito grande (max 5MB)`);
          return false;
        }
        return true;
      });

      setFiles((prev) => [...prev, ...validFiles]);

      // Criar previews locais
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
    toast.info("Processando fotos...");

    try {
      // Processa cada arquivo sequencialmente para não travar
      for (const file of files) {
        // Converte para Base64
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Chama a função de salvar passada pelo pai (que chama a Server Action)
        await onSave({
          url: base64String,
          motivo: motivo || "Upload Detalhado",
          dataUpload: new Date().toISOString(),
        });
      }

      setFiles([]);
      setPreviews([]);
      setMotivo("");
      // Não fechamos o modal aqui, o pai fecha após sucesso
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao processar fotos.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Evidência</DialogTitle>
          <DialogDescription>
            Fotos serão salvas na galeria do sistema.
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
              Suporta JPG, PNG, WEBP (Max 5MB)
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
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
