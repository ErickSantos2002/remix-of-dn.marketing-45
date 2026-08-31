import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PricingSectionProps {
  onOpenModal: () => void;
}

const benefits = [
  "2 dias completos de imersão (09h-17h)",
  "Suporte direto do time em tempo real",
  "Todos os frameworks e materiais",
  "Certificado de conclusão",
  "Garantia Incondicional",
];

// Countdown ends on January 24, 2026 at 08:00:00 (event start)
const EVENT_START_DATE = new Date("2026-01-24T08:00:00");

export function PricingSection({ onOpenModal }: PricingSectionProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = EVENT_START_DATE.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <section id="preco" className="relative section-padding overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />

      {/* Content */}
      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
            <span className="text-gradient font-extrabold">
              Garanta seu Acesso à Imersão e ao Kit Completo
            </span>
          </h2>
        </div>

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Left Column - Benefits Checklist */}
          <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6 md:p-8">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6">
              O que está incluso:
            </h3>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 pb-4 border-b border-border/30 last:border-b-0 last:pb-0"
                >
                  <Check className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="text-foreground text-sm md:text-base">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Pricing Lots */}
          <div className="space-y-4">
            {/* Lote 1 - Active/Highlighted */}
            <div className="relative">
              {/* Badge */}
              <div className="absolute -top-3 left-6 z-10">
                <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-md uppercase tracking-wider">
                  LOTE 01
                </span>
              </div>

              {/* Card */}
              <div className="rounded-2xl border-2 border-primary bg-black p-6 pt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl md:text-4xl font-black text-foreground">
                        6x de R$ 8,47
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      ou R$ 47 à vista
                    </p>
                  </div>

                  <Button
                    onClick={onOpenModal}
                    className="bg-success hover:bg-success/90 text-white font-bold px-6 py-5 h-auto rounded-lg whitespace-nowrap"
                  >
                    Garantir meu Lugar
                  </Button>
                </div>

                {/* Countdown Timer */}
                <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-center">
                  <p className="text-red-400 font-medium text-xs md:text-sm">
                    O evento começa em{" "}
                    <span className="font-semibold text-red-300">
                      {formatNumber(timeLeft.days)}d : {formatNumber(timeLeft.hours)}h : {formatNumber(timeLeft.minutes)}m : {formatNumber(timeLeft.seconds)}s
                    </span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
