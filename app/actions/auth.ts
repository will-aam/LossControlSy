"use server";

import { prisma } from "@/lib/prisma";
import {
  createSession,
  deleteSession,
  getSession,
  verifyPassword,
  hashPassword,
} from "@/lib/session";
import { redirect } from "next/navigation";
import { User, UserRole } from "@/lib/types";
import { revalidatePath } from "next/cache";

// 1. Função de Login
export async function loginAction(email: string, password?: string) {
  if (!password) return { success: false, message: "Senha obrigatória" };

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, message: "Usuário não encontrado." };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return { success: false, message: "Senha incorreta." };
    }

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

// 3. Recuperar Sessão
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

// --- GERENCIAMENTO DE USUÁRIOS (CONFIGURAÇÕES) ---

export async function getUsers() {
  const session = await getSession();
  if (!session || !["dono", "gestor"].includes(session.role)) {
    return { success: false, message: "Sem permissão" };
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });
    return { success: true, data: users };
  } catch (error) {
    return { success: false, message: "Erro ao buscar usuários" };
  }
}

export async function createUser(data: {
  nome: string;
  email: string;
  role: string;
  password?: string;
}) {
  const session = await getSession();
  if (!session || session.role !== "dono") {
    return { success: false, message: "Sem permissão" };
  }

  try {
    // Senha padrão 1234 se não for fornecida (para facilitar criação rápida)
    const passwordRaw = data.password || "1234";
    const passwordHash = await hashPassword(passwordRaw);

    await prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        role: data.role as any, // Cast para enum do Prisma
        passwordHash,
      },
    });

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Erro ao criar usuário (Email já existe?)",
    };
  }
}

export async function deleteUser(id: string) {
  const session = await getSession();
  if (!session || session.role !== "dono") {
    return { success: false, message: "Sem permissão" };
  }

  if (session.id === id) {
    return { success: false, message: "Você não pode se excluir." };
  }

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir usuário." };
  }
}
