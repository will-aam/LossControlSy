"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

// Tipos e Utils
import { Item } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { parseItemsCSV } from "@/lib/csv-parser"; // <--- Importei o parser

// Novos Actions e Componentes
import {
  getItens,
  deleteItem,
  toggleItemStatus,
  createItem,
  updateItem,
  importarItens, // <--- Importei a nova action (criaremos no próximo passo)
  CreateItemData,
} from "@/app/actions/catalogo";
import { getCategorias } from "@/app/actions/categorias";
import { ItemFormDialog } from "@/components/catalogo/item-form-dialog";

import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Package,
  Upload,
  AlertTriangle,
  Barcode,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Trash2,
  Power,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 15;

const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function CatalogoPage() {
  const { hasPermission } = useAuth();

  // Estados de Dados
  const [items, setItems] = useState<Item[]>([]);
  const [categoriasList, setCategoriasList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filtro
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "ativo" | "inativo"
  >("ativo");

  // Estados de Ação
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Importação
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega Itens e Categorias ao iniciar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    // 1. Busca Categorias
    const catResult = await getCategorias();
    if (catResult.success && catResult.data) {
      setCategoriasList(catResult.data.map((c: any) => c.nome));
    }

    // 2. Busca Itens
    const itemResult = await getItens();
    if (itemResult.success) {
      const mappedItems: Item[] = (itemResult.data as any[]).map((i) => ({
        id: i.id,
        nome: i.nome,
        codigoBarras: i.codigoBarras || "",
        codigoInterno: i.codigoInterno || "",
        categoria: i.categoria?.nome || "Sem Categoria",
        unidade: i.unidade,
        custo: Number(i.custo) || 0,
        precoVenda: Number(i.precoVenda),
        status: i.status as "ativo" | "inativo",
        imagemUrl: i.imagemUrl,
      }));
      setItems(mappedItems);
    } else {
      toast.error("Erro ao carregar itens do catálogo.");
    }

    setIsLoading(false);
  };

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (statusFilter !== "todos") {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }
    if (categoriaFilter !== "todas") {
      filtered = filtered.filter((i) => i.categoria === categoriaFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.nome.toLowerCase().includes(query) ||
          i.codigoInterno.toLowerCase().includes(query) ||
          (i.codigoBarras && i.codigoBarras.includes(query)),
      );
    }
    return filtered;
  }, [items, statusFilter, categoriaFilter, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const stats = useMemo(
    () => ({
      total: items.length,
      ativos: items.filter((i) => i.status === "ativo").length,
      inativos: items.filter((i) => i.status === "inativo").length,
      categorias: new Set(items.map((i) => i.categoria)).size,
    }),
    [items],
  );

  // --- FUNÇÃO DE IMPORTAÇÃO ATUALIZADA ---
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast.info("Lendo arquivo CSV...");

    try {
      // 1. Processa o CSV no Front-end (usando seu parser)
      const parsedItems = await parseItemsCSV(file);

      if (parsedItems.length === 0) {
        toast.warning("O arquivo parece estar vazio ou inválido.");
        setIsImporting(false);
        return;
      }

      toast.loading(`Importando ${parsedItems.length} itens para o banco...`);

      // 2. Envia para o Back-end (Server Action)
      const result = await importarItens(parsedItems);

      if (result.success) {
        toast.dismiss(); // Remove o loading
        toast.success(
          `${result.count} itens importados/atualizados com sucesso!`,
        );
        loadData(); // Recarrega a tabela
      } else {
        toast.dismiss();
        toast.error(result.message || "Erro ao importar itens.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar o arquivo.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveItem = async (itemData: Partial<Item>) => {
    const catResult = await getCategorias();
    const categoriaEncontrada = catResult.data?.find(
      (c: any) => c.nome === itemData.categoria,
    );

    if (!categoriaEncontrada) {
      toast.error("Categoria inválida. Selecione uma categoria existente.");
      return;
    }

    const payload: CreateItemData = {
      nome: itemData.nome || "",
      codigoBarras: itemData.codigoBarras,
      codigoInterno: itemData.codigoInterno,
      unidade: itemData.unidade || "UN",
      preco: itemData.precoVenda || 0,
      custo: itemData.custo || 0,
      categoriaId: categoriaEncontrada.id,
      fotoUrl: itemData.imagemUrl,
    };

    if (editingItem) {
      const result = await updateItem(editingItem.id, payload);
      if (result.success) {
        toast.success("Item atualizado!");
        loadData();
      } else {
        toast.error(result.message);
      }
    } else {
      const result = await createItem(payload);
      if (result.success) {
        toast.success("Item criado com sucesso!");
        loadData();
      } else {
        toast.error(result.message);
      }
    }

    setShowNewItemDialog(false);
    setEditingItem(null);
  };

  const handleToggleStatus = async (item: Item) => {
    const result = await toggleItemStatus(item.id);

    if (result.success) {
      toast.success(`Status do item alterado.`);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const result = await deleteItem(itemToDelete);

      if (result.success) {
        toast.success("Item removido com sucesso");
        setItemToDelete(null);
        loadData();
      } else {
        toast.error(result.message);
      }
    }
  };

  if (!hasPermission("catalogo:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-[calc(100vh-2rem)] space-y-4 overflow-hidden ${hideScrollClass}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Catálogo de Itens
          </h1>
          <p className="text-muted-foreground">
            Gerencie os produtos disponíveis
          </p>
        </div>
        <div className="flex gap-2">
          {/* BOTÃO IMPORTAR */}
          {hasPermission("catalogo:importar") && (
            <>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isImporting ? "Importando..." : "Importar CSV"}
              </Button>
            </>
          )}

          {/* BOTÃO NOVO ITEM */}
          {hasPermission("catalogo:criar") && (
            <Button onClick={() => setShowNewItemDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Item
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 shrink-0">
        <div className="border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">
              Total
            </p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <Package className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">
              Ativos
            </p>
            <p className="text-xl font-bold text-success">{stats.ativos}</p>
          </div>
          <Eye className="h-5 w-5 text-success/50" />
        </div>
        <div className="border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">
              Inativos
            </p>
            <p className="text-xl font-bold text-muted-foreground">
              {stats.inativos}
            </p>
          </div>
          <EyeOff className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="border rounded-lg p-3 bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">
              Categorias
            </p>
            <p className="text-xl font-bold">{stats.categorias}</p>
          </div>
          <Grid3X3 className="h-5 w-5 text-muted-foreground/50" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 bg-background/95 backdrop-blur z-10 py-1">
        <div className="flex flex-col gap-3 sm:flex-row flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={categoriaFilter}
            onValueChange={(v) => {
              setCategoriaFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {categoriasList.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as any);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border rounded-md relative bg-card shadow-sm">
        <div className="absolute inset-0 overflow-y-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 bg-card shadow-sm">
              <TableRow>
                <TableHead className="w-[40%] bg-card">Item</TableHead>
                <TableHead className="bg-card">Código</TableHead>
                <TableHead className="bg-card">Categoria</TableHead>
                <TableHead className="bg-card">Unidade</TableHead>
                <TableHead className="text-right bg-card">Preço</TableHead>
                <TableHead className="w-25 text-center bg-card">
                  Status
                </TableHead>
                <TableHead className="w-12.5 bg-card"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" /> Carregando
                      itens...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={item.status === "inativo" ? "opacity-60" : ""}
                  >
                    <TableCell className="py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0 border overflow-hidden">
                          {item.imagemUrl ? (
                            <img
                              src={item.imagemUrl}
                              className="h-full w-full object-cover"
                              alt={item.nome}
                            />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.nome}
                          </p>
                          {item.codigoBarras && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Barcode className="h-3 w-3" />{" "}
                              {item.codigoBarras}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 font-mono text-xs">
                      {item.codigoInterno}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {item.categoria}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {item.unidade}
                    </TableCell>
                    <TableCell className="py-2 text-right text-sm font-medium">
                      {formatCurrency(item.precoVenda)}
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Badge
                        variant={
                          item.status === "ativo" ? "outline" : "secondary"
                        }
                        className="text-[10px] h-5"
                      >
                        {item.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasPermission("catalogo:editar") && (
                            <DropdownMenuItem
                              onClick={() => setEditingItem(item)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}

                          {hasPermission("catalogo:status") && (
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(item)}
                            >
                              <Power className="mr-2 h-4 w-4" />
                              {item.status === "ativo" ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                          )}

                          {hasPermission("catalogo:excluir") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setItemToDelete(item.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        Nenhum item encontrado
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between shrink-0 pt-2 border-t mt-auto">
        <p className="text-xs text-muted-foreground">
          {paginatedItems.length} de {filteredItems.length} itens
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-xs font-medium px-2">
            Pág {currentPage} de {Math.max(1, totalPages)}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ItemFormDialog
        open={showNewItemDialog || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewItemDialog(false);
            setEditingItem(null);
          }
        }}
        item={editingItem}
        onSave={handleSaveItem}
      />

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação excluirá permanentemente o item do catálogo e não poderá
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
