import localiza from "@/assets/clients/localiza.png";
import araujo from "@/assets/clients/drogaria-araujo.png";
import hotmart from "@/assets/clients/hotmart.png";
import solides from "@/assets/clients/solides.webp";
import sympla from "@/assets/clients/sympla.png";

import ifood from "@/assets/clients/ifood.png";
import santander from "@/assets/clients/santander.png";
import cdlJovem from "@/assets/clients/cdl-jovem.png";

const logos = [
  { src: localiza, alt: "Localiza" },
  { src: araujo, alt: "Drogaria Araújo" },
  { src: hotmart, alt: "Hotmart" },
  { src: solides, alt: "Sólides" },
  { src: sympla, alt: "Sympla" },
  
  { src: ifood, alt: "iFood" },
  { src: santander, alt: "Santander" },
  { src: cdlJovem, alt: "CDL Jovem" },
];

export function LogosSectionP1g() {
  // Split logos into two rows
  const row1 = logos.slice(0, 5);
  const row2 = logos.slice(5);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Title */}
        <p className="text-center text-sm md:text-base tracking-widest text-gray-500 mb-12 md:mb-16">
          QUEM ESTÁ CONSTRUINDO SOLUÇÕES COM IA USANDO A METODOLOGIA BUSCAR ID:
        </p>

        {/* Row 1 - 5 logos */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16 mb-8 md:mb-12">
          {row1.map((logo, index) => (
            <div
              key={index}
              className="flex items-center justify-center"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                width={120}
                height={48}
                className="h-8 md:h-10 lg:h-12 w-auto object-contain brightness-0 invert opacity-50"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>

        {/* Row 2 - 4 logos */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
          {row2.map((logo, index) => (
            <div
              key={index}
              className="flex items-center justify-center"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                width={120}
                height={48}
                className="h-8 md:h-10 lg:h-12 w-auto object-contain brightness-0 invert opacity-50"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
