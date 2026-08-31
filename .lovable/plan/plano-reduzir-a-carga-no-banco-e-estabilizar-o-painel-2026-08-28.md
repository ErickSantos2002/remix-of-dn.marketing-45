# Plano: reduzir a carga no banco e estabilizar o painel

Diagnóstico confirmado: o volume de dados é pequeno (8.496 leads, 19.932 eventos, 9.830 conversões) e os índices principais já existem. A instabilidade vem de **quanto tráfego constante o app e os jobs geram**, não de falta de índice.

## 1. Painel admin baixa a base inteira a cada 30 segundos (maior ganho)

`useLeads` faz duas varreduras completas da tabela `leads` (`select *`, em páginas de 1.000, até 10.000 linhas) e repete tudo a cada 30 segundos, para cada aba aberta — inclusive abas em segundo plano.

Correções:
- Intervalo de polling de 30s para 120s.
- Pausar o polling quando a aba não está visível (`document.hidden`) e disparar um refresh único ao voltar o foco.
- Derivar a lista filtrada de `allLeads` no cliente em vez de fazer a segunda consulta ao banco.
- Selecionar apenas as colunas usadas pelas telas, em vez de `select('*')`.

## 2. Outros hooks com polling de 60 segundos

`useAgendamentos` (dois hooks) baixa todos os `contact_events` de agendamento em páginas de 1.000 (até 20.000 linhas) a cada 60s; `useLeadConversionUtmContents` baixa todo o histórico de `utm_content` de `lead_conversions` a cada montagem.

Correções:
- Mesmo tratamento de visibilidade da aba e intervalo maior (120s).
- Substituir a contagem "agendamentos de hoje" por agregação no banco (RPC que devolve o número já contado), em vez de trazer as linhas para contar no navegador.
- Cachear o mapa de UTM content por sessão para não refazer a varredura em cada navegação entre páginas do admin.

## 3. `analytics-api` retornando 502/503

A função monta SQL por intervalo de datas e executa via `execute_readonly_query`, sem limite de tempo próprio — quando a consulta estoura o `statement_timeout` do Postgres, a resposta vira 5xx sem tratamento.

Correções:
- Definir um `statement_timeout` explícito e curto nas consultas de analytics.
- Limitar o intervalo máximo de datas aceito pela função e validar o parâmetro.
- Retornar erro tratado com mensagem clara (e estado de erro na UI) em vez de 502/503.

## 4. Jobs agendados e histórico do cron

Hoje três jobs rodam **a cada minuto** (`drain-email-queue`, `promote-scheduled-campaigns`, `journey-worker`) e outros quatro a cada 5–10 minutos. O histórico `cron.job_run_details` acumulou **227.445 linhas / 49 MB** desde julho, sem limpeza.

Correções:
- Reduzir `promote-scheduled-campaigns` e `journey-worker` para cada 2–3 minutos (mantendo `drain-email-queue` mais frequente, por ser o caminho de envio).
- Criar job diário de limpeza que mantém apenas os últimos 7 dias de `cron.job_run_details`, e limpar o histórico atual uma vez.

## Detalhes técnicos

- Arquivos: `src/hooks/useLeads.tsx`, `src/hooks/useAgendamentos.tsx`, `src/hooks/useLeadConversionUtmContents.tsx`, `supabase/functions/analytics-api/index.ts`.
- Novo helper compartilhado de polling com pausa por visibilidade, para não duplicar a lógica em cada hook.
- Migration para a RPC de contagem de agendamentos do dia; `cron.schedule` para a limpeza do histórico.
- Sem mudança de schema nas tabelas de dados e sem alteração de comportamento visível no painel — apenas frequência e volume das consultas.

## Ordem de execução

1. Itens 1 e 2 (frontend) — corta a maior parte do tráfego constante.
2. Item 4 (jobs e limpeza do histórico).
3. Item 3 (`analytics-api`).
