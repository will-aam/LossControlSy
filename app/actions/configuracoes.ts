"use server";

import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/types";

// Buscar Configurações
export async function getSettings() {
  try {
    // Tenta buscar a primeira configuração existente
    let config = await prisma.configuracao.findFirst();

    // Se não existir, cria uma padrão
    if (!config) {
      const session = await getSession();
      // Só cria se tiver alguém logado, senão retorna null
      if (session) {
        config = await prisma.configuracao.create({
          data: {
            empresaNome: "Minha Empresa",
            donoId: session.id, // Vincula ao primeiro usuário que acessar
            limiteDiario: 1000, // Valor padrão
          },
        });
      }
    }

    // --- CORREÇÃO DO ERRO DE DECIMAL ---
    // Convertemos o objeto do Prisma para um objeto simples JS
    // O campo 'limiteDiario' (Decimal) vira number
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

// Atualizar Configurações
export async function saveSettings(data: {
  empresaNome: string;
  exigirFoto: boolean;
  bloquearAprovados: boolean;
  permitirFuncionarioGaleria: boolean;
  limiteDiario?: number; // Opcional, caso adicione input para isso no futuro
}) {
  const session = await getSession();

  // Apenas Dono e Gestor podem alterar configurações globais
  if (!session || !["dono", "gestor"].includes(session.role)) {
    return {
      success: false,
      message: "Sem permissão para alterar configurações.",
    };
  }

  try {
    // Busca o ID da configuração existente
    const currentConfig = await prisma.configuracao.findFirst();

    const dataToUpdate = {
      empresaNome: data.empresaNome,
      exigirFoto: data.exigirFoto,
      bloquearAprovados: data.bloquearAprovados,
      permitirFuncionarioGaleria: data.permitirFuncionarioGaleria,
      // Se limiteDiario vier, atualiza, senão mantém
      ...(data.limiteDiario !== undefined && {
        limiteDiario: data.limiteDiario,
      }),
    };

    if (currentConfig) {
      await prisma.configuracao.update({
        where: { id: currentConfig.id },
        data: dataToUpdate,
      });
    } else {
      // Caso raro: cria se não existir
      await prisma.configuracao.create({
        data: {
          ...dataToUpdate,
          donoId: session.id,
          limiteDiario: data.limiteDiario || 1000,
        },
      });
    }

    revalidatePath("/configuracoes");
    revalidatePath("/eventos/novo");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return { success: false, message: "Erro interno ao salvar." };
  }
}

// --- GERENCIAMENTO DE USUÁRIOS ---

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

export async function saveUser(data: {
  id?: string;
  nome: string;
  email: string;
  role: UserRole;
  password?: string;
}) {
  const session = await getSession();
  if (!session || session.role !== "dono") {
    return {
      success: false,
      message: "Apenas o proprietário pode gerenciar usuários.",
    };
  }

  try {
    // Se tiver ID, é atualização
    if (data.id && data.id.length > 10) {
      // Atualiza
      const updateData: any = {
        nome: data.nome,
        email: data.email,
        role: data.role,
      };
      // Só atualiza senha se for fornecida
      if (data.password) {
        updateData.passwordHash = await hashPassword(data.password);
      }

      await prisma.user.update({
        where: { id: data.id },
        data: updateData,
      });
    } else {
      // Cria novo
      const passwordRaw = data.password || "1234";
      const passwordHash = await hashPassword(passwordRaw);

      await prisma.user.create({
        data: {
          nome: data.nome,
          email: data.email,
          role: data.role,
          passwordHash,
        },
      });
    }

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Erro ao salvar usuário (Email já existe?)",
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
