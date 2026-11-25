import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paraMensagemHistorico } from "@/services/historico";

const LIMITE_PADRAO = 200;
const LIMITE_MAXIMO = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aposTexto = searchParams.get("apos");
  const limiteTexto = searchParams.get("limite");

  const apos = aposTexto ? Number.parseInt(aposTexto, 10) : 0;
  if (!Number.isFinite(apos) || apos < 0) {
    return NextResponse.json({ erro: "Parâmetro 'apos' inválido" }, { status: 400 });
  }

  const limiteInformado = Number.parseInt(limiteTexto ?? String(LIMITE_PADRAO), 10);
  const limite = Number.isFinite(limiteInformado)
    ? Math.min(Math.max(limiteInformado, 1), LIMITE_MAXIMO)
    : LIMITE_PADRAO;

  try {
    const [mensagens, total, porDirecao, maiorId] = await Promise.all([
      prisma.mensagem.findMany({
        where: apos > 0 ? { id: { gt: apos } } : undefined,
        orderBy: { id: apos > 0 ? "asc" : "desc" },
        take: limite,
        include: { usuario: { select: { telefone: true, nome: true } } },
      }),
      prisma.mensagem.count(),
      prisma.mensagem.groupBy({ by: ["direcao"], _count: { _all: true } }),
      prisma.mensagem.aggregate({ _max: { id: true } }),
    ]);

    const emOrdemCronologica = apos > 0 ? mensagens : [...mensagens].reverse();
    const recebidas = porDirecao.find((linha) => linha.direcao === "RECEBIDA")?._count._all ?? 0;
    const enviadas = porDirecao.find((linha) => linha.direcao === "ENVIADA")?._count._all ?? 0;

    return NextResponse.json({
      mensagens: emOrdemCronologica.map(paraMensagemHistorico),
      ultimoId: maiorId._max.id ?? 0,
      total,
      recebidas,
      enviadas,
      servidorEm: new Date().toISOString(),
    });
  } catch (erro) {
    console.error("[AERO] Falha ao consultar o histórico:", erro);
    return NextResponse.json({ erro: "Falha ao consultar o histórico" }, { status: 500 });
  }
}
