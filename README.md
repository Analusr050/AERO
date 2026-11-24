# AERO

Assistente Eletrônico de Respostas Otimizadas — bot de atendimento no WhatsApp com
histórico de conversas persistido em PostgreSQL e painel em tempo real.

## Funcionalidades

- Recebe mensagens de texto pelo webhook da WhatsApp Cloud API.
- Responde o fluxo de pedidos (saudação, confirmação e instrução).
- Grava **cada mensagem recebida e enviada** na tabela `Mensagem`.
- Exibe as conversas salvas em `/historico`, atualizando a cada 2 segundos.

## Como rodar

Pré-requisitos: Node.js 20+ e PostgreSQL em execução.

```bash
# 1. Dependências
npm install

# 2. Configuração
cp .env.example .env
# ajuste DATABASE_URL e demais variáveis

# 3. Banco de dados
npx prisma migrate dev

# 4. Servidor
npm run dev
```

Abra:

- Painel de conversas: <http://localhost:3000/historico>
- Health check: <http://localhost:3000/api/health>

Com `WHATSAPP_MOCK=true` (padrão no `.env.example`), os envios são simulados no
console — não é necessário token da Meta para testar o fluxo.

## Verificação

```bash
# Dispara mensagens no webhook e confirma a persistência no PostgreSQL
npm run test:historico

# Mostra os totais e as últimas mensagens gravadas
npm run verificar
```

## Estrutura

```
src/
  app/
    api/conversas/route.ts   # API do histórico (polling)
    api/webhook/route.ts     # recebe eventos do WhatsApp
    historico/               # painel em tempo real
  lib/prisma.ts              # instância única do PrismaClient
  services/historico.ts      # gravação de mensagens recebidas/enviadas
  services/whatsapp.ts       # envio (real ou simulado)
prisma/schema.prisma         # modelos Usuario e Mensagem
scripts/verificar-historico.mjs
tests/historico.test.mjs
```

O relatório completo da entrega está em [RELATORIO.md](./RELATORIO.md).
