import type { ContratoMensagensMVP } from '@/types/whatsapp';

export const BOT_MESSAGES: ContratoMensagensMVP = {
  saudacao: 'Olá! Seja bem-vindo ao sistema AERO.',

  menuOpcoes: `Como podemos te ajudar hoje?

1 - Ver Cardápio / Fazer Pedido
2 - Acompanhar Status do Pedido
3 - Falar com Atendente 

Digite o número da opção desejada.`,

  despedida: 'Atendimento finalizado. Obrigado por utilizar o AERO!',

  opcaoInvalida: 'Opção não reconhecida. Por favor, escolha um número do menu.',
};

export const SAUDACAO_AUTOMATICA =
  `AERO — Assistente Eletrônico de Respostas Otimizadas\n\n` +
  `Olá! Recebemos sua mensagem e estamos aqui para te ajudar. \n\n` +
  `Acesse nosso cardápio pelo link abaixo, escolha o que deseja e ` +
  `responda *"confirmar"* quando estiver pronto para fazer seu pedido.\n\n` +
  `Link do Cardápio: {{link_cardapio}}\n\n` +
  `_Caso não queira fazer um pedido agora, é só nos avisar!_`;

export function montarSaudacaoComLink(linkCardapio: string): string {
  return SAUDACAO_AUTOMATICA.replace('{{link_cardapio}}', linkCardapio);
}

export const PALAVRAS_CONFIRMACAO: string[] = [
  'confirmar',
  'confirmo',
  'quero',
  'sim',
  'pedido',
  'fazer pedido',
];

export const MENSAGEM_INSTRUCAO =
  `Não consegui identificar sua confirmação. \n\n` +
  `Para confirmar seu pedido, responda com uma das opções:\n` +
  `confirmar | sim | quero | pedido\n\n` +
  `Ou acesse novamente o cardápio e revise sua escolha.`;

export const MENSAGEM_CONFIRMACAO_PEDIDO =
  `Pedido recebido com sucesso!\n\n` +
  `Seu pedido foi registrado e o estabelecimento já foi notificado.\n` +
  `Assim que houver uma atualização, te avisamos aqui mesmo! \n\n` +
  `_Para acompanhar o status, basta continuar conversando neste chat._`;

/**
 * @param 
 */
export function montarNotificacaoProprietario(telefoneCliente: string): string {
  return (
    `Novo pedido recebido!\n\n` +
    `Um cliente (${telefoneCliente}) confirmou um pedido pelo AERO.\n` +
    `Acesse o painel para visualizar os detalhes e atualizar o status.`
  );
}
