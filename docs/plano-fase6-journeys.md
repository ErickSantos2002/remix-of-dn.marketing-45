# Plano de Implementação — Fase 6: Fluxos de automação (journeys)

> **Para workers agênticos:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Passos usam checkboxes (`- [ ]`).
>
> **Leitura obrigatória antes de executar:** `docs/plano-modulo-email-marketing.md` (seção "Fase 6" — decisões vinculantes), `docs/plano-fase3-fila-agendamento.md` (a fila e o worker), e o código de `supabase/functions/process-email-queue/index.ts` **inteiro** (é o worker que os emails de fluxo vão reusar; toda propriedade de segurança desta fase depende dele).

**Goal:** Fechar o módulo de email marketing com fluxos de automação (journeys): o admin monta um fluxo vertical ("entrou no segmento X → email A → espera 2 dias → se abriu, email B; senão, tag 'frio'"), o motor executa por lead como máquina de estados em Postgres, e **todo email de fluxo sai pela mesma fila `email_send_queue` e pelo mesmo worker `process-email-queue`** — herdando de graça supressão, unsubscribe RFC 8058, merge tags, claim-before-send, fallback 422, rollback 429 e a timeline.

**Architecture:**
- **Dados:** `journeys` (grafo em JSONB, acíclico, validado no banco) + `journey_runs` (uma execução por lead, com lease de lock) + `journey_step_log` (log por passo, base das métricas por nó).
- **Envio:** `campaign_sends` ganha `journey_run_id` / `journey_node_id` (e `campaign_id` passa a ser opcional na prática — a coluna **já é nullable**). Um índice único novo `(journey_run_id, journey_node_id)` torna o email duplicado de um nó **impossível por construção**. Ver "Decisão de arquitetura".
- **Motor:** Edge Function `journey-worker` no pg_cron (1/min). Entrada por **segmento** (varredura set-based via `evaluate_segment_rules`) e por **evento** (trigger fail-open em `contact_events` → fila pgmq `journey_events`). Execução de runs devidos com claim `FOR UPDATE SKIP LOCKED` + fencing token.
- **UI:** `/automations` ganha a aba "Fluxos"; builder **vertical linear com ramos** (sem canvas livre / React Flow), métricas por nó.

**Tech Stack:** React 18 + Vite + shadcn/ui, Supabase (Postgres, Edge Functions Deno, pgmq, pg_cron, Vault), Resend, `react-email-editor` (Unlayer, já usado pelos templates da Fase 4).

---

## ⚠️ Restrição nº 0 — projeto hospedado no Lovable

Invoque a skill `lovable-workflow` antes de executar qualquer tarefa. Ciclo obrigatório **por tarefa**: `git pull` → implementar → `npm run lint && npm run build` → commit em português → **`git push` imediato** → se a tarefa criou/alterou Edge Function ou migration, entregar o prompt de deploy ao usuário (modelo no fim deste plano) com o hash real do commit.

**Proibições que quebram o sync:** renomear/mover/deletar o repositório; editar à mão `src/integrations/supabase/types.ts`, `package-lock.json` ou `.lovable/`.

## Restrições globais (herdadas das fases 0–5, todas confirmadas)

- **Sem test runner.** Verificação = `npm run lint` + `npm run build` + **cross-reading** contra o código real citado em cada tarefa. Não há banco/CLI/Deno local nesta máquina: `supabase db push`, `supabase functions serve` e `deno check` **não rodam aqui**. Validação real só em produção (`https://dnmkt.dnia.ai`) depois do deploy pelo Lovable — dizer isso explicitamente ao entregar cada tarefa; nunca afirmar "testado" sem ter testado.
- **`npm run lint` já está VERMELHO na `main`** (erros pré-existentes de `@typescript-eslint/no-explicit-any` em arquivos que não tocamos). O critério é: **nenhuma categoria de erro NOVA** e nenhum erro novo em arquivo tocado por esta fase — não "o lint passa".
- **`npm run build` DEVE passar** (é o gate real: TS + Terser).
- Toda Edge Function nova entra em `supabase/config.toml` com `verify_jwt = false` (auth no corpo, via `_shared/auth.ts`).
- **Não editar `src/integrations/supabase/types.ts`.** Como não dá para regenerar offline, **a UI desta fase NUNCA fala com as tabelas novas via `supabase.from('journeys')`** — todo acesso é via `supabase.functions.invoke('journeys-api', ...)`. Isso elimina a dependência da regeneração de tipos para o `build` passar. (Decisão consciente; ver Task 6.11.)
- UI em pt-BR; commits em português; `console.*` some no build de produção (Terser).
- Migrations e Edge Functions **não** são deployadas pelo sync — prompt de deploy obrigatório, e as **functions vão ANTES da migration de cron** (o cron invoca as functions; agendar antes do deploy geraria 404 a cada minuto).

---

## Decisão de arquitetura — como um nó `send_email` entra na fila

### O problema (exato, contra o código real)

O worker `process-email-queue` é a única coisa no sistema que sabe enviar email com segurança. Ele lê mensagens `{ send_id, campaign_id, lead_id }`, resolve o conteúdo em `campaigns`, filtra supressão, monta o payload (merge tags, rodapé, headers RFC 8058, tags de correlação), faz **claim-before-send** (CAS em bloco `pending → sent` **antes** de chamar o Resend), trata 422 com fallback individual, 429 com rollback do claim, e grava `resend_email_id` (que é o gatilho real do `email_sent` na timeline — `fn_campaign_send_event`, migration `20260713220000`).

Um email de fluxo **precisa** passar por aí. Mas o registro de envio (`campaign_sends`) hoje é modelado como "uma linha por (campanha, lead)":

- `campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE` — **verificado: a coluna é NULLABLE** (`supabase/migrations/20260330013031_...`, linha 21; não há `NOT NULL`).
- `uniq_campaign_sends_email_campaign_lead (campaign_id, lead_id) WHERE channel='email' AND lead_id IS NOT NULL` (migration `20260713210000`, §3b).

E um fluxo legitimamente manda **vários emails diferentes para o mesmo lead**, de nós diferentes.

### Opções avaliadas

**(a) Campanha sintética por nó de fluxo.** Rejeitada — colide com a máquina de estados de campanha em quatro pontos, todos verificáveis no código:
1. o worker exige `campaign.status === 'sending'` (`process-email-queue`, passo 4: `if (campaign.status !== "sending") { await fail(...) }`). A campanha sintética teria que viver eternamente em `sending`;
2. mas `finalize_campaign_if_drained` fecha para `'sent'` assim que `pending == 0` — ou seja, no primeiro drenar da fila. O segundo lead que chegar naquele nó falharia com "campanha não está em envio", **terminalmente**;
3. `reset_stuck_campaigns` (sweeper A) veria uma campanha em `sending` com `updated_at` velho e chamaria o finalize/reset — mesma consequência;
4. o índice único `(campaign_id, lead_id)` **impediria** o reenvio do mesmo nó a um lead numa nova entrada (`reentry='allowed'`), e poluiria a lista `/campaigns` com uma campanha por nó.
Custo: reescrever o ciclo de vida de campanha inteiro. Benefício: zero.

**(c) Tabela `journey_sends` separada, drenada pelo mesmo worker.** Rejeitada — o worker escreve em `campaign_sends` em **10 lugares** (markSend, claim CAS em bloco, release do 429, correção 4xx em bloco, `failed` por item ambíguo, gravação de `resend_email_id`, fallback individual ×4). Duplicar a tabela obriga a ramificar cada um deles por tabela — exatamente no código mais delicado e mais revisado do repositório. Além disso: `resend-webhook` correlaciona e faz máquina de estados monotônica em `campaign_sends`; `email_events.campaign_send_id` é FK para `campaign_sends`; `fn_campaign_send_event` é o único emissor de `email_sent`. Seriam **duas implementações paralelas** das quatro propriedades de segurança. É a opção com maior probabilidade de regressão silenciosa.

**(b) `campaign_id` opcional + `journey_run_id`/`journey_node_id` em `campaign_sends`. ✅ RECOMENDADA.**

Uma linha de `campaign_sends` passa a ter exatamente um "dono": ou uma campanha, ou um (run, nó) de fluxo. **Uma tabela, um claim, uma política de 422/429, um gatilho de timeline, um webhook.** O worker ganha um único ponto de bifurcação — a **resolução de conteúdo** — e nada mais.

### Migration (resumo; SQL completo na Task 6.2)

```sql
ALTER TABLE public.campaign_sends
  ADD COLUMN IF NOT EXISTS journey_run_id  uuid REFERENCES public.journey_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS journey_node_id text,
  ADD COLUMN IF NOT EXISTS created_at      timestamptz NOT NULL DEFAULT now();

-- Nunca os dois donos ao mesmo tempo.
ALTER TABLE public.campaign_sends
  ADD CONSTRAINT chk_campaign_sends_owner
  CHECK (NOT (campaign_id IS NOT NULL AND journey_run_id IS NOT NULL));

-- A barreira anti-duplicata dos fluxos: no máximo UM envio por (run, nó).
CREATE UNIQUE INDEX uniq_campaign_sends_journey_node
  ON public.campaign_sends (journey_run_id, journey_node_id)
  WHERE journey_run_id IS NOT NULL;
```

O índice antigo de campanha **continua válido e é recriado com `AND campaign_id IS NOT NULL` explícito** — não porque hoje seja necessário (índices únicos são `NULLS DISTINCT` por padrão, então linhas de fluxo com `campaign_id NULL` nunca colidem entre si), mas para que a intenção fique escrita e um `NULLS NOT DISTINCT` futuro não transforme o índice numa trava que impediria **todo** envio de fluxo.

### Mudanças no worker (Task 6.5) — as únicas

1. **Mensagem da fila** ganha uma segunda forma: `{ send_id, lead_id, journey_id, journey_run_id, journey_node_id }` (sem `campaign_id`). O worker bifurca por `msg.campaign_id ? campanha : fluxo`.
2. **Resolução de conteúdo:** para fluxo, carrega `journeys.nodes` (bulk, por `journey_id`) e `email_templates.html` (bulk, por `config.template_id`); `subject` vem de `config.subject`. Substitui as três guardas de campanha (`campaign not found` / `channel !== 'email'` / `status !== 'sending'`) por: nó existe, é `send_email`, template existe e tem HTML. Falha aqui = `failed` terminal **antes** do claim — mesma semântica de "lead sem email".
3. **Tags de correlação:** passa a mandar **`send_id` em TODOS os emails** (campanha e fluxo) — resolução exata no webhook, sem heurística. Campanha continua mandando `campaign_id`+`lead_id` (compatibilidade com emails em voo e com as regras de segmento da Fase 5); fluxo manda `journey_id`+`journey_run_id`+`journey_node_id`+`lead_id`. (Valores de tag do Resend aceitam `[A-Za-z0-9_-]` — UUID passa.)
4. **`touched` só recebe `campaign_id` definido** — `finalize_campaign_if_drained` é e continua sendo uma coisa de campanha.

**Nada mais muda.** Claim, dedupe por `send_id`, supressão, unsubscribe, rodapé, merge tags, 422, 429, `resend_email_id`: idênticos, byte a byte, porque operam sobre `campaign_sends.id` — que é o mesmo para os dois donos.

### O que o resto do sistema vê

| Componente | Efeito nas linhas de fluxo (`campaign_id IS NULL`) |
|---|---|
| `finalize_campaign_if_drained` | `WHERE campaign_id = p_campaign_id` nunca casa com NULL → **invisível**. Correto. |
| `reset_stuck_campaigns` (sweeper A) | Só varre `campaigns` e conta `pending` por `campaign_id` → **invisível**. Correto. |
| `recover_lost_sends` (sweeper B) | Tem `AND cs.campaign_id IS NOT NULL` → **exclui fluxos**. É um buraco real: um envio de fluxo reivindicado-mas-não-despachado nunca seria recuperado. Fechado por uma função **irmã e separada**, `recover_lost_journey_sends` (Task 6.7) — não tocamos na função endurecida da campanha. A versão de fluxo é bem mais simples: não existe "reabrir a campanha para `sending`" (a complexidade inteira do original). |
| `resend-webhook` | Resolve por `tags.send_id` (novo, exato) → mantém a máquina de estados monotônica e passa a preencher `email_events.campaign_send_id` também para fluxos — o que faz o cross-check anti-duplicata do sweeper funcionar. `email_events.campaign_id` fica NULL para fluxos (esperado). |
| `fn_campaign_send_event` | Já dispara `email_sent` em `resend_email_id NULL → NOT NULL` para `channel='email'` → **funciona sem mudança**. Só ajustamos `metadata`/`title` para carregar `journey_run_id`/`journey_node_id` (necessário para o nó `wait_for_event` casar "abriu **este** email"). |
| `campaign_delete_guard` | Inalterado. |
| Fase 5 (`build_segment_condition`) | `email_opened`/`email_clicked` filtram por `campaign_id` → não casam com email de fluxo. Esperado e documentado. |

### As quatro propriedades inegociáveis, mapeadas

1. **Nunca duplicar email para uma pessoa.** Três camadas: (i) `uniq_campaign_sends_journey_node` — no máximo uma linha por (run, nó), então reexecutar o nó (lease expirado, worker morto, cron sobreposto) **não cria uma segunda linha**; (ii) o **claim CAS** `pending → sent` do worker — no máximo um despacho por linha; (iii) a dedupe por `send_id` dentro do lote. O `INSERT ... ON CONFLICT DO NOTHING RETURNING id` é feito **na mesma transação** que o `pgmq.send` (RPC `journey_enqueue_email`, Task 6.4) — a mensagem não pode existir sem a linha, nem a linha sem a mensagem.
2. **Nunca `failed` terminal a partir de resposta ambígua.** Herdado sem alteração: o caminho de rede/5xx do worker mantém o claim e deixa a assinatura `status='sent' AND resend_email_id IS NULL`. O sweeper de fluxo faz o **mesmo cross-check obrigatório** (`NOT EXISTS` em `email_events` por `campaign_send_id`) antes de reenfileirar.
3. **Exatamente um `email_sent` por email realmente enviado.** Emissor único e inalterado: `fn_campaign_send_event` na confirmação (`resend_email_id` preenchido). O `journey-worker` **nunca escreve em `contact_events`** — o log dele é `journey_step_log`, tabela separada, que não é timeline.
4. **Supressão + RFC 8058 valem igual.** Por construção: o payload do email de fluxo é montado pelo **mesmo bloco de código** (`buildUnsubscribeUrl`, filtro `email_suppressions`, rodapé, headers `List-Unsubscribe`). Não há um segundo caminho de envio.

**Além disso (exigência explícita):** o trigger em `contact_events` que acorda fluxos é **fail-open** (`EXCEPTION WHEN OTHERS THEN RAISE WARNING`). Quem escreve na timeline inclui a captura de lead (`lead-capture`, `receive-contact-event`, `identity-upsert`) — um erro no enfileiramento de fluxo **não pode** abortar a transação de captura de um lead. Perder um wake-up de fluxo é ruim; perder um lead é inaceitável.

### Consequências aceitas (escritas de propósito)

- **Late binding do template:** o nó guarda `template_id`; o HTML é lido de `email_templates` **no momento do envio**. Editar o template muda os emails **ainda não enviados** de fluxos ativos. É o oposto da decisão da Fase 4 para campanhas (cópia por valor) e é **intencional**: fluxo é perene, campanha é um disparo. Documentar no UI do builder.
- **Pausar um fluxo congela o AVANÇO dos runs**, não o que já está na fila: um email enfileirado no último minuto ainda sai. O worker de email **não** consulta o status do fluxo (consultar significaria escolher entre `failed` terminal — que perde o envio para sempre — e `pending` órfão — que trava tudo). Janela ≤ ~1 min. Documentar no botão "Pausar".
- **Nós não-email não são transacionais** (`apply_tag` é idempotente por PK `(lead_id, tag_id)`; `handoff_nexus` é deduplicado do lado do Nexus por lookup de contato). Reexecução após lease expirado pode repetir um handoff — risco aceito e listado em Riscos.

---

## Ordem das tarefas

| # | Tarefa | Tipo | Depende de |
|---|---|---|---|
| 6.1 | Migration `journeys` / `journey_runs` / `journey_step_log` + validação de grafo acíclico | SQL | — |
| 6.2 | Migration: `campaign_sends` ganha `journey_run_id`/`journey_node_id` + índices + trigger de timeline | SQL | 6.1 |
| 6.3 | Migration: fila pgmq `journey_events` + trigger **fail-open** em `contact_events` | SQL | 6.1 |
| 6.4 | Migration: RPCs do motor (claim, enroll, wake, eval, enqueue de email, métricas) | SQL | 6.1–6.3 |
| 6.5 | `process-email-queue` + `resend-webhook`: suporte a envio de fluxo | Function | 6.2, 6.4 |
| 6.6 | Edge Function `journey-worker` | Function | 6.4 |
| 6.7 | Migration: sweepers de fluxo + jobs pg_cron | SQL | 6.5, 6.6 **deployadas** |
| 6.8 | Fix `automations-api` (POST/PATCH perdiam `conditions`/`condition_logic`) | Function | — |
| 6.9 | Edge Function `journeys-api` (CRUD + métricas) | Function | 6.1, 6.4 |
| 6.10 | `src/lib/journeys.ts` + hook `useJourneys` | UI | 6.9 |
| 6.11 | Aba "Fluxos" em `/automations` (lista) | UI | 6.10 |
| 6.12 | Builder vertical `/automations/fluxos/:id` | UI | 6.10 |
| 6.13 | Métricas por nó no builder | UI | 6.12 |

---

## Task 6.1 — Migration: `journeys`, `journey_runs`, `journey_step_log` + grafo acíclico

**Files:**
- Create: `supabase/migrations/20260714100000_journeys_core.sql`

**Interfaces:**
- Produces: tabelas `public.journeys`, `public.journey_runs`, `public.journey_step_log`; função `public.validate_journey_graph(jsonb, text)`; triggers `trg_journeys_validate`, `trg_journeys_delete_guard`.
- **Contrato do nó** (usado por 6.4, 6.5, 6.6, 6.12 — não divergir):

```jsonc
// journeys.nodes: array
{ "id": "n1", "type": "send_email",       "config": { "template_id": "<uuid>", "subject": "..." }, "next": "n2" }
{ "id": "n2", "type": "delay",            "config": { "minutes": 2880 }, "next": "n3" }
{ "id": "n3", "type": "wait_for_event",   "config": { "event_type": "email_opened", "timeout_minutes": 4320, "source_node_id": "n1" },
  "next": "n4", "next_timeout": "n5" }                        // next = o evento aconteceu
{ "id": "n4", "type": "branch_attribute", "config": { "rules": [{ "field": "etiqueta", "operator": "is", "value": "hotlead" }], "logic": "and" },
  "next": "n6", "next_false": "n7" }                          // next = verdadeiro
{ "id": "n6", "type": "branch_segment",   "config": { "segment_id": "<uuid>" }, "next": "n8", "next_false": null }
{ "id": "n7", "type": "apply_tag",        "config": { "tag_name": "frio" }, "next": null }
{ "id": "n8", "type": "handoff_nexus",    "config": { "stage_id": "<id>", "stage_name": "Reunião" }, "next": null }
```
`next: null`/ausente = fim do fluxo. `entry_config`: `{"segment_id": "<uuid>"}` (entry_type `segment`) ou `{"event_type": "..."}` (entry_type `event`).
As `rules` de `branch_attribute` usam **o mesmo vocabulário de `build_segment_condition`** (migration 20260713250000) — nada de um segundo dialeto.

- [ ] **Step 1:** Criar o arquivo:

```sql
-- ============================================================================
-- Fase 6 — Fluxos de automação (journeys), núcleo.
--   1. journeys         — o grafo (JSONB), acíclico, validado por trigger
--   2. journey_runs     — uma execução por lead, com lease + fencing token
--   3. journey_step_log — log por passo (base das métricas por nó)
--   4. validate_journey_graph — ids únicos, ponteiros válidos, config por tipo,
--      e detecção de CICLO. Ciclo é a única forma de o motor colocar um lead num
--      loop infinito de nós -- por isso a barreira é no BANCO, não na UI.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journeys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','active','paused','archived')),
  entry_type    text NOT NULL CHECK (entry_type IN ('segment','event')),
  entry_config  jsonb NOT NULL DEFAULT '{}'::jsonb,
  reentry       text NOT NULL DEFAULT 'once' CHECK (reentry IN ('once','allowed')),
  entry_node_id text,
  nodes         jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journeys_status ON public.journeys (status);
-- Lido pelo trigger fail-open de contact_events (caminho quente da captura de
-- lead): tem que ser um lookup barato.
CREATE INDEX IF NOT EXISTS idx_journeys_event_entry
  ON public.journeys ((entry_config->>'event_type'))
  WHERE status = 'active' AND entry_type = 'event';

CREATE TABLE IF NOT EXISTS public.journey_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id      uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  lead_id         uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_node_id text,
  state           text NOT NULL DEFAULT 'active'
                  CHECK (state IN ('active','waiting','done','failed','exited')),
  -- NOT NULL de propósito: um run sem wakeup_at jamais seria colhido por
  -- journey_claim_due_runs e ficaria invisível para sempre.
  wakeup_at       timestamptz NOT NULL DEFAULT now(),
  waiting_event   text,
  context         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Lease + fencing token: o worker reivindica o run e TODA escrita posterior
  -- dele carrega o token (.eq('lock_token', token)). Um worker cujo lease
  -- expirou não consegue escrever por cima de quem assumiu o run.
  lock_token      uuid,
  locked_until    timestamptz,
  entered_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- No máximo UM run ABERTO por (fluxo, lead) -- vale para reentry 'once' E
-- 'allowed'. É o que impede duas entradas concorrentes (varredura de segmento e
-- evento no mesmo minuto) de criarem dois runs que mandariam os mesmos emails.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_journey_runs_open
  ON public.journey_runs (journey_id, lead_id)
  WHERE state IN ('active','waiting');

CREATE INDEX IF NOT EXISTS idx_journey_runs_due
  ON public.journey_runs (wakeup_at)
  WHERE state IN ('active','waiting');
CREATE INDEX IF NOT EXISTS idx_journey_runs_waiting_event
  ON public.journey_runs (lead_id, waiting_event)
  WHERE state = 'waiting';
CREATE INDEX IF NOT EXISTS idx_journey_runs_journey
  ON public.journey_runs (journey_id, state);

CREATE TABLE IF NOT EXISTS public.journey_step_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES public.journey_runs(id) ON DELETE CASCADE,
  journey_id  uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  lead_id     uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  node_id     text NOT NULL,
  node_type   text NOT NULL,
  -- entered      : o run entrou no nó (base de "quantos leads passaram por aqui")
  -- enqueued     : email de fluxo criado + publicado na fila
  -- skipped      : nó sem efeito (email já criado neste run, lead sem email...)
  -- branch_true / branch_false / event_matched / timeout : ramificações
  -- failed       : erro na execução do nó
  result      text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journey_step_log_metrics
  ON public.journey_step_log (journey_id, node_id, result);
CREATE INDEX IF NOT EXISTS idx_journey_step_log_run
  ON public.journey_step_log (run_id, occurred_at);

-- RLS: admin (mesmo padrão de email_templates, migration 20260713240000).
ALTER TABLE public.journeys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_step_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_journeys" ON public.journeys;
CREATE POLICY "admin_all_journeys" ON public.journeys FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_read_journey_runs" ON public.journey_runs;
CREATE POLICY "admin_read_journey_runs" ON public.journey_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_read_journey_step_log" ON public.journey_step_log;
CREATE POLICY "admin_read_journey_step_log" ON public.journey_step_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- Validação do grafo -- chamada em TODO INSERT/UPDATE de journeys.
-- A UI é conveniência; o banco é a fronteira.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_journey_graph(p_nodes jsonb, p_entry_node_id text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_ids   text[];
  v_node  jsonb;
  v_id    text;
  v_type  text;
  v_ref   text;
  v_cycle boolean;
BEGIN
  IF p_nodes IS NULL OR jsonb_typeof(p_nodes) <> 'array' THEN
    RAISE EXCEPTION 'journeys.nodes deve ser um array jsonb';
  END IF;

  -- Rascunho vazio é permitido (fluxo recém-criado). A guarda "não ativa sem
  -- nós" fica no trigger, não aqui.
  IF jsonb_array_length(p_nodes) = 0 THEN
    RETURN;
  END IF;

  SELECT array_agg(n->>'id') INTO v_ids FROM jsonb_array_elements(p_nodes) n;

  IF EXISTS (SELECT 1 FROM unnest(v_ids) x WHERE x IS NULL OR btrim(x) = '') THEN
    RAISE EXCEPTION 'todo nó precisa de um "id" não vazio';
  END IF;
  IF (SELECT count(*) FROM unnest(v_ids)) <> (SELECT count(DISTINCT x) FROM unnest(v_ids) x) THEN
    RAISE EXCEPTION 'ids de nó duplicados em journeys.nodes';
  END IF;
  IF p_entry_node_id IS NULL OR NOT (p_entry_node_id = ANY(v_ids)) THEN
    RAISE EXCEPTION 'entry_node_id % não existe em nodes', coalesce(p_entry_node_id, '(null)');
  END IF;

  FOR v_node IN SELECT n FROM jsonb_array_elements(p_nodes) n
  LOOP
    v_id   := v_node->>'id';
    v_type := v_node->>'type';

    IF v_type IS NULL OR v_type NOT IN
       ('send_email','delay','wait_for_event','branch_attribute','branch_segment','apply_tag','handoff_nexus') THEN
      RAISE EXCEPTION 'tipo de nó inválido: % (nó %)', coalesce(v_type, '(null)'), v_id;
    END IF;

    -- Ponteiros: ou apontam para um nó existente, ou são nulos (fim do fluxo).
    FOREACH v_ref IN ARRAY ARRAY[v_node->>'next', v_node->>'next_false', v_node->>'next_timeout']
    LOOP
      IF v_ref IS NOT NULL AND NOT (v_ref = ANY(v_ids)) THEN
        RAISE EXCEPTION 'nó % aponta para "%" que não existe', v_id, v_ref;
      END IF;
    END LOOP;

    -- Config obrigatória por tipo. Sem isto, a falta de config só apareceria na
    -- execução -- com o lead já dentro do fluxo.
    CASE v_type
      WHEN 'send_email' THEN
        IF coalesce(v_node#>>'{config,template_id}', '') = ''
           OR coalesce(v_node#>>'{config,subject}', '') = '' THEN
          RAISE EXCEPTION 'nó % (send_email) exige config.template_id e config.subject', v_id;
        END IF;
      WHEN 'delay' THEN
        IF coalesce((v_node#>>'{config,minutes}')::numeric, 0) <= 0 THEN
          RAISE EXCEPTION 'nó % (delay) exige config.minutes > 0', v_id;
        END IF;
      WHEN 'wait_for_event' THEN
        IF coalesce(v_node#>>'{config,event_type}', '') = ''
           OR coalesce((v_node#>>'{config,timeout_minutes}')::numeric, 0) <= 0 THEN
          RAISE EXCEPTION 'nó % (wait_for_event) exige config.event_type e config.timeout_minutes > 0', v_id;
        END IF;
      WHEN 'branch_attribute' THEN
        IF jsonb_typeof(v_node#>'{config,rules}') <> 'array'
           OR jsonb_array_length(v_node#>'{config,rules}') = 0 THEN
          RAISE EXCEPTION 'nó % (branch_attribute) exige config.rules não vazio', v_id;
        END IF;
      WHEN 'branch_segment' THEN
        IF coalesce(v_node#>>'{config,segment_id}', '') = '' THEN
          RAISE EXCEPTION 'nó % (branch_segment) exige config.segment_id', v_id;
        END IF;
      WHEN 'apply_tag' THEN
        IF coalesce(v_node#>>'{config,tag_name}', '') = '' THEN
          RAISE EXCEPTION 'nó % (apply_tag) exige config.tag_name', v_id;
        END IF;
      WHEN 'handoff_nexus' THEN
        IF coalesce(v_node#>>'{config,stage_id}', '') = '' THEN
          RAISE EXCEPTION 'nó % (handoff_nexus) exige config.stage_id', v_id;
        END IF;
      ELSE
        NULL; -- inalcançável (tipo já validado); evita CASE_NOT_FOUND
    END CASE;
  END LOOP;

  -- CICLO. Corte de profundidade (200) evita explosão em grafos patológicos.
  WITH RECURSIVE edges AS (
    SELECT n->>'id' AS src, e AS dst
    FROM jsonb_array_elements(p_nodes) n
    CROSS JOIN LATERAL (VALUES (n->>'next'), (n->>'next_false'), (n->>'next_timeout')) AS v(e)
    WHERE e IS NOT NULL
  ),
  walk AS (
    SELECT e.src, e.dst, ARRAY[e.src] AS path, false AS cyclic
    FROM edges e
    UNION ALL
    SELECT w.dst, e.dst, w.path || w.dst, (e.dst = ANY(w.path || w.dst))
    FROM walk w
    JOIN edges e ON e.src = w.dst
    WHERE NOT w.cyclic AND array_length(w.path, 1) < 200
  )
  SELECT EXISTS (SELECT 1 FROM walk WHERE cyclic) INTO v_cycle;

  IF v_cycle THEN
    RAISE EXCEPTION 'o grafo do fluxo tem ciclo — fluxos precisam ser acíclicos';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_journeys_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.validate_journey_graph(NEW.nodes, NEW.entry_node_id);

  IF NEW.status = 'active' THEN
    IF jsonb_array_length(coalesce(NEW.nodes, '[]'::jsonb)) = 0 OR NEW.entry_node_id IS NULL THEN
      RAISE EXCEPTION 'fluxo sem nós não pode ser ativado';
    END IF;
    IF NEW.entry_type = 'segment' AND coalesce(NEW.entry_config->>'segment_id', '') = '' THEN
      RAISE EXCEPTION 'entrada por segmento exige entry_config.segment_id';
    END IF;
    IF NEW.entry_type = 'event' AND coalesce(NEW.entry_config->>'event_type', '') = '' THEN
      RAISE EXCEPTION 'entrada por evento exige entry_config.event_type';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_journeys_validate ON public.journeys;
CREATE TRIGGER trg_journeys_validate
  BEFORE INSERT OR UPDATE ON public.journeys
  FOR EACH ROW EXECUTE FUNCTION public.fn_journeys_validate();

-- Guarda de exclusão (mesmo espírito de guard_campaign_delete, 20260713230000):
-- excluir um fluxo com runs faz CASCADE em journey_runs, e campaign_sends
-- .journey_run_id vira NULL (ON DELETE SET NULL) -- linhas de envio sem dono,
-- invisíveis para todos os sweepers. Fluxo que já rodou se ARQUIVA.
CREATE OR REPLACE FUNCTION public.guard_journey_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'fluxo % não pode ser excluído (status %): arquive em vez de excluir', OLD.id, OLD.status;
  END IF;
  IF EXISTS (SELECT 1 FROM public.journey_runs r WHERE r.journey_id = OLD.id) THEN
    RAISE EXCEPTION 'fluxo % já possui execuções: arquive em vez de excluir', OLD.id;
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_journeys_delete_guard ON public.journeys;
CREATE TRIGGER trg_journeys_delete_guard
  BEFORE DELETE ON public.journeys
  FOR EACH ROW EXECUTE FUNCTION public.guard_journey_delete();
```

- [ ] **Step 2 — verificação (cross-reading; não há banco local):**
  - `has_role(auth.uid(), 'admin'::app_role)` é a assinatura usada na policy de `email_templates` (20260713240000) — conferir que bate byte a byte.
  - `journey_runs.lead_id → leads(id) ON DELETE CASCADE`: apagar um lead apaga seus runs (não queremos run de lead inexistente).
  - Nenhuma escrita client-side nessas tabelas: a UI fala só com `journeys-api` (Task 6.9).
- [ ] **Step 3:** `npm run build` (a migration não afeta o bundle, mas o gate é barato). Commit: `feat(fase6): tabelas journeys/journey_runs/journey_step_log + validação de grafo acíclico` + push.

---

## Task 6.2 — Migration: `campaign_sends` ganha dono de fluxo + timeline com origem

**Files:**
- Create: `supabase/migrations/20260714100500_journey_sends.sql`

**Interfaces:**
- Produces: `campaign_sends.journey_run_id`, `.journey_node_id`, `.created_at`; índice `uniq_campaign_sends_journey_node`; `fn_campaign_send_event` com metadata de fluxo.
- Consumido por: 6.4 (`journey_enqueue_email`), 6.5 (worker), 6.7 (sweepers), 6.9 (métricas).

- [ ] **Step 1:** Criar o arquivo:

```sql
-- ============================================================================
-- Fase 6 — Envio de fluxo dentro de campaign_sends (Opção B).
-- Ver docs/plano-fase6-journeys.md, seção "Decisão de arquitetura".
-- ============================================================================

ALTER TABLE public.campaign_sends
  ADD COLUMN IF NOT EXISTS journey_run_id  uuid REFERENCES public.journey_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS journey_node_id text,
  -- created_at não existia (a tabela só tem sent_at, que é NULL justamente nas
  -- linhas 'pending'). O sweeper de órfãos (Task 6.7) precisa distinguir
  -- "pending recém-criado" de "pending encalhado". O backfill do DEFAULT marca
  -- as linhas históricas com o horário da migration: inofensivo, porque a coluna
  -- só é lida para linhas com journey_run_id IS NOT NULL -- que não podem existir
  -- antes desta migration.
  ADD COLUMN IF NOT EXISTS created_at      timestamptz NOT NULL DEFAULT now();

-- Uma linha tem UM dono: campanha OU fluxo. (Todas as linhas históricas têm
-- journey_run_id NULL, então a CHECK já é satisfeita -- não precisa NOT VALID.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_campaign_sends_owner') THEN
    ALTER TABLE public.campaign_sends
      ADD CONSTRAINT chk_campaign_sends_owner
      CHECK (NOT (campaign_id IS NOT NULL AND journey_run_id IS NOT NULL));
  END IF;
END $$;

-- A BARREIRA ANTI-DUPLICATA DOS FLUXOS.
-- No máximo UM envio por (run, nó): reexecutar o nó (lease expirado, worker
-- morto no meio, dois ticks do cron sobrepostos) não consegue criar uma segunda
-- linha -- logo não consegue mandar um segundo email. Duplicata impossível por
-- construção, não por cuidado do código.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_campaign_sends_journey_node
  ON public.campaign_sends (journey_run_id, journey_node_id)
  WHERE journey_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_sends_journey_run
  ON public.campaign_sends (journey_run_id)
  WHERE journey_run_id IS NOT NULL;

-- Recria o índice único de campanha com `AND campaign_id IS NOT NULL` EXPLÍCITO.
-- Hoje é redundante (índice único é NULLS DISTINCT por padrão, então linhas de
-- fluxo -- campaign_id NULL -- nunca colidem entre si). Escrito assim porque um
-- NULLS NOT DISTINCT futuro transformaria este índice numa trava que impediria o
-- SEGUNDO email de fluxo de QUALQUER lead: falha catastrófica e nada óbvia.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT campaign_id, lead_id
      FROM public.campaign_sends
      WHERE channel = 'email' AND lead_id IS NOT NULL AND campaign_id IS NOT NULL
      GROUP BY campaign_id, lead_id
      HAVING count(*) > 1
    ) dup
  ) THEN
    RAISE NOTICE 'campaign_sends possui duplicatas (campaign_id, lead_id): indice unico NAO recriado.';
  ELSE
    DROP INDEX IF EXISTS public.uniq_campaign_sends_email_campaign_lead;
    CREATE UNIQUE INDEX uniq_campaign_sends_email_campaign_lead
      ON public.campaign_sends (campaign_id, lead_id)
      WHERE channel = 'email' AND lead_id IS NOT NULL AND campaign_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- Timeline: fn_campaign_send_event passa a carregar a origem (campanha/fluxo).
--
-- PRESERVADO (propriedade nº 3): 'email_sent' continua disparando EXCLUSIVAMENTE
-- na confirmação real do Resend (resend_email_id NULL -> NOT NULL), nunca no
-- claim. Um email de fluxo gera exatamente um email_sent; um email que não saiu
-- não gera nenhum.
--
-- O que muda: metadata ganha journey_run_id/journey_node_id nas linhas de fluxo
-- -- é o que permite ao nó wait_for_event casar "abriu ESTE email" em vez de
-- "abriu qualquer email".
-- Base: versão vigente em 20260713220000_email_cron_sweepers.sql (PARTE 2);
-- todos os ramos dela estão reproduzidos aqui.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_campaign_send_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_meta jsonb;
  v_orig text;
BEGIN
  v_meta := jsonb_build_object('campaign_id', NEW.campaign_id);
  IF NEW.journey_run_id IS NOT NULL THEN
    v_meta := v_meta || jsonb_build_object(
      'journey_run_id',  NEW.journey_run_id,
      'journey_node_id', NEW.journey_node_id
    );
    v_orig := 'fluxo';
  ELSE
    v_orig := 'campanha';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Só 'sent' no INSERT representa envio que de fato saiu (hoje: WhatsApp
    -- síncrono). Email nasce 'pending' ou 'failed' e nunca emite aqui.
    IF NEW.status = 'sent' AND NEW.lead_id IS NOT NULL THEN
      INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
      VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing',
        CASE NEW.channel WHEN 'email' THEN 'email_sent' ELSE 'whatsapp_sent' END,
        'Envio de ' || v_orig || ' via ' || NEW.channel, v_meta);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- email_sent na CONFIRMAÇÃO do Resend. Fora do bloco "status mudou" de
    -- propósito: o worker grava resend_email_id num UPDATE separado.
    IF OLD.resend_email_id IS NULL AND NEW.resend_email_id IS NOT NULL
       AND NEW.channel = 'email' AND NEW.lead_id IS NOT NULL THEN
      INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
      VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_sent',
              'Envio de ' || v_orig || ' via email', v_meta);
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'sent' AND OLD.status = 'pending'
         AND NEW.lead_id IS NOT NULL AND NEW.channel <> 'email' THEN
        INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
        VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'whatsapp_sent',
                'Envio de ' || v_orig || ' via ' || NEW.channel, v_meta);
      ELSIF NEW.status = 'opened' AND NEW.lead_id IS NOT NULL THEN
        INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
        VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_opened',
                'Email aberto', v_meta);
      ELSIF NEW.status = 'clicked' AND NEW.lead_id IS NOT NULL THEN
        INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
        VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_clicked',
                'Link clicado no email', v_meta);
      ELSIF NEW.status = 'bounced' AND NEW.lead_id IS NOT NULL THEN
        INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
        VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_bounced',
                'Email retornou (bounce)', v_meta);
      ELSIF NEW.status = 'complained' AND NEW.lead_id IS NOT NULL THEN
        INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
        VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_complained',
                'Email marcado como spam', v_meta);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
```

- [ ] **Step 2 — verificação (cross-reading):**
  - `validate_campaign_send_status` (20260713190000, linha 74) aceita `pending/sent/delivered/opened/clicked/failed/unsubscribed/bounced/complained`. O fluxo usa exatamente esses → **nenhuma mudança de enum**.
  - `validate_campaign_send_channel` exige `channel IN ('email','whatsapp')`; fluxo usa `'email'`. OK.
  - `trg_campaign_send_event` é `AFTER INSERT OR UPDATE ... FOR EACH ROW` **sem lista de colunas** (20260330013031, linha 112) → dispara no UPDATE que só toca `resend_email_id`. Confirmado: **não** recriar o trigger.
  - `finalize_campaign_if_drained` / `reset_stuck_campaigns` filtram por `campaign_id` → linhas de fluxo (NULL) ficam fora. Confirmado lendo as funções em 20260713210000/20260713220000.
- [ ] **Step 3:** Commit: `feat(fase6): campaign_sends aceita envio de fluxo (journey_run_id/journey_node_id) + índice único por nó` + push.

---

## Task 6.3 — Migration: fila `journey_events` + trigger **fail-open** em `contact_events`

**Files:**
- Create: `supabase/migrations/20260714101000_journey_events_queue.sql`

**Interfaces:**
- Produces: fila pgmq `journey_events`; wrappers `journey_queue_read(int,int)` / `journey_queue_delete(jsonb)`; trigger `trg_contact_event_journey` em `contact_events`.
- Mensagem: `{ event_id, lead_id, event_type, occurred_at, metadata }`.

> **Esta é a tarefa com o maior potencial de dano do plano.** `contact_events` é escrita pela **captura de lead** (`lead-capture`, `receive-contact-event`, `identity-upsert`, `register-conversion`, além do trigger de `campaign_sends`). Um `RAISE` dentro deste trigger **aborta a transação de quem escreveu** — ou seja, um bug aqui derruba a captura de leads das landing pages em produção. Daí o `EXCEPTION WHEN OTHERS THEN RAISE WARNING`: perder um wake-up de fluxo é ruim; perder um lead é inaceitável.

- [ ] **Step 1:** Criar o arquivo:

```sql
-- ============================================================================
-- Fase 6 — Fila de eventos que acordam fluxos.
--   1. fila pgmq journey_events + wrappers (mesmo padrão de email_send_queue,
--      migration 20260713210000: interface jsonb, SECURITY DEFINER, só service_role)
--   2. trigger AFTER INSERT em contact_events -- FAIL-OPEN, obrigatoriamente
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'journey_events') THEN
    PERFORM pgmq.create('journey_events');
  END IF;
EXCEPTION WHEN undefined_function THEN
  BEGIN
    PERFORM pgmq.create('journey_events');
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.journey_queue_read(p_vt integer DEFAULT 120, p_qty integer DEFAULT 100)
RETURNS TABLE (msg_id bigint, read_ct integer, message jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pgmq AS $$
  SELECT r.msg_id, r.read_ct, r.message
  FROM pgmq.read('journey_events', p_vt, p_qty) AS r;
$$;

CREATE OR REPLACE FUNCTION public.journey_queue_delete(p_msg_ids jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE v_count integer;
BEGIN
  IF p_msg_ids IS NULL OR jsonb_typeof(p_msg_ids) <> 'array' OR jsonb_array_length(p_msg_ids) = 0 THEN
    RETURN 0;
  END IF;
  SELECT count(*) INTO v_count
  FROM pgmq.delete('journey_events', ARRAY(SELECT (jsonb_array_elements_text(p_msg_ids))::bigint));
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.journey_queue_read(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_queue_delete(jsonb)          FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.journey_queue_read(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.journey_queue_delete(jsonb)          TO service_role;

-- ============================================================================
-- Trigger de wake-up. FAIL-OPEN, e isso NÃO é negociável:
-- contact_events é escrita no caminho de CAPTURA DE LEAD (lead-capture,
-- receive-contact-event, identity-upsert) e pelo trigger de campaign_sends.
-- Se este trigger lançar (fila ausente, pgmq indisponível, permissão), ele
-- ABORTA A TRANSAÇÃO DE QUEM ESCREVEU -- ou seja, derruba a captura de leads das
-- landing pages. Perder um wake-up de fluxo é ruim; perder um lead é inaceitável.
-- Todo o corpo vive dentro de BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING.
--
-- Guarda de volume: só enfileira se ALGUÉM puder se interessar pelo evento --
-- (a) existe fluxo ativo com entrada por este event_type, ou
-- (b) existe run em espera deste lead por este event_type.
-- Os dois são lookups por índice (idx_journeys_event_entry,
-- idx_journey_runs_waiting_event). Sem isso, cada lead capturado empurraria
-- mensagens inúteis na fila para sempre.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_contact_event_to_journey_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE
  v_interested boolean;
BEGIN
  BEGIN
    IF NEW.lead_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT
      EXISTS (
        SELECT 1 FROM public.journeys j
         WHERE j.status = 'active'
           AND j.entry_type = 'event'
           AND j.entry_config->>'event_type' = NEW.event_type
      )
      OR EXISTS (
        SELECT 1 FROM public.journey_runs r
         WHERE r.lead_id = NEW.lead_id
           AND r.state = 'waiting'
           AND r.waiting_event = NEW.event_type
      )
    INTO v_interested;

    IF NOT v_interested THEN
      RETURN NEW;
    END IF;

    PERFORM pgmq.send('journey_events', jsonb_build_object(
      'event_id',    NEW.id,
      'lead_id',     NEW.lead_id,
      'event_type',  NEW.event_type,
      'occurred_at', COALESCE(NEW.occurred_at, now()),
      'metadata',    COALESCE(NEW.metadata, '{}'::jsonb)
    ));
  EXCEPTION WHEN OTHERS THEN
    -- FAIL-OPEN. Nunca abortar a transação de quem escreveu a timeline.
    RAISE WARNING 'fn_contact_event_to_journey_queue: falha ao enfileirar evento % (lead %): %',
      NEW.event_type, NEW.lead_id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contact_event_journey ON public.contact_events;
CREATE TRIGGER trg_contact_event_journey
  AFTER INSERT ON public.contact_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_contact_event_to_journey_queue();
```

- [ ] **Step 2 — verificação (cross-reading), cada item explicitamente:**
  - O trigger é `AFTER INSERT` (não BEFORE): não interfere na linha gravada.
  - **Todo** o corpo está dentro do bloco protegido; nenhum `RAISE EXCEPTION` escapa. Reler o arquivo inteiro procurando por qualquer statement fora do `BEGIN ... EXCEPTION`.
  - `contact_events.lead_id` é nullable (`ON DELETE SET NULL`, migration 20260330003249) → guarda `IF NEW.lead_id IS NULL THEN RETURN NEW`.
  - `pgmq.send` é um INSERT comum → **transacional**: o wake-up só existe se a timeline foi gravada. Nada de "evento enfileirado para uma linha que sofreu rollback".
  - `SECURITY DEFINER` + `search_path` incluindo `pgmq`: o `lead-capture` roda com service-role, mas o trigger também dispara em escritas de outros papéis — DEFINER garante permissão de `pgmq.send`.
- [ ] **Step 3:** Commit: `feat(fase6): fila pgmq journey_events + trigger fail-open em contact_events` + push.

---

## Task 6.4 — Migration: RPCs do motor

**Files:**
- Create: `supabase/migrations/20260714101500_journey_engine_rpcs.sql`

**Interfaces (nomes e assinaturas exatos — o `journey-worker` depende deles):**
- `public.journey_claim_due_runs(p_limit integer DEFAULT 50, p_lease_seconds integer DEFAULT 300)` → `TABLE(run_id uuid, journey_id uuid, lead_id uuid, current_node_id text, state text, waiting_event text, context jsonb, lock_token uuid, nodes jsonb, reentry text)`
- `public.journey_enroll_segment(p_journey_id uuid, p_limit integer DEFAULT 500)` → `integer`
- `public.journey_enroll_event(p_lead_id uuid, p_event_type text)` → `integer`
- `public.journey_wake_on_event(p_lead_id uuid, p_event_type text, p_occurred_at timestamptz, p_metadata jsonb)` → `integer`
- `public.journey_enqueue_email(p_run_id uuid, p_node_id text, p_journey_id uuid, p_lead_id uuid)` → `jsonb` (`{"send_id": "...", "status": "enqueued"|"duplicate"|"no_email"}`)
- `public.evaluate_rules_for_lead(p_lead_id uuid, p_rules jsonb, p_logic text DEFAULT 'and')` → `boolean`
- `public.evaluate_segment_for_lead(p_lead_id uuid, p_segment_id uuid)` → `boolean`
- `public.journey_node_metrics(p_journey_id uuid)` → `jsonb`

**Por que tudo isso é SQL e não TypeScript:** cada uma dessas operações é uma corrida em potencial (dois workers, cron sobreposto, evento chegando durante a varredura). Em SQL elas são **uma transação**; em Deno seriam read-then-write com janela.

- [ ] **Step 1:** Criar o arquivo:

```sql
-- ============================================================================
-- Fase 6 — RPCs do motor de fluxos.
-- Todas SECURITY DEFINER e restritas ao service_role (o journey-worker), exceto
-- journey_node_metrics (lida pela UI via journeys-api).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CLAIM dos runs devidos.
-- FOR UPDATE SKIP LOCKED + lease + fencing token: duas invocações concorrentes
-- do worker (tick do cron se sobrepondo a uma execução lenta) NUNCA pegam o
-- mesmo run. O lock_token devolvido é exigido em toda escrita posterior do
-- worker (.eq('lock_token', token)) -- um worker cujo lease expirou não
-- consegue mais sobrescrever o run de quem assumiu.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_claim_due_runs(
  p_limit integer DEFAULT 50,
  p_lease_seconds integer DEFAULT 300
)
RETURNS TABLE (
  run_id          uuid,
  journey_id      uuid,
  lead_id         uuid,
  current_node_id text,
  state           text,
  waiting_event   text,
  context         jsonb,
  lock_token      uuid,
  nodes           jsonb,
  reentry         text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token uuid := gen_random_uuid();
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT r.id
    FROM public.journey_runs r
    JOIN public.journeys j ON j.id = r.journey_id
    WHERE r.state IN ('active','waiting')
      AND r.wakeup_at <= now()
      AND (r.locked_until IS NULL OR r.locked_until <= now())
      -- Fluxo pausado/arquivado congela o AVANÇO dos runs (decisão documentada:
      -- emails já enfileirados ainda saem -- janela <= ~1 min).
      AND j.status = 'active'
    ORDER BY r.wakeup_at
    LIMIT p_limit
    FOR UPDATE OF r SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.journey_runs r
       SET lock_token   = v_token,
           locked_until = now() + make_interval(secs => p_lease_seconds),
           updated_at   = now()
      FROM due
     WHERE r.id = due.id
    RETURNING r.id, r.journey_id, r.lead_id, r.current_node_id, r.state,
              r.waiting_event, r.context
  )
  SELECT c.id, c.journey_id, c.lead_id, c.current_node_id, c.state,
         c.waiting_event, c.context, v_token, j.nodes, j.reentry
  FROM claimed c
  JOIN public.journeys j ON j.id = c.journey_id;
END $$;

-- ---------------------------------------------------------------------------
-- 2. ENTRADA POR SEGMENTO (varredura). Set-based de propósito: puxar 20 mil
-- lead_ids para o Deno e re-checar um a um seria lento e cheio de corrida.
-- evaluate_segment_rules (20260713250000) é SECURITY DEFINER com guarda de
-- admin que LIBERA auth.uid() IS NULL (service_role/cron) -- é por aí que
-- passamos, exatamente como o send-campaign já faz.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_enroll_segment(
  p_journey_id uuid,
  p_limit integer DEFAULT 500
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_j       public.journeys%ROWTYPE;
  v_segment uuid;
  v_count   integer := 0;
BEGIN
  SELECT * INTO v_j FROM public.journeys WHERE id = p_journey_id;
  IF NOT FOUND OR v_j.status <> 'active' OR v_j.entry_type <> 'segment' OR v_j.entry_node_id IS NULL THEN
    RETURN 0;
  END IF;

  v_segment := nullif(v_j.entry_config->>'segment_id', '')::uuid;
  IF v_segment IS NULL THEN
    RETURN 0;
  END IF;

  WITH cand AS (
    SELECT e.lead_id
    FROM public.evaluate_segment_rules(v_segment) e
    WHERE NOT EXISTS (
      SELECT 1 FROM public.journey_runs r
       WHERE r.journey_id = p_journey_id
         AND r.lead_id = e.lead_id
         -- reentry 'once'   : qualquer run anterior já barra
         -- reentry 'allowed': só um run ABERTO barra
         AND (v_j.reentry = 'once' OR r.state IN ('active','waiting'))
    )
    LIMIT p_limit
  ), ins AS (
    INSERT INTO public.journey_runs (journey_id, lead_id, current_node_id, state, wakeup_at, context)
    SELECT p_journey_id, c.lead_id, v_j.entry_node_id, 'active', now(),
           jsonb_build_object('entry', 'segment', 'segment_id', v_segment)
    FROM cand c
    -- Rede de segurança contra a corrida com a entrada por evento no mesmo
    -- instante: uniq_journey_runs_open resolve o empate sem erro.
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;

  RETURN v_count;
END $$;

-- ---------------------------------------------------------------------------
-- 3. ENTRADA POR EVENTO. Chamada pelo worker para cada mensagem drenada da fila
-- journey_events.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_enroll_event(
  p_lead_id uuid,
  p_event_type text
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_lead_id IS NULL OR coalesce(p_event_type, '') = '' THEN
    RETURN 0;
  END IF;

  WITH j AS (
    SELECT id, entry_node_id, reentry
    FROM public.journeys
    WHERE status = 'active'
      AND entry_type = 'event'
      AND entry_config->>'event_type' = p_event_type
      AND entry_node_id IS NOT NULL
  ), cand AS (
    SELECT j.id AS journey_id, j.entry_node_id
    FROM j
    WHERE NOT EXISTS (
      SELECT 1 FROM public.journey_runs r
       WHERE r.journey_id = j.id
         AND r.lead_id = p_lead_id
         AND (j.reentry = 'once' OR r.state IN ('active','waiting'))
    )
  ), ins AS (
    INSERT INTO public.journey_runs (journey_id, lead_id, current_node_id, state, wakeup_at, context)
    SELECT c.journey_id, p_lead_id, c.entry_node_id, 'active', now(),
           jsonb_build_object('entry', 'event', 'event_type', p_event_type)
    FROM cand c
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;

  RETURN v_count;
END $$;

-- ---------------------------------------------------------------------------
-- 4. WAKE-UP de runs em espera.
-- Só acorda o run se o evento aconteceu DEPOIS de ele entrar no nó de espera
-- (context.waiting_since, gravado pelo worker). Sem isso, um email aberto ontem
-- satisfaria um "espere abertura" criado hoje.
-- Quando o nó traz config.source_node_id, o casamento é EXATO: o evento precisa
-- ter vindo daquele nó DESTE run (metadata gravada por fn_campaign_send_event,
-- Task 6.2) -- "abriu ESTE email", não "abriu qualquer email".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_wake_on_event(
  p_lead_id     uuid,
  p_event_type  text,
  p_occurred_at timestamptz,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_lead_id IS NULL OR coalesce(p_event_type, '') = '' THEN
    RETURN 0;
  END IF;

  WITH upd AS (
    UPDATE public.journey_runs r
       SET state       = 'active',
           wakeup_at   = now(),
           context     = r.context
                         || jsonb_build_object('event_matched', true)
                         || jsonb_build_object('last_event', jsonb_build_object(
                              'event_type', p_event_type,
                              'occurred_at', COALESCE(p_occurred_at, now())
                            )),
           updated_at  = now(),
           -- Libera qualquer lease: o run precisa ser reivindicável AGORA.
           lock_token  = NULL,
           locked_until = NULL
      FROM public.journeys j,
           LATERAL (
             SELECT n
             FROM jsonb_array_elements(j.nodes) n
             WHERE n->>'id' = r.current_node_id
             LIMIT 1
           ) node
     WHERE j.id = r.journey_id
       AND j.status = 'active'
       AND r.lead_id = p_lead_id
       AND r.state = 'waiting'
       AND r.waiting_event = p_event_type
       -- evento tem que ser posterior à entrada no nó de espera
       AND COALESCE(p_occurred_at, now()) >=
           COALESCE((r.context->>'waiting_since')::timestamptz, r.entered_at)
       -- casamento exato por nó de origem, quando o nó pede
       AND (
             coalesce(node.n#>>'{config,source_node_id}', '') = ''
             OR (
                  p_metadata->>'journey_node_id' = node.n#>>'{config,source_node_id}'
              AND p_metadata->>'journey_run_id'  = r.id::text
             )
           )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;

  RETURN v_count;
END $$;

-- ---------------------------------------------------------------------------
-- 5. ENQUEUE DO EMAIL DE FLUXO -- o coração da propriedade nº 1.
-- Cria a linha em campaign_sends e publica na fila pgmq NA MESMA TRANSAÇÃO
-- (pgmq.send é um INSERT comum, logo transacional). Consequências:
--   * a mensagem nunca existe sem a linha (mensagem órfã seria descartada pelo
--     worker, mas o lead ficaria sem email e sem rastro);
--   * a linha nunca existe sem a mensagem (linha 'pending' encalhada -- que só o
--     sweeper resolveria);
--   * o ON CONFLICT DO NOTHING no índice único (journey_run_id, journey_node_id)
--     faz a REEXECUÇÃO do nó (lease expirado, worker morto) ser um no-op: devolve
--     status 'duplicate' e NENHUM segundo email é criado ou enfileirado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_enqueue_email(
  p_run_id     uuid,
  p_node_id    text,
  p_journey_id uuid,
  p_lead_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE
  v_lead    public.leads%ROWTYPE;
  v_send_id uuid;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_email', 'reason', 'lead inexistente');
  END IF;

  -- Lead sem email: grava a linha como 'failed' (visível no relatório do nó) e
  -- NÃO enfileira. Mesma semântica do send-campaign para a audiência sem email.
  IF coalesce(btrim(v_lead.email), '') = '' THEN
    INSERT INTO public.campaign_sends
      (campaign_id, lead_id, dnia_id, channel, status, sent_at, error, journey_run_id, journey_node_id)
    VALUES
      (NULL, p_lead_id, v_lead.dnia_id, 'email', 'failed', now(), 'Lead has no email', p_run_id, p_node_id)
    ON CONFLICT (journey_run_id, journey_node_id) WHERE journey_run_id IS NOT NULL DO NOTHING;
    RETURN jsonb_build_object('status', 'no_email');
  END IF;

  INSERT INTO public.campaign_sends
    (campaign_id, lead_id, dnia_id, channel, status, sent_at, journey_run_id, journey_node_id)
  VALUES
    (NULL, p_lead_id, v_lead.dnia_id, 'email', 'pending', NULL, p_run_id, p_node_id)
  ON CONFLICT (journey_run_id, journey_node_id) WHERE journey_run_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_send_id;

  -- Conflito: este (run, nó) JÁ tem envio. Reexecução do nó -> no-op absoluto.
  IF v_send_id IS NULL THEN
    RETURN jsonb_build_object('status', 'duplicate');
  END IF;

  PERFORM pgmq.send('email_send_queue', jsonb_build_object(
    'send_id',         v_send_id,
    'lead_id',         p_lead_id,
    'journey_id',      p_journey_id,
    'journey_run_id',  p_run_id,
    'journey_node_id', p_node_id
  ));

  RETURN jsonb_build_object('status', 'enqueued', 'send_id', v_send_id);
END $$;

-- ---------------------------------------------------------------------------
-- 6. Avaliação de condição para UM lead (branch_attribute).
-- Reusa build_segment_condition (20260713250000): UM único dialeto de regra no
-- sistema inteiro -- o mesmo do preview de segmento, da avaliação de segmento e
-- do ramo do fluxo. Nada de reimplementar em JS (foi exatamente essa duplicação
-- que gerou o bug do 'qualificacao' na Fase 5).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_rules_for_lead(
  p_lead_id uuid,
  p_rules   jsonb,
  p_logic   text DEFAULT 'and'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule   jsonb;
  v_cond   text;
  v_conds  text[] := ARRAY[]::text[];
  v_logic  text := lower(coalesce(p_logic, 'and'));
  v_sql    text;
  v_result boolean;
BEGIN
  -- Mesma guarda das RPCs da Fase 5 (ver comentários em 20260713250000).
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'anon' THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  IF v_logic NOT IN ('and','or') THEN v_logic := 'and'; END IF;

  FOR v_rule IN SELECT jsonb_array_elements(coalesce(p_rules, '[]'::jsonb))
  LOOP
    v_cond := public.build_segment_condition(v_rule);
    IF v_cond IS NOT NULL THEN
      v_conds := v_conds || v_cond;
    END IF;
  END LOOP;

  -- FAIL-CLOSED: nenhuma condição reconhecida => o ramo "sim" NÃO é tomado.
  -- (Diferente de um segmento sem regras, que legitimamente casa com todos: aqui
  -- um ramo que casa com todo mundo mandaria o email de "hot lead" para a base
  -- inteira.)
  IF array_length(v_conds, 1) IS NULL THEN
    RETURN false;
  END IF;

  v_sql := 'SELECT EXISTS (SELECT 1 FROM leads WHERE id = '
           || quote_literal(p_lead_id) || '::uuid AND ('
           || array_to_string(v_conds, CASE WHEN v_logic = 'or' THEN ' OR ' ELSE ' AND ' END)
           || '))';

  EXECUTE v_sql INTO v_result;
  RETURN coalesce(v_result, false);
END $$;

-- ---------------------------------------------------------------------------
-- 7. "Este lead está no segmento X?" (branch_segment).
-- Não usa evaluate_segment_rules: aquela devolve a base inteira do segmento
-- (até 20 mil linhas) -- rodar isso por lead, 50 leads por tick, seria absurdo.
-- Mesma construção de condição, com o predicado do lead embutido.
-- Segmento dinâmico SEM regras devolve TRUE, espelhando evaluate_segment_rules
-- (que devolve todos os leads) -- preview e ramo precisam concordar.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_segment_for_lead(
  p_lead_id    uuid,
  p_segment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seg    public.segments%ROWTYPE;
  v_rule   jsonb;
  v_cond   text;
  v_conds  text[] := ARRAY[]::text[];
  v_sql    text;
  v_result boolean;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'anon' THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  SELECT * INTO v_seg FROM public.segments WHERE id = p_segment_id;
  IF NOT FOUND THEN
    RETURN false; -- segmento apagado: fail-closed
  END IF;

  IF v_seg.type = 'static' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.segment_contacts sc
       WHERE sc.segment_id = p_segment_id AND sc.lead_id = p_lead_id
    );
  END IF;

  FOR v_rule IN SELECT jsonb_array_elements(coalesce(v_seg.rules, '[]'::jsonb))
  LOOP
    v_cond := public.build_segment_condition(v_rule);
    IF v_cond IS NOT NULL THEN
      v_conds := v_conds || v_cond;
    END IF;
  END LOOP;

  IF array_length(v_conds, 1) IS NULL THEN
    -- Espelha evaluate_segment_rules: sem condições => todos os leads.
    RETURN EXISTS (SELECT 1 FROM public.leads WHERE id = p_lead_id);
  END IF;

  v_sql := 'SELECT EXISTS (SELECT 1 FROM leads WHERE id = '
           || quote_literal(p_lead_id) || '::uuid AND ('
           || array_to_string(v_conds, CASE WHEN v_seg.logic = 'or' THEN ' OR ' ELSE ' AND ' END)
           || '))';

  EXECUTE v_sql INTO v_result;
  RETURN coalesce(v_result, false);
END $$;

-- ---------------------------------------------------------------------------
-- 8. Métricas por nó (consumidas pelo builder via journeys-api).
-- "entered" vem do step log; as métricas de email vêm de campaign_sends -- a
-- MESMA fonte da verdade das campanhas (nada de contador paralelo).
-- 'sent' = resend_email_id IS NOT NULL (envio confirmado pelo Resend), coerente
-- com o gatilho de email_sent na timeline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_node_metrics(p_journey_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_out jsonb;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'anon' THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  WITH steps AS (
    SELECT node_id,
           count(DISTINCT run_id) FILTER (WHERE result = 'entered') AS entered
    FROM public.journey_step_log
    WHERE journey_id = p_journey_id
    GROUP BY node_id
  ),
  mails AS (
    SELECT cs.journey_node_id AS node_id,
           count(*)                                                          AS enqueued,
           count(*) FILTER (WHERE cs.resend_email_id IS NOT NULL)            AS sent,
           count(*) FILTER (WHERE cs.status IN ('opened','clicked'))         AS opened,
           count(*) FILTER (WHERE cs.status = 'clicked')                     AS clicked,
           count(*) FILTER (WHERE cs.status IN ('failed','bounced'))         AS failed
    FROM public.campaign_sends cs
    JOIN public.journey_runs r ON r.id = cs.journey_run_id
    WHERE r.journey_id = p_journey_id AND cs.journey_node_id IS NOT NULL
    GROUP BY cs.journey_node_id
  ),
  merged AS (
    SELECT coalesce(s.node_id, m.node_id) AS node_id,
           coalesce(s.entered, 0)         AS entered,
           jsonb_build_object(
             'enqueued', coalesce(m.enqueued, 0),
             'sent',     coalesce(m.sent, 0),
             'opened',   coalesce(m.opened, 0),
             'clicked',  coalesce(m.clicked, 0),
             'failed',   coalesce(m.failed, 0)
           ) AS emails
    FROM steps s
    FULL OUTER JOIN mails m ON m.node_id = s.node_id
  )
  SELECT coalesce(
           jsonb_object_agg(node_id, jsonb_build_object('entered', entered, 'emails', emails)),
           '{}'::jsonb
         )
    INTO v_out
  FROM merged;

  RETURN coalesce(v_out, '{}'::jsonb);
END $$;

-- ---------------------------------------------------------------------------
-- ACLs. Toda função nova em `public` NASCE com GRANT explícito para anon
-- (ALTER DEFAULT PRIVILEGES do schema base do Supabase) -- por isso o REVOKE
-- precisa CITAR anon (ver o comentário longo em 20260713250000).
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.journey_claim_due_runs(integer, integer)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_enroll_segment(uuid, integer)                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_enroll_event(uuid, text)                     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_wake_on_event(uuid, text, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_enqueue_email(uuid, text, uuid, uuid)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_rules_for_lead(uuid, jsonb, text)           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_segment_for_lead(uuid, uuid)                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.journey_node_metrics(uuid)                           FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.journey_claim_due_runs(integer, integer)             TO service_role;
GRANT EXECUTE ON FUNCTION public.journey_enroll_segment(uuid, integer)                TO service_role;
GRANT EXECUTE ON FUNCTION public.journey_enroll_event(uuid, text)                     TO service_role;
GRANT EXECUTE ON FUNCTION public.journey_wake_on_event(uuid, text, timestamptz, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.journey_enqueue_email(uuid, text, uuid, uuid)        TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_rules_for_lead(uuid, jsonb, text)           TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_segment_for_lead(uuid, uuid)                TO service_role;
GRANT EXECUTE ON FUNCTION public.journey_node_metrics(uuid)                           TO service_role;
```

- [ ] **Step 2 — verificação (cross-reading), item a item:**
  - `evaluate_segment_rules` (20260713250000) tem a guarda `IF auth.uid() IS NOT NULL AND NOT has_role(...) THEN RAISE`; chamada de dentro de uma SECURITY DEFINER acionada pelo service_role → `auth.uid()` NULL e claim `role='service_role'` (≠ `anon`) → **passa**. Mesma rota já usada por `send-campaign`.
  - `ON CONFLICT (journey_run_id, journey_node_id) WHERE journey_run_id IS NOT NULL` — o predicado **precisa** ser repetido para a inferência casar com o índice **parcial** criado na Task 6.2. (É também por isso que este INSERT vive numa RPC e não num `.upsert()` do supabase-js: o PostgREST não emite o predicado do índice parcial.)
  - `pgmq.send('email_send_queue', ...)` — mesma fila do envio de campanha (**intencional**: um worker, um orçamento de rate limit, um lote do Resend pode misturar email de campanha e de fluxo sem problema, os itens são independentes).
  - `build_segment_condition` gera fragmentos que referenciam `leads.id` (ex.: `ee.lead_id = leads.id`) → o `FROM leads` das duas funções de avaliação resolve isso. Conferido contra o corpo da função na 20260713250000.
- [ ] **Step 3:** Commit: `feat(fase6): RPCs do motor de fluxos (claim, enroll, wake, enqueue de email, avaliação de regra)` + push.

---

## Task 6.5 — `process-email-queue` e `resend-webhook` aceitam envio de fluxo

**Files:**
- Modify: `supabase/functions/process-email-queue/index.ts`
- Modify: `supabase/functions/resend-webhook/index.ts`

**Interfaces:**
- Consumes: mensagem de fila com a forma de fluxo `{ send_id, lead_id, journey_id, journey_run_id, journey_node_id }` (produzida por `journey_enqueue_email`).
- Produces: todo email (campanha **e** fluxo) sai com a tag `send_id`.

> **Regra desta tarefa:** as únicas alterações permitidas são as listadas abaixo. **Não tocar** no claim, na dedupe, no 422, no 429, no rollback, no `resend_email_id`, no `markSend`, nem no `finalize`. Se o diff encostar nessas partes, ele está errado.

- [ ] **Step 1 — `process-email-queue`: tipo da mensagem.** Substituir a interface `QueueMsg`:

```ts
interface QueueMsg {
  msg_id: number;
  read_ct: number;
  message: {
    send_id: string;
    lead_id: string;
    // Campanha (forma legada, ainda em voo na fila):
    campaign_id?: string;
    // Fluxo (Fase 6) -- publicado por journey_enqueue_email:
    journey_id?: string;
    journey_run_id?: string;
    journey_node_id?: string;
  };
}
```

- [ ] **Step 2 — carregar o conteúdo dos dois donos.** No passo 2 do `processBatch` ("Campanhas e leads em bloco"), substituir o bloco de `campaignIds` por:

```ts
      // 2. Conteúdo dos DOIS donos possíveis (campanha ou fluxo) + leads, tudo em bloco.
      // `campaignIds` agora filtra explicitamente as mensagens de fluxo -- elas não têm
      // campaign_id, e um `undefined` aqui viraria um filtro .in() inválido e, pior,
      // entraria em out.campaigns (que alimenta o finalize da CAMPANHA).
      const campaignIds = [
        ...new Set(pending.map((m) => m.message.campaign_id).filter(Boolean) as string[]),
      ];
      const journeyIds = [
        ...new Set(pending.map((m) => m.message.journey_id).filter(Boolean) as string[]),
      ];
      const leadIds = [...new Set(pending.map((m) => m.message.lead_id))];
      out.campaigns = campaignIds;

      const campaignById = new Map<string, any>();
      if (campaignIds.length > 0) {
        const { data: campaignRows } = await sb
          .from("campaigns")
          .select("id, subject, body, status, channel")
          .in("id", campaignIds);
        for (const c of campaignRows ?? []) campaignById.set(String(c.id), c);
      }

      // Fluxo: o conteúdo vive no NÓ (journeys.nodes) + no template (email_templates).
      // LATE BINDING deliberado (ver docs/plano-fase6-journeys.md): editar o template
      // muda os emails ainda não enviados de fluxos ativos. Fluxo é perene; campanha
      // é um disparo.
      const nodeByKey = new Map<string, any>(); // `${journey_id}:${node_id}` -> nó
      if (journeyIds.length > 0) {
        const { data: journeyRows } = await sb
          .from("journeys")
          .select("id, nodes")
          .in("id", journeyIds);
        for (const j of journeyRows ?? []) {
          for (const n of (Array.isArray(j.nodes) ? j.nodes : []) as any[]) {
            nodeByKey.set(`${j.id}:${n?.id}`, n);
          }
        }
      }

      const templateIds = [
        ...new Set(
          pending
            .filter((m) => m.message.journey_id)
            .map((m) => nodeByKey.get(`${m.message.journey_id}:${m.message.journey_node_id}`))
            .map((n) => n?.config?.template_id)
            .filter(Boolean) as string[],
        ),
      ];
      const templateById = new Map<string, any>();
      if (templateIds.length > 0) {
        const { data: tplRows } = await sb
          .from("email_templates")
          .select("id, html")
          .in("id", templateIds);
        for (const t of tplRows ?? []) templateById.set(String(t.id), t);
      }

      const { data: leadRows } = await sb
        .from("leads")
        .select("id, nome, email, empresa, cargo")
        .in("id", leadIds);
      const leadById = new Map<string, any>((leadRows ?? []).map((l: any) => [l.id, l]));
```

- [ ] **Step 3 — resolução de conteúdo + tags.** No passo 4 (montagem do payload), dentro do `try`, substituir as guardas de campanha e a montagem de `subject`/`html`/`tags` por:

```ts
        try {
          if (!resendKey) { await fail("RESEND_API_KEY not configured"); continue; }
          if (!lead || !lead.email) { await fail("Lead has no email"); continue; }
          if (!isValidEmail(lead.email)) { await fail(`email inválido: ${String(lead.email).slice(0, 100)}`); continue; }
          if (suppressed.has(String(lead.email).toLowerCase().trim())) { await fail("suppressed"); continue; }

          // ---- Resolução de conteúdo: campanha OU fluxo -------------------------
          let rawSubject: string;
          let rawBody: string;
          // Tags de correlação. send_id vai em TODO email (campanha e fluxo): é o que
          // permite ao resend-webhook resolver o send de forma EXATA, sem heurística --
          // e é o que faz o cross-check anti-duplicata dos sweepers funcionar para
          // fluxos (email_events.campaign_send_id só é preenchido quando o webhook
          // resolve o send).
          const tags: { name: string; value: string }[] = [
            { name: "send_id", value: String(m.message.send_id) },
            { name: "lead_id", value: String(lead.id) },
          ];

          if (m.message.journey_id) {
            const node = nodeByKey.get(`${m.message.journey_id}:${m.message.journey_node_id}`);
            if (!node) { await fail("nó do fluxo não encontrado (fluxo editado?)"); continue; }
            if (node.type !== "send_email") { await fail(`nó ${node.id} não é send_email`); continue; }
            const tplId = node?.config?.template_id;
            const tpl = tplId ? templateById.get(String(tplId)) : null;
            if (!tpl) { await fail("template do nó não encontrado"); continue; }
            if (!tpl.html || String(tpl.html).trim() === "") { await fail("template do nó está vazio"); continue; }
            rawSubject = String(node?.config?.subject ?? "");
            rawBody = String(tpl.html);
            tags.push({ name: "journey_id", value: String(m.message.journey_id) });
            tags.push({ name: "journey_run_id", value: String(m.message.journey_run_id) });
            tags.push({ name: "journey_node_id", value: String(m.message.journey_node_id) });
          } else {
            const campaign = campaignById.get(String(m.message.campaign_id));
            if (!campaign) { await fail("Campaign not found"); continue; }
            if (campaign.channel !== "email") { await fail("Campanha não é de email"); continue; }
            if (campaign.status !== "sending") { await fail(`campanha não está em envio (status ${campaign.status})`); continue; }
            rawSubject = String(campaign.subject || "");
            rawBody = String(campaign.body || "");
            tags.push({ name: "campaign_id", value: String(campaign.id) });
          }

          const recipient = String(lead.email).trim();
          const unsubscribeUrl = await buildUnsubscribeUrl(String(lead.id), String(lead.email));

          let html = replaceVars(rawBody, lead, unsubscribeUrl);
          if (unsubscribeUrl && !html.includes("email-unsubscribe")) {
            const footer = `<p style="font-size:12px;color:#888;text-align:center;margin-top:24px">Não quer mais receber estes emails? <a href="${unsubscribeUrl}" style="color:#888">Descadastre-se</a></p>`;
            html = html.includes("</body>") ? html.replace("</body>", `${footer}</body>`) : `${html}${footer}`;
          }

          const item: Record<string, unknown> = {
            from: emailFrom,
            to: [recipient],
            subject: replaceVars(rawSubject, lead, unsubscribeUrl),
            html,
            tags,
          };
          if (unsubscribeUrl) {
            item.headers = {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            };
          }

          payload.push(item);
          payloadMsgs.push(m);
        } catch (err) {
          console.error("process-email-queue payload build error (destinatario isolado):", m.message.send_id, err);
          await fail(`erro inesperado ao montar payload: ${String(err).slice(0, 200)}`);
        }
```
Remover as declarações antigas `const campaign = campaignById.get(m.message.campaign_id)` e `const lead = leadById.get(m.message.lead_id)` do topo do loop, mantendo **apenas** `const lead = leadById.get(m.message.lead_id);` (o `campaign` agora é resolvido dentro do ramo). O `const fail = async (reason) => {...}` continua igual.

- [ ] **Step 4 — `resend-webhook`: resolver por `send_id`.** Substituir o passo 2 (resolução do send):

```ts
  // 2. Resolver o send. ORDEM IMPORTA:
  //    a) tags.send_id  -- EXATO (Fase 6: vai em todo email, campanha e fluxo);
  //    b) tags campaign_id+lead_id -- compatibilidade com emails em voo enviados
  //       antes deste deploy (e só existe para campanha);
  //    c) resend_email_id -- último fallback.
  //    Emails de FLUXO só têm o caminho (a) e o (c): não há campaign_id para casar.
  let send: { id: string; status: string } | null = null
  if (tags.send_id) {
    const { data } = await sb.from('campaign_sends').select('id,status')
      .eq('id', tags.send_id).maybeSingle()
    send = data
  }
  if (!send && tags.campaign_id && tags.lead_id) {
    const { data } = await sb.from('campaign_sends').select('id,status')
      .eq('campaign_id', tags.campaign_id).eq('lead_id', tags.lead_id)
      .order('sent_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
    send = data
  }
  if (!send && evt.data?.email_id) {
    const { data } = await sb.from('campaign_sends').select('id,status')
      .eq('resend_email_id', evt.data.email_id).maybeSingle()
    send = data
  }
```
`email_events.campaign_id` continua sendo preenchido a partir de `tags.campaign_id` (NULL para fluxo — esperado). O `update` de `campaign_send_id` que já existe passa a valer também para fluxos, **que é o que faz o `recover_lost_journey_sends` (Task 6.7) poder provar que um email saiu.**

- [ ] **Step 5 — verificação (cross-reading):**
  - Buscar por `campaign_id` no arquivo do worker e confirmar que **toda** ocorrência restante ou está no ramo de campanha, ou já é `.filter(Boolean)`.
  - Confirmar que `out.campaigns` nunca recebe `undefined` (o `finalize` roda em cima disso).
  - Confirmar que o claim (`.update({status:'sent'}) .in('id', claimIds) .eq('status','pending')`), a dedupe por `send_id`, o 422, o 429 e a gravação de `resend_email_id` **não foram tocados** (`git diff` deve mostrar só os blocos acima).
  - Limite do Resend: 10 tags por email. Fluxo usa 5, campanha 3. OK.
- [ ] **Step 6:** `npm run build`. Commit: `feat(fase6): worker de email envia emails de fluxo (conteúdo por nó/template + tag send_id)` + push. **Prompt de deploy (rodada 1).**

---

## Task 6.6 — Edge Function `journey-worker`

**Files:**
- Create: `supabase/functions/journey-worker/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Produces: `POST /journey-worker` (auth `validateToken` — Bearer `WEBHOOK_SECRET`, vindo do Vault via `invoke_edge_function`). Resposta: `{ enrolled, woken, executed, steps, failed }`.
- Consumes: RPCs da Task 6.4.

**Notas de projeto (ler antes de escrever código):**
1. **O worker não envia email.** Ele chama `journey_enqueue_email` e segue. Quem envia é o `process-email-queue`.
2. **O worker nunca escreve em `contact_events`.** O log dele é `journey_step_log`.
3. Toda escrita num run carrega o **fencing token** (`.eq('lock_token', token)`). Se o lease expirou e outro worker assumiu, a escrita não acontece — em vez de dois workers pisando um no outro.
4. `apply_tag` é feito **inline** (tabelas `tags` + `lead_tags`), **não** chamando a Edge Function `apply-lead-tag`: ela **não está registrada no `config.toml`** → `verify_jwt` volta ao default `true` → uma chamada server-to-server com `Bearer WEBHOOK_SECRET` seria barrada no gateway (é exatamente a armadilha documentada no `CLAUDE.md`). `lead_tags` tem PK `(lead_id, tag_id)` → insert idempotente.
5. `handoff_nexus` chama `handoff-to-nexus` (essa **está** no `config.toml` com `verify_jwt=false`) no modo `direct_stage`.

- [ ] **Step 1:** Criar `supabase/functions/journey-worker/index.ts`:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { validateToken, unauthorized, ok, error, handleCors } from "../_shared/auth.ts";

// MOTOR DE FLUXOS (Fase 6). Invocado pelo pg_cron a cada minuto via
// invoke_edge_function (WEBHOOK_SECRET do Vault). Três etapas por invocação:
//   A. entrada por segmento  (RPC journey_enroll_segment, set-based)
//   B. drenagem da fila journey_events (entrada por evento + wake-up de esperas)
//   C. execução dos runs devidos (claim com lease + fencing token)
//
// O QUE ESTE WORKER NÃO FAZ (de propósito):
//   * não envia email -- ele chama journey_enqueue_email, que cria a linha em
//     campaign_sends e publica na fila email_send_queue NA MESMA TRANSAÇÃO; quem
//     envia é o process-email-queue, herdando supressão/unsubscribe/claim/422/429;
//   * não escreve em contact_events -- a timeline tem um único emissor
//     (fn_campaign_send_event). O log daqui é journey_step_log.

const WALL_CLOCK_BUDGET_MS = 100_000; // teto da Edge Function é ~150s
const RUN_BATCH = 50;
const LEASE_SECONDS = 300;
const EVENT_BATCH = 100;
const EVENT_VT = 120;
const MAX_STEPS_PER_RUN = 20;   // trava anti-loop (o grafo já é acíclico; cinto e suspensório)
const MAX_NODE_ATTEMPTS = 3;    // erro transitório num nó: 3 tentativas, depois 'failed'

interface JourneyNode {
  id: string;
  type: string;
  config?: Record<string, unknown>;
  next?: string | null;
  next_false?: string | null;
  next_timeout?: string | null;
}

interface DueRun {
  run_id: string;
  journey_id: string;
  lead_id: string;
  current_node_id: string | null;
  state: string;
  waiting_event: string | null;
  context: Record<string, any>;
  lock_token: string;
  nodes: JourneyNode[];
  reentry: string;
}

interface EventMsg {
  msg_id: number;
  read_ct: number;
  message: {
    event_id?: string;
    lead_id: string;
    event_type: string;
    occurred_at?: string;
    metadata?: Record<string, unknown>;
  };
}

const nowIso = () => new Date().toISOString();

async function logStep(
  sb: any,
  run: DueRun,
  node: { id: string; type: string },
  result: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const { error: err } = await sb.from("journey_step_log").insert({
    run_id: run.run_id,
    journey_id: run.journey_id,
    lead_id: run.lead_id,
    node_id: node.id,
    node_type: node.type,
    result,
    detail,
  });
  if (err) console.error("journey-worker logStep error:", run.run_id, node.id, result, err);
}

// Toda escrita num run passa por aqui: o fencing token (.eq('lock_token', ...))
// garante que um worker cujo lease expirou NÃO sobrescreve quem assumiu o run.
async function writeRun(sb: any, run: DueRun, patch: Record<string, unknown>): Promise<boolean> {
  const { data, error: err } = await sb
    .from("journey_runs")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", run.run_id)
    .eq("lock_token", run.lock_token)
    .select("id");
  if (err) {
    console.error("journey-worker writeRun error:", run.run_id, err);
    return false;
  }
  if (!data || data.length === 0) {
    console.error("journey-worker: lease perdido no run", run.run_id, "-- escrita descartada");
    return false;
  }
  return true;
}

async function applyTagInline(sb: any, leadId: string, rawTag: string): Promise<void> {
  // Mesma normalização de apply-lead-tag/index.ts. NÃO chamamos aquela function:
  // ela não está no config.toml -> verify_jwt=true -> chamada server-to-server com
  // WEBHOOK_SECRET seria barrada no gateway (armadilha documentada no CLAUDE.md).
  const tagName = String(rawTag || "").replace(/^\/+/, "").trim().toLowerCase();
  if (!tagName) throw new Error("tag vazia após normalização");

  const { data: existing } = await sb.from("tags").select("id").eq("name", tagName).maybeSingle();
  let tagId = existing?.id as string | undefined;

  if (!tagId) {
    const { data: created, error: insErr } = await sb
      .from("tags")
      .insert({ name: tagName })
      .select("id")
      .maybeSingle();
    if (insErr) {
      // Corrida com outro worker/usuário criando a mesma tag (name é UNIQUE): relê.
      const { data: again } = await sb.from("tags").select("id").eq("name", tagName).maybeSingle();
      tagId = again?.id;
      if (!tagId) throw new Error(`falha ao criar tag: ${insErr.message}`);
    } else {
      tagId = created?.id;
    }
  }
  if (!tagId) throw new Error("tag não resolvida");

  // PK (lead_id, tag_id) -> idempotente por construção (reexecução do nó não quebra).
  const { error: linkErr } = await sb
    .from("lead_tags")
    .upsert({ lead_id: leadId, tag_id: tagId }, { onConflict: "lead_id,tag_id", ignoreDuplicates: true });
  if (linkErr) throw new Error(`falha ao vincular tag: ${linkErr.message}`);
}

async function handoffNexus(leadId: string, cfg: Record<string, unknown>): Promise<void> {
  const base = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!base) throw new Error("SUPABASE_URL ausente");

  const res = await fetch(`${base}/functions/v1/handoff-to-nexus`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // handoff-to-nexus está no config.toml com verify_jwt=false e não valida
      // token no corpo; o header vai por consistência com os demais chamadores.
      Authorization: `Bearer ${secret ?? ""}`,
    },
    body: JSON.stringify({
      lead_id: leadId,
      direct_stage: true,
      stage_id: cfg.stage_id,
      stage_name: cfg.stage_name ?? null,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`handoff-to-nexus ${res.status}: ${body.slice(0, 200)}`);
  }
}

// Executa UM nó. Devolve o próximo node_id (ou null = fim), ou um "parque"
// (delay/wait) que interrompe a cadeia deste run nesta invocação.
type StepOutcome =
  | { kind: "advance"; next: string | null }
  | { kind: "park" }        // o run já foi persistido (delay/wait); parar a cadeia
  | { kind: "retry" }       // erro transitório: já reagendado
  | { kind: "fail" };       // erro terminal: run já marcado como failed

async function executeNode(sb: any, run: DueRun, node: JourneyNode): Promise<StepOutcome> {
  const cfg = (node.config ?? {}) as Record<string, any>;

  switch (node.type) {
    case "send_email": {
      const { data, error: err } = await sb.rpc("journey_enqueue_email", {
        p_run_id: run.run_id,
        p_node_id: node.id,
        p_journey_id: run.journey_id,
        p_lead_id: run.lead_id,
      });
      if (err) throw new Error(`journey_enqueue_email: ${err.message}`);
      const status = (data as any)?.status ?? "unknown";
      // 'duplicate' = este (run, nó) já tem envio (reexecução após lease expirado).
      // Nenhum segundo email é criado nem enfileirado -- garantido pelo índice único.
      await logStep(sb, run, node, status === "enqueued" ? "enqueued" : "skipped", data ?? {});
      return { kind: "advance", next: node.next ?? null };
    }

    case "delay": {
      const minutes = Number(cfg.minutes ?? 0);
      const wake = new Date(Date.now() + Math.max(1, minutes) * 60_000).toISOString();
      const okWrite = await writeRun(sb, run, {
        current_node_id: node.next ?? null,
        state: (node.next ?? null) === null ? "done" : "waiting",
        waiting_event: null,
        wakeup_at: wake,
        lock_token: null,
        locked_until: null,
        context: { ...run.context, attempts: 0 },
      });
      await logStep(sb, run, node, okWrite ? "entered" : "failed", { wake_at: wake });
      return { kind: "park" };
    }

    case "wait_for_event": {
      const matched = run.context?.event_matched === true;
      const timedOut = !matched; // o run só é devido aqui por evento (matched) ou por timeout
      if (matched) {
        await logStep(sb, run, node, "event_matched", { event: run.context?.last_event ?? null });
        const ctx = { ...run.context };
        delete ctx.event_matched;
        // Persistimos o contexto limpo já na transição (o próximo nó roda em seguida).
        run.context = { ...ctx, attempts: 0 };
        return { kind: "advance", next: node.next ?? null };
      }
      if (timedOut) {
        await logStep(sb, run, node, "timeout", { event_type: cfg.event_type });
        run.context = { ...run.context, attempts: 0 };
        return { kind: "advance", next: node.next_timeout ?? null };
      }
      return { kind: "advance", next: null };
    }

    case "branch_attribute": {
      const { data, error: err } = await sb.rpc("evaluate_rules_for_lead", {
        p_lead_id: run.lead_id,
        p_rules: cfg.rules ?? [],
        p_logic: cfg.logic ?? "and",
      });
      if (err) throw new Error(`evaluate_rules_for_lead: ${err.message}`);
      const hit = data === true;
      await logStep(sb, run, node, hit ? "branch_true" : "branch_false", {});
      return { kind: "advance", next: (hit ? node.next : node.next_false) ?? null };
    }

    case "branch_segment": {
      const { data, error: err } = await sb.rpc("evaluate_segment_for_lead", {
        p_lead_id: run.lead_id,
        p_segment_id: cfg.segment_id,
      });
      if (err) throw new Error(`evaluate_segment_for_lead: ${err.message}`);
      const hit = data === true;
      await logStep(sb, run, node, hit ? "branch_true" : "branch_false", { segment_id: cfg.segment_id });
      return { kind: "advance", next: (hit ? node.next : node.next_false) ?? null };
    }

    case "apply_tag": {
      await applyTagInline(sb, run.lead_id, String(cfg.tag_name ?? ""));
      await logStep(sb, run, node, "entered", { tag_name: cfg.tag_name });
      return { kind: "advance", next: node.next ?? null };
    }

    case "handoff_nexus": {
      await handoffNexus(run.lead_id, cfg);
      await logStep(sb, run, node, "entered", { stage_id: cfg.stage_id });
      return { kind: "advance", next: node.next ?? null };
    }

    default:
      throw new Error(`tipo de nó desconhecido: ${node.type}`);
  }
}

// Roda a cadeia de nós de um run até "parar" (delay/wait/fim/erro).
async function runChain(sb: any, run: DueRun): Promise<{ steps: number; failed: boolean }> {
  const byId = new Map<string, JourneyNode>(
    (Array.isArray(run.nodes) ? run.nodes : []).map((n) => [String(n.id), n]),
  );
  let steps = 0;

  while (steps < MAX_STEPS_PER_RUN) {
    const nodeId = run.current_node_id;
    if (!nodeId) {
      await writeRun(sb, run, { state: "done", lock_token: null, locked_until: null });
      return { steps, failed: false };
    }

    const node = byId.get(String(nodeId));
    if (!node) {
      // O fluxo foi editado e o nó sumiu debaixo do run. Terminal e VISÍVEL --
      // nunca silencioso.
      await writeRun(sb, run, {
        state: "failed",
        lock_token: null,
        locked_until: null,
        context: { ...run.context, error: `nó ${nodeId} não existe mais no fluxo` },
      });
      return { steps, failed: true };
    }

    let outcome: StepOutcome;
    try {
      outcome = await executeNode(sb, run, node);
    } catch (err) {
      const attempts = Number(run.context?.attempts ?? 0) + 1;
      await logStep(sb, run, node, "failed", { error: String(err).slice(0, 400), attempts });
      if (attempts < MAX_NODE_ATTEMPTS) {
        // Erro transitório (Nexus fora do ar, rede): reagenda o MESMO nó em 5 min.
        // Reexecutar send_email é seguro por construção (índice único (run, nó)).
        await writeRun(sb, run, {
          state: "waiting",
          wakeup_at: new Date(Date.now() + 5 * 60_000).toISOString(),
          lock_token: null,
          locked_until: null,
          context: { ...run.context, attempts, last_error: String(err).slice(0, 400) },
        });
        return { steps, failed: false };
      }
      await writeRun(sb, run, {
        state: "failed",
        lock_token: null,
        locked_until: null,
        context: { ...run.context, attempts, error: String(err).slice(0, 400) },
      });
      return { steps, failed: true };
    }

    steps++;

    if (outcome.kind === "park" || outcome.kind === "retry" || outcome.kind === "fail") {
      return { steps, failed: outcome.kind === "fail" };
    }

    // advance
    const next = outcome.next;
    if (next === null) {
      await writeRun(sb, run, {
        current_node_id: null,
        state: "done",
        waiting_event: null,
        lock_token: null,
        locked_until: null,
        context: { ...run.context, attempts: 0 },
      });
      return { steps, failed: false };
    }

    const nextNode = byId.get(String(next));
    if (nextNode && nextNode.type === "wait_for_event") {
      // Entra em espera: registra QUANDO começou a esperar (journey_wake_on_event
      // só aceita eventos posteriores a isso) e agenda o timeout.
      const cfg = (nextNode.config ?? {}) as Record<string, any>;
      const timeout = Math.max(1, Number(cfg.timeout_minutes ?? 1440));
      const ctx = { ...run.context, attempts: 0, waiting_since: nowIso() };
      delete ctx.event_matched;
      const okWrite = await writeRun(sb, run, {
        current_node_id: next,
        state: "waiting",
        waiting_event: String(cfg.event_type ?? ""),
        wakeup_at: new Date(Date.now() + timeout * 60_000).toISOString(),
        lock_token: null,
        locked_until: null,
        context: ctx,
      });
      await logStep(sb, run, nextNode, okWrite ? "entered" : "failed", { timeout_minutes: timeout });
      return { steps, failed: false };
    }

    // Segue na mesma invocação (branches e tags não custam um minuto cada).
    run.current_node_id = next;
    run.state = "active";
    run.waiting_event = null;
    if (nextNode) {
      await logStep(sb, run, nextNode, "entered", {});
    }
  }

  // Estouro do teto de passos: para o run e deixa o rastro (não deveria acontecer,
  // o grafo é acíclico por validação de banco).
  await writeRun(sb, run, {
    state: "failed",
    lock_token: null,
    locked_until: null,
    context: { ...run.context, error: `mais de ${MAX_STEPS_PER_RUN} passos numa invocação` },
  });
  return { steps, failed: true };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return error("Method not allowed", 405);
  if (!validateToken(req)) return unauthorized();

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const started = Date.now();
  let enrolled = 0, woken = 0, executed = 0, steps = 0, failed = 0;

  // ---- A. Entrada por segmento (varredura) --------------------------------
  const { data: segJourneys, error: sjErr } = await sb
    .from("journeys")
    .select("id")
    .eq("status", "active")
    .eq("entry_type", "segment");
  if (sjErr) console.error("journey-worker list segment journeys error:", sjErr);

  for (const j of segJourneys ?? []) {
    const { data: n, error: enErr } = await sb.rpc("journey_enroll_segment", {
      p_journey_id: j.id,
      p_limit: 500,
    });
    if (enErr) { console.error("journey-worker journey_enroll_segment error:", j.id, enErr); continue; }
    enrolled += typeof n === "number" ? n : 0;
  }

  // ---- B. Fila de eventos (entrada por evento + wake-up de esperas) --------
  while (Date.now() - started < WALL_CLOCK_BUDGET_MS / 2) {
    const { data: msgs, error: rdErr } = await sb.rpc("journey_queue_read", {
      p_vt: EVENT_VT,
      p_qty: EVENT_BATCH,
    });
    if (rdErr) { console.error("journey-worker journey_queue_read error:", rdErr); break; }

    const list = (msgs ?? []) as EventMsg[];
    if (list.length === 0) break;

    const done: number[] = [];
    for (const m of list) {
      const { lead_id, event_type, occurred_at, metadata } = m.message ?? ({} as any);
      if (!lead_id || !event_type) { done.push(m.msg_id); continue; }

      try {
        const { data: w, error: wErr } = await sb.rpc("journey_wake_on_event", {
          p_lead_id: lead_id,
          p_event_type: event_type,
          p_occurred_at: occurred_at ?? nowIso(),
          p_metadata: metadata ?? {},
        });
        if (wErr) throw new Error(wErr.message);
        woken += typeof w === "number" ? w : 0;

        const { data: e, error: eErr } = await sb.rpc("journey_enroll_event", {
          p_lead_id: lead_id,
          p_event_type: event_type,
        });
        if (eErr) throw new Error(eErr.message);
        enrolled += typeof e === "number" ? e : 0;

        done.push(m.msg_id);
      } catch (err) {
        // Não deleta a mensagem: volta após o visibility timeout. Se for poison,
        // read_ct cresce e a mensagem é abandonada aqui.
        console.error("journey-worker event error:", m.msg_id, err);
        if (m.read_ct > 5) done.push(m.msg_id);
      }
    }

    if (done.length > 0) {
      const { error: delErr } = await sb.rpc("journey_queue_delete", { p_msg_ids: done });
      if (delErr) console.error("journey-worker journey_queue_delete error:", delErr);
    }
    if (list.length < EVENT_BATCH) break;
  }

  // ---- C. Runs devidos ----------------------------------------------------
  while (Date.now() - started < WALL_CLOCK_BUDGET_MS) {
    const { data: runs, error: clErr } = await sb.rpc("journey_claim_due_runs", {
      p_limit: RUN_BATCH,
      p_lease_seconds: LEASE_SECONDS,
    });
    if (clErr) { console.error("journey-worker journey_claim_due_runs error:", clErr); break; }

    const list = (runs ?? []) as DueRun[];
    if (list.length === 0) break;

    for (const run of list) {
      // Contexto pode vir null do banco em linhas antigas; normaliza.
      run.context = (run.context ?? {}) as Record<string, any>;
      const r = await runChain(sb, run);
      executed++;
      steps += r.steps;
      if (r.failed) failed++;
      if (Date.now() - started > WALL_CLOCK_BUDGET_MS) break;
    }

    if (list.length < RUN_BATCH) break;
  }

  return ok({ enrolled, woken, executed, steps, failed });
});
```

- [ ] **Step 2:** Registrar no `config.toml` (no fim do arquivo):

```toml
[functions.journey-worker]
verify_jwt = false
```

- [ ] **Step 3 — verificação (cross-reading; sem Deno local):**
  - Todo `sb.from("journey_runs").update(...)` passa por `writeRun` (fencing token). Buscar por `journey_runs` no arquivo e confirmar que não há UPDATE direto.
  - Nenhuma escrita em `contact_events` (buscar a string: **zero** ocorrências).
  - Nenhuma chamada a `apply-lead-tag` (a function fora do `config.toml`).
  - `validateToken` (de `_shared/auth.ts`) compara com `WEBHOOK_SECRET` — o mesmo segredo que `invoke_edge_function` lê do Vault. Idêntico ao `process-email-queue`.
  - `wait_for_event`: o run só chega ao nó "devido" por (a) `journey_wake_on_event` (que seta `event_matched`) ou (b) o `wakeup_at` do timeout. O `else` é o timeout. Confirmar que `event_matched` é **removido** do contexto na saída (senão o próximo `wait_for_event` do mesmo fluxo casaria de graça).
- [ ] **Step 4:** `npm run build`. Commit: `feat(fase6): edge function journey-worker (entrada por segmento/evento + execução de runs)` + push. **Prompt de deploy (rodada 1).**

---

## Task 6.7 — Migration: sweepers de fluxo + jobs pg_cron

> **Só aplicar DEPOIS do deploy das functions da Task 6.5 e 6.6.** O cron chama `journey-worker`; agendar antes do deploy gera 404 a cada minuto.

**Files:**
- Create: `supabase/migrations/20260714110000_journey_cron_sweepers.sql`

**Interfaces:**
- Produces: `recover_lost_journey_sends()`, `requeue_orphan_journey_sends()`; jobs `journey-worker` (1/min), `recover-lost-journey-sends` (*/10), `requeue-orphan-journey-sends` (*/10).

- [ ] **Step 1:** Criar o arquivo:

```sql
-- ============================================================================
-- Fase 6 — Sweepers de fluxo + jobs de cron.
--
-- POR QUE FUNÇÕES NOVAS E NÃO UM PATCH EM recover_lost_sends:
-- a versão de campanha carrega toda a complexidade de REABRIR a campanha para
-- 'sending' antes de republicar (correção C1b, três revisões adversariais). Um
-- envio de fluxo não tem campanha para reabrir -- então a versão dele é uma
-- função IRMÃ, curta e auditável, e a função endurecida da campanha fica intacta.
-- (recover_lost_sends já filtra `cs.campaign_id IS NOT NULL`, ou seja, ignora
-- linhas de fluxo por construção -- verificado em 20260713220000, PARTE 4.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Sweeper A (fluxo): envios reivindicados-mas-não-despachados.
-- Assinatura: status='sent' AND resend_email_id IS NULL (a troca deliberada do
-- claim-before-send: duplicata -> envio perdido DETECTÁVEL).
--
-- CROSS-CHECK OBRIGATÓRIO: essa assinatura é um SUPERCONJUNTO -- ela também casa
-- com emails que SAÍRAM e cuja gravação do resend_email_id falhou (rede/5xx com
-- claim mantido). Reenviar cegamente = duplicata. Prova de que o email saiu:
-- existe algum email_events com campaign_send_id = cs.id (o resend-webhook passa
-- a preencher isso para fluxos graças à tag send_id, Task 6.5). Só reenfileiramos
-- quando NÃO existe nenhum evento correlacionado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recover_lost_journey_sends()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exhausted integer := 0;
  v_recovered integer := 0;
  v_queued    integer := 0;
  v_messages  jsonb;
BEGIN
  -- 1. Tentativas esgotadas: 'failed' terminal e visível ao operador.
  WITH exhausted AS (
    SELECT cs.id
    FROM public.campaign_sends cs
    WHERE cs.channel = 'email'
      AND cs.journey_run_id IS NOT NULL
      AND cs.status = 'sent'
      AND cs.resend_email_id IS NULL
      AND cs.sent_at < now() - interval '20 minutes'
      AND cs.recovery_count >= 2
      AND cs.lead_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.email_events ee WHERE ee.campaign_send_id = cs.id
      )
    LIMIT 500
  )
  UPDATE public.campaign_sends cs
     SET status = 'failed', error = 'recuperacao esgotada'
    FROM exhausted e
   WHERE cs.id = e.id
     AND cs.status = 'sent'
     AND cs.resend_email_id IS NULL;
  GET DIAGNOSTICS v_exhausted = ROW_COUNT;

  -- 2. Recuperáveis: devolve a 'pending' e republica. O claim do worker
  --    (pending -> sent, CAS) é o que garante que isto NUNCA duplica.
  WITH recovered AS (
    UPDATE public.campaign_sends cs
       SET status = 'pending', sent_at = NULL, recovery_count = cs.recovery_count + 1
     WHERE cs.id IN (
       SELECT c.id
       FROM public.campaign_sends c
       WHERE c.channel = 'email'
         AND c.journey_run_id IS NOT NULL
         AND c.status = 'sent'
         AND c.resend_email_id IS NULL
         AND c.sent_at < now() - interval '20 minutes'
         AND c.recovery_count < 2
         AND c.lead_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.email_events ee WHERE ee.campaign_send_id = c.id
         )
       ORDER BY c.sent_at
       LIMIT GREATEST(500 - v_exhausted, 0)
     )
    RETURNING cs.id, cs.lead_id, cs.journey_run_id, cs.journey_node_id
  )
  SELECT jsonb_agg(jsonb_build_object(
           'send_id', r.id,
           'lead_id', r.lead_id,
           'journey_id', (SELECT jr.journey_id FROM public.journey_runs jr WHERE jr.id = r.journey_run_id),
           'journey_run_id', r.journey_run_id,
           'journey_node_id', r.journey_node_id
         )),
         count(*)
    INTO v_messages, v_recovered
  FROM recovered r;

  IF v_messages IS NOT NULL THEN
    SELECT public.email_queue_send_batch(v_messages) INTO v_queued;
    RAISE NOTICE 'recover_lost_journey_sends: % linha(s) republicada(s) (% aceitas pelo pgmq)', v_recovered, COALESCE(v_queued, 0);
  END IF;

  RETURN jsonb_build_object('recovered', v_recovered, 'exhausted', v_exhausted, 'queued', v_queued);
END $$;

REVOKE ALL ON FUNCTION public.recover_lost_journey_sends() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sweeper B (fluxo): linhas 'pending' órfãs.
-- Em tese impossível: journey_enqueue_email cria a linha e publica a mensagem na
-- MESMA transação. Fica como defesa em profundidade (ex.: mensagem perdida por
-- manutenção do pgmq). Mesma técnica do reset_stuck_campaigns: resolve a tabela
-- interna da fila com to_regclass e, sem ela, ALERTA em vez de agir.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.requeue_orphan_journey_sends()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE
  v_queue_tbl regclass;
  v_messages  jsonb;
  v_count     integer := 0;
BEGIN
  v_queue_tbl := to_regclass('pgmq.q_email_send_queue');
  IF v_queue_tbl IS NULL THEN
    RAISE WARNING 'requeue_orphan_journey_sends: pgmq.q_email_send_queue não encontrada -- sweeper inerte';
    RETURN 0;
  END IF;

  -- SELECT direto na tabela da fila: somente leitura, não mexe em read_ct/vt
  -- (ao contrário de pgmq.read()). Mesmo cuidado do reset_stuck_campaigns.
  EXECUTE format($q$
    SELECT jsonb_agg(jsonb_build_object(
             'send_id', cs.id,
             'lead_id', cs.lead_id,
             'journey_id', jr.journey_id,
             'journey_run_id', cs.journey_run_id,
             'journey_node_id', cs.journey_node_id
           ))
    FROM public.campaign_sends cs
    JOIN public.journey_runs jr ON jr.id = cs.journey_run_id
    WHERE cs.channel = 'email'
      AND cs.journey_run_id IS NOT NULL
      AND cs.status = 'pending'
      AND cs.lead_id IS NOT NULL
      AND cs.created_at < now() - interval '15 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM %s q WHERE q.message ->> 'send_id' = cs.id::text
      )
  $q$, v_queue_tbl) INTO v_messages;

  IF v_messages IS NULL THEN
    RETURN 0;
  END IF;

  SELECT public.email_queue_send_batch(v_messages) INTO v_count;
  RAISE NOTICE 'requeue_orphan_journey_sends: % mensagem(ns) republicada(s)', COALESCE(v_count, 0);
  RETURN COALESCE(v_count, 0);
END $$;

REVOKE ALL ON FUNCTION public.requeue_orphan_journey_sends() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Jobs (idempotentes: unschedule antes de schedule -- mesmo padrão da 20260713220000)
-- ---------------------------------------------------------------------------
DO $$ BEGIN PERFORM cron.unschedule('journey-worker');              EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('recover-lost-journey-sends');  EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('requeue-orphan-journey-sends');EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'journey-worker',
  '* * * * *',
  $cron$ SELECT public.invoke_edge_function('journey-worker', '{}'::jsonb); $cron$
);

SELECT cron.schedule(
  'recover-lost-journey-sends',
  '*/10 * * * *',
  $cron$ SELECT public.recover_lost_journey_sends(); $cron$
);

SELECT cron.schedule(
  'requeue-orphan-journey-sends',
  '*/10 * * * *',
  $cron$ SELECT public.requeue_orphan_journey_sends(); $cron$
);
```

- [ ] **Step 2 — verificação (cross-reading):**
  - `campaign_sends.recovery_count` já existe (criada em 20260713220000, PARTE 4) — não recriar.
  - `email_queue_send_batch(jsonb)` aceita array jsonb de mensagens — a forma de fluxo (`send_id`/`lead_id`/`journey_*`) é exatamente a que o worker da Task 6.5 sabe ler.
  - `recover_lost_sends` (campanha) **não foi tocada**: `git diff` desta tarefa não pode conter o nome dela a não ser em comentário.
- [ ] **Step 3:** Commit: `feat(fase6): sweepers de envio de fluxo + jobs pg_cron do journey-worker` + push. **Prompt de deploy (rodada 2).**

---

## Task 6.8 — Fix `automations-api`: POST/PATCH perdiam `conditions` e `condition_logic`

**Files:**
- Modify: `supabase/functions/automations-api/index.ts`

**O bug (verificado):** o `POST` monta o `insert` com uma lista fixa de campos e **não inclui** `conditions` nem `condition_logic` (linhas 43–53). O `PATCH` tem o mesmo problema: `allowedFields` (linha 68) não lista os dois. Resultado: uma regra multi-condição criada pela API nasce sem condições — e o `automationEngine.ts` cai no fallback de condição única (`condition_type/operator/value`), aplicando **uma regra diferente da que o cliente pediu**. As colunas existem desde a migration `20260406235621` (`conditions jsonb DEFAULT '[]'`, `condition_logic text DEFAULT 'and'`). A UI não sofre com isso porque `useAutomationRules.saveRule` escreve direto na tabela via supabase-js.

- [ ] **Step 1:** No `POST`, substituir o objeto do `insert` por:

```ts
    // conditions/condition_logic são as colunas de regra MULTI-condição
    // (migration 20260406235621). Sem persisti-las, o automationEngine cai no
    // fallback de condição única e aplica uma regra diferente da pedida.
    const conditions = Array.isArray(body.conditions) ? body.conditions : []
    const conditionLogic = body.condition_logic === 'or' ? 'or' : 'and'

    const { data: rule, error: createErr } = await sb.from('automation_rules').insert({
      name: body.name,
      priority: body.priority || 0,
      condition_type: body.condition_type,
      condition_operator: body.condition_operator,
      condition_value: body.condition_value,
      conditions,
      condition_logic: conditionLogic,
      action_type: body.action_type,
      action_value: body.action_value || null,
      action_metadata: body.action_metadata || {},
      is_active: body.is_active !== undefined ? body.is_active : true
    }).select().single()
```

- [ ] **Step 2:** No `PATCH`, estender a allowlist e normalizar os dois campos:

```ts
    const allowedFields = [
      'is_active', 'name', 'priority',
      'condition_type', 'condition_operator', 'condition_value',
      'conditions', 'condition_logic',
      'action_type', 'action_value', 'action_metadata'
    ]
    const updateData: any = {}
    for (const f of allowedFields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }
    if (updateData.conditions !== undefined && !Array.isArray(updateData.conditions)) {
      return error('conditions deve ser um array')
    }
    if (updateData.condition_logic !== undefined && !['and', 'or'].includes(updateData.condition_logic)) {
      return error("condition_logic deve ser 'and' ou 'or'")
    }
```

- [ ] **Step 3 — verificação:** `curl` não roda local; cross-read contra `src/lib/automationEngine.ts` (linhas 110–115: usa `r.conditions` se for array não vazio, senão o fallback) e contra `useAutomationRules.saveRule` (que já manda os dois campos) — os dois caminhos passam a gravar a mesma coisa.
- [ ] **Step 4:** Commit: `fix(automations-api): persiste conditions e condition_logic no POST e no PATCH` + push. **Prompt de deploy (rodada 1).**

---

## Task 6.9 — Edge Function `journeys-api` (CRUD + métricas)

**Files:**
- Create: `supabase/functions/journeys-api/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- `GET /journeys-api` → `{ data: Journey[] }` (com `runs_active`, `runs_done` por fluxo)
- `GET /journeys-api?id=<uuid>` → `{ data: Journey, metrics: {...}, runs: {active,waiting,done,failed} }`
- `POST /journeys-api` `{ name, description?, entry_type, entry_config, reentry?, entry_node_id?, nodes? }` → `{ success, journey }`
- `PATCH /journeys-api?id=<uuid>` `{ ...campos }` → `{ success, journey }`
- `DELETE /journeys-api?id=<uuid>` → `{ success }` (só rascunho; o trigger do banco é a fronteira real)

**Por que TODA a UI passa por aqui:** `src/integrations/supabase/types.ts` é auto-gerado e **não pode ser regenerado nesta máquina**. Se a UI fizesse `supabase.from('journeys')`, o TypeScript não conheceria a tabela e o `npm run build` (gate obrigatório) quebraria. Passando por `functions.invoke`, o build passa sem tocar em `types.ts`.

- [ ] **Step 1:** Criar a function (padrão dual-auth idêntico ao `templates-api`):

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateAuth, unauthorized, ok, error, handleCors } from '../_shared/auth.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Dual-auth: server-to-server (WEBHOOK_SECRET / api_keys) OU JWT de admin do
// browser -- mesmo padrão de templates-api/index.ts.
async function isAuthorized(req: Request, sb: any, permission: 'read' | 'write'): Promise<boolean> {
  if (await validateAuth(req, sb, permission)) return true

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false
  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return false
    const { data: roleData } = await sb
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    return !!roleData
  } catch (err) {
    console.error('journeys-api isAuthorized error:', err)
    return false
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (req.method === 'GET') {
    if (!(await isAuthorized(req, sb, 'read'))) return unauthorized()

    if (id) {
      if (!UUID_RE.test(id)) return error('id inválido')
      const { data: journey, error: gErr } = await sb.from('journeys').select('*').eq('id', id).maybeSingle()
      if (gErr) return error(gErr.message, 500)
      if (!journey) return error('Fluxo não encontrado', 404)

      const { data: metrics } = await sb.rpc('journey_node_metrics', { p_journey_id: id })

      const { data: runRows } = await sb.from('journey_runs').select('state').eq('journey_id', id)
      const runs = { active: 0, waiting: 0, done: 0, failed: 0, exited: 0 } as Record<string, number>
      for (const r of runRows ?? []) runs[r.state] = (runs[r.state] ?? 0) + 1

      return ok({ data: journey, metrics: metrics ?? {}, runs })
    }

    const { data: list, error: lErr } = await sb.from('journeys')
      .select('*').order('created_at', { ascending: false })
    if (lErr) return error(lErr.message, 500)

    // Contagem de runs por fluxo (uma query, agregada em memória: o volume de
    // fluxos é pequeno -- dezenas, não milhares).
    const { data: allRuns } = await sb.from('journey_runs').select('journey_id, state')
    const byJourney = new Map<string, Record<string, number>>()
    for (const r of allRuns ?? []) {
      const cur = byJourney.get(r.journey_id) ?? { active: 0, waiting: 0, done: 0, failed: 0, exited: 0 }
      cur[r.state] = (cur[r.state] ?? 0) + 1
      byJourney.set(r.journey_id, cur)
    }

    return ok({
      data: (list ?? []).map((j: any) => ({
        ...j,
        runs: byJourney.get(j.id) ?? { active: 0, waiting: 0, done: 0, failed: 0, exited: 0 },
      })),
    })
  }

  if (req.method === 'POST') {
    if (!(await isAuthorized(req, sb, 'write'))) return unauthorized()
    let body: any
    try { body = await req.json() } catch { return error('Body JSON inválido') }

    if (!body.name || !body.entry_type) return error('name e entry_type são obrigatórios')
    if (!['segment', 'event'].includes(body.entry_type)) return error('entry_type inválido')

    const { data: journey, error: cErr } = await sb.from('journeys').insert({
      name: body.name,
      description: body.description ?? null,
      entry_type: body.entry_type,
      entry_config: body.entry_config ?? {},
      reentry: body.reentry === 'allowed' ? 'allowed' : 'once',
      entry_node_id: body.entry_node_id ?? null,
      nodes: Array.isArray(body.nodes) ? body.nodes : [],
      status: 'draft',
    }).select().single()

    // O trigger trg_journeys_validate rejeita grafo inválido/cíclico com RAISE:
    // a mensagem do banco é a mensagem de erro do usuário (é ela que explica o
    // que está errado no fluxo). Não mascarar.
    if (cErr) return error(cErr.message, 400)
    return ok({ success: true, journey }, 201)
  }

  if (req.method === 'PATCH') {
    if (!(await isAuthorized(req, sb, 'write'))) return unauthorized()
    if (!id || !UUID_RE.test(id)) return error('id query param é obrigatório')

    let body: any
    try { body = await req.json() } catch { return error('Body JSON inválido') }

    const allowed = ['name', 'description', 'status', 'entry_type', 'entry_config', 'reentry', 'entry_node_id', 'nodes']
    const patch: any = {}
    for (const f of allowed) if (body[f] !== undefined) patch[f] = body[f]
    if (Object.keys(patch).length === 0) return error('Nenhum campo para atualizar')

    if (patch.status && !['draft', 'active', 'paused', 'archived'].includes(patch.status)) {
      return error('status inválido')
    }

    const { data: journey, error: uErr } = await sb.from('journeys')
      .update(patch).eq('id', id).select().single()
    if (uErr) return error(uErr.message, 400)
    if (!journey) return error('Fluxo não encontrado', 404)
    return ok({ success: true, journey })
  }

  if (req.method === 'DELETE') {
    if (!(await isAuthorized(req, sb, 'write'))) return unauthorized()
    if (!id || !UUID_RE.test(id)) return error('id query param é obrigatório')

    // A guarda REAL é o trigger trg_journeys_delete_guard (só rascunho sem runs).
    // Aqui só traduzimos o erro do banco.
    const { error: dErr } = await sb.from('journeys').delete().eq('id', id)
    if (dErr) return error(dErr.message, 400)
    return ok({ success: true })
  }

  return error('Method not allowed', 405)
})
```

- [ ] **Step 2:** `config.toml`:

```toml
[functions.journeys-api]
verify_jwt = false
```

- [ ] **Step 3:** Commit: `feat(fase6): edge function journeys-api (CRUD de fluxos + métricas por nó)` + push. **Prompt de deploy (rodada 1).**

---

## Task 6.10 — `src/lib/journeys.ts` + hook `useJourneys`

**Files:**
- Create: `src/lib/journeys.ts`
- Create: `src/hooks/useJourneys.tsx`

- [ ] **Step 1:** `src/lib/journeys.ts` — tipos e catálogo de nós (fonte única para o builder):

```ts
// Contrato do grafo de fluxo. ESPELHA exatamente o que validate_journey_graph
// (migration 20260714100000) aceita e o que o journey-worker sabe executar.
// Mudar aqui sem mudar lá = fluxo que a UI deixa salvar e o banco rejeita.

export type JourneyStatus = 'draft' | 'active' | 'paused' | 'archived';
export type JourneyEntryType = 'segment' | 'event';
export type JourneyReentry = 'once' | 'allowed';

export type JourneyNodeType =
  | 'send_email'
  | 'delay'
  | 'wait_for_event'
  | 'branch_attribute'
  | 'branch_segment'
  | 'apply_tag'
  | 'handoff_nexus';

export interface JourneyNode {
  id: string;
  type: JourneyNodeType;
  config: Record<string, any>;
  next?: string | null;
  next_false?: string | null;   // branch_*: ramo "não"
  next_timeout?: string | null; // wait_for_event: ramo do timeout
}

export interface Journey {
  id: string;
  name: string;
  description: string | null;
  status: JourneyStatus;
  entry_type: JourneyEntryType;
  entry_config: Record<string, any>;
  reentry: JourneyReentry;
  entry_node_id: string | null;
  nodes: JourneyNode[];
  created_at: string;
  updated_at: string;
  runs?: Record<string, number>;
}

export interface JourneyNodeMetrics {
  entered: number;
  emails: { enqueued: number; sent: number; opened: number; clicked: number; failed: number };
}

export const NODE_LABELS: Record<JourneyNodeType, string> = {
  send_email: 'Enviar email',
  delay: 'Esperar',
  wait_for_event: 'Aguardar evento',
  branch_attribute: 'Condição (atributo)',
  branch_segment: 'Condição (segmento)',
  apply_tag: 'Aplicar tag',
  handoff_nexus: 'Enviar para o Nexus',
};

export const BRANCH_TYPES: JourneyNodeType[] = ['branch_attribute', 'branch_segment'];
export const isBranch = (t: JourneyNodeType) => BRANCH_TYPES.includes(t);

export const STATUS_LABELS: Record<JourneyStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  paused: 'Pausado',
  archived: 'Arquivado',
};

// Eventos de contact_events que fazem sentido no builder (entrada e espera).
// Os de email vêm de fn_campaign_send_event; os demais, da timeline unificada.
export const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'email_opened', label: 'Abriu o email' },
  { value: 'email_clicked', label: 'Clicou no email' },
  { value: 'email_sent', label: 'Recebeu um email' },
  { value: 'email_bounced', label: 'Email retornou (bounce)' },
  { value: 'email_unsubscribed', label: 'Descadastrou-se' },
  { value: 'lead_created', label: 'Lead criado' },
  { value: 'contact_updated', label: 'Contato atualizado' },
];

export function newNodeId(): string {
  return `n${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** Percorre o grafo a partir da entrada, na ordem em que o builder desenha. */
export function orderedNodes(nodes: JourneyNode[], entryId: string | null): JourneyNode[] {
  if (!entryId) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: JourneyNode[] = [];
  const seen = new Set<string>();
  const walk = (id: string | null | undefined) => {
    if (!id || seen.has(id)) return;
    const n = byId.get(id);
    if (!n) return;
    seen.add(id);
    out.push(n);
    walk(n.next);
    walk(n.next_false);
    walk(n.next_timeout);
  };
  walk(entryId);
  return out;
}
```

- [ ] **Step 2:** `src/hooks/useJourneys.tsx` — todo acesso via `journeys-api` (nunca `supabase.from('journeys')`, ver Task 6.9):

```tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Journey, JourneyNodeMetrics } from '@/lib/journeys';

export function useJourneys() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJourneys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('journeys-api', { method: 'GET' });
    if (error) {
      toast.error('Erro ao carregar fluxos');
      setJourneys([]);
    } else {
      setJourneys((data?.data ?? []) as Journey[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchJourneys(); }, [fetchJourneys]);

  const createJourney = async (payload: Partial<Journey>): Promise<Journey | null> => {
    const { data, error } = await supabase.functions.invoke('journeys-api', {
      method: 'POST', body: payload,
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao criar fluxo');
      return null;
    }
    toast.success('Fluxo criado');
    await fetchJourneys();
    return data.journey as Journey;
  };

  const updateJourney = async (id: string, payload: Partial<Journey>): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke(`journeys-api?id=${id}`, {
      method: 'PATCH', body: payload,
    });
    if (error || data?.error) {
      // A mensagem do banco (grafo cíclico, nó sem config, fluxo sem nós) é a
      // mensagem útil para o usuário -- mostrar, não mascarar.
      toast.error(data?.error || 'Erro ao salvar fluxo');
      return false;
    }
    await fetchJourneys();
    return true;
  };

  const deleteJourney = async (id: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke(`journeys-api?id=${id}`, { method: 'DELETE' });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao excluir fluxo');
      return false;
    }
    toast.success('Fluxo excluído');
    await fetchJourneys();
    return true;
  };

  return { journeys, loading, fetchJourneys, createJourney, updateJourney, deleteJourney };
}

export function useJourney(id: string | undefined) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [metrics, setMetrics] = useState<Record<string, JourneyNodeMetrics>>({});
  const [runs, setRuns] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchJourney = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(`journeys-api?id=${id}`, { method: 'GET' });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao carregar fluxo');
      setJourney(null);
    } else {
      setJourney(data.data as Journey);
      setMetrics((data.metrics ?? {}) as Record<string, JourneyNodeMetrics>);
      setRuns((data.runs ?? {}) as Record<string, number>);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchJourney(); }, [fetchJourney]);

  return { journey, metrics, runs, loading, refetch: fetchJourney };
}
```

- [ ] **Step 3:** `npm run lint && npm run build` (build tem que passar; lint não pode ganhar categoria nova). Commit: `feat(fase6): tipos de fluxo e hook useJourneys` + push.

---

## Task 6.11 — Aba "Fluxos" em `/automations`

**Files:**
- Modify: `src/pages/admin/Automations.tsx`
- Create: `src/components/admin/automations/JourneysTab.tsx`
- Create: `src/components/admin/automations/JourneyCreateDialog.tsx`

- [ ] **Step 1:** `JourneyCreateDialog.tsx` — nome + tipo de entrada + reentrada. O fluxo nasce **rascunho e vazio**; os nós vêm no builder.

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSegments } from '@/hooks/useSegments';
import { EVENT_OPTIONS, type Journey } from '@/lib/journeys';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (payload: Partial<Journey>) => Promise<Journey | null>;
  onCreated: (j: Journey) => void;
}

export function JourneyCreateDialog({ open, onOpenChange, onCreate, onCreated }: Props) {
  const { segments } = useSegments();
  const [name, setName] = useState('');
  const [entryType, setEntryType] = useState<'segment' | 'event'>('segment');
  const [segmentId, setSegmentId] = useState('');
  const [eventType, setEventType] = useState('');
  const [reentry, setReentry] = useState<'once' | 'allowed'>('once');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim() && (entryType === 'segment' ? !!segmentId : !!eventType);

  const handleSave = async () => {
    setSaving(true);
    const j = await onCreate({
      name: name.trim(),
      entry_type: entryType,
      entry_config: entryType === 'segment' ? { segment_id: segmentId } : { event_type: eventType },
      reentry,
      nodes: [],
    });
    setSaving(false);
    if (j) { onOpenChange(false); onCreated(j); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo fluxo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nutrição de hot leads" />
          </div>

          <div className="space-y-1.5">
            <Label>Quando o contato entra no fluxo</Label>
            <Select value={entryType} onValueChange={(v) => setEntryType(v as 'segment' | 'event')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="segment">Quando entra em um segmento</SelectItem>
                <SelectItem value="event">Quando acontece um evento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {entryType === 'segment' ? (
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Select value={segmentId} onValueChange={setSegmentId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {segments.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Evento</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {EVENT_OPTIONS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Reentrada</Label>
            <Select value={reentry} onValueChange={(v) => setReentry(v as 'once' | 'allowed')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Uma vez por contato</SelectItem>
                <SelectItem value="allowed">Pode entrar de novo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>Criar e montar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
> Conferir o nome real do hook de segmentos (`src/hooks/useSegments.tsx`) e o shape do retorno antes de usar — se ele expuser `{ segments, loading }`, o import acima já está certo; se não, adaptar.

- [ ] **Step 2:** `JourneysTab.tsx` — lista de fluxos com ações (ativar/pausar/arquivar/excluir/editar):

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { GitBranch, Plus, Pencil, Trash2, Play, Pause, Archive } from 'lucide-react';
import { useJourneys } from '@/hooks/useJourneys';
import { JourneyCreateDialog } from './JourneyCreateDialog';
import { STATUS_LABELS, type Journey } from '@/lib/journeys';

const STATUS_VARIANT: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/15 text-emerald-600',
  paused: 'bg-amber-500/15 text-amber-600',
  archived: 'bg-muted text-muted-foreground line-through',
};

export function JourneysTab() {
  const { journeys, loading, createJourney, updateJourney, deleteJourney } = useJourneys();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const setStatus = (j: Journey, status: Journey['status']) => updateJourney(j.id, { status });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sequências automáticas de email, espera e ramificação — os emails saem pela mesma fila das campanhas
          (supressão e descadastro valem igual).
        </p>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo fluxo
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : journeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <GitBranch className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum fluxo criado</p>
          <p className="text-xs mt-1">Clique em "Novo fluxo" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {journeys.map((j) => (
            <Card key={j.id} className="border-border/40">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{j.name}</span>
                    <Badge className={`text-[10px] ${STATUS_VARIANT[j.status]}`}>{STATUS_LABELS[j.status]}</Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {j.entry_type === 'segment' ? 'Entrada: segmento' : 'Entrada: evento'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {j.nodes?.length ?? 0} passo(s) · {j.runs?.active ?? 0} ativo(s) ·{' '}
                    {j.runs?.waiting ?? 0} aguardando · {j.runs?.done ?? 0} concluído(s)
                    {(j.runs?.failed ?? 0) > 0 && <span className="text-destructive"> · {j.runs?.failed} com erro</span>}
                  </p>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  {j.status !== 'active' && j.status !== 'archived' && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-emerald-600" onClick={() => setStatus(j, 'active')}>
                      <Play className="h-3.5 w-3.5" /> Ativar
                    </Button>
                  )}
                  {j.status === 'active' && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-amber-600" onClick={() => setStatus(j, 'paused')}>
                      <Pause className="h-3.5 w-3.5" /> Pausar
                    </Button>
                  )}
                  {j.status !== 'archived' && j.status !== 'draft' && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setStatus(j, 'archived')}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/automations/fluxos/${j.id}`)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {j.status === 'draft' && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(j.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <JourneyCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreate={createJourney}
        onCreated={(j) => navigate(`/automations/fluxos/${j.id}`)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
            <AlertDialogDescription>
              Só rascunhos sem execuções podem ser excluídos. Fluxos que já rodaram devem ser arquivados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => { if (deleteId) await deleteJourney(deleteId); setDeleteId(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 3:** Em `src/pages/admin/Automations.tsx`, envolver o conteúdo atual numa `Tabs` do shadcn. O cabeçalho ("Automações") e **todo** o corpo existente (banner do Nexus, lista de regras, modais de criação/retroativo/exclusão) vão para a aba `regras`, sem nenhuma outra alteração; a aba `fluxos` renderiza `<JourneysTab />`. O botão "Nova regra" precisa sair do cabeçalho global e entrar dentro da aba "Regras" (cada aba tem o seu botão de criação).

```tsx
// imports novos:
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JourneysTab } from '@/components/admin/automations/JourneysTab';

// dentro do return, no lugar do <div className="space-y-4"> atual:
<div className="space-y-4">
  <div>
    <h1 className="text-xl font-bold">Automações</h1>
    <p className="text-sm text-muted-foreground">Regras de handoff para o Nexus e fluxos de email</p>
  </div>

  <Tabs defaultValue="regras">
    <TabsList>
      <TabsTrigger value="regras">Regras</TabsTrigger>
      <TabsTrigger value="fluxos">Fluxos</TabsTrigger>
    </TabsList>

    <TabsContent value="regras" className="space-y-4 pt-4">
      {/* botão "Nova regra" + banner do Nexus + lista de regras + modais: o corpo ATUAL, sem mudanças */}
    </TabsContent>

    <TabsContent value="fluxos" className="pt-4">
      <JourneysTab />
    </TabsContent>
  </Tabs>
</div>
```

- [ ] **Step 4:** `npm run lint && npm run build`. Commit: `feat(fase6): aba Fluxos em /automations com lista e ciclo de vida` + push.

---

## Task 6.12 — Builder vertical `/automations/fluxos/:id`

**Files:**
- Create: `src/pages/admin/JourneyBuilder.tsx`
- Create: `src/components/admin/automations/JourneyNodeCard.tsx`
- Create: `src/components/admin/automations/NodeConfigDialog.tsx`
- Modify: `src/App.tsx` (rota lazy, **acima** do catch-all)

**Modelo de interação (decidido; sem canvas livre):** coluna vertical. Card de entrada no topo (somente leitura, editável pelo diálogo de entrada) → lista de passos → botão "+" entre cada passo. Um passo de ramo renderiza **duas colunas** lado a lado ("Sim" / "Não", ou "Aconteceu" / "Não aconteceu"), cada uma com sua própria lista vertical e seu próprio "+". Sem arrastar, sem zoom, sem minimapa.

**Regras de edição do grafo (implementadas em `JourneyBuilder`):**
- inserir um passo depois de X: `novo.next = X.next; X.next = novo.id` (ou `X.next_false`/`X.next_timeout`, conforme o ramo em que o "+" foi clicado);
- excluir X: quem apontava para X passa a apontar para `X.next`; se X for ramo, o ramo "Sim" (`next`) é preservado e o "Não" é **descartado com aviso explícito** ("os passos do ramo Não serão removidos");
- o primeiro nó inserido vira `entry_node_id`.
Salvar = `PATCH journeys-api` com `nodes` + `entry_node_id` inteiros. **A validação de verdade (ciclo, ponteiro quebrado, config faltando) é do banco** — o erro do trigger vira toast.

- [ ] **Step 1:** `NodeConfigDialog.tsx` — um diálogo por tipo de nó, com os campos exatos que `validate_journey_graph` exige:
  - `send_email`: select de template (`useTemplates`) + input de assunto. **Aviso pt-BR obrigatório:** "O template é lido no momento do envio — editar o template muda os emails ainda não enviados deste fluxo."
  - `delay`: número + unidade (minutos/horas/dias) → grava sempre `config.minutes`.
  - `wait_for_event`: select de `EVENT_OPTIONS` + timeout (número + unidade) + (se o evento for de email) select opcional "de qual email deste fluxo" → grava `config.source_node_id` (lista os nós `send_email` já existentes). **Aviso obrigatório:** "Aberturas de email são infladas por proteção de privacidade (Apple Mail). Para decisões críticas, ramifique por clique."
  - `branch_attribute`: reusa o editor de regras do `SegmentFormModal` (mesmo vocabulário `field/operator/value` de `build_segment_condition`) + seletor E/OU → grava `config.rules` e `config.logic`.
  - `branch_segment`: select de segmento (`useSegments`).
  - `apply_tag`: input de nome da tag (normalizado igual ao `apply-lead-tag`: minúsculas, sem barras).
  - `handoff_nexus`: select de estágio via `supabase.functions.invoke('get-nexus-stages')` (mesmo padrão do `AutomationRuleForm`) → grava `stage_id` + `stage_name`.
- [ ] **Step 2:** `JourneyNodeCard.tsx` — card com ícone por tipo, título (`NODE_LABELS`), resumo da config em pt-BR, botões editar/excluir e o slot de métricas (Task 6.13).
- [ ] **Step 3:** `JourneyBuilder.tsx` — carrega via `useJourney(id)`, mantém `nodes`/`entry_node_id` em estado local, renderiza recursivamente a partir da entrada (`orderedNodes` é só para contagem; o render é recursivo por ponteiro), botão "Salvar" (PATCH) e botão "Ativar" (PATCH status), com badge de status e link de volta.
- [ ] **Step 4:** `src/App.tsx`:

```tsx
const AdminJourneyBuilder = lazy(() => import("./pages/admin/JourneyBuilder"));
// ...dentro do bloco do AdminLayout, junto das outras rotas admin (ACIMA do catch-all):
<Route path="automations/fluxos/:id" element={<Suspense fallback={<PageLoader />}><AdminJourneyBuilder /></Suspense>} />
```

- [ ] **Step 5:** `npm run lint && npm run build`. Commit: `feat(fase6): builder vertical de fluxos com ramos` + push.

---

## Task 6.13 — Métricas por nó no builder

**Files:**
- Modify: `src/components/admin/automations/JourneyNodeCard.tsx`
- Modify: `src/pages/admin/JourneyBuilder.tsx`

- [ ] **Step 1:** `useJourney` já devolve `metrics` (do `journey_node_metrics`). Passar `metrics[node.id]` para cada card.
- [ ] **Step 2:** No card, rodapé compacto: `N contatos passaram` e, para `send_email`, `X enviados · Y abertos · Z cliques · W falhas`. Zerado ⇒ não renderiza o rodapé (evita ruído em fluxo novo).
- [ ] **Step 3:** Polling de 60s enquanto o fluxo estiver `active` (mesma convenção dos hooks de evento do admin: `setInterval` + flag `cancelled` no cleanup).
- [ ] **Step 4:** `npm run lint && npm run build`. Commit: `feat(fase6): métricas por nó no builder de fluxos` + push.

---

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Trigger em `contact_events` abortar a transação de quem escreve a timeline | **Captura de lead cai em produção** (landing pages) | Todo o corpo dentro de `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING`. Verificação explícita na Task 6.3, Step 2. |
| Email de fluxo duplicado para a mesma pessoa | Complaint rate > 0,08% → conta encerrada no Resend | Índice único `(journey_run_id, journey_node_id)` + claim CAS do worker + `INSERT`+`pgmq.send` na **mesma transação**. Três camadas independentes. |
| Reexecução de nó após lease expirado repetir `handoff_nexus` | Card duplicado no Nexus | O Nexus deduplica por lookup de contato (`lookupNexusContact`/`lookupExistingCardForContact`, já implementado). Risco residual **aceito** e documentado. |
| Fluxo com ciclo → lead em loop | Emails repetidos / worker girando | `validate_journey_graph` barra na **escrita** (banco, não UI) + `MAX_STEPS_PER_RUN` no worker. |
| Template editado muda emails de fluxos ativos (late binding) | Envio com conteúdo inesperado | Decisão consciente (fluxo é perene). Aviso explícito no `NodeConfigDialog` do `send_email`. |
| Pausar fluxo não segura email já enfileirado | Até ~1 min de emails "a mais" | Documentado no botão Pausar. A alternativa (worker checar status do fluxo) trocaria isso por `failed` terminal ou `pending` órfão — ambos piores. |
| Aberturas infladas (Apple MPP) ramificando fluxo errado | Ramo "não abriu" quase vazio | Aviso no `wait_for_event`; recomendar ramificar por **clique**. |
| `evaluate_segment_rules` varrendo segmento grande a cada minuto | Carga no banco | `journey_enroll_segment` é set-based, com `LIMIT 500` por tick e `NOT EXISTS` indexado (`uniq_journey_runs_open`). |
| `journey-worker` e `process-email-queue` disputando o mesmo minuto de cron | Concorrência no Postgres | São jobs distintos e independentes; o worker de fluxo **não envia email**, só enfileira. Claim `SKIP LOCKED` isola runs. |
| Tipos do Supabase desatualizados (`types.ts` não regenerável offline) | `npm run build` quebra | Nenhum acesso client-side às tabelas novas: **tudo** via `journeys-api`. |
| Migration de cron aplicada antes do deploy das functions | 404 a cada minuto | Deploy em **duas rodadas** (abaixo). |

---

## Deploy — DUAS RODADAS (obrigatório nesta ordem)

O sync do Lovable **não** deploya Edge Functions nem migrations. A migration de cron (`20260714110000`) agenda um job que chama `journey-worker` — se ela for aplicada antes do deploy da function, o cron bate em 404 a cada minuto.

### Rodada 1 — migrations de dados + todas as functions

```
Prompt para Lovable:
---
Aplique as migrations (nesta ordem):
- supabase/migrations/20260714100000_journeys_core.sql
- supabase/migrations/20260714100500_journey_sends.sql
- supabase/migrations/20260714101000_journey_events_queue.sql
- supabase/migrations/20260714101500_journey_engine_rpcs.sql

Faça deploy das edge functions:
- journey-worker (nova)
- journeys-api (nova)
- process-email-queue (alterada: envia emails de fluxo)
- resend-webhook (alterada: correlaciona por tag send_id)
- automations-api (corrigida: persiste conditions/condition_logic)

Mudanças no código:
1. Novas tabelas journeys / journey_runs / journey_step_log, com validação de grafo acíclico no banco.
2. campaign_sends passa a aceitar envios de fluxo (journey_run_id / journey_node_id) com índice único por (run, nó).
3. Fila pgmq journey_events + trigger fail-open em contact_events.
4. RPCs do motor de fluxos.
5. O worker de email passa a enviar também os emails dos fluxos, pela mesma fila.

O código já está no repositório GitHub (commit <hash>). Por favor, faça o deploy.
---
```

**Não é preciso criar nenhum segredo novo** — `journey-worker` usa `WEBHOOK_SECRET` (Edge Function Secret) e os segredos do Vault (`project_url`, `webhook_secret`) já criados na Fase 3.

### Rodada 2 — cron (**só depois que a rodada 1 estiver deployada e verificada**)

```
Prompt para Lovable:
---
Aplique a migration:
- supabase/migrations/20260714110000_journey_cron_sweepers.sql

Ela cria os sweepers de envio de fluxo e agenda os jobs do pg_cron
(journey-worker a cada minuto; recover-lost-journey-sends e
requeue-orphan-journey-sends a cada 10 minutos). As edge functions da rodada
anterior já precisam estar deployadas.

O código já está no repositório GitHub (commit <hash>). Por favor, faça o deploy.
---
```

## Verificação da fase (produção, após as duas rodadas)

1. Criar o fluxo canônico: **entrada por segmento X → email A → aguardar `email_opened` (3 dias) → se abriu: email B; se não: tag `frio`**, com 2–3 leads de teste (emails próprios) no segmento.
2. Ativar. Em ≤ 1 min: `journey_runs` ganha um run por lead; em ≤ 2 min o email A chega.
3. Abrir o email A em um dos leads → em ≤ 1 min o run avança para o email B (timeline do contato mostra `email_opened` **e depois** `email_sent`, um único de cada).
4. Não abrir no outro → após o timeout, o lead recebe a tag `frio` e o run fica `done`.
5. **Pausar** o fluxo com um run em espera → o run não avança (nenhum `journey_step_log` novo).
6. Reentrada: rodar a varredura de novo com `reentry='once'` → **nenhum** run novo para os mesmos leads.
7. Anti-duplicata: conferir `SELECT count(*) FROM campaign_sends WHERE journey_run_id = '<run>' AND journey_node_id = '<nó do email A>'` → exatamente **1**.
8. Fail-open: capturar um lead numa landing page (`/gratuito`) com um fluxo ativo de entrada por evento → o lead é criado normalmente (o caminho crítico nunca depende do fluxo).
