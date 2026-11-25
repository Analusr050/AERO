"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Direcao = "RECEBIDA" | "ENVIADA";
type StatusConexao = "conectando" | "ao-vivo" | "erro";

interface MensagemAPI {
  id: number;
  telefone: string;
  nome: string | null;
  direcao: Direcao;
  texto: string;
  criadaEm: string;
}

interface RespostaAPI {
  mensagens: MensagemAPI[];
  ultimoId: number;
  total: number;
  recebidas: number;
  enviadas: number;
}

interface Conversa {
  telefone: string;
  nome: string | null;
  mensagens: MensagemAPI[];
  ultimaEm: string;
  recebidas: number;
  enviadas: number;
}

const INTERVALO_ATUALIZACAO = 2000;
const LIMITE_POR_CONSULTA = 200;
const MAX_MENSAGENS_EM_MEMORIA = 500;

const ROTULO_STATUS: Record<StatusConexao, string> = {
  conectando: "Conectando ao banco…",
  "ao-vivo": "Ao vivo",
  erro: "Sem conexão",
};

function formatarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");

  if (digitos.length === 13) {
    return `+${digitos.slice(0, 2)} (${digitos.slice(2, 4)}) ${digitos.slice(4, 9)}-${digitos.slice(9)}`;
  }
  if (digitos.length === 12) {
    return `+${digitos.slice(0, 2)} (${digitos.slice(2, 4)}) ${digitos.slice(4, 8)}-${digitos.slice(8)}`;
  }
  return telefone;
}

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;

  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();

  if (mesmoDia) {
    return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataHoraCompleta(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR");
}

function inicialDe(conversa: Conversa): string {
  const base = conversa.nome?.trim() || conversa.telefone;
  return base.charAt(0) || "?";
}

export default function PainelConversas() {
  const [mensagens, setMensagens] = useState<MensagemAPI[]>([]);
  const [totais, setTotais] = useState({ total: 0, recebidas: 0, enviadas: 0 });
  const [status, setStatus] = useState<StatusConexao>("conectando");
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  const ultimoIdRef = useRef(0);
  const consultaEmAndamentoRef = useRef(false);
  const containersRef = useRef(new Map<string, HTMLDivElement>());

  const buscarMensagens = useCallback(async (incremental: boolean) => {
    if (consultaEmAndamentoRef.current) return;
    consultaEmAndamentoRef.current = true;

    try {
      const apos = incremental ? ultimoIdRef.current : 0;
      const resposta = await fetch(`/api/conversas?apos=${apos}&limite=${LIMITE_POR_CONSULTA}`, {
        cache: "no-store",
      });

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }

      const dados = (await resposta.json()) as RespostaAPI;

      if (dados.ultimoId > ultimoIdRef.current) {
        ultimoIdRef.current = dados.ultimoId;
      }

      if (dados.mensagens.length > 0) {
        setMensagens((anteriores) => {
          const porId = new Map(anteriores.map((mensagem) => [mensagem.id, mensagem]));
          for (const mensagem of dados.mensagens) {
            porId.set(mensagem.id, mensagem);
          }
          return [...porId.values()].sort((a, b) => a.id - b.id).slice(-MAX_MENSAGENS_EM_MEMORIA);
        });
      }

      setTotais({
        total: dados.total,
        recebidas: dados.recebidas,
        enviadas: dados.enviadas,
      });
      setAtualizadoEm(new Date());
      setStatus("ao-vivo");
      setErro(null);
    } catch (falha) {
      setStatus("erro");
      setErro(falha instanceof Error ? falha.message : "Falha desconhecida");
    } finally {
      consultaEmAndamentoRef.current = false;
    }
  }, []);

  useEffect(() => {
    void buscarMensagens(false);
    const intervalo = window.setInterval(() => {
      void buscarMensagens(true);
    }, INTERVALO_ATUALIZACAO);

    return () => window.clearInterval(intervalo);
  }, [buscarMensagens]);

  const conversas = useMemo<Conversa[]>(() => {
    const porTelefone = new Map<string, Conversa>();

    for (const mensagem of mensagens) {
      const existente = porTelefone.get(mensagem.telefone);

      if (existente) {
        existente.mensagens.push(mensagem);
        existente.ultimaEm = mensagem.criadaEm;
        if (mensagem.nome) existente.nome = mensagem.nome;
        if (mensagem.direcao === "RECEBIDA") existente.recebidas += 1;
        else existente.enviadas += 1;
        continue;
      }

      porTelefone.set(mensagem.telefone, {
        telefone: mensagem.telefone,
        nome: mensagem.nome,
        mensagens: [mensagem],
        ultimaEm: mensagem.criadaEm,
        recebidas: mensagem.direcao === "RECEBIDA" ? 1 : 0,
        enviadas: mensagem.direcao === "ENVIADA" ? 1 : 0,
      });
    }

    return [...porTelefone.values()].sort((a, b) => b.ultimaEm.localeCompare(a.ultimaEm));
  }, [mensagens]);

  useEffect(() => {
    if (mensagens.length === 0) return;

    for (const container of containersRef.current.values()) {
      container.scrollTop = container.scrollHeight;
    }
  }, [mensagens]);

  const registrarContainer = useCallback((telefone: string, elemento: HTMLDivElement | null) => {
    if (elemento) {
      containersRef.current.set(telefone, elemento);
    } else {
      containersRef.current.delete(telefone);
    }
  }, []);

  return (
    <>
      <div className="barra-status">
        <span className={`status-pill ${status}`}>
          <span className="ponto" />
          {ROTULO_STATUS[status]}
        </span>
        <span>
          Última atualização:{" "}
          {atualizadoEm ? atualizadoEm.toLocaleTimeString("pt-BR") : "aguardando…"}
        </span>
        <span>Atualização automática a cada 2s</span>

        <div className="contadores">
          <span className="contador">
            Total <strong>{totais.total}</strong>
          </span>
          <span className="contador">
            Recebidas <strong>{totais.recebidas}</strong>
          </span>
          <span className="contador">
            Enviadas <strong>{totais.enviadas}</strong>
          </span>
        </div>
      </div>

      {erro && (
        <div className="alerta">
          Não foi possível atualizar o histórico ({erro}). Nova tentativa em instantes…
        </div>
      )}

      {conversas.length === 0 ? (
        <section className="vazio">
          <h2>Nenhuma conversa registrada ainda</h2>
          <p>
            Envie uma mensagem para o webhook em <code>POST /api/webhook</code> ou rode{" "}
            <code>npm run test:historico</code>. Assim que as mensagens forem gravadas no
            PostgreSQL, elas aparecem aqui automaticamente.
          </p>
        </section>
      ) : (
        <section className="grade-conversas" aria-label="Conversas registradas">
          {conversas.map((conversa) => (
            <article className="conversa-card" key={conversa.telefone}>
              <header className="conversa-topo">
                <span className="avatar">{inicialDe(conversa)}</span>
                <div className="identificacao">
                  <strong>{conversa.nome ?? formatarTelefone(conversa.telefone)}</strong>
                  <span>
                    {conversa.nome ? formatarTelefone(conversa.telefone) : "Cliente WhatsApp"} ·{" "}
                    {conversa.recebidas} recebida(s) · {conversa.enviadas} enviada(s)
                  </span>
                </div>
                <span className="badge-contagem">
                  {conversa.mensagens.length} msg{conversa.mensagens.length === 1 ? "" : "s"}
                </span>
              </header>

              <div
                className="mensagens"
                ref={(elemento) => {
                  registrarContainer(conversa.telefone, elemento);
                }}
              >
                {conversa.mensagens.map((mensagem) => (
                  <div
                    className={`bolha ${mensagem.direcao === "RECEBIDA" ? "recebida" : "enviada"}`}
                    key={mensagem.id}
                  >
                    <p>{mensagem.texto}</p>
                    <span className="hora" title={formatarDataHoraCompleta(mensagem.criadaEm)}>
                      {formatarDataHora(mensagem.criadaEm)}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
