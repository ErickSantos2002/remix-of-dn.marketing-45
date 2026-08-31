import { Button } from "@/components/ui/button";
import { Lightbulb, Flame } from "lucide-react";

interface RationalSectionProps {
  onOpenModal: () => void;
}

export function RationalSection({ onOpenModal }: RationalSectionProps) {
  return (
    <section className="py-12 bg-background-secondary">
      <div className="section-container">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center justify-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            AINDA NA DÚVIDA?
          </h3>
          
          <p className="text-text-muted text-sm md:text-base italic leading-relaxed mb-8">
            Segundo a McKinsey, empresas que utilizam IA relatam{" "}
            <span className="text-text-secondary font-medium">
              aumento de até 50% em conversão em vendas
            </span>{" "}
            e{" "}
            <span className="text-text-secondary font-medium">
              redução de até 40% em custos operacionais
            </span>
            , gerando vantagens competitivas claras em automação e velocidade.
          </p>

          <div className="flex flex-col items-center gap-1 mb-6">
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
            className="bg-gradient-to-r from-success to-success/70 hover:from-success/90 hover:to-success/60 text-white font-bold text-base md:text-lg px-12 py-7 h-auto rounded-full shadow-[0_8px_30px_hsl(var(--success)/0.4)] tracking-wider"
          >
            GARANTIR INGRESSO | LOTE 1
          </Button>
        </div>
      </div>
    </section>
  );
}
