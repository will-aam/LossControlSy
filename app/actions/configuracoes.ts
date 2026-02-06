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

    // Busca configurações onde o dono é o usuário atual OU o chefe do usuário atual
    // Se for funcionário, o session.id não é o dono, precisamos saber quem é o dono.
    // Simplificação: Por enquanto, assumimos que quem acessa config é Dono ou Gestor.

    // Se for Dono, busca pelo próprio ID. Se for equipe, precisariamos do ownerId na sessão (adicionaremos futuramente se precisar)
    // Por hora, foca no Dono.
    let config = await prisma.configuracao.findFirst({
      where: { donoId: session.id },
    });

    // Se não existir e for dono, cria
    if (!config && session.role === "dono") {
      config = await prisma.configuracao.create({
        data: {
          empresaNome: "Minha Empresa",
          donoId: session.id,
          limiteDiario: 1000,
        },
      });
    }

    // Conversão do Decimal para Number
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

  if (!session || session.role !== "dono") {
    return {
      success: false,
      message: "Apenas o proprietário pode alterar configurações.",
    };
  }

  try {
    const currentConfig = await prisma.configuracao.findFirst({
      where: { donoId: session.id },
    });

    const dataToUpdate = {
      empresaNome: data.empresaNome,
      exigirFoto: data.exigirFoto,
      bloquearAprovados: data.bloquearAprovados,
      permitirFuncionarioGaleria: data.permitirFuncionarioGaleria,
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

// --- GERENCIAMENTO DE USUÁRIOS (MULTI-TENANCY) ---

export async function getUsers() {
  const session = await getSession();
  if (!session) return { success: false, message: "Sem permissão" };

  try {
    // REGRA DE OURO: Mostrar apenas usuários do "quadrado" do dono.
    // Se eu sou Dono: vejo eu mesmo (id = meu) OU minha equipe (ownerId = meu)

    let whereClause = {};

    if (session.role === "dono") {
      whereClause = {
        OR: [
          { id: session.id }, // Eu mesmo
          { ownerId: session.id }, // Minha equipe
        ],
      };
    } else {
      // Se for gestor/fiscal, talvez veja apenas ele mesmo por enquanto,
      // ou a mesma regra se tivermos o ownerId na sessão.
      // Vamos restringir para segurança: vê só ele mesmo se não for dono.
      whereClause = { id: session.id };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        avatarUrl: true,
        ativo: true, // Importante trazer o status
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

  // Apenas Dono pode criar/editar usuários da equipe
  if (!session || session.role !== "dono") {
    return {
      success: false,
      message: "Apenas o proprietário pode gerenciar a equipe.",
    };
  }

  try {
    // EDIÇÃO
    if (data.id) {
      // Segurança: Verificar se o usuário editado pertence ao Dono
      const existingUser = await prisma.user.findUnique({
        where: { id: data.id },
      });

      if (!existingUser)
        return { success: false, message: "Usuário não encontrado." };

      // Não permite editar usuários de outro dono (Multi-tenancy check)
      if (
        existingUser.id !== session.id &&
        existingUser.ownerId !== session.id
      ) {
        return { success: false, message: "Acesso negado a este usuário." };
      }

      // Regras para o PRÓPRIO Dono
      if (existingUser.id === session.id) {
        // O Dono NÃO pode mudar seu próprio cargo para funcionário (se travaria)
        if (data.role !== "dono") {
          return {
            success: false,
            message: "O proprietário não pode alterar seu próprio cargo.",
          };
        }
        // O Dono NÃO pode se desativar
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
        ativo: data.ativo, // Agora permitimos atualizar o status
      };

      if (data.password) {
        updateData.passwordHash = await hashPassword(data.password);
      }

      await prisma.user.update({
        where: { id: data.id },
        data: updateData,
      });
    } else {
      // CRIAÇÃO (Novo Funcionário)

      // Verifica duplicidade de email
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
          ativo: true, // Padrão: nasce ativo
          ownerId: session.id, // VINCULA AO DONO ATUAL
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
      message: "Você não pode excluir sua própria conta principal.",
    };
  }

  try {
    // Segurança: Só apaga se for da equipe dele
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser || targetUser.ownerId !== session.id) {
      return { success: false, message: "Usuário não pertence à sua equipe." };
    }

    await prisma.user.delete({ where: { id } });
    revalidatePath("/configuracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao excluir usuário." };
  }
}
