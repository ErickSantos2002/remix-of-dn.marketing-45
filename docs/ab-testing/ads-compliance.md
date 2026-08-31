# Conformidade com Meta Ads e Google Ads

Parecer sobre usar o Teste A/B (Split-URL por redirect `302`) em tráfego pago, e
os guardrails implementados no código. Baseado em pesquisa multi-fonte com
verificação adversarial (23 alegações confirmadas contra documentação oficial de
Google e Meta), 2026-07-23.

## Veredito

| Plataforma | Apto? | Condição inegociável |
|---|---|---|
| **Meta Ads** (FB/IG) | Sim, baixo risco | A landing final (`dnia.ai`) precisa vender o mesmo que o anúncio promete. |
| **Google Ads** | Sim, com 1 regra crítica | **Todas** as variantes têm de ficar sob o mesmo domínio raiz `dnia.ai`. |

## Por que não é cloaking

Cloaking, para Google e Meta, é *mostrar conteúdo diferente ao revisor/bot vs. ao
usuário para esconder violação*. No nosso fluxo, bot e humano recebem o **mesmo**
`302` e a **mesma** página — a única diferença é que bots não executam o `ab.js`
(não contam `exposure`). O produto promovido é idêntico para todos, que é
exatamente a exceção que ambas as plataformas autorizam. Risco de cloaking:
descartado (voto 3-0 na verificação).

## O que nos favorece (por design)

1. **Mesmo domínio raiz.** O anúncio aponta para `go.dnia.ai` e o usuário
   aterrissa em `dnia.ai`. O Google casa a correspondência no nível do **domínio
   registrável** (`dnia.ai`) — subdomínios são permitidos. Logo `go.dnia.ai →
   dnia.ai` é **cross-subdomínio, não cross-domínio**, e **não** dispara
   "Destination mismatch".
2. **Click IDs preservados.** O redirecionador repassa `utm_*`, `gclid`,
   `fbclid`, `ttclid`, `msclkid` na URL final — o Google tem doc oficial avisando
   que perder o `gclid` quebra a atribuição.
3. **`302` server-side + `noindex`.** É o tipo de redirect aceito (server-side,
   HTTPS); `X-Robots-Tag: noindex,nofollow` evita indexar o link.

## Riscos reais e mitigações

- **[Crítico · Google] Variante fora do `dnia.ai` = violação.** Se uma variante
  apontar para um domínio raiz diferente (ex.: `outro.com`), vira "Destination
  mismatch" e passa a exigir aprovação prévia do Google (exceção de jul/2026,
  documentada só p/ CPG→varejista). **Mitigação: guardrail no código (abaixo).**
- **[Atenção · Google] Cláusula "serviço de redirect" na Final URL.** A política
  também reprova Final URLs que "usam encurtador/serviço de redirect ou
  redirecionam automaticamente". Pode pegar `go.dnia.ai` se ele for a Final URL.
  **Mitigação operacional: no Google, pôr `go.dnia.ai/{slug}` no campo "Tracking
  template" e uma página real de `dnia.ai` como "Final URL".**
- **[Atenção · Meta] Consistência anúncio↔landing.** A Meta faz crawling em tempo
  real da URL de destino; a variante em `dnia.ai` tem de entregar o que o criativo
  promete.
- **[Boa notícia · Meta] Verificação de domínio / AEM não é mais obrigatória**
  (DV removida como requisito em 2023; config manual do AEM removida em jun/2025).
  Ainda assim, **recomendado** verificar `dnia.ai` no Business Manager.

## Guardrails implementados no código

Domínio de produção cadastrável + validação das variantes contra ele
(commit `197c97d` / migration `20260723120000_ab_config.sql`):

- **`ab_config`** — tabela single-row (RLS admin) com `production_domain`
  (default `dnia.ai`). Compartilhada por todo o time. Fora do `types.ts`
  auto-gerado (acesso via `supabase as any`, como as demais `ab_*`).
- **UI** — card "Domínio de produção" em `/experiments/setup` (`useAbConfig`).
- **Validação primária (frontend)** — `Experiments.handleCreate` bloqueia criar
  um teste com qualquer variante fora do domínio (ou de um subdomínio dele).
  Aceita `dnia.ai/lp` e `promo.dnia.ai`; rejeita `outro.com`.
- **Reforço server-side (defesa em profundidade)** — a Edge Function `go` lê
  `ab_config` (em paralelo com `ab_tests`) e, se o destino não pertencer ao
  domínio de produção, cai no `FALLBACK_URL` em vez de redirecionar o clique do
  anúncio p/ fora do domínio. **Fail-open:** se a config não for legível, o
  redirect segue normalmente (nunca quebra o hot path).
- Helpers puros em `src/lib/abConfig.ts` (`normalizeProductionDomain`,
  `domainOf`, `isHostInDomain`); espelhados na `go` (Edge Functions não importam
  de `src/`).

## Recomendações operacionais (fora do código)

1. **Google:** usar "Tracking template" para `go.dnia.ai`, com Final URL em
   `dnia.ai`.
2. **Meta:** verificar `dnia.ai` no Business Manager (recomendado, não
   obrigatório).
3. **Ambos:** rodar um **piloto de orçamento mínimo** em cada plataforma antes de
   escalar — a conformidade até aqui é raciocinada, não comprovada em campanha
   real. Monitorar reprovações e usar "Appeal".
4. **Nunca** usar a URL crua `*.supabase.co` em campanha (já é regra do módulo —
   ver [README](./README.md), seção "Por que um subdomínio dedicado").

## Fontes primárias

- Google — Malicious/unwanted software & cloaking: <https://support.google.com/adspolicy/answer/15938075>
- Google — Destination mismatch: <https://support.google.com/adspolicy/answer/16428020>
- Google — Upgraded URLs / cross-domain redirects: <https://support.google.com/google-ads/answer/6273460>
- Google — Tracking template does not redirect through to the final URL: <https://support.google.com/google-ads/troubleshooter/13285322>
- Meta — Deceptive content / Circumventing systems: <https://transparency.meta.com/policies/ad-standards/deceptive-content/>
