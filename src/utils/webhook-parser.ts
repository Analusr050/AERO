import type { DadosMensagemRecebida, WhatsAppWebhookPayload } from "@/types/whatsapp";

export function ehPayloadValido(payload: unknown): payload is WhatsAppWebhookPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return p.object === "whatsapp_business_account" && Array.isArray(p.entry) && p.entry.length > 0;
}

export function parsearPayloadWebhook(
  payload: WhatsAppWebhookPayload,
): DadosMensagemRecebida | null {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const mensagens = change.value.messages;

      if (!mensagens || mensagens.length === 0) continue;

      for (const mensagem of mensagens) {
        if (mensagem.type === "text" && mensagem.text?.body) {
          return {
            remetente: mensagem.from,
            texto: mensagem.text.body.trim(),
            mensagemId: mensagem.id,
            timestamp: mensagem.timestamp,
          };
        }
      }
    }
  }

  return null;
}
