# Relatório de Entrega — AERO

**Data:** 16/11/2026
**Projeto:** AERO — Assistente Eletrônico de Respostas Otimizadas
**Escopo:** histórico de mensagens no PostgreSQL, verificação da persistência e painel de
conversas em tempo real.

---

## 1. Objetivo

Implementar três novas funcionalidades no AERO:

1. Gravar um histórico simplificado das mensagens **recebidas** e **enviadas** no banco de dados.
2. Verificar a persistência dessas mensagens na tabela do PostgreSQL.
3. Exibir os registros de conversas salvas em tempo real, direto do banco.

Todas as funcionalidades foram implementadas, executadas e validadas localmente.

---

## 2. Resumo das entregas

| # | Requisito | Situação | Evidência |
|---|-----------|----------|-----------|
| 1 | Gravar histórico de mensagens recebidas e enviadas | ✅ Concluído | Tabela `Mensagem` com coluna `direcao` (`RECEBIDA`/`ENVIADA`); gravação no webhook e em cada resposta do bot |
| 2 | Verificar persistência no PostgreSQL | ✅ Concluído | `npm run test:historico` (7 verificações aprovadas) e `npm run verificar` (consulta SQL via Prisma) |
| 3 | Exibir conversas salvas em tempo real | ✅ Concluído | Painel `/historico` com atualização automática a cada 2s via `GET /api/conversas` |

---

## 3. O que foi feito

### 3.1 Base do projeto

- `package.json` restaurado com scripts e dependências (`next`, `react`, `@prisma/client`,
  `prisma`, `typescript`, `@biomejs/biome`).
- `.env` e `.env.example` criados com as variáveis do bot e do banco.
- `src/lib/prisma.ts` criado com instância única do `PrismaClient` (evita múltiplas conexões
  durante o hot reload).
- Banco dedicado **`aero_dev`** criado — o banco `aero` que já existia na máquina (esquema
  antigo, sem registros) **não foi alterado**.
- `next.config` não foi necessário; o build usa o padrão do Next.js 16.

### 3.2 Modelo de dados

`prisma/schema.prisma`:

```prisma
enum DirecaoMensagem {
  RECEBIDA
  ENVIADA
}

model Usuario {
  id        Int        @id @default(autoincrement())
  telefone  String     @unique
  nome      String?
  criadoEm  DateTime   @default(now())
  mensagens Mensagem[]
}

model Mensagem {
  id         Int             @id @default(autoincrement())
  texto      String
  direcao    DirecaoMensagem
  whatsappId String?         @unique
  usuarioId  Int
  criadaEm   DateTime        @default(now())
  usuario    Usuario         @relation(fields: [usuarioId], references: [id])

  @@index([usuarioId, criadaEm])
  @@index([criadaEm])
}
```

Decisões:

- `direcao` identifica se a mensagem foi recebida do cliente ou enviada pelo bot.
- `whatsappId` é único para evitar duplicidade quando a Meta reenvia o mesmo evento.
- Índices em `criadaEm` e `(usuarioId, criadaEm)` aceleram a consulta do painel.

Migration aplicada: `prisma/migrations/20261116141252_historico_mensagens/migration.sql`.

Estrutura confirmada no PostgreSQL:

```
                                    Tabela "public.Mensagem"
   Coluna   |              Tipo               | Pode ser nulo |                 Padrão
------------+---------------------------------+---------------+----------------------------------------
 id         | integer                         | not null      | nextval('"Mensagem_id_seq"'::regclass)
 texto      | text                            | not null      |
 direcao    | "DirecaoMensagem"               | not null      |
 whatsappId | text                            |               |
 usuarioId  | integer                         | not null      |
 criadaEm   | timestamp(3) without time zone  | not null      | CURRENT_TIMESTAMP
Índices:
    "Mensagem_pkey" PRIMARY KEY, btree (id)
    "Mensagem_criadaEm_idx" btree ("criadaEm")
    "Mensagem_usuarioId_criadaEm_idx" btree ("usuarioId", "criadaEm")
    "Mensagem_whatsappId_key" UNIQUE, btree ("whatsappId")
```

### 3.3 Gravação do histórico (requisito 1)

Arquivo `src/services/historico.ts`:

- `registrarMensagemRecebida(telefone, texto, whatsappId)` — cria/atualiza o `Usuario` pelo
  telefone e grava a mensagem com `direcao = RECEBIDA`.
- `registrarMensagemEnviada(telefone, texto)` — grava a resposta com `direcao = ENVIADA`.
- O `whatsappId` usa `upsert`, então reenvios da Meta não duplicam registros.
- Falhas de banco são logadas no console e **não derrubam o atendimento**.

Integração com o fluxo (`src/app/api/webhook/route.ts`):

- A mensagem recebida é gravada logo após o parse do payload, antes de processar a resposta.
- Cada resposta do bot passa pelo helper `responder()`, que envia pelo WhatsApp **e** grava a
  mensagem enviada: saudação, instrução, confirmação e notificação ao proprietário.

`src/services/whatsapp.ts` ganhou o modo `WHATSAPP_MOCK=true`: quando ativo (ou quando
token/phone id estão vazios), o envio é simulado no console. Isso permite validar o fluxo e a
persistência sem depender da API real da Meta.

### 3.4 Verificação da persistência (requisito 2)

**a) Script `scripts/verificar-historico.mjs`** (`npm run verificar`)

Consulta o banco via Prisma e mostra totais por direção + as últimas 20 mensagens:

```
AERO — Verificação do histórico no PostgreSQL
════════════════════════════════════════════════════════════════════════════════════════════════════
Usuários cadastrados : 3
Mensagens gravadas   : 14
  ↓ recebidas        : 5
  ↑ enviadas         : 9
Última mensagem      : 16/11/2026, 14:16:55
════════════════════════════════════════════════════════════════════════════════════════════════════
   ID  DIREÇÃO    TELEFONE         DATA/HORA            TEXTO
────────────────────────────────────────────────────────────────────────────────────────────────────
   10  ↑ ENV      5511838615088    16/11/2026, 14:16:55 AERO — Assistente Eletrônico de Respostas Otimizadas
   11  ↑ ENV      5511838615088    16/11/2026, 14:16:55 Não consegui identificar sua confirmação. Para confi
   12  ↓ RECEB    5511838615088    16/11/2026, 14:16:55 quero confirmar meu pedido
   13  ↑ ENV      5511838615088    16/11/2026, 14:16:55 Pedido recebido com sucesso! Seu pedido foi registra
   14  ↑ ENV      5511999999999    16/11/2026, 14:16:55 Novo pedido recebido! Um cliente (5511838615088) con
```

**b) Teste automatizado `tests/historico.test.mjs`** (`npm run test:historico`)

Dispara três requisições no webhook (incluindo um reenvio com o mesmo `whatsappId`) e consulta
o banco para conferir o resultado:

```
AERO — Teste de persistência do histórico
Webhook: http://localhost:3000/api/webhook
Cliente de teste: 5511838615088

1) Enviando mensagens para o webhook…
   Webhook respondeu às 3 requisições.

2) Consultando o PostgreSQL…
  ✅ Usuário do remetente foi criado
  ✅ Mensagem recebida foi persistida
  ✅ Mensagem enviada foi persistida
  ✅ Reenvio da Meta não duplicou a mensagem recebida (whatsappId único)
  ✅ Textos recebidos conferem com o que foi enviado
  ✅ Bot gravou pelo menos saudação e confirmação
  ✅ Existe apenas um registro para o whatsappId reenviado

3) Registros encontrados para este cliente:
   #0009 ↓ RECEB oi
   #0010 ↑ ENV   AERO — Assistente Eletrônico de Respostas Otimizadas Olá! Recebe
   #0011 ↑ ENV   Não consegui identificar sua confirmação. Para confirmar seu ped
   #0012 ↓ RECEB quero confirmar meu pedido
   #0013 ↑ ENV   Pedido recebido com sucesso! Seu pedido foi registrado e o estab

════════════════════════════════════════════════════════════════════════
RESULTADO: persistência de mensagens recebidas e enviadas CONFIRMADA.
════════════════════════════════════════════════════════════════════════
```

**c) Consulta SQL direta**

```sql
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE direcao = 'RECEBIDA') AS recebidas,
       COUNT(*) FILTER (WHERE direcao = 'ENVIADA')  AS enviadas
FROM "Mensagem";
```

Resultado no momento da verificação:

```
 total | recebidas | enviadas
-------+-----------+----------
    14 |         5 |        9
```

Conclusão do requisito: as mensagens **recebidas e enviadas** estão gravadas na tabela
`Mensagem` do PostgreSQL, com vínculo ao usuário, direção, data/hora e proteção contra
duplicidade.

### 3.5 Painel em tempo real (requisito 3)

**API — `GET /api/conversas`**

- Sem `apos`: retorna as mensagens mais recentes em ordem cronológica.
- Com `apos=<id>`: retorna apenas mensagens novas (usado pelo polling).
- Também devolve `total`, `recebidas`, `enviadas` e `ultimoId`.
- Consulta sempre o banco em tempo de execução (rota dinâmica).

**Painel — `src/app/historico/page.tsx` + `painel-conversas.tsx`**

- Agrupa as mensagens por telefone, montando um cartão por conversa.
- Bolhas verdes à direita (enviadas) e escuras à esquerda (recebidas), com horário.
- Contadores de total, recebidas e enviadas.
- Indicador “Ao vivo”, última atualização e mensagem de erro caso o banco falhe.
- `setInterval` de **2 segundos** busca mensagens novas via `?apos=<ultimoId>`, com deduplicação
  por `id`, limite de 500 mensagens em memória e rolagem automática.
- Estados de vazio, carregando e erro tratados.

**Validação do tempo real**

Depois de postar uma mensagem no webhook, a consulta incremental retornou apenas os novos
registros:

```
POST /api/webhook  → {"status":"recebido"}

GET /api/conversas?apos=6
{"mensagens":[
  {"id":7,"telefone":"5521900000000","direcao":"RECEBIDA","texto":"mensagem em tempo real", ...},
  {"id":8,"telefone":"5521900000000","direcao":"ENVIADA","texto":"AERO — Assistente Eletrônico ...", ...}
], ...}
```

A página `/historico` respondeu **HTTP 200** e o build classificou a rota como dinâmica (`ƒ`).

---

## 4. Arquivos criados/alterados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `package.json` / `package-lock.json` | alterado | scripts, dependências e aprovação de install scripts do Prisma |
| `.env` / `.env.example` | novo | configuração do banco, webhook, WhatsApp e mock |
| `prisma/schema.prisma` | alterado | enum de direção, `whatsappId`, índices e `url` do datasource |
| `prisma/migrations/20261116141252_historico_mensagens/` | novo | migration aplicada no `aero_dev` |
| `src/lib/prisma.ts` | novo | singleton do PrismaClient |
| `src/services/historico.ts` | novo | gravação e consulta das mensagens |
| `src/services/whatsapp.ts` | alterado | modo mock e tratamento de erro no envio |
| `src/app/api/webhook/route.ts` | alterado | persistência da recebida e de cada resposta |
| `src/app/api/conversas/route.ts` | novo | API de consulta incremental |
| `src/app/layout.tsx` | novo | layout raiz |
| `src/app/globals.css` | novo | estilos do painel e da home |
| `src/app/page.tsx` | novo | página inicial com link para o painel |
| `src/app/historico/page.tsx` | novo | página do histórico |
| `src/app/historico/painel-conversas.tsx` | novo | componente cliente com polling de 2s |
| `scripts/verificar-historico.mjs` | novo | verificação dos registros no banco |
| `tests/historico.test.mjs` | novo | teste automatizado de persistência |
| `README.md` | alterado | instruções de instalação, execução e verificação |
| `biome.json` / `tsconfig.json` | alterado | configuração migrada/formatação |
| `.gitignore` | alterado | ignora `*.tsbuildinfo` |

O `AGENTS.md` foi gerado automaticamente pelo `next dev` (regras para agentes de IA) e pode ser
mantido ou removido conforme a preferência da equipe.

---

## 5. Como executar

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL se necessário
npx prisma migrate dev        # cria as tabelas
npm run dev
```

- Painel: <http://localhost:3000/historico>
- API: <http://localhost:3000/api/conversas>
- Health check: <http://localhost:3000/api/health>

Para testar sem credenciais da Meta, mantenha `WHATSAPP_MOCK=true` no `.env`.

---

## 6. Validações executadas

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ sem erros (TypeScript 7.0.2) |
| `npm run build` | ✅ build de produção concluído (Next.js 16.4.6 / Turbopack) |
| `npx biome check .` | ✅ 22 arquivos analisados, nenhum erro |
| `npm run test:historico` | ✅ 7/7 verificações aprovadas |
| `npm run verificar` | ✅ consulta executada; 14 mensagens encontradas |

Rotas geradas no build:

```
┌ ○ /
├ ○ /_not-found
├ ƒ /api/conversas
├ ƒ /api/health
├ ƒ /api/webhook
└ ○ /historico
```

---

## 7. Limitações conhecidas

1. **Estado da conversa em memória** (`Map` no webhook): reiniciar o servidor zera o estágio de
   cada cliente. Persistir o estado no banco é uma evolução natural.
2. **Sem autenticação no painel**: qualquer pessoa com acesso à URL vê as conversas. Em produção,
   é necessário proteger `/historico` e `/api/conversas`.
3. **Tempo real por polling (2s)**: atende ao requisito com simplicidade, mas não é push real.
   SSE ou `LISTEN/NOTIFY` do PostgreSQL seriam a evolução.
4. **WhatsApp simulado por padrão**: com token real, os envios passam a usar a Graph API v17.0;
   mensagens são gravadas mesmo se a API externa falhar (representam a resposta gerada).
5. **Histórico limitado a 200 mensagens por consulta e 500 em memória** — suficiente para o MVP;
   para volumes maiores, será preciso paginação e filtros por data/cliente.
6. **Sem suíte de testes unitários**: a validação atual é de integração (webhook + banco).

---

## 8. Próximos passos sugeridos

1. Persistir o estado da conversa na tabela `Usuario`/`Conversa` para sobreviver a reinícios.
2. Adicionar autenticação simples no painel (ex.: cookie assinado ou Basic Auth).
3. Migrar o polling para SSE ou `LISTEN/NOTIFY`.
4. Criar filtros por telefone/data e paginação no painel.
5. Registrar também mensagens não textuais (imagem, áudio, documento).
6. Adicionar testes unitários para `webhook-parser` e para a máquina de estados do bot.

---

## 9. Conclusão

As três funcionalidades solicitadas foram entregues e comprovadas:

- o AERO grava mensagens **recebidas e enviadas** no PostgreSQL, com direção, vínculo ao
  usuário, timestamp e proteção contra duplicidade;
- a persistência foi verificada por consulta SQL, script dedicado e teste automatizado com
  **7/7 verificações aprovadas**;
- o painel `/historico` exibe as conversas salvas e recebe novas mensagens a cada 2 segundos,
  com interface responsiva e indicadores de status.

Build, tipos e lint estão limpos. O projeto está pronto para demonstração e para evoluir os
pontos listados em “Próximos passos”.
