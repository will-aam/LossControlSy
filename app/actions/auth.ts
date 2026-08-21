
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
import { User } from "@/lib/types";
import { revalidatePath } from "next/cache";


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



    const tenantId = user.ownerId || user.id;

    await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      nome: user.nome,
      avatarUrl: user.avatarUrl,
      ownerId: tenantId,
    });

    return { success: true, user };
  } catch (error) {
    console.error("Erro no login:", error);
    return { success: false, message: "Erro interno no servidor." };
  }
}


export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}


export async function getClientSession() {
  const session = await getSession();
  if (!session) return null;

  return {
    id: session.id,
    nome: session.nome,
    email: session.email,
    role: session.role,
    avatarUrl: session.avatarUrl,
    ownerId: session.ownerId,
  } as User & { ownerId: string };
}



export async function getUsers() {
  const session = await getSession();
  if (!session || !["dono", "gestor"].includes(session.role)) {
    return { success: false, message: "Sem permissão" };
  }

  try {

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { ownerId: session.ownerId },
          { id: session.ownerId },
        ],
      },
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
    const passwordRaw = data.password || "1234";
    const passwordHash = await hashPassword(passwordRaw);

    await prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        role: data.role as any,
        passwordHash,
        ownerId: session.ownerId,
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

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete || userToDelete.ownerId !== session.ownerId) {
      return {
        success: false,
        message: "Usuário não encontrado ou não pertence à sua loja.",
      };
    }

    await prisma.user.delete({ where: { id } });
    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir usuário." };
  }
}
