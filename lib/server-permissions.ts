import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

/**
 * Verifica se a sessão atual possui uma permissão específica.
 * Já faz o fetch da configuração para validar customPermissions.
 * @param permission Permissão que deseja checar
 * @returns { session, hasAccess }
 */
export async function checkServerPermission(permission: Permission) {
  const session = await getSession();
  
  if (!session) {
    return { session: null, hasAccess: false };
  }

  // Dono tem acesso a tudo
  if (session.role === "dono") {
    return { session, hasAccess: true };
  }

  try {
    // Buscar customPermissions na configuração da loja
    const config = await prisma.configuracao.findUnique({
      where: { donoId: session.ownerId },
      select: { permissoes: true }
    });

    const customPermissions = (config?.permissoes as Record<string, Permission[]>) || undefined;

    const hasAccess = hasPermission(session.role, permission, customPermissions);

    return { session, hasAccess };
  } catch (error) {
    console.error("Erro ao verificar permissões no servidor:", error);
    return { session, hasAccess: false };
  }
}

/**
 * Função helper que retorna { success: false, message: "..." } ou { success: true, session }.
 * Útil para encurtar código em Server Actions e manter o padrão de retorno.
 */
export async function requireServerPermission(permission: Permission) {
  const { session, hasAccess } = await checkServerPermission(permission);
  
  if (!session) {
    return { success: false as const, message: "Não autorizado. Sessão inválida." };
  }

  if (!hasAccess) {
    return { success: false as const, message: `Acesso negado. Requer permissão: ${permission}` };
  }

  return { success: true as const, session };
}
