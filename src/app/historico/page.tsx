import Link from "next/link";
import PainelConversas from "./painel-conversas";

export const metadata = {
  title: "AERO — Histórico de Conversas",
  description: "Mensagens recebidas e enviadas registradas no PostgreSQL em tempo real.",
};

export default function HistoricoPage() {
  return (
    <main className="pagina">
      <header className="cabecalho">
        <div>
          <Link className="voltar" href="/">
            ← AERO
          </Link>
          <h1>Histórico de conversas</h1>
          <p>Mensagens recebidas e enviadas salvas no banco, atualizadas a cada 2 segundos.</p>
        </div>
        <a className="botao" href="/api/conversas" target="_blank" rel="noreferrer">
          Ver JSON da API
        </a>
      </header>

      <PainelConversas />
    </main>
  );
}
