import Link from "next/link";

export default function Home() {
  return (
    <main className="pagina">
      <section className="hero">
        <span className="etiqueta">AERO</span>
        <h1>Atendimento automático no WhatsApp, com histórico em tempo real.</h1>
        <p>
          O assistente recebe mensagens, responde o fluxo de pedidos e grava cada mensagem recebida
          e enviada no PostgreSQL. O painel abaixo mostra as conversas salvas sendo atualizadas ao
          vivo.
        </p>
        <div className="acoes">
          <Link className="botao primario" href="/historico">
            Abrir painel de conversas
          </Link>
          <a className="botao" href="/api/health">
            Status da API
          </a>
        </div>
      </section>

      <section className="cards-info">
        <article className="info-card">
          <h2>1. Receber</h2>
          <p>O webhook interpreta o payload da Meta e registra a mensagem recebida.</p>
        </article>
        <article className="info-card">
          <h2>2. Responder</h2>
          <p>O fluxo do bot responde e cada resposta também é gravada no histórico.</p>
        </article>
        <article className="info-card">
          <h2>3. Acompanhar</h2>
          <p>O painel consulta o banco a cada 2 segundos e exibe as conversas em tempo real.</p>
        </article>
      </section>
    </main>
  );
}
