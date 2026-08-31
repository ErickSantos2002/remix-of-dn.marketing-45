# Campanhas e Journeys com múltiplos segmentos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que uma campanha (e uma journey com entrada por segmento) tenha vários segmentos de inclusão somados e vários segmentos de exclusão subtraídos, com a contagem exibida na UI saindo da mesma função SQL que resolve o envio.

**Arquitetura:** Duas colunas `uuid[]` em `campaigns` (`segment_ids`, `excluded_segment_ids`) com a coluna legada `segment_id` mantida em sincronia por trigger. Toda a resolução de audiência — wizard, `send-campaign` e `journey_enroll_segment` — passa por duas RPCs novas construídas sobre a `evaluate_segment_rules` existente, que já cobre segmentos estáticos e dinâmicos.

**Tech Stack:** PostgreSQL/Supabase (plpgsql, RPCs `SECURITY DEFINER`), Deno Edge Functions, React 18 + TypeScript, shadcn/ui (Popover + Command), Tailwind.

**Spec:** `docs/superpowers/specs/2026-07-27-campanhas-multi-segmento-design.md`

## Global Constraints

- **Não existe test runner neste projeto.** O gate de cada tarefa de frontend é `npx tsc -p tsconfig.app.json --noEmit`, que hoje passa com **0 erros** — qualquer erro novo é regressão. **Use o `-p` explícito:** o `tsconfig.json` da raiz é solution-style (`"files": []` + `references`), então `npx tsc --noEmit` sozinho não compila nada e sai com 0 sempre, dando um falso "passou". `npm run lint` tem uma baseline suja (462 problemas, 434 erros) e **não** serve de gate; use-o apenas para conferir que os arquivos que você tocou não ganharam problemas novos.
- **`src/integrations/supabase/types.ts` é auto-gerado — nunca editar à mão.** As colunas e RPCs novas são acessadas com os casts `as any` já usados em todo o módulo de campanhas (`supabase.from('campaigns' as any)`, `supabase.rpc('nome' as any, {...})`).
- **Migrations e Edge Functions não são deployadas pelo sync do Lovable.** Elas só entram em produção pela Task 11. Nenhuma tarefa anterior deve afirmar que algo "está funcionando em produção".
- **Push imediato após cada commit** (o usuário valida pela URL do Lovable).
- Timezone de qualquer data: `BRASILIA_TIMEZONE` (`America/Sao_Paulo`), importado de `@/hooks/useLeadAnalytics`.
- Semântica fixa da audiência: `união(segment_ids) − união(excluded_segment_ids)`; `segment_ids` **vazio = todos os contatos** para campanhas, e **= não inscrever ninguém** para journeys.
- Textos de UI em português, com acentuação correta.

---

## Estrutura de arquivos

**Migrations (3 arquivos novos, em `supabase/migrations/`):**
- `20260727120000_campaign_multi_segment_columns.sql` — colunas, backfill, trigger de sincronização da coluna legada, remoção da FK e guarda de exclusão de segmentos.
- `20260727120500_resolve_segment_audience.sql` — as duas RPCs de audiência.
- `20260727121000_journey_enroll_segment_multi.sql` — `journey_enroll_segment` sobre a RPC nova.

**Edge Function:**
- `supabase/functions/send-campaign/index.ts` — resolução de audiência via RPC.

**Frontend (novos):**
- `src/lib/campaignAudience.ts` — normalização dos arrays e rótulo textual da audiência. Puro, sem I/O.
- `src/hooks/useSegmentAudience.tsx` — contagem + amostra de nomes via RPC, com debounce.
- `src/components/admin/segments/SegmentMultiSelect.tsx` — combobox de múltipla seleção de segmentos.

**Frontend (modificados):**
- `src/hooks/useCampaigns.tsx`, `src/components/admin/campaigns/CampaignWizard.tsx`, `src/pages/admin/Campaigns.tsx`
- `src/components/admin/automations/JourneyCreateDialog.tsx`, `src/components/admin/automations/JourneysTab.tsx`, `src/pages/admin/JourneyBuilder.tsx`

---

## Task 1: Migration — colunas, trigger de sincronização e guarda de exclusão

**Files:**
- Create: `supabase/migrations/20260727120000_campaign_multi_segment_columns.sql`

**Interfaces:**
- Consumes: nada.
- Produces: colunas `campaigns.segment_ids uuid[]` e `campaigns.excluded_segment_ids uuid[]` (ambas `NOT NULL DEFAULT '{}'`); funções `public.sync_campaign_legacy_segment_id()` e `public.guard_segment_delete()`.

**Contexto que você precisa saber:** `campaigns.segment_id` foi criada em `supabase/migrations/20260330013031_292daca8-526f-4c23-ab9a-b03715ec5c1d.sql` como `UUID REFERENCES segments(id) ON DELETE SET NULL`. Como `segment_id NULL` significa "todos os contatos", apagar um segmento hoje converte silenciosamente uma campanha em rascunho num envio para a base inteira. Esta migration remove essa FK e substitui o comportamento por uma guarda explícita.

- [ ] **Step 1: Criar a migration**

Crie `supabase/migrations/20260727120000_campaign_multi_segment_columns.sql` com exatamente este conteúdo:

```sql
-- Audiência multi-segmento em campanhas: união de inclusões menos união de exclusões.
-- `segment_id` (coluna legada) permanece como "primeira inclusão" para não quebrar
-- campaigns-api, contact-details e o OpenAPI público.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS segment_ids          uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_segment_ids uuid[] NOT NULL DEFAULT '{}';

UPDATE public.campaigns
   SET segment_ids = ARRAY[segment_id]
 WHERE segment_id IS NOT NULL
   AND cardinality(segment_ids) = 0;

-- A FK `campaigns.segment_id -> segments(id) ON DELETE SET NULL` PRECISA sair.
-- Motivo: `segment_ids` vazio significa "todos os contatos". Com a FK, apagar um
-- segmento dispara um UPDATE implícito (segment_id := NULL) que o trigger de
-- sincronização abaixo propagaria para os arrays -- transformando uma campanha em
-- rascunho, apontada para um segmento pequeno, num envio para a base inteira.
-- E um segmento de EXCLUSÃO apagado deixaria de excluir, sem sinal nenhum.
-- No lugar da FK: guard_segment_delete() bloqueia a exclusão de segmentos em uso,
-- e campanhas já enviadas guardam o UUID órfão como registro histórico (a UI já
-- exibe "Segmento removido" nesse caso).
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_segment_id_fkey;

-- Sincronização bidirecional entre a coluna legada e os arrays.
--   INSERT sem arrays e com segment_id (o caso do campaigns-api, que só conhece o
--   contrato antigo) -> deriva o array a partir dele.
--   UPDATE em que SÓ segment_id mudou -> deriva o array a partir dele.
--   Todos os demais casos -> os arrays são a fonte de verdade.
CREATE OR REPLACE FUNCTION public.sync_campaign_legacy_segment_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.segment_ids          := COALESCE(NEW.segment_ids, '{}'::uuid[]);
  NEW.excluded_segment_ids := COALESCE(NEW.excluded_segment_ids, '{}'::uuid[]);

  IF TG_OP = 'INSERT' THEN
    IF cardinality(NEW.segment_ids) = 0 AND NEW.segment_id IS NOT NULL THEN
      NEW.segment_ids := ARRAY[NEW.segment_id];
    END IF;
  ELSIF NEW.segment_id IS DISTINCT FROM OLD.segment_id
        AND NEW.segment_ids IS NOT DISTINCT FROM OLD.segment_ids THEN
    NEW.segment_ids := CASE
      WHEN NEW.segment_id IS NULL THEN '{}'::uuid[]
      ELSE ARRAY[NEW.segment_id]
    END;
  END IF;

  -- Arrays vazios -> segment_id NULL (= todos os contatos), preservando a semântica
  -- que o send-campaign e o campaigns-api já usavam.
  NEW.segment_id := NEW.segment_ids[1];
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_sync_campaign_legacy_segment_id ON public.campaigns;
CREATE TRIGGER trg_sync_campaign_legacy_segment_id
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.sync_campaign_legacy_segment_id();

-- Guarda de exclusão: um segmento em uso por uma campanha que ainda vai sair, ou
-- por uma journey não arquivada, não pode ser apagado. Campanhas já enviadas
-- (sent/failed) não bloqueiam -- o passado não muda.
CREATE OR REPLACE FUNCTION public.guard_segment_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign text;
  v_journey  text;
BEGIN
  SELECT c.name INTO v_campaign
    FROM public.campaigns c
   WHERE c.status IN ('draft', 'scheduled', 'sending', 'paused')
     AND (OLD.id = ANY(c.segment_ids) OR OLD.id = ANY(c.excluded_segment_ids))
   LIMIT 1;

  IF v_campaign IS NOT NULL THEN
    RAISE EXCEPTION 'Este segmento é usado pela campanha "%" (ainda não enviada). Remova-o da campanha antes de excluí-lo.', v_campaign;
  END IF;

  SELECT j.name INTO v_journey
    FROM public.journeys j
   WHERE j.status <> 'archived'
     AND j.entry_type = 'segment'
     AND (
           j.entry_config->>'segment_id' = OLD.id::text
        OR j.entry_config->'segment_ids' @> to_jsonb(OLD.id::text)
        OR j.entry_config->'excluded_segment_ids' @> to_jsonb(OLD.id::text)
     )
   LIMIT 1;

  IF v_journey IS NOT NULL THEN
    RAISE EXCEPTION 'Este segmento é usado pelo fluxo "%". Remova-o do fluxo antes de excluí-lo.', v_journey;
  END IF;

  RETURN OLD;
END $function$;

DROP TRIGGER IF EXISTS trg_guard_segment_delete ON public.segments;
CREATE TRIGGER trg_guard_segment_delete
  BEFORE DELETE ON public.segments
  FOR EACH ROW EXECUTE FUNCTION public.guard_segment_delete();
```

- [ ] **Step 2: Conferir os pressupostos da guarda contra o schema real**

Rode estas buscas e confirme cada resposta antes de seguir. Se alguma divergir, **pare e reporte** — não ajuste a migration por conta própria:

```bash
# 1. A tabela journeys tem as colunas status, entry_type e entry_config?
grep -n "CREATE TABLE public.journeys" -A 20 supabase/migrations/20260714100000_journeys_core.sql

# 2. 'archived' é um status válido de journey?
grep -rn "archived" supabase/migrations/20260714100000_journeys_core.sql src/lib/journeys.ts

# 3. Os status de campanha usados na guarda existem?
grep -n "draft\|scheduled\|sending\|paused" src/hooks/useCampaigns.tsx | head -3
```

Esperado: `journeys` tem `status`, `entry_type`, `entry_config jsonb`; `archived` aparece como status de journey; os quatro status de campanha aparecem no tipo `Campaign['status']`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727120000_campaign_multi_segment_columns.sql
git commit -m "Adiciona colunas de audiência multi-segmento em campaigns

- segment_ids/excluded_segment_ids com backfill a partir de segment_id
- trigger de sincronização bidirecional com a coluna legada
- remove a FK ON DELETE SET NULL, que convertia campanha em rascunho
  num envio para a base inteira quando o segmento era apagado
- guarda de exclusão de segmento em uso por campanha ou fluxo"
git push
```

---

## Task 2: Migration — RPCs `resolve_segment_audience` e `count_segment_audience`

**Files:**
- Create: `supabase/migrations/20260727120500_resolve_segment_audience.sql`

**Interfaces:**
- Consumes: `public.evaluate_segment_rules(uuid) RETURNS TABLE(lead_id uuid)` — já existe (última definição em `supabase/migrations/20260714143649_24b06158-8c85-4bed-aa3b-432a642730c9.sql:126`) e **já trata os dois tipos de segmento**: quando `segments.type = 'static'` ela retorna de `segment_contacts`; caso contrário monta o SQL dinâmico das regras. Não reimplemente nada disso.
- Produces:
  - `public.resolve_segment_audience(p_include uuid[], p_exclude uuid[] DEFAULT '{}', p_limit integer DEFAULT NULL) RETURNS TABLE(lead_id uuid)`
  - `public.count_segment_audience(p_include uuid[], p_exclude uuid[] DEFAULT '{}') RETURNS integer`

- [ ] **Step 1: Criar a migration**

Crie `supabase/migrations/20260727120500_resolve_segment_audience.sql` com exatamente este conteúdo:

```sql
-- Fonte de verdade ÚNICA da audiência: união(inclusões) menos união(exclusões).
-- Usada pelo wizard de campanhas (contagem e preview), pelo send-campaign e pelo
-- journey_enroll_segment. Uma implementação só -- é o que garante que o número
-- mostrado na tela e o número efetivamente enviado não possam divergir.
--
-- p_include vazio = TODOS os contatos (preserva a semântica de segment_id NULL).
-- p_limit NULL = sem limite (LIMIT NULL, em Postgres, não limita).
CREATE OR REPLACE FUNCTION public.resolve_segment_audience(
  p_include uuid[],
  p_exclude uuid[] DEFAULT '{}',
  p_limit   integer DEFAULT NULL
)
RETURNS TABLE(lead_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_include uuid[] := COALESCE(p_include, '{}'::uuid[]);
  v_exclude uuid[] := COALESCE(p_exclude, '{}'::uuid[]);
  v_missing uuid;
BEGIN
  -- Mesmas guardas de evaluate_segment_rules.
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'anon' THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  -- Rede final contra o pior modo de falha: um segmento de EXCLUSÃO que não existe
  -- mais silenciosamente deixaria de excluir, e o envio iria para quem não deveria
  -- receber. Falhamos ruidosamente. O trigger guard_segment_delete já impede que
  -- isso aconteça em uso legítimo.
  SELECT s INTO v_missing
    FROM unnest(v_include || v_exclude) AS s
   WHERE NOT EXISTS (SELECT 1 FROM public.segments g WHERE g.id = s)
   LIMIT 1;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'segmento % não existe mais', v_missing;
  END IF;

  RETURN QUERY
  WITH inc AS (
    -- Sem inclusões => a base é a lista inteira de leads.
    SELECT l.id AS lead_id
      FROM public.leads l
     WHERE cardinality(v_include) = 0
    UNION  -- UNION (não ALL): é aqui que a sobreposição entre segmentos é deduplicada
    SELECT e.lead_id
      FROM unnest(v_include) AS s(id)
      CROSS JOIN LATERAL public.evaluate_segment_rules(s.id) AS e
  ),
  exc AS (
    SELECT e.lead_id
      FROM unnest(v_exclude) AS s(id)
      CROSS JOIN LATERAL public.evaluate_segment_rules(s.id) AS e
  )
  SELECT i.lead_id
    FROM inc i
   WHERE NOT EXISTS (SELECT 1 FROM exc x WHERE x.lead_id = i.lead_id)
   LIMIT p_limit;
END $function$;

-- Uma linha sobre a função acima, de propósito: não pode existir uma segunda
-- implementação capaz de divergir do que é realmente enviado.
CREATE OR REPLACE FUNCTION public.count_segment_audience(
  p_include uuid[],
  p_exclude uuid[] DEFAULT '{}'
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*)::int
    FROM public.resolve_segment_audience(p_include, p_exclude, NULL);
$function$;

REVOKE ALL ON FUNCTION public.resolve_segment_audience(uuid[], uuid[], integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_segment_audience(uuid[], uuid[])            FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_segment_audience(uuid[], uuid[], integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_segment_audience(uuid[], uuid[])            TO authenticated, service_role;
```

- [ ] **Step 2: Conferir que `has_role` e `app_role` existem com essa assinatura**

```bash
grep -rn "has_role(auth.uid(), 'admin'::app_role)" supabase/migrations/20260714143649_24b06158-8c85-4bed-aa3b-432a642730c9.sql | head -2
```

Esperado: pelo menos uma ocorrência (é o mesmo par de guardas usado por `evaluate_segment_rules` e `preview_segment_rules`). Se não aparecer, **pare e reporte**.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727120500_resolve_segment_audience.sql
git commit -m "Adiciona RPCs resolve_segment_audience e count_segment_audience

Fonte de verdade única da audiência (união de inclusões menos exclusões),
construída sobre evaluate_segment_rules. Levanta exceção se um segmento
referenciado não existir mais, para que uma exclusão nunca desapareça
em silêncio."
git push
```

---

## Task 3: Migration — `journey_enroll_segment` com múltiplos segmentos

**Files:**
- Create: `supabase/migrations/20260727121000_journey_enroll_segment_multi.sql`

**Interfaces:**
- Consumes: `public.resolve_segment_audience(uuid[], uuid[], integer)` (Task 2).
- Produces: `public.journey_enroll_segment(p_journey_id uuid, p_limit integer DEFAULT 500) RETURNS integer` — mesma assinatura de hoje, chamada pelo `journey-worker` (`supabase/functions/journey-worker/index.ts:522`). Passa a ler `entry_config.segment_ids` / `entry_config.excluded_segment_ids`, com fallback para `entry_config.segment_id`.

**Contexto:** a versão vigente está em `supabase/migrations/20260714143949_b088288e-939b-4ab1-9111-3a65936a9144.sql:51`. Copie a estrutura dela — o bloco `NOT EXISTS` de reentrada/cooldown e o `ON CONFLICT DO NOTHING` **não podem mudar**. A única alteração é a origem dos candidatos e o `context` gravado.

- [ ] **Step 1: Criar a migration**

Crie `supabase/migrations/20260727121000_journey_enroll_segment_multi.sql` com exatamente este conteúdo:

```sql
-- journey_enroll_segment passa a aceitar múltiplos segmentos de entrada e de
-- exclusão, lendo entry_config.segment_ids / entry_config.excluded_segment_ids.
-- Fluxos antigos, que guardam { "segment_id": "..." }, continuam funcionando sem
-- backfill. Toda a lógica de reentrada, cooldown e ON CONFLICT é a mesma.
CREATE OR REPLACE FUNCTION public.journey_enroll_segment(
  p_journey_id uuid,
  p_limit integer DEFAULT 500
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_j       public.journeys%ROWTYPE;
  v_include uuid[];
  v_exclude uuid[];
  v_count   integer := 0;
BEGIN
  SELECT * INTO v_j FROM public.journeys WHERE id = p_journey_id;
  IF NOT FOUND OR v_j.status <> 'active' OR v_j.entry_type <> 'segment' OR v_j.entry_node_id IS NULL THEN
    RETURN 0;
  END IF;

  IF jsonb_typeof(v_j.entry_config->'segment_ids') = 'array' THEN
    SELECT ARRAY(
      SELECT t.value::uuid
        FROM jsonb_array_elements_text(v_j.entry_config->'segment_ids') AS t(value)
    ) INTO v_include;
  ELSE
    -- Formato legado: { "segment_id": "..." }
    v_include := CASE
      WHEN nullif(v_j.entry_config->>'segment_id', '') IS NULL THEN '{}'::uuid[]
      ELSE ARRAY[(v_j.entry_config->>'segment_id')::uuid]
    END;
  END IF;

  IF jsonb_typeof(v_j.entry_config->'excluded_segment_ids') = 'array' THEN
    SELECT ARRAY(
      SELECT t.value::uuid
        FROM jsonb_array_elements_text(v_j.entry_config->'excluded_segment_ids') AS t(value)
    ) INTO v_exclude;
  ELSE
    v_exclude := '{}'::uuid[];
  END IF;

  -- DIFERENÇA DELIBERADA EM RELAÇÃO A CAMPANHAS: aqui inclusão vazia significa
  -- "não inscreva ninguém", não "todos os contatos". É o mesmo guard do
  -- `IF v_segment IS NULL THEN RETURN 0` da versão anterior -- um fluxo sem
  -- segmento de entrada nunca deve varrer a base inteira.
  IF cardinality(v_include) = 0 THEN
    RETURN 0;
  END IF;

  WITH cand AS (
    SELECT a.lead_id
    FROM public.resolve_segment_audience(v_include, v_exclude, NULL) a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.journey_runs r
       WHERE r.journey_id = p_journey_id
         AND r.lead_id = a.lead_id
         AND (
               v_j.reentry = 'once'
            OR r.state IN ('active','waiting')
            OR r.updated_at > now() - make_interval(hours => v_j.reentry_cooldown_hours)
         )
    )
    LIMIT p_limit
  ), ins AS (
    INSERT INTO public.journey_runs (journey_id, lead_id, current_node_id, state, wakeup_at, context)
    SELECT p_journey_id, c.lead_id, v_j.entry_node_id, 'active', now(),
           jsonb_build_object(
             'entry', 'segment',
             'segment_ids', to_jsonb(v_include),
             'excluded_segment_ids', to_jsonb(v_exclude)
           )
    FROM cand c
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;

  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.journey_enroll_segment(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.journey_enroll_segment(uuid, integer) TO service_role;
```

- [ ] **Step 2: Conferir que nada mais lê `context->>'segment_id'`**

```bash
grep -rn "context->>'segment_id'\|context.segment_id" supabase/ src/
```

Esperado: **nenhum resultado**. Se houver, aquele consumidor precisa aceitar o formato novo — **pare e reporte** antes de commitar.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727121000_journey_enroll_segment_multi.sql
git commit -m "journey_enroll_segment aceita múltiplos segmentos e exclusões

Lê entry_config.segment_ids/excluded_segment_ids com fallback para o
formato legado segment_id. Reentrada, cooldown e ON CONFLICT inalterados."
git push
```

---

## Task 4: `send-campaign` resolve a audiência pela RPC

**Files:**
- Modify: `supabase/functions/send-campaign/index.ts:163-196`

**Interfaces:**
- Consumes: `resolve_segment_audience(p_include, p_exclude, p_limit)` (Task 2); colunas `segment_ids` / `excluded_segment_ids` (Task 1).
- Produces: nada para tarefas seguintes.

**Contexto crítico:** este arquivo tem um CAS atômico de claim (`status -> 'sending'`) na linha ~136 e um enfileiramento em **duas passadas estritamente ordenadas**. Não toque em nada disso. `releaseClaim()` só pode ser chamado enquanto `publishedAny === false` — no ponto que você vai editar isso ainda é verdade, então chamá-lo ali é seguro e é o comportamento correto.

- [ ] **Step 1: Substituir o bloco de resolução de audiência**

Localize o bloco atual (linhas 163–196), que começa em `// ---- Resolucao de audiencia (identica a versao anterior) ---` e termina antes de `// ================= CANAL WHATSAPP`. Substitua o bloco **inteiro** por:

```ts
    // ---- Resolucao de audiencia (multi-segmento) ----------------------------
    // Toda a lógica de união/exclusão/deduplicação vive na RPC
    // resolve_segment_audience -- a MESMA que o wizard usa para exibir a contagem.
    // Duas implementações separadas divergiriam, e a divergência apareceria como
    // "o card dizia 500 e saíram 480".
    //
    // Retrocompatibilidade: campanhas criadas antes da migration só têm
    // `segment_id`. Arrays vazios + segment_id nulo = todos os contatos.
    const includeIds: string[] = Array.isArray(campaign.segment_ids) && campaign.segment_ids.length > 0
      ? campaign.segment_ids.map(String)
      : (campaign.segment_id ? [String(campaign.segment_id)] : []);
    const excludeIds: string[] = Array.isArray(campaign.excluded_segment_ids)
      ? campaign.excluded_segment_ids.map(String)
      : [];

    // Teto de 5000 SOMENTE no caminho "todos os contatos" -- é exatamente o
    // `.limit(5000)` que existia antes. Com segmentos de inclusão não há teto,
    // que também é o comportamento anterior.
    const { data: audience, error: audErr } = await supabase.rpc("resolve_segment_audience", {
      p_include: includeIds,
      p_exclude: excludeIds,
      p_limit: includeIds.length === 0 ? 5000 : null,
    });

    if (audErr) {
      // Nada foi publicado na fila ainda, então desfazer o claim é seguro e é o
      // que mantém a campanha reenfileirável. Um segmento apagado cai aqui (a RPC
      // levanta exceção de propósito) -- falha visível em vez de enviar para a
      // audiência errada.
      console.error("send-campaign resolve_segment_audience error:", audErr);
      await releaseClaim();
      return json({ error: `falha ao resolver a audiência: ${audErr.message}` }, 500);
    }

    const audienceIds = ((audience as Array<{ lead_id: string }> | null) || []).map((r) => r.lead_id);

    let leads: any[] = [];
    for (let i = 0; i < audienceIds.length; i += 200) {
      const batch = audienceIds.slice(i, i + 200);
      const { data, error: lErr } = await supabase.from("leads").select("*").in("id", batch);
      if (lErr) {
        console.error("send-campaign fetch leads error:", lErr);
        await releaseClaim();
        return json({ error: `falha ao carregar os contatos da audiência: ${lErr.message}` }, 500);
      }
      if (data) leads.push(...data);
    }
```

- [ ] **Step 2: Verificar que `leads` não é declarado duas vezes**

```bash
grep -n "let leads" supabase/functions/send-campaign/index.ts
```

Esperado: **exatamente uma** ocorrência (a que você acabou de escrever). A declaração antiga `let leads: any[] = [];` fazia parte do bloco removido — se aparecerem duas, você não apagou o bloco inteiro.

- [ ] **Step 3: Verificar que o resto do arquivo continua intacto**

```bash
grep -n "STARTABLE\|publishedAny = true\|PASSADA 1\|PASSADA 2\|finalize_campaign_if_drained" supabase/functions/send-campaign/index.ts
```

Esperado: `STARTABLE` definido e usado, `publishedAny = true` presente uma vez, os dois comentários de passada presentes, `finalize_campaign_if_drained` em três lugares (whatsapp, saída antecipada, fechamento defensivo).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-campaign/index.ts
git commit -m "send-campaign resolve a audiência via resolve_segment_audience

Múltiplos segmentos de inclusão e exclusão, com a mesma RPC que o wizard
usa para exibir a contagem. Claim, duas passadas e finalize inalterados."
git push
```

---

## Task 5: Helpers de audiência no frontend

**Files:**
- Create: `src/lib/campaignAudience.ts`
- Create: `src/hooks/useSegmentAudience.tsx`

**Interfaces:**
- Consumes: RPCs da Task 2.
- Produces:
  - `includeSegmentIds(c): string[]`, `excludeSegmentIds(c): string[]`, `describeAudience(include, exclude, names): string` — de `@/lib/campaignAudience`
  - `useSegmentAudience(include: string[], exclude: string[], enabled?: boolean): { count: number; previewNames: string[]; loading: boolean; error: string | null }` — de `@/hooks/useSegmentAudience`

- [ ] **Step 1: Criar `src/lib/campaignAudience.ts`**

```ts
// Normalização e rótulo da audiência de uma campanha.
//
// Retrocompatibilidade: campanhas anteriores à migration multi-segmento só têm
// `segment_id`. A regra é sempre a mesma, aqui e no send-campaign: arrays quando
// existirem, senão o segment_id legado, senão vazio (= todos os contatos).

export interface AudienceSource {
  segment_id?: string | null;
  segment_ids?: string[] | null;
  excluded_segment_ids?: string[] | null;
}

export function includeSegmentIds(c: AudienceSource): string[] {
  if (Array.isArray(c.segment_ids) && c.segment_ids.length > 0) return c.segment_ids;
  return c.segment_id ? [c.segment_id] : [];
}

export function excludeSegmentIds(c: AudienceSource): string[] {
  return Array.isArray(c.excluded_segment_ids) ? c.excluded_segment_ids : [];
}

// Rótulo curto para a coluna "Segmento" da lista e para o cabeçalho do detalhe.
// `names` mapeia id -> nome; um id ausente é um segmento apagado depois de a
// campanha ter sido enviada (a guarda do banco só permite apagar nesse caso).
export function describeAudience(
  include: string[],
  exclude: string[],
  names: Record<string, string>,
): string {
  const label = (ids: string[]) => ids.map(id => names[id] || 'Segmento removido').join(', ');

  const base = include.length === 0
    ? 'Todos os contatos'
    : include.length <= 2
      ? label(include)
      : `${include.length} segmentos`;

  if (exclude.length === 0) return base;

  const excluded = exclude.length === 1 ? label(exclude) : `${exclude.length} segmentos`;
  return `${base} — exceto ${excluded}`;
}
```

- [ ] **Step 2: Criar `src/hooks/useSegmentAudience.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Contagem e amostra de nomes da audiência (união de inclusões menos exclusões),
// vindas das RPCs count_segment_audience / resolve_segment_audience -- as MESMAS
// que o send-campaign usa. É o que garante que o número exibido seja o número
// enviado.
//
// Debounce porque cada mudança de seleção dispara SQL dinâmico sobre `leads`:
// clicar em quatro segmentos seguidos não deve gerar quatro varreduras.
const DEBOUNCE_MS = 400;
const PREVIEW_LIMIT = 3;

export function useSegmentAudience(include: string[], exclude: string[], enabled = true) {
  const [count, setCount] = useState(0);
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chaves estáveis: o efeito não pode reagir à identidade dos arrays (que muda a
  // cada render do pai) nem à ordem em que o admin clicou nos segmentos.
  const incKey = JSON.stringify([...include].sort());
  const excKey = JSON.stringify([...exclude].sort());

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      const p_include = JSON.parse(incKey) as string[];
      const p_exclude = JSON.parse(excKey) as string[];

      const [countRes, sampleRes] = await Promise.all([
        supabase.rpc('count_segment_audience' as any, { p_include, p_exclude }),
        supabase.rpc('resolve_segment_audience' as any, { p_include, p_exclude, p_limit: PREVIEW_LIMIT }),
      ]);

      if (cancelled) return;

      const rpcErr = countRes.error || sampleRes.error;
      if (rpcErr) {
        console.error('useSegmentAudience RPC error:', rpcErr);
        setError(rpcErr.message);
        setCount(0);
        setPreviewNames([]);
        setLoading(false);
        return;
      }

      setError(null);
      setCount(typeof countRes.data === 'number' ? countRes.data : 0);

      const ids = ((sampleRes.data as unknown as Array<{ lead_id: string }>) || []).map(r => r.lead_id);
      if (ids.length === 0) {
        setPreviewNames([]);
      } else {
        const { data: leads } = await supabase.from('leads').select('nome').in('id', ids);
        if (cancelled) return;
        setPreviewNames((leads || []).map(l => l.nome || 'Sem nome'));
      }

      if (!cancelled) setLoading(false);
    }, DEBOUNCE_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [incKey, excKey, enabled]);

  return { count, previewNames, loading, error };
}
```

- [ ] **Step 3: Verificar o typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sai com código 0 e nenhuma saída.

- [ ] **Step 4: Commit**

```bash
git add src/lib/campaignAudience.ts src/hooks/useSegmentAudience.tsx
git commit -m "Adiciona helpers de audiência multi-segmento

campaignAudience normaliza os arrays (com fallback para segment_id legado)
e monta o rótulo; useSegmentAudience busca contagem e amostra pelas RPCs,
com debounce."
git push
```

---

## Task 6: `SegmentMultiSelect` e mensagem de exclusão bloqueada

**Files:**
- Create: `src/components/admin/segments/SegmentMultiSelect.tsx`
- Modify: `src/hooks/useSegments.tsx` (função `deleteSegment`)

**Interfaces:**
- Consumes: `useSegments()` de `@/hooks/useSegments` — devolve `{ segments: Segment[], counts: Record<string, number> }`, onde `Segment` tem `id`, `name`, `type: 'static' | 'dynamic'`.
- Produces:
```ts
interface SegmentMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;   // texto do botão quando nada está selecionado
  disabledIds?: string[]; // ids indisponíveis (ex.: já usados no outro campo)
  disabled?: boolean;
}
export function SegmentMultiSelect(props: SegmentMultiSelectProps): JSX.Element
```

- [ ] **Step 1: Criar o componente**

```tsx
import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSegments } from '@/hooks/useSegments';
import { cn } from '@/lib/utils';

interface SegmentMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  // Ids que não podem ser escolhidos aqui porque já estão no outro campo -- o
  // mesmo segmento em inclusão e exclusão resultaria sempre em zero contatos.
  disabledIds?: string[];
  disabled?: boolean;
}

export function SegmentMultiSelect({
  value,
  onChange,
  placeholder = 'Selecione os segmentos',
  disabledIds = [],
  disabled = false,
}: SegmentMultiSelectProps) {
  const { segments, counts } = useSegments();
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  };

  const nameOf = (id: string) => segments.find((s: any) => s.id === id)?.name || 'Segmento removido';

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn(value.length === 0 && 'text-muted-foreground')}>
              {value.length === 0
                ? placeholder
                : `${value.length} ${value.length === 1 ? 'segmento selecionado' : 'segmentos selecionados'}`}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar segmento..." />
            <CommandList>
              <CommandEmpty>Nenhum segmento encontrado.</CommandEmpty>
              <CommandGroup>
                {segments.map((s: any) => {
                  const isDisabled = disabledIds.includes(s.id);
                  return (
                    <CommandItem
                      key={s.id}
                      value={s.name}
                      disabled={isDisabled}
                      onSelect={() => !isDisabled && toggle(s.id)}
                      className={cn(isDisabled && 'opacity-40')}
                    >
                      <Check className={cn('mr-2 h-4 w-4', value.includes(s.id) ? 'opacity-100' : 'opacity-0')} />
                      <span className="flex-1 truncate">{s.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground shrink-0">
                        {s.type === 'dynamic' ? 'dinâmico' : 'estático'} · {counts[s.id] ?? 0}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(id => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {nameOf(id)}
              <button
                type="button"
                onClick={() => toggle(id)}
                disabled={disabled}
                aria-label={`Remover ${nameOf(id)}`}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que `Command` exporta os subcomponentes usados**

```bash
grep -n "^export {" -A 12 src/components/ui/command.tsx
```

Esperado: `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList` na lista de exports. Se algum faltar, **pare e reporte**.

- [ ] **Step 3: Mostrar a mensagem real quando o banco recusar a exclusão**

A guarda `guard_segment_delete` (Task 1) recusa apagar um segmento em uso com uma mensagem que nomeia a campanha ou o fluxo responsável. Hoje `deleteSegment` descarta isso e exibe um genérico "Erro ao excluir segmento", que deixaria o admin sem saber o que fazer.

Em `src/hooks/useSegments.tsx`, substitua o corpo de `deleteSegment` por:

```ts
  const deleteSegment = async (id: string) => {
    const { error } = await supabase.from('segments').delete().eq('id', id);
    if (error) {
      // A guarda do banco (guard_segment_delete) recusa apagar um segmento usado
      // por campanha não enviada ou fluxo ativo, e a mensagem dela já nomeia quem
      // está usando -- é a única informação acionável que o admin recebe.
      toast.error(error.message || 'Erro ao excluir segmento');
      return;
    }
    toast.success('Segmento excluído');
    fetchSegments();
  };
```

- [ ] **Step 4: Verificar o typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sai com código 0 e nenhuma saída.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/segments/SegmentMultiSelect.tsx src/hooks/useSegments.tsx
git commit -m "Adiciona SegmentMultiSelect, seleção múltipla de segmentos

Combobox sobre Popover + Command, com tipo e contagem por segmento, chips
removíveis e bloqueio dos ids já usados no campo oposto. deleteSegment passa
a exibir a mensagem do banco, que nomeia quem ainda usa o segmento."
git push
```

---

## Task 7: `useCampaigns` — arrays na criação, atualização e listagem

**Files:**
- Modify: `src/hooks/useCampaigns.tsx`

**Interfaces:**
- Consumes: `includeSegmentIds`, `excludeSegmentIds`, `describeAudience` (Task 5); colunas da Task 1.
- Produces:
  - `Campaign` ganha `segment_ids: string[]` e `excluded_segment_ids: string[]`
  - `createCampaign(data)` — `segment_id: string | null` **sai** do payload; entram `segment_ids: string[]` e `excluded_segment_ids: string[]`
  - `updateCampaign(id, data): Promise<boolean>` — novo, onde `data` é `{ name, segment_ids, excluded_segment_ids, subject, body, design, scheduled_at, status }`

- [ ] **Step 1: Acrescentar os campos à interface `Campaign`**

Em `src/hooks/useCampaigns.tsx`, na interface `Campaign` (linha ~5), logo abaixo de `segment_id: string | null;`, adicione:

```ts
  segment_ids: string[];
  excluded_segment_ids: string[];
```

- [ ] **Step 2: Trocar a montagem de `segment_name` na listagem**

No topo do arquivo, junto aos imports existentes:

```ts
import { includeSegmentIds, excludeSegmentIds, describeAudience } from '@/lib/campaignAudience';
```

Em `fetchCampaigns`, substitua o bloco que busca os nomes dos segmentos (hoje `const segIds = [...new Set(raw.filter(c => c.segment_id).map(c => c.segment_id))]` e o `segMap` correspondente) por:

```ts
    // Agora um campanha pode referenciar N segmentos de inclusão e N de exclusão.
    // Buscamos os nomes de todos de uma vez e deixamos describeAudience montar o
    // rótulo -- a mesma função usada no detalhe, para os dois não divergirem.
    const segIds = [...new Set(
      raw.flatMap(c => [...includeSegmentIds(c), ...excludeSegmentIds(c)])
    )];
    let segMap: Record<string, string> = {};
    if (segIds.length > 0) {
      const { data: segs } = await supabase.from('segments').select('id, name').in('id', segIds);
      if (segs) segMap = Object.fromEntries(segs.map(s => [s.id, s.name]));
    }
```

E, no `raw.map(...)` que monta `parsed`, substitua a linha do `segment_name` por:

```ts
      segment_ids: Array.isArray(c.segment_ids) ? c.segment_ids : [],
      excluded_segment_ids: Array.isArray(c.excluded_segment_ids) ? c.excluded_segment_ids : [],
      segment_name: describeAudience(includeSegmentIds(c), excludeSegmentIds(c), segMap),
```

- [ ] **Step 3: Trocar a assinatura de `createCampaign`**

Substitua a declaração de `createCampaign` (linha ~181) por:

```ts
  const createCampaign = async (data: {
    name: string;
    channel: 'email' | 'whatsapp';
    // `segment_id` não entra mais no payload: o trigger trg_sync_campaign_legacy_segment_id
    // o deriva de segment_ids[1] no banco. Enviá-lo daqui só criaria uma segunda
    // fonte de verdade para o mesmo dado.
    segment_ids: string[];
    excluded_segment_ids: string[];
    subject: string | null;
    body: string | null;
    scheduled_at: string | null;
    status: string;
  }) => {
    const { data: result, error } = await supabase
      .from('campaigns' as any)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar campanha');
      return null;
    }
    return result as any as Campaign;
  };
```

- [ ] **Step 4: Adicionar `updateCampaign`**

Logo abaixo de `createCampaign`, adicione:

```ts
  // Edição só faz sentido enquanto a campanha ainda não saiu. O filtro de status é
  // reavaliado NO SERVIDOR, no instante do UPDATE: entre o clique do admin e a
  // chegada da requisição, o cron promote-scheduled-campaigns (roda a cada minuto)
  // pode ter promovido a campanha para 'sending'. O .select('id') é o que permite
  // distinguir "atualizei" de "não casou nenhuma linha" -- o PostgREST devolve
  // error: null nos dois casos. Mesmo padrão de cancelSchedule/deleteCampaign.
  const updateCampaign = async (
    id: string,
    data: {
      name: string;
      segment_ids: string[];
      excluded_segment_ids: string[];
      subject: string | null;
      body: string | null;
      design: any;
      scheduled_at: string | null;
      status: string;
    },
  ): Promise<boolean> => {
    const { data: rows, error } = await supabase
      .from('campaigns' as any)
      .update({ ...data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .in('status', ['draft', 'scheduled'])
      .select('id');

    if (error) {
      toast.error('Erro ao salvar a campanha');
      return false;
    }
    if (!rows || rows.length === 0) {
      toast.error('A campanha já começou a ser enviada e não pode mais ser editada.');
      fetchCampaigns(); // ressincroniza a UI com o status real
      return false;
    }
    toast.success('Campanha atualizada');
    fetchCampaigns();
    return true;
  };
```

- [ ] **Step 5: Ajustar `duplicateCampaign` e o `return` do hook**

Em `duplicateCampaign`, troque `segment_id: campaign.segment_id,` por:

```ts
      segment_ids: includeSegmentIds(campaign),
      excluded_segment_ids: excludeSegmentIds(campaign),
```

E acrescente `updateCampaign,` ao objeto retornado pelo hook, logo após `createCampaign,`.

- [ ] **Step 6: Verificar o typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: **falha esperada** com erro em `src/components/admin/campaigns/CampaignWizard.tsx`, porque o wizard ainda chama `createCampaign` com `segment_id`. É exatamente o erro que a Task 8 corrige. Confirme que **não há** erro em nenhum outro arquivo.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useCampaigns.tsx
git commit -m "useCampaigns lê e escreve a audiência multi-segmento

createCampaign passa a receber segment_ids/excluded_segment_ids (a coluna
legada é derivada por trigger), duplicateCampaign copia os dois arrays e a
lista monta o rótulo com describeAudience. Novo updateCampaign, restrito a
draft/scheduled e protegido contra corrida com o cron de agendamento."
git push
```

---

## Task 8: `CampaignWizard` — criação com múltiplos segmentos

**Files:**
- Modify: `src/components/admin/campaigns/CampaignWizard.tsx`

**Interfaces:**
- Consumes: `SegmentMultiSelect` (Task 6), `useSegmentAudience` (Task 5), `createCampaign` com a assinatura nova (Task 7).
- Produces: nada para tarefas seguintes (a Task 9 estende este mesmo arquivo).

- [ ] **Step 1: Trocar os imports e o estado do passo 1**

Nos imports, remova `useSegments` se ele ficar sem uso após este passo e acrescente:

```ts
import { SegmentMultiSelect } from '@/components/admin/segments/SegmentMultiSelect';
import { useSegmentAudience } from '@/hooks/useSegmentAudience';
```

Substitua a linha de estado `const [segmentId, setSegmentId] = useState<string>('all');` por:

```ts
  // Lista vazia = todos os contatos (mesma semântica de segment_id NULL no banco).
  const [segmentIds, setSegmentIds] = useState<string[]>([]);
  const [excludedSegmentIds, setExcludedSegmentIds] = useState<string[]>([]);
```

- [ ] **Step 2: Remover o `useEffect` de contagem e usar o hook**

Apague o `useEffect` inteiro que hoje carrega `contactCount` e `previewLeads` (linhas ~94–125), junto com os estados `const [contactCount, setContactCount] = useState(0);` e `const [previewLeads, setPreviewLeads] = useState<{ nome: string }[]>([]);`. No lugar deles:

```ts
  // Contagem e amostra vêm das MESMAS RPCs que o send-campaign usa para montar a
  // audiência -- antes, o número exibido vinha de `counts[segmentId]` (client) e o
  // envio resolvia por conta própria na Edge Function, dois caminhos que podiam
  // discordar.
  const { count: contactCount, previewNames, loading: audienceLoading } =
    useSegmentAudience(segmentIds, excludedSegmentIds);
```

Substitua também a linha que usa `previewLeads` dentro de `previewWaText`:

```ts
  const previewWaText = (text: string) => {
    const nome = previewNames[0] || 'João Silva';
    return text
      .replace(/\{\{nome\}\}/g, nome)
      .replace(/\{\{email\}\}/g, 'joao@empresa.com')
      .replace(/\{\{empresa\}\}/g, 'Empresa XYZ');
  };
```

- [ ] **Step 3: Substituir o campo de segmento no passo 1**

Substitua o bloco `<div>` que contém `<Label>Segmento de destino</Label>` e todo o `<Select>` + card de contagem (linhas ~348–372) por:

```tsx
            <div>
              <Label>Segmentos de destino</Label>
              <div className="mt-1.5">
                <SegmentMultiSelect
                  value={segmentIds}
                  onChange={setSegmentIds}
                  placeholder="Todos os contatos"
                  disabledIds={excludedSegmentIds}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Os contatos de todos os segmentos escolhidos são somados, sem repetição.
                Deixe vazio para enviar a todos os contatos.
              </p>
            </div>

            <div>
              <Label>Excluir contatos de (opcional)</Label>
              <div className="mt-1.5">
                <SegmentMultiSelect
                  value={excludedSegmentIds}
                  onChange={setExcludedSegmentIds}
                  placeholder="Nenhuma exclusão"
                  disabledIds={segmentIds}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Quem estiver em qualquer um destes segmentos não recebe a campanha, mesmo
                que também esteja nos segmentos de destino.
              </p>
            </div>

            <Card>
              <CardContent className="py-3 px-4">
                {audienceLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      {contactCount} {contactCount === 1 ? 'contato receberá' : 'contatos receberão'} esta campanha
                    </p>
                    {previewNames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {previewNames.join(', ')}
                        {contactCount > previewNames.length && ` e mais ${contactCount - previewNames.length}`}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
```

- [ ] **Step 4: Atualizar a linha "Segmento" do passo de Revisão**

Substitua o bloco que hoje mostra `{segmentId === 'all' ? 'Todos os contatos' : segments.find(...)?.name} ({contactCount})` por:

```tsx
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground shrink-0">Segmentos</span>
                  <span className="font-medium text-right">
                    {segmentIds.length === 0 ? 'Todos os contatos' : `${segmentIds.length} de destino`}
                    {excludedSegmentIds.length > 0 && ` — exceto ${excludedSegmentIds.length}`}
                    {` (${contactCount})`}
                  </span>
                </div>
```

- [ ] **Step 5: Atualizar a chamada a `createCampaign`**

Em `handleSend`, substitua `segment_id: segmentId === 'all' ? null : segmentId,` por:

```ts
      segment_ids: segmentIds,
      excluded_segment_ids: excludedSegmentIds,
```

- [ ] **Step 6: Verificar o typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sai com código 0 e nenhuma saída. Se ainda houver erro sobre `segments` ou `counts` não usados, remova o `const { segments, counts } = useSegments();` e o import correspondente.

- [ ] **Step 7: Verificação visual**

Run: `npm run dev` e abra `http://localhost:8080/campaigns` → "Nova campanha".
Verifique, no passo "Configuração":
1. Os dois combobox aparecem; o de destino diz "Todos os contatos" quando vazio.
2. Com nada selecionado, o card mostra o total de contatos da base.
3. Ao escolher dois segmentos que se sobrepõem, o número é **menor** que a soma das duas contagens exibidas dentro do combobox (a união deduplica).
4. Um segmento escolhido no destino aparece esmaecido e não clicável no campo de exclusão.
5. O card mostra skeleton por ~400ms a cada mudança e depois o número.

**Se o card mostrar 0 e o console acusar erro de RPC, é esperado:** as migrations das Tasks 1–3 ainda não foram aplicadas ao banco. Nesse caso, valide apenas os itens 1, 4 e 5, e registre no commit que a validação numérica fica para a Task 11.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/campaigns/CampaignWizard.tsx
git commit -m "Wizard de campanha aceita múltiplos segmentos e exclusões

Dois campos de seleção múltipla no passo de configuração; contagem e
amostra de nomes passam a vir das RPCs de audiência, as mesmas que o
send-campaign usa."
git push
```

---

## Task 9: `CampaignWizard` em modo edição + ação "Editar" na lista

**Files:**
- Modify: `src/components/admin/campaigns/CampaignWizard.tsx`
- Modify: `src/pages/admin/Campaigns.tsx`

**Interfaces:**
- Consumes: `updateCampaign` (Task 7), `includeSegmentIds`/`excludeSegmentIds` (Task 5).
- Produces: `CampaignWizardProps` ganha `campaign?: Campaign` — quando presente, o wizard edita em vez de criar.

- [ ] **Step 1: Estender as props e o estado inicial do wizard**

Substitua a interface e a linha de estado inicial:

```tsx
interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  // Presente = modo edição. Só campanhas em 'draft'/'scheduled' devem ser passadas
  // aqui; o updateCampaign reconfirma isso no servidor de qualquer forma.
  campaign?: Campaign;
}
```

Acrescente aos imports do arquivo:

```ts
import { includeSegmentIds, excludeSegmentIds } from '@/lib/campaignAudience';
import type { Campaign } from '@/hooks/useCampaigns';
```

Troque a assinatura do componente para `export function CampaignWizard({ open, onClose, campaign }: CampaignWizardProps) {` e inicialize o estado a partir da campanha:

```ts
  const isEditing = !!campaign;

  const [name, setName] = useState(campaign?.name ?? '');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>(campaign?.channel ?? 'email');
  const [segmentIds, setSegmentIds] = useState<string[]>(campaign ? includeSegmentIds(campaign) : []);
  const [excludedSegmentIds, setExcludedSegmentIds] = useState<string[]>(campaign ? excludeSegmentIds(campaign) : []);
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>(campaign?.scheduled_at ? 'later' : 'now');
  // datetime-local espera "yyyy-MM-ddTHH:mm" em horário de PAREDE de Brasília --
  // o inverso exato do scheduleInputToIso usado na gravação.
  const [scheduledAt, setScheduledAt] = useState(
    campaign?.scheduled_at
      ? formatInTimeZone(new Date(campaign.scheduled_at), BRASILIA_TIMEZONE, "yyyy-MM-dd'T'HH:mm")
      : '',
  );
```

E o assunto e o corpo:

```ts
  const [subject, setSubject] = useState(campaign?.channel === 'email' ? (campaign.subject ?? '') : '');
  const [waBody, setWaBody] = useState(campaign?.channel === 'whatsapp' ? (campaign.body ?? '') : '');
  const [emailHtml, setEmailHtml] = useState(campaign?.channel === 'email' ? (campaign.body ?? '') : '');
  const [emailDesign, setEmailDesign] = useState<any>((campaign as any)?.design ?? null);
```

**Importante:** `Campaigns.tsx` já monta o wizard dentro de `{wizardOpen && (...)}`, ou seja, ele é remontado a cada abertura — por isso inicializar o estado direto no `useState` é suficiente e não precisa de `useEffect` de sincronização. Não mude esse padrão.

- [ ] **Step 2: Carregar o design salvo no editor Unlayer**

O `onEditorReady` já faz `unlayer.loadDesign(emailDesign)` quando `emailDesign` existe, e `emailDesign` agora nasce preenchido em modo edição. Nenhuma mudança é necessária ali. Apenas confirme:

```bash
grep -n "loadDesign(emailDesign)" src/components/admin/campaigns/CampaignWizard.tsx
```

Esperado: uma ocorrência dentro de `onEditorReady`.

- [ ] **Step 3: Ramificar `handleSend` entre criar e salvar**

Em `handleSend`, logo após as validações de agendamento (depois do bloco `if (scheduledIso && new Date(scheduledIso).getTime() < Date.now() + MIN_SCHEDULE_LEAD_MS)`), insira:

```ts
    // ---- Modo edição: salva e sai, sem disparar envio ----------------------
    // Editar NUNCA envia. Uma campanha 'scheduled' continua agendada (o cron a
    // promove no horário); uma 'draft' continua rascunho. Quem envia é o botão de
    // envio da campanha já criada -- misturar as duas coisas aqui faria "salvar
    // uma correção de texto" virar um disparo para a base inteira.
    if (isEditing && campaign) {
      setSending(true);
      const okSaved = await updateCampaign(campaign.id, {
        name,
        segment_ids: segmentIds,
        excluded_segment_ids: excludedSegmentIds,
        subject: channel === 'email' ? subject : null,
        body: channel === 'email' ? emailHtml : waBody,
        design: channel === 'email' ? emailDesign : null,
        scheduled_at: scheduledIso,
        status: isScheduled ? 'scheduled' : 'draft',
      });
      setSending(false);
      setConfirmOpen(false);
      if (okSaved) onClose();
      return;
    }
```

E acrescente `updateCampaign` à desestruturação do hook:

```ts
  const { createCampaign, updateCampaign } = useCampaigns();
```

- [ ] **Step 4: Ajustar os textos que dizem "enviar"**

Troque o título do diálogo:

```tsx
          <DialogTitle>{isEditing ? 'Editar campanha' : 'Nova campanha'}</DialogTitle>
```

O botão do passo de revisão:

```tsx
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setConfirmOpen(true)}
              disabled={isScheduled && !scheduledAt}
            >
              {isEditing
                ? <><Check className="h-4 w-4 mr-2" /> Salvar alterações</>
                : isScheduled
                  ? <><Clock className="h-4 w-4 mr-2" /> Agendar campanha</>
                  : <><Send className="h-4 w-4 mr-2" /> Enviar campanha</>}
            </Button>
```

E o `AlertDialog` de confirmação:

```tsx
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isEditing ? 'Salvar alterações' : isScheduled ? 'Confirmar agendamento' : 'Confirmar envio'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isEditing
                  ? (isScheduled
                      ? `A campanha continua agendada e será enviada para ${contactCount} contatos em ${scheduledAt ? formatScheduleInput(scheduledAt) : ''}.`
                      : `A campanha continua como rascunho, com ${contactCount} contatos na audiência. Nada será enviado agora.`)
                  : isScheduled
                    ? `A campanha será enviada automaticamente para ${contactCount} contatos em ${scheduledAt ? formatScheduleInput(scheduledAt) : ''}. Você pode cancelar o agendamento até lá.`
                    : `Confirmar envio para ${contactCount} contatos via ${channel === 'email' ? 'email' : 'WhatsApp'}? Esta ação não pode ser desfeita.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
```

E o rótulo do botão de ação do `AlertDialog`:

```tsx
                {sending
                  ? (isEditing ? 'Salvando…' : isScheduled ? 'Agendando…' : 'Enviando…')
                  : (isEditing ? 'Salvar alterações' : isScheduled ? 'Confirmar agendamento' : 'Confirmar envio')}
```

- [ ] **Step 5: Adicionar a ação "Editar" na lista**

Em `src/pages/admin/Campaigns.tsx`, adicione o estado do alvo de edição junto aos demais `useState`:

```ts
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
```

Importe `Pencil` de `lucide-react` (junto aos ícones já importados) e o tipo `Campaign` de `@/hooks/useCampaigns` se ainda não estiver importado.

No `DropdownMenuContent`, logo acima do item "Duplicar", adicione:

```tsx
                          {(c.status === 'draft' || c.status === 'scheduled') && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditCampaign(c); }}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                          )}
```

E, ao lado do `{wizardOpen && (<CampaignWizard ... />)}` existente, adicione:

```tsx
      {editCampaign && (
        <CampaignWizard
          open={!!editCampaign}
          campaign={editCampaign}
          onClose={() => { setEditCampaign(null); refetch(); }}
        />
      )}
```

- [ ] **Step 6: Verificar o typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sai com código 0 e nenhuma saída.

- [ ] **Step 7: Verificação visual**

Run: `npm run dev`, abra `/campaigns`.
1. O menu "..." de uma campanha em rascunho mostra "Editar"; o de uma campanha enviada, **não**.
2. Ao clicar em "Editar": título "Editar campanha", nome/assunto/segmentos preenchidos e o email renderizado no editor Unlayer com o conteúdo salvo.
3. O botão final diz "Salvar alterações" e o diálogo de confirmação diz que nada será enviado agora.
4. Após salvar, a lista reflete o nome e os segmentos novos, e o status **não** mudou.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/campaigns/CampaignWizard.tsx src/pages/admin/Campaigns.tsx
git commit -m "Permite editar campanhas em rascunho e agendadas

O wizard aceita uma campanha existente e salva no lugar de enviar; a lista
ganha a ação Editar para status draft/scheduled."
git push
```

---

## Task 10: Journeys — entrada por múltiplos segmentos na UI

**Files:**
- Modify: `src/components/admin/automations/JourneyCreateDialog.tsx`
- Modify: `src/pages/admin/JourneyBuilder.tsx`
- Modify: `src/components/admin/automations/JourneysTab.tsx`

**Interfaces:**
- Consumes: `SegmentMultiSelect` (Task 6), `useSegmentAudience` (Task 5), `journey_enroll_segment` já atualizada (Task 3).
- Produces: `journeys.entry_config` passa a ser gravado como `{ segment_ids: string[], excluded_segment_ids: string[] }` para `entry_type === 'segment'`.

**Regra de leitura retrocompatível — use exatamente esta, nos três arquivos:**

```ts
const readEntrySegments = (cfg: any): { include: string[]; exclude: string[] } => ({
  include: Array.isArray(cfg?.segment_ids)
    ? cfg.segment_ids
    : (cfg?.segment_id ? [cfg.segment_id] : []),
  exclude: Array.isArray(cfg?.excluded_segment_ids) ? cfg.excluded_segment_ids : [],
});
```

Coloque essa função em `src/lib/journeys.ts` como export nomeado `readEntrySegments` e importe-a em `JourneyBuilder.tsx` e `JourneysTab.tsx` — não a duplique. `JourneyCreateDialog.tsx` **não** precisa dela: ali o fluxo nasce vazio, não há `entry_config` prévio para ler.

- [ ] **Step 1: Adicionar `readEntrySegments` a `src/lib/journeys.ts`**

No final do arquivo:

```ts
// Entrada por segmento aceita N inclusões e N exclusões. Fluxos criados antes
// dessa mudança guardam { segment_id }; a leitura converte no formato novo sem
// precisar de backfill no banco.
export function readEntrySegments(cfg: any): { include: string[]; exclude: string[] } {
  return {
    include: Array.isArray(cfg?.segment_ids)
      ? cfg.segment_ids
      : (cfg?.segment_id ? [cfg.segment_id] : []),
    exclude: Array.isArray(cfg?.excluded_segment_ids) ? cfg.excluded_segment_ids : [],
  };
}
```

- [ ] **Step 2: `JourneyCreateDialog` — dois campos de segmento**

Troque `const [segmentId, setSegmentId] = useState('');` por:

```ts
  const [segmentIds, setSegmentIds] = useState<string[]>([]);
  const [excludedSegmentIds, setExcludedSegmentIds] = useState<string[]>([]);
```

Troque `canSave`:

```ts
  const canSave = name.trim() && (entryType === 'segment' ? segmentIds.length > 0 : !!eventType);
```

Troque o `entry_config` no `handleSave`:

```ts
      entry_config: entryType === 'segment'
        ? { segment_ids: segmentIds, excluded_segment_ids: excludedSegmentIds }
        : { event_type: eventType },
```

E substitua o bloco `{entryType === 'segment' ? (<div className="space-y-1.5"><Label>Segmento</Label>...` (o `Select` de segmento e o texto explicativo) por:

```tsx
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Segmentos de entrada</Label>
                <SegmentMultiSelect
                  value={segmentIds}
                  onChange={setSegmentIds}
                  placeholder="Selecione ao menos um"
                  disabledIds={excludedSegmentIds}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Não inscrever quem estiver em (opcional)</Label>
                <SegmentMultiSelect
                  value={excludedSegmentIds}
                  onChange={setExcludedSegmentIds}
                  placeholder="Nenhuma exclusão"
                  disabledIds={segmentIds}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Entram <strong>todos que já estão em algum dos segmentos agora</strong> e{' '}
                <strong>todos que entrarem depois</strong>, menos quem estiver em algum
                segmento de exclusão. Os segmentos são reavaliados a cada minuto; quem
                passar a atender às regras é inscrito no fluxo (respeitando a reentrada
                abaixo).
              </p>
            </div>
```

Acrescente o import `import { SegmentMultiSelect } from '@/components/admin/segments/SegmentMultiSelect';` e remova `useSegments` se ficar sem uso.

- [ ] **Step 3: `JourneyBuilder` — mesma troca, mais a contagem de ativação**

Substitua o estado `entrySegmentId` por dois arrays, e a linha 94 (que hoje faz `setEntrySegmentId(journey.entry_type === 'segment' ? (journey.entry_config?.segment_id || '') : '')`) por:

```ts
    const entrySegs = readEntrySegments(journey.entry_config);
    setEntrySegmentIds(journey.entry_type === 'segment' ? entrySegs.include : []);
    setEntryExcludedSegmentIds(journey.entry_type === 'segment' ? entrySegs.exclude : []);
```

Substitua o `entry_config` da gravação (linha ~276) por:

```ts
      entry_config: entryType === 'segment'
        ? { segment_ids: entrySegmentIds, excluded_segment_ids: entryExcludedSegmentIds }
        : { event_type: entryEventType },
```

Substitua as duas linhas de contagem/nome (linhas ~328–329) por:

```ts
  // A contagem de ativação precisa refletir união menos exclusão -- somar as
  // contagens individuais dos segmentos contaria duas vezes quem está em dois
  // deles e ignoraria as exclusões.
  const { count: activateSegmentCount } = useSegmentAudience(
    entrySegmentIds,
    entryExcludedSegmentIds,
    entryType === 'segment',
  );
```

Onde `activateSegmentName` era usado no texto do diálogo de confirmação, troque por uma descrição que não dependa de um nome único:

```tsx
                {entrySegmentIds.length === 1 ? 'o segmento selecionado' : `${entrySegmentIds.length} segmentos`}
```

Substitua o `Select` de segmento (linhas ~549–556) pelos dois `SegmentMultiSelect`, marcando `setDirty(true)` em cada mudança:

```tsx
              <div className="space-y-2">
                <SegmentMultiSelect
                  value={entrySegmentIds}
                  onChange={(ids) => { setEntrySegmentIds(ids); setDirty(true); }}
                  placeholder="Segmentos de entrada"
                  disabledIds={entryExcludedSegmentIds}
                />
                <SegmentMultiSelect
                  value={entryExcludedSegmentIds}
                  onChange={(ids) => { setEntryExcludedSegmentIds(ids); setDirty(true); }}
                  placeholder="Não inscrever quem estiver em (opcional)"
                  disabledIds={entrySegmentIds}
                />
              </div>
```

Ajuste também o resumo da linha ~485–486:

```tsx
              {entryType === 'segment'
                ? `Segmentos: ${entrySegmentIds.length === 0 ? '(selecione)' : entrySegmentIds.length}${entryExcludedSegmentIds.length > 0 ? ` — exceto ${entryExcludedSegmentIds.length}` : ''}`
```

E a guarda de ativação (linha ~321) passa a exigir ao menos uma inclusão:

```ts
    if (entryType === 'segment') {
      if (entrySegmentIds.length === 0) {
        toast.error('Selecione ao menos um segmento de entrada');
        return;
      }
      setConfirmActivate(true);
      return;
    }
```

- [ ] **Step 4: `JourneysTab` — contagem do aviso de ativação**

Substitua as linhas ~62–65 por:

```ts
  const confirmSegments = confirmActivate?.entry_type === 'segment'
    ? readEntrySegments(confirmActivate.entry_config)
    : { include: [], exclude: [] };
  // Mesma RPC do wizard e do envio: união menos exclusão, sem contagem dupla.
  const { count: confirmCount } = useSegmentAudience(
    confirmSegments.include,
    confirmSegments.exclude,
    !!confirmActivate,
  );
```

No texto do diálogo, onde hoje aparece o nome de `confirmSegment`, use:

```tsx
                  {confirmSegments.include.length === 1 ? 'o segmento configurado' : `${confirmSegments.include.length} segmentos`}
```

Acrescente os imports de `readEntrySegments` e `useSegmentAudience`, e remova `segments`/`counts` do `useSegments()` se ficarem sem uso.

- [ ] **Step 5: Verificar o typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sai com código 0 e nenhuma saída.

- [ ] **Step 6: Verificação visual**

Run: `npm run dev`, abra `/automations`.
1. "Novo fluxo" → "Quando está em um segmento" mostra os dois campos; "Criar e montar" fica desabilitado sem nenhuma inclusão.
2. No builder, o resumo do topo mostra a quantidade de segmentos e a marca de alteração não salva aparece ao mexer neles.
3. O diálogo de ativação mostra uma contagem (0 se as migrations ainda não foram aplicadas — nesse caso registre isso no commit).

- [ ] **Step 7: Commit**

```bash
git add src/lib/journeys.ts src/components/admin/automations/JourneyCreateDialog.tsx src/components/admin/automations/JourneysTab.tsx src/pages/admin/JourneyBuilder.tsx
git commit -m "Fluxos entram por múltiplos segmentos, com exclusões

entry_config passa a guardar segment_ids/excluded_segment_ids, com leitura
retrocompatível do formato antigo. A contagem do aviso de ativação passa a
usar a RPC de audiência, sem contar duas vezes quem está em dois segmentos."
git push
```

---

## Task 11: Deploy e verificação em produção

**Files:**
- Nenhum arquivo de código. Esta tarefa é o deploy manual e a validação.

**Contexto:** o sync do Lovable publica o frontend, mas **não** aplica migrations nem faz deploy de Edge Functions. Até aqui, nada do que foi feito nas Tasks 1–4 está em produção.

- [ ] **Step 1: Confirmar que tudo está no GitHub**

```bash
git status
git log --oneline -12
```

Esperado: working tree limpo e os commits das Tasks 1–10 presentes. Anote o hash do commit mais recente — ele vai no prompt do passo seguinte.

- [ ] **Step 2: Entregar o prompt de deploy ao usuário**

Apresente ao usuário exatamente este texto, com `XXXXXXX` substituído pelo hash real:

```
Prompt para Lovable:
---
Aplique as migrations abaixo, nesta ordem:
1. supabase/migrations/20260727120000_campaign_multi_segment_columns.sql
2. supabase/migrations/20260727120500_resolve_segment_audience.sql
3. supabase/migrations/20260727121000_journey_enroll_segment_multi.sql

E faça o deploy da edge function `send-campaign`.

Mudanças no código:
1. campaigns ganha segment_ids e excluded_segment_ids (uuid[]), com a coluna
   legada segment_id mantida em sincronia por trigger.
2. A FK campaigns.segment_id -> segments(id) ON DELETE SET NULL foi removida e
   substituída por uma guarda que bloqueia apagar um segmento em uso por
   campanha não enviada ou por fluxo ativo.
3. Novas RPCs resolve_segment_audience e count_segment_audience.
4. journey_enroll_segment passa a aceitar múltiplos segmentos e exclusões.
5. send-campaign resolve a audiência pela RPC nova.

O código já está no repositório GitHub (commit XXXXXXX). Por favor, faça o deploy.
---
```

**Não afirme que o deploy foi feito.** Aguarde a confirmação do usuário antes do próximo passo.

- [ ] **Step 3: Verificar o schema depois do deploy**

Peça ao usuário para rodar no SQL Editor do Supabase (ou rode via CLI/MCP, se autorizado):

```sql
-- 1. Colunas criadas e backfill aplicado: toda campanha com segment_id tem o array.
SELECT count(*) FILTER (WHERE segment_id IS NOT NULL AND cardinality(segment_ids) = 0) AS backfill_pendente,
       count(*) FILTER (WHERE segment_id IS DISTINCT FROM segment_ids[1])              AS fora_de_sincronia
  FROM public.campaigns;
-- Esperado: 0 e 0.

-- 2. A FK antiga saiu.
SELECT conname FROM pg_constraint
 WHERE conrelid = 'public.campaigns'::regclass AND contype = 'f' AND conname LIKE '%segment%';
-- Esperado: nenhuma linha.

-- 3. A união deduplica. Troque os UUIDs por dois segmentos reais que se sobreponham.
SELECT public.count_segment_audience(ARRAY['<seg-a>']::uuid[])                 AS so_a,
       public.count_segment_audience(ARRAY['<seg-b>']::uuid[])                 AS so_b,
       public.count_segment_audience(ARRAY['<seg-a>','<seg-b>']::uuid[])       AS uniao;
-- Esperado: uniao <= so_a + so_b, e uniao >= max(so_a, so_b).

-- 4. A exclusão subtrai.
SELECT public.count_segment_audience(ARRAY['<seg-a>']::uuid[], ARRAY['<seg-b>']::uuid[]) AS a_menos_b;
-- Esperado: a_menos_b = so_a - (quantidade em ambos).

-- 5. Segmento inexistente falha ruidosamente em vez de ignorar a exclusão.
SELECT public.count_segment_audience('{}'::uuid[], ARRAY['00000000-0000-0000-0000-000000000000']::uuid[]);
-- Esperado: ERRO "segmento ... não existe mais".
```

- [ ] **Step 4: Verificar o fluxo ponta a ponta em produção**

Em `https://dnmkt.dnia.ai/campaigns`:
1. Crie uma campanha com **dois segmentos de inclusão que se sobreponham** e **um de exclusão**. Confira que o número do card bate com o `uniao` do passo anterior menos os excluídos.
2. Salve como agendada, saia e reabra pela ação "Editar" — os dois campos devem voltar preenchidos e o email deve reaparecer no editor.
3. Tente excluir, em `/segments`, um dos segmentos usados por essa campanha: deve aparecer a mensagem nomeando a campanha, e a exclusão deve ser recusada.
4. Envie a campanha para um público pequeno e confira:

```sql
SELECT count(*) AS linhas, count(DISTINCT lead_id) AS leads_distintos
  FROM public.campaign_sends WHERE campaign_id = '<id-da-campanha>';
-- Esperado: linhas = leads_distintos = a contagem exibida no card.

SELECT count(*) FROM public.campaign_sends cs
  JOIN public.resolve_segment_audience(ARRAY['<seg-excluido>']::uuid[]) x ON x.lead_id = cs.lead_id
 WHERE cs.campaign_id = '<id-da-campanha>';
-- Esperado: 0 -- ninguém do segmento de exclusão recebeu.
```

- [ ] **Step 5: Reportar o resultado**

Relate ao usuário o que foi verificado e o que **não** foi. Se algum passo falhar, reporte a saída real — não conclua a tarefa como concluída.

---

## Cobertura da spec

| Seção da spec | Tarefa |
|---|---|
| 1. Modelo de dados (colunas, backfill, trigger) | 1 |
| 1.1 Exclusão de segmentos (FK, guarda, exceção da RPC) | 1, 2 |
| 2. RPCs de audiência | 2 |
| 3. `send-campaign` | 4 |
| 4. `SegmentMultiSelect` | 6 |
| 5. Wizard — criação | 5, 7, 8 |
| 6. Wizard — edição de rascunho | 7, 9 |
| 7. Journeys | 3, 10 |
| Verificação | 11 |
