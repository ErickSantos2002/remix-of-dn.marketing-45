import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, Radio } from "lucide-react";
import { PartnershipBadge } from "@/components/landing/PartnershipBadge";
import heroImg from "@/assets/hero-05maio.png";

interface HeroSection05MaioProps {
  onOpenModal: () => void;
}

export function HeroSection05Maio({ onOpenModal }: HeroSection05MaioProps) {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex flex-col items-center overflow-hidden pt-20 pb-10 px-4 bg-background"
    >
      {/* Glow orb behind image */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,hsl(var(--primary)/0.18)_0%,transparent_70%)] blur-[100px] opacity-60 pointer-events-none" />

      {/* Hero image — centered at top, contained inside the section */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto">
        <div className="relative">
          <img
            src={heroImg}
            alt="Rodrigo Nascimento e fundador do Grupo R1 — Imersão online dn.ia × R1"
            className="w-full h-auto object-contain"
            loading="eager"
          />
          {/* Black fade from bottom of image down into section */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-background/70 to-background pointer-events-none" />
          {/* Side vignettes to blend into background */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60 pointer-events-none" />
        </div>
      </div>

      {/* Content below image — pulled up so it overlaps the fade */}
      <div className="relative z-20 w-full max-w-[860px] mx-auto flex flex-col items-center text-center -mt-20 md:-mt-32 lg:-mt-40">
        {/* Co-brand pill */}
        <div className="animate-fade-in mb-4">
          <PartnershipBadge />
        </div>

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/50 bg-card/60 backdrop-blur-sm mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
          <span className="font-semibold text-[10px] md:text-xs tracking-[2.5px] uppercase text-muted-foreground">
            Imersão online · Exclusiva para membros R1
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-[1.9rem] sm:text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.05] tracking-tight mb-5 animate-slide-up">
          A imersão de IA que vai transformar a operação dos{" "}
          <span className="text-destructive">empresários do Grupo R1</span>.
        </h1>

        {/* Subheadline */}
        <p className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-[640px] mb-7">
          Um encontro online e exclusivo para membros do{" "}
          <strong className="text-foreground">Clube R1</strong> verem, na prática,
          como aplicar IA na gestão, marketing e vendas —{" "}
          <strong className="text-foreground">sem hype, sem teoria.</strong>
        </p>

        {/* Event info bar */}
        <div className="inline-flex flex-wrap items-center justify-center gap-5 md:gap-8 px-6 py-4 rounded-xl bg-card/70 border border-border/50 backdrop-blur-md mb-7 shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-destructive" />
            <span className="font-bold text-lg md:text-xl text-foreground tracking-tight">
              05/05
            </span>
          </div>
          <div className="hidden md:block w-px h-7 bg-border/50" />
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
            <span className="font-bold text-lg md:text-xl text-foreground tracking-tight">
              19h30
            </span>
          </div>
          <div className="hidden md:block w-px h-7 bg-border/50" />
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <span className="font-bold text-lg md:text-xl text-foreground tracking-tight">
              100% online
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-2.5">
          <Button
            onClick={onOpenModal}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm md:text-base px-10 md:px-12 py-5 md:py-6 h-auto rounded-md tracking-wider uppercase animate-glow-pulse"
          >
            Garantir minha vaga gratuita
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-[11px] md:text-xs text-muted-foreground tracking-wide">
            Inscrição sem custo · Acesso restrito a membros do Grupo R1
          </p>
        </div>
      </div>
    </section>
  );
}
