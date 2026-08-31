# Campanhas e Journeys com múltiplos segmentos de inclusão e exclusão

**Data:** 2026-07-27
**Status:** aprovado, pronto para plano de implementação

## Problema

Hoje uma campanha aponta para **um único** segmento, via `campaigns.segment_id`
(`NULL` = todos os contatos). Não há como somar dois públicos nem como remover um
subconjunto do público escolhido — casos corriqueiros como "enviar para os
segmentos A e B, menos quem já comprou" exigem criar um segmento novo à mão a
cada campanha.

As Journeys com entrada por segmento (`journeys.entry_config.segment_id`) têm a
mesma limitação.

## Solução

A audiência passa a ser definida por dois conjuntos de segmentos:

```
audiência = união(segmentos de inclusão) − união(segmentos de exclusão)
```

A união já deduplica por construção. Um segmento de inclusão vazio significa
**todos os contatos** — o que preserva exatamente o significado atual de
`segment_id IS NULL` e, de quebra, torna possível "todos os contatos menos o
segmento X".

## Arquitetura

### 1. Modelo de dados

```sql
ALTER TABLE public.campaigns
  ADD COLUMN segment_ids          uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN excluded_segment_ids uuid[] NOT NULL DEFAULT '{}';

UPDATE public.campaigns
   SET segment_ids = ARRAY[segment_id]
 WHERE segment_id IS NOT NULL;
```

`segment_id` **permanece** e continua sendo a "primeira inclusão". É o que mantém
funcionando, sem alteração alguma: `campaigns-api` (GET e POST), `contact-details`,
a especificação OpenAPI em `public/api/dnmarketing-api.yaml` e qualquer integração
externa já existente.

A consistência entre a coluna legada e os arrays **não** fica a cargo dos call
sites — é garantida por um trigger `BEFORE INSERT OR UPDATE`:

- **INSERT** com `segment_ids` vazio e `segment_id` preenchido (o caso do
  `campaigns-api`, que não conhece os arrays) → deriva `segment_ids := ARRAY[segment_id]`.
- **UPDATE** em que só `segment_id` mudou → deriva `segment_ids` a partir dele.
- Nos demais casos, os arrays são a fonte de verdade → `segment_id := segment_ids[1]`
  (`NULL` quando o array está vazio).

Isso deixa o `campaigns-api` (que hoje só expõe `GET` e `POST`) funcional sem
nenhuma mudança de código, ao mesmo tempo em que impede que a coluna legada
divirja dos arrays.

Nas **Journeys** não há migration de coluna: `entry_config` é `jsonb` e passa a
guardar `{ segment_ids: [...], excluded_segment_ids: [...] }`. A leitura aceita o
formato antigo (`{ segment_id }`) sem backfill.

#### 1.1 Exclusão de segmentos (correção necessária)

`campaigns.segment_id` é hoje `REFERENCES segments(id) ON DELETE SET NULL`. Como
`NULL` significa "todos os contatos", apagar um segmento **já hoje** converte
silenciosamente uma campanha em rascunho apontada para ele num envio para a base
inteira. Com os arrays isso piora: o `UPDATE` implícito da FK dispararia o trigger
de sincronização e zeraria `segment_ids`, e um segmento de **exclusão** apagado
deixaria de excluir sem qualquer sinal.

Correção incluída neste trabalho:

- A FK `campaigns.segment_id → segments(id)` é removida. Os arrays passam a ser a
  única referência, e um UUID órfão sobrevive nas campanhas já enviadas como
  registro histórico (a UI já sabe exibir "Segmento removido").
- Novo trigger `BEFORE DELETE ON segments` **bloqueia** a exclusão de um segmento
  referenciado — como inclusão ou como exclusão — por campanha em
  `draft`/`scheduled`/`sending`/`paused` ou por journey não arquivada, com mensagem
  nomeando quem o usa.
- `resolve_segment_audience` levanta exceção se algum UUID recebido não existir
  mais em `segments`. Com o trigger acima isso nunca dispara em uso legítimo; é a
  rede final que garante que uma exclusão jamais desapareça em silêncio.

### 2. Resolução da audiência — duas RPCs

Nome neutro, porque campanhas e journeys usam as mesmas funções:

```sql
resolve_segment_audience(p_include uuid[], p_exclude uuid[], p_limit int DEFAULT NULL)
  RETURNS TABLE(lead_id uuid)

count_segment_audience(p_include uuid[], p_exclude uuid[])
  RETURNS integer
```

Ambas `SECURITY DEFINER`, `SET search_path = public`, com as mesmas guardas de
`evaluate_segment_rules` (bloqueia `anon`; exige role `admin` quando há
`auth.uid()`). `GRANT EXECUTE` para `authenticated` (o wizard, no navegador) e
`service_role` (`send-campaign`, `journey-worker`).

Implementação de `resolve_segment_audience`:

- `p_include` vazio → base é `SELECT id FROM leads`.
- `p_include` preenchido → `UNION` dos `evaluate_segment_rules(s)` para cada `s`,
  via `unnest(p_include) ... LATERAL`.
- Exclusão: `NOT EXISTS` contra a mesma união aplicada a `p_exclude`.
- `p_limit` aplicado **depois** da exclusão; `NULL` = sem limite.

`evaluate_segment_rules` já trata os dois tipos de segmento (para `type = 'static'`
ela cai em `segment_contacts`), então nada da lógica de segmento é reimplementado.

`count_segment_audience` é uma função `sql` de uma linha sobre
`resolve_segment_audience` — uma implementação só, sem chance de os dois números
divergirem.

### 3. `send-campaign`

O bloco de resolução de audiência (`supabase/functions/send-campaign/index.ts`,
linhas 163–196) é substituído por: chamada a `resolve_segment_audience` → lista de
`lead_id` → carregamento dos leads em lotes de 200 (padrão já usado no arquivo).

Tudo o mais permanece **intocado**: o CAS atômico do claim, o enfileiramento em
duas passadas estritamente ordenadas, o tratamento de `orphanPending` e o índice
único parcial `uniq_campaign_sends_email_campaign_lead`, que continua sendo a rede
de segurança final contra envio duplicado ao mesmo lead.

Normalização da entrada (retrocompatibilidade de leitura, para campanhas criadas
antes da migration):

```
include = campaign.segment_ids ?? (campaign.segment_id ? [campaign.segment_id] : [])
exclude = campaign.excluded_segment_ids ?? []
```

**Teto de audiência:** preserva o comportamento atual — `p_limit = 5000` quando
`include` está vazio (o antigo `.limit(5000)` do caminho "todos os contatos") e
`NULL` (sem teto) quando há segmentos de inclusão, que é como os segmentos se
comportam hoje.

### 4. Componente de UI compartilhado

Novo `src/components/admin/segments/SegmentMultiSelect.tsx` — combobox de múltipla
seleção sobre `Popover` + `Command` (ambos já presentes em `src/components/ui`),
mostrando nome, tipo (dinâmico/estático) e contagem de cada segmento, com chips
removíveis para os selecionados. Usado nos quatro pontos: wizard de campanha,
`JourneyCreateDialog` e `JourneyBuilder`.

### 5. Wizard de campanha — criação

O `Select` único de "Segmento de destino" no passo 1 vira dois campos:

- **Segmentos de destino** — vazio = todos os contatos (texto de ajuda explícito).
- **Excluir contatos de** — opcional.

O card de contagem passa a chamar `count_segment_audience` (debounce de ~400ms,
`Skeleton` enquanto carrega) e os três nomes do preview vêm de
`resolve_segment_audience(..., p_limit => 3)`. Com isso, **o número mostrado e o
número enviado saem da mesma função SQL** — hoje eles vêm de caminhos diferentes
(`counts[segmentId]` no client vs. resolução própria na Edge Function).

O passo "Revisão" e o `AlertDialog` de confirmação listam os segmentos incluídos e
os excluídos por nome, em vez de um único nome de segmento.

`createCampaign` (`src/hooks/useCampaigns.tsx`) passa a receber `segment_ids` e
`excluded_segment_ids` em vez de `segment_id`. `duplicateCampaign` copia os dois
arrays.

### 6. Wizard de campanha — edição de rascunho

`CampaignWizard` ganha a prop opcional `campaign?: Campaign`. Quando presente:

- Título "Editar campanha"; estado inicial carregado da campanha (nome, canal,
  assunto, agendamento, arrays de segmentos) e `loadDesign(campaign.design)` no
  Unlayer no `onReady`.
- Botão final salva em vez de criar; para uma campanha `scheduled`, mantém o
  agendamento (revalidando o piso de 5 minutos se a data for alterada).

Novo `updateCampaign` no `useCampaigns`, com a mesma proteção de corrida do
`cancelSchedule` — `.in('status', ['draft','scheduled']).select('id')`, e array
vazio significa que o cron promoveu a campanha para `sending` no meio do caminho,
caso em que a UI avisa e ressincroniza em vez de reportar sucesso falso.

Item "Editar" no menu da lista (`src/pages/admin/Campaigns.tsx`), visível apenas
para status `draft` e `scheduled`.

A coluna "Segmento" da lista passa a exibir a audiência a partir dos arrays
("Todos os contatos", o nome quando há um ou dois, "N segmentos" quando há mais,
com os excluídos indicados). O `CampaignDetail` não mostra o segmento hoje e
continua como está.

`useSegments.deleteSegment` passa a exibir a mensagem do banco em vez de um erro
genérico — é ela que nomeia a campanha ou o fluxo que ainda usa o segmento.

### 7. Journeys

- `journey_enroll_segment` troca `evaluate_segment_rules(v_segment)` por
  `resolve_segment_audience(v_include, v_exclude, p_limit)`, lendo os arrays de
  `entry_config` com fallback para o `segment_id` antigo. A lógica de reentrada,
  cooldown e `ON CONFLICT DO NOTHING` fica intacta. O `context` gravado em
  `journey_runs` passa a registrar `segment_ids`/`excluded_segment_ids`.
- `JourneyCreateDialog` e `JourneyBuilder` usam o `SegmentMultiSelect` para a
  entrada por segmento.
- O aviso obrigatório antes de ativar um fluxo (`JourneysTab`, "N contatos serão
  inscritos imediatamente") passa a usar `count_segment_audience`.

O nó **`branch_segment`** (ramificação "este lead está no segmento X?") fica como
está: é uma pergunta sobre um segmento só, não uma definição de audiência.

## Comportamento em tempo de execução

Segmentos dinâmicos são reavaliados **no momento do envio**, e a exclusão também.
O número mostrado no card do wizard é, portanto, uma foto do instante em que a
campanha é montada: se um contato entrar no segmento de exclusão entre a criação e
um disparo agendado, ele será corretamente excluído, mas o total efetivamente
enviado não baterá com o que o card exibiu. É o comportamento desejado — a
exclusão precisa valer no momento do envio — e está documentado aqui por ser uma
divergência aparente entre a UI e o resultado.

## Arquivos afetados

**Migration (1 arquivo novo):**
- colunas `segment_ids` / `excluded_segment_ids` + backfill + trigger de
  sincronização da coluna legada
- `resolve_segment_audience`, `count_segment_audience` (+ grants)
- `journey_enroll_segment` (substituição)

**Edge Functions:**
- `supabase/functions/send-campaign/index.ts`

**Frontend:**
- `src/lib/campaignAudience.ts` (novo) — normalização dos arrays e rótulo textual
- `src/hooks/useSegmentAudience.tsx` (novo) — contagem e amostra via RPC, com debounce
- `src/components/admin/segments/SegmentMultiSelect.tsx` (novo)
- `src/components/admin/campaigns/CampaignWizard.tsx`
- `src/pages/admin/Campaigns.tsx`
- `src/hooks/useCampaigns.tsx`
- `src/hooks/useSegments.tsx`
- `src/lib/journeys.ts`
- `src/components/admin/automations/JourneyCreateDialog.tsx`
- `src/components/admin/automations/JourneysTab.tsx`
- `src/pages/admin/JourneyBuilder.tsx`

`src/integrations/supabase/types.ts` é auto-gerado e **não** será editado à mão; as
colunas novas são acessadas com os casts `as any` já usados em todo o módulo de
campanhas.

## Verificação

Não há test runner configurado no projeto. A validação é:

1. `npm run lint` e `npm run build` locais.
2. `commit` → `push` → sync do Lovable.
3. Deploy manual da migration e da Edge Function `send-campaign` (o sync do Lovable
   **não** faz o deploy de nenhum dos dois) — via prompt entregue ao usuário, com o
   hash do commit, ou pela CLI do Supabase.
4. Verificação em `https://dnmkt.dnia.ai`: criar uma campanha com dois segmentos de
   inclusão sobrepostos e um de exclusão; conferir que a contagem do card bate com
   `count_segment_audience` e que `campaign_sends` recebe exatamente um registro por
   lead da audiência resultante.

## Fora de escopo

- Exclusão automática de quem já recebeu uma campanha anterior.
- Alteração do nó `branch_segment` das journeys.
- Suporte a múltiplos segmentos nas demais `*-api` (o `campaigns-api` continua com
  o contrato de `segment_id` único, coberto pelo trigger de sincronização).
