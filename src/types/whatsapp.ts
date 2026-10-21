// Definir contrato do JSON de
// mensagens do MVP (saudação,
// opções e despedida).

export interface MensagemTextoPayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

export interface ContratoMensagensMVP {
  saudacao: string;
  menuOpcoes: string;
  despedida: string;
  opcaoInvalida: string;
} 