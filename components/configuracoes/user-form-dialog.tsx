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
// Importações corrigidas
import { User, UserRole } from "@/lib/types";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: User | null;
  onSave: (user: User) => void;
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

  // Carrega os dados quando for edição
  useEffect(() => {
    if (userToEdit) {
      setNome(userToEdit.nome);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
    } else {
      // Reseta para novo usuário
      setNome("");
      setEmail("");
      setRole("funcionario");
    }
  }, [userToEdit, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mantém o ID se for edição, ou cria novo se for criação
    const newUser: User = {
      id: userToEdit ? userToEdit.id : Math.random().toString(36).substr(2, 9),
      nome,
      email,
      role,
      avatar: userToEdit?.avatar || "",
    };

    onSave(newUser);
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
