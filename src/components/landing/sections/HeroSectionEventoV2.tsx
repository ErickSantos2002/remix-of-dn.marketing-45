import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, Radio } from "lucide-react";
import rodrigoImg from "@/assets/rodrigo-hero.jpg";
import rodrigoMobileImg from "@/assets/rodrigo-mobile.jpg";

interface HeroSectionEventoV2Props {
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

export function HeroSectionEventoV2({ onOpenModal }: HeroSectionEventoV2Props) {
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
          {/* Badge — enlarged and prominent */}
          <div className="flex flex-wrap items-center gap-3 mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 border border-primary/40 rounded-full bg-primary/10 backdrop-blur-xl">
              <Radio className="w-4 h-4 text-primary animate-pulse" />
              <span className="font-bold text-sm md:text-base tracking-[2px] uppercase text-primary">
                Evento ao vivo
              </span>
            </div>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 border border-destructive/40 rounded-full bg-destructive/10 backdrop-blur-xl">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="font-bold text-sm md:text-base tracking-[2px] uppercase text-destructive">
                Vagas limitadas
              </span>
            </div>
          </div>

          {/* Typewriter */}
          <TypewriterRedline />

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.08] tracking-tight mb-6 animate-slide-up">
            Evento online sobre como{" "}
            <span className="text-gradient">aumentar lucro</span> e{" "}
            <span className="text-gradient">diminuir custos</span> da sua empresa com{" "}
            <span className="text-primary">IA.</span>
          </h1>

          {/* Sub */}
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-[600px] mb-8">
            Um evento de empresário para empresário.
            <br />
            Afinal, quem nunca pagou um boleto não consegue te ensinar como
            usar IA para{" "}
            <strong className="text-foreground">
              realmente aumentar lucro e reduzir custo.
            </strong>
          </p>

          {/* Event date — large */}
          <div className="flex items-center gap-4 md:gap-6 mb-8">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 md:w-7 md:h-7 text-accent" />
              <span className="font-bold text-xl md:text-2xl lg:text-3xl text-foreground">
                24 e 25 de Fevereiro
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              <span className="font-bold text-xl md:text-2xl lg:text-3xl text-foreground">
                19h30
              </span>
            </div>
          </div>

          {/* Price + CTA */}
          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-1">
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm md:text-base px-8 md:px-10 py-5 md:py-6 h-auto rounded-md tracking-wider uppercase animate-glow-pulse"
            >
              Garantir minha vaga agora
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
