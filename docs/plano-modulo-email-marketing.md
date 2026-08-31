# Plano de Implementação — Módulo de Email Marketing (Resend)

> **Para workers agênticos:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Passos usam checkboxes (`- [ ]`).
>
> **Base de conhecimento:** `docs/pesquisa-modulo-email-marketing.md` (ler antes de executar qualquer fase).

**Goal:** Evoluir o módulo de campanhas existente para uma plataforma de email marketing completa: tracking via webhook Resend, supressão/unsubscribe, fila com agendamento, biblioteca de templates, segmentação por eventos e fluxos de automação.

**Architecture:** Aproveita a base existente (envio Resend em `send-campaign`, editor Unlayer, `campaign_sends` + trigger que propaga eventos para `contact_events`). Adiciona: Edge Function de webhook (Svix) que atualiza `campaign_sends` com máquina de estados monotônica; fila pgmq drenada por worker via Batch API com pg_cron; tabelas `email_suppressions`, `email_events`, `email_templates`, `journeys`/`journey_runs`.

**Tech Stack:** React 18 + Vite + shadcn/ui, Supabase (Postgres, Edge Functions Deno, pgmq, pg_cron, Vault), Resend API, react-email-editor (Unlayer).

## ⚠️ Restrição nº 0 — projeto hospedado no Lovable (obrigatória)

**Antes de executar qualquer tarefa deste plano, invoque a skill `superpowers`/`lovable-workflow`.** O repositório tem two-way sync com o Lovable (GitHub é a fonte da verdade; produção em `https://dnmkt.dnia.ai`). Isso não é uma formalidade — muda o ciclo de trabalho:

**Ciclo obrigatório por tarefa:**
1. `git pull` **antes** de tocar em qualquer arquivo (o Lovable pode ter commitado desde a última vez — cada prompt no editor do Lovable gera um commit).
2. Implementar a tarefa (escopo pequeno, um deliverable).
3. `npm run lint && npm run build` — sem erros.
4. Commit em português + **`git push` imediato** (reduz a janela de dessincronização e coloca o código onde o usuário testa).
5. Se a tarefa criou/alterou **Edge Function ou migration**: entregar ao usuário o **prompt de deploy para o Lovable** com o hash real do commit (modelo na seção "Deploy") — o sync **não** deploya isso sozinho. Alternativa: `supabase functions deploy <name>` / `supabase db push` via CLI.

**Proibições que quebram o sync (nunca fazer):** renomear, mover ou deletar o repositório GitHub; deletar branches antes de voltar para `main` no Lovable; editar o mesmo arquivo simultaneamente no Lovable e localmente; editar à mão `src/integrations/supabase/types.ts`, `package-lock.json` ou `.lovable/`.

**Verificação honesta:** não afirmar "testado e funcionando" sem ter executado de fato. O que roda localmente (lint, build, `supabase functions serve`) valida o código; o que só existe em produção (webhook do Resend recebendo evento real, entrega no Gmail, pg_cron) **só é validável após deploy, na URL do Lovable** — deixar isso explícito ao entregar cada fase.

## Restrições globais

- **Sem test runner no projeto.** Ciclo de verificação: `npm run lint` + `npm run build` (frontend), `supabase functions serve <name>` + `curl` (functions), validação final em produção (`https://dnmkt.dnia.ai`) após o deploy pelo Lovable.
- Toda Edge Function nova DEVE ser registrada em `supabase/config.toml` com `verify_jwt = false` (auth é feita no corpo via `_shared/auth.ts` ou assinatura Svix).
- Não editar `src/integrations/supabase/types.ts` manualmente (regenerar com `supabase gen types typescript`).
- UI em pt-BR; commits em português; `console.*` some no build de prod (Terser) — não confiar em log para comportamento.
- Não escrever em `leads` do browser — mutações só via Edge Functions.
- Segredos ficam em Edge Function Secrets (padrão `NexusCard`), nunca em tabela ou no client.
- Enums de `campaigns.status` e `campaign_sends.status` são validados por trigger (não CHECK) — alterações de enum = alterar a função do trigger.

## Ordem e dependências das fases

| Fase | Entrega | Depende de |
|---|---|---|
| 0 | Config Resend + tela `ResendCard` + higiene `config.toml` | — |
| 1 | Webhook Resend → tracking completo (opens/clicks/bounces na timeline) | 0 |
| 2 | Unsubscribe one-click (RFC 8058) + lista de supressão | 1 |
| 3 | Fila pgmq + envio em batch + agendamento real | 1, 2 |
| 4 | Biblioteca de templates reutilizáveis | — (paralelizável) |
| 5 | Segmentação: OR, `qualificacao`, regras por evento de email | 1 |
| 6 | Fluxos de automação (journeys) | 1–5 |

Cada fase produz software funcional e testável por si. **Fases 3, 4, 5 e 6 devem ganhar um plano detalhado próprio (formato TDD bite-sized) no momento da execução** — este documento fixa escopo, contratos e decisões; as fases 0–2 já estão em granularidade executável.

---

## Fase 0 — Configuração do Resend + higiene

### Task 0.1: Registrar functions ausentes no `config.toml`

**Files:**
- Modify: `supabase/config.toml`

- [ ] **Step 1:** Adicionar ao final do `config.toml` (as 5 já existentes que faltam):

```toml
[functions.register-conversion]
verify_jwt = false

[functions.unregister-conversion]
verify_jwt = false

[functions.update-conversion]
verify_jwt = false

[functions.contact-details]
verify_jwt = false

[functions.handoff-to-nexus]
verify_jwt = false
```

- [ ] **Step 2:** Commit: `git add supabase/config.toml && git commit -m "fix: registra edge functions ausentes no config.toml (verify_jwt=false)" && git push`

### Task 0.2: Edge Function `resend-config-check`

Testa a conexão com o Resend e lista domínios verificados (equivalente ao `get-nexus-stages` do padrão NexusCard).

**Files:**
- Create: `supabase/functions/resend-config-check/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Produces: `GET /resend-config-check` (auth `validateAuth 'read'`) → `{ ok: true, from: string, domains: [{ name, status }] }` ou `{ ok: false, missing: string[] }`.

- [ ] **Step 1:** Criar a function:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateAuth, unauthorized, ok, error, handleCors } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'GET') return error('Method not allowed', 405)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  if (!(await validateAuth(req, sb, 'read'))) return unauthorized()

  const missing: string[] = []
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  if (!apiKey) missing.push('RESEND_API_KEY')
  if (!from) missing.push('EMAIL_FROM')
  if (!Deno.env.get('RESEND_WEBHOOK_SECRET')) missing.push('RESEND_WEBHOOK_SECRET')
  if (missing.length) return ok({ ok: false, missing })

  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return ok({ ok: false, missing: [], api_error: `Resend respondeu ${res.status}` })
  const body = await res.json()
  const domains = (body?.data ?? []).map((d: any) => ({ name: d.name, status: d.status }))
  return ok({ ok: true, from, domains })
})
```

- [ ] **Step 2:** Registrar no `config.toml`:

```toml
[functions.resend-config-check]
verify_jwt = false
```

- [ ] **Step 3:** Testar local: `supabase functions serve resend-config-check` e
`curl -H "Authorization: Bearer $WEBHOOK_SECRET" http://127.0.0.1:54321/functions/v1/resend-config-check`
Esperado: JSON com `ok` e lista de `missing` ou domínios.

- [ ] **Step 4:** Commit + push.

### Task 0.3: `ResendCard` na aba Integrações

**Files:**
- Create: `src/components/admin/settings/ResendCard.tsx`
- Modify: `src/components/admin/settings/SettingsPage.tsx` (adicionar o card no grid de Integrações, ao lado de `NexusCard`)

**Interfaces:**
- Consumes: `supabase.functions.invoke('resend-config-check')`.

- [ ] **Step 1:** Criar `ResendCard.tsx` seguindo o molde exato de `NexusCard.tsx` (mesma estrutura de Card shadcn, botão "Testar conexão", status persistido em `localStorage['resend_connected']`). Conteúdo específico:
  - Título "Resend (Email)"; descrição "Envio de emails de campanhas e automações".
  - Ao testar: invoca `resend-config-check`. Se `missing.length > 0`, exibir alerta laranja: "Configure os secrets no Supabase: {missing.join(', ')}". Se `ok`, exibir remetente (`from`) e domínios com badge verde `verified` / amarela caso contrário.
  - Bloco de instruções colapsável: como criar API key no Resend, verificar domínio, e configurar o webhook (URL `https://kfhojzdcnpuntynodsff.supabase.co/functions/v1/resend-webhook`, copiar o signing secret `whsec_...` para o secret `RESEND_WEBHOOK_SECRET`).
- [ ] **Step 2:** `npm run lint && npm run build` — sem erros.
- [ ] **Step 3:** Commit + push.

**Verificação da fase:** na URL de produção, aba Configurações → Integrações mostra o card; "Testar conexão" retorna domínios ou lista de secrets faltantes.

---

## Fase 1 — Webhook Resend → tracking

### Task 1.1: Migration — `email_events`, supressão, `resend_email_id`, novos status

**Files:**
- Create: `supabase/migrations/<timestamp>_email_tracking.sql` (gerar com `supabase migration new email_tracking`)

- [ ] **Step 1:** Conteúdo da migration:

```sql
-- Log bruto de eventos de email (dedupe Svix + auditoria + base p/ segmentação)
CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  resend_email_id text,
  campaign_send_id uuid REFERENCES public.campaign_sends(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_events_resend_id ON public.email_events (resend_email_id);
CREATE INDEX idx_email_events_lead ON public.email_events (lead_id, occurred_at DESC);
CREATE INDEX idx_email_events_campaign_type ON public.email_events (campaign_id, event_type);
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_email_events" ON public.email_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Lista de supressão (bounce/complaint/unsubscribe) — consultada em TODO envio
CREATE TABLE public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text NOT NULL CHECK (reason IN ('bounce','complaint','unsubscribe','manual')),
  source text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_email_suppressions" ON public.email_suppressions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Correlação send <-> Resend
ALTER TABLE public.campaign_sends ADD COLUMN resend_email_id text;
CREATE INDEX idx_campaign_sends_resend_id ON public.campaign_sends (resend_email_id);

-- Ampliar enum de status (validado por trigger, não CHECK)
CREATE OR REPLACE FUNCTION public.validate_campaign_send_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('pending','sent','delivered','opened','clicked',
                        'bounced','complained','failed','unsubscribed') THEN
    RAISE EXCEPTION 'status inválido: %', NEW.status;
  END IF;
  RETURN NEW;
END $$;
-- OBS: verificar na execução o nome real da função de validação existente
-- (migration 20260330013031) e substituí-la em vez de criar duplicada.

-- Propagar bounce/complaint para a timeline (estende fn_campaign_send_event)
-- Na execução: ler a definição atual de fn_campaign_send_event e adicionar os ramos:
--   NEW.status = 'bounced'    -> contact_events (event_type 'email_bounced')
--   NEW.status = 'complained' -> contact_events (event_type 'email_complained')
-- mantendo os ramos existentes (email_sent / email_opened / email_clicked).
```

- [ ] **Step 2:** `supabase db push` (ou incluir no prompt de deploy do Lovable).
- [ ] **Step 3:** Regenerar tipos: `supabase gen types typescript --project-id kfhojzdcnpuntynodsff > src/integrations/supabase/types.ts`.
- [ ] **Step 4:** Commit + push.

### Task 1.2: `send-campaign` — enviar com `tags` e persistir `resend_email_id`

**Files:**
- Modify: `supabase/functions/send-campaign/index.ts`

**Interfaces:**
- Produces: todo email enviado carrega `tags: [{name:'campaign_id',...},{name:'lead_id',...}]` e o send correspondente tem `resend_email_id` preenchido — contrato consumido pela Task 1.3.

- [ ] **Step 1:** No ponto do `fetch('https://api.resend.com/emails', ...)`, incluir no payload:

```ts
tags: [
  { name: 'campaign_id', value: campaign.id },
  { name: 'lead_id', value: lead.id },
],
```

- [ ] **Step 2:** Capturar o `id` da resposta do Resend e gravá-lo no insert de `campaign_sends` (`resend_email_id: resendResponse.id`). Filtrar destinatários suprimidos **antes** de enviar:

```ts
const { data: suppressed } = await sb.from('email_suppressions')
  .select('email').in('email', batchEmails)
const suppressedSet = new Set((suppressed ?? []).map((s) => s.email.toLowerCase()))
// pular leads com email em suppressedSet, registrando campaign_sends status 'failed', error 'suppressed'
```

- [ ] **Step 3:** Testar local com `supabase functions serve send-campaign` + campanha de teste apontando para email próprio; conferir no dashboard do Resend que as tags aparecem no email.
- [ ] **Step 4:** Commit + push.

### Task 1.3: Edge Function `resend-webhook`

**Files:**
- Create: `supabase/functions/resend-webhook/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Consumes: `campaign_sends.resend_email_id` e tags (Task 1.2); tabelas da Task 1.1.
- Produces: atualizações de `campaign_sends.status` (o trigger existente propaga para `contact_events`); inserts em `email_events` e `email_suppressions`.

- [ ] **Step 1:** Implementar com esta estrutura:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STATUS_RANK: Record<string, number> = {
  pending: 0, sent: 1, delivered: 2, opened: 3, clicked: 4,
}
const TERMINAL = new Set(['bounced', 'complained', 'failed', 'unsubscribed'])
const EVENT_TO_STATUS: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
}

async function verifySvix(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? ''
  const id = req.headers.get('svix-id') ?? ''
  const ts = req.headers.get('svix-timestamp') ?? ''
  const sigHeader = req.headers.get('svix-signature') ?? ''
  if (!secret || !id || !ts || !sigHeader) return false
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false // anti-replay 5min
  const raw = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`))
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))
  return sigHeader.split(' ').some((part) => part.split(',')[1] === expected)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const body = await req.text()
  if (!(await verifySvix(req, body))) return new Response('Invalid signature', { status: 401 })

  const svixId = req.headers.get('svix-id')!
  const evt = JSON.parse(body) // { type, created_at, data: { email_id, to, tags, bounce?, ... } }
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // 1. Dedupe (at-least-once): UNIQUE(svix_id) — conflito = já processado
  const tags = Object.fromEntries((evt.data?.tags ?? []).map((t: any) => [t.name, t.value]))
  const { error: dupErr } = await sb.from('email_events').insert({
    svix_id: svixId,
    event_type: evt.type,
    resend_email_id: evt.data?.email_id ?? null,
    campaign_id: tags.campaign_id ?? null,
    lead_id: tags.lead_id ?? null,
    payload: evt,
    occurred_at: evt.created_at,
  })
  if (dupErr?.code === '23505') return new Response('ok (duplicate)', { status: 200 })
  if (dupErr) { console.error(dupErr); return new Response('db error', { status: 500 }) }

  // 2. Resolver o send: por tags ou por resend_email_id
  let send: { id: string; status: string } | null = null
  if (tags.campaign_id && tags.lead_id) {
    const { data } = await sb.from('campaign_sends').select('id,status')
      .eq('campaign_id', tags.campaign_id).eq('lead_id', tags.lead_id).maybeSingle()
    send = data
  }
  if (!send && evt.data?.email_id) {
    const { data } = await sb.from('campaign_sends').select('id,status')
      .eq('resend_email_id', evt.data.email_id).maybeSingle()
    send = data
  }

  // 3. Máquina de estados monotônica (eventos chegam fora de ordem)
  const newStatus = EVENT_TO_STATUS[evt.type]
  if (send && newStatus) {
    const current = send.status
    const advance = TERMINAL.has(newStatus)
      ? !TERMINAL.has(current)
      : (STATUS_RANK[newStatus] ?? -1) > (STATUS_RANK[current] ?? 99)
    if (advance) {
      const patch: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'opened') patch.opened_at = evt.created_at
      if (newStatus === 'clicked') patch.clicked_at = evt.created_at
      await sb.from('campaign_sends').update(patch).eq('id', send.id)
      // trigger fn_campaign_send_event propaga para contact_events
    }
  }

  // 4. Bounce/complaint -> supressão (hard bounce e complaint sempre)
  const to = Array.isArray(evt.data?.to) ? evt.data.to[0] : evt.data?.to
  const isHardBounce = evt.type === 'email.bounced' && evt.data?.bounce?.type !== 'Transient'
  if (to && (isHardBounce || evt.type === 'email.complained')) {
    await sb.from('email_suppressions').upsert({
      email: String(to).toLowerCase(),
      reason: evt.type === 'email.complained' ? 'complaint' : 'bounce',
      source: 'resend-webhook',
      lead_id: tags.lead_id ?? null,
    }, { onConflict: 'email', ignoreDuplicates: true })
  }

  return new Response('ok', { status: 200 })
})
```

- [ ] **Step 2:** Registrar em `config.toml` (`[functions.resend-webhook]` / `verify_jwt = false`).
- [ ] **Step 3:** Teste local de assinatura: servir a function e enviar um POST com assinatura HMAC gerada manualmente (script Deno curto no scratchpad) — esperado 200; sem assinatura — esperado 401; mesmo `svix-id` duas vezes — segunda resposta `ok (duplicate)`.
- [ ] **Step 4:** Commit + push.

### Task 1.4: Stats da campanha calculados de `campaign_sends`

**Files:**
- Modify: `supabase/functions/campaigns-api/index.ts` (detalhe da campanha)
- Modify: `src/components/admin/campaigns/CampaignDetail.tsx` (se necessário, apenas ler os novos campos)

- [ ] **Step 1:** No GET de detalhe, substituir a leitura de `campaigns.stats` (opened/clicked hardcoded 0 no envio) por agregação real:

```ts
const { data: agg } = await sb.rpc('execute_readonly_query', {
  query_text: `SELECT status, count(*)::int AS n FROM campaign_sends
               WHERE campaign_id = ${/* usar quote_literal-style escape já usado no arquivo */''}
               GROUP BY status`,
})
```

Montar `{ sent, delivered, opened, clicked, bounced, complained, failed, unsubscribed }` a partir do resultado (delivered inclui opened/clicked; opened inclui clicked — somar ranks superiores).

- [ ] **Step 2:** Exibir bounce/complaint no `CampaignDetail` (badges vermelho/laranja, labels "Bounce"/"Marcou spam").
- [ ] **Step 3:** `npm run lint && npm run build`; commit + push.

**Verificação da fase (produção, após deploy):** configurar o webhook no dashboard Resend apontando para a function; enviar campanha de teste para email próprio; abrir e clicar; conferir (a) status do send evolui para `clicked`, (b) `contact_events` do lead ganha `email_opened`/`email_clicked` (aba timeline do contato), (c) evento duplicado não duplica timeline.

---

## Fase 2 — Unsubscribe (RFC 8058) + supressão

### Task 2.1: Edge Function `email-unsubscribe`

**Files:**
- Create: `supabase/functions/email-unsubscribe/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Produces: URL pública `GET/POST /email-unsubscribe?lid=<lead_id>&e=<email-b64url>&t=<hmac>`; token HMAC-SHA256 de `${lead_id}:${email}` com secret `UNSUBSCRIBE_SECRET` (novo secret). Função exportada `buildUnsubscribeUrl(leadId, email)` replicada no worker de envio (mesma lógica dos dois lados).

- [ ] **Step 1:** Implementar:
  - `verifyToken(lid, email, t)`: HMAC-SHA256 via `crypto.subtle` (mesmo padrão da Task 1.3), comparação constante.
  - `GET`: retorna página HTML mínima pt-BR (inline, sem assets) com botão "Confirmar descadastro" que faz POST para a própria URL.
  - `POST` (one-click dos provedores e do botão): valida token → upsert em `email_suppressions` (`reason: 'unsubscribe'`) → se houver send correlato (query por `lead_id` + campanha mais recente), atualiza `campaign_sends.status = 'unsubscribed'` → insere `contact_events` (`event_type: 'email_unsubscribed'`, `source_app: 'dnmarketing'`) → responde `200` com HTML "Você foi descadastrado."
  - Token inválido → `401` sem efeitos.
- [ ] **Step 2:** Registrar no `config.toml` com `verify_jwt = false`.
- [ ] **Step 3:** Teste local: GET com token válido mostra página; POST suprime (linha em `email_suppressions`); POST com token adulterado → 401.
- [ ] **Step 4:** Commit + push.

### Task 2.2: Headers e link de unsubscribe no envio

**Files:**
- Modify: `supabase/functions/send-campaign/index.ts`

- [ ] **Step 1:** Para cada destinatário, montar `unsubscribeUrl` (mesma lógica HMAC da Task 2.1, secret `UNSUBSCRIBE_SECRET`) e adicionar ao payload do Resend:

```ts
headers: {
  'List-Unsubscribe': `<${unsubscribeUrl}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
},
```

- [ ] **Step 2:** Suporte à merge tag `{{unsubscribe_url}}` no `replaceVars` (substituir pela URL por destinatário). Se o HTML não contiver a tag, **anexar rodapé automático** antes do `</body>`: `<p style="font-size:12px;color:#888;text-align:center">Não quer mais receber estes emails? <a href="{url}">Descadastre-se</a></p>`.
- [ ] **Step 3:** Enviar campanha de teste; confirmar no Gmail que a opção nativa "Cancelar inscrição" aparece e funciona (one-click POST chega na function).
- [ ] **Step 4:** Commit + push.

### Task 2.3: UI de supressão

**Files:**
- Modify: `src/components/admin/settings/SettingsPage.tsx` (nova aba ou seção "Supressão de Email")
- Create: `src/components/admin/settings/SuppressionList.tsx`

- [ ] **Step 1:** `SuppressionList`: tabela shadcn paginada lendo `email_suppressions` (client supabase — leitura admin coberta por RLS), colunas Email / Motivo (badge: bounce vermelho, complaint laranja, unsubscribe cinza, manual azul) / Origem / Data; busca por email; botão "Adicionar manualmente" (dialog com input + motivo fixo `manual`) e remoção com confirm (permitir reativar contato).
- [ ] **Step 2:** `npm run lint && npm run build`; commit + push.

**Verificação da fase:** descadastro via link e via botão nativo do Gmail suprime; próxima campanha para o mesmo email é pulada (send `failed`/`suppressed`); evento `email_unsubscribed` na timeline do lead.

---

## Fase 3 — Fila, envio em batch e agendamento

> Gerar plano detalhado próprio na execução. Contratos e decisões fixados aqui.

### Escopo e decisões

1. **Migration `email_queue`**: `CREATE EXTENSION IF NOT EXISTS pgmq; SELECT pgmq.create('email_send_queue');` + extensão `pg_cron` + `pg_net`. Secrets do cron via **Supabase Vault** (`vault.decrypted_secrets`), nunca hardcoded no `cron.schedule`.
2. **`send-campaign` vira "enfileirador"**: resolve audiência (código atual), cria `campaign_sends` status `pending` em lote, publica mensagens `{ send_id, campaign_id, lead_id }` via `pgmq.send_batch`, seta `campaigns.status='sending'` e retorna imediatamente (fim do loop síncrono e do risco de timeout — wall-clock 150s/400s).
3. **Novo worker `process-email-queue`** (Edge Function, invocada por pg_cron `* * * * *` via `net.http_post` com `WEBHOOK_SECRET` do Vault):
   - `pgmq.read('email_send_queue', 120, 100)` (visibility 120s, 100 msgs);
   - filtra supressões; renderiza variáveis + unsubscribe por destinatário;
   - envia via **`POST /emails/batch`** (até 100 emails = 1 request; respeita 10 req/s com folga);
   - grava `resend_email_id` de cada item (resposta preserva ordem), status `sent`;
   - **`pgmq.delete` só após sucesso** (nunca `pop()` — semântica at-least-once);
   - **idempotência**: antes de enviar, pula mensagens cujo `send_id` já está com status ≠ `pending` (re-entrega da fila não reenvia email);
   - falha de item: `campaign_sends.status='failed'` + `error`; falha da chamada inteira: não deleta (re-entrega após visibility);
   - quando a fila da campanha zera: `campaigns.status='sent'`, `sent_at=now()`.
4. **Agendamento**: job pg_cron `promote-scheduled-campaigns` (`* * * * *`): `UPDATE campaigns SET status='sending' WHERE status='scheduled' AND scheduled_at <= now()` + invoca `send-campaign` para cada uma (via `net.http_post`). Decisão: **não usar** o `scheduled_at` nativo do Resend (limite de 30 dias e cancelamento não re-agendável; o cron cobre todos os casos com um único mecanismo).
5. **UI**: no `CampaignWizard` passo Revisão, opção "Enviar agora / Agendar" com date-time picker (persistir `scheduled_at`, status `scheduled`); em `Campaigns`, badge de status `scheduled` com data e ação "Cancelar agendamento" (status → `draft`); barra de progresso em `CampaignDetail` (contagem `pending` vs total, polling 10s enquanto `sending`).

**Verificação da fase:** campanha de 200+ leads de teste envia completa em lotes sem timeout; agendar para +5 min dispara sozinho; cancelamento antes do horário não envia; reprocessamento da fila (matar worker no meio) não duplica emails.

---

## Fase 4 — Biblioteca de templates

> Gerar plano detalhado próprio na execução.

### Escopo e decisões

1. **Migration**: tabela `email_templates` (`id, name, description, design jsonb, html text, category text, created_at, updated_at`, RLS admin).
2. **Edge Function `templates-api`**: CRUD no padrão exato de `campaigns-api` (GET lista/detalhe, POST cria, PATCH atualiza, DELETE remove; `validateAuth`).
3. **UI**: nova rota admin `/templates` (adicionar em `App.tsx` **acima do catch-all**, lazy, e item na `AdminSidebar`): grid de cards com preview (iframe `srcDoc` do html com `pointer-events:none`), ações Editar/Duplicar/Excluir; editor em página cheia reutilizando o `EmailEditor` (Unlayer) exatamente como no `CampaignWizard` (mesmas `mergeTags` + `{{unsubscribe_url}}`, mesmo upload para bucket `email-assets`; extrair essa configuração compartilhada para `src/components/admin/campaigns/emailEditorConfig.ts` para não duplicar).
4. **Integração no `CampaignWizard`**: no passo Conteúdo (email), seletor "Começar de um template" que carrega o `design` via `loadDesign`. Botão "Salvar como template" no editor da campanha.

**Verificação da fase:** criar template, usá-lo em campanha nova, editar template não altera campanhas já criadas (cópia por valor, sem referência).

---

## Fase 5 — Segmentação avançada

> Gerar plano detalhado próprio na execução.

### Escopo e decisões

1. **Migration**: `ALTER TABLE segments ADD COLUMN logic text NOT NULL DEFAULT 'and' CHECK (logic IN ('and','or'));` + reescrever `evaluate_segment_rules`:
   - combinar condições com `AND` **ou** `OR` conforme `segments.logic`;
   - tratar `qualificacao` (mapear para `etiqueta`: hot→`hotlead`, warm→`warm`, raw→`IS NULL` — corrige o bug atual);
   - **novos campos de regra por evento de email** (EXISTS em `email_events`/`contact_events`):
     - `{field:'email_opened', operator:'is', value:'<campaign_id>'}` → abriu a campanha X;
     - `{field:'email_clicked', operator:'is', value:'<campaign_id>'}`;
     - `{field:'email_engagement', operator:'last_n_days', value:'30'}` → qualquer open/click nos últimos N dias;
     - `{field:'event_type', operator:'is', value:'<contact_events.event_type>'}` → teve o evento X (agendamento, etc.);
   - manter `quote_literal` em todo valor interpolado (padrão anti-injection já usado).
2. **UI (`SegmentFormModal`)**: persistir o `logicOperator` existente (passar a `createSegment`/`updateSegment` — corrige o bug); adicionar grupo "Eventos de email" no `FIELD_OPTIONS` com selects dependentes (campo → campanha via `useCampaigns`); atualizar o preview client-side para as novas regras (ou passar a chamar uma RPC de preview com regras ad-hoc — preferido, elimina a duplicação de lógica client/server).
3. **`segments-api`**: aceitar/retornar `logic`.

**Verificação da fase:** segmento "abriu a campanha X **ou** tem tag Y" retorna a união correta (validar com dados da Fase 1); segmento salvo com `qualificacao` retorna a mesma contagem do preview.

---

## Fase 6 — Fluxos de automação (journeys)

> A fase mais complexa — obrigatório plano detalhado próprio + brainstorming de UI antes de executar.

### Escopo e decisões

1. **Modelo (referência Dittofeed)** — grafo simples em JSONB, execução por lead como máquina de estados em Postgres:

```sql
CREATE TABLE public.journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  entry_type text NOT NULL CHECK (entry_type IN ('segment','event')),
  entry_config jsonb NOT NULL,          -- {segment_id} ou {event_type, filters}
  reentry text NOT NULL DEFAULT 'once' CHECK (reentry IN ('once','allowed')),
  nodes jsonb NOT NULL DEFAULT '[]',    -- [{id, type, config, next, next_false?}]
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.journey_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_node_id text,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','waiting','done','failed','exited')),
  wakeup_at timestamptz,                -- para delay / timeout de wait_for
  waiting_event text,                   -- para wait_for_event
  context jsonb NOT NULL DEFAULT '{}',
  entered_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE (journey_id, lead_id)          -- reentry 'once'; relaxar em iteração futura
);
CREATE INDEX idx_journey_runs_due ON public.journey_runs (state, wakeup_at);
```

2. **Tipos de nó (v1 — YAGNI):** `send_email {template_id, subject}` · `delay {minutes|hours|days}` · `wait_for_event {event_type, timeout, next_timeout}` (ex.: esperar `email_opened` 3 dias; senão ramo timeout) · `branch_attribute {field, operator, value}` (reusar semântica de regra de segmento) · `branch_segment {segment_id}` · `apply_tag {tag_id}` · `handoff_nexus {stage_id}` (reusa Edge Function existente). Sem nós de A/B, objetivos ou merge na v1.
3. **Motor** — Edge Function `journey-worker` invocada por pg_cron a cada minuto:
   - **Entrada por segmento**: para journeys `active`, leads do segmento sem run → cria run no primeiro nó;
   - **Entrada/avanço por evento**: trigger `AFTER INSERT ON contact_events` insere numa fila pgmq `journey_events`; o worker consome e (a) cria runs para journeys com `entry_type='event'` casando, (b) acorda runs em `waiting` cujo `waiting_event` casa;
   - **Runs devidos** (`state IN ('active','waiting') AND wakeup_at <= now()`): executa o nó corrente, grava próximo nó/estado. `send_email` cria um `campaign_send` avulso (campanha sintética por journey-node ou coluna `journey_node_id` em `campaign_sends` — decidir no plano da fase) e envia pela fila da Fase 3, herdando supressão/unsubscribe/tracking de graça;
   - idempotência: processar run com `UPDATE ... WHERE updated_at = <lido>` (optimistic lock) para tolerar workers concorrentes.
4. **`automations-api`**: corrigir POST para persistir `conditions`/`condition_logic` (bug atual) — tarefa independente, pode ir em qualquer fase.
5. **UI** — página `/automations` ganha aba "Fluxos": builder **vertical linear com ramos** (estilo RD Station simplificado; sem canvas livre/React Flow na v1): card de entrada (segmento ou evento) → lista de passos com botão "+" entre eles → passos de ramo renderizam duas colunas (Sim/Não, Abriu/Não abriu). Métricas por nó (quantos leads passaram) via contagem de `journey_runs.context->history`.

**Verificação da fase:** fluxo "entrou no segmento X → email A → espera 2 dias → se abriu, email B; senão, tag 'frio'" roda ponta a ponta com leads de teste; pausar journey congela runs; lead não reentra (`reentry='once'`).

---

## Deploy (obrigatório — o sync do Lovable NÃO deploya functions/migrations)

Regra: **toda tarefa que cria ou altera uma Edge Function ou uma migration termina com um prompt de deploy entregue ao usuário**, com o hash real do commit já pushado. Não acumular para o fim do plano — sem o deploy, o código está no GitHub mas não em produção, e a tarefa não pode ser considerada concluída.

Modelo (por tarefa ou por fase, conforme o agrupamento):

```
Prompt para Lovable:
---
Faça deploy das edge functions: <lista da fase>.
Aplique as migrations: <arquivos .sql da fase>.

Mudanças no código:
1. <resumo por function/migration>

O código já está no repositório GitHub (commit <hash>). Por favor, faça o deploy.
---
```

Secrets novos a criar no Supabase (Dashboard → Edge Functions → Secrets), por fase:
- Fase 0/1: `RESEND_WEBHOOK_SECRET` (copiar do dashboard do Resend ao criar o webhook).
- Fase 2: `UNSUBSCRIBE_SECRET` (string aleatória ≥ 32 chars).
- Fase 3: registrar `WEBHOOK_SECRET` também no Vault do Postgres (para o pg_cron invocar functions).

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Docs do Resend com valores divergentes de rate limit (2/5/10 req/s) | Worker lê headers `ratelimit-remaining`/`retry-after` e recua; batch de 100 mantém a folga |
| Apple Mail Privacy Protection infla opens | Automações críticas ramificam por `clicked`, não `opened`; documentar no UI do builder |
| Enum por trigger dessincronizado das migrations antigas | Na Task 1.1, ler a definição atual do trigger antes de substituir (nome exato pode diferir) |
| Payload real dos eventos variar por tipo | `email_events.payload` guarda o JSON bruto; mapeamento pode ser corrigido retroativamente |
| Campanha grande × wall-clock da function | Fila desde a Fase 3; Fases 1–2 mantêm o volume atual (já funciona em produção) |
| Tier free do Unlayer sem recurso necessário | Validar merge tags/custom blocks no tier atual durante a Fase 4, antes de aprofundar |
