---
name: lovable-workflow
description: >-
  Regras de segurança e fluxo de trabalho para projetos hospedados no Lovable
  (lovable.dev) com two-way sync GitHub <-> Lovable. Use SEMPRE que estiver
  trabalhando em um repositório vinculado ao Lovable — mesmo que o usuário não
  mencione "Lovable" explicitamente — especialmente antes de: fazer commits/push,
  criar ou alterar Edge Functions ou Migrations do Supabase, mexer em branches,
  renomear/mover o repositório, ou editar arquivos auto-gerados. Acione também
  quando o projeto mencionar Lovable Cloud, lovable.app, "sync com o Lovable",
  ou quando houver um CLAUDE.md indicando integração com o Lovable.
metadata:
  trigger: Trabalhar em repositório sincronizado com Lovable; commits, push, edge functions, migrations, branches
  author: Rodrigo Normandia
---

# Lovable Workflow

O **Lovable** (https://lovable.dev) é uma plataforma AI-powered para criar
aplicações full-stack via linguagem natural. Características:

- Gera código React/TypeScript automaticamente.
- Integra nativamente com Supabase.
- Faz deploy automático (do app; **não** de Edge Functions/Migrations — ver adiante).
- **O GitHub é a fonte da verdade** quando conectado.

Projetos no Lovable usam **two-way sync** com o GitHub: edições no Lovable viram
commits automáticos no GitHub, e commits no GitHub sincronizam de volta para o
Lovable.

```
Lovable Editor  <---->  GitHub Repository  <---->  IDE Local (Claude Code)
     |                        |                        |
     v                        v                        v
  Auto-commit            Fonte da verdade          git push
```

Isso muda como você deve trabalhar. As regras abaixo existem para **não quebrar a
sincronização** (o que torna o projeto inacessível no Lovable) e para garantir que
mudanças cheguem corretamente ao ambiente de produção.

## Como saber se é um projeto Lovable

Procure por sinais antes de assumir: um `CLAUDE.md`/`README` mencionando Lovable,
uma URL `*.lovable.app`, um link `lovable.dev/projects/...`, ou o usuário dizendo
que o projeto "roda no Lovable". Na dúvida, pergunte — as regras a seguir só se
aplicam quando há sync ativo com o Lovable.

## Regras que NUNCA devem ser quebradas

Estas ações quebram o sync de forma difícil de reverter — o projeto pode ficar
inacessível no editor do Lovable:

1. **Não renomear** o repositório GitHub.
2. **Não mover** o repositório para outra conta/organização.
3. **Não deletar** o repositório GitHub.
4. **Não deletar branches** antes de voltar para `main` no Lovable.
5. **Não editar o mesmo arquivo** simultaneamente no Lovable e localmente — gera
   conflito de merge no sync.

Se o usuário pedir uma dessas ações, **alerte sobre o risco antes de prosseguir**
e confirme que ele entende a consequência.

## Fluxo seguro de edição local

O risco principal é editar localmente algo que o Lovable também alterou. Para
evitar conflitos:

1. **`git pull` antes de começar** qualquer trabalho — o Lovable pode ter feito
   commits desde a última vez.
2. Faça **commits pequenos e focados**.
3. **`git push` imediatamente** após cada commit, para reduzir a janela em que
   local e Lovable estão dessincronizados.
4. **Faça push automaticamente ao terminar** uma tarefa que o usuário precisa
   testar — não espere ele pedir. O usuário testa pela URL do Lovable, então o
   código precisa estar lá.
5. Antes de mexer em arquivos que aparecem como modificados/não commitados no
   `git status`, confirme a origem dessas mudanças (podem ter vindo do Lovable).

**Quando a edição é feita via Lovable (não local):**

1. O Lovable faz **commits automáticos** — **cada prompt = um commit**.
2. Use **pinning** para marcar versões estáveis.
3. Se algo quebrar, **volte para a versão pinada** estável.

## Deploy e produção

- A **produção** é publicada pelo próprio Lovable (Share → Publish), em uma URL
  `*.lovable.app`.
- **Não faça deploy por outros meios** (Vercel, Netlify, etc.) sem antes
  sincronizar com o Lovable — isso diverge o que está no ar do que o Lovable
  conhece.
- O deploy do **app** é automático no sync; o de **Edge Functions e Migrations
  não é** (ver seção própria abaixo).

## Ambiente Lovable Cloud — o que você NÃO consegue fazer

O app roda exclusivamente no **Lovable Cloud**. Tipicamente você **não tem**:

- Servidor local para rodar (`npm run dev` / `npm run build` não validam o que
  está em produção).
- Acesso direto ao Supabase (banco e auth são gerenciados pelo Lovable).

**Implicação prática:** para o usuário testar uma mudança, o caminho é
`commit -> push -> Lovable sincroniza -> verificar na URL de produção/preview`.
Não prometa "testei e funciona" se você não consegue executar o app — diga o que
foi alterado e peça para o usuário validar na URL.

## Edge Functions e Migrations — exigem prompt de deploy

O Lovable **não faz deploy automático** de Edge Functions nem de Migrations do
Supabase ao sincronizar o código. O código chega ao repositório, mas **não entra
em produção** sozinho.

Por isso: **sempre que criar ou alterar uma Edge Function ou Migration, entregue
ao usuário um prompt pronto** para ele colar no Lovable solicitando o deploy.
Use este modelo:

```
Prompt para Lovable:
---
Faça deploy da edge function `nome-da-funcao`.
(ou: Aplique a migration `nome-do-arquivo.sql`.)

Mudanças no código:
1. [descrever mudança 1]
2. [descrever mudança 2]

O código já está no repositório GitHub (commit XXXXXXX). Por favor, faça o deploy.
---
```

Sempre inclua o **hash do commit** real depois do push, para o Lovable saber qual
versão deployar.

O banco é **Supabase Cloud** (não local). Para alterações manuais no banco ou para
aplicar uma migration sem passar pelo prompt do Lovable, use o **Supabase
Dashboard** ou a **CLI do Supabase**.

## Estrutura e convenções geradas pelo Lovable

O Lovable segue convenções fixas — respeite-as para que o sync e a regeneração de
código não conflitem:

- Componentes em `src/components/`
- Páginas em `src/pages/`
- Componentes shadcn/ui em `src/components/ui/`
- Tipos do Supabase auto-gerados em `src/integrations/supabase/types.ts`

## Arquivos que NÃO devem ser editados manualmente

- `src/integrations/supabase/types.ts` — auto-gerado pelo Lovable/Supabase; é
  regenerado e suas edições manuais são perdidas/conflitam.
- `package-lock.json` — gerenciado pelo npm.
- `.lovable/` — configuração interna do Lovable (se existir).

## Boas práticas de prompting (quando o trabalho for via Lovable)

Quando você for sugerir prompts para o usuário enviar ao editor do Lovable:

1. **Seja específico**: cite a página/rota exata (ex.: `/dashboard`) e o
   comportamento esperado.
2. **Use guardrails**: diga o que NÃO deve ser alterado (ex.: "não editar
   `Auth.tsx`").
3. **Repita instruções importantes**: a memória do Lovable é limitada entre prompts.
4. **Quebre em partes menores e testáveis**: evite muitas mudanças de uma vez.
5. **Defina o papel**: se o app tem múltiplos roles (Admin, usuário comum),
   especifique para qual o comportamento se aplica.

## Checklist antes de commitar

1. Rodar o lint do projeto (ex.: `npm run lint`) e corrigir erros, quando possível.
2. `git pull` primeiro, para evitar conflito com o Lovable.
3. Atualizar a documentação do projeto (ex.: `CLAUDE.md`) se a arquitetura mudou.
4. Mensagens de commit claras e em português.
5. **Push imediato** após o commit para manter a sincronização.

## Recuperação se algo quebrar

- **Sync quebrou:** não entre em pânico. Verifique se o repositório GitHub ainda
  existe no mesmo local/nome; se foi renomeado, restaure o nome original. Em
  último caso, oriente contatar o suporte do Lovable.
- **Código quebrou:** o Lovable tem histórico de versões — é possível voltar para
  uma versão "pinada" estável. Alternativamente, `git revert` local + push.
