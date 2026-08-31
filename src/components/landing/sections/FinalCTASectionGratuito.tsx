import { Button } from "@/components/ui/button";
import { Shield, Flame, Lock, Check } from "lucide-react";

interface FinalCTASectionGratuitoProps {
  onOpenModal: () => void;
}

export function FinalCTASectionGratuito({ onOpenModal }: FinalCTASectionGratuitoProps) {
  return (
    <section id="inscricao" className="relative section-padding overflow-hidden">
      {/* Background with glow */}
      <div className="absolute inset-0 bg-background" />
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[80%] opacity-60 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center bottom, hsl(var(--success) / 0.3) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="section-container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6">
            Sua Decisão Define seu 2026
          </h2>

          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            A diferença entre quem lidera e quem fica para trás não é talento. 
            É <span className="text-foreground font-medium">decisão</span>.
          </p>

          {/* Pricing + CTA */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg md:text-xl text-muted-foreground">
              DE <span className="text-destructive line-through font-semibold">R$ 197</span> POR <span className="text-success font-bold text-2xl md:text-3xl">R$ 47</span>
            </p>
            <Button
              onClick={onOpenModal}
              size="lg"
              className="relative bg-success hover:bg-success/90 text-white font-bold text-lg md:text-2xl px-10 md:px-16 py-8 md:py-10 h-auto rounded-2xl overflow-hidden group shadow-2xl shadow-success/30"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
              <span className="relative flex items-center gap-2">
                <Flame className="w-6 h-6" />
                GARANTIR INGRESSO | LOTE 1
              </span>
            </Button>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Evento ao vivo
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Vagas limitadas
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                Compra segura
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
