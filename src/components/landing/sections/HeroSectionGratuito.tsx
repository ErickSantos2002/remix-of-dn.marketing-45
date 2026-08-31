import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import heroBackground from "@/assets/hero-background.png";

interface HeroSectionGratuitoProps {
  onOpenModal: () => void;
}

export function HeroSectionGratuito({ onOpenModal }: HeroSectionGratuitoProps) {
  return (
    <section id="inicio" className="relative min-h-screen flex flex-col lg:flex-row lg:items-center overflow-hidden">
      {/* Mobile/Tablet - Image as background at top */}
      <div className="lg:hidden relative w-full h-[50vh] sm:h-[55vh]">
        <img
          src={heroBackground}
          alt="Protocolo Dominando IA"
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ objectPosition: "center 20%" }}
          fetchPriority="high"
          decoding="async"
        />
        {/* Gradient overlay for smooth transition to content */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background" />
      </div>

      {/* Desktop - Background image */}
      <img
        src={heroBackground}
        alt="Protocolo Dominando IA"
        className="absolute inset-0 hidden lg:block w-full h-full object-cover object-right"
        style={{ objectPosition: "right 20%" }}
        fetchPriority="high"
        decoding="async"
      />

      {/* Dark overlay for text readability - only on desktop */}
      <div className="absolute inset-0 hidden lg:block bg-background/10" />

      {/* Gradient fade on left for text area - only on desktop */}
      <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-2/3 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />

      {/* Content */}
      <div className="w-full relative z-20 px-6 md:px-12 lg:px-0 -mt-16 lg:mt-0">
        <div className="flex flex-col lg:flex-row items-center lg:min-h-screen">
          {/* Left Column - Text */}
          <div className="w-full lg:w-[55%] lg:pl-16 xl:pl-24 pb-20 lg:pt-24 lg:pb-0 relative z-30">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary tracking-wider uppercase">
                PROTOCOLO DOMINANDO IA: DECODIFICANDO O NOVO
              </span>
            </div>

            {/* H1 - 3 layers */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold leading-[1.15] mb-6">
              <span className="text-foreground">Aprenda </span>
              <span className="text-gradient">na prática a usar as IAs certas </span>
              <span className="text-gradient">para criar uma </span>
              <span className="text-foreground">operação enxuta com IA</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base md:text-lg mb-6 max-w-xl text-muted-foreground">
              <span className="text-green-500 font-bold">E comece 2026 com a casa arrumada.</span>{" "}
              <span className="text-foreground font-bold">Em 2 dias</span>, ative o PROTOCOLO IA e construa Sistemas,
              Vídeos e Máquinas de Vendas em minutos —{" "}
              <span className="text-foreground font-bold">sem escrever uma linha de código</span>.
            </p>

            {/* Date badge */}
            <div className="mb-8">
              <div className="h-1 w-16 bg-primary mb-4" />
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5">
                <span className="text-sm font-medium text-primary">24 e 25 de Janeiro 9h às 17h</span>
              </div>
            </div>

            {/* CTA Button - Free Version */}
            <div className="flex flex-col items-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold uppercase tracking-wider">
                <Check className="w-3 h-3" />
                INSCRIÇÃO GRATUITA
              </span>
              <Button
                onClick={onOpenModal}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base md:text-lg px-8 py-6 h-auto rounded-lg animate-glow-pulse"
              >
                FAZER MINHA APLICAÇÃO GRATUITA
              </Button>
            </div>
          </div>

          {/* Right Column - Empty space for background image visibility */}
          <div className="hidden lg:block w-[45%] h-screen" />
        </div>
      </div>
    </section>
  );
}
