import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // 1. Criar o Hash da senha (segurança real)
  const passwordHash = await hash("123456", 6);

  // 2. Criar o Dono Inicial
  const donoEmail = "admin@losscontrol.com";

  const dono = await prisma.user.upsert({
    where: { email: donoEmail },
    update: {
      passwordHash: passwordHash, // Atualiza a senha se já existir
    },
    create: {
      nome: "Admin LossControl",
      email: donoEmail,
      passwordHash: passwordHash,
      role: "dono",
      avatarUrl: "https://github.com/shadcn.png",
    },
  });

  console.log(`👤 Usuário criado: ${dono.email}`);
  console.log(`🔑 Senha inicial: 123456`);

  // 3. Criar Configuração Inicial
  await prisma.configuracao.upsert({
    where: { donoId: dono.id },
    update: {},
    create: {
      donoId: dono.id,
      empresaNome: "Minha Empresa",
      limiteDiario: 1000.0,
    },
  });

  console.log("✅ Seed concluído com sucesso!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
