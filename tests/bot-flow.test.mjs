const BASE_URL = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhook";

/**
 * @param numeroRemetente
 * @param textoMensagem
 */

function montarPayload(numeroRemetente, textoMensagem) {
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
                  id: `msg_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: textoMensagem },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function simularMensagem(label, numeroRemetente, textoMensagem) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(` TESTE: ${label}`);
  console.log(`   De: ${numeroRemetente}`);
  console.log(`   Texto: "${textoMensagem}"`);

  const payload = montarPayload(numeroRemetente, textoMensagem);

  try {
    const resposta = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const corpo = await resposta.json();
    const icone = resposta.ok ? "✅" : "❌";
    console.log(`   ${icone} Status HTTP: ${resposta.status}`);
    console.log(`   Resposta do servidor:`, corpo);
  } catch (erro) {
    console.error(`   Falha na requisição:`, erro.message);
    console.error(`      Certifique-se de que o servidor está rodando em ${BASE_URL}`);
  }
}

async function rodarTestes() {
  console.log("AERO — Suite de Testes do Fluxo MVP");
  console.log(`Webhook URL: ${BASE_URL}`);
  console.log(`${new Date().toLocaleString("pt-BR")}`);

  await simularMensagem(
    "Primeira mensagem — deve receber saudação + link do cardápio",
    "5511991234567",
    "oi",
  );

  await new Promise((r) => setTimeout(r, 300));

  await simularMensagem(
    "Confirmação de pedido — deve registrar e notificar proprietário",
    "5511991234567",
    "quero confirmar meu pedido",
  );

  await new Promise((r) => setTimeout(r, 300));

  await simularMensagem("Saudação com novo número", "5521988887777", "olá");

  await new Promise((r) => setTimeout(r, 300));

  await simularMensagem(
    'Confirmação com "sim" — deve aceitar como confirmação',
    "5521988887777",
    "sim",
  );

  await new Promise((r) => setTimeout(r, 300));

  await simularMensagem(
    "Saudação — novo número para testar palavra inválida",
    "5531977776666",
    "boa tarde",
  );

  await new Promise((r) => setTimeout(r, 300));

  await simularMensagem(
    "Palavra inválida — deve receber mensagem de instrução",
    "5531977776666",
    "não sei o que fazer",
  );

  await new Promise((r) => setTimeout(r, 300));

  console.log(`\n${"─".repeat(60)}`);
  console.log(' TESTE: Payload inválido — deve retornar status "ignorado"');
  try {
    const resposta = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object: "outro_sistema", entry: [] }),
    });
    const corpo = await resposta.json();
    console.log(`   ✅ Status HTTP: ${resposta.status}`);
    console.log(`   Resposta:`, corpo);
  } catch (erro) {
    console.error("   ❌", erro.message);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(" TESTE: GET Webhook — Handshake de verificação da Meta");
  const verifyToken = process.env.VERIFY_TOKEN ?? "meu_token_secreto";
  const urlHandshake = new URL(BASE_URL);
  urlHandshake.searchParams.set("hub.mode", "subscribe");
  urlHandshake.searchParams.set("hub.verify_token", verifyToken);
  urlHandshake.searchParams.set("hub.challenge", "challenge_12345");
  try {
    const resposta = await fetch(urlHandshake.toString(), { method: "GET" });
    const corpo = await resposta.text();
    const icone = resposta.ok ? "✅" : "❌";
    console.log(`   ${icone} Status HTTP: ${resposta.status}`);
    console.log(`   Challenge retornado: "${corpo}"`);
  } catch (erro) {
    console.error("   ❌", erro.message);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(" Todos os testes executados!");
  console.log("   Verifique os logs do servidor Next.js para confirmar");
  console.log("   o processamento e os envios simulados à API do WhatsApp.");
  console.log(`${"═".repeat(60)}\n`);
}

rodarTestes();
