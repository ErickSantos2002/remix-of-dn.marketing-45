import { Button } from "@/components/ui/button";
import { Flame, Zap } from "lucide-react";

interface ToolkitCTASectionProps {
  onOpenModal: () => void;
}

export function ToolkitCTASection({ onOpenModal }: ToolkitCTASectionProps) {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background-secondary" />
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--success) / 0.2) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Content */}
      <div className="section-container relative z-10">
        <div className="max-w-3xl mx-auto text-center">

          {/* Headline */}
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4">
            Domine Todas Essas Ferramentas em{" "}
            <span className="text-success">48 horas</span>
          </h3>

          {/* Subheadline */}
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Você terá acesso ao passo a passo para implementar cada uma dessas ferramentas no seu negócio, com acompanhamento ao vivo.
          </p>

          {/* Price highlight */}
          <div className="flex flex-col items-center gap-1 mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-sm md:text-base text-muted-foreground">DE</span>
              <span className="text-destructive line-through font-semibold text-lg md:text-xl">R$ 197</span>
              <span className="text-sm md:text-base text-muted-foreground">POR</span>
              <span className="text-success font-bold text-3xl md:text-4xl">R$ 47</span>
            </div>
            <p className="text-xs text-muted-foreground">Sem replay · Vagas limitadas</p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onOpenModal}
            size="lg"
            className="bg-gradient-to-r from-success to-success/70 hover:from-success/90 hover:to-success/60 text-white font-bold text-base md:text-lg px-12 py-7 h-auto rounded-full shadow-[0_8px_30px_hsl(var(--success)/0.4)] tracking-wider mx-auto"
          >
            GARANTIR INGRESSO | LOTE 1
          </Button>
        </div>
      </div>
    </section>
  );
}
