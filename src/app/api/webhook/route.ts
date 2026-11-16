import { NextResponse } from 'next/server';
import { ehPayloadValido, parsearPayloadWebhook } from '@/utils/webhook-parser';
import { enviarMensagemWhatsApp } from '@/services/whatsapp';
import {
  montarSaudacaoComLink,
  MENSAGEM_INSTRUCAO,
  MENSAGEM_CONFIRMACAO_PEDIDO,
  PALAVRAS_CONFIRMACAO,
  montarNotificacaoProprietario,
} from '@/constants/bot-messages';
import type { WhatsAppWebhookPayload } from '@/types/whatsapp';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Proibido', { status: 403 });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ erro: 'Body inválido' }, { status: 400 });
  }

  if (!ehPayloadValido(payload)) {
    return NextResponse.json({ status: 'ignorado' }, { status: 200 });
  }

  const dados = parsearPayloadWebhook(payload as WhatsAppWebhookPayload);

  if (!dados) {
    return NextResponse.json({ status: 'sem_mensagem_texto' }, { status: 200 });
  }

  const { remetente, texto } = dados;

  try {
    await processarMensagemEResponder(remetente, texto);
  } catch (erro) {
    console.error('[AERO] Falha ao processar/responder mensagem:', erro);
  }

  return NextResponse.json({ status: 'recebido' }, { status: 200 });
}


const estadosEmMemoria = new Map<string, 'INICIAL' | 'LINK_ENVIADO'>();

async function processarMensagemEResponder(
  remetente: string,
  texto: string
): Promise<void> {
  const estadoAtual = estadosEmMemoria.get(remetente) ?? 'INICIAL';
  const linkCardapio = process.env.LINK_CARDAPIO ?? 'https://seusite.com/cardapio';
  const telefoneProprietario = process.env.TELEFONE_PROPRIETARIO ?? '';

  if (estadoAtual === 'INICIAL') {
    const saudacao = montarSaudacaoComLink(linkCardapio);
    await enviarMensagemWhatsApp(remetente, saudacao);

    estadosEmMemoria.set(remetente, 'LINK_ENVIADO');
    return;
  }

  if (estadoAtual === 'LINK_ENVIADO') {
    const textoSanitizado = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const confirmou = PALAVRAS_CONFIRMACAO.some((palavra) =>
      textoSanitizado.includes(palavra)
    );

    if (confirmou) {
      await enviarMensagemWhatsApp(remetente, MENSAGEM_CONFIRMACAO_PEDIDO);

      if (telefoneProprietario) {
        const notificacao = montarNotificacaoProprietario(remetente);
        await enviarMensagemWhatsApp(telefoneProprietario, notificacao);
      }

      estadosEmMemoria.delete(remetente);
      return;
    }

    await enviarMensagemWhatsApp(remetente, MENSAGEM_INSTRUCAO);
  }
}
