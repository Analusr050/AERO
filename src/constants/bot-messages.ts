// Mapear o fluxo mínimo de
// atendimento (saudação e menu
// principal) para o MVP.

// Acompanhar validação dos
// templates e preparar respostas
// estáticas de teste.

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