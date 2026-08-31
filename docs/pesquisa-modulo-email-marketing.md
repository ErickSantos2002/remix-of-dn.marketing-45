# Pesquisa: Módulo de Email Marketing (Resend)

> Base de conhecimento para o plano de implementação. Consolidada em 2026-07-13 a partir de:
> (a) mapeamento do código existente neste repositório; (b) deep research multi-agente com
> verificação adversarial (23 alegações confirmadas, 2 refutadas, 22 fontes); (c) consultas
> complementares às docs oficiais do Resend.

## 1. Sumário executivo

O módulo **não parte do zero**. O app já envia email via Resend (`send-campaign`), já tem editor
drag-and-drop (Unlayer/`react-email-editor` no `CampaignWizard`), segmentos dinâmicos com builder
visual, e um banco **já preparado para tracking** (enum de status em `campaign_sends` +
trigger que gera `email_opened`/`email_clicked` em `contact_events`). O trabalho real é:

1. **Webhook Resend → `contact_events`** (a peça que destrava o tracking inteiro).
2. **Fila + agendamento** (pgmq + pg_cron + worker com batch API) — hoje o envio é loop síncrono 1-a-1.
3. **Unsubscribe/supressão** — inexistente hoje; é requisito de compliance e de sobrevivência da conta Resend.
4. **Templates reutilizáveis** (biblioteca, além do design por-campanha).
5. **Segmentação por eventos** (ex.: "abriu email X") — a RPC atual só filtra atributos de `leads` e só com AND.
6. **Motor de automação/journey** — o `automationEngine` atual só faz handoff ao Nexus; precisa de redesign para fluxos com espera/ramificação.
7. **Tela de configuração do Resend** — seguir o padrão `NexusCard` (Secrets + teste de conexão).

## 2. O que já existe no app

### Envio (`supabase/functions/send-campaign`)
- Já usa `POST https://api.resend.com/emails` com `RESEND_API_KEY` e `EMAIL_FROM` (default `DN.IA <noreply@dnia.ai>`); canal WhatsApp via Z-API.
- Resolve audiência: sem segmento → todos os leads (limit 5000); segmento `dynamic` → RPC `evaluate_segment_rules`; `static` → `segment_contacts`.
- Personalização limitada a `{{nome}}`, `{{email}}`, `{{empresa}}`.
- Registra em `campaign_sends`, atualiza `campaigns.stats`.
- **Limitações**: loop síncrono sem batch/rate-limit; ignora `scheduled_at`; nunca grava status além de `sent`/`failed`; `stats.opened/clicked` hardcoded 0; não filtra opt-outs.

### Banco (pronto para receber tracking)
- `campaigns`: `status ∈ draft/scheduled/sending/sent/paused/failed` (trigger), `scheduled_at`, `stats` JSONB, `design` JSONB (Unlayer), `body` (HTML).
- `campaign_sends`: `status ∈ pending/sent/delivered/opened/clicked/failed/unsubscribed`, `opened_at`, `clicked_at`, `dnia_id`. **Trigger `fn_campaign_send_event`** já insere `email_sent`/`email_opened`/`email_clicked` em `contact_events` quando o status muda — o webhook só precisa atualizar `campaign_sends`.
- `segments` (`type static|dynamic`, `rules` JSONB `[{field, operator, value}]`) + `segment_contacts`.
- `automation_rules`: `conditions` JSONB + `condition_logic and/or`; `action_type ∈ create_in_nexus/move_stage_nexus/block_nexus` (só Nexus).
- `contact_events`: timeline unificada (`dnia_id`, `lead_id`, `source_app`, `event_type`, `metadata`, `occurred_at`).

### Bugs/inconsistências conhecidos (corrigir no caminho)
- RPC `evaluate_segment_rules` só combina regras com **AND**; o toggle AND/OR da UI nunca é persistido.
- Campo `qualificacao` existe na UI de segmentos mas a RPC não o trata (audiência errada em segmento salvo).
- `automations-api` POST não persiste `conditions`/`condition_logic` (só o PATCH).
- Enum `unsubscribed` e badge "Descadastrado" existem, mas nada os popula.

### Editor (já em produção)
- `CampaignWizard.tsx` usa `react-email-editor` (Unlayer): tema dark, pt-BR, mergeTags (nome/empresa/email), upload para bucket `email-assets`, `BASE_DESIGN` inicial. Salva **HTML em `campaigns.body`** e **design JSON em `campaigns.design`** (padrão JSON-no-banco/HTML-no-envio já estabelecido).

### Padrão de configuração de integrações
- Secrets de Edge Function (`Deno.env.get`), **não** tabela de settings. UI só testa conexão e guarda status em `localStorage` (`NexusCard` é o molde para o futuro `ResendCard`). `RESEND_API_KEY`/`EMAIL_FROM` já existem como secrets, sem tela.

## 3. Resend — capacidades verificadas (alta confiança, fontes primárias)

### Envio e limites
- Rate limit padrão: **10 req/s por team** (elevável via suporte). **Batch API: até 100 emails por chamada, contando como 1 request** → teto teórico ~1.000 emails/s; máx. 50 destinatários por email do batch; quotas diárias/mensais do plano também se aplicam. Fazer throttling adaptativo pelos headers `ratelimit-*`/`retry-after`. ⚠️ Docs já mostraram valores divergentes (2 vs 5 vs 10 req/s) — revalidar na implementação. [quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits) · [rate-limit](https://resend.com/docs/api-reference/rate-limit)

### Reputação (requisito operacional, não opcional)
- **Bounce < 4% e spam/complaint < 0,08%**; exceder pode pausar ou **encerrar a conta sem aviso**. Processar `email.bounced`/`email.complained` via webhook e alimentar lista de supressão própria é obrigatório. [quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits) · [AUP](https://resend.com/legal/acceptable-use)

### Agendamento nativo
- `scheduled_at` aceita natural language ou ISO 8601; **máx. 30 dias** de antecedência; cancelável via `POST /emails/{id}/cancel`; re-agendável via `emails.update` enquanto agendado, **mas cancelado não pode ser re-agendado**. Implicação: até 30 dias pode-se delegar ao Resend (guardando `email_id` para cancelamento); além disso, agendador próprio (pg_cron + fila). [schedule](https://resend.com/docs/dashboard/emails/schedule-email) · [cancel](https://resend.com/docs/api-reference/emails/cancel-email)

### Webhooks (via Svix) — semântica que o endpoint deve respeitar
- **At-least-once**: duplicatas possíveis → dedupe pelo header `svix-id` (estável entre retries), armazenando ids processados.
- **Sem garantia de ordem**: `email.opened` pode chegar antes de `email.delivered` → ordenar por `created_at` do payload; nunca assumir sent→delivered→opened (usar máquina de estados monotônica ao atualizar `campaign_sends.status`).
- **Retries em schedule fixo**: 5s, 5min, 30min, 2h, 5h, 10h após não-2xx (a alegação de "backoff exponencial ~24h" foi **refutada**).
- **Assinatura obrigatória**: verificar HMAC-SHA256 de `${svix_id}.${svix_timestamp}.${body}` com o secret `whsec_` (headers `svix-id`, `svix-timestamp`, `svix-signature`) — o endpoint será público (`verify_jwt = false`), sem verificação qualquer um forja eventos.
- **Payload**: `type`, `created_at`, `data` com `email_id`, `message_id`, `from`, `to`, `subject`, `template_id`, `bounce` (contextual) e **`tags`**. Correlação recomendada: enviar com `tags: {campaign_id, lead_id}` e/ou persistir o `email_id` retornado pela API no message log. [webhooks](https://resend.com/docs/webhooks/introduction)

### Tipos de evento (lista oficial completa, 2026)
**Email (11)**: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, `email.failed`, `email.scheduled`, `email.received`, `email.suppressed`.
**Domain (3)**: `domain.created/updated/deleted`. **Contact (3)**: `contact.created/updated/deleted`.
(A lista "seis eventos" que circula em tutoriais foi refutada na verificação — modelar o enum com a lista acima.) [event-types](https://resend.com/docs/dashboard/webhooks/event-types)

### Unsubscribe
- Para lista própria: adicionar via parâmetro `headers` do send: `List-Unsubscribe: <https://.../unsubscribe?...>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058). O endpoint deve responder POST com 200/202, servir página via GET, e **cessar envios em até 48h**. **Gmail/Yahoo exigem RFC 8058 de bulk senders (>5.000 msgs/dia)**. [unsubscribe](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails) · [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058)
- Alternativa: Audiences/Broadcasts nativos do Resend gerenciam preferências automaticamente — mas duplicaria a lista (leads já vivem no Postgres); recomendação: **lista própria + headers**, mantendo `leads`/supressão como fonte da verdade.

## 4. Editor drag-and-drop — recomendação

**Manter `react-email-editor` (Unlayer)** — já em produção no app, wrapper MIT ativamente mantido (v2.0.0 de jul/2026), `exportHtml`/`saveDesign`/`loadDesign` cobrem o fluxo templates (JSON no banco, HTML no envio). ⚠️ O MIT cobre só o wrapper; o engine carregado em runtime é SaaS proprietário da Unlayer com tiers free/pagos — validar se os recursos necessários (merge tags avançadas, custom blocks) cabem no tier free.

Alternativas avaliadas (não recomendadas como primeira opção):
- **EmailBuilder.js** (usewaypoint): MIT genuíno, JSON+HTML server-side (`renderToStaticMarkup`), mas manutenção estagnada (~v0.0.9, issues sem resposta) e compatibilidade Outlook contestada.
- **easy-email-editor** (zalify): MIT sobre MJML, mas a versão free **só suporta Chrome** (cross-browser é exclusivo do Pro pago); bug de Firefox aberto desde 2022.

## 5. Fila e agendamento no Supabase

- **Supabase Queues (pgmq)**: fila durável Postgres-nativa, sem infra extra. Semântica: "exactly-once dentro da janela de visibilidade" = **efetivamente at-least-once** (mensagem não deletada/arquivada volta a ficar visível). Regras para o worker:
  - `read()` + `delete/archive` explícito **após** sucesso no Resend — nunca `pop()` (at-most-once, perde envios silenciosamente).
  - **Chave de idempotência** por envio (ex.: UNIQUE `(campaign_id, lead_id)` no message log) para não duplicar email em re-entrega.
  - Throttling para os 10 req/s (usar batch API: 100 emails/request).
- **Edge Functions**: wall-clock **150s (free) / 400s (pago)** por invocação — campanha grande precisa ser drenada em múltiplas invocações do worker (pg_cron a cada minuto → worker lê N mensagens da fila → envia em batches → deleta).
- **Arquitetura de referência oficial Supabase**: pg_cron (agendador) + pgmq (fila) + Edge Function (worker). O scheduler do pg_cron também promove campanhas `scheduled` → enfileira quando `scheduled_at <= now()` (cobrindo o caso >30 dias sem depender do Resend).

## 6. Desenho recomendado (síntese para o plano)

### Webhook → contact_events
```
Edge Function resend-webhook (verify_jwt=false, verificação Svix obrigatória)
  1. Verifica assinatura Svix; 401 se inválida.
  2. Dedupe por svix-id (tabela processed_webhooks ou UNIQUE no event log).
  3. Resolve send: por tags.campaign_id+tags.lead_id ou por email_id no message log.
  4. Atualiza campaign_sends.status com máquina de estados MONOTÔNICA
     (pending < sent < delivered < opened < clicked; bounced/complained/failed terminais)
     → trigger fn_campaign_send_event já propaga para contact_events.
  5. Eventos sem send correspondente (transacionais futuros): inserir contact_event direto.
  6. bounced/complained → INSERT na tabela de supressão + (bounce hard) marcar lead.
  7. Responde 2xx rápido (processamento pesado → fila).
```

### Novas tabelas (mínimo)
- `email_templates` (name, design JSONB, html, thumbnail, category, timestamps) — biblioteca reutilizável.
- `email_suppressions` (email UNIQUE, reason: bounce|complaint|unsubscribe|manual, source, created_at) — **consultada em todo envio**.
- `email_events` (message log detalhado: send_id, resend_email_id, event_type, payload JSONB, svix_id UNIQUE, occurred_at) — auditoria + dedupe + base para segmentação por evento.
- Fila pgmq (`email_send_queue`) + `unsubscribe_tokens` (ou token assinado HMAC no link).

### Automação/journeys (item que exige mais design no plano)
- Modelo de referência (Dittofeed): journey = grafo com nós **Entry** (critério de entrada: segmento ou evento), **Delay**, **Wait-For** (espera evento com timeout), **Segment/Attribute Split** (ramo condicional), **Message** (enviar email). Execução por lead = linha de estado (`journey_id`, `lead_id`, `current_node`, `wakeup_at`, `status`) processada por pg_cron — máquina de estados em Postgres, sem engine externa.
- O `automationEngine.ts` atual (client-side, ação única, sem espera) não serve de base para journeys — manter para handoff Nexus e criar o motor novo server-side; adicionar ação `send_email` é o ponto de contato entre os dois.

### Segmentação por eventos de email
- Estender `evaluate_segment_rules` (ou nova RPC) com regras sobre `contact_events`/`email_events` (ex.: `opened campaign X`, `clicked link in last N days`), e corrigir AND/OR + `qualificacao` no caminho.

### Tela de configuração Resend
- `ResendCard` no padrão `NexusCard`: status dos secrets (`RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_WEBHOOK_SECRET`), botão "testar conexão" (ex.: `GET /domains`), exibição dos domínios verificados e do remetente padrão, instruções de configuração do webhook no dashboard do Resend.

## 7. Lacunas restantes (pesquisar durante o plano/implementação)

- Campos exatos do `data` por tipo de evento (a página de event-types não detalha) — confirmar payload real por tipo antes de fechar o schema de `email_events`.
- Preços/tiers do Resend e API de suppression list/domínios (não sobreviveram à verificação) — checar limites do plano contratado.
- Apple Mail Privacy Protection infla opens (prefetch) — tratar open como sinal fraco vs click; não usar open sozinho para automações críticas.
- LGPD: base legal para email marketing (consentimento/legítimo interesse), registro de opt-in — validar com o processo comercial.
- Tier Unlayer free vs recursos necessários (merge tags condicionais, custom tools).

## 8. Fontes principais

Resend: [quotas/limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits) · [rate limit](https://resend.com/docs/api-reference/rate-limit) · [schedule](https://resend.com/docs/dashboard/emails/schedule-email) · [cancel](https://resend.com/docs/api-reference/emails/cancel-email) · [webhooks](https://resend.com/docs/webhooks/introduction) · [event types](https://resend.com/docs/dashboard/webhooks/event-types) · [verify webhooks](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests) · [unsubscribe](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails) · [AUP](https://resend.com/legal/acceptable-use)
Supabase: [Queues](https://supabase.com/docs/guides/queues) · [Function limits](https://supabase.com/docs/guides/functions/limits) · [large jobs pattern](https://supabase.com/blog/processing-large-jobs-with-edge-functions) · [pgmq](https://pgmq.github.io/pgmq)
Editores: [react-email-editor](https://github.com/unlayer/react-email-editor) · [email-builder-js](https://github.com/usewaypoint/email-builder-js) · [easy-email-editor](https://github.com/zalify/easy-email-editor)
Referências de domínio: [listmonk schema](https://github.com/knadh/listmonk/blob/master/schema.sql) · [Dittofeed journey nodes](https://docs.dittofeed.com/resources/journey-nodes/wait-for) · [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) · [Mailgun sobre RFC 8058](https://www.mailgun.com/blog/deliverability/what-is-rfc-8058/)
