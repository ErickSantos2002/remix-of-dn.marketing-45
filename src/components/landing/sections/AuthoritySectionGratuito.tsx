import { Button } from "@/components/ui/button";
import { Flame, Users, Award } from "lucide-react";
import localizaLogo from "@/assets/clients/localiza.png";
import drogariaAraujoLogo from "@/assets/clients/drogaria-araujo.png";
import hotmartLogo from "@/assets/clients/hotmart.png";
import solidesLogo from "@/assets/clients/solides.webp";
import symplaLogo from "@/assets/clients/sympla.png";

import ifoodLogo from "@/assets/clients/ifood.png";
import santanderLogo from "@/assets/clients/santander.png";
import cdlJovemLogo from "@/assets/clients/cdl-jovem.png";

interface AuthoritySectionGratuitoProps {
  onOpenModal: () => void;
}

const logos = [
  { src: localizaLogo, alt: "Localiza" },
  { src: drogariaAraujoLogo, alt: "Drogaria Araújo" },
  { src: hotmartLogo, alt: "Hotmart" },
  { src: solidesLogo, alt: "Sólides" },
  { src: symplaLogo, alt: "Sympla" },
  
  { src: ifoodLogo, alt: "iFood" },
  { src: santanderLogo, alt: "Santander" },
  { src: cdlJovemLogo, alt: "CDL Jovem" },
];

const metrics = [
  { icon: Award, value: "94/100", label: "NPS Médio" },
  { icon: Users, value: "+1.500", label: "Profissionais Capacitados" },
];

export function AuthoritySectionGratuito({ onOpenModal }: AuthoritySectionGratuitoProps) {
  return (
    <section id="authority" className="relative py-16 md:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-background-secondary" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Quem já aplicou este método <span className="text-gradient">com a DNIA</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Empresas e profissionais que já foram atendidos, capacitados ou impactados diretamente pela DNIA na aplicação prática de inteligência artificial nos negócios.
          </p>
          <p className="text-muted-foreground text-base max-w-2xl mx-auto mt-3">
            O mesmo método que já ajudou empresas como Localiza, Santander, iFood e Hotmart a ganhar mais eficiência, autonomia e clareza no uso de IA.
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 md:gap-8 max-w-xl mx-auto mb-12">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-3">
                <metric.icon className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              </div>
              <div className="text-2xl md:text-4xl font-bold text-gradient mb-1">
                {metric.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        {/* Logos Grid */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16 mb-10">
          {logos.map((logo, index) => (
            <div key={index} className="group transition-all duration-300">
              <img
                src={logo.src}
                alt={`Logo ${logo.alt}`}
                className="h-8 md:h-10 w-auto object-contain brightness-0 invert opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center flex flex-col items-center gap-3">
          <p className="text-lg md:text-xl text-muted-foreground">
            DE <span className="text-destructive line-through font-semibold">R$ 197</span> POR <span className="text-success font-bold text-2xl md:text-3xl">R$ 47</span>
          </p>
          <Button
            onClick={onOpenModal}
            size="lg"
            className="bg-success hover:bg-success/90 text-white font-bold text-base px-8 py-6 h-auto rounded-xl flex items-center gap-2 mx-auto"
          >
            <Flame className="w-5 h-5" />
            GARANTIR INGRESSO | LOTE 1
          </Button>
        </div>
      </div>
    </section>
  );
}
