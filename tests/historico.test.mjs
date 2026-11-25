import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhook";
const prisma = new PrismaClient();

const sufixo = Date.now();
const telefoneCliente = `5511${String(sufixo).slice(-9)}`;
const idRecebida = `teste_recebida_${sufixo}`;
const idConfirmacao = `teste_confirmacao_${sufixo}`;

const falhas = [];

function verificar(condicao, descricao, detalhe) {
  if (condicao) {
    console.log(`  ✅ ${descricao}`);
  } else {
    console.log(`  ❌ ${descricao}${detalhe ? ` — ${detalhe}` : ""}`);
    falhas.push(descricao);
  }
}

function montarPayload(numeroRemetente, id, texto) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "ENTRY_ID_TESTE",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550001234",
                phone_number_id: "PHONE_NUMBER_ID_TESTE",
              },
              messages: [
                {
                  from: numeroRemetente,
                  id,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: texto },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function enviarWebhook(payload) {
  const resposta = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(`Webhook respondeu HTTP ${resposta.status}: ${JSON.stringify(corpo)}`);
  }

  return corpo;
}

async function principal() {
  console.log("AERO — Teste de persistência do histórico");
  console.log(`Webhook: ${BASE_URL}`);
  console.log(`Cliente de teste: ${telefoneCliente}\n`);

  console.log("1) Enviando mensagens para o webhook…");
  await enviarWebhook(montarPayload(telefoneCliente, idRecebida, "oi"));
  await new Promise((resolve) => setTimeout(resolve, 250));

  // Reenvio do mesmo message id (a Meta pode repetir entregas): não pode duplicar.
  await enviarWebhook(montarPayload(telefoneCliente, idRecebida, "oi"));
  await new Promise((resolve) => setTimeout(resolve, 250));

  await enviarWebhook(montarPayload(telefoneCliente, idConfirmacao, "quero confirmar meu pedido"));
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("   Webhook respondeu às 3 requisições.\n");

  console.log("2) Consultando o PostgreSQL…");
  const usuario = await prisma.usuario.findUnique({
    where: { telefone: telefoneCliente },
    include: { mensagens: { orderBy: { id: "asc" } } },
  });

  verificar(Boolean(usuario), "Usuário do remetente foi criado");
  verificar(
    usuario?.mensagens.some((mensagem) => mensagem.direcao === "RECEBIDA"),
    "Mensagem recebida foi persistida",
  );
  verificar(
    usuario?.mensagens.some((mensagem) => mensagem.direcao === "ENVIADA"),
    "Mensagem enviada foi persistida",
  );

  const recebidas = usuario?.mensagens.filter((m) => m.direcao === "RECEBIDA") ?? [];
  const enviadas = usuario?.mensagens.filter((m) => m.direcao === "ENVIADA") ?? [];

  verificar(
    recebidas.length === 2,
    "Reenvio da Meta não duplicou a mensagem recebida (whatsappId único)",
    `encontradas: ${recebidas.length}`,
  );
  verificar(
    recebidas.some((m) => m.texto === "oi") &&
      recebidas.some((m) => m.texto === "quero confirmar meu pedido"),
    "Textos recebidos conferem com o que foi enviado",
  );
  verificar(
    enviadas.length >= 2,
    "Bot gravou pelo menos saudação e confirmação",
    `enviadas: ${enviadas.length}`,
  );

  const duplicadas = await prisma.mensagem.count({ where: { whatsappId: idRecebida } });
  verificar(duplicadas === 1, "Existe apenas um registro para o whatsappId reenviado");

  const total = await prisma.mensagem.count();

  console.log("\n3) Registros encontrados para este cliente:");
  for (const mensagem of usuario?.mensagens ?? []) {
    const direcao = mensagem.direcao === "RECEBIDA" ? "↓ RECEB" : "↑ ENV  ";
    const texto = mensagem.texto.replace(/\s+/g, " ").slice(0, 64);
    console.log(`   #${String(mensagem.id).padStart(4, "0")} ${direcao} ${texto}`);
  }
  console.log(`\n   Total de mensagens na tabela: ${total}`);

  console.log(`\n${"═".repeat(72)}`);
  if (falhas.length > 0) {
    console.log(`RESULTADO: ${falhas.length} verificação(ões) falharam.`);
    process.exitCode = 1;
  } else {
    console.log("RESULTADO: persistência de mensagens recebidas e enviadas CONFIRMADA.");
  }
  console.log("═".repeat(72));
}

try {
  await principal();
} catch (erro) {
  console.error("\nTeste interrompido:", erro.message);
  console.error(`Verifique se o servidor está rodando em ${BASE_URL}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
