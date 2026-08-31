import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, Radio } from "lucide-react";
import rodrigoImg from "@/assets/rodrigo-hero.jpg";
import rodrigoMobileImg from "@/assets/rodrigo-mobile.jpg";

interface HeroSection27AbrilProps {
  onOpenModal: () => void;
}

const phrases = [
  { text: "mais lucro · menos custo", pause: 2500 },
  { text: "mais controle · menos burocracia", pause: 2500 },
  { text: "mais velocidade · menos desperdício", pause: 2500 },
  { text: "mais margem · menos dependência", pause: 2500 },
];

function TypewriterRedline() {
  const [charIdx, setCharIdx] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const current = phrases[phraseIdx];
  const parts = current.text.split(" · ");

  useEffect(() => {
    const fullText = current.text;

    if (!isDeleting) {
      if (charIdx <= fullText.length) {
        const timer = setTimeout(() => setCharIdx((c) => c + 1), 45);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setIsDeleting(true), current.pause);
        return () => clearTimeout(timer);
      }
    } else {
      if (charIdx >= 0) {
        const timer = setTimeout(() => setCharIdx((c) => c - 1), 25);
        return () => clearTimeout(timer);
      } else {
        setIsDeleting(false);
        setCharIdx(0);
        setPhraseIdx((p) => (p + 1) % phrases.length);
      }
    }
  }, [charIdx, isDeleting, current, phraseIdx]);

  const displayed = current.text.substring(0, Math.max(0, charIdx));
  const separatorIdx = parts[0].length + 3;

  let content;
  if (charIdx > separatorIdx) {
    content = (
      <>
        {parts[0]} ·{" "}
        <span className="text-primary">{displayed.substring(separatorIdx)}</span>
      </>
    );
  } else {
    content = <>{displayed}</>;
  }

  return (
    <div className="min-h-[32px] mb-6">
      <div className="font-semibold text-xs md:text-sm tracking-[3px] uppercase text-accent">
        {content}
        <span className="inline-block w-0.5 h-[16px] bg-accent ml-1 align-middle animate-pulse" />
      </div>
    </div>
  );
}

export function HeroSection27Abril({ onOpenModal }: HeroSection27AbrilProps) {
  return (
    <section id="inicio" className="relative min-h-screen flex flex-col lg:flex-row items-center px-6 pt-0 lg:pt-20 pb-16 overflow-hidden">
      {/* Mobile background photo */}
      <div className="absolute inset-0 lg:hidden pointer-events-none">
        <img
          src={rodrigoMobileImg}
          alt="Rodrigo Nascimento"
          className="w-full h-full object-cover opacity-[0.15]"
          style={{ objectPosition: '50% 15%' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 20%, hsl(var(--background) / 0.3) 45%, hsl(var(--background)) 65%)' }}
        />
      </div>

      {/* Desktop background image — right side with gradient fade */}
      <div className="absolute inset-y-0 right-0 w-[55%] hidden lg:block pointer-events-none">
        <img
          src={rodrigoImg}
          alt="Rodrigo Nascimento"
          className="w-full h-full object-cover object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
      </div>

      {/* Glow orbs */}
      <div className="absolute -top-[200px] -right-[150px] w-[600px] h-[600px] bg-[radial-gradient(circle,hsl(var(--accent)/0.25)_0%,transparent_70%)] blur-[80px] opacity-50 animate-hero-glow pointer-events-none" />
      <div className="absolute -bottom-[100px] -left-[200px] w-[500px] h-[500px] bg-[radial-gradient(circle,hsl(var(--primary)/0.3)_0%,transparent_70%)] blur-[100px] opacity-25 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Content — left side */}
        <div className="text-left max-w-[650px]">
          {/* Brand tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-border/50 rounded-full bg-card/50 backdrop-blur-xl mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-xs tracking-[2px] uppercase text-muted-foreground">
              evento online · gratuito
            </span>
          </div>

          {/* Typewriter */}
          <TypewriterRedline />

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.08] tracking-tight mb-4 animate-slide-up">
            Todo mundo já entendeu que IA é importante.{" "}
            <span className="text-gradient">Poucos sabem fazer funcionar.</span>{" "}
            <span className="text-primary">Operar com ela.</span>
          </h1>

          {/* Sub */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-[600px] mb-8 mt-6">
            Nesse evento gratuito, você vai ver como empresas estão colocando IA pra rodar na prática —{" "}
            <strong className="text-foreground">sem hype, sem teoria.</strong>
          </p>

          {/* Event info bar */}
          <div className="inline-flex flex-wrap items-center gap-6 md:gap-8 px-7 py-5 rounded-xl bg-card/60 border border-border/40 backdrop-blur-sm mb-8 shadow-[0_0_30px_hsl(var(--accent)/0.08)]">
            <div className="flex items-center gap-3 text-base md:text-lg">
              <Calendar className="w-6 h-6 md:w-7 md:h-7 text-accent" />
              <span className="font-bold text-xl md:text-2xl text-foreground tracking-tight">27/04</span>
            </div>
            <div className="flex items-center gap-3 text-base md:text-lg">
              <Clock className="w-6 h-6 md:w-7 md:h-7 text-muted-foreground" />
              <span className="font-bold text-xl md:text-2xl text-foreground tracking-tight">19h30</span>
            </div>
            <div className="flex items-center gap-3 text-base md:text-lg">
              <Radio className="w-6 h-6 md:w-7 md:h-7 text-accent" />
              <span className="font-bold text-xl md:text-2xl text-foreground tracking-tight">100% online</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-start gap-4">
            <Button
              onClick={onOpenModal}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm md:text-base px-8 md:px-10 py-5 md:py-6 h-auto rounded-md tracking-wider uppercase animate-glow-pulse"
            >
              Participar gratuitamente
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="w-px h-10 bg-gradient-to-b from-accent to-transparent mx-auto animate-pulse" />
      </div>
    </section>
  );
}
