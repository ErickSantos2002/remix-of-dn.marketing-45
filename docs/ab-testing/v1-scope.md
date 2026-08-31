# Escopo: Passos 2–6 do módulo A/B (plano aprovado na Fase A)

MÉTODO: commits pequenos por passo; a cada Edge Function/migration, gerar o prompt de deploy
(CLI e Lovable) em docs/ab-testing/deploys.md; não esperar validação entre passos.

PASSO 2 — Edge Function ab-events: verify_jwt=false, CORS *.dnia.ai, fire-and-forget,
rate-limit; eventos assignment/exposure/behavior/schedule_step/conversion; dedupe de exposure
por ab_vid+ab_test; contexto parseado (device/navegador/SO/idioma/resolução). Incluir ajuste
do redirecionador: slug inexistente → 302 para URL global configurável (default https://dnia.ai).

PASSO 3 — Snippet public/ab.js (dnia.ai é projeto separado): standalone, async, 1 linha de
instalação; lê ab_* da query → cookie .dnia.ai (SameSite=Lax, Secure, 90d); dispara exposure;
rastreia scroll/tempo/cliques; injeta ab_* em campos ocultos de forms; reescreve src de todos
os iframes nexus.dnia.ai/schedule; funciona em retorno sem query (cookie = fonte da verdade);
LGPD-gated; instrução de instalação em docs/ab-testing/snippet-install.md.

PASSO 4 — Migration ab_test/ab_var/ab_vid (nullable) em lead_conversions; leadConversion.ts
inclui ab_* no insert; ALLOWED_FIELDS do lead-capture atualizado; recordConversion('lead_criado').

PASSO 5 — identity-upsert e receive-contact-event capturam ab_* de metadata → ab_identities
(histórico completo, never overwrite) + recordConversion('agendamento'); fallback por
email/whatsapp quando sem ab_vid; fireBookingEvent anexa variante + POST ao coletor;
SPEC das mudanças do Nexus em docs/ab-testing/nexus-spec.md (ler ab_* da URL, upsert com
ab_vid na etapa 1, schedule_step nas etapas 2–3, ab_vid na confirmação, idempotência,
não-bloqueio).

PASSO 6 — UI admin (padrão shadcn/telas admin existentes): criar/editar teste (nome, hipótese
estruturada, URLs+pesos, métrica primária configurável default lead_criado, guardrail default
agendamento, kill-switch, geração do link, cálculo de amostra/duração); relatório (exposições
únicas, conversão por tipo, funil de etapas, veredito bayesiano sobre a métrica primária,
guardrail em vermelho se piorar, selo PRELIMINAR até a amostra); página de análise com filtros
combináveis (datas, UTMs, IDs de clique, device, navegador, SO, idioma, página, referrer,
tipo de conversão) + export CSV + aviso de leitura exploratória ao filtrar.

ENTREGA FINAL: docs/ab-testing/validation-checklist.md (deploys em ordem, Worker, snippet,
smoke tests por passo, roteiro de teste A/A) + resumo dos pendentes fora do repo + PR
da branch para main com descrição completa.
