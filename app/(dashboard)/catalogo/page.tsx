"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
} from "@/components/ui/dropdown-menu";
import { Item, categorias, formatCurrency } from "@/lib/mock-data";
import { parseItemsCSV } from "@/lib/csv-parser";
import { useAuth } from "@/lib/auth-context";
import { ItemFormDialog } from "@/components/catalogo/item-form-dialog";
import { StorageService } from "@/lib/storage"; // <-- Importar
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
} from "lucide-react";
import { toast } from "sonner";

// Apenas Lista agora, paginação fixa
const ITEMS_PER_PAGE = 15;

const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function CatalogoPage() {
  const { hasPermission } = useAuth();

  // Estado de Dados (Começa vazio)
  const [items, setItems] = useState<Item[]>([]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "ativo" | "inativo"
  >("ativo");

  // Controle do Modal
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CARREGAR DADOS DO STORAGE ---
  useEffect(() => {
    setItems(StorageService.getItems());
  }, []);

  // --- LÓGICA DE FILTRAGEM ---
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

  // --- LÓGICA DE PAGINAÇÃO ---
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  // --- STATS ---
  const stats = useMemo(
    () => ({
      total: items.length,
      ativos: items.filter((i) => i.status === "ativo").length,
      inativos: items.filter((i) => i.status === "inativo").length,
      categorias: new Set(items.map((i) => i.categoria)).size,
    }),
    [items],
  );

  // --- AÇÕES ---
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const newItems = await parseItemsCSV(file);
      if (newItems.length > 0) {
        // Salva cada item novo no Storage
        newItems.forEach((item) => StorageService.saveItem(item));

        // Atualiza estado local
        setItems(StorageService.getItems());

        toast.success(`${newItems.length} itens importados!`);
      } else {
        toast.warning("Arquivo inválido ou vazio.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro na importação.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Função chamada quando o modal salva (Novo ou Edição)
  const handleSaveItem = (itemData: Partial<Item>) => {
    if (editingItem) {
      // Editar existente
      const updatedItem = { ...editingItem, ...itemData } as Item;

      // Salva no Storage
      StorageService.saveItem(updatedItem);
      setItems(StorageService.getItems());

      toast.success("Item atualizado!");
    } else {
      // Criar novo
      const newItem: Item = {
        id: Math.random().toString(36).substr(2, 9),
        ...itemData,
      } as Item;

      // Salva no Storage
      StorageService.saveItem(newItem);
      setItems(StorageService.getItems());

      toast.success("Item criado com sucesso!");
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
      {/* Header */}
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
          {hasPermission("catalogo:criar") && (
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
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? "Importando..." : "Importar CSV"}
              </Button>
              <Button onClick={() => setShowNewItemDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Filters */}
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
              {categorias.map((cat) => (
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

      {/* TABLE AREA (Scroll Interno) */}
      <div className="flex-1 overflow-hidden border rounded-md relative bg-card shadow-sm">
        <div className="absolute inset-0 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[40%]">Item</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Venda</TableHead>
                <TableHead className="w-25 text-center">Status</TableHead>
                <TableHead className="w-12.5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length > 0 ? (
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
                    <TableCell className="py-2 text-right text-xs text-muted-foreground">
                      {formatCurrency(item.custo)}
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
                      {hasPermission("catalogo:editar") && (
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
                            <DropdownMenuItem
                              onClick={() => setEditingItem(item)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
          </Table>
        </div>
      </div>

      {/* Pagination (Fixo no Rodapé) */}
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

      {/* Modal - AGORA UM COMPONENTE SEPARADO */}
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
    </div>
  );
}
