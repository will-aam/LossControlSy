"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/session";

// 1. Buscar Configurações (Singleton por Dono ou Global)
export async function getSettings() {
  const session = await getSession();
  if (!session) return { success: false };

  try {
    // Busca a config vinculada ao dono (ou a primeira que achar se for sistema único)
    // Ajuste conforme sua regra de negócio. Aqui vou pegar a primeira.
    const config = await prisma.configuracao.findFirst();

    // Se não existir, retorna padrão
    if (!config) {
      return {
        success: true,
        data: {
          empresaNome: "",
          exigirFoto: false,
          bloquearAprovados: true,
          permitirFuncionarioGaleria: false,
          limiteDiario: 1000,
        },
      };
    }

    return {
      success: true,
      data: {
        ...config,
        limiteDiario: Number(config.limiteDiario),
      },
    };
  } catch (error) {
    return { success: false, message: "Erro ao buscar configurações." };
  }
}

// 2. Salvar Configurações
export async function saveSettings(data: any) {
  const session = await getSession();
  if (!session || session.role !== "dono")
    return {
      success: false,
      message: "Apenas o dono pode alterar configurações.",
    };

  try {
    const config = await prisma.configuracao.findFirst();

    if (config) {
      await prisma.configuracao.update({
        where: { id: config.id },
        data: {
          empresaNome: data.empresaNome,
          exigirFoto: data.exigirFoto,
          bloquearAprovados: data.bloquearAprovados,
          permitirFuncionarioGaleria: data.permitirFuncionarioGaleria,
          // limiteDiario: data.limiteDiario // Se tiver no form
        },
      });
    } else {
      await prisma.configuracao.create({
        data: {
          empresaNome: data.empresaNome,
          exigirFoto: data.exigirFoto,
          bloquearAprovados: data.bloquearAprovados,
          permitirFuncionarioGaleria: data.permitirFuncionarioGaleria,
          donoId: session.id,
        },
      });
    }

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao salvar configurações." };
  }
}

// --- GESTÃO DE USUÁRIOS ---

export async function getUsers() {
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
    return { success: false, data: [] };
  }
}

export async function saveUser(data: any) {
  const session = await getSession();
  if (!session || (session.role !== "dono" && session.role !== "gestor")) {
    return { success: false, message: "Sem permissão." };
  }

  try {
    // Se tem ID, é edição
    if (data.id) {
      const updateData: any = {
        nome: data.nome,
        email: data.email,
        role: data.role as UserRole,
      };

      // Só atualiza senha se for enviada
      if (data.password) {
        updateData.passwordHash = await hashPassword(data.password);
      }

      await prisma.user.update({
        where: { id: data.id },
        data: updateData,
      });
    } else {
      // Criação
      if (!data.password)
        return { success: false, message: "Senha obrigatória." };

      // Verifica email duplicado
      const existe = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existe) return { success: false, message: "Email já cadastrado." };

      await prisma.user.create({
        data: {
          nome: data.nome,
          email: data.email,
          role: data.role as UserRole,
          passwordHash: await hashPassword(data.password),
        },
      });
    }

    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao salvar usuário." };
  }
}

export async function deleteUser(id: string) {
  const session = await getSession();
  if (!session || (session.role !== "dono" && session.role !== "gestor")) {
    return { success: false, message: "Sem permissão." };
  }

  if (id === session.id)
    return { success: false, message: "Não pode excluir a si mesmo." };

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir usuário." };
  }
}
