# Instalação do snippet `ab.js` nas landing pages do `dnia.ai`

O `dnia.ai` é um **projeto separado** do app (`dnmkt.dnia.ai`). O tracking A/B do
lado da página é um único arquivo standalone servido pelo app — cole **uma linha**
em cada landing page do teste.

## Instalação (1 linha)

No `<head>` (ou no fim do `<body>`) da landing page:

```html
<script src="https://dnmkt.dnia.ai/ab.js" async></script>
```

Pronto. O script:
- lê `ab_test`/`ab_var`/`ab_vid` da query (postos pelo redirecionador) e grava no
  cookie `.dnia.ai` (`SameSite=Lax`, `Secure`, 90d) — em retornos **sem** query, o
  cookie é a fonte da verdade;
- dispara a **exposição** (conta humano, não bot);
- rastreia **scroll, tempo e cliques** em CTAs;
- injeta `ab_vid`/`ab_var`/`ab_test` em **campos ocultos** de todo formulário;
- reescreve o `src` de **todo iframe** `nexus.dnia.ai/schedule` (inclui iframes
  inseridos por modais depois do load).

> **Sobre integridade (SRI):** o `ab.js` é **first-party** e propositalmente
> mutável/versionless — ele evolui sem trocar a tag. Por isso **não** usa
> `integrity="sha384-..."`: o hash mudaria a cada atualização e travaria o carregamento.
> SRI existe para blindar scripts de **terceiros/CDN**, o que não é o caso aqui
> (mesmo domínio registrável `dnia.ai`).

## Marcações opcionais na página

- **CTA:** marque botões/links relevantes com `data-ab-cta="nome-do-cta"` para
  registrar cliques nomeados. Sem a marcação, cliques em `<a>`/`<button>` já são
  capturados genericamente.
- **Formulários:** nada a fazer — os campos ocultos são injetados automaticamente.
  Se o seu backend de captura recebe os campos do form, ele passará a receber
  `ab_vid`/`ab_var`/`ab_test` (encaminhe-os ao dnmkt via a API existente).

## LGPD (consentimento)

Por padrão o script opera assim que carrega. Para exigir consentimento antes de
gravar cookie e rastrear, use:

```html
<script src="https://dnmkt.dnia.ai/ab.js" async data-require-consent="true"></script>
```

Nesse modo, o tracking só ativa quando houver o cookie `ab_consent=1` **ou** quando
`window.abConsentGranted()` retornar `true` (chame sua CMP e defina um desses).

## Configuração avançada (atributos no `<script>`)

| Atributo | Default | Função |
|---|---|---|
| `data-endpoint` | `https://go.dnia.ai/e` | Coletor de eventos |
| `data-cookie-domain` | `.dnia.ai` | Escopo do cookie |
| `data-require-consent` | (ausente) | `"true"` exige consentimento LGPD |

## Regras de validade do teste (lembrete)

- **Todo** o tráfego do teste deve entrar pelo Link de Distribuição
  `go.dnia.ai/{slug}` — campanhas apontando direto para `dnia.ai/pagina`
  ficam fora do teste e contaminam a leitura.
- **Mesmo agendador** (`uuid`) em todas as variantes — a variação fica na LP, nunca
  no agendador (senão o teste mede página + agendador ao mesmo tempo).
