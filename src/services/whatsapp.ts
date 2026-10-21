// Estruturar serviço básico no
// backend para envio de
// solicitações HTTP à API do
// WhatsApp.

export async function enviarMensagemWhatsApp(numeroDestino: string, texto: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: numeroDestino,
      type: 'text',
      text: { body: texto },
    }),
  });

  return response.json();
}