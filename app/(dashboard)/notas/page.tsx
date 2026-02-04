"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { StorageService } from "@/lib/storage";
import { NotaFiscal, Evento } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
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
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/notas/upload-zone";
import { cn } from "@/lib/utils";

export default function NotasFiscaisPage() {
  const { user, hasPermission } = useAuth();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  // Estados de controle e UI
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState<string | null>(null);

  // Controle de Upload Rápido (Adicionar arquivo faltante)
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
    setNotas(StorageService.getNotasFiscais());
    setEventos(
      StorageService.getEventos().filter((e) => e.status !== "rascunho"),
    );
  }, []);

  // --- LÓGICA DE UPLOAD RÁPIDO (Adicionar Faltante) ---

  const handleQuickUploadClick = (id: string, type: "xml" | "pdf") => {
    setQuickUploadTarget({ id, type });
    if (quickUploadInputRef.current) {
      // Limpa o valor anterior para permitir selecionar o mesmo arquivo se necessário
      quickUploadInputRef.current.value = "";
      // Define o tipo aceito
      quickUploadInputRef.current.accept = type === "xml" ? ".xml" : ".pdf";
      // Abre a janela de seleção
      quickUploadInputRef.current.click();
    }
  };

  const processQuickUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadTarget || !user) return;

    const notaIndex = notas.findIndex((n) => n.id === quickUploadTarget.id);
    if (notaIndex === -1) return;

    const notaAtual = notas[notaIndex];
    let notaAtualizada = { ...notaAtual };

    toast.promise(
      new Promise<void>((resolve, reject) => {
        // Se for PDF
        if (quickUploadTarget.type === "pdf") {
          if (file.type !== "application/pdf") {
            reject("Arquivo deve ser um PDF");
            return;
          }
          notaAtualizada.pdfUrl = URL.createObjectURL(file);
          resolve();
        }
        // Se for XML
        else {
          if (file.type !== "text/xml" && !file.name.endsWith(".xml")) {
            reject("Arquivo deve ser um XML");
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const text = event.target?.result as string;
              // Parse simples para enriquecer dados se estiverem faltando
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(text, "text/xml");

              // Extração segura
              const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
              const ide = xmlDoc.getElementsByTagName("ide")[0];
              const emit = xmlDoc.getElementsByTagName("emit")[0];
              const total = xmlDoc.getElementsByTagName("total")[0];

              notaAtualizada.xmlContent = text;

              // Só sobrescreve se o dado atual for genérico ou vazio
              if (!notaAtualizada.chaveAcesso)
                notaAtualizada.chaveAcesso =
                  infNFe?.getAttribute("Id")?.replace("NFe", "") || "";
              if (!notaAtualizada.numero)
                notaAtualizada.numero =
                  ide?.getElementsByTagName("nNF")[0]?.textContent || "";
              if (!notaAtualizada.serie)
                notaAtualizada.serie =
                  ide?.getElementsByTagName("serie")[0]?.textContent || "";
              if (!notaAtualizada.dataEmissao)
                notaAtualizada.dataEmissao =
                  ide?.getElementsByTagName("dhEmi")[0]?.textContent ||
                  ide?.getElementsByTagName("dEmi")[0]?.textContent ||
                  "";

              // O emitente do XML geralmente é mais preciso que o nome do arquivo PDF
              const emitenteXml =
                emit?.getElementsByTagName("xNome")[0]?.textContent;
              if (emitenteXml) notaAtualizada.emitente = emitenteXml;

              if (!notaAtualizada.cnpjEmitente)
                notaAtualizada.cnpjEmitente =
                  emit?.getElementsByTagName("CNPJ")[0]?.textContent || "";

              const val = parseFloat(
                total?.getElementsByTagName("vNF")[0]?.textContent || "0",
              );
              if (val > 0) notaAtualizada.valorTotal = val;

              resolve();
            } catch (err) {
              reject("Erro ao ler XML");
            }
          };
          reader.readAsText(file);
        }
      }).then(() => {
        // Salvar atualização
        StorageService.saveNotaFiscal(notaAtualizada);
        setNotas(StorageService.getNotasFiscais());
        setQuickUploadTarget(null);
      }),
      {
        loading: "Processando arquivo...",
        success: "Arquivo anexado com sucesso!",
        error: (err) => `Erro: ${err}`,
      },
    );
  };

  // --- LÓGICA PADRÃO DA PÁGINA ---

  const filteredNotas = useMemo(() => {
    let result = notas.filter((nota) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        nota.emitente?.toLowerCase().includes(searchLower) ||
        nota.numero?.includes(searchLower) ||
        nota.cnpjEmitente?.includes(searchLower)
      );
    });

    result.sort((a, b) => {
      if (orderBy === "date_desc") {
        return (
          new Date(b.dataEmissao || b.dataUpload).getTime() -
          new Date(a.dataEmissao || a.dataUpload).getTime()
        );
      }
      if (orderBy === "date_asc") {
        return (
          new Date(a.dataEmissao || a.dataUpload).getTime() -
          new Date(b.dataEmissao || b.dataUpload).getTime()
        );
      }
      if (orderBy === "val_desc") {
        return (b.valorTotal || 0) - (a.valorTotal || 0);
      }
      if (orderBy === "val_asc") {
        return (a.valorTotal || 0) - (b.valorTotal || 0);
      }
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

  const handleSave = () => {
    if ((!xmlFile && !pdfFile) || !user) return;

    setIsUploading(true);

    setTimeout(() => {
      const novaNota: NotaFiscal = {
        id: Math.random().toString(36).substr(2, 9),
        dataUpload: new Date().toISOString(),
        uploadedBy: user,
        pdfUrl: pdfFile ? URL.createObjectURL(pdfFile) : undefined,
        xmlContent: parsedData.xmlContent,
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

      setIsUploadOpen(false);
      setIsUploading(false);
      setXmlFile(null);
      setPdfFile(null);
      setParsedData({});
      setSelectedEventoId("none");
      toast.success("Nota salva com sucesso!");
    }, 800);
  };

  const confirmDelete = () => {
    if (notaToDelete) {
      StorageService.deleteNotaFiscal(notaToDelete);
      setNotas(StorageService.getNotasFiscais());
      setNotaToDelete(null);
      toast.success("Nota excluída.");
    }
  };

  const downloadFile = (
    content: string | undefined,
    filename: string,
    type: string,
  ) => {
    if (!content) return;

    if (type === "pdf" && content.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = content;
      link.download = filename;
      link.click();
      return;
    }

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
                    {isUploading ? "Salvando..." : "Salvar Nota"}
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

      {/* Lista Vazia */}
      {notas.length === 0 ? (
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
                            nota.xmlContent
                              ? downloadFile(
                                  nota.xmlContent,
                                  `nota-${nota.numero}.xml`,
                                  "xml",
                                )
                              : handleQuickUploadClick(nota.id, "xml")
                          }
                          className={cn(
                            "p-2 rounded-lg cursor-pointer transition-colors",
                            nota.xmlContent
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
                                  "pdf",
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
                        {/* Botão XML: Baixar ou Importar */}
                        <Button
                          variant={nota.xmlContent ? "secondary" : "outline"}
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            nota.xmlContent
                              ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                              : "text-muted-foreground border-dashed hover:border-blue-400 hover:text-blue-500",
                          )}
                          title={
                            nota.xmlContent
                              ? "Baixar XML"
                              : "Importar XML Faltante"
                          }
                          onClick={() =>
                            nota.xmlContent
                              ? downloadFile(
                                  nota.xmlContent,
                                  `nota-${nota.numero}.xml`,
                                  "xml",
                                )
                              : handleQuickUploadClick(nota.id, "xml")
                          }
                        >
                          {nota.xmlContent ? (
                            <Download className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          <span className="sr-only">XML</span>
                        </Button>

                        {/* Botão PDF: Baixar ou Importar */}
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
                                  "pdf",
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
              Esta ação removerá permanentemente o registro da nota e todos os
              arquivos anexados (XML/PDF).
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
