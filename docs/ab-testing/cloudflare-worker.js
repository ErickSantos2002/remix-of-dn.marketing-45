/**
 * Cloudflare Worker — redirecionador + coletor do módulo de Teste A/B.
 *
 * Ligado ao subdomínio DEDICADO `go.dnia.ai` (Custom Domain do worker). Um
 * subdomínio próprio é necessário porque o hostname do app (`dnmkt.dnia.ai`) é
 * reivindicado pelo Lovable via Cloudflare for SaaS (orange-to-orange), o que
 * faz o Cloudflare ignorar Workers Routes nesse hostname. `go.dnia.ai` é seu,
 * dedicado ao worker — e continua sendo *.dnia.ai, então o cookie `.dnia.ai`
 * same-site do redirecionador funciona normalmente.
 *
 * Esquema de URL (Opção A):
 *   https://go.dnia.ai/{slug}   -> redirecionador (Edge Function `go`)
 *   https://go.dnia.ai/e        -> coletor de eventos (Edge Function `ab-events`)
 *
 * Como é Custom Domain, TODO o tráfego de go.dnia.ai chega aqui (não há origem
 * própria). INSTALAÇÃO: ver docs/ab-testing/README.md.
 */

// Base das Edge Functions do projeto Supabase (project_id kfhojzdcnpuntynodsff).
const SUPABASE_FUNCTIONS = 'https://kfhojzdcnpuntynodsff.supabase.co/functions/v1';

// Se as functions exigirem apikey no gateway (ver README, "Solução de
// problemas"), preencha com a anon/publishable key (é pública). Vazio = não injeta.
const SUPABASE_ANON_KEY = '';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    let target;

    if (path === '/e' || path === '/e/') {
      // coletor de eventos
      target = `${SUPABASE_FUNCTIONS}/ab-events${url.search}`;
    } else if (path === '/' || path === '') {
      // raiz sem slug -> go sem slug (cai no fallback global do redirecionador)
      target = `${SUPABASE_FUNCTIONS}/go${url.search}`;
    } else {
      // /{slug} -> redirecionador (o `go` extrai o slug do path)
      target = `${SUPABASE_FUNCTIONS}/go${path}${url.search}`;
    }

    // Reconstrói o request apontando para a function, preservando método, body e
    // headers (inclui Cookie do .dnia.ai).
    const proxied = new Request(target, request);
    if (SUPABASE_ANON_KEY) proxied.headers.set('apikey', SUPABASE_ANON_KEY);

    // redirect:'manual' => o 302 do redirecionador vai INTACTO para o navegador.
    const resp = await fetch(proxied, { redirect: 'manual' });

    // Repassa a resposta como veio (status, Location e TODOS os Set-Cookie).
    return new Response(resp.body, resp);
  },
};
