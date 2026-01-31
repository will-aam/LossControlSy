// components/catalogo/item-form-dialog.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Item, categorias } from "@/lib/mock-data";
import {
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  X,
  Barcode,
} from "lucide-react";

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSave: (itemData: Partial<Item>) => void;
}

export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: ItemFormDialogProps) {
  const isEditing = !!item;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Formulário
  const [formData, setFormData] = useState<Partial<Item>>({});

  // Estados da Imagem
  const [imageTab, setImageTab] = useState<"url" | "upload">("upload");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Resetar ou Preencher dados ao abrir
  useEffect(() => {
    if (open) {
      if (item) {
        setFormData(item);
        setPreviewUrl(item.imagemUrl || "");
        setImageTab(item.imagemUrl?.startsWith("blob:") ? "upload" : "url"); // Tenta adivinhar a aba
      } else {
        setFormData({ unidade: "UN", status: "ativo" });
        setPreviewUrl("");
        setImageTab("upload");
      }
    }
  }, [open, item]);

  const handleInputChange = (field: keyof Item, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Manipular Upload de Arquivo Local
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Cria uma URL temporária para mostrar o preview imediatamente
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      handleInputChange("imagemUrl", objectUrl); // No sistema real, aqui você subiria para o Storage
    }
  };

  const handleSave = () => {
    // Validação básica
    if (!formData.nome || !formData.categoria || !formData.precoVenda) {
      // Adicionar toast de erro se quiser
      return;
    }

    // Se estiver na aba URL, garante que o campo imagemUrl pegue o valor do input de texto
    // Se estiver na aba Upload, o handleFileSelect já atualizou o formData

    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Item" : "Novo Item"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do produto."
              : "Preencha os dados para cadastrar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Seção Imagem */}
          <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
            <Label>Imagem do Produto</Label>
            <div className="flex gap-4 items-start">
              {/* Preview Area */}
              <div className="h-32 w-32 shrink-0 rounded-md border border-dashed bg-muted flex items-center justify-center overflow-hidden relative group">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setPreviewUrl("");
                        handleInputChange("imagemUrl", "");
                      }}
                      className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>

              {/* Controles de Upload */}
              <div className="flex-1">
                <Tabs
                  value={imageTab}
                  onValueChange={(v) => setImageTab(v as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="url">Link Externo</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" /> Selecionar Arquivo
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suporta JPG, PNG e WebP.
                    </p>
                  </TabsContent>

                  <TabsContent value="url" className="mt-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://exemplo.com/foto.jpg"
                        value={formData.imagemUrl || ""}
                        onChange={(e) => {
                          const url = e.target.value;
                          handleInputChange("imagemUrl", url);
                          setPreviewUrl(url);
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Cole o link direto da imagem.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigoInterno">Código Interno *</Label>
              <Input
                id="codigoInterno"
                value={formData.codigoInterno || ""}
                onChange={(e) =>
                  handleInputChange("codigoInterno", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigoBarras">Código de Barras</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="codigoBarras"
                  className="pl-9"
                  value={formData.codigoBarras || ""}
                  onChange={(e) =>
                    handleInputChange("codigoBarras", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input
              id="nome"
              value={formData.nome || ""}
              onChange={(e) => handleInputChange("nome", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => handleInputChange("categoria", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Select
                value={formData.unidade}
                onValueChange={(v) => handleInputChange("unidade", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">UN (Unidade)</SelectItem>
                  <SelectItem value="KG">KG (Quilograma)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custo">Custo Unitário (R$) *</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                value={formData.custo || ""}
                onChange={(e) =>
                  handleInputChange("custo", parseFloat(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precoVenda">Preço de Venda (R$) *</Label>
              <Input
                id="precoVenda"
                type="number"
                step="0.01"
                value={formData.precoVenda || ""}
                onChange={(e) =>
                  handleInputChange("precoVenda", parseFloat(e.target.value))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? "Salvar Alterações" : "Criar Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
