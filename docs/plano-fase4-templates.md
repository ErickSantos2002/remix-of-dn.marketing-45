# Plano de Implementação — Fase 4: Biblioteca de Templates de Email

> Sub-plano detalhado da Fase 4 de `docs/plano-modulo-email-marketing.md`. Segue o formato bite-sized (TDD-like) exigido pelo documento-mãe para as fases 3–6. Executar com `superpowers:subagent-driven-development` ou `superpowers:executing-plans`, tarefa a tarefa.

## Goal

Evoluir o módulo de campanhas existente para uma plataforma de email marketing completa: tracking via webhook Resend, supressão/unsubscribe, fila com agendamento, **biblioteca de templates**, segmentação por eventos e fluxos de automação. Esta fase entrega a biblioteca de templates reutilizáveis: CRUD de templates, UI de gestão (`/templates`) e integração com o `CampaignWizard` para começar uma campanha a partir de um template ou salvar o conteúdo de uma campanha como template novo.

## Architecture

Aproveita a base existente (envio Resend em `send-campaign`/`process-email-queue`, editor Unlayer via `react-email-editor`, `campaign_sends` + trigger que propaga eventos para `contact_events`). Esta fase adiciona: tabela `email_templates` (RLS admin, sem FK para `campaigns` — o vínculo é **por valor**, nunca por referência); Edge Function `templates-api` no padrão CRUD das demais (`campaigns-api`, `segments-api`, `pages-api`, `automations-api`); módulo de configuração compartilhada do editor Unlayer (`emailEditorConfig.ts`) consumido tanto pelo `CampaignWizard` quanto pelo novo `TemplateEditor`; nova rota admin `/templates` com grid de cards e editor em página cheia.

## Tech Stack

React 18 + Vite + shadcn/ui, Supabase (Postgres, Edge Functions Deno, RLS via `has_role`), Resend API, react-email-editor (Unlayer).

## Restrições globais (copiadas de `docs/plano-modulo-email-marketing.md`)

- **Sem test runner no projeto.** Ciclo de verificação: `npm run lint` + `npm run build` (frontend), `supabase functions serve <name>` + `curl` (functions), validação final em produção (`https://dnmkt.dnia.ai`) após o deploy pelo Lovable.
- Toda Edge Function nova DEVE ser registrada em `supabase/config.toml` com `verify_jwt = false` (auth é feita no corpo via `_shared/auth.ts` ou assinatura Svix).
- Não editar `src/integrations/supabase/types.ts` manualmente (regenerar com `supabase gen types typescript`).
- UI em pt-BR; commits em português; `console.*` some no build de prod (Terser) — não confiar em log para comportamento.
- Não escrever em `leads` do browser — mutações só via Edge Functions. (Não se aplica à tabela nova `email_templates`, que é gerida direto pelo client sob RLS admin, no mesmo padrão de `campaigns`.)
- Segredos ficam em Edge Function Secrets (padrão `NexusCard`), nunca em tabela ou no client.
- **Restrição nº 0 — Lovable (obrigatória):** repositório com two-way sync GitHub↔Lovable. Antes de tocar em qualquer arquivo: `git pull`. Ciclo por tarefa: implementar → `npm run lint && npm run build` sem erros → commit em português + `git push` imediato → se a tarefa criou/alterou Edge Function ou migration, entregar ao usuário o prompt de deploy (modelo na seção "Deploy", ao final deste documento) com o hash real do commit. Nunca renomear/mover/deletar o repositório; nunca editar `src/integrations/supabase/types.ts`, `package-lock.json` ou `.lovable/` manualmente.

**Nota de verificação honesta:** `npm run lint` já está vermelho na `main` por erros pré-existentes de `no-explicit-any` (padrão do projeto: `.from('tabela' as any)` porque `types.ts` não é regenerado a cada tabela nova — ver Task 4.1, passo 3). Critério de aceite de cada tarefa é **nenhuma categoria NOVA de erro/warning introduzida**, não "lint limpo". `npm run build` esse sim precisa terminar sem erro (é um `tsc`+Vite build real).

---

## Ordem de execução

```
4.1 Migration email_templates
   │
   ├──► 4.2 Edge Function templates-api (CRUD externo, mesmo padrão de campaigns-api)
   │
   └──► 4.4 Hook useTemplates (client direto, mesmo padrão de useCampaigns)
          │
          ├──► 4.5 Página /templates (grid de cards)
          │
4.3 emailEditorConfig.ts (extração, independente) ──► 4.6 TemplateEditor (página cheia)
   │                                                       │
   └──► 4.7 Integração no CampaignWizard ◄─────────────────┘
```

4.1 e 4.3 podem começar em paralelo. 4.2 é consumida por sistemas externos (n8n etc.), não pela UI admin — a UI fala direto com a tabela via RLS, no mesmo padrão que `CampaignWizard`/`useCampaigns` já usam para `campaigns`.

---

## Task 4.1: Migration `email_templates`

**Files:**
- Create: `supabase/migrations/20260713240000_email_templates.sql`

**Interfaces:**
- Produces: tabela `public.email_templates(id, name, description, category, design jsonb, html text, created_at, updated_at)` com RLS `FOR ALL` restrita a `has_role(auth.uid(),'admin')`. **Sem FK para `campaigns`** — decisão deliberada: campanhas armazenam `design`/`body` próprios (colunas já existentes, migration `20260330014026`); copiar por valor no momento da seleção do template é o que garante que editar/excluir um template depois nunca altera uma campanha já criada a partir dele.

- [ ] **Step 1:** Criar o arquivo com o conteúdo abaixo (segue exatamente o padrão de `email_tracking.sql`/`email_suppressions`: `has_role(auth.uid(), 'admin'::app_role)`, `DROP POLICY IF EXISTS` antes de recriar, reuso da função genérica `public.update_updated_at_column()` já usada por `campaigns` desde a migration `20260330013031`):

```sql
-- ============================================================================
-- Fase 4 — Biblioteca de templates de email reutilizáveis.
-- Tabela email_templates: guarda o design (JSON do Unlayer) + o html já
-- exportado, consumida pela UI /templates e pelo seletor "Começar de um
-- template" no CampaignWizard.
--
-- IMPORTANTE: templates são copiados POR VALOR para dentro da campanha no
-- momento da seleção (loadDesign local no editor + design/html gravados nas
-- colunas próprias de `campaigns`) — NUNCA por referência. Por isso esta
-- tabela não tem, e não deve ganhar, nenhuma FK vinda de `campaigns`. Editar
-- ou excluir um template depois de usado não pode alterar campanhas já
-- criadas a partir dele.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  design jsonb,
  html text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates (category);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON public.email_templates (created_at DESC);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Reusa a função genérica já usada por campaigns (migration 20260330013031)
-- e por várias outras tabelas administrativas do projeto — não criar uma
-- função de trigger duplicada.
DROP TRIGGER IF EXISTS trg_email_templates_updated ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

- [ ] **Step 2:** Aplicar via `supabase db push` (ou incluir no prompt de deploy do Lovable — ver seção "Deploy" ao final).

- [ ] **Step 3:** Regenerar tipos, se o CLI estiver logado no projeto: `supabase gen types typescript --project-id kfhojzdcnpuntynodsff > src/integrations/supabase/types.ts`. **Se não for possível regenerar agora** (mesma situação já registrada para as tabelas das Fases 1–3: `email_events`, `email_suppressions`, `email_queue` — `types.ts` não foi regenerado para elas), usar o workaround já sancionado no projeto: todo acesso a `email_templates` pelo client usa `.from('email_templates' as any)` com um comentário curto apontando para este parágrafo. Isso é esperado, não é dívida nova.

- [ ] **Step 4:** Commit: `git add supabase/migrations/20260713240000_email_templates.sql && git commit -m "feat: adiciona tabela email_templates (Fase 4 — biblioteca de templates)" && git push`

---

## Task 4.2: Edge Function `templates-api`

**Files:**
- Create: `supabase/functions/templates-api/index.ts`
- Modify: `supabase/config.toml`

**Interfaces:**
- Consumes: tabela `email_templates` (Task 4.1), `_shared/auth.ts` (`validateAuth`, `ok`, `error`, `unauthorized`, `handleCors` — mesmas funções usadas por `campaigns-api`).
- Produces:
  - `GET /templates-api` (auth `'read'`) → `{ data: EmailTemplate[], pagination }` (filtros opcionais `?category=`, `?page=`, `?limit=`).
  - `GET /templates-api?id=<uuid>` (auth `'read'`) → o registro completo.
  - `POST /templates-api` (auth `'write'`, body `{ name, description?, category?, design?, html? }`) → `{ success: true, template }` (201).
  - `PATCH /templates-api?id=<uuid>` (auth `'write'`, body com os campos a atualizar) → `{ success: true, template }`.
  - `DELETE /templates-api?id=<uuid>` (auth `'write'`) → `{ success: true }`.
  - Este é o CRUD para consumidores externos (API key, n8n etc.), no **mesmo padrão exato** de `campaigns-api` — a UI admin (Tasks 4.4–4.7) fala direto com a tabela via `supabase-js` sob RLS, do mesmo jeito que `useCampaigns` já faz com `campaigns`; `campaigns-api` não tem PATCH/DELETE hoje, então esses dois métodos aqui seguem o mesmo estilo de código (helpers, validação de UUID, guardas de auth) mas são estruturas novas, exigidas explicitamente pela decisão da Fase 4.

- [ ] **Step 1:** Criar a function:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateAuth, unauthorized, ok, error, handleCors } from '../_shared/auth.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)

  if (req.method === 'GET') {
    if (!(await validateAuth(req, sb, 'read'))) return unauthorized()

    const id = url.searchParams.get('id')

    if (id) {
      if (!UUID_RE.test(id)) return error('Invalid id', 400)

      const { data: template, error: tErr } = await sb.from('email_templates').select('*').eq('id', id).single()
      if (tErr || !template) return error('Template não encontrado', 404)

      return ok(template)
    }

    const category = url.searchParams.get('category')
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    let query = sb.from('email_templates').select('*', { count: 'exact' })
    if (category) query = query.eq('category', category)
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: templates, count, error: listErr } = await query
    if (listErr) return error(listErr.message, 500)

    const total = count || 0
    return ok({
      data: templates || [],
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  }

  if (req.method === 'POST') {
    if (!(await validateAuth(req, sb, 'write'))) return unauthorized()

    let body: any
    try { body = await req.json() } catch { body = {} }

    if (!body.name) return error('name é obrigatório')

    const { data: newTemplate, error: createErr } = await sb.from('email_templates').insert({
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      design: body.design || null,
      html: body.html || null,
    }).select().single()

    if (createErr) return error(createErr.message, 500)

    return ok({ success: true, template: newTemplate }, 201)
  }

  if (req.method === 'PATCH') {
    if (!(await validateAuth(req, sb, 'write'))) return unauthorized()

    const id = url.searchParams.get('id')
    if (!id) return error('id é obrigatório')
    if (!UUID_RE.test(id)) return error('Invalid id', 400)

    let body: any
    try { body = await req.json() } catch { body = {} }

    const patch: Record<string, unknown> = {}
    if (body.name !== undefined) patch.name = body.name
    if (body.description !== undefined) patch.description = body.description
    if (body.category !== undefined) patch.category = body.category
    if (body.design !== undefined) patch.design = body.design
    if (body.html !== undefined) patch.html = body.html

    if (Object.keys(patch).length === 0) return error('Nenhum campo para atualizar')

    const { data: updated, error: updErr } = await sb.from('email_templates')
      .update(patch).eq('id', id).select().maybeSingle()

    if (updErr) return error(updErr.message, 500)
    if (!updated) return error('Template não encontrado', 404)

    return ok({ success: true, template: updated })
  }

  if (req.method === 'DELETE') {
    if (!(await validateAuth(req, sb, 'write'))) return unauthorized()

    const id = url.searchParams.get('id')
    if (!id) return error('id é obrigatório')
    if (!UUID_RE.test(id)) return error('Invalid id', 400)

    const { data: deleted, error: delErr } = await sb.from('email_templates')
      .delete().eq('id', id).select('id')

    if (delErr) return error(delErr.message, 500)
    if (!deleted || deleted.length === 0) return error('Template não encontrado', 404)

    return ok({ success: true })
  }

  return error('Method not allowed', 405)
})
```

- [ ] **Step 2:** Registrar em `supabase/config.toml` (ao final do arquivo, mesmo padrão de todas as outras entradas):

```toml
[functions.templates-api]
verify_jwt = false
```

- [ ] **Step 3:** Testar local:
```bash
supabase functions serve templates-api
curl -X POST -H "Authorization: Bearer $WEBHOOK_SECRET" -H "Content-Type: application/json" \
  -d '{"name":"Teste","category":"Newsletter","html":"<p>oi</p>"}' \
  http://127.0.0.1:54321/functions/v1/templates-api
curl -H "Authorization: Bearer $WEBHOOK_SECRET" http://127.0.0.1:54321/functions/v1/templates-api
curl -X PATCH -H "Authorization: Bearer $WEBHOOK_SECRET" -H "Content-Type: application/json" \
  -d '{"description":"atualizado"}' \
  "http://127.0.0.1:54321/functions/v1/templates-api?id=<uuid-retornado-no-post>"
curl -X DELETE -H "Authorization: Bearer $WEBHOOK_SECRET" \
  "http://127.0.0.1:54321/functions/v1/templates-api?id=<uuid>"
```
Esperado: POST 201 com `template`; GET lista o registro; PATCH devolve `description` atualizada; DELETE devolve `{success:true}` e um GET subsequente por esse id devolve 404.

- [ ] **Step 4:** Commit: `git add supabase/functions/templates-api supabase/config.toml && git commit -m "feat: adiciona Edge Function templates-api (CRUD de templates de email)" && git push`

---

## Task 4.3: Extrair configuração compartilhada do editor Unlayer

**Files:**
- Create: `src/components/admin/campaigns/emailEditorConfig.ts`
- Modify: `src/components/admin/campaigns/CampaignWizard.tsx`

**Interfaces:**
- Produces: `EMAIL_MERGE_TAGS`, `BASE_EMAIL_DESIGN`, `EMAIL_EDITOR_OPTIONS`, `registerEmailImageUpload(unlayer, folder)` — consumidos por `CampaignWizard.tsx` (Task 4.3, 4.7) e por `TemplateEditor.tsx` (Task 4.6). Único ponto de verdade: nenhum dos dois componentes deve voltar a declarar `mergeTags`/tema/upload localmente.

- [ ] **Step 1:** Criar `emailEditorConfig.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Configuração do Unlayer (react-email-editor) COMPARTILHADA entre o
// CampaignWizard (email de campanha) e o TemplateEditor (biblioteca de
// templates) — Fase 4 do plano de email marketing. Não duplicar estes
// valores nos dois componentes; qualquer ajuste de merge tag, tema ou
// upload de imagem deve ser feito aqui, uma única vez.

export const EMAIL_MERGE_TAGS = {
  nome: { name: 'Nome do contato', value: '{{nome}}', sample: 'João Silva' },
  empresa: { name: 'Empresa', value: '{{empresa}}', sample: 'Empresa LTDA' },
  email: { name: 'Email', value: '{{email}}', sample: 'joao@empresa.com' },
  // Substituída pelo worker (process-email-queue) no momento do envio, por
  // destinatário — ver replaceVars() lá. Se o HTML final não contiver a
  // tag/o link, o worker injeta um rodapé automático de descadastro; mas
  // templates podem (e devem) incluir esta tag explicitamente para
  // controlar posição e estilo do link de descadastro.
  unsubscribe_url: {
    name: 'Link de descadastro',
    value: '{{unsubscribe_url}}',
    sample: 'https://exemplo.com/functions/v1/email-unsubscribe?...',
  },
};

export const BASE_EMAIL_DESIGN = {
  body: {
    rows: [
      {
        cells: [1],
        columns: [{
          contents: [{
            type: 'image',
            values: {
              src: { url: 'https://ai-fastlane.lovable.app/lovable-uploads/logo-placeholder.png' },
              width: '150px',
              textAlign: 'center',
            },
          }],
        }],
      },
      {
        cells: [1],
        columns: [{
          contents: [{
            type: 'text',
            values: {
              text: '<p>Olá, {{nome}}!</p><p>Escreva sua mensagem aqui.</p>',
              fontSize: '16px',
            },
          }],
        }],
      },
      {
        cells: [1],
        columns: [{
          contents: [{
            type: 'button',
            values: {
              text: 'Ver mais',
              backgroundColor: '#534AB7',
              color: '#FFFFFF',
              borderRadius: '8px',
              textAlign: 'center',
            },
          }],
        }],
      },
      {
        cells: [1],
        columns: [{
          contents: [{
            type: 'text',
            values: {
              text: '<p style="font-size:12px;color:#888;">DN.IA — Você está recebendo este email pois se cadastrou em um de nossos eventos.</p>',
            },
          }],
        }],
      },
    ],
  },
};

export const EMAIL_EDITOR_OPTIONS = {
  locale: 'pt-BR',
  fonts: { showDefaultFonts: true },
  features: {
    textEditor: { spellChecker: false },
  },
  tools: {
    image: { enabled: true },
    button: { enabled: true },
    divider: { enabled: true },
    social: { enabled: false },
  },
  appearance: {
    theme: 'dark',
    panels: {
      tools: { dock: 'right' },
    },
  },
  mergeTags: EMAIL_MERGE_TAGS,
} as any;

// Handler de upload de imagem do Unlayer -> bucket `email-assets` (RLS
// restringe INSERT/UPDATE/DELETE a admins — migration 20260505124817).
// `folder` só separa os assets de campanhas dos de templates dentro do
// mesmo bucket, para organização; a política de storage é a mesma para
// ambos os prefixos.
export function registerEmailImageUpload(unlayer: any, folder: 'campaigns' | 'templates') {
  unlayer.registerCallback('image', async (file: any, done: any) => {
    try {
      const attachment = file.attachments[0];
      const fileExt = attachment.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('email-assets')
        .upload(fileName, attachment);

      if (error) {
        toast.error('Erro ao fazer upload da imagem');
        done({ progress: 0 });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('email-assets')
        .getPublicUrl(fileName);

      done({ progress: 100, url: urlData.publicUrl });
    } catch {
      done({ progress: 0 });
    }
  });
}
```

- [ ] **Step 2:** Editar `CampaignWizard.tsx` — no bloco de imports, acrescentar (após o import de `date-fns-tz`):

```ts
import { BASE_EMAIL_DESIGN, EMAIL_EDITOR_OPTIONS, registerEmailImageUpload } from './emailEditorConfig';
```

- [ ] **Step 3:** Remover por completo o bloco `const BASE_DESIGN = { ... };` (linhas 52–108 do arquivo original, entre o fim dos imports e `export function CampaignWizard`) — ele passa a vir de `emailEditorConfig.ts`.

- [ ] **Step 4:** Substituir o corpo de `onEditorReady` — de:

```ts
  const onEditorReady = useCallback((unlayer: any) => {
    setEditorReady(true);
    setEditorLoading(false);

    // Register image upload handler
    unlayer.registerCallback('image', async (file: any, done: any) => {
      try {
        const attachment = file.attachments[0];
        const fileExt = attachment.name.split('.').pop();
        const fileName = `campaigns/${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage
          .from('email-assets')
          .upload(fileName, attachment);

        if (error) {
          toast.error('Erro ao fazer upload da imagem');
          done({ progress: 0 });
          return;
        }

        const { data: urlData } = supabase.storage
          .from('email-assets')
          .getPublicUrl(fileName);

        done({ progress: 100, url: urlData.publicUrl });
      } catch {
        done({ progress: 0 });
      }
    });

    // Load design
    if (emailDesign) {
      unlayer.loadDesign(emailDesign);
    } else {
      unlayer.loadDesign(BASE_DESIGN);
    }
  }, [emailDesign]);
```

para:

```ts
  const onEditorReady = useCallback((unlayer: any) => {
    setEditorReady(true);
    setEditorLoading(false);

    registerEmailImageUpload(unlayer, 'campaigns');

    // Load design
    if (emailDesign) {
      unlayer.loadDesign(emailDesign);
    } else {
      unlayer.loadDesign(BASE_EMAIL_DESIGN);
    }
  }, [emailDesign]);
```

- [ ] **Step 5:** Substituir o `options={{...} as any}` inline do `<EmailEditor>` por `options={EMAIL_EDITOR_OPTIONS}` — de:

```tsx
                    <EmailEditor
                      ref={emailEditorRef}
                      minHeight="520px"
                      onReady={onEditorReady}
                      options={{
                        locale: 'pt-BR',
                        fonts: { showDefaultFonts: true },
                        features: {
                          textEditor: { spellChecker: false },
                        },
                        tools: {
                          image: { enabled: true },
                          button: { enabled: true },
                          divider: { enabled: true },
                          social: { enabled: false },
                        },
                        appearance: {
                          theme: 'dark',
                          panels: {
                            tools: { dock: 'right' },
                          },
                        },
                        mergeTags: {
                          nome: { name: 'Nome do contato', value: '{{nome}}', sample: 'João Silva' },
                          empresa: { name: 'Empresa', value: '{{empresa}}', sample: 'Empresa LTDA' },
                          email: { name: 'Email', value: '{{email}}', sample: 'joao@empresa.com' },
                        },
                      } as any}
                    />
```

para:

```tsx
                    <EmailEditor
                      ref={emailEditorRef}
                      minHeight="520px"
                      onReady={onEditorReady}
                      options={EMAIL_EDITOR_OPTIONS}
                    />
```

- [ ] **Step 6:** `npm run lint && npm run build`. Abrir o wizard localmente (`npm run dev`), passo "Conteúdo", clicar no campo de texto e checar no painel de merge tags do Unlayer que **`{{unsubscribe_url}}`** agora aparece ao lado de `{{nome}}`/`{{empresa}}`/`{{email}}` (valida também o risco geral do doc-mãe: "Tier free do Unlayer sem recurso necessário" — se a tag não aparecer no tier atual, parar aqui e revisar antes de prosseguir para as próximas tarefas).

- [ ] **Step 7:** Commit: `git add src/components/admin/campaigns/emailEditorConfig.ts src/components/admin/campaigns/CampaignWizard.tsx && git commit -m "refactor: extrai configuração do editor Unlayer para emailEditorConfig.ts" && git push`

---

## Task 4.4: Hook `useTemplates`

**Files:**
- Create: `src/hooks/useTemplates.tsx`

**Interfaces:**
- Consumes: tabela `email_templates` via `supabase-js` (RLS admin — mesmo padrão de `useCampaigns.tsx`, sem passar pela `templates-api`).
- Produces: `{ templates, loading, refetch, getTemplate, createTemplate, updateTemplate, duplicateTemplate, deleteTemplate }`, consumido por `Templates.tsx` (4.5), `TemplateEditor.tsx` (4.6) e `CampaignWizard.tsx`/`SaveAsTemplateDialog.tsx` (4.7).

- [ ] **Step 1:** Criar `src/hooks/useTemplates.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// `email_templates` ainda não está em src/integrations/supabase/types.ts
// (migration nova, ver Task 4.1 passo 3) — `.from('email_templates' as any)`
// é o workaround já sancionado no projeto para esse cenário (mesmo usado
// para `campaigns`, `campaign_sends` etc. em useCampaigns.tsx).

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  design: any;
  html: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateInput {
  name: string;
  description: string | null;
  category: string | null;
  design: any;
  html: string;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar templates');
      setLoading(false);
      return;
    }

    setTemplates((data || []) as any as EmailTemplate[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const getTemplate = async (id: string): Promise<EmailTemplate | null> => {
    const { data, error } = await supabase
      .from('email_templates' as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return data as any as EmailTemplate;
  };

  const createTemplate = async (data: EmailTemplateInput): Promise<EmailTemplate | null> => {
    const { data: result, error } = await supabase
      .from('email_templates' as any)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar template');
      return null;
    }
    return result as any as EmailTemplate;
  };

  const updateTemplate = async (id: string, data: Partial<EmailTemplateInput>): Promise<boolean> => {
    const { error } = await supabase
      .from('email_templates' as any)
      .update(data as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar template');
      return false;
    }
    return true;
  };

  const duplicateTemplate = async (template: EmailTemplate) => {
    const created = await createTemplate({
      name: template.name + ' (cópia)',
      description: template.description,
      category: template.category,
      design: template.design,
      html: template.html || '',
    });
    if (created) {
      toast.success('Template duplicado');
      fetchTemplates();
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('email_templates' as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir template');
      return;
    }
    toast.success('Template excluído');
    fetchTemplates();
  };

  return {
    templates,
    loading,
    refetch: fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
  };
}
```

- [ ] **Step 2:** `npm run lint && npm run build` (o hook ainda não é usado por nenhuma tela — só confirma que compila).

- [ ] **Step 3:** Commit: `git add src/hooks/useTemplates.tsx && git commit -m "feat: adiciona hook useTemplates para CRUD de templates de email" && git push`

---

## Task 4.5: Página `/templates` (grid de cards)

**Files:**
- Create: `src/pages/admin/Templates.tsx`
- Modify: `src/App.tsx` (rota, lazy, acima do catch-all)
- Modify: `src/components/admin/AdminSidebar.tsx` (item de navegação)

**Interfaces:**
- Consumes: `useTemplates()` (Task 4.4).
- Produces: rota `/templates`; navegação para `/templates/new` e `/templates/:id/edit` (Task 4.6).

- [ ] **Step 1:** Criar `src/pages/admin/Templates.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, Loader2, LayoutTemplate } from 'lucide-react';
import { useTemplates, type EmailTemplate } from '@/hooks/useTemplates';

export default function Templates() {
  const navigate = useNavigate();
  const { templates, loading, duplicateTemplate, deleteTemplate } = useTemplates();
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Templates de email</h1>
        <Button onClick={() => navigate('/templates/new')} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <LayoutTemplate className="h-10 w-10 opacity-40" />
          <p>Nenhum template criado</p>
          <Button variant="outline" onClick={() => navigate('/templates/new')}>
            <Plus className="h-4 w-4 mr-2" /> Criar primeiro template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <Card
              key={t.id}
              className="overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => navigate(`/templates/${t.id}/edit`)}
            >
              <div className="h-48 bg-white overflow-hidden border-b relative">
                {t.html ? (
                  <iframe
                    srcDoc={t.html}
                    title={t.name}
                    className="w-full border-0"
                    style={{ height: 480, pointerEvents: 'none' }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                    <LayoutTemplate className="h-8 w-8" />
                  </div>
                )}
              </div>
              <CardContent className="py-3 px-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">{t.name}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/templates/${t.id}/edit`); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateTemplate(t); }}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
                {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template "{deleteTarget?.name}" será excluído permanentemente. Campanhas já criadas a partir dele não são afetadas — o conteúdo delas é uma cópia independente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteTemplate(deleteTarget.id); setDeleteTarget(null); } }} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2:** Editar `src/App.tsx` — acrescentar, logo após a linha `const AdminAutomations = lazy(() => import("./pages/admin/Automations"));`:

```ts
const AdminTemplates = lazy(() => import("./pages/admin/Templates"));
const TemplateEditorPage = lazy(() => import("./components/admin/campaigns/TemplateEditor"));
```

E, dentro do bloco de rotas admin (`<Route path="/" ...>`), logo após `<Route path="automations" element={<Suspense fallback={<PageLoader />}><AdminAutomations /></Suspense>} />` (ainda acima do bloco `{/* Redirects */}` e do catch-all `*`):

```tsx
            <Route path="templates" element={<Suspense fallback={<PageLoader />}><AdminTemplates /></Suspense>} />
            <Route path="templates/new" element={<Suspense fallback={<PageLoader />}><TemplateEditorPage /></Suspense>} />
            <Route path="templates/:id/edit" element={<Suspense fallback={<PageLoader />}><TemplateEditorPage /></Suspense>} />
```

- [ ] **Step 3:** Editar `src/components/admin/AdminSidebar.tsx` — no import de ícones, acrescentar `LayoutTemplate` à lista já importada de `lucide-react`:

```ts
import {
  LayoutDashboard, BarChart2, Users, Filter, Send, Layout,
  Upload, Settings, ChevronLeft, ChevronRight, ChevronDown,
  ChevronRight as ChevronRightSm, LogOut, Menu, X, Zap, LayoutTemplate,
} from 'lucide-react';
```

E em `MAIN_ITEMS`, inserir o item logo após `Campanhas`:

```ts
const MAIN_ITEMS: NavItem[] = [
  { label: 'Visão Geral', path: '/', icon: LayoutDashboard },
  {
    label: 'Analytics', path: '/analytics', icon: BarChart2,
    children: [
      { label: 'Perfil', path: '/analytics?tab=profile' },
      { label: 'Desafios', path: '/analytics?tab=challenges' },
      { label: 'Tático', path: '/analytics?tab=tactical' },
      { label: 'Operacional', path: '/analytics?tab=operational' },
      { label: 'Insights', path: '/analytics?tab=insights' },
    ],
  },
  { label: 'Contatos', path: '/contacts', icon: Users },
  { label: 'Segmentos', path: '/segments', icon: Filter },
  { label: 'Campanhas', path: '/campaigns', icon: Send },
  { label: 'Templates', path: '/templates', icon: LayoutTemplate },
  { label: 'Automações', path: '/automations', icon: Zap },
  { label: 'Páginas', path: '/pages', icon: Layout },
];
```

(nota: `TemplateEditorPage` ainda não existe até a Task 4.6 — este `import` só resolve depois dela. Se este passo rodar isoladamente, `npm run build` vai falhar até a Task 4.6 ser aplicada; tudo bem seguir a ordem do plano e tratar 4.5+4.6 como uma unidade de verificação, ou aplicar 4.6 antes deste `App.tsx`/Step 2.)

- [ ] **Step 4:** `npm run lint && npm run build` (só depois de aplicar também a Task 4.6, por causa do import cruzado citado acima).

- [ ] **Step 5:** Commit: `git add src/pages/admin/Templates.tsx src/App.tsx src/components/admin/AdminSidebar.tsx && git commit -m "feat: adiciona página /templates (grid de templates de email)" && git push`

---

## Task 4.6: Editor de template em página cheia

**Files:**
- Create: `src/components/admin/campaigns/TemplateEditor.tsx`

**Interfaces:**
- Consumes: `useTemplates()` (4.4), `BASE_EMAIL_DESIGN`/`EMAIL_EDITOR_OPTIONS`/`registerEmailImageUpload` (4.3).
- Produces: componente de página, roteado em `/templates/new` e `/templates/:id/edit` (4.5).

- [ ] **Step 1:** Criar `src/components/admin/campaigns/TemplateEditor.tsx`:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import EmailEditor, { type EditorRef } from 'react-email-editor';
import { toast } from 'sonner';
import { useTemplates } from '@/hooks/useTemplates';
import { BASE_EMAIL_DESIGN, EMAIL_EDITOR_OPTIONS, registerEmailImageUpload } from './emailEditorConfig';

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const { getTemplate, createTemplate, updateTemplate } = useTemplates();

  const emailEditorRef = useRef<EditorRef>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [editorLoading, setEditorLoading] = useState(true);
  const [initialDesign, setInitialDesign] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      const t = await getTemplate(id!);
      if (cancelled) return;
      if (!t) {
        toast.error('Template não encontrado');
        navigate('/templates');
        return;
      }
      setName(t.name);
      setDescription(t.description || '');
      setCategory(t.category || '');
      setInitialDesign(t.design || BASE_EMAIL_DESIGN);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // O editor só é montado depois que `loading` vira false (ver JSX abaixo),
  // então quando onEditorReady dispara `initialDesign` já está resolvido —
  // sem essa guarda haveria uma corrida entre o fetch do template e o
  // primeiro loadDesign() do Unlayer.
  const onEditorReady = useCallback((unlayer: any) => {
    setEditorReady(true);
    setEditorLoading(false);
    registerEmailImageUpload(unlayer, 'templates');
    unlayer.loadDesign(initialDesign || BASE_EMAIL_DESIGN);
  }, [initialDesign]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Dê um nome ao template');
      return;
    }
    const editor = emailEditorRef.current?.editor;
    if (!editor) return;

    setSaving(true);
    editor.exportHtml(async (htmlData: any) => {
      editor.saveDesign(async (design: any) => {
        const payload = {
          name: name.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          design,
          html: htmlData.html,
        };

        if (isNew) {
          const created = await createTemplate(payload);
          setSaving(false);
          if (created) {
            toast.success('Template criado');
            navigate(`/templates/${created.id}/edit`, { replace: true });
          }
        } else {
          const success = await updateTemplate(id!, payload);
          setSaving(false);
          if (success) toast.success('Template salvo');
        }
      });
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate('/templates')} className="gap-1.5 shrink-0">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handleSave} disabled={saving || !editorReady} className="gap-1.5 shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Nome *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Newsletter mensal" />
        </div>
        <div>
          <Label>Categoria</Label>
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Newsletter, Promoção" />
        </div>
        <div>
          <Label>Descrição</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Quando usar este template" />
        </div>
      </div>

      <div className="relative">
        {editorLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 rounded-lg">
            <Skeleton className="w-full h-[600px] rounded-lg" />
            <p className="text-sm text-muted-foreground">Carregando editor...</p>
          </div>
        )}
        <div className="rounded-lg border overflow-hidden" style={{ minHeight: 600 }}>
          <EmailEditor
            ref={emailEditorRef}
            minHeight="600px"
            onReady={onEditorReady}
            options={EMAIL_EDITOR_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** `npm run lint && npm run build`.

- [ ] **Step 3:** Teste manual (`npm run dev`): navegar para `/templates/new`, digitar um nome, editar o conteúdo, clicar "Salvar template" → deve redirecionar para `/templates/<id>/edit` com o conteúdo preservado; voltar para `/templates`, o card novo deve aparecer com o preview correto; abrir de novo em modo edição, mudar algo, salvar — o design deve persistir entre reloads.

- [ ] **Step 4:** Commit: `git add src/components/admin/campaigns/TemplateEditor.tsx && git commit -m "feat: adiciona editor de template em página cheia (Unlayer)" && git push`

---

## Task 4.7: Integração no `CampaignWizard`

**Files:**
- Create: `src/components/admin/campaigns/SaveAsTemplateDialog.tsx`
- Modify: `src/components/admin/campaigns/CampaignWizard.tsx`

**Interfaces:**
- Consumes: `useTemplates()` (4.4).
- Produces: no passo "Conteúdo" (email) do wizard, seletor "Começar de um template" que chama `loadDesign` no editor já montado; botão "Salvar como template" que abre `SaveAsTemplateDialog` e grava um novo registro em `email_templates` a partir do `design`/`html` correntes do editor — **sem** guardar `template_id` na campanha (mantém a cópia por valor).

- [ ] **Step 1:** Criar `src/components/admin/campaigns/SaveAsTemplateDialog.tsx`:

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  // Chamado no momento da confirmação — o caller decide como extrair
  // html/design do SEU editor (CampaignWizard usa exportHtml+saveDesign do
  // ref do Unlayer que já mantém).
  getContent: () => Promise<{ html: string; design: any }>;
}

export function SaveAsTemplateDialog({ open, onClose, getContent }: SaveAsTemplateDialogProps) {
  const { createTemplate } = useTemplates();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { html, design } = await getContent();
    const created = await createTemplate({
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      design,
      html,
    });
    setSaving(false);
    if (created) {
      setName('');
      setDescription('');
      setCategory('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar como template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Newsletter mensal" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Newsletter, Promoção, Evento" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Quando usar este template" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2:** Editar `CampaignWizard.tsx` — imports: acrescentar, junto do bloco adicionado na Task 4.3,

```ts
import { useTemplates } from '@/hooks/useTemplates';
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog';
```

- [ ] **Step 3:** Dentro do componente, junto às outras declarações de estado do Step 2 (perto de `const [emailDesign, setEmailDesign] = useState<any>(null);`), acrescentar:

```ts
  const { templates } = useTemplates();
  const [templateId, setTemplateId] = useState<string>('none');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
```

- [ ] **Step 4:** No JSX do Step 2 (bloco `channel === 'email'`), imediatamente **acima** do `<div>` que contém `<Label>Assunto do email *</Label>`, inserir o seletor de template e, ao lado do rótulo do editor, o botão "Salvar como template":

```tsx
                <div>
                  <Label>Começar de um template</Label>
                  <Select
                    value={templateId}
                    onValueChange={(value) => {
                      setTemplateId(value);
                      if (value === 'none') return;
                      const t = templates.find(t => t.id === value);
                      if (!t || !t.design) return;
                      const editor = emailEditorRef.current?.editor;
                      if (editor) {
                        editor.loadDesign(t.design);
                        setEmailDesign(t.design);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (começar do zero)</SelectItem>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

```

E, na linha do `<Label>Assunto do email *</Label>`, adicionar o botão de salvar template ao lado (transformando o container num flex):

```tsx
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Assunto do email *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSaveTemplateOpen(true)}
                      disabled={!editorReady}
                    >
                      Salvar como template
                    </Button>
                  </div>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Ex: {{nome}}, confira esta novidade!"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {'{{nome}}'}, {'{{email}}'}, {'{{empresa}}'} como variáveis dinâmicas
                  </p>
                </div>
```

(isto substitui o bloco `<div><Label>Assunto do email *</Label>...</div>` já existente — mesmos filhos, só acrescenta o cabeçalho flex com o botão.)

- [ ] **Step 5:** Renderizar o diálogo, junto ao `<AlertDialog>` de confirmação já existente, perto do fim do JSX (logo antes do `</DialogContent>` de fechamento):

```tsx
        <SaveAsTemplateDialog
          open={saveTemplateOpen}
          onClose={() => setSaveTemplateOpen(false)}
          getContent={exportFromEditor}
        />
```

(`exportFromEditor` já existe no componente — mesma função usada em `handleNext` para exportar html+design ao avançar para a Revisão; é reaproveitada aqui sem alterações.)

- [ ] **Step 6:** `npm run lint && npm run build`.

- [ ] **Step 7:** Teste manual: criar um template pela tela `/templates/new`; abrir "Nova campanha" → passo Conteúdo → selecionar o template no dropdown → confirmar visualmente que o editor carrega o design do template; editar algo no editor da campanha e avançar até Revisão → confirmar que o preview mostra a versão editada (prova de cópia por valor: a campanha não ficou "amarrada" ao template). Depois, editar o template original em `/templates/<id>/edit` e salvar → reabrir a campanha já criada (via `CampaignDetail`) e confirmar que o conteúdo dela **não mudou**.

- [ ] **Step 8:** Commit: `git add src/components/admin/campaigns/SaveAsTemplateDialog.tsx src/components/admin/campaigns/CampaignWizard.tsx && git commit -m "feat: integra biblioteca de templates ao CampaignWizard (usar/salvar como template)" && git push`

---

## Verificação da fase

- Criar um template do zero em `/templates`, com nome, categoria e conteúdo no editor Unlayer; ele aparece na grid com preview correto.
- Duplicar e excluir um template pela grid funcionam e o `AlertDialog` de exclusão deixa claro que campanhas não são afetadas.
- No `CampaignWizard`, escolher "Começar de um template" carrega o design no editor da campanha; escolher "Nenhum" mantém o comportamento atual (design base).
- "Salvar como template" a partir de uma campanha em edição cria um novo registro em `email_templates` sem alterar a campanha.
- **Prova de cópia por valor (decisão vinculante nº 6):** editar um template depois de usá-lo numa campanha **não** altera o conteúdo da campanha já criada — validado explicitamente no Step 7 da Task 4.7. Isso é garantido estruturalmente (não só por teste manual): `campaigns` não tem FK para `email_templates`, e a seleção do template só faz um `loadDesign()` local seguido do `exportHtml`/`saveDesign` de sempre — a campanha grava sua própria cópia de `design`/`body` nas colunas que já tinha antes desta fase.
- `templates-api` responde corretamente a GET/POST/PATCH/DELETE via `curl` com o `WEBHOOK_SECRET` (Task 4.2, Step 3), para consumo por integrações externas (n8n etc.), mesmo que a UI admin não a use.
- `npm run lint && npm run build` sem erro novo em cada tarefa; nenhuma tarefa introduz uma categoria de erro/warning que não existia antes dela.

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Drift entre a configuração do editor do `CampaignWizard` e do `TemplateEditor` (ex.: alguém ajusta `mergeTags` só num dos dois) | `emailEditorConfig.ts` é o único ponto de verdade (Task 4.3); os dois componentes importam, nunca declaram local |
| Tier free do Unlayer sem suporte a alguma feature usada (custom blocks, merge tag `{{unsubscribe_url}}`) | Validado manualmente no Step 6 da Task 4.3, antes de construir o resto da fase em cima disso (risco já listado no plano-mãe) |
| Usuário confunde "Salvar template" (editor de template) com "Salvar como template" (dentro de uma campanha) e sobrescreve o template errado | Fluxos fisicamente separados: `TemplateEditor` sempre atualiza o registro cujo `id` está na URL; `SaveAsTemplateDialog` sempre faz `createTemplate` (nunca update) a partir da campanha — não há como uma campanha sobrescrever um template existente |
| Grid de templates com muitos registros pode ficar pesada por renderizar um `<iframe>` por card | Fora do escopo desta fase (poucas dezenas de templates esperadas); se necessário no futuro, paginar `Templates.tsx` do mesmo jeito que `campaigns-api` já pagina, ou trocar o preview por uma miniatura pré-renderizada |
| `email_templates` sem entrada em `types.ts` obriga `as any` em todo acesso pelo client | Mesmo padrão já aceito nas Fases 1–3 para `email_events`/`email_suppressions`/`email_queue`; regenerar tipos quando o CLI estiver disponível (Task 4.1, Step 3) resolve retroativamente sem exigir mudança de código |
| Excluir um template usado por uma automação futura (Fase 6, `send_email {template_id}`) pode quebrar o fluxo | Fora do escopo desta fase — quando a Fase 6 referenciar `email_templates.id` num `journey.nodes`, o plano dela precisa decidir a política (impedir exclusão em uso, ou copiar por valor também ali); registrado aqui para não ser esquecido |

---

## Deploy (obrigatório — o sync do Lovable NÃO deploya functions/migrations)

Regra: **toda tarefa que cria ou altera uma Edge Function ou uma migration termina com um prompt de deploy entregue ao usuário**, com o hash real do commit já pushado. Não acumular para o fim da fase.

Para esta fase, as tarefas que exigem deploy são a 4.1 (migration) e a 4.2 (Edge Function `templates-api`) — podem ir juntas num único prompt se os commits forem consecutivos:

```
Prompt para Lovable:
---
Faça deploy da edge function: templates-api.
Aplique a migration: 20260713240000_email_templates.sql.

Mudanças no código:
1. Nova tabela email_templates (RLS admin, sem FK para campaigns — templates
   são copiados por valor para dentro da campanha).
2. Nova Edge Function templates-api com CRUD completo (GET lista/detalhe,
   POST, PATCH, DELETE), registrada em config.toml com verify_jwt=false.

O código já está no repositório GitHub (commit <hash>). Por favor, faça o deploy.
---
```

Nenhum secret novo é necessário nesta fase (o bucket `email-assets` e as políticas de storage já existem desde a Fase de campanhas original — migration `20260505124817`).
