"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { StorageService } from "@/lib/storage";
import { NotaFiscal, Evento } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/notas/upload-zone";

export default function NotasFiscaisPage() {
  const { user, hasPermission } = useAuth();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Estados de controle
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState<string | null>(null);

  // Estados do formulário
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Partial<NotaFiscal>>({});
  const [selectedEventoId, setSelectedEventoId] = useState<string>("none");

  // Carregar dados
  useEffect(() => {
    setNotas(StorageService.getNotasFiscais());
    setEventos(
      StorageService.getEventos().filter((e) => e.status !== "rascunho"),
    );
  }, []);

  const handleFilesSelected = (
    xml: File | null,
    pdf: File | null,
    data: Partial<NotaFiscal>,
  ) => {
    setXmlFile(xml);
    setPdfFile(pdf);
    // Preserva dados anteriores se o novo parse vier vazio (caso só tenha adicionado PDF depois)
    setParsedData((prev) => ({ ...prev, ...data }));
  };

  const handleSave = () => {
    if ((!xmlFile && !pdfFile) || !user) return;

    setIsUploading(true);

    setTimeout(() => {
      const novaNota: NotaFiscal = {
        id: Math.random().toString(36).substr(2, 9),
        dataUpload: new Date().toISOString(),
        uploadedBy: user,

        // Salva URL temporária para o PDF (em prod seria upload S3/Blob)
        pdfUrl: pdfFile ? URL.createObjectURL(pdfFile) : undefined,

        // Salva conteúdo do XML se existir
        xmlContent: parsedData.xmlContent,

        // Dados extraídos ou fallback
        emitente:
          parsedData.emitente || xmlFile?.name || pdfFile?.name || "Documento",
        numero: parsedData.numero,
        serie: parsedData.serie,
        dataEmissao: parsedData.dataEmissao,
        valorTotal: parsedData.valorTotal,
        cnpjEmitente: parsedData.cnpjEmitente,
        chaveAcesso: parsedData.chaveAcesso,
        naturezaOperacao: parsedData.naturezaOperacao,

        eventoId: selectedEventoId !== "none" ? selectedEventoId : undefined,
      };

      StorageService.saveNotaFiscal(novaNota);
      setNotas(StorageService.getNotasFiscais());

      // Reset total
      setIsUploadOpen(false);
      setIsUploading(false);
      setXmlFile(null);
      setPdfFile(null);
      setParsedData({});
      setSelectedEventoId("none");
      toast.success("Nota fiscal salva com sucesso!");
    }, 1000);
  };

  const confirmDelete = () => {
    if (notaToDelete) {
      StorageService.deleteNotaFiscal(notaToDelete);
      setNotas(StorageService.getNotasFiscais());
      setNotaToDelete(null);
      toast.success("Nota excluída.");
    }
  };

  // Função para "baixar" arquivos (simulação com Blob)
  const downloadFile = (
    content: string | undefined,
    filename: string,
    type: string,
  ) => {
    if (!content) return;

    // Se for URL de PDF (blob:)
    if (type === "pdf" && content.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = content;
      link.download = filename;
      link.click();
      return;
    }

    // Se for conteúdo XML texto
    const blob = new Blob([content], {
      type: type === "xml" ? "text/xml" : "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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
                <DialogTitle>Upload de Documentos</DialogTitle>
                <DialogDescription>
                  Arraste XML e PDF juntos ou selecione individualmente.
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                <UploadZone
                  onFilesSelected={handleFilesSelected}
                  isUploading={isUploading}
                />
              </div>

              {(xmlFile || pdfFile) && (
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
                <Button
                  onClick={handleSave}
                  disabled={(!xmlFile && !pdfFile) || isUploading}
                >
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
                    <div className="flex items-center gap-2 max-w-[80%]">
                      <div
                        className={`p-2 rounded-lg ${
                          nota.xmlContent && nota.pdfUrl
                            ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            : nota.xmlContent
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {nota.xmlContent && nota.pdfUrl ? (
                          <FileText className="h-5 w-5" />
                        ) : nota.xmlContent ? (
                          <FileCode className="h-5 w-5" />
                        ) : (
                          <FileIcon className="h-5 w-5" />
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
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        {nota.xmlContent && (
                          <DropdownMenuItem
                            onClick={() =>
                              downloadFile(
                                nota.xmlContent,
                                `nota-${nota.numero || "xml"}.xml`,
                                "xml",
                              )
                            }
                          >
                            <FileCode className="mr-2 h-4 w-4" /> Baixar XML
                          </DropdownMenuItem>
                        )}
                        {nota.pdfUrl && (
                          <DropdownMenuItem
                            onClick={() =>
                              downloadFile(
                                nota.pdfUrl,
                                `nota-${nota.numero || "doc"}.pdf`,
                                "pdf",
                              )
                            }
                          >
                            <FileIcon className="mr-2 h-4 w-4" /> Baixar PDF
                          </DropdownMenuItem>
                        )}
                        {hasPermission("notas:excluir") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setNotaToDelete(nota.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                  <TableHead className="w-16 text-center">Tipo</TableHead>
                  <TableHead>Emitente</TableHead>
                  <TableHead>Número / Série</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Arquivos</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((nota) => (
                  <TableRow key={nota.id}>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        {nota.xmlContent && (
                          <div title="Possui XML" className="text-blue-500">
                            <FileCode className="h-5 w-5" />
                          </div>
                        )}
                        {nota.pdfUrl && (
                          <div title="Possui PDF" className="text-red-500">
                            <FileIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
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
                    <TableCell className="text-right font-medium">
                      {formatCurrency(nota.valorTotal || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {nota.xmlContent && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              downloadFile(
                                nota.xmlContent,
                                `nota-${nota.numero}.xml`,
                                "xml",
                              )
                            }
                          >
                            XML
                          </Button>
                        )}
                        {nota.pdfUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              downloadFile(
                                nota.pdfUrl,
                                `nota-${nota.numero}.pdf`,
                                "pdf",
                              )
                            }
                          >
                            PDF
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {hasPermission("notas:excluir") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setNotaToDelete(nota.id)}
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

      {/* Alerta de Exclusão */}
      <AlertDialog
        open={!!notaToDelete}
        onOpenChange={() => setNotaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              nota fiscal e seus arquivos anexados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
