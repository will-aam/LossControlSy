"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { NotaFiscal, Evento } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
// Actions
import { getPresignedUploadUrl } from "@/app/actions/storage";
import { getNotas, createNota, deleteNota } from "@/app/actions/notas";
import { getEventos } from "@/app/actions/eventos";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  AlertCircle,
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { UploadZone } from "@/components/notas/upload-zone";
import { cn } from "@/lib/utils";

export default function NotasFiscaisPage() {
  const { user, hasPermission } = useAuth();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de controle e UI
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState<string | null>(null);

  // Controle de Upload Rápido
  const quickUploadInputRef = useRef<HTMLInputElement>(null);
  const [quickUploadTarget, setQuickUploadTarget] = useState<{
    id: string;
    type: "xml" | "pdf";
  } | null>(null);

  // Filtros e Paginação
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados do formulário de upload (Nova Nota)
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Partial<NotaFiscal>>({});
  const [selectedEventoId, setSelectedEventoId] = useState<string>("none");

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    // Carrega Notas
    const notasResult = await getNotas();
    if (notasResult.success && notasResult.data) {
      // Mapeamento manual para garantir compatibilidade
      const mappedNotas: NotaFiscal[] = (notasResult.data as any[]).map(
        (n) => ({
          id: n.id,
          dataUpload: n.dataUpload, // string ISO ou Date
          uploadedBy: n.uploadedBy,
          emitente: n.emitente,
          numero: n.numero,
          serie: n.serie,
          valorTotal: Number(n.valorTotal),
          dataEmissao: n.dataEmissao,
          cnpjEmitente: n.cnpjEmitente,
          chaveAcesso: n.chaveAcesso,
          xmlContent: n.xmlContent,
          pdfUrl: n.pdfUrl,
          xmlUrl: n.xmlUrl,
        }),
      );
      setNotas(mappedNotas);
    }

    // Carrega Eventos (para vincular)
    const eventosResult = await getEventos();
    if (eventosResult.success && eventosResult.data) {
      // Filtra apenas eventos não rascunho
      const validEventos = (eventosResult.data as any[]).filter(
        (e) => e.status !== "rascunho",
      );
      setEventos(validEventos);
    }
    setIsLoading(false);
  };

  // --- FUNÇÃO DE UPLOAD PARA O R2 ---
  const uploadToCloud = async (file: File) => {
    // 1. Pede ao servidor uma URL assinada
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
      file.name,
      file.type,
    );

    // 2. Envia o arquivo direto para o Cloudflare R2
    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    return publicUrl;
  };

  // --- LÓGICA DE UPLOAD RÁPIDO (Adicionar Faltante) ---
  const handleQuickUploadClick = (id: string, type: "xml" | "pdf") => {
    setQuickUploadTarget({ id, type });
    if (quickUploadInputRef.current) {
      quickUploadInputRef.current.value = "";
      quickUploadInputRef.current.accept = type === "xml" ? ".xml" : ".pdf";
      quickUploadInputRef.current.click();
    }
  };

  const processQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadTarget || !user) return;

    // TODO: Implementar atualização parcial (updateNota) no backend para suportar isso
    // Por enquanto, apenas feedback visual que a função está em desenvolvimento
    toast.info(
      "Upload rápido em desenvolvimento (Backend). Use o botão 'Nova Nota' por enquanto.",
    );

    if (quickUploadInputRef.current) {
      quickUploadInputRef.current.value = "";
    }
    setQuickUploadTarget(null);
  };

  // --- LÓGICA PADRÃO DA PÁGINA ---

  const filteredNotas = useMemo(() => {
    let result = notas.filter((nota) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (nota.emitente || "").toLowerCase().includes(searchLower) ||
        (nota.numero || "").includes(searchLower) ||
        (nota.cnpjEmitente || "").includes(searchLower)
      );
    });

    result.sort((a, b) => {
      const dateA = new Date(a.dataEmissao || a.dataUpload).getTime();
      const dateB = new Date(b.dataEmissao || b.dataUpload).getTime();

      if (orderBy === "date_desc") return dateB - dateA;
      if (orderBy === "date_asc") return dateA - dateB;
      if (orderBy === "val_desc")
        return (b.valorTotal || 0) - (a.valorTotal || 0);
      if (orderBy === "val_asc")
        return (a.valorTotal || 0) - (b.valorTotal || 0);
      return 0;
    });

    return result;
  }, [notas, searchTerm, orderBy]);

  const totalPages = Math.ceil(filteredNotas.length / itemsPerPage);
  const currentNotas = filteredNotas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleFilesSelected = (
    xml: File | null,
    pdf: File | null,
    data: Partial<NotaFiscal>,
  ) => {
    setXmlFile(xml);
    setPdfFile(pdf);
    setParsedData((prev) => ({ ...prev, ...data }));
  };

  const handleSave = async () => {
    if ((!xmlFile && !pdfFile) || !user) return;

    setIsUploading(true);
    toast.info("Enviando arquivos...");

    try {
      let uploadedPdfUrl = undefined;
      let uploadedXmlUrl = undefined;
      let xmlTextContent = undefined;

      // Upload PDF
      if (pdfFile) {
        uploadedPdfUrl = await uploadToCloud(pdfFile);
      }

      // Upload XML
      if (xmlFile) {
        uploadedXmlUrl = await uploadToCloud(xmlFile);
        xmlTextContent = await xmlFile.text(); // Lê o texto para salvar no banco
      }

      const result = await createNota({
        fileName: xmlFile?.name || pdfFile?.name || "Nota Fiscal",
        numero: parsedData.numero,
        serie: parsedData.serie,
        emitente: parsedData.emitente,
        cnpjEmitente: parsedData.cnpjEmitente,
        valorTotal: parsedData.valorTotal,
        dataEmissao: parsedData.dataEmissao
          ? new Date(parsedData.dataEmissao)
          : undefined,
        chaveAcesso: parsedData.chaveAcesso,

        xmlContent: xmlTextContent,
        pdfUrl: uploadedPdfUrl,
        xmlUrl: uploadedXmlUrl,

        eventoId: selectedEventoId !== "none" ? selectedEventoId : undefined,
      });

      if (result.success) {
        toast.success("Nota salva com sucesso!");
        loadData();
        setIsUploadOpen(false);
        setXmlFile(null);
        setPdfFile(null);
        setParsedData({});
        setSelectedEventoId("none");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivos.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (notaToDelete) {
      const result = await deleteNota(notaToDelete);
      if (result.success) {
        toast.success("Nota excluída.");
        loadData();
      } else {
        toast.error(result.message);
      }
      setNotaToDelete(null);
    }
  };

  const downloadFile = (urlOrContent: string | undefined, filename: string) => {
    if (!urlOrContent) return;

    let href = urlOrContent;

    // Se não for URL (não começa com http/https), assume que é conteúdo XML texto
    if (!urlOrContent.startsWith("http")) {
      const blob = new Blob([urlOrContent], { type: "text/xml" });
      href = URL.createObjectURL(blob);
    }

    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!hasPermission("notas:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Input invisível para upload rápido */}
      <input
        type="file"
        ref={quickUploadInputRef}
        className="hidden"
        onChange={processQuickUpload}
      />

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Notas Fiscais
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus documentos (XML e PDF)
            </p>
          </div>

          {hasPermission("notas:upload") && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Nova Nota
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Upload de Documentos</DialogTitle>
                  <DialogDescription>
                    Arraste XML e PDF juntos ou adicione separadamente.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-4">
                  <UploadZone
                    onFilesSelected={handleFilesSelected}
                    isUploading={isUploading}
                  />

                  {(xmlFile || pdfFile) && (
                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                      <Label htmlFor="evento">
                        Vincular a Perda (Opcional)
                      </Label>
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
                              {evt.item?.nome || "Item"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
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
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Salvando...
                      </>
                    ) : (
                      "Salvar Nota"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 items-center bg-muted/40 p-3 rounded-lg border">
          <div className="relative w-full sm:w-auto sm:flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por emitente, número..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={orderBy} onValueChange={setOrderBy}>
              <SelectTrigger className="w-full sm:w-45 bg-background">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Mais recentes</SelectItem>
                <SelectItem value="date_asc">Mais antigas</SelectItem>
                <SelectItem value="val_desc">Maior Valor</SelectItem>
                <SelectItem value="val_asc">Menor Valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center min-h-72 border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhuma nota fiscal</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Clique em "Nova Nota" para importar seus arquivos XML ou PDF.
          </p>
        </Card>
      ) : filteredNotas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma nota encontrada com os filtros atuais.
        </div>
      ) : (
        <>
          {/* --- MOBILE LIST (Cards) --- */}
          <div className="grid gap-3 md:hidden">
            {currentNotas.map((nota) => (
              <Card key={nota.id} className="overflow-hidden shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 max-w-[80%]">
                      <div className="flex gap-1">
                        {/* Ícones de Status Mobile */}
                        <div
                          onClick={() =>
                            nota.xmlUrl || nota.xmlContent
                              ? downloadFile(
                                  nota.xmlUrl || nota.xmlContent,
                                  `nota-${nota.numero}.xml`,
                                )
                              : handleQuickUploadClick(nota.id, "xml")
                          }
                          className={cn(
                            "p-2 rounded-lg cursor-pointer transition-colors",
                            nota.xmlUrl || nota.xmlContent
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-muted text-muted-foreground border border-dashed border-muted-foreground/30 hover:bg-muted/80",
                          )}
                        >
                          <FileCode className="h-4 w-4" />
                        </div>
                        <div
                          onClick={() =>
                            nota.pdfUrl
                              ? downloadFile(
                                  nota.pdfUrl,
                                  `nota-${nota.numero}.pdf`,
                                )
                              : handleQuickUploadClick(nota.id, "pdf")
                          }
                          className={cn(
                            "p-2 rounded-lg cursor-pointer transition-colors",
                            nota.pdfUrl
                              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-muted text-muted-foreground border border-dashed border-muted-foreground/30 hover:bg-muted/80",
                          )}
                        >
                          <FileIcon className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate leading-tight">
                          {nota.emitente || "Sem Nome"}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
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
                        {hasPermission("notas:excluir") && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setNotaToDelete(nota.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t bg-muted/20 -mx-4 px-4 pb-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Emissão
                      </span>
                      <span className="font-medium">
                        {nota.dataEmissao
                          ? new Date(nota.dataEmissao).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Valor Total
                      </span>
                      <span className="font-bold text-base">
                        {formatCurrency(nota.valorTotal || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* --- DESKTOP TABLE --- */}
          <div className="hidden md:block border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32 text-center">Arquivos</TableHead>
                  <TableHead>Emitente</TableHead>
                  <TableHead>Número / Série</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-8 px-2 -ml-2 hover:bg-transparent"
                      onClick={() =>
                        setOrderBy(
                          orderBy === "date_asc" ? "date_desc" : "date_asc",
                        )
                      }
                    >
                      Emissão <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      className="h-8 px-2 hover:bg-transparent"
                      onClick={() =>
                        setOrderBy(
                          orderBy === "val_asc" ? "val_desc" : "val_asc",
                        )
                      }
                    >
                      Valor <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentNotas.map((nota) => (
                  <TableRow key={nota.id}>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        {/* Botão XML */}
                        <Button
                          variant={
                            nota.xmlUrl || nota.xmlContent
                              ? "secondary"
                              : "outline"
                          }
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            nota.xmlUrl || nota.xmlContent
                              ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                              : "text-muted-foreground border-dashed hover:border-blue-400 hover:text-blue-500",
                          )}
                          title={
                            nota.xmlUrl || nota.xmlContent
                              ? "Baixar XML"
                              : "Importar XML Faltante"
                          }
                          onClick={() =>
                            nota.xmlUrl || nota.xmlContent
                              ? downloadFile(
                                  nota.xmlUrl || nota.xmlContent,
                                  `nota-${nota.numero}.xml`,
                                )
                              : handleQuickUploadClick(nota.id, "xml")
                          }
                        >
                          {nota.xmlUrl || nota.xmlContent ? (
                            <Download className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          <span className="sr-only">XML</span>
                        </Button>

                        {/* Botão PDF */}
                        <Button
                          variant={nota.pdfUrl ? "secondary" : "outline"}
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            nota.pdfUrl
                              ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                              : "text-muted-foreground border-dashed hover:border-red-400 hover:text-red-500",
                          )}
                          title={
                            nota.pdfUrl ? "Baixar PDF" : "Importar PDF Faltante"
                          }
                          onClick={() =>
                            nota.pdfUrl
                              ? downloadFile(
                                  nota.pdfUrl,
                                  `nota-${nota.numero}.pdf`,
                                )
                              : handleQuickUploadClick(nota.id, "pdf")
                          }
                        >
                          {nota.pdfUrl ? (
                            <FileIcon className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          <span className="sr-only">PDF</span>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col max-w-xs">
                        <span className="truncate" title={nota.emitente}>
                          {nota.emitente}
                        </span>
                        {nota.cnpjEmitente && (
                          <span className="text-xs text-muted-foreground truncate">
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="text-sm font-medium">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Alerta de Exclusão */}
      <AlertDialog
        open={!!notaToDelete}
        onOpenChange={() => setNotaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Nota Fiscal</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente o registro da nota.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
