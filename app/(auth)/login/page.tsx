"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

// Componente interno para isolar o uso de useSearchParams
function LoginForm() {
  const { login, isLoading } = useAuth();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Preenche o email se vier na URL (funcionalidade de troca de conta)
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 bg-background/60 backdrop-blur-2xl shadow-2xl shadow-black/20">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="flex items-center justify-center gap-3">
            <CardTitle className="text-4xl font-bold tracking-tight text-foreground">
              LossControlSy
            </CardTitle>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 px-8">
            <div className="group space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-muted-foreground group-focus-within:text-foreground transition-colors"
              >
                E-mail Corporativo
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com"
                  className="border-border/50 bg-secondary/30 pl-11 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="group space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-muted-foreground group-focus-within:text-foreground transition-colors"
              >
                Senha de Acesso
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  className="border-border/50 bg-secondary/30 pl-11 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>

          <div className="px-8 pt-8">
            <Button
              className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary/90 hover:shadow-primary/40 hover:scale-[1.02]"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Acessar Sistema"
              )}
            </Button>
          </div>

          <CardFooter className="flex justify-center pb-8 pt-6">
            <p className="text-center text-sm text-muted-foreground">
              Problemas para acessar?{" "}
              <button
                type="button"
                className="font-medium text-primary transition-opacity hover:opacity-80"
              >
                Solicite suporte
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background Animado */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-br from-background via-card to-background" />
        <div className="absolute top-0 -left-4 h-96 w-96 animate-pulse">
          <div className="absolute inset-0 h-full w-full rounded-full bg-primary/20 blur-3xl" />
        </div>
        <div
          className="absolute bottom-0 -right-4 h-96 w-96 animate-pulse"
          style={{ animationDelay: "2s" }}
        >
          <div className="absolute inset-0 h-full w-full rounded-full from-blue-600/20 to-transparent bg-linear-to-t blur-3xl" />
        </div>
        <div
          className="absolute inset-0 opacity-20 mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(30 41 59 / 0.2)'%3e%3cpath d='m0 .5h32m-32 32v-32m32 0v32'/%3e%3c/svg%3e")`,
          }}
        />
      </div>

      {/* Conteúdo com Suspense para evitar erro de build */}
      <Suspense
        fallback={
          <div className="relative z-10 text-center">Carregando...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
