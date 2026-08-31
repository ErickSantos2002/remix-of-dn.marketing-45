import { Calendar, Radio, Gift, Check, X as XIcon } from "lucide-react";

const eventInfo = [
  { icon: Calendar, label: "05 de Maio", sub: "Evento online ao vivo" },
  { icon: Radio, label: "100% ao vivo", sub: "Sem replay disponível" },
  { icon: Gift, label: "100% gratuito", sub: "Inscrição sem custo" },
];

const parts = [
  {
    num: "01",
    label: "Parte 1 · Diagnóstico",
    title: "Onde sua empresa está perdendo dinheiro sem IA",
    desc: (
      <>
        Vamos mapear juntos os pontos da sua operação onde a ineficiência está
        corroendo margem.{" "}
        <strong className="text-foreground">
          Você vai entender exatamente onde a IA entra na sua empresa
        </strong>{" "}
        — não na teoria, no seu contexto real de receita, custo e processo.
      </>
    ),
    bullets: ["Mapa de ineficiências operacionais", "Diagnóstico de custo vs. automação", "Priorização por impacto"],
  },
  {
    num: "02",
    label: "Parte 2 · Receita & Custo",
    title: "Como IA aumenta margem e reduz despesa na prática",
    desc: (
      <>
        Aqui eu mostro os caminhos reais: como reduzir custo de marketing, de
        atendimento, de vendas. Como{" "}
        <strong className="text-foreground">aumentar receita sem aumentar time.</strong>{" "}
        Com cases, números e demonstrações ao vivo do que já funciona na dn.ia.
      </>
    ),
    bullets: ["IA aplicada em vendas", "Redução de custo operacional", "Cases ao vivo", "Agentes que trabalham por você"],
  },
  {
    num: "03",
    label: "Parte 3 · Implementação",
    title: "Plano de ação: o que fazer nos próximos 30 dias",
    desc: (
      <>
        Você não vai sair só com conhecimento. Vai sair com{" "}
        <strong className="text-foreground">
          um plano de implementação de 30 dias
        </strong>{" "}
        adaptado para o porte e tipo da sua empresa. Os primeiros passos, as
        ferramentas certas e a ordem correta de execução.
      </>
    ),
    bullets: ["Plano de ação personalizado", "Ferramentas recomendadas", "Roadmap de 30 dias"],
  },
  {
    num: "04",
    label: "Parte 4 · Direcionamento",
    title: "O caminho para escalar com IA sem depender de você",
    desc: (
      <>
        A última etapa é sobre escala. Como criar sistemas que{" "}
        <strong className="text-foreground">
          funcionam sem você dentro da operação.
        </strong>{" "}
        Como estruturar IA para que ela amplifique o que já funciona e libere
        você para pensar no estratégico.
      </>
    ),
    bullets: ["Sistemas autônomos com IA", "Saindo da operação", "Visão de longo prazo"],
  },
];

const forYou = [
  "É empresário ou líder de empresa com 10+ funcionários",
  "Fatura entre R$1M e R$50M por ano",
  "Sabe que IA é importante mas não sabe por onde começar",
  "Está cansado de conteúdo raso que não se aplica à sua realidade",
  "Quer reduzir custo, aumentar margem e sair da operação",
  "Quer direção, não mais informação",
];

const notForYou = [
  "Quer aprender a criar imagem bonita com IA",
  "É freelancer ou profissional operacional buscando ferramenta",
  "Quer fórmula mágica pra trabalhar 4 horas por dia",
  "Não tem equipe e não pretende escalar",
  "Quer mais teoria e menos prática",
];

export function LearningMapSection05Maio() {
  return (
    <section id="aprendizado" className="relative section-padding overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="section-container max-w-[1080px]">
        <div className="text-center mb-16">
          <div className="flex items-center gap-3 justify-center mb-4 text-destructive font-semibold text-xs tracking-[4px] uppercase">
            <div className="w-6 h-px bg-destructive" />
            O que os membros do R1 vão levar
            <div className="w-6 h-px bg-destructive" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] mb-4">
            O mapa completo para os empresários do{" "}
            <span className="text-destructive">Grupo R1</span> colocarem
            <br />
            <span className="text-accent">IA no estratégico da empresa.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-[600px] mx-auto leading-relaxed">
            Conteúdo desenhado especificamente para o perfil de empresário R1.
            Você sai da imersão com um plano de ação pronto, sabendo exatamente
            o que implementar primeiro.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-14 p-5 rounded-xl glass-card">
          {eventInfo.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-accent/8 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-accent" />
              </div>
              <div>
                <div className="font-semibold text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative flex flex-col gap-6 mb-14">
          {parts.map((part, i) => (
            <div
              key={i}
              className="relative p-6 md:p-8 rounded-xl glass-card group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_hsl(var(--accent)/0.08)]"
            >
              <div className="flex items-start gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-[12px] bg-accent/8 border-2 border-accent/20 flex items-center justify-center font-bold text-base md:text-lg text-accent flex-shrink-0 transition-all duration-300 group-hover:bg-accent/15 group-hover:border-accent/40 group-hover:shadow-[0_0_20px_hsl(var(--accent)/0.15)]">
                  {part.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[11px] tracking-[2.5px] uppercase text-accent mb-1.5">
                    {part.label}
                  </div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl leading-tight mb-2.5">
                    {part.title}
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {part.desc}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {part.bullets.map((b, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/5 border border-accent/10 text-xs text-muted-foreground font-medium"
                      >
                        <Check className="w-3 h-3 text-emerald-500" />
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {i < parts.length - 1 && (
                <div className="absolute -bottom-6 left-[30px] md:left-[38px] w-0.5 h-6 bg-gradient-to-b from-accent/30 to-transparent" />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-7 rounded-xl bg-accent/4 border border-accent/12 backdrop-blur-sm">
            <div className="font-bold text-lg mb-5 flex items-center gap-2.5 text-accent">
              <span className="text-xs">◆</span>
              Esse evento é para você se:
            </div>
            <ul className="flex flex-col gap-3">
              {forYou.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-snug">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-7 rounded-xl bg-white/2 border border-border/50 backdrop-blur-sm">
            <div className="font-bold text-lg mb-5 flex items-center gap-2.5 text-muted-foreground">
              <XIcon className="w-4 h-4" />
              Esse evento NÃO é para você se:
            </div>
            <ul className="flex flex-col gap-3">
              {notForYou.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-snug">
                  <XIcon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
