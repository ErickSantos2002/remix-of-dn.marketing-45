import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

interface FinalCTASectionP1gProps {
  onOpenModal: () => void;
}

export function FinalCTASectionP1g({ onOpenModal }: FinalCTASectionP1gProps) {
  return (
    <section className="py-16 md:py-24 bg-black">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Direto ao ponto
          </h2>

          {/* Description */}
          <div className="space-y-4 text-lg text-gray-400">
            <p>
              Essa imersão é{" "}
              <strong className="text-white">100% gratuita</strong>{" "}
              por um motivo: <strong className="text-orange-500">Queremos que você experimente.</strong>
            </p>
            <p>
              Se você busca hacks mágicos, não venha.{" "}
              <br className="hidden md:inline" />
              Se busca <strong className="text-white">controle e escala</strong>, clique abaixo.
            </p>
          </div>

          {/* Lot Badge */}
          <Badge 
            className="px-4 py-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-500 text-white border-0 rounded-full"
          >
            <Flame className="w-3.5 h-3.5 mr-1.5" />
            VAGAS LIMITADAS
          </Badge>

          {/* CTA Button */}
          <div>
            <Button
              size="lg"
              onClick={onOpenModal}
              className="w-full sm:w-auto px-12 py-7 text-xl font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              FAZER MINHA APLICAÇÃO GRATUITA
            </Button>
          </div>

          {/* Trust text */}
          <p className="text-sm text-gray-500">
            Vagas limitadas · Evento online e ao vivo
          </p>
        </div>
      </div>
    </section>
  );
}
