# Deploys do módulo A/B (CLI + Lovable)

Edge Functions e migrations **não** sobem pelo sync Lovable ⇄ GitHub. Aplique na
ordem abaixo. Cada item traz o comando da **CLI do Supabase** (para testar já na
branch `feat/ab-testing-v1`) e o **prompt para o Lovable** (para usar após o merge
na `main`). Sempre com o hash do commit real.

> Ordem recomendada: migrations primeiro (schema), depois functions.

---

## Migrations (em ordem)

```bash
supabase db push
```

1. `20260717120000_ab_testing_core.sql` — tabelas `ab_tests`, `ab_assignments`,
   `ab_events`, `ab_identities` (RLS admin-only).
2. `20260717123000_ab_columns_lead_conversions.sql` — colunas `ab_test`/`ab_var`/
   `ab_vid` (nullable) em `lead_conversions` e `leads`.
3. `20260723120000_ab_config.sql` — tabela single-row `ab_config`
   (`production_domain`), guardrail de cross-domain.
4. `20260824120000_ab_public_slug_reuse.sql` — slug de URL reutilizável:
   colunas `public_slug` (backfill = `slug`) e `winner_variant` em `ab_tests`,
   índice único parcial `uq_ab_tests_public_slug_running` (1 teste `running` por
   slug) e RPC `ab_activate_test(p_test_id, p_force)` para ativação atômica.

Prompt Lovable (pós-merge):
```
Aplique as migrations do módulo de Teste A/B (ab_testing_core e
ab_columns_lead_conversions). Código no GitHub (commit <HASH>). Faça o deploy.
```

> **Ordem obrigatória para o reuso de slug:** a migration
> `ab_public_slug_reuse` tem de ser aplicada **antes** do deploy da function
> `go` nova. Ela é retrocompatível com a `go` em produção (só adiciona colunas,
> índices e função), e o backfill `public_slug = slug` garante que todos os
> links já publicados continuam resolvendo. Na ordem inversa, a `go` nova
> consultaria uma coluna inexistente e **todo clique cairia no fallback**.

---

## Edge Functions

```bash
supabase functions deploy go
supabase functions deploy ab-events
supabase functions deploy identity-upsert
supabase functions deploy receive-contact-event
```

- **`go`** (nova) — redirecionador. Requer `[functions.go] verify_jwt=false`
  (já no config.toml). Secret opcional `AB_FALLBACK_URL` (default `https://dnia.ai`).
- **`ab-events`** (nova) — coletor. `verify_jwt=false` (já no config.toml).
- **`identity-upsert`** (alterada) — passa a costurar `ab_vid` em `ab_identities`.
- **`receive-contact-event`** (alterada) — costura `ab_vid` + registra conversão
  `agendamento` em `ab_events` quando o Nexus reporta `meeting_scheduled`.

Prompt Lovable (pós-merge):
```
Faça deploy das edge functions `go`, `ab-events`, `identity-upsert` e
`receive-contact-event` do módulo de Teste A/B. Código no GitHub (commit <HASH>).
```

### Redeploy da `go` — reuso de slug

A `go` passou a resolver por `public_slug` (prioriza o teste `running`; sem
running, serve `winner_variant ?? control` do teste mais recente da slug).
Aplique a migration `ab_public_slug_reuse` **antes**.

```bash
supabase functions deploy go
```

```
Faça deploy da edge function `go` (resolução por public_slug com fallback para a
variante vencedora). Código no GitHub (commit <HASH>). A migration
20260824120000_ab_public_slug_reuse já deve estar aplicada.
```

---

## Fora do repositório (você aplica)

- **Cloudflare Worker `ab-router`** + **Custom Domain `go.dnia.ai`**
  (ver `cloudflare-worker.js` e `README.md`). *(Já aplicado.)*
- **Cloudflare Rate Limiting Rule** para `go.dnia.ai/e`.
- **Snippet `ab.js`** colado nas landing pages do `dnia.ai` (ver `snippet-install.md`).
- **Mudanças no Nexus** (outra base de código) — ver `nexus-spec.md`.
