# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ REGRA OBRIGATÓRIA: skill `lovable-workflow`

Este projeto é hospedado no **Lovable** com two-way sync com o GitHub. **SEMPRE invoque a skill `lovable-workflow` no início de qualquer trabalho neste repositório** — antes de qualquer commit, push, criação/alteração de Edge Function ou migration, mudança de branch, ou edição de arquivos auto-gerados. Não é opcional e não depende do usuário mencionar "Lovable".

Consequências práticas que decorrem dela (detalhadas nas seções abaixo):
- `git pull` **antes** de começar; commits pequenos; **push imediato** após cada commit (o usuário testa pela URL do Lovable — o código precisa estar lá).
- **Edge Functions e migrations NÃO são deployadas pelo sync.** Após o push, entregue ao usuário um prompt pronto para o Lovable (com o hash do commit) pedindo o deploy, ou use a CLI do Supabase.
- Nunca renomear/mover/deletar o repositório GitHub, nem deletar branches antes de voltar para `main` no Lovable — isso quebra o sync de forma difícil de reverter.
- Não editar o mesmo arquivo simultaneamente no Lovable e localmente (conflito de merge no sync).
- Não editar arquivos auto-gerados à mão: `src/integrations/supabase/types.ts`, `package-lock.json`, `.lovable/`.
- Produção é publicada pelo Lovable em `https://dnmkt.dnia.ai`. Não prometa "testei e funciona" sem ter executado de fato; o caminho de validação é `commit → push → sync → verificar na URL`.

## Commands

- `npm run dev` — Vite dev server on **port 8080** (`vite.config.ts` sets `host: "::"`, `port: 8080`).
- `npm run build` — production build. Uses Terser with `drop_console`/`drop_debugger`, so any `console.*` calls disappear in prod. The build also emits static OG HTML files per route (see "Static OG generation").
- `npm run build:dev` — production-mode build that keeps development settings (used by Lovable previews).
- `npm run lint` — ESLint flat config (`eslint.config.js`). Note: `@typescript-eslint/no-unused-vars` is **disabled**; don't bother "fixing" unused vars unless asked.
- `npm run preview` — serves the built `dist/`.

No test runner is configured.

### Lovable sync

**Invoke the `lovable-workflow` skill before doing any of this** (see the rule at the top of this file).

The repo has two-way sync with Lovable (GitHub is the source of truth; production is `https://dnmkt.dnia.ai`). Practical rules: `git pull` before starting work, small commits, push immediately after committing. Edge Functions and migrations are **not** deployed automatically by the sync — after pushing, hand the user a ready-made Lovable prompt (with the commit hash) asking for the deploy, or use the Supabase CLI.

Deploy prompt template (always include the real commit hash):

```
Prompt para Lovable:
---
Faça deploy da edge function `nome-da-funcao`.
(ou: Aplique a migration `nome-do-arquivo.sql`.)

Mudanças no código:
1. [descrever mudança]

O código já está no repositório GitHub (commit XXXXXXX). Por favor, faça o deploy.
---
```

### Supabase

`supabase/` is a full Supabase project (`config.toml` pins `project_id = "kfhojzdcnpuntynodsff"`). Use the Supabase CLI for local work:

- `supabase functions serve <name>` — run one Edge Function locally.
- `supabase db push` / `supabase migration new <name>` — manage the 75+ SQL migrations in `supabase/migrations/`.
- `supabase functions deploy <name>` — deploy a single Edge Function.

Almost every function in `config.toml` sets `verify_jwt = false` because they are called from public landing pages or server-to-server webhooks; auth, when needed, is enforced inside the function body (see `supabase/functions/_shared/auth.ts`).

**Caveat:** some newer functions (`register-conversion`, `unregister-conversion`, `update-conversion`, `contact-details`, `handoff-to-nexus`) are **not listed** in `config.toml`, so they fall back to the Supabase default `verify_jwt = true`. Since they authenticate via API key/webhook secret (not user JWTs), a missing `verify_jwt = false` entry can block callers at the gateway — check this when a new function returns 401 for valid API keys.

## Architecture

### Origin
Bootstrapped from a Lovable template (`lovable-tagger` is wired into the dev-mode Vite plugin chain). The Lovable URL in `README.md` is a placeholder; don't rely on it.

### Routing model (`src/App.tsx`)
A single `BrowserRouter` mixes two very different surfaces:

1. **Public landing pages** — Portuguese slugs like `/gratuito`, `/27abril`, `/eventoia130526`, `/ianamesa170626`, `/humanoseagentes`, `/programadeiaficacao`, `/obrigado*`, `/pesquisa`, `/oportunidade`, `/p1g`, `/v2_2425fev`. These are marketing/event funnels and are rendered **without** `AuthProvider`. They are heavy and lazy-loaded.
2. **Admin app** — everything under `/` (index, `/analytics`, `/contacts`, `/pages`, `/pages/:slug/edit`, `/import`, `/settings`, `/segments`, `/campaigns`, `/automations`). Wrapped in `<AuthProvider><ProtectedRoute><AdminLayout/>`. `AdminLayout` is the shell with sidebar; pages render inside its `<Outlet/>`.

`Index` and `ProgramaIaficacao` are statically imported (FCP); everything else uses `React.lazy` + a shared skeleton `PageLoader`. When adding a route, place it **above** the catch-all `<Route path="*" element={<NotFound />} />`.

**Stale-chunk recovery:** `src/main.tsx` listens for "Failed to fetch dynamically imported module" errors and reloads the page once (guarded by `sessionStorage`); a few lazy imports also carry a `.catch(() => import(...))` retry. Keep both patterns when touching lazy loading.

Legacy redirects to preserve: `/eventovip → /eventoia`, `/05Maio → /05maio`, `/leads → /contacts`, `/adnia* → /`.

### Frontend stack
- React 18 + TypeScript, Vite with `@vitejs/plugin-react-swc`.
- shadcn/ui (`components.json`) lives in `src/components/ui` — generated components, prefer composing them over editing.
- Tailwind CSS + `tailwindcss-animate` + `@tailwindcss/typography`.
- `@tanstack/react-query` (one `QueryClient` in `App.tsx`) for server state; per-domain wrappers live as `useX` hooks in `src/hooks` (e.g. `useLeads`, `useCampaigns`, `useAutomationRules`, `useAdminData`, `useDashboardFilters`, `useAgendamentos`).
- SEO: `react-helmet-async` (`HelmetProvider` in `main.tsx`); landing pages set their own Helmet tags and call `useClarity("<slug>")` for per-page Microsoft Clarity tracking.
- Toaster: `sonner` via `@/components/ui/sonner`.
- Forms: `react-hook-form` + `zod` + `@hookform/resolvers`.
- Path alias `@/*` → `src/*` (configured in both `vite.config.ts` and `tsconfig.json`).

### Build splitting
`vite.config.ts` declares `manualChunks` for `vendor-react`, `vendor-router`, `vendor-query`, `vendor-supabase`, `vendor-ui`. Adding new heavy deps that should ship separately means extending this map.

### Static OG generation
Social crawlers (WhatsApp/LinkedIn/Facebook) don't run React, so per-route OG tags are baked at build time:

- `scripts/og-routes.ts` — single source of truth: `SITE_ORIGIN` and the `OG_ROUTES` array (path, title, description, image under `public/og/`).
- `scripts/vite-plugin-route-og.ts` — build-only Vite plugin (`closeBundle`): for each `OG_ROUTES` entry it rewrites `dist/index.html`'s title/description/canonical/OG/Twitter tags and emits both `dist/<slug>.html` and `dist/<slug>/index.html`.

To give a new landing page correct link previews: add an entry to `OG_ROUTES` (and keep the page's Helmet tags in sync).

### Landing page pattern (`/humanoseagentes` as reference)
Each big landing gets its own folder under `src/components/landing/<slug>/` with section components, an optional page-scoped stylesheet (e.g. `humanoseagentes.css`, fully scoped under a root class like `.ha-root`), and small local hooks (`useReveal` = IntersectionObserver reveal animations). Lead capture happens in a multi-step modal (`DiagnosticoModalHumanos`) that composes the standard funnel libs: `captureLead` → `registerConversion` → Meta Pixel/CAPI dedup events → `resolveIdentityForLead` → qualification via `etiqueta` (DB trigger scores server-side) → on qualification: status update, `resolve_or_create_identity` RPC, `contact_events` insert, `automationEngine`, and `handoff-to-nexus`; qualified leads see a Nexus/Cal.com scheduling embed whose `postMessage` booking event fires a Meta `Agendamento` conversion.

### Supabase integration on the client
- `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts` are **auto-generated** ("Do not edit it directly"). Regenerate `types.ts` via `supabase gen types typescript` rather than hand-editing.
- Client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from env. Session is persisted in `localStorage` with auto-refresh.
- **Do not write to the `leads` table directly from the browser.** `src/lib/leadCapture.ts` documents that public client-side SELECT/UPDATE was deliberately removed; all lead writes go through the `lead-capture` Edge Function. The same pattern applies to other domain mutations (see the matching `*-api` Edge Functions: `campaigns-api`, `segments-api`, `automations-api`, `analytics-api`, `pages-api`, `contact-update`, etc.).

### Data model (core tables)
- **`leads`** — dnMarketing lead: contact info, `phone_normalized`, qualification fields (cargo/empresa/faturamento/funcionarios/desafios), `etiqueta` + `lead_score` (scored server-side by DB trigger), status, source/UTMs, `dnia_id`, `last_conversion_date`.
- **`ecosystem_identities`** — cross-app identity keyed by `dnia_id`; links `dndash_lead_id`, `nexus_contact_id`, `mentoria_client_id`; holds `stage`, first-touch, `last_seen_at`.
- **`contact_events`** — unified lifecycle timeline (`dnia_id`, `lead_id`, `source_app`, `event_type`, `occurred_at`, `metadata` jsonb). Base for analytics, status history, and the admin "Agendamentos" metrics.
- **`lead_conversions`** — one row per landing-page conversion (`lead_id`, tipo, `page_slug`, `session_id`, UTMs, `source`, `converted_at`). `session_id` is the correlation key external systems use to update/revert conversions.
- Key RPCs: `resolve_or_create_identity`, `normalize_phone_br`, `merge_identities`, `execute_readonly_query` (SECURITY DEFINER, SELECT/WITH only — powers dynamic SQL in `analytics-api`/`contacts-list`).

### Domain logic in `src/lib`
Pure(-ish) modules that the hooks/pages compose on top of:
- `leadCapture.ts` — invokes `lead-capture` function (upsert/update_only by email).
- `leadConversion.ts` — `registerConversion()` is the single client-side conversion entry point: inserts into `lead_conversions`, bumps `leads.last_conversion_date`, and fire-and-forgets `apply-lead-tag` with a tag derived from the page slug.
- `leadScoring.ts` — scoring criteria + thresholds (`hotlead`, `warm`), shared with `recalculate-all-scores`.
- `leadAnalytics` (hook), `useLeadQualification` — status/qualification pipeline.
- `automationEngine.ts` — evaluates `AutomationRule` records (conditions with `and`/`or` logic, action types).
- `metaCapi.ts` + `metaTracking.ts` — Meta Conversions API integration. Reads `_fbc`/`_fbp` cookies and forwards via the `send-to-meta-capi` Edge Function; events are deduplicated Pixel↔CAPI by `event_id`.
- `utm.ts`, `resolveIdentity.ts` — visitor identity + UTM stitching (paired with `identity-lookup` / `identity-upsert` functions).
- `emailValidation.ts` + `disposableEmailDomains.ts` + `nameValidation.ts` — input hygiene before capture.

### Edge Functions (`supabase/functions/`)
Auth model: functions share `_shared/auth.ts` — `validateAuth(req, sb, 'read'|'write')` accepts `Authorization: Bearer <token>` where the token is either the `WEBHOOK_SECRET` or an API key from the `api_keys` table (SHA-256 hash lookup, scoped permissions). No Supabase user JWTs; every function uses the service-role client (bypasses RLS).

Grouped by purpose (all share `_shared/auth.ts`, `_shared/pingback.ts`):
- **Capture / identity**: `lead-capture`, `identity-lookup`, `identity-upsert`, `merge-identities`, `receive-contact-event`, `validate-email-domain`. `identity-upsert` and `receive-contact-event` both **auto-create leads** when the identity has no `dndash_lead_id` and enrich qualification fields **non-destructively** (only fill null/empty — never overwrite).
- **Conversions (external callers, keyed by `session_id`)**: `register-conversion` (multi-strategy lead resolution: lead_id → dnia_id → email → normalized phone → ecosystem fallback), `update-conversion` (fix `converted_at`), `unregister-conversion` (revert; recalcs `last_conversion_date`, audits to `contact_events`).
- **Domain APIs (admin CRUD)**: `contacts-list` (dynamic SQL, offset **or** keyset-cursor pagination, `status_changed_after` filter), `contact-details` (360° view: lead + tags + notes + events timeline + conversions + campaign sends + inferred status history), `contact-update`, `contact-status-update`, `contact-tags-sync`, `apply-lead-tag`, `delete-contact`, `segments-api`, `campaigns-api`, `automations-api`, `pages-api`, `analytics-api` (report types: overview, leads, sources, pages, `daily`, `funnel`, `events` — the last three build timezone-aware SQL executed via `execute_readonly_query`).
- **AI**: `ai-data-analyst`, `analyze-leads`, `analyze-challenges`.
- **User admin**: `create-user`, `delete-user`, `list-users`, `update-user-email`, `update-user-role`, `reset-user-password`.
- **Outbound integrations**: `send-to-meta-capi`, `send-to-ticketia`, `handoff-to-nexus` (modes: `direct_stage` / `manual` / rule-based; sets Nexus source to "Tráfego pago" iff any UTM is present, ignoring the body's `source`), `get-nexus-stages`, `send-campaign`, and the four `send-to-pingback*` variants.
- **Batch**: `import-leads-csv`, `recalculate-all-scores`.

### Admin UI layout
`src/components/admin/` is the admin app:
- `AdminLayout.tsx` + `AdminSidebar.tsx` — shell.
- `ProtectedRoute.tsx` — gates everything behind `useAuth().isAdmin`.
- Subfolders per page: `contacts/`, `campaigns/`, `segments/`, `automations/`, `pages/`, `dashboard/` (which further splits into `overview`, `tactical`, `operational`, `insights`, `challenges`, `profile`), `settings/`.
- Contacts export (`contacts/ContactsExport.tsx`) is client-side CSV: `;` separator, escaped quotes, BOM `﻿` for Excel pt-BR, honoring the visible-columns config from `ColumnSelector`.

### Admin data conventions
- **Timezone**: all date math uses `BRASILIA_TIMEZONE = 'America/Sao_Paulo'` (exported from `src/hooks/useLeadAnalytics.tsx`); compare days as `yyyy-MM-dd` strings via `formatInTimeZone`, not as `Date` objects.
- **Pagination**: Supabase queries that may exceed 1000 rows loop `.range()` in pages of 1000 (cap ~20000) — see `useAgendamentos`, `useLeadConversionUtmContents`, `useContactsEnriched`.
- **Polling, not realtime**: event hooks refetch on a 60s `setInterval` with a `cancelled` cleanup flag.
- `useAdminData` (`AdminDataProvider`) is the single source for enriched leads + filters; it injects `all_utm_contents` (full conversion history from `lead_conversions`) so the UTM Content filter matches any historical conversion, not just the lead's latest.
- `useDashboardFilters` persists to localStorage under `dashboard-filters-v2`; relative presets are recomputed on load. The pure `applyFilters` is the single filtering engine (date filter passes if `created_at` **or** `last_conversion_date` is in range; qualification reads `leads.etiqueta` from the DB, not client-side scoring; `onlyReconversions` = conversion >60s after creation).
- "Agendamentos" is two different metrics: per-period counts distinct leads with scheduling events in `contact_events`; "today" counts leads that *transitioned* into status `MQL - Reunião agendada` (via `contact_updated` events).

### Auth flow (`src/hooks/useAuth.tsx`)
Standard Supabase pattern with one subtle bit worth preserving: the admin-role check is deferred with `setTimeout(..., 0)` inside `onAuthStateChange` to avoid a deadlock against the Supabase client's internal state lock. Don't inline it.

### Public API spec
`public/api/dnmarketing-api.yaml` (+ `public/api/docs/`) is served as a static OpenAPI spec for the public-facing endpoints — keep it in sync when changing the corresponding Edge Functions (it already documents the conversion trio and the new analytics report types).
