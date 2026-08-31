# Roadmap de Produto — AI Fastlane

> Plataforma de captação, qualificação e ativação de leads para eventos e campanhas.
> Este roadmap descreve a evolução do produto em fases sequenciais, partindo do que já está em produção e avançando para um motor próprio de relacionamento por e-mail e automações multi-etapas, inspirado em Mailchimp e RD Station.

---

## Onde estamos hoje

A plataforma já entrega o ciclo completo de **captura → organização → qualificação → análise** de contatos:

| Capacidade | O que faz hoje |
|---|---|
| **Landing pages de eventos** | Diversas páginas de captura (gratuito, pago, eventos datados) com formulários conectados ao backend. |
| **Captura de leads** | Coleta servidor-side com deduplicação por e-mail, enriquecimento de UTM e identidade do visitante. |
| **Integração com Meta** | Envio de eventos para a Conversions API do Facebook (Meta CAPI) com cookies `_fbc`/`_fbp`. |
| **Base de contatos** | CRM interno com tags, status, histórico de eventos, detecção de duplicatas e timeline. |
| **Segmentação** | Criação de segmentos dinâmicos para recortar a base por critérios de negócio. |
| **Qualificação (scoring)** | Pontuação automática de leads (hotlead / warm / frio) baseada em cargo, faturamento, equipe, desafios e origem. |
| **Automações simples** | Regras condicionais aplicadas a leads (mudanças de tag, status, handoff). |
| **Análises com IA** | Painéis tático/operacional, análise de desafios e *AI Data Analyst* para perguntas em linguagem natural. |
| **Importação em lote** | Upload de CSVs para popular a base. |
| **Integrações de saída** | Pingback (4 variantes), Ticketia, Nexus (handoff comercial). |

**O que ainda não temos:** um canal próprio de comunicação. Hoje a ativação dos leads depende de ferramentas externas e do time comercial. O roadmap a seguir resolve essa lacuna.

---

## Fase 1 — Canal de envio próprio (fundação)

**Objetivo de negócio:** deixar de depender de ferramentas externas para falar com a base de leads, abrindo um canal direto, mensurável e com custo previsível.

**O que será entregue:**
- Integração com provedor de envio de e-mails transacional/marketing (avaliar SendGrid, Resend, Amazon SES ou Postmark).
- Configuração de domínio remetente com autenticação (SPF, DKIM, DMARC) para preservar reputação.
- **Rastreamento completo do ciclo de vida de cada e-mail**, capturado via webhooks do provedor:
  - *Enviado* (aceito pelo provedor)
  - *Entregue* (aceito pelo servidor do destinatário)
  - *Aberto* (pixel de tracking disparado)
  - *Clicado* (link rastreado acessado, com identificação de qual link)
  - *Bounce* (soft e hard, com motivo)
  - *Reclamação de spam*
  - *Descadastro*
- **Integração nativa com a timeline do contato:** cada evento acima vira um registro na *EventsTimeline* já existente no admin, com data/hora, campanha de origem, modelo enviado e metadados (link clicado, motivo do bounce). O time vê o histórico completo de relacionamento por e-mail dentro da ficha do lead, junto com capturas, mudanças de status e demais eventos.
- **Página de descadastro pública** com link único e seguro em todo e-mail enviado (obrigatório por boas práticas e regulação — CAN-SPAM, LGPD):
  - Descadastro em 1 clique, sem exigir login.
  - Centro de preferências opcional para o contato escolher de quais comunicações sair (campanhas, jornadas, transacionais) em vez de descadastrar de tudo.
  - Registro do descadastro como evento no contato, com origem e data.
- **Lista de supressão automática:** e-mails com hard bounce, reclamação de spam ou descadastro são marcados e bloqueados de qualquer envio futuro, em qualquer campanha ou jornada — sem exceção manual.
- Tela administrativa para acompanhar saúde do remetente e configurar credenciais.

**Por que importa:** sem canal próprio, qualquer estratégia de relacionamento fica refém de planilhas e ferramentas paralelas. Esta fase é o alicerce de tudo que vem depois — e a instrumentação granular desde o primeiro envio é o que vai alimentar as métricas, condicionais e decisões de IA das fases seguintes.

**KPIs:**
- Taxa de entregabilidade (delivered / sent) ≥ 98%
- Taxa de bounce permanente < 2%
- Taxa de reclamação de spam < 0,1%
- 100% dos envios registrados e auditáveis na base
- 100% dos eventos de e-mail (entregue, aberto, clicado, bounce, descadastro) refletidos na timeline do contato em até 60 segundos do acontecimento
- 100% de conformidade: todo e-mail enviado contém link de descadastro funcional

---

## Fase 2 — Modelos de e-mail (biblioteca de criativos)

**Objetivo de negócio:** padronizar a identidade visual da marca nos envios e permitir que o time de marketing produza peças sem depender de desenvolvedor.

**O que será entregue:**
- Editor visual de e-mails (drag-and-drop) com blocos reutilizáveis: cabeçalho, texto, imagem, botão, divisor, rodapé com link de descadastro.
- Biblioteca de modelos salvos, com versionamento e organização por categoria (boas-vindas, evento, recuperação, nutrição, transacional).
- Variáveis dinâmicas no corpo do e-mail (nome, empresa, link personalizado, dados do contato).
- Pré-visualização desktop/mobile e envio de e-mail de teste para validação antes de publicar.
- Modo de edição em HTML para casos avançados.

**Por que importa:** modelos consistentes reduzem o tempo de produção de cada campanha, garantem a marca e elevam a profissionalização do canal aos olhos do destinatário.

**KPIs:**
- Tempo médio para criar um novo e-mail < 30 minutos
- ≥ 80% das campanhas usando modelos da biblioteca (vs. e-mails feitos do zero)
- Taxa de abertura média ≥ 25% após padronização visual

---

## Fase 3 — Módulo de campanhas (envio em massa pontual)

**Objetivo de negócio:** transformar a base segmentada em receita, permitindo disparos planejados, agendados e mensuráveis para públicos específicos.

**O que será entregue:**
- Fluxo de criação de campanha em etapas: *escolher público → escolher modelo → revisar → enviar ou agendar*.
- Seleção de público a partir dos **segmentos já existentes** ou de filtros ad-hoc (status, tag, score, origem, data de captura).
- Estimativa de tamanho do público em tempo real, antes do envio.
- Agendamento de envio para data/hora futura, com fuso horário configurável.
- Opção de envio imediato com confirmação dupla.
- Página de resultados da campanha: enviados, entregues, abertos, cliques, descadastros, bounces, taxa de conversão (cruzando com eventos da landing).
- Histórico completo de campanhas, com possibilidade de duplicar uma existente para reaproveitar.

**Por que importa:** é o primeiro momento em que a base de contatos vira ativo monetizável de forma direta — convites para eventos, ofertas, anúncios de turma e reengajamento de leads frios.

**KPIs:**
- Pelo menos 4 campanhas/mês operadas diretamente na plataforma
- Taxa de abertura média ≥ 25%, taxa de clique ≥ 3%
- Receita atribuída a campanhas e-mail rastreável no painel de Analytics
- Taxa de descadastro por campanha < 0,5%

---

## Fase 4 — Jornadas automáticas (board de fluxos com condicionais)

**Objetivo de negócio:** sair do disparo pontual e construir relacionamentos contínuos, escaláveis e personalizados — entregando a mensagem certa, no momento certo, sem intervenção manual.

**O que será entregue:**
- **Board visual** estilo arrastar-e-conectar para desenhar jornadas, no espírito do *Customer Journey Builder* do Mailchimp e do *Fluxo de Automação* do RD Station.
- **Gatilhos de entrada:** contato cadastrado, lead muda de status, lead recebe tag, lead atinge score, data específica (aniversário do cadastro, dias após inscrição em evento), conclusão de campanha anterior.
- **Blocos de ação:** enviar e-mail (usando os modelos da Fase 2), aplicar tag, mudar status, mover de segmento, enviar webhook para sistemas externos, fazer handoff comercial.
- **Blocos de espera:** aguardar X horas/dias, aguardar até dia/hora específico, aguardar até evento ocorrer.
- **Blocos condicionais (sim/não):** abriu o e-mail? clicou em link específico? sofreu bounce? descadastrou? está em segmento X? score é alto? — com ramificações diferentes para cada caminho. *(Possível graças à instrumentação de eventos entregue na Fase 1.)*
- **Limites e segurança:** detecção de loops, máximo de e-mails por contato por janela de tempo, pausa automática em caso de queda de entregabilidade.
- **Painel de saúde da jornada:** quantos contatos em cada etapa, taxa de conversão entre passos, gargalos visuais.
- **Ativar / pausar / arquivar** jornadas sem perder histórico.

**Por que importa:** jornadas automáticas são o que transforma uma ferramenta de envio em uma plataforma de relacionamento. Cada lead passa a receber um tratamento adequado ao seu momento (recém-capturado, indeciso, quente, comprador, inativo) sem que ninguém precise agir manualmente. É também o módulo que mais aproxima o produto do patamar de Mailchimp/RD Station.

**KPIs:**
- ≥ 5 jornadas ativas em paralelo dentro de 90 dias após o lançamento
- ≥ 70% dos leads novos passando por pelo menos uma jornada de boas-vindas
- Aumento de ≥ 20% na conversão de lead → cliente para leads que completam jornadas vs. leads sem jornada
- Redução de ≥ 40% do tempo do time comercial gasto com follow-up manual de baixo valor

---

## Visão de longo prazo (pós-Fase 4)

Itens fora do escopo imediato, mas que naturalmente surgem como evolução do canal:

- **Multi-canal:** estender as jornadas para WhatsApp (Cloud API), SMS e push, com o mesmo board.
- **Testes A/B nativos:** comparar assuntos, conteúdos e horários dentro de campanhas e jornadas.
- **Recomendação por IA:** sugerir o melhor horário de envio, o melhor assunto e o público ideal para cada modelo, aproveitando o *AI Data Analyst* já existente.
- **Landing pages dentro da plataforma:** construtor visual para criar páginas de captura ligadas diretamente às campanhas, fechando o ciclo *captura → nutrição → conversão* sem dependência externa.
- **Modo white-label / multi-marca:** múltiplos remetentes e identidades visuais para operar diferentes marcas na mesma instância.

---

## Princípios que guiam o roadmap

1. **Cada fase entrega valor sozinha.** Mesmo que a Fase 4 nunca seja construída, as Fases 1–3 já justificam o investimento.
2. **Inspiração explícita em Mailchimp e RD Station** — mas com vantagem competitiva clara: integração nativa com o motor de qualificação, scoring e análise por IA que já existe.
3. **Dados primeiro.** Toda funcionalidade nasce instrumentada (KPIs definidos antes do desenvolvimento), nunca depois.
4. **Reputação do remetente é ativo de longo prazo.** Qualquer decisão de produto que comprometa entregabilidade é rejeitada, mesmo que acelere uma entrega.
