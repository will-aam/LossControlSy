"use server";

import { prisma } from "@/lib/prisma";
import {
  createSession,
  deleteSession,
  getSession,
  verifyPassword,
} from "@/lib/session";
import { redirect } from "next/navigation";
import { User } from "@/lib/types";

// 1. Função de Login (Chamada pelo formulário)
export async function loginAction(email: string, password?: string) {
  if (!password) return { success: false, message: "Senha obrigatória" };

  try {
    // Busca usuário no Banco de Dados (Neon)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, message: "Usuário não encontrado." };
    }

    // Verifica a senha usando nossa função padronizada (SHA-256)
    // Em vez de 'compare' do bcrypt, usamos 'verifyPassword' do nosso lib
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return { success: false, message: "Senha incorreta." };
    }

    // Cria o Cookie de Sessão
    await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      nome: user.nome,
      avatarUrl: user.avatarUrl,
    });

    return { success: true, user };
  } catch (error) {
    console.error("Erro no login:", error);
    return { success: false, message: "Erro interno no servidor." };
  }
}

// 2. Função de Logout
export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

// 3. Função para "Re-hidratar" o usuário
export async function getClientSession() {
  const session = await getSession();
  if (!session) return null;

  return {
    id: session.id,
    nome: session.nome,
    email: session.email,
    role: session.role,
    avatarUrl: session.avatarUrl,
  } as User;
}
