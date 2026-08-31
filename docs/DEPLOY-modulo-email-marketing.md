# Deploy — Módulo de Email Marketing (Fases 0–6)

> **Nada disto está em produção ainda.** O sync do Lovable publica o app, mas **não** deploya
> Edge Functions nem aplica migrations. Este documento é o roteiro completo.
>
> Todo o código está no GitHub (branch `main`). Verificação feita: `npm run build`, lint sem
> categorias novas de erro, e revisão adversarial de cada fase. **Nada foi executado contra o
> Supabase real** — não há CLI nem banco local nesta máquina. pgmq, pg_cron, a Batch API do
> Resend e o webhook só serão exercitados de verdade em produção.

## 1. Secrets (fazer ANTES do deploy)

**Supabase → Edge Functions → Secrets:**

| Secret | Para quê |
|---|---|
| `RESEND_API_KEY` | Envio de email |
| `EMAIL_FROM` | Remetente (ex.: `DN.IA <noreply@dnia.ai>`) |
| `RESEND_WEBHOOK_SECRET` | Verificação da assinatura Svix (pegar no dashboard do Resend ao criar o webhook) |
| `WEBHOOK_SECRET` | Auth server-to-server entre functions e cron |
| `UNSUBSCRIBE_SECRET` | Assina os links de descadastro (string aleatória ≥32 chars) |

**Postgres → Vault (SQL editor):**

```sql
select vault.create_secret('https://kfhojzdcnpuntynodsff.supabase.co', 'project_url');
select vault.create_secret('<o MESMO valor de WEBHOOK_SECRET>', 'webhook_secret');
```

⚠️ **O `webhook_secret` do Vault precisa ser byte a byte igual ao secret `WEBHOOK_SECRET` da Edge
Function.** Se divergirem, toda campanha agendada dá 401 silenciosamente e nunca envia.

## 2. Ordem de deploy (obrigatória)

O cron chama Edge Functions. Se as migrations de cron subirem antes das functions, o cron bate
numa URL inexistente a cada minuto.

### Rodada 1 — Edge Functions

```
Prompt para Lovable:
---
Faça deploy das edge functions:
send-campaign, process-email-queue, resend-webhook, email-unsubscribe,
resend-config-check, campaigns-api, contact-details, templates-api,
segments-api, automations-api, journey-worker, journeys-api

Observação: o arquivo compartilhado supabase/functions/_shared/auth.ts mudou
(passou a permitir DELETE no CORS), então TODAS as functions acima precisam ser
redeployadas para pegar a mudança.

Módulo de email marketing completo (fila de envio, tracking, descadastro,
templates, segmentação e fluxos de automação).

O código já está no repositório GitHub (commit <HASH>).
---
```

### Rodada 2 — Migrations (só depois de confirmar a rodada 1)

```
Prompt para Lovable:
---
Aplique as migrations NESTA ORDEM:
1.  20260713190000_email_tracking.sql
2.  20260713210000_email_queue.sql
3.  20260713220000_email_cron_sweepers.sql
4.  20260713230000_campaign_delete_guard.sql
5.  20260713240000_email_templates.sql
6.  20260713250000_segment_advanced_rules.sql
7.  20260714100000_journeys_core.sql
8.  20260714100500_journey_sends.sql
9.  20260714101000_journey_events_queue.sql
10. 20260714101500_journey_engine_rpcs.sql
11. 20260714110000_journey_cron_sweepers.sql

As migrations 3 e 11 agendam jobs de pg_cron que invocam as Edge Functions — por
isso elas vêm depois do deploy das functions.

O código já está no repositório GitHub (commit <HASH>).
---
```

### Depois do deploy

Regenerar os tipos e commitar (remove os `as any` espalhados):

```bash
supabase gen types typescript --project-id kfhojzdcnpuntynodsff > src/integrations/supabase/types.ts
```

## 3. Validação em produção

**Não envie nenhuma campanha real até o passo 6 passar.**

### Infraestrutura

1. **Vault e cron funcionam.** No SQL editor:
   ```sql
   select public.invoke_edge_function('process-email-queue', '{}'::jsonb);
   -- retorna um request id não-nulo?
   select * from net._http_response order by created desc limit 3;
   -- status 200 (não 401 — 401 = webhook_secret divergente)
   select jobname, schedule, active from cron.job;
   -- os jobs de drenagem, agendamento, sweepers e journeys
   select * from cron.job_run_details order by start_time desc limit 20;
   -- sem falhas
   ```

2. **Nome interno da fila pgmq** (se divergir, o sweeper de campanhas encalhadas fica inerte):
   ```sql
   select relname from pg_class where relname like 'q\_%';
   -- esperado: q_email_send_queue, q_journey_events
   ```

3. **RPC de fluxos aplica** (se falhar, todo `wait_for_event` quebra):
   ```sql
   select public.journey_wake_on_event('<um lead_id>', 'email_opened', now(), '{}'::jsonb);
   ```

4. **ResendCard → "Testar conexão"** deve dizer *Conectado*, sem alerta âmbar de
   `UNSUBSCRIBE_SECRET`. É a prova de que o auth por JWT de admin funciona.

### Captura de leads não pode quebrar

5. Envie um formulário real de landing page (`/gratuito`) e confirme que o lead aparece em
   `leads` e em `contact_events`. O trigger novo de fluxos escreve nessa tabela — ele é
   *fail-open* por construção, mas isso precisa ser confirmado com um lead de verdade.

### Email

6. **Uma campanha de teste para 2–3 endereços seus**, incluindo um lead sem email no segmento:
   - `campaign_sends` vai de `pending` → `sent` **e** `resend_email_id` é preenchido;
   - o email recebido tem os headers `List-Unsubscribe` e `List-Unsubscribe-Post` (ver código-fonte
     da mensagem) e o rodapé de descadastro;
   - a timeline do lead ganha **exatamente um** `email_sent` — e o lead sem email **nenhum**;
   - a campanha chega a `sent` e a lista mostra taxas de abertura/clique reais.

7. **Formato das tags do webhook** (se vier diferente, a correlação degrada silenciosamente):
   ```sql
   select event_type, campaign_id, lead_id, payload->'data'->'tags'
   from email_events order by created_at desc limit 5;
   ```

8. **Descadastro one-click:** clique no link do rodapé (a página só mostra confirmação, não
   descadastra), confirme → linha em `email_suppressions`, evento na timeline. Reenvie uma campanha
   para o mesmo email → o worker precisa pular com `error = 'suppressed'`.

### Fluxos (journeys)

9. Crie um fluxo com **`reentry = 'once'`** e um segmento que contenha **só você**:
   `enviar email → esperar 5min → aguardar abertura (timeout 15min) → se abriu: email B; senão: tag "frio"`.
   Confirme: uma linha em `campaign_sends` com `campaign_id IS NULL` e `journey_run_id` preenchido;
   um único `email_sent` na timeline; abrir o email leva ao ramo "abriu" (não ao de timeout).

10. **Só depois de tudo isso**, uma campanha real de algumas centenas de destinatários, acompanhando:
    ```sql
    select status, count(*) from campaign_sends where campaign_id = '<id>' group by 1;
    ```

## 4. Riscos residuais conhecidos

- **Lag do webhook > 20 min** faz um email entregue parecer perdido, e o sweeper o reenviaria
  (duplicata). Por isso o passo 7 vem antes de qualquer campanha real: se o webhook não estiver
  recebendo eventos, o sweeper opera às cegas.
- **Apple Mail infla aberturas** (prefetch). Em decisões críticas de fluxo, ramifique por **clique**,
  não por abertura. A UI avisa.
- **Fluxo com `reentry = 'allowed'`** reinscreve o lead após o cooldown (padrão: 7 dias). Com um
  segmento permanente (ex.: `etiqueta = hotlead`), isso significa email recorrente. A UI avisa.
- **Pausar um fluxo** congela o avanço, mas um email já enfileirado ainda sai (janela ≤ 1 min).
