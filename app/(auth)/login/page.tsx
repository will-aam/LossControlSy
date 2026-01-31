"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { StorageService } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simula delay
    await new Promise((r) => setTimeout(r, 800));

    try {
      const users = StorageService.getUsers();
      // Tenta achar
      let foundUser = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );

      // --- MODO DE TESTE: CRIA AUTOMÁTICO SE NÃO EXISTIR ---
      if (!foundUser) {
        // Adivinha o cargo pelo nome do email (ex: gestor@empresa.com -> cargo: gestor)
        const roleName = email.split("@")[0].toLowerCase(); // pega 'gestor', 'funcionario', etc

        // Verifica se é um cargo válido, senão vira funcionario padrão
        const validRoles = ["dono", "gestor", "fiscal", "funcionario"];
        const roleToUse = validRoles.includes(roleName)
          ? roleName
          : "funcionario";

        foundUser = {
          id: Date.now().toString(),
          nome: roleName.charAt(0).toUpperCase() + roleName.slice(1), // Ex: Gestor
          email: email,
          role: roleToUse as any,
          avatar: "",
        };

        // Salva esse novo usuário no "Banco"
        StorageService.saveUser(foundUser);
        toast.info(`Usuário de teste criado: ${roleToUse}`);
      }
      // -----------------------------------------------------

      // Sucesso
      setUser(foundUser);

      // Salva ID na sessão para persistir F5
      localStorage.setItem("losscontrol_active_user_id", foundUser.id);

      toast.success(`Bem-vindo, ${foundUser.nome}`);
      router.push("/dashboard");
    } catch (error) {
      toast.error("Erro ao entrar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Entre com seu e-mail de acesso</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Entrar no Sistema"
              )}
            </Button>
          </CardFooter>
        </form>
        <div className="px-6 pb-4 text-center text-xs text-muted-foreground">
          <p>
            Dica: Use <strong>admin@empresa.com</strong>
          </p>
        </div>
      </Card>
    </div>
  );
}
