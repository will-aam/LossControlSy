"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { StorageService } from "@/lib/storage";
import { NotaFiscal, Evento } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Trash2,
  MoreVertical,
  FileCode,
  File as FileIcon,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/notas/upload-zone"; // Importamos nosso componente

export default function NotasFiscaisPage() {
  const { user, hasPermission } = useAuth();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Estados do formulário de upload
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Partial<NotaFiscal>>({});
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEventoId, setSelectedEventoId] = useState<string>("none");

  // Carregar dados
  useEffect(() => {
    setNotas(StorageService.getNotasFiscais());
    setEventos(
      StorageService.getEventos().filter((e) => e.status !== "rascunho"),
    );
  }, []);

  // Callback chamado quando o componente UploadZone recebe um arquivo
  const handleFileSelect = (
    selectedFile: File,
    data: Partial<NotaFiscal> = {},
  ) => {
    setFile(selectedFile);
    setParsedData(data);
  };

  const handleSave = () => {
    if (!file || !user) return;

    setIsUploading(true);

    // Simula delay de upload/processamento
    setTimeout(() => {
      const novaNota: NotaFiscal = {
        id: Math.random().toString(36).substr(2, 9),
        dataUpload: new Date().toISOString(),
        uploadedBy: user,
        pdfUrl: file.type.includes("pdf")
          ? URL.createObjectURL(file)
          : undefined,

        // Mescla os dados extraídos pelo componente
        ...parsedData,

        // Fallback se não pegou nome
        emitente: parsedData.emitente || file.name,

        eventoId: selectedEventoId !== "none" ? selectedEventoId : undefined,
      };

      StorageService.saveNotaFiscal(novaNota);
      setNotas(StorageService.getNotasFiscais());

      // Reset
      setIsUploadOpen(false);
      setIsUploading(false);
      setFile(null);
      setParsedData({});
      setSelectedEventoId("none");
      toast.success("Nota fiscal salva com sucesso!");
    }, 800);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta nota?")) {
      StorageService.deleteNotaFiscal(id);
      setNotas(StorageService.getNotasFiscais());
      toast.success("Nota excluída.");
    }
  };

  if (!hasPermission("notas:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center">
          Esta área é restrita para gestão fiscal e administrativa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notas Fiscais
          </h1>
          <p className="text-muted-foreground">
            Gerencie XMLs e PDFs de entrada
          </p>
        </div>

        {hasPermission("notas:upload") && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Nova Nota
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload de Nota Fiscal</DialogTitle>
                <DialogDescription>
                  Arraste ou clique para selecionar. Suporta XML (NFe) e PDF.
                </DialogDescription>
              </DialogHeader>

              {/* Área de Upload (Drag & Drop) */}
              <div className="py-2">
                <UploadZone
                  onFileSelect={handleFileSelect}
                  isUploading={isUploading}
                />
              </div>

              {/* Seleção de Vínculo (Só aparece se tiver arquivo) */}
              {file && (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="evento">Vincular a Perda (Opcional)</Label>
                  <Select
                    value={selectedEventoId}
                    onValueChange={setSelectedEventoId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um evento..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não vincular</SelectItem>
                      {eventos.map((evt) => (
                        <SelectItem key={evt.id} value={evt.id}>
                          {formatDateTime(evt.dataHora)} -{" "}
                          {evt.item?.nome || "Item desconhecido"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!file || isUploading}>
                  {isUploading ? "Salvando..." : "Salvar Nota"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Lista Vazia */}
      {notas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center min-h-72">
          <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhuma nota fiscal</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Clique em "Nova Nota" para importar seus arquivos XML ou PDF.
          </p>
        </Card>
      ) : (
        <>
          {/* --- MOBILE LIST (Cards) --- */}
          <div className="grid gap-4 md:hidden">
            {notas.map((nota) => (
              <Card key={nota.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 max-w-[85%]">
                      <div
                        className={`p-2 rounded-lg ${
                          nota.xmlContent
                            ? "bg-blue-100 dark:bg-blue-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}
                      >
                        {nota.xmlContent ? (
                          <FileCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {nota.emitente || "Documento sem nome"}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          Nº {nota.numero || "S/N"}
                        </p>
                      </div>
                    </div>

                    {hasPermission("notas:excluir") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mr-2"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(nota.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mt-4 bg-muted/30 p-3 rounded-md">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Emissão
                      </span>
                      <span className="font-medium">
                        {nota.dataEmissao
                          ? new Date(nota.dataEmissao).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <DollarSign className="h-3 w-3" /> Valor
                      </span>
                      <span className="font-medium">
                        {formatCurrency(nota.valorTotal || 0)}
                      </span>
                    </div>
                  </div>

                  {nota.eventoId && (
                    <div className="mt-3 pt-3 border-t">
                      <Badge
                        variant="outline"
                        className="w-full justify-center bg-background/50"
                      >
                        Vinculado a uma perda
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* --- DESKTOP TABLE --- */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Emitente</TableHead>
                  <TableHead>Número / Série</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Upload em</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((nota) => (
                  <TableRow key={nota.id}>
                    <TableCell>
                      {nota.xmlContent ? (
                        <div title="XML">
                          <FileCode className="h-5 w-5 text-blue-500" />
                        </div>
                      ) : (
                        <div title="PDF">
                          <FileIcon className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col max-w-xs">
                        <span className="truncate">{nota.emitente}</span>
                        {nota.cnpjEmitente && (
                          <span className="text-xs text-muted-foreground">
                            {nota.cnpjEmitente}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {nota.numero ? `${nota.numero} / ${nota.serie}` : "-"}
                    </TableCell>
                    <TableCell>
                      {nota.dataEmissao
                        ? new Date(nota.dataEmissao).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(nota.dataUpload).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(nota.valorTotal || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasPermission("notas:excluir") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(nota.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
