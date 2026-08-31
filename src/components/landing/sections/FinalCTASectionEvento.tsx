import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCTASectionEventoProps {
  onOpenModal: () => void;
}

export function FinalCTASectionEvento({ onOpenModal }: FinalCTASectionEventoProps) {
  return (
    <section id="inscricao" className="relative section-padding overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      {/* Background glow */}
      <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[radial-gradient(circle,hsl(var(--accent)/0.25)_0%,transparent_65%)] blur-[100px] opacity-30 pointer-events-none" />

      <div className="max-w-[760px] mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center gap-3 justify-center mb-4 text-accent font-semibold text-xs tracking-[4px] uppercase">
            <div className="w-6 h-px bg-accent" />
            Garanta sua chance de escalar seus resultados
            <div className="w-6 h-px bg-accent" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] mb-4">
            Sua empresa vai mudar.
            <br />
            <span className="text-accent">A pergunta é quando.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-[520px] mx-auto">
            Você pode esperar mais 6 meses tentando entender IA sozinho. Ou pode
            investir R$47 e sair em 2 dias com um plano de ação pronto.
          </p>
        </div>

        {/* Scarcity bar */}
        <div className="flex items-center justify-center gap-4 px-6 py-4 rounded-xl bg-primary/6 border border-primary/15 mb-9 text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
          <span className="font-bold text-sm text-primary tracking-wide">
            Vagas limitadas — <span className="text-foreground">evento ao vivo sem replay</span>
          </span>
        </div>

        {/* Form Card */}
        <div className="p-8 md:p-12 rounded-2xl glass-card relative overflow-hidden">
          {/* Top gradient bar */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-accent to-primary" />
          <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-[radial-gradient(circle,hsl(var(--accent)/0.08)_0%,transparent_70%)] pointer-events-none" />

          <div className="font-bold text-xl md:text-2xl text-center mb-2">Garanta sua chance de escalar seus resultados</div>
          <div className="text-sm text-muted-foreground text-center mb-8">
            Preencha seus dados para fazer sua aplicação
          </div>

          {/* Price Block */}
          <div className="text-center mb-8 p-6 rounded-xl bg-accent/4 border border-accent/10">
            <div className="font-semibold text-xs tracking-[2px] uppercase text-muted-foreground mb-2">
              Investimento único
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-semibold text-xl text-muted-foreground">R$</span>
              <span className="font-bold text-5xl md:text-6xl leading-none">47</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Acesso completo aos 2 dias de evento ao vivo
            </div>
          </div>

          {/* CTA Button - opens modal */}
          <Button
            onClick={onOpenModal}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base tracking-wider uppercase py-5 h-auto animate-glow-pulse"
          >
            FAZER MINHA APLICAÇÃO por R$47
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            Seus dados estão seguros e não serão compartilhados
          </div>
        </div>

        {/* Binary close */}
        <div className="text-center mt-14 p-8 md:p-10 rounded-2xl glass-card">
          <div className="font-bold text-xs tracking-[3px] uppercase text-muted-foreground mb-5">
            Existem 2 tipos de empresários
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-5 items-center max-w-[700px] mx-auto mb-6">
            <div className="p-5 rounded-xl bg-primary/4 border border-primary/10 text-sm text-muted-foreground leading-snug">
              Os que perdem tempo e dinheiro tentando descobrir IA sozinhos
            </div>
            <div className="font-bold text-xs tracking-[3px] uppercase text-muted-foreground">
              ou
            </div>
            <div className="p-5 rounded-xl bg-accent/6 border border-accent/15 text-sm text-foreground leading-snug font-medium">
              Os que investem R$47 e saem com um plano de ação pronto em 2 dias
            </div>
          </div>

          <div className="font-bold text-base md:text-lg">
            Qual dos dois é <span className="text-accent">você</span>?
          </div>
        </div>
      </div>
    </section>
  );
}
