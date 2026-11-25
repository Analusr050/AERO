import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function separador(caractere = "─") {
  console.log(caractere.repeat(88));
}

try {
  const [usuarios, total, recebidas, enviadas, ultima] = await Promise.all([
    prisma.usuario.count(),
    prisma.mensagem.count(),
    prisma.mensagem.count({ where: { direcao: "RECEBIDA" } }),
    prisma.mensagem.count({ where: { direcao: "ENVIADA" } }),
    prisma.mensagem.findFirst({ orderBy: { criadaEm: "desc" } }),
  ]);

  console.log("AERO — Verificação do histórico no PostgreSQL");
  separador("═");
  console.log(`Usuários cadastrados : ${usuarios}`);
  console.log(`Mensagens gravadas   : ${total}`);
  console.log(`  ↓ recebidas        : ${recebidas}`);
  console.log(`  ↑ enviadas         : ${enviadas}`);
  console.log(
    `Última mensagem      : ${
      ultima ? new Date(ultima.criadaEm).toLocaleString("pt-BR") : "nenhuma"
    }`,
  );
  separador("═");

  const ultimas = await prisma.mensagem.findMany({
    orderBy: { id: "desc" },
    take: 20,
    include: { usuario: { select: { telefone: true, nome: true } } },
  });

  if (ultimas.length === 0) {
    console.log("Nenhuma mensagem encontrada.");
    console.log("Envie mensagens ao webhook ou rode: npm run test:historico");
  } else {
    console.log("Últimas 20 mensagens (mais antigas primeiro):\n");
    console.log(
      `${"ID".padStart(5)}  ${"DIREÇÃO".padEnd(9)}  ${"TELEFONE".padEnd(16)} ${"DATA/HORA".padEnd(20)} TEXTO`,
    );
    separador();

    for (const mensagem of [...ultimas].reverse()) {
      const data = new Date(mensagem.criadaEm).toLocaleString("pt-BR");
      const direcao = mensagem.direcao === "RECEBIDA" ? "↓ RECEB" : "↑ ENV  ";
      const texto = mensagem.texto.replace(/\s+/g, " ").slice(0, 52);
      console.log(
        `${String(mensagem.id).padStart(5)}  ${direcao.padEnd(9)}  ${mensagem.usuario.telefone.padEnd(16)} ${data.padEnd(20)} ${texto}`,
      );
    }
  }

  separador("═");
  console.log("Resultado: consulta concluída no banco apontado por DATABASE_URL.");
} catch (erro) {
  console.error("Falha ao consultar o banco de dados:", erro);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
