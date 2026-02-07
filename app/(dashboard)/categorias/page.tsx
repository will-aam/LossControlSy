// app/(dashboard)/categorias/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
// REMOVIDO: import { StorageService } from "@/lib/storage";
// REMOVIDO: import { CategoriaData } from "@/lib/mock-data";
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from "@/app/actions/categorias"; // Importando as novas actions
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  Power,
  Tags,
  Loader2, // Adicionado ícone de carregamento
} from "lucide-react";
import { toast } from "sonner";

const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

// Definindo o tipo localmente para bater com o retorno do Prisma
type CategoriaData = {
  id: string;
  nome: string;
  status: "ativa" | "inativa";
  itemCount?: number; // Opcional pois o Prisma retorna via _count ou agregação
};

export default function CategoriasPage() {
  const { hasPermission } = useAuth();
  const [categorias, setCategorias] = useState<CategoriaData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Novo estado de carregamento

  // Estados para Dialog de Criar/Editar
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoriaData | null>(
    null,
  );
  const [formData, setFormData] = useState({ nome: "" });
  const [isSaving, setIsSaving] = useState(false); // Novo estado de salvamento

  // Estado para Exclusão
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await getCategorias();
    if (result.success) {
      // Mapeando para garantir o tipo correto
      const formattedData = (result.data as any[]).map((c) => ({
        id: c.id,
        nome: c.nome,
        status: c.status as "ativa" | "inativa",
        itemCount: 0, // Ajuste futuro: trazer contagem real do banco
      }));
      setCategorias(formattedData);
    } else {
      toast.error("Erro ao carregar categorias.");
    }
    setIsLoading(false);
  };

  const filteredCategorias = useMemo(() => {
    if (!searchQuery) return categorias;
    return categorias.filter((c) =>
      c.nome.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [categorias, searchQuery]);

  // --- Handlers ---

  const handleOpenDialog = (categoria?: CategoriaData) => {
    if (categoria) {
      setEditingCategory(categoria);
      setFormData({ nome: categoria.nome });
    } else {
      setEditingCategory(null);
      setFormData({ nome: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("O nome da categoria é obrigatório.");
      return;
    }

    setIsSaving(true);

    if (editingCategory) {
      // Editar (Via Server Action)
      const result = await updateCategoria(
        editingCategory.id,
        formData.nome.trim(),
      );

      if (result.success) {
        toast.success("Categoria atualizada!");
        setIsDialogOpen(false);
        loadData();
      } else {
        toast.error(result.message || "Erro ao atualizar.");
      }
    } else {
      // Criar (Via Server Action)
      const result = await createCategoria(formData.nome.trim());

      if (result.success) {
        toast.success("Categoria criada com sucesso!");
        setIsDialogOpen(false);
        loadData();
      } else {
        toast.error(result.message || "Erro ao criar.");
      }
    }

    setIsSaving(false);
  };

  const handleToggleStatus = async (categoria: CategoriaData) => {
    // Nota: Como não criamos uma action específica para "toggleStatus",
    // e o Prisma schema define status, vamos simular via updateCategoria se quisermos apenas mudar o nome,
    // mas se quisermos mudar o STATUS, precisaríamos de uma action updateStatus ou updateCategoria mais completa.
    // POR ENQUANTO: Vamos manter a lógica visual, mas alertar que o backend precisa suportar isso.
    // No action `updateCategoria` atual, só mudamos o nome.
    // SUGESTÃO: Vou desabilitar essa função temporariamente ou assumir que ela só funciona visualmente por enquanto
    // até alterarmos a action para aceitar status.

    // Para não quebrar seu fluxo, vou deixar um toast informativo:
    toast.info("Alteração de status será implementada na próxima etapa.");

    /* Lógica antiga (comentada para referência):
    const novoStatus = categoria.status === "ativa" ? "inativa" : "ativa";
    const updated = { ...categoria, status: novoStatus } as CategoriaData;
    StorageService.saveCategoria(updated);
    setCategorias((prev) => prev.map((c) => (c.id === categoria.id ? updated : c)));
    toast.success(`Categoria ${novoStatus === "ativa" ? "ativada" : "desativada"}.`);
    */
  };

  const handleDelete = async () => {
    if (categoryToDelete) {
      const result = await deleteCategoria(categoryToDelete);

      if (result.success) {
        toast.success("Categoria excluída.");
        setCategoryToDelete(null);
        loadData();
      } else {
        toast.error(result.message || "Erro ao excluir.");
      }
    }
  };

  if (!hasPermission("categorias:ver")) {
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
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">
            Organize os itens do catálogo.
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission("categorias:criar") && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Nova Categoria
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 bg-background/95 backdrop-blur z-10 py-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-hidden border rounded-md relative bg-card shadow-sm">
        <div className="absolute inset-0 overflow-y-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 bg-card shadow-sm">
              <TableRow>
                <TableHead className="w-[50%] bg-card">Nome</TableHead>
                <TableHead className="bg-card text-center">Status</TableHead>
                <TableHead className="bg-card text-right">Itens</TableHead>
                <TableHead className="w-12 bg-card"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCategorias.length > 0 ? (
                filteredCategorias.map((cat) => (
                  <TableRow
                    key={cat.id}
                    className={cat.status === "inativa" ? "opacity-60" : ""}
                  >
                    <TableCell className="font-medium py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                          <Tags className="h-4 w-4" />
                        </div>
                        {cat.nome}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <Badge
                        variant={
                          cat.status === "ativa" ? "outline" : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {cat.status === "ativa" ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-3 text-muted-foreground">
                      {cat.itemCount || 0}
                    </TableCell>
                    <TableCell className="py-3">
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
                          {hasPermission("categorias:editar") && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleOpenDialog(cat)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Editar Nome
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(cat)}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                {cat.status === "ativa"
                                  ? "Desativar"
                                  : "Ativar"}
                              </DropdownMenuItem>
                            </>
                          )}

                          {hasPermission("categorias:excluir") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setCategoryToDelete(cat.id)}
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
                  <TableCell colSpan={4} className="h-24 text-center">
                    Nenhuma categoria encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Altere o nome da categoria abaixo."
                : "Crie uma nova categoria para organizar seus itens."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input
                id="name"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Ex: Laticínios"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                disabled={isSaving} // Desabilita enquanto salva
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Exclusão */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá a categoria permanentemente. Itens associados a ela
              poderão ficar sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
