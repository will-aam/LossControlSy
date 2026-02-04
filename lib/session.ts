import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";

// Chave secreta para assinar o token (em produção, use uma env var longa)
const SECRET_KEY =
  process.env.SESSION_SECRET || "minha-chave-secreta-super-segura-123";
const key = new TextEncoder().encode(SECRET_KEY);

const COOKIE_NAME = "session_token";

// Tipagem do Payload da Sessão
export type SessionPayload = {
  id: string;
  email: string;
  role: UserRole;
  nome: string;
  avatarUrl?: string | null;
  expiresAt: Date;
};

// 1. Criar a Sessão (Login)
export async function createSession(user: {
  id: string;
  email: string;
  role: UserRole;
  nome: string;
  avatarUrl?: string | null;
}) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  // Cria o token JWT
  const session = await new SignJWT({ ...user, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);

  // Salva no Cookie HttpOnly (Inacessível via JS do navegador = Seguro)
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

// 2. Ler a Sessão Atual (Verificar se está logado)
export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

// 3. Destruir a Sessão (Logout)
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
