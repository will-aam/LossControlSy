"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { User, UserRole } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: User | null;
  // Ajuste na tipagem do onSave para aceitar Partial<User> e senha
  onSave: (data: {
    id?: string;
    nome: string;
    email: string;
    role: UserRole;
    password?: string;
    avatarUrl?: string;
  }) => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  userToEdit,
  onSave,
}: UserFormDialogProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("funcionario");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carrega os dados quando for edição
  useEffect(() => {
    if (userToEdit) {
      setNome(userToEdit.nome);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setPassword(""); // Limpa senha na edição (opcional alterar)
    } else {
      // Reseta para novo usuário
      setNome("");
      setEmail("");
      setRole("funcionario");
      setPassword("");
    }
  }, [userToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const userData = {
      id: userToEdit?.id, // Envia ID apenas se for edição
      nome,
      email,
      role,
      password: password || undefined, // Só envia se preenchido
      avatarUrl: userToEdit?.avatarUrl || userToEdit?.avatar, // Mantém avatar antigo
    };

    await onSave(userData);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>
            {userToEdit ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Silva"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail de Acesso</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@empresa.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Função / Cargo</Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as UserRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="funcionario">Funcionário</SelectItem>
                <SelectItem value="fiscal">Fiscal</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="dono">Proprietário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">
              {userToEdit ? "Nova Senha (Opcional)" : "Senha Inicial"}
            </Label>
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={userToEdit ? "Manter atual" : "Padrão: 1234"}
            />
            {!userToEdit && !password && (
              <p className="text-[10px] text-muted-foreground">
                Se vazio, será "1234".
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
