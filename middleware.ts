import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY =
  process.env.SESSION_SECRET || "minha-chave-secreta-super-segura-123";
const key = new TextEncoder().encode(SECRET_KEY);

// Rotas que NÃO precisam de autenticação (Públicas)
const publicRoutes = ["/login", "/public", "/api/upload"];

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
      console.log("Token inválido");
    }
  }

  // CENÁRIO A: Usuário NÃO logado tentando acessar rota protegida
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // CENÁRIO B: Usuário JÁ logado tentando acessar Login (Redireciona para Dashboard)
  if (path === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

// Configuração: Em quais rotas o middleware deve rodar?
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
