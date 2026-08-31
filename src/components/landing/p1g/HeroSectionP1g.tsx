import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeroSectionP1gProps {
  onOpenModal: () => void;
}

export function HeroSectionP1g({ onOpenModal }: HeroSectionP1gProps) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Background Image - Right Side */}
      <div className="absolute right-0 top-0 w-full lg:w-[60%] h-full">
        <img
          src="/images/mentor-p1g.webp"
          alt="Rodrigo Nascimento - Mentor"
          className="w-full h-full object-cover object-[70%_center]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={1920}
          height={1080}
        />
        {/* Gradient overlay for text readability - matching reference */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      </div>
      
      <div className="container mx-auto px-6 md:px-8 lg:px-12 relative z-10 pt-28 pb-16">
        <div className="max-w-[600px] space-y-5">
          {/* Protocol Badge - outline style matching reference */}
          <Badge 
            variant="outline"
            className="px-5 py-2.5 text-sm border-orange-500 text-orange-500 bg-transparent rounded-full font-medium"
          >
            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2.5 inline-block" />
            PROTOCOLO DOMINANDO IA: DECODIFICANDO O NOVO
          </Badge>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.1] text-white">
            Aprenda{" "}
            <span className="text-orange-500">na prática a usar as IAs certas para criar uma</span>{" "}
            operação enxuta com IA
          </h1>

          {/* Subheadline */}
          <div className="space-y-4">
            <p className="text-base md:text-lg text-gray-400 leading-relaxed">
              <strong className="text-green-500 font-bold">E comece 2026 com a casa arrumada.</strong>{" "}
              <strong className="text-white font-semibold">Em 2 dias</strong>, ative o PROTOCOLO IA e construa Sistemas, Vídeos e Máquinas de Vendas em minutos —{" "}
              <strong className="text-white font-semibold">sem escrever uma linha de código</strong>.
            </p>
            {/* Orange accent line */}
            <div className="w-12 h-1 bg-orange-500" />
          </div>

          {/* Date Badge - outline style matching reference */}
          <div className="pt-2">
            <Badge 
              variant="outline" 
              className="px-5 py-2.5 text-sm border-orange-500/50 text-orange-500 rounded-full bg-transparent font-medium"
            >
              24 e 25 de Janeiro 9h às 17h
            </Badge>
          </div>


          {/* CTA Button */}
          <Button
            size="lg"
            onClick={onOpenModal}
            className="w-full sm:w-auto px-12 py-7 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            FAZER MINHA APLICAÇÃO GRATUITA
          </Button>
        </div>
      </div>
    </section>
  );
}
