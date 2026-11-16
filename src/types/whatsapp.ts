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

export interface WhatsAppTextoRecebido {
  body: string;
}

export interface WhatsAppMensagem {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'interactive' | 'button';
  text?: WhatsAppTextoRecebido;
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppValue {
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  messages?: WhatsAppMensagem[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: 'messages';
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppEntry[];
}

export interface DadosMensagemRecebida {
  remetente: string;
  texto: string;
  mensagemId: string;
  timestamp: string;
}
