# Módulo de Teste A/B (v1 — Split-URL por redirecionamento)

Documentação viva do módulo. Esta pasta reúne o que **não** mora no código-fonte
do app: o Worker do Cloudflare, instruções de configuração e (ao fim do Passo 5)
a spec das mudanças no **Nexus** (outra base de código).

Arquitetura em uma frase: o visitante clica no **Link de Distribuição**
`go.dnia.ai/{slug}` → um **Cloudflare Worker** encaminha para a Edge
Function `go`, que sorteia a variante (sticky por cookie `.dnia.ai`), carimba a
origem e faz **302** para a landing → um **script leve** (`ab.js`) na landing
confirma exposição, injeta `ab_vid`/`ab_var` nos formulários e reescreve o `src`
do iframe do Nexus → a conversão amarra a variante ao lead e ao agendamento.

`dnmkt.dnia.ai`, `dnia.ai` e `nexus.dnia.ai` são subdomínios de `dnia.ai` → o
cookie `.dnia.ai` é lido/escrito por todos, e o iframe do Nexus é same-site.

---

## Por que um subdomínio dedicado (`go.dnia.ai`)

O app é um **SPA Vite puro** servido pelo Lovable, sem camada server-side. A
tentativa inicial de interceptar `dnmkt.dnia.ai/go/*` com uma Workers Route
**não funciona**: o hostname `dnmkt.dnia.ai` é reivindicado pelo Lovable via
**Cloudflare for SaaS** (orange-to-orange), e nesse arranjo o Cloudflare entrega
a requisição à configuração do Lovable, **ignorando as Workers Routes** da sua
zona nesse hostname. (Diagnóstico: a rota `mta-sts.dnia.ai` — subdomínio dedicado
— funciona; a de `dnmkt.dnia.ai` não, mesmo proxiada.)

A solução é um **subdomínio próprio dedicado ao worker: `go.dnia.ai`**, ligado
como **Custom Domain** do worker `ab-router`. Continua sendo `*.dnia.ai`, então o
cookie `.dnia.ai` same-site do redirecionador funciona normalmente.

A URL crua `https://kfhojzdcnpuntynodsff.supabase.co/functions/v1/go/{slug}`
funciona e serve para **QA interno**, mas **nunca** deve ir para campanha real:
o Meta pode reprovar (domínio de redirect ≠ exibido) e as mitigações de
bounce-tracking podem purgar o cookie de um domínio que só aparece como
redirecionador → o lead seria re-sorteado numa 2ª visita (contaminação entre
variantes). Com o redirecionador em `go.dnia.ai` (`*.dnia.ai`) isso não ocorre.

---

## Configuração do Cloudflare (já aplicada)

O script está em [`cloudflare-worker.js`](./cloudflare-worker.js). Setup atual:

1. Worker **`ab-router`** (Workers & Pages → Create Worker) com o código de
   `cloudflare-worker.js` (`SUPABASE_ANON_KEY = ''`).
2. **Custom Domain `go.dnia.ai`** ligado ao worker (worker → **Domains → Add
   Domain** → zona `dnia.ai`, subdomínio `go`). O Cloudflare cria o registro DNS
   proxiado e o certificado automaticamente. Todo o tráfego de `go.dnia.ai` vai
   ao worker.

Esquema de URL (Opção A):
- `https://go.dnia.ai/{slug}` → redirecionador
- `https://go.dnia.ai/e` → coletor de eventos

> Um Custom Domain dedicado (em vez de Workers Route em `dnmkt.dnia.ai`) é
> necessário por causa do orange-to-orange do Lovable — ver seção acima.
> **Rate-limit:** crie uma Rate Limiting Rule para `go.dnia.ai/e`.

### Testando

Após criar um teste com `slug = teste-demo` e status `running`:

```
curl -sI "https://go.dnia.ai/teste-demo?utm_source=meta&fbclid=abc"
```

Esperado: `302`, `location:` para a URL de destino contendo `ab_test`, `ab_var`,
`ab_vid` (e as UTMs preservadas), `x-robots-tag: noindex, nofollow` e um/dois
`set-cookie` com `Domain=.dnia.ai`. (Slug inexistente → `302` para
`https://dnia.ai`, sem cookie — é o fallback.)

### Solução de problemas

- **401 no gateway do Supabase:** algumas configurações exigem o header `apikey`
  mesmo com `verify_jwt=false`. Preencha `SUPABASE_ANON_KEY` no topo do Worker
  com a *publishable/anon key* (é pública — a mesma de `VITE_SUPABASE_PUBLISHABLE_KEY`)
  e faça Deploy novamente.
- **Cookie não aparece / não gruda:** garanta que o teste foi acessado por
  `https://` (o cookie é `Secure`) e que a rota do Worker está ativa (o response
  precisa vir de `dnmkt.dnia.ai`, não da URL `*.supabase.co`).
- **Dois `set-cookie` viram um só:** os runtimes atuais do Workers preservam
  múltiplos `Set-Cookie` ao usar `new Response(resp.body, resp)`. Se algum dia
  isso regredir, dá para unificar os cookies `ab_vid` e `ab_{slug}` num só.

---

## Deploy das Edge Functions (não sobe pelo sync do Lovable!)

As Edge Functions (`go`, e depois `ab-events`) e as migrations **não** são
deployadas automaticamente pelo sync Lovable ⇄ GitHub. Após cada push, aplique
via prompt no Lovable ou pela CLI do Supabase. Os prompts prontos são entregues
a cada passo.

---

## Coletor de eventos (`ab-events`)

Edge Function exposta (via Worker) em `dnmkt.dnia.ai/api/ab/events`. Recebe os
eventos de navegador (`assignment`, `exposure`, `behavior`, `schedule_step`,
`conversion`) do script `ab.js` e do Nexus. Características:

- **Fire-and-forget:** responde `202` na hora e grava em background — o tracking
  nunca atrasa nem trava a página.
- **CORS** liberado para `*.dnia.ai` (reflete a origem; cai em `*` p/ QA).
- **Idempotência:** exposição/conversão/`schedule_step` têm `dedupe_key` único;
  reenvios são absorvidos (contam visitantes únicos, não pageviews).
- **Anti-bot:** descarta user-agents de bots conhecidos.
- Aceita um evento único, um array, ou `{ "events": [...] }` (até 50 por request).

**Rate-limiting:** o coletor faz validação e cap de tamanho, mas o rate-limit "de
verdade" deve ficar na borda — crie uma **Rate Limiting Rule** no Cloudflare para
o path `go.dnia.ai/e` (ex.: N requisições por IP por minuto). É mais barato e
barra abuso antes de tocar a Edge Function.

Smoke test do coletor:

```
curl -s -X POST "https://go.dnia.ai/e" \
  -H "content-type: application/json" \
  -d '{"ab_test":"teste-demo","ab_var":"A","ab_vid":"v_teste","event_type":"exposure","page_slug":"/humanoseagentes"}'
```

Esperado: `{"accepted":1}`. Repetir a mesma chamada não cria linha nova (dedupe).

---

## Reuso de slug entre testes

O link publicado no anúncio é um ativo: não deve mudar a cada teste novo. Por
isso o slug tem dois papéis, em duas colunas de `ab_tests`:

| Coluna | Papel | Reutilizável? |
|---|---|---|
| `public_slug` | O que vai na URL: `go.dnia.ai/{public_slug}` | **Sim** — vários testes ao longo do tempo |
| `slug` | Chave interna de dados: cookie sticky `ab_{slug}`, param `ab_test`, `ab_assignments`, `ab_events`, `dedupe_key`, `leads`/`lead_conversions`, relatórios | Não — `UNIQUE`, imutável |

Separar os dois é o que evita contaminação: como o slug interno nunca se repete,
dois testes que dividem a mesma URL não herdam stickiness um do outro, não
colidem no dedupe de eventos e aparecem com dados totalmente separados no
relatório.

**Regra: no máximo 1 teste `running` por `public_slug`.** Garantida no banco
pelo índice único parcial `uq_ab_tests_public_slug_running` e aplicada pela RPC
`ab_activate_test(p_test_id, p_force)`, que roda a troca numa só transação.

Ciclo de vida na UI (`/experiments`):

- **Criar** — o admin escolhe a `public_slug` (sugerida a partir do nome). Criar
  um rascunho numa slug já ocupada é permitido; o portão é a ativação.
- **Ativar** — se já houver teste rodando na slug, a ativação é recusada e um
  diálogo oferece *"Finalizar o atual e ativar este"* (o vigente vai para
  `completed`, o novo para `running`, atomicamente).
- **Pausar** — kill switch: 100% no controle, teste segue vivo.
- **Concluir** — encerra o teste e define a `winner_variant` (ou o controle).

Sem nenhum teste `running` na slug, o redirecionador **não quebra o link**:
serve a `winner_variant ?? control_variant` do teste mais recente daquela slug
(por `updated_at`), a 100%.

---

## Documentos

- `v1-scope.md` — critério de pronto (Passos 2–6).
- `deploys.md` — deploys em ordem (CLI + prompts Lovable).
- `snippet-install.md` — instalação do `ab.js` nas LPs do `dnia.ai`.
- `nexus-spec.md` — mudanças no Nexus (outra base de código).
- `validation-checklist.md` — roteiro de validação ponta a ponta + teste A/A.
- `ads-compliance.md` — conformidade com Meta/Google Ads + guardrails de domínio.
- `cloudflare-worker.js` — Worker de borda.

## Estado do módulo

- [x] **Passo 1** — Fundação (tabelas `ab_*`) + redirecionador `go` + Worker.
- [x] **Passo 2** — Coletor `ab-events` (fire-and-forget, dedupe, anti-bot).
- [x] **Passo 3** — Snippet `ab.js` (exposição, comportamento, forms, iframe Nexus).
- [x] **Passo 4** — Variante no lead (`lead_conversions`/`leads`) + conversão `lead_criado`.
- [x] **Passo 5** — Loop do agendamento server-side + spec do Nexus.
- [x] **Passo 6** — UI admin: criação, relatório bayesiano + guardrail, análise + CSV.
- [ ] Passo 3 — Script leve `ab.js` (exposição, comportamento, iframe Nexus).
- [ ] Passo 4 — Variante gravada no lead + conversão `lead_criado`.
- [ ] Passo 5 — Loop do agendamento (server-side) + spec do Nexus.
- [ ] Passo 6 — UI de criação de teste + relatório bayesiano + análise/CSV.
