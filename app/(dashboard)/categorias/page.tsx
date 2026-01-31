"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Power,
  Trash2,
  Tags,
  AlertTriangle,
} from "lucide-react";
// Importamos apenas a Interface do mock, os dados vêm do Storage agora
import { CategoriaData } from "@/lib/mock-data";
import { StorageService } from "@/lib/storage"; // Importando o serviço de storage
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

// Classe para esconder scrollbar
const hideScrollClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function CategoriasPage() {
  const { hasPermission } = useAuth();

  // Estado local (Começa vazio e carrega do Storage)
  const [categorias, setCategorias] = useState<CategoriaData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Controle do Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] =
    useState<CategoriaData | null>(null);
  const [nomeForm, setNomeForm] = useState("");

  // Carregar dados ao iniciar a tela
  useEffect(() => {
    // Busca do LocalStorage
    const dadosSalvos = StorageService.getCategorias();
    setCategorias(dadosSalvos);
  }, []);

  // Filtragem
  const filteredCategorias = categorias.filter((cat) =>
    cat.nome.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Ações
  const handleOpenDialog = (categoria?: CategoriaData) => {
    if (categoria) {
      setEditingCategoria(categoria);
      setNomeForm(categoria.nome);
    } else {
      setEditingCategoria(null);
      setNomeForm("");
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!nomeForm.trim()) {
      toast.warning("O nome da categoria é obrigatório");
      return;
    }

    if (editingCategoria) {
      // Editar
      const updatedCategoria = { ...editingCategoria, nome: nomeForm };

      // 1. Salva no Storage
      StorageService.saveCategoria(updatedCategoria);

      // 2. Atualiza estado visual
      setCategorias(StorageService.getCategorias());

      toast.success("Categoria atualizada!");
    } else {
      // Criar Nova
      const nova: CategoriaData = {
        id: Math.random().toString(36).substr(2, 9),
        nome: nomeForm,
        status: "ativa",
        itemCount: 0,
      };

      // 1. Salva no Storage
      StorageService.saveCategoria(nova);

      // 2. Atualiza estado visual
      setCategorias(StorageService.getCategorias());

      toast.success("Categoria criada com sucesso!");
    }
    setIsDialogOpen(false);
  };

  const handleToggleStatus = (categoria: CategoriaData) => {
    const novoStatus = categoria.status === "ativa" ? "inativa" : "ativa";
    const updated = { ...categoria, status: novoStatus } as CategoriaData;

    // Salva e Atualiza
    StorageService.saveCategoria(updated);
    setCategorias(StorageService.getCategorias());

    toast.info(
      `Categoria ${novoStatus === "ativa" ? "ativada" : "desativada"}`,
    );
  };

  const handleDelete = (id: string) => {
    // Em um sistema real, validaria se tem itens vinculados antes
    StorageService.deleteCategoria(id);
    setCategorias(StorageService.getCategorias());
    toast.success("Categoria removida");
  };

  // Permissão
  if (!hasPermission("catalogo:criar")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    // Container Principal sem Scroll (travado)
    <div
      className={`flex flex-col h-[calc(100vh-8rem)] space-y-4 max-w-5xl mx-auto w-full ${hideScrollClass}`}
    >
      {/* Header Fixo */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">
            Gerencie as classificações dos produtos.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {/* Busca Fixa */}
      <div className="flex items-center py-2 shrink-0">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Tabela com Scroll Interno */}
      <div className="flex-1 min-h-0 border rounded-md bg-card relative overflow-hidden shadow-sm">
        {" "}
        <div className="absolute inset-0 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 ">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Qtd. Itens</TableHead>
                <TableHead className="w-25"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategorias.length > 0 ? (
                filteredCategorias.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-md">
                          <Tags className="h-4 w-4 text-primary" />
                        </div>
                        {cat.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cat.status === "ativa" ? "outline" : "secondary"
                        }
                      >
                        {cat.status === "ativa" ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {cat.itemCount || 0}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenDialog(cat)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(cat)}
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {cat.status === "ativa" ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(cat.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhuma categoria encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              Crie categorias para organizar o catálogo de produtos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input
                id="name"
                value={nomeForm}
                onChange={(e) => setNomeForm(e.target.value)}
                placeholder="Ex: Frutas, Limpeza..."
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
