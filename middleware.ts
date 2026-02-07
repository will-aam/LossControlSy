import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY =
  process.env.SESSION_SECRET || "default-dev-secret-key-change-me";
const key = new TextEncoder().encode(SECRET_KEY);

const publicRoutes = ["/login", "/public"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Verificação extra para arquivos estáticos na raiz (caso o matcher deixe passar algo)
  if (
    path.endsWith(".png") ||
    path.endsWith(".jpg") ||
    path.endsWith(".svg") ||
    path === "/sw.js" ||
    path === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  // 2. Verificar se é rota pública
  const isPublicRoute = publicRoutes.some(
    (route) => path === route || path.startsWith(route),
  );

  // 3. Ler o Cookie de Sessão
  const session = req.cookies.get("session_token")?.value;

  // 4. Validar Sessão e obter o CARGO do usuário
  let isAuthenticated = false;
  let userRole = "";

  if (session) {
    try {
      // Extraímos o 'payload' para ler os dados salvos no token (como o role)
      const { payload } = await jwtVerify(session, key, {
        algorithms: ["HS256"],
      });
      isAuthenticated = true;
      userRole = payload.role as string;
    } catch (error) {
      // Token inválido ou expirado
    }
  }

  // CENÁRIO A: Usuário NÃO logado tentando acessar rota protegida
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // CENÁRIO B: Usuário JÁ logado tentando acessar Login
  if (path === "/login" && isAuthenticated) {
    // SE FOR FUNCIONÁRIO: Manda para Registrar Perda (pois não tem acesso ao dashboard)
    if (userRole === "funcionario") {
      return NextResponse.redirect(new URL("/eventos/novo", req.url));
    }

    // OUTROS (Gestor, Dono, Fiscal): Mandam para o Dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Mantive o matcher otimizado que definimos antes
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|sw.js.map|manifest.json|.*\\.png$|.*\\.svg$).*)",
  ],
};
