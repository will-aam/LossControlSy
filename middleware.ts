import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// --- IMPORTANTE: A chave deve ser IGUAL à usada no lib/session.ts ---
const SECRET_KEY =
  process.env.SESSION_SECRET || "default-dev-secret-key-change-me";
const key = new TextEncoder().encode(SECRET_KEY);

// Rotas que NÃO precisam de autenticação (Públicas)
const publicRoutes = ["/login", "/public"];

// Rotas de arquivos estáticos (imagens, css, etc) que o middleware deve ignorar
const staticAssets = ["/_next", "/favicon.ico", "/images", "/public"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Ignorar arquivos estáticos e API do Next
  if (staticAssets.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 2. Verificar se é rota pública
  const isPublicRoute = publicRoutes.some(
    (route) => path === route || path.startsWith(route),
  );

  // 3. Ler o Cookie de Sessão
  const session = req.cookies.get("session_token")?.value;

  // 4. Validar Sessão
  let isAuthenticated = false;

  if (session) {
    try {
      await jwtVerify(session, key, { algorithms: ["HS256"] });
      isAuthenticated = true;
    } catch (error) {
      // Token inválido ou expirado
      // Em produção, isso força o logout se a chave secreta mudar
    }
  }

  // CENÁRIO A: Usuário NÃO logado tentando acessar rota protegida
  if (!isPublicRoute && !isAuthenticated) {
    // Redireciona para login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // CENÁRIO B: Usuário JÁ logado tentando acessar Login (Redireciona para Dashboard)
  if (path === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
