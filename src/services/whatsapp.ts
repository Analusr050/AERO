export interface ResultadoEnvioWhatsApp {
  sucesso: boolean;
  simulado?: boolean;
  resposta?: unknown;
  erro?: string;
}

const MOCK_PADRAO = "true";

function envioSimulado(): boolean {
  if (process.env.WHATSAPP_MOCK === MOCK_PADRAO) return true;
  return !process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID;
}

export async function enviarMensagemWhatsApp(
  numeroDestino: string,
  texto: string,
): Promise<ResultadoEnvioWhatsApp> {
  if (envioSimulado()) {
    const resumo = texto.replace(/\s+/g, " ").slice(0, 100);
    console.log(`[AERO][MOCK] WhatsApp → ${numeroDestino}: ${resumo}`);
    return { sucesso: true, simulado: true };
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numeroDestino,
        type: "text",
        text: { body: texto },
      }),
    });

    const corpo = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`[AERO] WhatsApp API respondeu HTTP ${response.status}:`, corpo);
      return { sucesso: false, erro: `HTTP ${response.status}`, resposta: corpo };
    }

    return { sucesso: true, resposta: corpo };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error("[AERO] Falha de rede ao enviar mensagem:", mensagem);
    return { sucesso: false, erro: mensagem };
  }
}
