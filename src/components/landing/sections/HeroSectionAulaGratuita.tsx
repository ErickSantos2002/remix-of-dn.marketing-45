import { Button } from "@/components/ui/button";
import { Flame, Calendar, Clock } from "lucide-react";
import heroBgPalco from "@/assets/hero-bg-palco.jpg";

interface HeroSectionAulaGratuitaProps {
  onOpenModal: () => void;
}

export function HeroSectionAulaGratuita({ onOpenModal }: HeroSectionAulaGratuitaProps) {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center pt-20 md:pt-24 overflow-hidden">
      {/* Background Photo */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${heroBgPalco})` }}
      />
      <div className="absolute inset-0 bg-background/70" />

      {/* Content */}
      <div className="section-container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
              <span className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
                <span className="text-sm font-semibold text-destructive uppercase tracking-wide">Ao Vivo</span>
              </span>
              <span className="w-px h-4 bg-border"></span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                24 e 25 de Fevereiro
              </span>
              <span className="w-px h-4 bg-border"></span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                19:30
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight mb-6">
              Uma aula online e ao vivo para te mostrar como{" "}
              <span className="text-gradient font-black">aumentar sua margem</span>{" "}
              e{" "}
              <span className="text-white font-bold">reduzir despesas</span>{" "}
              usando IA na prática
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-xl mx-auto">
              Aprenda o método passo a passo para aumentar margem, reduzir despesas e escalar seu negócio usando inteligência artificial
              <span className="text-foreground font-medium"> sem enrolação, sem replay.</span>
            </p>

            {/* Pricing + CTA */}
            <div className="flex flex-col items-center gap-4 justify-center">
              <p className="text-lg md:text-xl text-muted-foreground">
                DE <span className="text-destructive line-through font-semibold">R$ 197</span> POR <span className="text-success font-bold text-2xl md:text-3xl">R$ 47</span>
              </p>
              <Button
                onClick={onOpenModal}
                size="lg"
                className="relative bg-success hover:bg-success/90 text-white font-bold text-lg px-8 py-7 h-auto rounded-xl overflow-hidden group shadow-lg shadow-success/25"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
                <span className="relative flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  GARANTIR INGRESSO | LOTE 1
                </span>
              </Button>
            </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
