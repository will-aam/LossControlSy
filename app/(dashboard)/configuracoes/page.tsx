"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Importações corrigidas
import { User, UserRole } from "@/lib/types";
import { getRoleLabel } from "@/lib/utils";
import { StorageService, AppSettings } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { UserFormDialog } from "@/components/configuracoes/user-form-dialog";
import {
  AlertTriangle,
  Building2,
  Users,
  Bell,
  Shield,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

const roleColors: Record<UserRole, string> = {
  funcionario: "bg-blue-500 text-white",
  gestor: "bg-purple-500 text-white",
  fiscal: "bg-orange-500 text-white",
  dono: "bg-emerald-600 text-white",
};

export default function ConfiguracoesPage() {
  const { hasPermission, user: currentUser } = useAuth();

  // Estados de Dados
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    empresaNome: "",
    exigirFoto: false,
    bloquearAprovados: true,
    limiteDiario: 1000,
    permitirFuncionarioGaleria: false, // Inicializa com false (será sobrescrito pelo loadData)
  });

  // Estados de Modais
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Carregar dados ao iniciar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setUsers(StorageService.getUsers());
    setSettings(StorageService.getSettings());
  };

  // --- AÇÕES DE CONFIGURAÇÃO GERAL ---
  const handleSaveSettings = () => {
    StorageService.saveSettings(settings);
    // Força um reload suave ou notifica contexto se necessário, mas o toast já avisa
    toast.success("Configurações salvas com sucesso!");
    // O AuthContext vai pegar a mudança na próxima renderização/navegação
    // ou podemos forçar reload da página se for crítico, mas aqui é SPA
  };

  // --- AÇÕES DE USUÁRIOS ---
  const handleSaveUser = (user: User) => {
    StorageService.saveUser(user);
    loadData();
    toast.success(
      userToEdit ? "Usuário atualizado!" : "Usuário criado com sucesso!",
    );
    setUserToEdit(null);
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setShowUserDialog(true);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      // Impede excluir a si mesmo
      if (userToDelete === currentUser?.id) {
        toast.error("Você não pode excluir sua própria conta.");
        setUserToDelete(null);
        return;
      }

      StorageService.deleteUser(userToDelete);
      loadData();
      toast.success("Usuário removido.");
      setUserToDelete(null);
    }
  };

  if (!hasPermission("configuracoes:ver")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para ver as configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
        </TabsList>

        {/* --- GERAL TAB --- */}
        <TabsContent value="geral" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>
                Informações básicas da organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="empresa">Nome da Empresa</Label>
                  <Input
                    id="empresa"
                    value={settings.empresaNome}
                    onChange={(e) =>
                      setSettings({ ...settings, empresaNome: e.target.value })
                    }
                    placeholder="Supermercado Exemplo Ltda"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings}>Salvar Alterações</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Políticas de Segurança e Operação
              </CardTitle>
              <CardDescription>
                Regras para registro, edição e acesso de funcionários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Regra 1: Foto Obrigatória */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir foto em eventos de perda</Label>
                  <p className="text-sm text-muted-foreground">
                    Impede finalizar uma perda se houver itens sem foto.
                  </p>
                </div>
                <Switch
                  checked={settings.exigirFoto}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, exigirFoto: checked })
                  }
                />
              </div>
              <Separator />

              {/* Regra 2: Bloqueio de Edição */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bloquear edição após aprovação</Label>
                  <p className="text-sm text-muted-foreground">
                    Impede alterações em eventos já aprovados por gestores.
                  </p>
                </div>
                <Switch
                  checked={settings.bloquearAprovados}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, bloquearAprovados: checked })
                  }
                />
              </div>
              <Separator />

              {/* Regra 3: Acesso Galeria Funcionário (NOVO) */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>Permitir funcionários na Galeria</Label>
                    <Badge variant="outline" className="text-[10px] h-5">
                      Novo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Se ativo, funcionários poderão acessar a aba Galeria e
                    adicionar fotos avulsas.
                  </p>
                </div>
                <Switch
                  checked={settings.permitirFuncionarioGaleria}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      permitirFuncionarioGaleria: checked,
                    })
                  }
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={handleSaveSettings}>
                  Atualizar Políticas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- USUÁRIOS TAB --- */}
        <TabsContent value="usuarios" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Sistema
                </CardTitle>
                <CardDescription>
                  Gerencie quem tem acesso e suas funções
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setUserToEdit(null);
                  setShowUserDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-25">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const initials = user.nome
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={roleColors[user.role]}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Ativo</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setUserToDelete(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- NOTIFICAÇÕES TAB (Visual apenas por enquanto) --- */}
        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências de Notificação
              </CardTitle>
              <CardDescription>
                Configure os alertas (Disponível em breve)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 opacity-60 pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Novos eventos de perda</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar gestores via App
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alerta de limite de perda</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertar quando ultrapassar o limite diário
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE USUÁRIO */}
      <UserFormDialog
        open={showUserDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowUserDialog(false);
            setUserToEdit(null);
          }
        }}
        userToEdit={userToEdit}
        onSave={handleSaveUser}
      />

      {/* ALERTA DE EXCLUSÃO */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá o usuário permanentemente e ele perderá o
              acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
