// app/actions/configuracoes.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/types";

// --- CONFIGURAÇÕES GERAIS ---

export async function getSettings() {
  try {
    const session = await getSession();
    if (!session) return { success: false, message: "Não autorizado" };

    // Busca configurações vinculadas ao dono da loja (ownerId da sessão)
    let config = await prisma.configuracao.findUnique({
      where: { donoId: session.ownerId },
    });

    // Se não existir (primeiro acesso da loja), cria com valores padrão
    if (!config && session.role === "dono") {
      config = await prisma.configuracao.create({
        data: {
          empresaNome: "Minha Empresa",
          donoId: session.ownerId,
          limiteDiario: 1000,
        },
      });
    }

    // Conversão do Decimal para Number para o frontend
    const plainConfig = config
      ? {
          ...config,
          limiteDiario: Number(config.limiteDiario),
        }
      : null;

    return { success: true, data: plainConfig };
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return { success: false, message: "Erro ao carregar configurações" };
  }
}

export async function saveSettings(data: {
  empresaNome: string;
  exigirFoto: boolean;
  bloquearAprovados: boolean;
  permitirFuncionarioGaleria: boolean;
  limiteDiario?: number;
}) {
  const session = await getSession();

  // Apenas o proprietário da loja pode alterar as regras globais da unidade
  if (!session || session.role !== "dono") {
    return {
      success: false,
      message: "Apenas o proprietário pode alterar configurações.",
    };
  }

  try {
    const dataToUpdate = {
      empresaNome: data.empresaNome,
      exigirFoto: data.exigirFoto,
      bloquearAprovados: data.bloquearAprovados,
      permitirFuncionarioGaleria: data.permitirFuncionarioGaleria,
      ...(data.limiteDiario !== undefined && {
        limiteDiario: data.limiteDiario,
      }),
    };

    await prisma.configuracao.upsert({
      where: { donoId: session.ownerId },
      update: dataToUpdate,
      create: {
        ...dataToUpdate,
        donoId: session.ownerId,
        limiteDiario: data.limiteDiario || 1000,
      },
    });

    revalidatePath("/configuracoes");
    revalidatePath("/eventos/novo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return { success: false, message: "Erro interno ao salvar." };
  }
}

// --- GERENCIAMENTO DE USUÁRIOS (MULTI-TENANCY) ---

export async function getUsers() {
  const session = await getSession();
  if (!session) return { success: false, message: "Sem permissão" };

  try {
    // Filtra para mostrar apenas o dono da loja e sua respectiva equipe
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: session.ownerId }, // O dono da loja
          { ownerId: session.ownerId }, // A equipe da loja
        ],
      },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        avatarUrl: true,
        ativo: true,
        ownerId: true,
      },
    });
    return { success: true, data: users };
  } catch (error) {
    return { success: false, message: "Erro ao buscar usuários" };
  }
}

export async function saveUser(data: {
  id?: string;
  nome: string;
  email: string;
  role: UserRole;
  password?: string;
  avatarUrl?: string;
  ativo?: boolean;
}) {
  const session = await getSession();

  if (!session || session.role !== "dono") {
    return {
      success: false,
      message: "Apenas o proprietário pode gerenciar a equipe.",
    };
  }

  try {
    if (data.id) {
      // EDIÇÃO: Verifica se o usuário pertence ao "quadrado" desta loja
      const existingUser = await prisma.user.findUnique({
        where: { id: data.id },
      });

      if (
        !existingUser ||
        (existingUser.id !== session.ownerId &&
          existingUser.ownerId !== session.ownerId)
      ) {
        return { success: false, message: "Acesso negado a este usuário." };
      }

      // Proteção para a conta do Dono
      if (existingUser.id === session.ownerId) {
        if (data.role !== "dono") {
          return {
            success: false,
            message: "O proprietário não pode alterar seu próprio cargo.",
          };
        }
        if (data.ativo === false) {
          return {
            success: false,
            message: "O proprietário não pode desativar sua própria conta.",
          };
        }
      }

      const updateData: any = {
        nome: data.nome,
        email: data.email,
        role: data.role,
        ativo: data.ativo,
      };

      if (data.password) {
        updateData.passwordHash = await hashPassword(data.password);
      }

      await prisma.user.update({
        where: { id: data.id },
        data: updateData,
      });
    } else {
      // CRIAÇÃO: Novo funcionário para esta loja
      const exists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (exists)
        return { success: false, message: "Este e-mail já está em uso." };

      const passwordRaw = data.password || "1234";
      const passwordHash = await hashPassword(passwordRaw);

      await prisma.user.create({
        data: {
          nome: data.nome,
          email: data.email,
          role: data.role,
          passwordHash,
          ativo: true,
          ownerId: session.ownerId, // Amarra ao dono da unidade logada
        },
      });
    }

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao salvar usuário." };
  }
}

export async function deleteUser(id: string) {
  const session = await getSession();
  if (!session || session.role !== "dono") {
    return { success: false, message: "Sem permissão" };
  }

  if (session.id === id) {
    return {
      success: false,
      message: "Você não pode excluir sua própria conta.",
    };
  }

  try {
    // Verifica se o alvo pertence à loja antes de deletar
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || targetUser.ownerId !== session.ownerId) {
      return { success: false, message: "Usuário não pertence à sua equipe." };
    }

    await prisma.user.delete({ where: { id } });
    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir usuário." };
  }
}
