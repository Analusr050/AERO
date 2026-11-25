import type { Mensagem, Usuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MensagemComUsuario = Mensagem & {
  usuario: Pick<Usuario, "telefone" | "nome">;
};

export interface MensagemHistorico {
  id: number;
  telefone: string;
  nome: string | null;
  direcao: "RECEBIDA" | "ENVIADA";
  texto: string;
  criadaEm: string;
}

/**
 * Garante que exista um usuário para o telefone informado.
 * O nome só é atualizado quando uma fonte confiável o envia.
 */
async function garantirUsuario(telefone: string, nome?: string | null) {
  return prisma.usuario.upsert({
    where: { telefone },
    update: nome ? { nome } : {},
    create: { telefone, nome: nome ?? null },
  });
}

/**
 * Grava uma mensagem no histórico. O erro é registrado no console, mas não
 * interrompe o atendimento caso o banco esteja indisponível.
 */
async function registrar(
  telefone: string,
  direcao: "RECEBIDA" | "ENVIADA",
  texto: string,
  whatsappId?: string | null,
): Promise<Mensagem | null> {
  try {
    const usuario = await garantirUsuario(telefone);
    const dados = {
      usuarioId: usuario.id,
      direcao,
      texto,
      whatsappId: whatsappId ?? null,
    };

    if (whatsappId) {
      // O upsert evita duplicidade quando a Meta reenvia o mesmo evento.
      return await prisma.mensagem.upsert({
        where: { whatsappId },
        update: {},
        create: dados,
      });
    }

    return await prisma.mensagem.create({ data: dados });
  } catch (erro) {
    console.error(`[AERO] Falha ao registrar mensagem ${direcao} de ${telefone}:`, erro);
    return null;
  }
}

export function registrarMensagemRecebida(
  telefone: string,
  texto: string,
  whatsappId?: string,
): Promise<Mensagem | null> {
  return registrar(telefone, "RECEBIDA", texto, whatsappId);
}

export function registrarMensagemEnviada(
  telefone: string,
  texto: string,
): Promise<Mensagem | null> {
  return registrar(telefone, "ENVIADA", texto);
}

export function paraMensagemHistorico(mensagem: MensagemComUsuario): MensagemHistorico {
  return {
    id: mensagem.id,
    telefone: mensagem.usuario.telefone,
    nome: mensagem.usuario.nome,
    direcao: mensagem.direcao,
    texto: mensagem.texto,
    criadaEm: mensagem.criadaEm.toISOString(),
  };
}
