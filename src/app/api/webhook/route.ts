import { NextResponse } from "next/server";
import {
  MENSAGEM_CONFIRMACAO_PEDIDO,
  MENSAGEM_INSTRUCAO,
  montarNotificacaoProprietario,
  montarSaudacaoComLink,
  PALAVRAS_CONFIRMACAO,
} from "@/constants/bot-messages";
import { registrarMensagemEnviada, registrarMensagemRecebida } from "@/services/historico";
import { enviarMensagemWhatsApp } from "@/services/whatsapp";
import type { WhatsAppWebhookPayload } from "@/types/whatsapp";
import { ehPayloadValido, parsearPayloadWebhook } from "@/utils/webhook-parser";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Proibido", { status: 403 });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: "Body inválido" }, { status: 400 });
  }

  if (!ehPayloadValido(payload)) {
    return NextResponse.json({ status: "ignorado" }, { status: 200 });
  }

  const dados = parsearPayloadWebhook(payload as WhatsAppWebhookPayload);

  if (!dados) {
    return NextResponse.json({ status: "sem_mensagem_texto" }, { status: 200 });
  }

  const { remetente, texto, mensagemId } = dados;

  // Persiste a mensagem recebida antes de processar a resposta do bot.
  await registrarMensagemRecebida(remetente, texto, mensagemId);

  try {
    await processarMensagemEResponder(remetente, texto);
  } catch (erro) {
    console.error("[AERO] Falha ao processar/responder mensagem:", erro);
  }

  return NextResponse.json({ status: "recebido" }, { status: 200 });
}

const estadosEmMemoria = new Map<string, "INICIAL" | "LINK_ENVIADO">();

/**
 * Envia a resposta pelo WhatsApp e registra a mensagem no histórico,
 * independentemente de a API externa confirmar o envio.
 */
async function responder(telefone: string, texto: string): Promise<void> {
  await enviarMensagemWhatsApp(telefone, texto);
  await registrarMensagemEnviada(telefone, texto);
}

async function processarMensagemEResponder(remetente: string, texto: string): Promise<void> {
  const estadoAtual = estadosEmMemoria.get(remetente) ?? "INICIAL";
  const linkCardapio = process.env.LINK_CARDAPIO ?? "https://seusite.com/cardapio";
  const telefoneProprietario = process.env.TELEFONE_PROPRIETARIO ?? "";

  if (estadoAtual === "INICIAL") {
    const saudacao = montarSaudacaoComLink(linkCardapio);
    await responder(remetente, saudacao);

    estadosEmMemoria.set(remetente, "LINK_ENVIADO");
    return;
  }

  if (estadoAtual === "LINK_ENVIADO") {
    const textoSanitizado = texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const confirmou = PALAVRAS_CONFIRMACAO.some((palavra) => textoSanitizado.includes(palavra));

    if (confirmou) {
      await responder(remetente, MENSAGEM_CONFIRMACAO_PEDIDO);

      if (telefoneProprietario) {
        const notificacao = montarNotificacaoProprietario(remetente);
        await responder(telefoneProprietario, notificacao);
      }

      estadosEmMemoria.delete(remetente);
      return;
    }

    await responder(remetente, MENSAGEM_INSTRUCAO);
  }
}
