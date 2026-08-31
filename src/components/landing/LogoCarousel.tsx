import localizaLogo from "@/assets/clients/localiza.png";
import hotmartLogo from "@/assets/clients/hotmart.png";
import solidesLogo from "@/assets/clients/solides.webp";
import symplaLogo from "@/assets/clients/sympla.png";

import ifoodLogo from "@/assets/clients/ifood.png";
import santanderLogo from "@/assets/clients/santander.png";
import cdlJovemLogo from "@/assets/clients/cdl-jovem.png";
import drogariaAraujoLogo from "@/assets/clients/drogaria-araujo.png";

type Logo = {
  src: string;
  alt: string;
};

const row1: Logo[] = [
  { src: localizaLogo, alt: "Localiza" },
  { src: drogariaAraujoLogo, alt: "Drogaria Araújo" },
  { src: hotmartLogo, alt: "Hotmart" },
  { src: solidesLogo, alt: "Sólides" },
  { src: symplaLogo, alt: "Sympla" },
];

const row2: Logo[] = [
  { src: ifoodLogo, alt: "iFood" },
  { src: santanderLogo, alt: "Santander" },
  { src: cdlJovemLogo, alt: "CDL Jovem" },
];

const allLogos = [...row1, ...row2];

interface LogoCarouselProps {
  static?: boolean;
}

export function LogoCarousel({ static: isStatic }: LogoCarouselProps = {}) {
  if (isStatic) {
    return (
      <div className="py-8 px-4">
        {/* Row 1 - 5 logos */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16 mb-8 md:mb-12">
          {row1.map((logo) => (
            <div key={logo.alt} className="flex items-center justify-center">
              <img
                src={logo.src}
                alt={`Logo ${logo.alt}`}
                width={120}
                height={40}
                decoding="async"
                className="h-8 md:h-10 lg:h-12 w-auto object-contain brightness-0 invert opacity-50"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Row 2 - 3 logos */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
          {row2.map((logo) => (
            <div key={logo.alt} className="flex items-center justify-center">
              <img
                src={logo.src}
                alt={`Logo ${logo.alt}`}
                width={120}
                height={40}
                decoding="async"
                className="h-8 md:h-10 lg:h-12 w-auto object-contain brightness-0 invert opacity-50"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sliding carousel (used in SocialProofSection)
  const repeatedLogos = [...allLogos, ...allLogos];

  return (
    <div className="overflow-hidden py-8" style={{ minHeight: '80px' }}>
      <div className="flex w-max animate-scroll">
        {repeatedLogos.map((logo, index) => (
          <div
            key={`${logo.alt}-${index}`}
            className="flex-shrink-0 px-6 md:px-10 flex items-center justify-center h-12 md:h-14"
          >
            <img
              src={logo.src}
              alt={`Logo ${logo.alt}`}
              width={120}
              height={40}
              decoding="async"
              className="h-8 md:h-10 w-auto max-w-[170px] object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-opacity duration-300"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
