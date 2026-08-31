import { ArrowRight, ArrowUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import geraldoImg from "@/assets/depoimentos/geraldo-maciel.png";
import danielImg from "@/assets/depoimentos/daniel-gaia.png";
import victorImg from "@/assets/depoimentos/victor-barreto.png";

interface NumbersCasesSectionProps {
  onOpenModal: () => void;
}

const numbers = [
  { value: "3x", unit: "faturamento", desc: "Faturamento triplicou em 12 meses com a mesma estrutura" },
  { value: "4x", unit: "margem", desc: "Margem de lucro quadruplicou com redução de custo operacional" },
  { value: "30→5", unit: "pessoas", desc: "Time reduzido de 30 para 5 pessoas — produzindo mais do que antes" },
  { value: "R$3M", unit: "economia", desc: "Plataforma que valeria R$3M construída sozinho em 30 dias" },
];

const cases = [
  {
    tag: "Vendas",
    tagColor: "bg-accent/10 text-accent",
    title: "Agente de IA agenda reuniões sozinho",
    text: "Um agente de IA aborda leads, qualifica, conversa e agenda reunião direto na agenda da vendedora. Ela só dá um \"oi\" — o agente faz o resto. Em um dia, mais de 100 contatos iniciados automaticamente.",
    result: "2 reuniões agendadas sem intervenção humana",
  },
  {
    tag: "Produto",
    tagColor: "bg-yellow-500/10 text-yellow-500",
    title: "Plataforma multi-agente de atendimento",
    text: "Sistema com orquestrador inteligente que identifica a intenção do cliente e direciona para o agente certo — RH, vendas, suporte. Se o agente não resolve, transborda para humano automaticamente.",
    result: "Atendimento 24h sem aumentar equipe",
  },
  {
    tag: "Operação",
    tagColor: "bg-emerald-500/10 text-emerald-500",
    title: "Marketing inteiro feito com 1 pessoa + IA",
    text: "Criação de landing pages, carrosséis, copies, roteiros de vídeo e campanhas — tudo produzido por uma pessoa que não tinha conhecimento técnico. Antes exigiria designer, copywriter e social media.",
    result: "3 funções substituídas por IA + 1 pessoa",
  },
  {
    tag: "Gestão",
    tagColor: "bg-primary/10 text-primary",
    title: "Dashboard de análise comportamental para contratação",
    text: "IA analisa perfil comportamental de candidatos e cruza com a cultura da empresa antes da entrevista. Reduz erro de contratação e tempo gasto com processos seletivos errados.",
    result: "Processo seletivo 70% mais rápido",
  },
];

const testimonials = [
  {
    text: '"Eu tinha 400 clientes, uma equipe pequena e muitos dados — mas não conseguia transformar isso em decisão inteligente. Depois que aprendi a conectar IA na estratégia do meu negócio, construí sozinho um dashboard completo. Hoje economizo mais de R$ 38 mil por ano e tenho controle total da operação."',
    name: "Geraldo Maciel",
    role: "GM Team · Mentorado MTIA",
    initial: "G",
    image: geraldoImg,
  },
  {
    text: '"Nossa operação tinha volume, mas pouca inteligência na execução. Quando aplicamos o método do Rodrigo para conectar IA à estratégia comercial, automatizamos os orçamentos, alcançamos mais de 28% de conversão e processamos cerca de R$ 1,5 milhão em propostas — com aproximadamente 400 vendas geradas pela automação."',
    name: "Daniel Gaia",
    role: "Varejão das Tintas · Mentorado MTIA",
    initial: "D",
    image: danielImg,
  },
  {
    text: '"Eu usava IA de forma superficial e já tinha desistido de um curso. Quando apliquei o método do Rodrigo, transformei meu relatório financeiro em um sistema dinâmico, automatizei processos e criei meu próprio CRM. Hoje produzo mais rápido e penso meu negócio de forma estratégica."',
    name: "Victor Barreto",
    role: "Investe com Victor · Mentorado MTIA",
    initial: "V",
    image: victorImg,
  },
];

export function NumbersCasesSection({ onOpenModal }: NumbersCasesSectionProps) {
  return (
    <section id="resultados" className="relative section-padding overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="section-container max-w-[1080px]">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center gap-3 justify-center mb-4 text-accent font-semibold text-xs tracking-[4px] uppercase">
            <div className="w-6 h-px bg-accent" />
            Resultados reais, não teoria
            <div className="w-6 h-px bg-accent" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] mb-4">
            Isso aqui <span className="text-accent">já aconteceu.</span>
            <br />
            Não é promessa — é prova.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-[560px] mx-auto leading-relaxed">
            Números da operação real da dn.ia. Sem maquiar, sem arredondar. O que
            a IA fez dentro de uma empresa de verdade.
          </p>
        </div>

        {/* Numbers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16">
          {numbers.map((n, i) => (
            <div
              key={i}
              className="text-center p-7 md:p-9 rounded-2xl glass-card card-glow relative overflow-hidden group"
            >
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="font-bold text-3xl md:text-4xl lg:text-5xl leading-none mb-1 text-gradient">
                {n.value}
              </div>
              <div className="font-semibold text-xs md:text-sm text-accent tracking-wider uppercase mb-2.5">
                {n.unit}
              </div>
              <div className="text-xs text-muted-foreground leading-snug">
                {n.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Cases */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-7 text-accent font-semibold text-xs tracking-[4px] uppercase">
            <div className="w-6 h-px bg-accent" />
            Cases internos da dn.ia
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cases.map((c, i) => (
              <div
                key={i}
                className="p-7 rounded-xl glass-card transition-all duration-300 hover:border-white/12 hover:-translate-y-0.5"
              >
                <span
                  className={`inline-block px-3 py-1 rounded-full font-bold text-[11px] tracking-[2px] uppercase mb-4 ${c.tagColor}`}
                >
                  {c.tag}
                </span>
                <div className="font-bold text-lg md:text-xl leading-tight mb-2.5">
                  {c.title}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {c.text}
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent/6 border border-accent/12 font-bold text-sm text-accent">
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                  {c.result}
                </div>
              </div>
            ))}
        </div>
        </div>

        {/* Testimonials */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-7 text-accent font-semibold text-xs tracking-[4px] uppercase">
            <div className="w-6 h-px bg-accent" />
            O que dizem os mentorados
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="p-6 rounded-xl glass-card transition-all duration-300 hover:border-white/12"
              >
                <div className="flex gap-0.5 text-yellow-500 mb-3.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed italic mb-4">
                  {t.text}
                </div>
                <div className="flex items-center gap-3">
                  {t.image ? (
                    <img src={t.image} alt={t.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center font-bold text-xs text-accent flex-shrink-0">
                      {t.initial}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mid CTA */}
        <div className="text-center mt-16">
          <div className="font-bold text-xl md:text-2xl lg:text-3xl leading-snug mb-6 max-w-[600px] mx-auto">
            Esses resultados vieram de{" "}
            <span className="text-accent">uma metodologia.</span>
            <br />E é exatamente ela que você vai conhecer no evento.
          </div>
          <div className="flex flex-col items-center gap-1 mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-sm md:text-base text-muted-foreground">DE</span>
              <span className="text-destructive line-through font-semibold text-lg md:text-xl">R$ 197</span>
              <span className="text-sm md:text-base text-muted-foreground">POR</span>
              <span className="text-success font-bold text-3xl md:text-4xl">R$ 47</span>
            </div>
            <p className="text-xs text-muted-foreground">Sem replay · Vagas limitadas</p>
          </div>
          <Button
            onClick={onOpenModal}
            size="lg"
            className="bg-gradient-to-r from-success to-success/70 hover:from-success/90 hover:to-success/60 text-white font-bold text-base md:text-lg px-12 py-7 h-auto rounded-full shadow-[0_8px_30px_hsl(var(--success)/0.4)] tracking-wider"
          >
            GARANTIR INGRESSO | LOTE 1
          </Button>
        </div>
      </div>
    </section>
  );
}
