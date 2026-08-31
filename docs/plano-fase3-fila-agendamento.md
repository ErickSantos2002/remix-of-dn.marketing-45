# Plano detalhado — Fase 3: Fila (pgmq), envio em batch e agendamento

> **Base:** `docs/plano-modulo-email-marketing.md` (seção "Fase 3" — decisões vinculantes) e
> `docs/pesquisa-modulo-email-marketing.md` (restrições verificadas).
> **Para workers agênticos:** REQUIRED SUB-SKILL — invoque `lovable-workflow` antes de qualquer commit,
> Edge Function ou migration. Passos usam checkboxes (`- [ ]`).

**Goal:** Eliminar o loop síncrono de envio do `send-campaign` (risco de wall-clock e de rate limit),
substituindo-o por: enfileirador (pgmq) → worker em batch (Resend Batch API, 100 emails = 1 request)
drenado por pg_cron a cada minuto → agendamento real de campanhas (`scheduled_at`) promovido por pg_cron.
Campanhas de milhares de leads passam a enviar sem timeout, sem duplicar emails e com progresso visível.

**Architecture:**
```
CampaignWizard ──"enviar agora"──> send-campaign (ENFILEIRADOR)
       │                              1. CAS campaigns.status -> 'sending'
       │                              2. resolve audiência (segmento/estático/todos)
       └─"agendar"─> campaigns        3. bulk INSERT campaign_sends status 'pending'
          status='scheduled'          4. public.email_queue_send_batch([{send_id,campaign_id,lead_id}])
          scheduled_at=<ts>           5. retorna imediatamente
                │
   pg_cron (1/min) promote-scheduled-campaigns
                │  net.http_post (secret do Vault) -> send-campaign
                v
        pgmq: email_send_queue
                ^
                │ pg_cron (1/min) drain-email-queue -> net.http_post -> process-email-queue (WORKER)
                │      read(vt=180, qty=100) -> filtra supressões -> renderiza vars + unsubscribe
                │      -> POST /emails/batch -> grava resend_email_id + status 'sent'
                │      -> DELETE das mensagens SOMENTE em caso de sucesso
                │      -> finalize_campaign_if_drained() quando pending == 0
                v
        resend-webhook (Fase 1) avança status: sent -> delivered -> opened -> clicked
```

**Tech Stack:** Supabase Postgres (pgmq, pg_cron, pg_net, Vault), Edge Functions (Deno), Resend Batch API,
React 18 + Vite + shadcn/ui.

## Restrições globais (vinculantes — copiadas do CLAUDE.md e do plano-mãe)

- **Lovable two-way sync:** `git pull` antes de tocar em qualquer arquivo; escopo pequeno por tarefa;
  commit em português + **`git push` imediato**. **Edge Functions e migrations NÃO são deployadas pelo sync** —
  toda tarefa que cria/altera uma delas termina com o **prompt de deploy para o Lovable** contendo o hash real do commit.
- **Não existe test runner.** Verificação = leitura cuidadosa + `npm run lint` + `npm run build` (frontend).
  Para SQL/Deno: cross-reading contra migrations/functions existentes (não há DB local, nem Supabase CLI,
  nem Deno nesta máquina). O que só existe em produção (pg_cron, pg_net, Batch API real) **só é validável
  após o deploy, na URL do Lovable** — dizer isso explicitamente ao entregar.
- **Toda Edge Function nova DEVE ser registrada em `supabase/config.toml` com `verify_jwt = false`.**
- **Não editar `src/integrations/supabase/types.ts` à mão** (auto-gerado; regenerado após o deploy).
  Onde o client tipado não conhece tabela/RPC nova, usar o padrão sancionado `as any` **com comentário**.
- **Segredos vivem em Edge Function Secrets.** Para `pg_cron → Edge Function`, os segredos vêm do
  **Supabase Vault** (`vault.decrypted_secrets`), **nunca hardcoded no `cron.schedule`**.
- **UI em pt-BR com acentuação correta.**
- Não escrever em `leads` pelo browser. `console.*` some no build de prod (Terser).
- Enums de `campaigns.status` / `campaign_sends.status` são validados por **trigger**, não por CHECK —
  mudar enum = mudar a função do trigger.

---

## ⚠️ O que NÃO PODE SER PERDIDO ao mover o envio para o worker

O `send-campaign` atual (pós-Fases 1 e 2) contém seis comportamentos que **precisam existir, byte a byte,
dentro do `process-email-queue`**. Perder qualquer um deles em silêncio é o principal risco desta fase.
Esta é a checklist de aceite do Task 3.4:

| # | Comportamento | Onde está hoje (`supabase/functions/send-campaign/index.ts`) | Consumidor a jusante que quebra se sumir |
|---|---|---|---|
| 1 | **Filtro de supressão** (`email_suppressions`, chunks de 200, `Set` lowercase; suprimido → send `failed` com `error='suppressed'`) | linhas 106–123 e 158–160 | Compliance / reputação Resend (bounce <4%, complaint <0,08%) |
| 2 | **Tags de correlação** `[{name:'campaign_id'},{name:'lead_id'}]` no payload | linhas 175–178 | `resend-webhook` resolve o send **por tags** (linhas 100–105) |
| 3 | **Captura do `resend_email_id`** da resposta e gravação em `campaign_sends.resend_email_id` | linhas 201–202, 257 | `resend-webhook` fallback de correlação (linhas 106–110) |
| 4 | **Headers RFC 8058** `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` | linhas 180–185 | Botão nativo "Cancelar inscrição" do Gmail/Yahoo |
| 5 | **Rodapé automático de descadastro** quando o HTML não contém `email-unsubscribe` | linhas 165–168 | Compliance; link visível para humanos |
| 6 | **Merge tags** `{{nome}}`, `{{email}}`, `{{empresa}}` (fallback `cargo`), `{{unsubscribe_url}}` — aplicadas em **subject e body** | `replaceVars`, linhas 130–136, 164 e 173 | Personalização; `{{unsubscribe_url}}` do editor Unlayer |

E, dentro do item 4/5, o **`buildUnsubscribeUrl`** (linhas 14–36) precisa continuar produzindo um token
**byte-idêntico** ao `computeToken` de `supabase/functions/email-unsubscribe/index.ts` (linhas 46–55):
`base64url( HMAC-SHA256( "${lead_id}:${email_lowercase_trimmed}", UNSUBSCRIBE_SECRET ) )`, sem padding.
**Copiar o bloco inteiro, sem "melhorar".**

---

## Decisões de arquitetura fixadas neste plano

1. **Somente o canal `email` vai para a fila.** WhatsApp (Z-API) continua no loop síncrono do `send-campaign`
   exatamente como hoje (volume baixo, sem batch API, sem supressão). Zero regressão, zero escopo extra.
2. **Acesso ao pgmq via wrappers próprios em `public`** (`email_queue_send_batch`, `email_queue_read`,
   `email_queue_delete`), `SECURITY DEFINER`, com **interface 100% `jsonb`**. Motivo: o schema `pgmq_public`
   do Supabase precisa ser exposto no Data API (configuração de dashboard, fora do controle do repo) e
   arrays tipados (`jsonb[]`, `bigint[]`) via PostgREST têm casting incerto. `jsonb` in / `jsonb`+`integer` out
   elimina as duas incertezas.
3. **Claim atômico da campanha via CAS** (`UPDATE campaigns SET status='sending' WHERE id=? AND status=?`),
   feito **antes** de resolver a audiência. Duas invocações concorrentes do `send-campaign` (ex.: dois ticks
   do cron) → a segunda perde o CAS e aborta. É isso que impede o enfileiramento duplo.
4. **`pgmq.read` + `delete` explícito. Nunca `pop()`.** Idempotência do worker: antes de montar o payload,
   pula (e deleta a mensagem) todo `send_id` cujo `campaign_sends.status` **já não é `pending`**.
5. **Não usar o `scheduled_at` nativo do Resend** (limite de 30 dias; cancelado não é re-agendável).
   pg_cron cobre todos os casos com um único mecanismo.
6. **`campaigns.stats` (JSONB) é recomputado de `campaign_sends`** no fechamento da campanha
   (`finalize_campaign_if_drained`), não incrementado no envio. A lista de campanhas continua lendo `stats`;
   o detalhe já usa stats ao vivo (`useCampaigns.getCampaignStats`, Fase 1).

---

## Task 3.1 — Migration base: pgmq + wrappers + correção do trigger de timeline

**Files:**
- Create: `supabase/migrations/20260713210000_email_queue.sql`

**Interfaces (produz — outras tasks dependem destes nomes exatos):**
- Fila pgmq `email_send_queue`. Mensagem: `{ "send_id": uuid, "campaign_id": uuid, "lead_id": uuid }`.
- `public.email_queue_send_batch(p_messages jsonb) → integer` (quantidade enfileirada)
- `public.email_queue_read(p_vt integer, p_qty integer) → TABLE(msg_id bigint, read_ct integer, message jsonb)`
- `public.email_queue_delete(p_msg_ids jsonb) → integer` (quantidade deletada)
- `public.finalize_campaign_if_drained(p_campaign_id uuid) → boolean`
- `public.invoke_edge_function(p_function text, p_body jsonb) → bigint` (usa Vault; usada pelo Task 3.5)

### Contexto crítico: o trigger `fn_campaign_send_event` quebra com linhas `pending`

Hoje (`20260713190000_email_tracking.sql`, linhas 92–98) o trigger insere `email_sent` em `contact_events`
**no INSERT de `campaign_sends`, qualquer que seja o status**. A partir da Fase 3 o enfileirador cria as linhas
com status `pending` — sem correção, **todo lead da audiência ganharia "Campanha enviada" na timeline antes
(e mesmo que nunca) do email sair**. A correção: no INSERT, só emitir o evento se `NEW.status <> 'pending'`
(preserva o WhatsApp síncrono, que continua inserindo direto com `sent`); no UPDATE, adicionar o ramo
`pending → sent` que emite `email_sent`. Todos os ramos existentes (`opened`, `clicked`, `bounced`,
`complained`) são preservados intactos.

- [ ] **Step 1:** Criar `supabase/migrations/20260713210000_email_queue.sql` com o conteúdo abaixo (completo):

```sql
-- ============================================================================
-- Fase 3 — Fila de envio de email (pgmq) + agendamento.
--   1. Extensões pgmq / pg_cron / pg_net
--   2. Fila email_send_queue + wrappers SECURITY DEFINER em public (interface jsonb)
--   3. Correção do fn_campaign_send_event para o novo estado 'pending' real
--   4. finalize_campaign_if_drained (fecha a campanha e recomputa campaigns.stats)
--   5. invoke_edge_function (pg_cron -> Edge Function, segredos do Vault)
-- Os jobs do pg_cron ficam na migration seguinte (20260713220000), que só pode
-- rodar DEPOIS do deploy das functions send-campaign/process-email-queue.
-- ============================================================================

-- 1. Extensões -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Fila ------------------------------------------------------------------
-- pgmq.create e idempotente na pratica (falha se a fila ja existe), por isso o guard.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'email_send_queue') THEN
    PERFORM pgmq.create('email_send_queue');
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- versoes antigas do pgmq nao expoem list_queues(); nesse caso tenta criar e ignora duplicata
  BEGIN
    PERFORM pgmq.create('email_send_queue');
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;
END $$;

-- Wrappers em public com interface jsonb.
-- Motivo: (a) evita depender do schema pgmq_public estar exposto no Data API
-- (configuracao de dashboard, fora do repo); (b) evita o casting incerto de
-- jsonb[]/bigint[] pelo PostgREST -- tudo entra e sai como jsonb/integer.
CREATE OR REPLACE FUNCTION public.email_queue_send_batch(p_messages jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE v_count integer;
BEGIN
  IF p_messages IS NULL OR jsonb_typeof(p_messages) <> 'array' THEN
    RAISE EXCEPTION 'email_queue_send_batch: p_messages deve ser um array jsonb';
  END IF;
  IF jsonb_array_length(p_messages) = 0 THEN
    RETURN 0;
  END IF;
  SELECT count(*) INTO v_count
  FROM pgmq.send_batch('email_send_queue', ARRAY(SELECT jsonb_array_elements(p_messages)));
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.email_queue_read(p_vt integer DEFAULT 180, p_qty integer DEFAULT 100)
RETURNS TABLE (msg_id bigint, read_ct integer, message jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pgmq AS $$
  SELECT r.msg_id, r.read_ct, r.message
  FROM pgmq.read('email_send_queue', p_vt, p_qty) AS r;
$$;

CREATE OR REPLACE FUNCTION public.email_queue_delete(p_msg_ids jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq AS $$
DECLARE v_count integer;
BEGIN
  IF p_msg_ids IS NULL OR jsonb_typeof(p_msg_ids) <> 'array' OR jsonb_array_length(p_msg_ids) = 0 THEN
    RETURN 0;
  END IF;
  SELECT count(*) INTO v_count
  FROM pgmq.delete('email_send_queue', ARRAY(SELECT (jsonb_array_elements_text(p_msg_ids))::bigint));
  RETURN v_count;
END $$;

-- Somente o service_role (Edge Functions) pode operar a fila.
REVOKE ALL ON FUNCTION public.email_queue_send_batch(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_read(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_delete(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_send_batch(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_read(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_delete(jsonb) TO service_role;

-- 3. Trigger de timeline: 'pending' passa a ser um estado REAL ---------------
-- Antes: o INSERT em campaign_sends sempre gerava 'email_sent' em contact_events.
-- Agora o enfileirador cria as linhas com status 'pending' -- emitir o evento no
-- INSERT marcaria como "enviada" uma campanha que ainda nao saiu (e leads que
-- nunca receberao nada, por supressao). Correcao:
--   INSERT  -> so emite se NEW.status <> 'pending'  (preserva o WhatsApp sincrono)
--   UPDATE  -> novo ramo 'sent' emite email_sent/whatsapp_sent
-- Todos os ramos existentes (opened/clicked/bounced/complained) sao preservados.
CREATE OR REPLACE FUNCTION public.fn_campaign_send_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' AND NEW.lead_id IS NOT NULL THEN
      INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
      VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing',
        CASE NEW.channel WHEN 'email' THEN 'email_sent' ELSE 'whatsapp_sent' END,
        'Campanha enviada via ' || NEW.channel,
        jsonb_build_object('campaign_id', NEW.campaign_id));
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'sent' AND OLD.status = 'pending' AND NEW.lead_id IS NOT NULL THEN
      INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
      VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing',
        CASE NEW.channel WHEN 'email' THEN 'email_sent' ELSE 'whatsapp_sent' END,
        'Campanha enviada via ' || NEW.channel,
        jsonb_build_object('campaign_id', NEW.campaign_id));
    ELSIF NEW.status = 'opened' AND NEW.lead_id IS NOT NULL THEN
      INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
      VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_opened',
              'Email aberto', jsonb_build_object('campaign_id', NEW.campaign_id));
    ELSIF NEW.status = 'clicked' AND NEW.lead_id IS NOT NULL THEN
      INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
      VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_clicked',
              'Link clicado no email', jsonb_build_object('campaign_id', NEW.campaign_id));
    ELSIF NEW.status = 'bounced' AND NEW.lead_id IS NOT NULL THEN
      INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
      VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_bounced',
              'Email retornou (bounce)', jsonb_build_object('campaign_id', NEW.campaign_id));
    ELSIF NEW.status = 'complained' AND NEW.lead_id IS NOT NULL THEN
      INSERT INTO contact_events (lead_id, dnia_id, source_app, event_type, title, metadata)
      VALUES (NEW.lead_id, NEW.dnia_id, 'dnmarketing', 'email_complained',
              'Email marcado como spam', jsonb_build_object('campaign_id', NEW.campaign_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3b. Barreira anti-duplicata por (campanha, lead) no canal email.
-- Guardada: so cria o indice se nao houver duplicatas historicas (campanhas
-- antigas reenviadas manualmente criariam duas linhas). Se houver, a migration
-- NAO falha -- apenas avisa; a protecao primaria continua sendo o CAS do
-- enfileirador (Task 3.3).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT campaign_id, lead_id
      FROM public.campaign_sends
      WHERE channel = 'email' AND lead_id IS NOT NULL
      GROUP BY campaign_id, lead_id
      HAVING count(*) > 1
    ) dup
  ) THEN
    RAISE NOTICE 'campaign_sends ja possui duplicatas (campaign_id, lead_id) no canal email; indice unico NAO criado.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_campaign_sends_email_campaign_lead
      ON public.campaign_sends (campaign_id, lead_id)
      WHERE channel = 'email' AND lead_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_status
  ON public.campaign_sends (campaign_id, status);

-- 4. Fechamento da campanha quando a fila dela zera -------------------------
-- Recomputa campaigns.stats a partir de campaign_sends (fonte da verdade) e so
-- fecha se nao restar nenhum 'pending'. Idempotente: o UPDATE e condicionado a
-- status='sending', entao chamadas repetidas nao reescrevem uma campanha ja fechada.
CREATE OR REPLACE FUNCTION public.finalize_campaign_if_drained(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pending integer;
  v_stats jsonb;
BEGIN
  SELECT count(*) FILTER (WHERE status = 'pending') INTO v_pending
  FROM public.campaign_sends WHERE campaign_id = p_campaign_id;

  IF v_pending > 0 THEN
    RETURN false;
  END IF;

  SELECT jsonb_build_object(
    'sent',      count(*) FILTER (WHERE status <> 'pending'),
    'delivered', count(*) FILTER (WHERE status IN ('delivered','opened','clicked')),
    'opened',    count(*) FILTER (WHERE status IN ('opened','clicked')),
    'clicked',   count(*) FILTER (WHERE status = 'clicked'),
    'failed',    count(*) FILTER (WHERE status IN ('failed','bounced'))
  ) INTO v_stats
  FROM public.campaign_sends WHERE campaign_id = p_campaign_id;

  UPDATE public.campaigns
     SET status  = 'sent',
         sent_at = COALESCE(sent_at, now()),
         stats   = COALESCE(v_stats, stats)
   WHERE id = p_campaign_id
     AND status = 'sending';

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.finalize_campaign_if_drained(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_campaign_if_drained(uuid) TO service_role;

-- 5. Invocacao de Edge Function pelo pg_cron, com segredo do Vault ----------
-- NUNCA hardcodar o segredo no cron.schedule (o corpo do job fica em texto claro
-- em cron.job, legivel por qualquer role com acesso ao schema cron).
-- Pre-requisito operacional (Deploy, passo 2): criar os segredos no Vault:
--   select vault.create_secret('https://kfhojzdcnpuntynodsff.supabase.co', 'project_url');
--   select vault.create_secret('<valor do WEBHOOK_SECRET>', 'webhook_secret');
CREATE OR REPLACE FUNCTION public.invoke_edge_function(p_function text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url text;
  v_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'project_url'    LIMIT 1;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'webhook_secret' LIMIT 1;

  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE WARNING 'invoke_edge_function: segredos project_url/webhook_secret ausentes no Vault; % nao foi invocada', p_function;
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url     := rtrim(v_url, '/') || '/functions/v1/' || p_function,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_secret
               ),
    body    := p_body,
    timeout_milliseconds := 55000
  ) INTO v_request_id;

  RETURN v_request_id;
END $$;

REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb) FROM PUBLIC, anon, authenticated;
```

- [ ] **Step 2:** Verificação por leitura cruzada (não há DB local):
  - Comparar o corpo de `fn_campaign_send_event` acima com o de `20260713190000_email_tracking.sql`
    (linhas 85–120): **os 4 ramos de UPDATE existentes devem estar presentes e idênticos**; a única adição
    é o ramo `sent` e a guarda `NEW.status <> 'pending'` no INSERT.
  - Confirmar que `campaign_sends` usa `dnia_id` (não `universal_id`) — sim, ver `20260713190000` linha 93.
  - Confirmar que `validate_campaign_send_status` já aceita `pending` — sim, `20260713190000` linha 74.
- [ ] **Step 3:** Commit + push:
  `git add supabase/migrations/20260713210000_email_queue.sql && git commit -m "feat(email): migration da fila pgmq, wrappers de fila e correção do trigger de timeline para status pending" && git push`
- [ ] **Step 4:** Entregar o prompt de deploy (modelo na seção "Deploy") — a migration precisa ser aplicada
  **antes** do deploy das functions dos Tasks 3.3 e 3.4.

---

## Task 3.2 — Correção de ordenação `sent_at` (regressão causada pelas linhas `pending`)

**Files:**
- Modify: `supabase/functions/resend-webhook/index.ts`
- Modify: `supabase/functions/email-unsubscribe/index.ts`

**Interfaces:** nenhuma mudança de contrato. Correção de bug latente.

### Por que isso é obrigatório antes do enfileirador

Em Postgres, `ORDER BY sent_at DESC` coloca **NULLS FIRST** por padrão. Hoje isso é inofensivo porque todo
`campaign_sends` nasce com `sent_at` preenchido (`send-campaign` linha 255). Com o enfileirador, as linhas
nascem `pending` com `sent_at = NULL` — e:
- `email-unsubscribe/index.ts` (linhas 120–122) busca **o último send de email do lead** com
  `.order('sent_at', { ascending: false }).limit(1)`. Uma linha `pending` de uma campanha ainda na fila
  ganharia o topo, e o descadastro marcaria como `unsubscribed` **uma campanha que ainda nem saiu**,
  em vez da que o usuário recebeu.
- `resend-webhook/index.ts` (linhas 101–103) faz o mesmo dentro de uma campanha (mitigado pelo índice único
  do Task 3.1, mas a correção é gratuita e defensiva).

- [ ] **Step 1:** Em `supabase/functions/email-unsubscribe/index.ts`, substituir o `.order(...)` da linha 122
  e excluir linhas ainda não enviadas:

```ts
    const { data: lastSend } = await sb.from('campaign_sends').select('id,status')
      .eq('lead_id', lid).eq('channel', 'email')
      .neq('status', 'pending')
      // nullsFirst:false e obrigatorio: a partir da Fase 3 existem linhas 'pending'
      // com sent_at NULL, e em Postgres NULLS vem PRIMEIRO num ORDER BY DESC --
      // sem isso o descadastro marcaria uma campanha ainda na fila.
      .order('sent_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
```

- [ ] **Step 2:** Em `supabase/functions/resend-webhook/index.ts`, substituir o `.order(...)` da linha 103:

```ts
    const { data } = await sb.from('campaign_sends').select('id,status')
      .eq('campaign_id', tags.campaign_id).eq('lead_id', tags.lead_id)
      // nullsFirst:false: linhas 'pending' (Fase 3) tem sent_at NULL e viriam
      // primeiro num ORDER BY DESC padrao do Postgres.
      .order('sent_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
```

  E atualizar o comentário da linha 98 (`sent_at e sempre preenchido no insert`), que deixou de ser verdade:

```ts
  //    resend_email_id como fallback. A partir da Fase 3, sends nascem 'pending'
  //    com sent_at NULL -- por isso o order usa nullsFirst:false.
```

- [ ] **Step 3:** Verificação: `grep -n "order('sent_at'" supabase/functions/` → as duas ocorrências devem
  ter `nullsFirst: false`. Confirmar que `nullsFirst` é uma opção válida de `.order()` no supabase-js v2
  (é — `{ ascending, nullsFirst, foreignTable, referencedTable }`).
- [ ] **Step 4:** Commit + push:
  `git commit -m "fix(email): ordena sends por sent_at com nullsFirst=false (linhas pending da fila têm sent_at nulo)"`
- [ ] **Step 5:** Prompt de deploy (functions `resend-webhook`, `email-unsubscribe`).

---

## Task 3.3 — `send-campaign` vira ENFILEIRADOR (email); WhatsApp continua síncrono

**Files:**
- Modify: `supabase/functions/send-campaign/index.ts` (reescrita)

**Interfaces:**
- Consumes: `public.email_queue_send_batch(p_messages jsonb)`, `public.finalize_campaign_if_drained(p_campaign_id uuid)` (Task 3.1).
- Produces:
  - `POST /send-campaign` body `{ campaign_id: string }` →
    email: `{ queued: number, skipped: number, campaign_id }` (HTTP 200, retorno imediato);
    whatsapp: `{ sent: number, failed: number }` (comportamento atual);
    campanha já em envio/enviada: `{ error: 'campanha já está em envio ou enviada' }` (HTTP 409).
  - Linhas `campaign_sends` com `status='pending'`, `sent_at=null`, `channel='email'`.
  - Mensagens na fila: `{ send_id, campaign_id, lead_id }`.

> **Preservado aqui:** resolução de audiência (segmento dinâmico via `evaluate_segment_rules`, estático via
> `segment_contacts`, sem segmento = todos os leads, limit 5000) e todo o caminho WhatsApp.
> **Movido para o worker (Task 3.4):** supressão, merge tags, unsubscribe URL, rodapé, headers RFC 8058,
> tags, `resend_email_id`. **Nada disso pode ficar só aqui.**

- [ ] **Step 1:** Substituir o conteúdo de `supabase/functions/send-campaign/index.ts` por:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// ENFILEIRADOR (Fase 3). Canal email: resolve a audiencia, cria campaign_sends
// 'pending' em lote, publica na fila pgmq email_send_queue e retorna imediatamente.
// O envio de fato acontece no worker process-email-queue (drenado por pg_cron).
// Canal whatsapp: continua sincrono via Z-API, exatamente como antes.
//
// TODA a logica por-destinatario de email (supressao, merge tags, unsubscribe URL,
// rodape, headers RFC 8058, tags de correlacao, captura do resend_email_id) vive
// agora em supabase/functions/process-email-queue/index.ts -- NAO reintroduzir aqui.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Status a partir dos quais uma campanha pode ser (re)enfileirada.
// 'sending' e 'sent' ficam de fora: e o que impede enfileiramento duplo.
const STARTABLE = new Set(["draft", "scheduled", "failed", "paused"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) return json({ error: "campaign_id is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) return json({ error: "Campaign not found" }, 404);

    if (!STARTABLE.has(String(campaign.status))) {
      return json({ error: "campanha já está em envio ou enviada", status: campaign.status }, 409);
    }

    // CLAIM ATOMICO: CAS do status observado -> 'sending', ANTES de qualquer
    // trabalho pesado. Duas invocacoes concorrentes (ex.: dois ticks do cron de
    // agendamento) disputam este UPDATE; a perdedora recebe 0 linhas e aborta.
    // E isto que garante que uma campanha nunca e enfileirada duas vezes.
    const { data: claimed, error: claimErr } = await supabase
      .from("campaigns")
      .update({ status: "sending" })
      .eq("id", campaign_id)
      .eq("status", campaign.status)
      .select("id");

    if (claimErr) return json({ error: `claim failed: ${claimErr.message}` }, 500);
    if (!claimed || claimed.length === 0) {
      return json({ error: "campanha já está em envio (claim perdido)" }, 409);
    }

    // ---- Resolucao de audiencia (identica a versao anterior) ----------------
    let leads: any[] = [];
    if (!campaign.segment_id) {
      const { data } = await supabase.from("leads").select("*").limit(5000);
      leads = data || [];
    } else {
      const { data: segment } = await supabase
        .from("segments")
        .select("type")
        .eq("id", campaign.segment_id)
        .single();

      if (segment?.type === "dynamic") {
        const { data: rpcData } = await supabase.rpc("evaluate_segment_rules", {
          p_segment_id: campaign.segment_id,
        });
        const ids = (rpcData || []).map((r: any) => r.lead_id);
        if (ids.length > 0) {
          const allLeads: any[] = [];
          for (let i = 0; i < ids.length; i += 200) {
            const batch = ids.slice(i, i + 200);
            const { data } = await supabase.from("leads").select("*").in("id", batch);
            if (data) allLeads.push(...data);
          }
          leads = allLeads;
        }
      } else {
        const { data } = await supabase
          .from("segment_contacts")
          .select("lead_id, leads(*)")
          .eq("segment_id", campaign.segment_id);
        leads = (data || []).map((r: any) => r.leads).filter(Boolean);
      }
    }

    // ================= CANAL WHATSAPP: sincrono, como antes ==================
    if (campaign.channel !== "email") {
      const zapiUrl = Deno.env.get("ZAPI_INSTANCE_URL");
      const zapiToken = Deno.env.get("ZAPI_TOKEN");

      const replaceVars = (text: string, lead: any) =>
        text
          .replace(/\{\{nome\}\}/g, lead.nome || "")
          .replace(/\{\{email\}\}/g, lead.email || "")
          .replace(/\{\{empresa\}\}/g, lead.empresa || lead.cargo || "");

      let sentCount = 0;
      let failedCount = 0;

      for (const lead of leads) {
        let status = "sent";
        let error: string | null = null;
        try {
          if (!zapiUrl || !zapiToken) {
            status = "failed";
            error = "ZAPI credentials not configured";
          } else {
            const phone = lead.phone_normalized || lead.whatsapp;
            if (!phone) {
              status = "failed";
              error = "Lead has no phone number";
            } else {
              const res = await fetch(`${zapiUrl}/send-text`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: zapiToken },
                body: JSON.stringify({
                  phone: String(phone).replace(/\D/g, ""),
                  message: replaceVars(campaign.body || "", lead),
                }),
              });
              if (!res.ok) {
                const errBody = await res.text();
                status = "failed";
                error = `Z-API error: ${res.status} - ${errBody}`;
              }
            }
          }
        } catch (err) {
          status = "failed";
          error = String(err);
        }

        if (status === "sent") sentCount++;
        else failedCount++;

        await supabase.from("campaign_sends").insert({
          campaign_id: campaign.id,
          lead_id: lead.id,
          dnia_id: lead.dnia_id || null,
          channel: campaign.channel,
          status,
          sent_at: new Date().toISOString(),
          error,
        });
      }

      await supabase.rpc("finalize_campaign_if_drained", { p_campaign_id: campaign.id });
      return json({ sent: sentCount, failed: failedCount });
    }

    // ===================== CANAL EMAIL: enfileira ============================
    const withEmail = leads.filter((l: any) => l.email && String(l.email).trim().length > 0);
    const withoutEmail = leads.filter((l: any) => !l.email || String(l.email).trim().length === 0);

    // Leads sem email nunca entram na fila: viram 'failed' aqui mesmo.
    // (A supressao NAO e checada aqui de proposito -- ela e checada no worker,
    //  o mais proximo possivel do envio, para nao usar uma lista defasada.)
    if (withoutEmail.length > 0) {
      const rows = withoutEmail.map((l: any) => ({
        campaign_id: campaign.id,
        lead_id: l.id,
        dnia_id: l.dnia_id || null,
        channel: "email",
        status: "failed",
        sent_at: new Date().toISOString(),
        error: "Lead has no email",
      }));
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("campaign_sends").insert(rows.slice(i, i + 500));
      }
    }

    if (withEmail.length === 0) {
      await supabase.rpc("finalize_campaign_if_drained", { p_campaign_id: campaign.id });
      return json({ queued: 0, skipped: withoutEmail.length, campaign_id: campaign.id });
    }

    // Insert em lote das linhas 'pending' + publicacao na fila, em chunks de 500.
    // A ordem importa: a linha campaign_sends precisa existir ANTES da mensagem
    // (o worker resolve a mensagem pelo send_id; mensagem orfa seria descartada).
    let queued = 0;
    const CHUNK = 500;
    for (let i = 0; i < withEmail.length; i += CHUNK) {
      const chunk = withEmail.slice(i, i + CHUNK);

      const { data: inserted, error: insErr } = await supabase
        .from("campaign_sends")
        .insert(
          chunk.map((l: any) => ({
            campaign_id: campaign.id,
            lead_id: l.id,
            dnia_id: l.dnia_id || null,
            channel: "email",
            status: "pending",
            sent_at: null,
          })),
        )
        .select("id, lead_id");

      if (insErr || !inserted) {
        console.error("send-campaign insert campaign_sends error:", insErr);
        continue;
      }

      const messages = inserted.map((s: any) => ({
        send_id: s.id,
        campaign_id: campaign.id,
        lead_id: s.lead_id,
      }));

      const { data: n, error: qErr } = await supabase.rpc("email_queue_send_batch", {
        p_messages: messages,
      });

      if (qErr) {
        // As linhas ficaram 'pending' sem mensagem na fila. Marcamos como failed
        // para nao travar o fechamento da campanha (finalize exige pending == 0).
        console.error("send-campaign email_queue_send_batch error:", qErr);
        await supabase
          .from("campaign_sends")
          .update({ status: "failed", error: `enqueue failed: ${qErr.message}`, sent_at: new Date().toISOString() })
          .in("id", inserted.map((s: any) => s.id))
          .eq("status", "pending");
        continue;
      }

      queued += typeof n === "number" ? n : messages.length;
    }

    return json({ queued, skipped: withoutEmail.length, campaign_id: campaign.id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
```

- [ ] **Step 2:** Verificação por leitura (não há Deno local):
  - A audiência (bloco `leads`) é **idêntica** à versão anterior (linhas 70–104 do arquivo original).
  - O bloco WhatsApp reproduz o comportamento anterior (mesma URL, mesmo header, mesmo `replaceVars` sem
    `{{unsubscribe_url}}`, mesmo insert com `sent_at` preenchido).
  - Nenhuma chamada a `https://api.resend.com` restou no arquivo:
    `grep -n "api.resend.com" supabase/functions/send-campaign/index.ts` → **0 resultados**.
  - `buildUnsubscribeUrl` foi **removido daqui e existe no worker** (checar no Task 3.4 antes de commitar).
- [ ] **Step 3:** Commit + push:
  `git commit -m "refactor(email): send-campaign vira enfileirador da fila pgmq (canal email); WhatsApp segue síncrono"`
- [ ] **Step 4:** Prompt de deploy. **Não deployar isoladamente** — sem o worker (Task 3.4) nenhum email sai.
  Agrupar o deploy de 3.3 + 3.4.

---

## Task 3.4 — Worker `process-email-queue` (Resend Batch API)

**Files:**
- Create: `supabase/functions/process-email-queue/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Consumes: `public.email_queue_read`, `public.email_queue_delete`, `public.finalize_campaign_if_drained`
  (Task 3.1); `_shared/auth.ts` → `validateToken(req)`, `unauthorized()`, `ok()`, `error()`, `handleCors()`.
- Produces: `POST /process-email-queue` (auth: `Authorization: Bearer <WEBHOOK_SECRET>`) →
  `{ processed, sent, failed, skipped, batches }`.
- Preenche `campaign_sends.resend_email_id` e avança `pending → sent | failed`.

### ⚠️ Incertezas a verificar antes de codar (não adivinhar)

| Ponto | Status | Como verificar |
|---|---|---|
| Batch API aceita `tags` e `headers` por email | **VERIFICADO** em `https://resend.com/docs/api-reference/emails/send-batch-emails`: suporta `from, to, cc, bcc, reply_to, subject, html, text, headers, tags, template, topic_id` e o header `Idempotency-Key`. **Não** suporta `attachments` nem `scheduled_at`. | Reconferir a página antes de codar; se `tags`/`headers` tiverem saído, a Fase 3 precisa cair para `POST /emails` 1-a-1 com throttling (10 req/s) — **avisar o humano, não improvisar**. |
| Formato da resposta | **VERIFICADO**: `{ "data": [ { "id": "..." }, ... ] }`, "each entry in `data` corresponds to the email at the same index in the batch payload (0-based)". | Idem. O código abaixo já trata `data.length !== payload.length` sem quebrar. |
| Erro **por item** dentro de um 200 | **INCERTO** — a doc só mostra `{id}`. | O código trata defensivamente: item sem `id` → send `failed` com o JSON do item. Na primeira campanha real, inspecionar os logs da function. |
| Schema/namespace do `pg_net` (`net.http_post`) | **INCERTO** no projeto | No SQL Editor: `select extname, extnamespace::regnamespace from pg_extension where extname in ('pg_net','pg_cron','pgmq');` antes de aplicar a migration do Task 3.5. |

### Regras operacionais do worker

- Visibility timeout **180s**; orçamento de wall-clock **100s** (limite free é 150s) — o worker sai antes de
  ser morto e o cron do minuto seguinte continua a drenagem.
- **`delete` só depois do sucesso.** Falha de rede/5xx/429 → **não deleta**; as mensagens voltam a ficar
  visíveis após o vt e são reprocessadas.
- **Idempotência:** mensagem cujo `campaign_sends.status` **já não é `pending`** é pulada e deletada.
- **Poison message:** `read_ct > 5` → send vira `failed` (`error='abandonado após N tentativas'`) e a mensagem
  é deletada, para não circular para sempre.
- **Rate limit:** 100 emails = 1 request. Pausa de 150ms entre batches (folga confortável nos 10 req/s).
  HTTP 429 → aborta o ciclo sem deletar; honra `Retry-After` só no log (o cron re-invoca em ≤60s).
- **`Idempotency-Key`** = `batch_` + SHA-256 hex dos `send_id` ordenados → se o worker morrer **depois** de o
  Resend aceitar mas **antes** do delete, a re-tentativa com o mesmo subconjunto não duplica emails.
  (Limitação: só protege se o subconjunto re-lido for idêntico; a guarda de status cobre o resto.)

- [ ] **Step 1:** Criar `supabase/functions/process-email-queue/index.ts`:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { validateToken, unauthorized, ok, error, handleCors } from "../_shared/auth.ts";

// WORKER da fila email_send_queue (Fase 3). Invocado pelo pg_cron a cada minuto
// via net.http_post com o WEBHOOK_SECRET do Vault (migration 20260713220000).
//
// Toda a logica por-destinatario que vivia em send-campaign migrou para ca:
//   1. filtro de supressao (email_suppressions)
//   2. tags de correlacao campaign_id/lead_id (o resend-webhook depende delas)
//   3. captura do resend_email_id (fallback de correlacao do webhook)
//   4. headers RFC 8058 (List-Unsubscribe / List-Unsubscribe-Post)
//   5. rodape automatico de descadastro quando o HTML nao traz o link
//   6. merge tags {{nome}} {{email}} {{empresa}} {{unsubscribe_url}} em subject e body
// Nao remover nenhum destes sem ler docs/plano-fase3-fila-agendamento.md.

const QUEUE_VT = 180;              // segundos de invisibilidade da mensagem
const BATCH_SIZE = 100;            // teto da Batch API do Resend (100 emails = 1 request)
const MAX_READ_COUNT = 5;          // poison message
const WALL_CLOCK_BUDGET_MS = 100_000; // limite free da Edge Function e 150s
const INTER_BATCH_DELAY_MS = 150;  // folga sobre os 10 req/s do Resend

// ---------------------------------------------------------------------------
// Unsubscribe: COPIA BYTE-A-BYTE do que estava em send-campaign. O token DEVE
// ser identico ao computeToken() de supabase/functions/email-unsubscribe/index.ts:
// mesma mensagem `${leadId}:${email_lowercase_trimmed}`, mesmo HMAC-SHA256 com
// UNSUBSCRIBE_SECRET, mesmo base64url sem padding. Nao "melhorar".
// ---------------------------------------------------------------------------
function b64urlEncodeBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlEncodeString(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function buildUnsubscribeUrl(leadId: string, email: string): Promise<string | null> {
  const secret = Deno.env.get("UNSUBSCRIBE_SECRET");
  const base = Deno.env.get("SUPABASE_URL");
  if (!secret || !base) return null; // sem secret: nao gera link
  const normalized = email.toLowerCase().trim();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${leadId}:${normalized}`));
  const token = b64urlEncodeBytes(new Uint8Array(mac));
  const e = b64urlEncodeString(normalized);
  return `${base}/functions/v1/email-unsubscribe?lid=${encodeURIComponent(leadId)}&e=${e}&t=${token}`;
}

// Merge tags: mesma semantica do replaceVars antigo (empresa cai para cargo).
function replaceVars(text: string, lead: any, unsubscribeUrl: string | null): string {
  return text
    .replace(/\{\{nome\}\}/g, lead.nome || "")
    .replace(/\{\{email\}\}/g, lead.email || "")
    .replace(/\{\{empresa\}\}/g, lead.empresa || lead.cargo || "")
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl || "");
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface QueueMsg {
  msg_id: number;
  read_ct: number;
  message: { send_id: string; campaign_id: string; lead_id: string };
}

interface BatchOutcome {
  sent: number;
  failed: number;
  skipped: number;
  aborted: boolean; // true = pare o ciclo (rate limit / erro transitorio do Resend)
  campaigns: string[];
}

async function markSend(
  sb: any,
  sendId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  // .eq('status','pending') = guarda de idempotencia: nunca sobrescreve um status
  // que o resend-webhook ja avancou (delivered/opened/...).
  const { error: err } = await sb
    .from("campaign_sends")
    .update(patch)
    .eq("id", sendId)
    .eq("status", "pending");
  if (err) console.error("process-email-queue markSend error:", sendId, err);
}

async function processBatch(sb: any, msgs: QueueMsg[]): Promise<BatchOutcome> {
  const out: BatchOutcome = { sent: 0, failed: 0, skipped: 0, aborted: false, campaigns: [] };
  const toDelete: number[] = [];
  const nowIso = () => new Date().toISOString();

  // 0. Poison messages: circularam demais, abandona.
  const live: QueueMsg[] = [];
  for (const m of msgs) {
    if (m.read_ct > MAX_READ_COUNT) {
      await markSend(sb, m.message.send_id, {
        status: "failed",
        error: `abandonado após ${m.read_ct} tentativas na fila`,
        sent_at: nowIso(),
      });
      toDelete.push(m.msg_id);
      out.failed++;
    } else {
      live.push(m);
    }
  }

  if (live.length > 0) {
    const sendIds = live.map((m) => m.message.send_id);

    // 1. Estado atual dos sends (idempotencia).
    const { data: sends } = await sb
      .from("campaign_sends")
      .select("id, status, campaign_id, lead_id")
      .in("id", sendIds);
    const sendById = new Map<string, any>((sends ?? []).map((s: any) => [s.id, s]));

    const pending: QueueMsg[] = [];
    for (const m of live) {
      const s = sendById.get(m.message.send_id);
      if (!s || s.status !== "pending") {
        // Send inexistente (campanha deletada) ou ja processado: mensagem obsoleta.
        toDelete.push(m.msg_id);
        out.skipped++;
      } else {
        pending.push(m);
      }
    }

    if (pending.length > 0) {
      // 2. Campanhas e leads em bloco.
      const campaignIds = [...new Set(pending.map((m) => m.message.campaign_id))];
      const leadIds = [...new Set(pending.map((m) => m.message.lead_id))];
      out.campaigns = campaignIds;

      const { data: campaignRows } = await sb
        .from("campaigns")
        .select("id, subject, body, status, channel")
        .in("id", campaignIds);
      const campaignById = new Map<string, any>((campaignRows ?? []).map((c: any) => [c.id, c]));

      const { data: leadRows } = await sb
        .from("leads")
        .select("id, nome, email, empresa, cargo")
        .in("id", leadIds);
      const leadById = new Map<string, any>((leadRows ?? []).map((l: any) => [l.id, l]));

      // 3. FILTRO DE SUPRESSAO (preservado do send-campaign: chunks de 200, lowercase).
      const emails = [
        ...new Set(
          [...leadById.values()]
            .map((l: any) => l.email)
            .filter(Boolean)
            .map((e: string) => e.toLowerCase().trim()),
        ),
      ];
      const suppressed = new Set<string>();
      for (let i = 0; i < emails.length; i += 200) {
        const { data: sup } = await sb
          .from("email_suppressions")
          .select("email")
          .in("email", emails.slice(i, i + 200));
        for (const s of sup ?? []) suppressed.add(String(s.email).toLowerCase().trim());
      }

      const resendKey = Deno.env.get("RESEND_API_KEY");
      const emailFrom = Deno.env.get("EMAIL_FROM") || "DN.IA <noreply@dnia.ai>";
      if (!Deno.env.get("UNSUBSCRIBE_SECRET")) {
        console.error("UNSUBSCRIBE_SECRET ausente — emails sairão sem link de descadastro");
      }

      // 4. Monta o payload do batch.
      const payload: Record<string, unknown>[] = [];
      const payloadMsgs: QueueMsg[] = [];

      for (const m of pending) {
        const send = sendById.get(m.message.send_id);
        const campaign = campaignById.get(m.message.campaign_id);
        const lead = leadById.get(m.message.lead_id);

        const fail = async (reason: string) => {
          await markSend(sb, m.message.send_id, { status: "failed", error: reason, sent_at: nowIso() });
          toDelete.push(m.msg_id);
          out.failed++;
        };

        if (!resendKey) { await fail("RESEND_API_KEY not configured"); continue; }
        if (!campaign) { await fail("Campaign not found"); continue; }
        if (campaign.channel !== "email") { await fail("Campanha não é de email"); continue; }
        if (campaign.status !== "sending") { await fail(`campanha não está em envio (status ${campaign.status})`); continue; }
        if (!lead || !lead.email) { await fail("Lead has no email"); continue; }
        if (suppressed.has(String(lead.email).toLowerCase().trim())) { await fail("suppressed"); continue; }

        const unsubscribeUrl = await buildUnsubscribeUrl(String(lead.id), String(lead.email));

        let html = replaceVars(campaign.body || "", lead, unsubscribeUrl);
        // Rodape automatico (preservado do send-campaign).
        if (unsubscribeUrl && !html.includes("email-unsubscribe")) {
          const footer = `<p style="font-size:12px;color:#888;text-align:center;margin-top:24px">Não quer mais receber estes emails? <a href="${unsubscribeUrl}" style="color:#888">Descadastre-se</a></p>`;
          html = html.includes("</body>") ? html.replace("</body>", `${footer}</body>`) : `${html}${footer}`;
        }

        const item: Record<string, unknown> = {
          from: emailFrom,
          to: [lead.email],
          subject: replaceVars(campaign.subject || "", lead, unsubscribeUrl),
          html,
          // Tags de correlacao: o resend-webhook resolve o send por elas.
          tags: [
            { name: "campaign_id", value: String(campaign.id) },
            { name: "lead_id", value: String(lead.id) },
          ],
        };
        if (unsubscribeUrl) {
          // RFC 8058 one-click (Gmail/Yahoo exigem de bulk senders).
          item.headers = {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          };
        }

        payload.push(item);
        payloadMsgs.push(m);
        void send; // send ja validado acima
      }

      // 5. Envia o batch (100 emails = 1 request).
      if (payload.length > 0) {
        const idemKey =
          "batch_" + (await sha256Hex(payloadMsgs.map((m) => m.message.send_id).sort().join(",")));

        let res: Response;
        try {
          res = await fetch("https://api.resend.com/emails/batch", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": idemKey,
            },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          // Falha de rede: NAO deleta nada; as mensagens voltam apos o vt.
          console.error("process-email-queue fetch error:", err);
          if (toDelete.length > 0) await sb.rpc("email_queue_delete", { p_msg_ids: toDelete });
          out.aborted = true;
          return out;
        }

        if (res.status === 429 || res.status >= 500) {
          // Rate limit / erro transitorio: NAO deleta; o proximo tick do cron reprocessa.
          const retryAfter = res.headers.get("retry-after");
          console.error(
            `process-email-queue Resend ${res.status} (retry-after=${retryAfter}); mensagens devolvidas à fila`,
          );
          if (toDelete.length > 0) await sb.rpc("email_queue_delete", { p_msg_ids: toDelete });
          out.aborted = true;
          return out;
        }

        if (!res.ok) {
          // 4xx nao-429: payload invalido. Reenviar nao resolve -> falha e deleta.
          const errBody = await res.text();
          for (const m of payloadMsgs) {
            await markSend(sb, m.message.send_id, {
              status: "failed",
              error: `Resend batch error: ${res.status} - ${errBody.slice(0, 400)}`,
              sent_at: nowIso(),
            });
            toDelete.push(m.msg_id);
            out.failed++;
          }
        } else {
          const body = await res.json().catch(() => null);
          const items: any[] = Array.isArray(body?.data) ? body.data : [];
          if (items.length !== payload.length) {
            // A doc garante correspondencia por indice; se nao veio assim, os emails
            // JA SAIRAM -- marcar 'sent' sem resend_email_id (as tags ainda permitem
            // que o resend-webhook correlacione) e deletar, para nao duplicar envio.
            console.error(
              `process-email-queue: resposta do batch com ${items.length} itens para ${payload.length} emails`,
            );
          }
          for (let i = 0; i < payloadMsgs.length; i++) {
            const m = payloadMsgs[i];
            const item = items[i];
            if (item && typeof item.id === "string") {
              await markSend(sb, m.message.send_id, {
                status: "sent",
                sent_at: nowIso(),
                error: null,
                resend_email_id: item.id,
              });
              out.sent++;
            } else if (item && (item.error || item.message)) {
              await markSend(sb, m.message.send_id, {
                status: "failed",
                sent_at: nowIso(),
                error: `Resend item error: ${JSON.stringify(item).slice(0, 400)}`,
              });
              out.failed++;
            } else {
              // Sem id e sem erro explicito: email saiu, id desconhecido.
              await markSend(sb, m.message.send_id, {
                status: "sent",
                sent_at: nowIso(),
                error: null,
                resend_email_id: null,
              });
              out.sent++;
            }
            toDelete.push(m.msg_id);
          }
        }
      }
    }
  }

  // 6. DELETE das mensagens -- somente das que chegaram a um estado terminal.
  if (toDelete.length > 0) {
    const { error: delErr } = await sb.rpc("email_queue_delete", { p_msg_ids: toDelete });
    if (delErr) console.error("process-email-queue email_queue_delete error:", delErr);
  }

  return out;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return error("Method not allowed", 405);
  // Chamado pelo pg_cron com Bearer <WEBHOOK_SECRET> (vindo do Vault).
  if (!validateToken(req)) return unauthorized();

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const started = Date.now();
  let sent = 0, failed = 0, skipped = 0, batches = 0;
  const touched = new Set<string>();

  while (Date.now() - started < WALL_CLOCK_BUDGET_MS) {
    const { data: msgs, error: readErr } = await sb.rpc("email_queue_read", {
      p_vt: QUEUE_VT,
      p_qty: BATCH_SIZE,
    });

    if (readErr) {
      console.error("process-email-queue email_queue_read error:", readErr);
      return error("queue read failed", 500);
    }
    const list = (msgs ?? []) as QueueMsg[];
    if (list.length === 0) break;

    const outcome = await processBatch(sb, list);
    batches++;
    sent += outcome.sent;
    failed += outcome.failed;
    skipped += outcome.skipped;
    for (const c of outcome.campaigns) touched.add(c);

    if (outcome.aborted) break;
    if (list.length < BATCH_SIZE) break; // fila drenada

    await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
  }

  // Fecha as campanhas cuja fila zerou (recomputa campaigns.stats de campaign_sends).
  for (const campaignId of touched) {
    const { error: finErr } = await sb.rpc("finalize_campaign_if_drained", {
      p_campaign_id: campaignId,
    });
    if (finErr) console.error("process-email-queue finalize error:", campaignId, finErr);
  }

  return ok({ processed: sent + failed + skipped, sent, failed, skipped, batches });
});
```

- [ ] **Step 2:** Registrar em `supabase/config.toml` (ao final do arquivo):

```toml
[functions.process-email-queue]
verify_jwt = false
```

- [ ] **Step 3:** **Checklist de preservação** (a verificação central desta fase — fazer com `grep`, não de cabeça):

```bash
cd supabase/functions/process-email-queue
grep -c "email_suppressions"        index.ts   # >= 1  (item 1)
grep -c "campaign_id\", value"      index.ts   # >= 1  (item 2 — tags)
grep -c "resend_email_id"           index.ts   # >= 1  (item 3)
grep -c "List-Unsubscribe-Post"     index.ts   # == 1  (item 4)
grep -c "Descadastre-se"            index.ts   # == 1  (item 5 — rodapé)
grep -c "unsubscribe_url"           index.ts   # >= 1  (item 6 — merge tag)
```
  E comparar `buildUnsubscribeUrl` **linha a linha** com o bloco removido do `send-campaign`
  (git: `git show HEAD~1:supabase/functions/send-campaign/index.ts | sed -n '14,36p'`) — deve ser idêntico.

- [ ] **Step 4:** Commit + push:
  `git commit -m "feat(email): worker process-email-queue com Resend Batch API, supressão, unsubscribe e idempotência"`
- [ ] **Step 5:** Prompt de deploy conjunto (`send-campaign`, `process-email-queue`) + migration do Task 3.1.
  **Validar em produção antes de agendar o cron (Task 3.5):** disparar `process-email-queue` manualmente
  com `curl -X POST -H "Authorization: Bearer $WEBHOOK_SECRET" https://kfhojzdcnpuntynodsff.supabase.co/functions/v1/process-email-queue`
  logo após enviar uma campanha de teste para 2–3 emails próprios. Esperado: JSON `{sent: N, ...}`, emails
  chegam, `campaign_sends.resend_email_id` preenchido, campanha vira `sent`.

---

## Task 3.5 — Migration do pg_cron: drenagem da fila + promoção de campanhas agendadas

**Files:**
- Create: `supabase/migrations/20260713220000_email_cron.sql`

**Interfaces:**
- Consumes: `public.invoke_edge_function` (Task 3.1); functions `process-email-queue` (3.4) e `send-campaign` (3.3)
  **já deployadas**.
- Produces: jobs `drain-email-queue` e `promote-scheduled-campaigns` (`* * * * *`); função
  `public.promote_scheduled_campaigns()`.

> **Sequenciamento obrigatório:** esta migration só pode ser aplicada **depois** do deploy das functions.
> Um cron apontando para uma function inexistente gera 404s a cada minuto em `net._http_response`.

- [ ] **Step 1:** Criar `supabase/migrations/20260713220000_email_cron.sql`:

```sql
-- ============================================================================
-- Fase 3 — pg_cron: drenagem da fila e promocao de campanhas agendadas.
-- PRE-REQUISITOS (nesta ordem):
--   1. migration 20260713210000_email_queue.sql aplicada;
--   2. edge functions send-campaign e process-email-queue DEPLOYADAS;
--   3. segredos no Vault (SQL Editor, uma unica vez):
--        select vault.create_secret('https://kfhojzdcnpuntynodsff.supabase.co', 'project_url');
--        select vault.create_secret('<WEBHOOK_SECRET>', 'webhook_secret');
--      (o valor de webhook_secret e o MESMO do Edge Function Secret WEBHOOK_SECRET,
--       usado por _shared/auth.ts::validateToken)
-- ============================================================================

-- Promove campanhas cujo horario chegou. NAO altera o status aqui: quem faz o
-- claim atomico (CAS scheduled -> sending) e o proprio send-campaign, e e isso
-- que impede enfileiramento duplo se dois ticks se sobrepuserem.
CREATE OR REPLACE FUNCTION public.promote_scheduled_campaigns()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.campaigns
     WHERE status = 'scheduled'
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= now()
     ORDER BY scheduled_at
     LIMIT 20
  LOOP
    PERFORM public.invoke_edge_function('send-campaign', jsonb_build_object('campaign_id', r.id));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.promote_scheduled_campaigns() FROM PUBLIC, anon, authenticated;

-- Jobs (idempotentes: unschedule antes de schedule).
DO $$
BEGIN
  PERFORM cron.unschedule('drain-email-queue');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('promote-scheduled-campaigns');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'drain-email-queue',
  '* * * * *',
  $cron$ SELECT public.invoke_edge_function('process-email-queue', '{}'::jsonb); $cron$
);

SELECT cron.schedule(
  'promote-scheduled-campaigns',
  '* * * * *',
  $cron$ SELECT public.promote_scheduled_campaigns(); $cron$
);
```

- [ ] **Step 2:** Verificação (SQL Editor do Supabase, após aplicar):
```sql
-- jobs registrados
select jobid, jobname, schedule, active from cron.job where jobname in ('drain-email-queue','promote-scheduled-campaigns');
-- execucoes recentes (status deve ser 'succeeded')
select jobname, status, return_message, start_time
  from cron.job_run_details order by start_time desc limit 10;
-- respostas HTTP do pg_net (status_code deve ser 200; 401 = segredo do Vault errado)
select id, status_code, left(content, 200) from net._http_response order by id desc limit 10;
-- namespaces das extensoes (confirma que net.http_post e o caminho certo)
select extname, extnamespace::regnamespace from pg_extension where extname in ('pg_net','pg_cron','pgmq');
```
  **Nenhum segredo aparece em `cron.job.command`** — confirmar visualmente.
- [ ] **Step 3:** Commit + push:
  `git commit -m "feat(email): jobs pg_cron para drenar a fila e promover campanhas agendadas (segredos via Vault)"`
- [ ] **Step 4:** Prompt de deploy da migration + instrução dos dois `vault.create_secret`.

---

## Task 3.6 — UI: "Enviar agora / Agendar" no wizard + cancelar agendamento

**Files:**
- Modify: `src/components/admin/campaigns/CampaignWizard.tsx`
- Modify: `src/hooks/useCampaigns.tsx`
- Modify: `src/pages/admin/Campaigns.tsx`

**Interfaces:**
- Produces: `useCampaigns().cancelSchedule(id: string): Promise<void>`; campanha criada com
  `status: 'scheduled'` + `scheduled_at` (ISO) quando agendada, ou `status: 'draft'` + invoke de
  `send-campaign` quando "agora".

> **Mudança de contrato importante:** o wizard **não pode mais** criar a campanha já com `status: 'sending'`
> (linha 229 atual). O enfileirador faz CAS a partir de um status *startable* — se a campanha já chegar
> `sending`, o CAS falha e nada é enviado. O wizard cria `draft` e deixa o `send-campaign` promover.

- [ ] **Step 1:** Em `src/hooks/useCampaigns.tsx`, adicionar `total` a `CampaignLiveStats` e a ação
  `cancelSchedule`. Substituir a interface e o final de `getCampaignStats`:

```ts
export interface CampaignLiveStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  failed: number;
  unsubscribed: number;
}
```

```ts
    const m = Object.fromEntries(counts) as Record<(typeof SEND_STATUSES)[number], number>;
    const clicked = m.clicked;
    const opened = clicked + m.opened;
    const delivered = opened + m.delivered;
    const sent = delivered + m.sent;
    // total = todas as linhas de campaign_sends (inclui pending) — base da barra de progresso
    const total = SEND_STATUSES.reduce((acc, s) => acc + m[s], 0);
    return {
      total,
      pending: m.pending,
      sent,
      delivered,
      opened,
      clicked,
      bounced: m.bounced,
      complained: m.complained,
      failed: m.failed,
      unsubscribed: m.unsubscribed,
    };
  };
```

  E, antes do `return {...}` do hook:

```ts
  // Cancelar agendamento: volta a campanha para rascunho. Seguro porque o
  // promote-scheduled-campaigns (pg_cron) só enxerga status = 'scheduled'.
  const cancelSchedule = async (id: string) => {
    const { error } = await supabase
      .from('campaigns' as any)
      .update({ status: 'draft', scheduled_at: null } as any)
      .eq('id', id)
      .eq('status', 'scheduled'); // não cancela o que já entrou em envio
    if (error) {
      toast.error('Erro ao cancelar o agendamento');
      return;
    }
    toast.success('Agendamento cancelado — a campanha voltou para rascunho');
    fetchCampaigns();
  };
```

  E incluir `cancelSchedule` no objeto retornado.

- [ ] **Step 2:** Em `src/components/admin/campaigns/CampaignWizard.tsx`, substituir `handleSend` (linhas 219–253):

```ts
  const isScheduled = scheduleType === 'later';

  const handleSend = async () => {
    const scheduledIso = isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null;
    if (isScheduled && !scheduledIso) {
      toast.error('Escolha a data e a hora do agendamento');
      return;
    }

    setSending(true);
    const body = channel === 'email' ? emailHtml : waBody;

    // status 'draft': o send-campaign faz o CAS draft -> sending ao enfileirar.
    // Criar já como 'sending' faria o CAS falhar e a campanha nunca sairia.
    const campaign = await createCampaign({
      name,
      channel,
      segment_id: segmentId === 'all' ? null : segmentId,
      subject: channel === 'email' ? subject : null,
      body,
      scheduled_at: scheduledIso,
      status: isScheduled ? 'scheduled' : 'draft',
    });

    if (campaign) {
      if (channel === 'email' && emailDesign) {
        await supabase
          .from('campaigns' as any)
          .update({ design: emailDesign } as any)
          .eq('id', campaign.id);
      }

      if (isScheduled) {
        // Nada a invocar: o job pg_cron promote-scheduled-campaigns dispara no horário.
        toast.success(`Campanha agendada para ${new Date(scheduledIso!).toLocaleString('pt-BR')}`);
      } else {
        try {
          const { error } = await supabase.functions.invoke('send-campaign', {
            body: { campaign_id: campaign.id },
          });
          if (error) throw error;
          toast.success('Campanha na fila de envio — acompanhe o progresso na lista');
        } catch {
          toast.error('Erro ao iniciar envio da campanha');
        }
      }
    }

    setSending(false);
    setConfirmOpen(false);
    onClose();
  };
```

- [ ] **Step 3:** No passo Revisão, ajustar o botão e o texto (linhas 546–559):

```tsx
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <p className="font-medium">
                Esta campanha será enviada para <span className="text-primary">{contactCount} contatos</span>
                {isScheduled && scheduledAt && (
                  <> em <span className="text-primary">{new Date(scheduledAt).toLocaleString('pt-BR')}</span></>
                )}
              </p>
              {channel === 'email' && contactCount > 0 && (
                <p className="text-muted-foreground mt-1">
                  O envio é feito em lotes pela fila — leva cerca de {Math.max(1, Math.ceil(contactCount / 100))} minuto(s).
                </p>
              )}
            </div>

            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setConfirmOpen(true)}
              disabled={isScheduled && !scheduledAt}
            >
              {isScheduled
                ? <><Clock className="h-4 w-4 mr-2" /> Agendar campanha</>
                : <><Send className="h-4 w-4 mr-2" /> Enviar campanha</>}
            </Button>
```

  E o diálogo de confirmação (linhas 578–595):

```tsx
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isScheduled ? 'Confirmar agendamento' : 'Confirmar envio'}</AlertDialogTitle>
              <AlertDialogDescription>
                {isScheduled
                  ? `A campanha será enviada automaticamente para ${contactCount} contatos em ${scheduledAt ? new Date(scheduledAt).toLocaleString('pt-BR') : ''}. Você pode cancelar o agendamento até lá.`
                  : `Confirmar envio para ${contactCount} contatos via ${channel === 'email' ? 'email' : 'WhatsApp'}? Esta ação não pode ser desfeita.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSend} disabled={sending} className="bg-green-600">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (isScheduled ? <Clock className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />)}
                {isScheduled ? 'Confirmar agendamento' : 'Confirmar envio'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
```

- [ ] **Step 4:** Em `src/pages/admin/Campaigns.tsx`, expor "Cancelar agendamento":
  - trocar a desestruturação (linha 28) por
    `const { campaigns, loading, stats, refetch, duplicateCampaign, deleteCampaign, cancelSchedule } = useCampaigns();`
  - importar `CalendarX` de `lucide-react`;
  - no `DropdownMenuContent`, antes do item de excluir:

```tsx
                          {c.status === 'scheduled' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); cancelSchedule(c.id); }}>
                              <CalendarX className="h-4 w-4 mr-2" /> Cancelar agendamento
                            </DropdownMenuItem>
                          )}
```
  - permitir excluir também campanhas agendadas: trocar `{c.status === 'draft' && (` por
    `{(c.status === 'draft' || c.status === 'scheduled') && (`.

- [ ] **Step 5:** `npm run lint && npm run build` — sem erros.
- [ ] **Step 6:** Commit + push:
  `git commit -m "feat(campanhas): agendamento com data/hora no wizard e ação de cancelar agendamento"`
  (Só frontend — o sync do Lovable publica sozinho; **sem prompt de deploy**.)

---

## Task 3.7 — UI: progresso de envio no `CampaignDetail` (polling enquanto `sending`)

**Files:**
- Modify: `src/components/admin/campaigns/CampaignDetail.tsx`

**Interfaces:** consome `useCampaigns().getCampaignStats` (com o novo campo `total`, Task 3.6).

- [ ] **Step 1:** Adicionar imports no topo do arquivo:

```tsx
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
```

- [ ] **Step 2:** Substituir o `useEffect` de carregamento (linhas 54–64) por carga + polling de 10s:

```tsx
  const [liveStatus, setLiveStatus] = useState<string>(campaign.status);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      const [sendsData, statsData] = await Promise.all([
        getCampaignSends(campaign.id),
        getCampaignStats(campaign.id),
      ]);
      // status vem do banco, não do snapshot da prop: enquanto a fila drena, ele
      // muda de 'sending' para 'sent' sem que a lista seja recarregada.
      const { data: fresh } = await supabase
        .from('campaigns' as any)
        .select('status')
        .eq('id', campaign.id)
        .maybeSingle();
      if (cancelled) return;
      setSends(sendsData);
      setLiveStats(statsData);
      setLiveStatus(((fresh as any)?.status as string) ?? campaign.status);
      setLoading(false);
    };

    setLoading(true);
    setLiveStats(null);
    setLiveStatus(campaign.status);
    load();

    // Polling (padrão do projeto: setInterval + flag de cancelamento, sem realtime).
    const id = setInterval(() => {
      if (!cancelled) load();
    }, 10_000);

    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign.id]);
```

  O polling só faz sentido enquanto a campanha envia; para não bater no banco eternamente, encerrar o
  intervalo quando o status sair de `sending`:

```tsx
  useEffect(() => {
    // nada a fazer: o intervalo acima é barato (5 counts + 1 select).
    // Se o status já não é 'sending' e não há pendentes, paramos de exibir a barra.
  }, [liveStatus]);
```
  (Simplificação consciente: o `Sheet` só existe enquanto aberto; o intervalo morre no `onClose`.)

- [ ] **Step 3:** Trocar a fonte do badge de status e inserir a barra de progresso.
  Substituir `const sc = statusConfig[campaign.status] || statusConfig.draft;` (linha 66) por:

```tsx
  const sc = statusConfig[liveStatus] || statusConfig.draft;
```
  E o default de `stats` (linhas 68–70) por:

```tsx
  const stats: CampaignLiveStats = liveStats ?? {
    total: 0, pending: 0, bounced: 0, complained: 0, unsubscribed: 0, ...campaign.stats,
  };
```

  Logo abaixo do `<SheetHeader>` (antes do bloco "Performance Funnel"), inserir:

```tsx
          {liveStatus === 'sending' && stats.total > 0 && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="py-4 px-5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando pela fila...
                  </span>
                  <span className="text-muted-foreground">
                    {stats.total - stats.pending} de {stats.total} processados
                  </span>
                </div>
                <Progress value={Math.round(((stats.total - stats.pending) / stats.total) * 100)} />
                <p className="text-xs text-muted-foreground">
                  {stats.pending} na fila. A tela atualiza sozinha a cada 10 segundos.
                </p>
              </CardContent>
            </Card>
          )}
```

- [ ] **Step 4:** Confirmar que `src/components/ui/progress.tsx` existe
  (`ls src/components/ui/progress.tsx`). Se não existir, usar uma `<div>` com largura percentual em vez de
  adicionar um componente shadcn novo.
- [ ] **Step 5:** `npm run lint && npm run build` — sem erros.
- [ ] **Step 6:** Commit + push:
  `git commit -m "feat(campanhas): barra de progresso de envio com polling enquanto a campanha está na fila"`

---

## Verificação da fase (só é possível em produção, após o deploy)

1. **Campanha grande sem timeout:** criar segmento com 200+ leads de teste, enviar; `send-campaign` responde
   em segundos com `{queued: N}`; ao longo de 1–3 minutos o `CampaignDetail` mostra `pending` caindo e a
   campanha vira "Enviada".
2. **Agendamento:** agendar para +5 min; não invocar nada; a campanha sai sozinha (`cron.job_run_details`
   mostra `promote-scheduled-campaigns` succeeded; `net._http_response` com 200).
3. **Cancelamento:** agendar para +10 min, cancelar; nenhum email é enviado; status volta a "Rascunho".
4. **Não-duplicação:** invocar `send-campaign` duas vezes para a mesma campanha → a segunda responde 409.
   Invocar `process-email-queue` manualmente **durante** a drenagem do cron → nenhum lead recebe dois emails
   (mensagens já lidas estão invisíveis; sends já `sent` são pulados).
5. **Preservação (o teste que realmente importa):** no email recebido em conta própria — (a) `{{nome}}` foi
   substituído; (b) o Gmail mostra "Cancelar inscrição" nativo; (c) o rodapé "Descadastre-se" aparece;
   (d) o dashboard do Resend mostra as tags `campaign_id`/`lead_id`; (e) `campaign_sends.resend_email_id`
   está preenchido; (f) abrir/clicar avança o status via webhook; (g) um lead na `email_suppressions`
   **não** recebe e fica `failed`/`suppressed`.

---

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| **Perder um dos 6 comportamentos do `send-campaign` ao migrar para o worker** (supressão, tags, `resend_email_id`, headers RFC 8058, rodapé, merge tags) | Alto e **silencioso**: emails saem, mas o tracking morre e a conta Resend entra em risco de suspensão | Tabela de preservação no topo deste plano + checklist de `grep` no Task 3.4 Step 3 + validação item 5 da fase |
| Trigger `fn_campaign_send_event` emitindo `email_sent` no INSERT de linhas `pending` | Timeline de todo lead da audiência marcada como "recebeu" antes do envio | Corrigido no Task 3.1 (guarda `NEW.status <> 'pending'` + ramo `pending → sent`) |
| `ORDER BY sent_at DESC` com `NULLS FIRST` pegando linhas `pending` | Descadastro marca a campanha errada; webhook resolve o send errado | Task 3.2 (`nullsFirst: false`) + índice único `(campaign_id, lead_id)` |
| Enfileiramento duplo (dois ticks do cron, duplo clique) | Lead recebe o email duas vezes | CAS `campaigns.status` **antes** de resolver a audiência; índice único parcial; guarda de status no worker |
| Worker morre depois do Resend aceitar e antes do `delete` | Re-entrega da fila reenviaria o batch | `Idempotency-Key` (SHA-256 dos `send_id`) na chamada batch + guarda `status <> 'pending'` |
| Batch API mudou (sem `tags`/`headers`) | Fase 3 inviável como desenhada | Verificar a doc antes de codar (Task 3.4). Se mudou: **parar e avisar o humano** — o fallback é `POST /emails` com throttle de 10 req/s, não é decisão do implementador |
| Erro por item dentro de um HTTP 200 (formato desconhecido) | Send marcado `sent` quando falhou | Código trata item sem `id` como falha; inspecionar os logs da primeira campanha real |
| `pg_net` em schema diferente de `net` | Cron falha silenciosamente | Query de verificação no Task 3.5 Step 2 antes de aplicar |
| Segredos do Vault ausentes | Cron não invoca nada | `invoke_edge_function` emite `RAISE WARNING` (visível em `cron.job_run_details`) em vez de falhar em silêncio |
| Campanha travada em `sending` (crash do enfileirador após o CAS) | Campanha nunca fecha | Operação manual: `update campaigns set status='draft' where id=...` e reenviar. (Um job de "unstick" fica para a Fase 6, quando houver mais superfície de automação.) |
| `send-campaign` continua **sem autenticação** (`verify_jwt=false`, sem `validateAuth`) | Qualquer um com a URL enfileira campanhas | **Pré-existente**, não introduzido aqui. Não foi corrigido nesta fase porque o `CampaignWizard` chama a function com a anon key e adicionar `validateAuth` quebraria a UI. Registrar como dívida técnica: mover o disparo para `campaigns-api` (autenticada) numa fase futura |
| Rate limit do Resend (10 req/s) | 429 em rajada | Batch de 100 (1 request), pausa de 150ms entre batches, aborto sem deletar no 429 |

---

## Deploy (obrigatório — o sync do Lovable NÃO deploya functions/migrations)

**Ordem de deploy (não inverter):**
1. Migration `20260713210000_email_queue.sql` (Task 3.1)
2. Edge Functions `send-campaign`, `process-email-queue`, `resend-webhook`, `email-unsubscribe` (Tasks 3.2–3.4)
3. **Segredos no Vault** (SQL Editor do Supabase, uma única vez):
```sql
select vault.create_secret('https://kfhojzdcnpuntynodsff.supabase.co', 'project_url');
select vault.create_secret('<mesmo valor do Edge Function Secret WEBHOOK_SECRET>', 'webhook_secret');
```
4. Migration `20260713220000_email_cron.sql` (Task 3.5) — **só depois** dos passos 2 e 3.
5. Frontend (Tasks 3.6–3.7) — publicado pelo próprio sync.

**Secrets já existentes que continuam necessários:** `RESEND_API_KEY`, `EMAIL_FROM`, `UNSUBSCRIBE_SECRET`,
`WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`. **Nenhum secret novo de Edge Function** nesta fase — apenas os
dois do Vault.

**Prompt para o Lovable (usar o hash real do commit):**

```
Prompt para Lovable:
---
Aplique a migration: supabase/migrations/20260713210000_email_queue.sql
Faça deploy das edge functions: send-campaign, process-email-queue, resend-webhook, email-unsubscribe.

Mudanças no código:
1. Migration 20260713210000: habilita pgmq/pg_cron/pg_net, cria a fila `email_send_queue`,
   wrappers em public (email_queue_send_batch / email_queue_read / email_queue_delete),
   corrige o trigger fn_campaign_send_event (o status 'pending' passa a ser real e não
   deve mais gerar 'email_sent' na timeline no INSERT), e adiciona
   finalize_campaign_if_drained + invoke_edge_function (segredos via Vault).
2. send-campaign: deixa de enviar emails em loop; agora resolve a audiência, cria
   campaign_sends 'pending' e publica na fila pgmq (WhatsApp continua síncrono).
3. process-email-queue (NOVA): worker que drena a fila e envia via Resend Batch API,
   com supressão, merge tags, unsubscribe RFC 8058, tags de correlação e resend_email_id.
   Já registrada em supabase/config.toml com verify_jwt = false.
4. resend-webhook / email-unsubscribe: correção de ordenação (nullsFirst) por causa das
   novas linhas 'pending' com sent_at nulo.

O código já está no repositório GitHub (commit XXXXXXX). Por favor, faça o deploy.

Depois do deploy, no SQL Editor, criar os segredos do Vault (uma única vez):
  select vault.create_secret('https://kfhojzdcnpuntynodsff.supabase.co', 'project_url');
  select vault.create_secret('<WEBHOOK_SECRET>', 'webhook_secret');
e então aplicar a migration supabase/migrations/20260713220000_email_cron.sql (jobs do pg_cron).
---
```

**Após o deploy:** regenerar os tipos (`supabase gen types typescript --project-id kfhojzdcnpuntynodsff > src/integrations/supabase/types.ts`) — nunca editar o arquivo à mão.
