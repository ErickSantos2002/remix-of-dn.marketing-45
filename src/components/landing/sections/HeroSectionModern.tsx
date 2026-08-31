import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Target, Lock } from "lucide-react";
import mentorHero from "@/assets/mentor-hero.webp";

interface HeroSectionModernProps {
  onOpenModal: () => void;
  variant?: 'paid' | 'free';
}

export function HeroSectionModern({ onOpenModal, variant = 'paid' }: HeroSectionModernProps) {
  // Delay animations to prioritize LCP - disabled on mobile for performance
  const [showAnimations, setShowAnimations] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => window.innerWidth < 640;
    setIsMobile(checkMobile());
    
    // Only show animations on desktop after delay
    if (!checkMobile()) {
      const timer = setTimeout(() => setShowAnimations(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Generate particles for animation - only used on desktop
  const particles = [
    { id: 0, size: 5, x: 15, y: 20, delay: 0, duration: 5 },
    { id: 1, size: 3, x: 75, y: 10, delay: 1.2, duration: 6 },
    { id: 2, size: 4, x: 45, y: 60, delay: 0.5, duration: 4.5 },
    { id: 3, size: 6, x: 85, y: 40, delay: 2, duration: 5.5 },
    { id: 4, size: 3, x: 25, y: 80, delay: 0.8, duration: 7 },
    { id: 5, size: 5, x: 60, y: 30, delay: 1.5, duration: 4 },
    { id: 6, size: 4, x: 10, y: 50, delay: 2.5, duration: 6.5 },
    { id: 7, size: 3, x: 90, y: 70, delay: 0.3, duration: 5 },
    { id: 8, size: 6, x: 35, y: 15, delay: 1.8, duration: 4.8 },
    { id: 9, size: 4, x: 70, y: 85, delay: 0.7, duration: 5.2 },
    { id: 10, size: 5, x: 50, y: 45, delay: 2.2, duration: 6 },
    { id: 11, size: 3, x: 20, y: 65, delay: 1, duration: 5.8 },
    { id: 12, size: 4, x: 80, y: 25, delay: 1.7, duration: 4.3 },
    { id: 13, size: 6, x: 40, y: 90, delay: 0.2, duration: 6.2 },
    { id: 14, size: 5, x: 65, y: 55, delay: 2.8, duration: 5.5 },
  ];

  return (
    <section id="inicio" className="relative min-h-[100dvh] lg:min-h-screen flex items-start overflow-hidden">
      {/* Mobile Background - Solid dark for performance (no image) */}
      <div className="absolute inset-0 sm:hidden bg-background" />
      
      {/* Desktop Background */}
      <div className="absolute inset-0 bg-background hidden sm:block" />
      
      {/* Particles - only on desktop, deferred loading */}
      {!isMobile && showAnimations && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="particle-float"
              style={{
                position: 'absolute',
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            />
          ))}
          
          {/* Light streaks */}
          <div className="light-streak light-streak-1" />
          <div className="light-streak light-streak-2" />
          <div className="light-streak light-streak-3" />
        </div>
      )}
      
      {/* Glow effects - hidden on mobile for performance */}
      <div 
        className="hidden sm:block absolute top-0 left-0 w-[70%] h-[70%] -translate-x-1/4 -translate-y-1/4 opacity-50 pointer-events-none z-[2] glow-effect-primary"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.25) 0%, transparent 60%)',
        }}
      />
      <div 
        className="hidden sm:block absolute bottom-0 right-0 w-[60%] h-[60%] translate-x-1/4 translate-y-1/4 opacity-40 pointer-events-none z-[2] glow-effect-secondary"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.2) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full px-6 sm:px-6 md:px-12 lg:px-16 xl:px-24 pt-32 lg:pt-32 pb-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-8 max-w-7xl mx-auto">
          
          {/* Left Column - Text */}
          <div className="w-full lg:w-[55%] xl:w-[50%] text-center lg:text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-4 sm:py-2 rounded-full border border-primary/30 bg-primary/5 mb-4 animate-fade-in">
              <span className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs sm:text-xs font-medium text-foreground/80 tracking-wide uppercase">
                24 e 25 DE JANEIRO | ONLINE & AO VIVO | 09 às 17h
              </span>
            </div>

            {/* Badge - Subtle styling to not compete with CTA */}
            <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 sm:px-4 sm:py-2 rounded-lg border border-primary/40 bg-primary/5 text-foreground/70 text-xs sm:text-sm font-medium uppercase tracking-wide">
                <Target className="w-4 h-4 sm:w-4 sm:h-4 text-primary/60" />
                PROTOCOLO DOMINANDO IA: DECODIFICANDO O NOVO
              </span>
            </div>

            {/* Headline Principal - Grande */}
            <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.15] tracking-tight mb-6 sm:mb-8">
              <span className="text-foreground">Implemente o Kit Completo de IA Empresarial</span>
            </h1>

            {/* Subheadline */}
            <div className="mb-8 sm:mb-10 space-y-3 sm:space-y-3">
              <p className="text-base sm:text-base md:text-lg text-white leading-relaxed">
                Tenha acesso ao arsenal de processos e ferramentas que usei para triplicar meu faturamento com uma equipe de apenas 5 pessoas — Implementado no seu negócio em 48h.
              </p>
              
              <p className="text-lg sm:text-lg text-primary font-bold">
                Sem confusão. Sem sobrecarga.
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col items-center lg:items-start gap-3">
              {/* Price highlight above CTA */}
              <p className="text-lg sm:text-lg">
                <span className="text-red-500 line-through font-medium">De R$ 197,00</span>
                <span className="text-muted-foreground"> por </span>
                <span className="text-green-500 font-bold text-xl">R$ 47,00</span>
              </p>
              
              <Button
                onClick={onOpenModal}
                size="lg"
                className="relative w-full sm:w-auto bg-success hover:bg-success/90 text-white font-bold text-base sm:text-base md:text-lg px-8 sm:px-8 md:px-10 py-5 sm:py-4 md:py-5 h-auto rounded-2xl overflow-hidden group shadow-lg shadow-success/30"
              >
                {/* Shine effect */}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine" />
                <span className="relative flex items-center justify-center">
                  GARANTIR MEU LUGAR | LOTE 1
                </span>
              </Button>
              
              <p className="text-xs sm:text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Sistema funcionando ou 100% do dinheiro de volta
              </p>
            </div>
          </div>

          {/* Right Column - Mentor Photo with Particles */}
          <div className="hidden sm:flex w-full lg:w-[50%] xl:w-[50%] items-center justify-center lg:justify-start">
            <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl lg:-ml-8 xl:-ml-12">
              {/* Particle container */}
              {!isMobile && showAnimations && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {/* Floating particles */}
                  {particles.map((particle) => (
                    <div
                      key={particle.id}
                      className="particle-float"
                      style={{
                        position: 'absolute',
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        animationDelay: `${particle.delay}s`,
                        animationDuration: `${particle.duration}s`,
                      }}
                    />
                  ))}
                  
                  {/* Light streaks - diagonal lines matching photo */}
                  <div className="light-streak light-streak-1" />
                  <div className="light-streak light-streak-2" />
                  <div className="light-streak light-streak-3" />
                </div>
              )}
              
              {/* Glow pulse behind image */}
              <div 
                className="absolute inset-0 rounded-2xl animate-hero-glow"
                style={{
                  background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                  transform: 'scale(1.2)',
                }}
              />
              
              {/* Mentor image */}
              <div className="relative">
                <img
                  src={mentorHero}
                  alt="Mentor"
                  className="w-full h-auto max-h-[65vh] object-contain object-top rounded-2xl shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
                  style={{
                    boxShadow: '0 0 60px -10px hsl(var(--primary) / 0.5)',
                  }}
                />
                
                {/* Bottom gradient fade */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1/4 rounded-b-2xl pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
