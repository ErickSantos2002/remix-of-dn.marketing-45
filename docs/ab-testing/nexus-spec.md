# Spec — mudanças no Nexus para fechar o loop A/B (entregável separado)

> O **Nexus** (`nexus.dnia.ai`) é **outra base de código**. Este documento lista o
> que precisa ser implementado LÁ para o v1 fechar a atribuição do agendamento à
> variante. O lado do dnmkt já está pronto (functions `identity-upsert` e
> `receive-contact-event` capturam `ab_vid`/`ab_test`/`ab_var` de `metadata` ou do
> top-level do body e costuram em `ab_identities` + registram a conversão
> `agendamento` em `ab_events`).

## Contexto

O iframe `nexus.dnia.ai/schedule/{uuid}` é o formulário de agendamento em 3 etapas
(dados básicos → dados adicionais → dia/hora). O script `ab.js` da landing (e os
modais do dnmkt) **injetam `ab_vid`/`ab_test`/`ab_var` na URL do iframe** —
o Nexus recebe esses valores na própria querystring do `schedule`.

Princípio: **não** depender de cookie dentro do iframe (Safari/Firefox particionam
storage embutido). A URL é o transportador. E o tracking **nunca** pode bloquear o
avanço do formulário (não-bloqueante) nem duplicar dados (idempotente).

## O que implementar no Nexus

### 1. Ler `ab_*` da URL e carregar pelo fluxo das 3 etapas
Ao montar o `schedule`, capturar `ab_vid`, `ab_test`, `ab_var` de
`window.location.search` e mantê-los no estado do formulário (sobrevivendo às 3
etapas). Se ausentes, seguir normalmente (fallback server-side por email/whatsapp
cobre).

### 2. Etapa 1 (dados básicos) — upsert de contato JÁ COM `ab_vid` (chamada crítica)
No avanço da etapa 1, o Nexus já chama o dnmkt para upsert de contato. **Incluir os
campos `ab_*`** nessa chamada existente. Endpoint dnmkt:

```
POST {DNMKT}/functions/v1/identity-upsert
Authorization: Bearer <API key ou WEBHOOK_SECRET>   // como já é feito hoje
Content-Type: application/json

{
  "source_app": "nexus",
  "local_id": "<nexus_contact_id>",
  "nome": "...", "email": "...", "phone": "...",
  "stage": "lead",
  "ab_vid": "v_...",          // <-- NOVOS (top-level OU dentro de metadata)
  "ab_test": "t_...",
  "ab_var": "A",
  "metadata": { "ab_vid": "v_...", "ab_test": "t_...", "ab_var": "A" }
}
```

Isto cria o vínculo `ab_vid ↔ contato` cedo — atribui até leads que abandonam nas
etapas 2–3 (lead parcial atribuído vale mais que agendamento não atribuído).

### 3. Etapas 2 e 3 (avanços) — evento `schedule_step` ao coletor
A cada avanço, mandar um evento ao **coletor dedicado** (fire-and-forget):

```
POST https://dnmkt.dnia.ai/api/ab/events
Content-Type: application/json

{ "ab_vid": "v_...", "ab_test": "t_...", "ab_var": "A",
  "event_type": "schedule_step", "event_name": "2",
  "metadata": { "step": 2 } }
```

Mostra onde cada variante perde gente **dentro** do agendamento. Sem auth (o coletor
é público); use `sendBeacon`/`keepalive` para não bloquear.

### 4. Confirmação do agendamento — `ab_vid` na chamada existente
Na confirmação, o Nexus já chama o dnmkt para reportar o agendamento. **Incluir
`ab_vid`/`ab_test`/`ab_var`** (top-level ou em `metadata`). Endpoint dnmkt:

```
POST {DNMKT}/functions/v1/receive-contact-event
Authorization: Bearer <API key ou WEBHOOK_SECRET>
Content-Type: application/json

{
  "source_app": "nexus",
  "event_type": "meeting_scheduled",
  "title": "Reunião agendada",
  "email": "...", "phone": "...",
  "occurred_at": "<ISO>",
  "metadata": { "ab_vid": "v_...", "ab_test": "t_...", "ab_var": "A",
                "agendamento_id": "<id>" }
}
```

O dnmkt registra a conversão `agendamento` em `ab_events` (redundância proposital ao
evento client-side; ambos idempotentes por `dedupe_key`).

## Regras obrigatórias

- **Idempotência:** reenvio nunca duplica contato nem conversão. No dnmkt, a
  conversão dedup por `ab_vid+ab_test+agendamento`; a costura por `ab_vid+lead`.
  No Nexus, use uma chave (`agendamento_id`) para não reenviar em duplicidade.
- **Não-bloqueio:** nenhuma chamada de tracking pode travar o avanço do formulário.
  Falha vai para retry/fila — tracking nunca custa uma conversão.
- **Fallback:** se um agendamento chegar sem `ab_vid`, o dnmkt casa server-side por
  email/whatsapp contra `ab_identities`/`ab_assignments` — mas isso é rede de
  segurança, não o caminho feliz. Priorize mandar o `ab_vid`.

## Checklist de aceite (Nexus)

- [ ] `ab_vid`/`ab_test`/`ab_var` lidos da URL do `schedule` e mantidos nas 3 etapas.
- [ ] Etapa 1: upsert de contato inclui `ab_*`.
- [ ] Etapas 2–3: `schedule_step` enviado ao coletor.
- [ ] Confirmação: `receive-contact-event` inclui `ab_*` (+ `agendamento_id`).
- [ ] Idempotência e não-bloqueio garantidos.
