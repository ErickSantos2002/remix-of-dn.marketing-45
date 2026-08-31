import { Button } from "@/components/ui/button";
import { Star, Flame } from "lucide-react";

interface GuaranteeSectionProps {
  onOpenModal: () => void;
}

// Generate starburst points
const generateStarburstPoints = (
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  numPoints: number
): string => {
  const points: string[] = [];
  const angleStep = (2 * Math.PI) / numPoints;

  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const outerX = cx + outerRadius * Math.cos(angle);
    const outerY = cy + outerRadius * Math.sin(angle);
    points.push(`${outerX},${outerY}`);

    const innerAngle = angle + angleStep / 2;
    const innerX = cx + innerRadius * Math.cos(innerAngle);
    const innerY = cy + innerRadius * Math.sin(innerAngle);
    points.push(`${innerX},${innerY}`);
  }

  return points.join(" ");
};

export function GuaranteeSection({ onOpenModal }: GuaranteeSectionProps) {
  const starburstPoints = generateStarburstPoints(100, 100, 98, 82, 32);

  return (
    <section id="garantia" className="relative section-padding overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />

      {/* Content */}
      <div className="section-container relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-8 md:gap-10">
            {/* Guarantee Badge - Starburst Style */}
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              {/* SVG Starburst Background */}
              <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full drop-shadow-2xl">
                <defs>
                  <linearGradient id="starburstGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="50%" stopColor="hsl(25, 95%, 45%)" />
                    <stop offset="100%" stopColor="hsl(20, 90%, 35%)" />
                  </linearGradient>
                </defs>
                <polygon 
                  points={starburstPoints}
                  fill="url(#starburstGradient)"
                />
              </svg>

              {/* Inner Circle with Content */}
              <div className="absolute inset-5 md:inset-6 rounded-full bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-700/80 flex flex-col items-center justify-center overflow-hidden">
                {/* Curved Text - Top Arc */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <path 
                      id="topArc" 
                      d="M 12,50 A 38,38 0 0,1 88,50" 
                      fill="none" 
                    />
                  </defs>
                  <text 
                    className="fill-amber-200 font-bold"
                    style={{ fontSize: '8px', letterSpacing: '0.15em' }}
                  >
                    <textPath href="#topArc" startOffset="50%" textAnchor="middle">
                      GARANTIA DE
                    </textPath>
                  </text>
                </svg>

                {/* Stars */}
                <div className="flex gap-1 mt-4 mb-1">
                  {[...Array(3)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 md:w-4 md:h-4 text-primary fill-primary" />
                  ))}
                </div>

                {/* 100% */}
                <span className="text-4xl md:text-5xl font-black text-amber-100 leading-none">
                  100%
                </span>

                {/* DO SEU */}
                <span className="text-xs md:text-sm font-bold text-amber-200 mt-1">
                  DO SEU
                </span>

                {/* Curved Text - Bottom Arc */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <path 
                      id="bottomArc" 
                      d="M 10,58 A 40,40 0 0,0 90,58" 
                      fill="none" 
                    />
                  </defs>
                  <text 
                    className="fill-amber-200 font-bold"
                    style={{ fontSize: '6.5px', letterSpacing: '0.12em' }}
                  >
                    <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
                      DINHEIRO DE VOLTA
                    </textPath>
                  </text>
                </svg>
              </div>
            </div>

            {/* Text Content */}
            <div className="text-center max-w-2xl">
              <p className="text-lg md:text-xl text-primary font-medium mb-4">
                Se você participar dos 2 dias completos da Imersão, 
                aplicar o Protocolo Dominando IA, e não sair com 
                pelo menos 1 ferramenta funcionando no seu negócio, 
                basta pedir seu dinheiro de volta.
              </p>

              <p className="text-foreground text-lg mb-4">
                <span className="font-bold">Devolveremos 100% do valor investido</span><br />
                sem questionamentos.
              </p>

              <div className="space-y-2 text-muted-foreground mb-8">
                <p className="font-medium text-foreground">Você assume zero risco.</p>
                <p>Nós assumimos o compromisso de entregar resultado.</p>
              </div>

              {/* CTA */}
              <Button
                onClick={onOpenModal}
                size="lg"
                className="bg-success hover:bg-success/90 text-white font-bold text-base md:text-lg px-8 py-6 h-auto rounded-xl flex items-center gap-2 mx-auto"
              >
                <Flame className="w-5 h-5" />
                GARANTIR MEU LUGAR | LOTE 1
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
