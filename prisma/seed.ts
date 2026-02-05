import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando Seed (População do Banco)...");

  // Senha padrão "1234" com hash SHA-256 (mesma lógica do sistema)
  const passwordRaw = "1234";
  const passwordHash = createHash("sha256").update(passwordRaw).digest("hex");

  const users = [
    {
      email: "gama@losscontrol.com",
      nome: "Leda Paula",
      role: "dono",
      loja: "Gama",
    },
    {
      email: "fporto@losscontrol.com",
      nome: "Leda Paula",
      role: "dono",
      loja: "F. Porto",
    },
    {
      email: "jardins@losscontrol.com",
      nome: "Leda Paula",
      role: "dono",
      loja: "Jardins",
    },
  ];

  for (const u of users) {
    // Upsert: Se existir atualiza, se não existir cria
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: passwordHash, // Garante que a senha seja 1234
        role: u.role as any, // Garante que seja dono
      },
      create: {
        email: u.email,
        nome: u.nome,
        passwordHash: passwordHash,
        role: u.role as any,
      },
    });
    console.log(`✅ Conta criada/atualizada: ${u.email} [${u.loja}]`);
  }

  console.log("🏁 Seed finalizado com sucesso!");
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
