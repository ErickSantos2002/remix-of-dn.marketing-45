import { Button } from "@/components/ui/button";
import { LogoCarousel } from "@/components/landing/LogoCarousel";
import { useEffect, useState } from "react";
import { trackCtaClick } from "@/lib/metaTracking";

interface HeroSectionProgramaProps {
  onOpenModal: () => void;
}

function StaticGradientBg() {
  return (
    <div
      className="w-full h-full"
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, hsl(2 88% 47% / 0.4) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, hsl(227 100% 62% / 0.35) 0%, transparent 55%), hsl(0 0% 2%)",
      }}
    />
  );
}

export function HeroSectionPrograma({ onOpenModal }: HeroSectionProgramaProps) {
  const [showCarousel, setShowCarousel] = useState(false);

  useEffect(() => {
    // Mount LogoCarousel only after Hero has painted to keep LCP fast.
    const t = setTimeout(() => setShowCarousel(true), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <section id="inicio" className="relative min-h-[90vh] flex items-center pt-24 pb-16 md:pt-32 md:pb-24 overflow-x-hidden">
      <div className="absolute inset-0">
        <StaticGradientBg />
      </div>
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background" />

      <div className="w-full px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-primary mb-4 sm:mb-6 font-medium">
            Diagnóstico de IAficação para PMEs
          </p>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.15] mb-4 sm:mb-6 break-words">
            Você já sabe que IA pode levar sua empresa a outro patamar.{" "}
            <span className="text-gradient-dnia">O problema é não saber por onde começar.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            Em uma reunião on-line de diagnóstico olho no olho, a dn.ia vai entender os gargalos da sua operação e montar um plano para aplicar a IA certa nos locais certos para gerar resultados visíveis em 90 dias.
          </p>

          <Button
            onClick={() => { trackCtaClick("hero_principal"); onOpenModal(); }}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm sm:text-base md:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-2xl w-full sm:w-auto sm:animate-glow-pulse"
          >
            Agendar meu diagnóstico agora
          </Button>

          <div className="mt-8 sm:mt-10 min-h-[140px]">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium">
              A dn.ia já ajudou a IAficar algumas das maiores empresas do Brasil
            </p>
            <p className="text-xs text-muted-foreground/70 mb-4">+100 empresas IAficadas</p>
            {showCarousel && <LogoCarousel />}
          </div>
        </div>
      </div>
    </section>
  );
}
