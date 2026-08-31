import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import localizaLogo from "@/assets/clients/localiza.png";
import drogariaAraujoLogo from "@/assets/clients/drogaria-araujo.png";
import hotmartLogo from "@/assets/clients/hotmart.png";
import solidesLogo from "@/assets/clients/solides.webp";
import symplaLogo from "@/assets/clients/sympla.png";

import ifoodLogo from "@/assets/clients/ifood.png";
import santanderLogo from "@/assets/clients/santander.png";
import cdlJovemLogo from "@/assets/clients/cdl-jovem.png";

interface AuthoritySectionProps {
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

export function AuthoritySection({ onOpenModal }: AuthoritySectionProps) {
  return (
    <section id="authority" className="relative py-16 md:py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background-secondary" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Content */}
      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Quem Está Usando o <span className="text-gradient">Protocolo Dominando IA</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            O mesmo método que empresas como Localiza e Santander usam para ganhar autonomia com IA.
          </p>
        </div>

        {/* Logos Grid */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16 mb-10">
          {logos.map((logo, index) => (
            <div
              key={index}
              className="group transition-all duration-300"
            >
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
        <div className="text-center">
          <Button
            onClick={onOpenModal}
            size="lg"
            className="bg-success hover:bg-success/90 text-white font-bold text-base px-8 py-6 h-auto rounded-xl flex items-center gap-2 mx-auto"
          >
            <Flame className="w-5 h-5" />
            GARANTIR MEU LUGAR | LOTE 1
          </Button>
        </div>
      </div>
    </section>
  );
}
