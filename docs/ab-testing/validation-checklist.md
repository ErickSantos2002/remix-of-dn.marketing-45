# Checklist de validação — Teste A/B v1

Roteiro para colocar o v1 no ar e validar de ponta a ponta. Ordem importa
(schema → functions → borda → snippet → teste real).

## 1. Deploys (na ordem) — ver `deploys.md` para os prompts

- [ ] `supabase db push` — migrations `ab_testing_core` e `ab_columns_lead_conversions`.
- [ ] `supabase functions deploy go`
- [ ] `supabase functions deploy ab-events`
- [ ] `supabase functions deploy identity-upsert` (alterada)
- [ ] `supabase functions deploy receive-contact-event` (alterada)
- [ ] `supabase functions deploy lead-capture` (alterada — novos ALLOWED_FIELDS)
- [ ] (opcional) secret `AB_FALLBACK_URL` na função `go` (default `https://dnia.ai`).

## 2. Cloudflare (fora do repo)

- [x] Worker `ab-router` criado com `cloudflare-worker.js` (Opção A).
- [x] **Custom Domain `go.dnia.ai`** ligado ao worker (`go.dnia.ai/{slug}` +
  `go.dnia.ai/e`). *(Route em `dnmkt.dnia.ai` não funciona — orange-to-orange.)*
- [ ] Rate Limiting Rule para `go.dnia.ai/e`.

## 3. Snippet nas LPs do `dnia.ai` (projeto separado)

- [ ] `<script src="https://dnmkt.dnia.ai/ab.js" async></script>` em cada LP do teste.
- [ ] Todas as variantes usam o MESMO agendador (`uuid`).

## 4. Smoke tests por passo

**Passo 1 — redirecionador.** Crie um teste demo (SQL) e valide:
```sql
insert into ab_tests (slug, name, status, control_variant, variants) values
('teste-demo','Teste demo','running','A',
 '[{"key":"A","url":"https://dnia.ai/humanoseagentes","weight":50},
   {"key":"B","url":"https://dnia.ai/programadeiaficacao","weight":50}]'::jsonb);
```
- [ ] `curl -sI "https://go.dnia.ai/teste-demo?utm_source=meta&fbclid=abc"` →
  `302`, `location` com `ab_test/ab_var/ab_vid` + UTMs, `x-robots-tag: noindex`,
  `set-cookie` com `Domain=.dnia.ai`.
- [ ] **Stickiness:** repetir 5x com o mesmo cookie → mesma variante.
- [ ] **Distribuição:** ~20 chamadas sem cookie → ~50/50.
- [ ] **Kill-switch:** `update ab_tests set status='paused'` → 100% controle.
- [ ] **Slug inexistente:** `go.dnia.ai/nao-existe` → `302` para `https://dnia.ai`. ✅ (validado)
- [ ] `select raw_query, utm_source, device_type from ab_assignments` → origem gravada.

**Passo 2 — coletor.**
- [ ] `POST https://go.dnia.ai/e` com um `exposure` → `{"accepted":1}`; repetir → não duplica. ✅ (validado)

**Passo 3 — ab.js.** Numa LP com o snippet, entrando via `/go/teste-demo`:
- [ ] cookie `.dnia.ai` gravado; `select * from ab_events where event_type='exposure'`.
- [ ] scroll/CTA/tempo geram eventos `behavior`.
- [ ] `<form>` recebe inputs ocultos `ab_vid/ab_var/ab_test`.
- [ ] iframe `nexus.dnia.ai/schedule` tem `?ab_vid=...&ab_test=...&ab_var=...` no `src`.

**Passo 4 — conversão lead.**
- [ ] Submeter o form → `select ab_test, ab_var, ab_vid from lead_conversions order by converted_at desc limit 1` preenchido; idem em `leads`.
- [ ] `select * from ab_events where event_type='conversion' and event_name='lead_criado'`.

**Passo 5 — agendamento (depende do Nexus).**
- [ ] Após a mudança no Nexus (ver `nexus-spec.md`): etapa 1 → `ab_identities`;
  etapas 2–3 → `schedule_step`; confirmação → `conversion event_name='agendamento'`.
- [ ] Fallback: agendamento sem `ab_vid` casa por email/whatsapp em `ab_identities`.

**Passo 6 — UI.**
- [ ] `/experiments` lista, cria (com amostra/duração), copia link, pausa/ativa.
- [ ] `/experiments/:id` mostra exposições únicas, taxa, P(melhor), guardrail
  (vermelho se pior), funil, selo PRELIMINAR, filtros e export CSV.

**Reuso de slug (migration `ab_public_slug_reuse` + redeploy da `go`).**
- [ ] `SELECT slug, public_slug, status FROM ab_tests;` — backfill 1:1 nas linhas antigas.
- [ ] Tentar um 2º `running` na mesma `public_slug` via SQL → rejeitado pelo
  índice `uq_ab_tests_public_slug_running`.
- [ ] Link antigo (criado antes da migration) continua resolvendo normalmente.
- [ ] `curl -sI "https://go.dnia.ai/{public_slug}"` com teste `running` → 302 com
  `ab_test={slug interno}`; repetindo com o cookie `ab_{slug interno}` devolvido
  → mesma variante (sticky).
- [ ] Após **Concluir** com vencedora B → 302 sempre para B, sem sorteio.
- [ ] `/experiments`: criar teste com slug editada; criar um 2º na mesma slug
  (aviso aparece); ativar o 1º; ativar o 2º → diálogo → "Finalizar atual e ativar
  este" → 1º fica `Concluído`, 2º `Rodando`.
- [ ] Relatórios dos dois testes da mesma slug mostram eventos disjuntos.
- [ ] Lead numa LP após o redirect grava `ab_events.ab_test` = slug interno do
  teste novo.

## 5. Teste A/A (sanidade antes de confiar em A/B)

Antes do primeiro A/B real, rode um **A/A**: duas variantes apontando para a
**mesma** URL, pesos 50/50.
- [ ] Distribuição observada ~50/50 (sem SRM grosseiro).
- [ ] Nenhuma variante "vence" de forma persistente (P(melhor) oscila ~50%).
- [ ] Exposições, conversões e cookies consistentes entre as duas.

Se o A/A acusar desequilíbrio forte ou um "vencedor" claro, há viés na coleta —
investigar antes de rodar A/B.

## 6. Pendentes FORA do repositório

- **Cloudflare:** Worker `ab-router` + Custom Domain `go.dnia.ai` ✅ (feito) + Rate Limiting Rule (pendente).
- **Supabase:** deploy das 6 functions + 2 migrations (não sobem pelo sync Lovable).
- **`dnia.ai` (projeto separado):** colar o snippet `ab.js` nas LPs.
- **Nexus (outra base de código):** implementar `nexus-spec.md` (ler `ab_*` da URL,
  upsert com `ab_vid` na etapa 1, `schedule_step` nas etapas 2–3, `ab_vid` na
  confirmação, idempotência, não-bloqueio). O loop de agendamento só fecha depois disso.
- **types.ts:** regenerar (`supabase gen types typescript`) após as migrations para
  tipar as tabelas/colunas `ab_*` (hoje acessadas via cliente destipado).
