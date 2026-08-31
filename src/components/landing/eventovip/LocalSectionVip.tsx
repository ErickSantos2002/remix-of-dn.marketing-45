import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import local1 from "@/assets/local/local-1.png";
import local2 from "@/assets/local/local-2.png";
import local3 from "@/assets/local/local-3.png";
import local4 from "@/assets/local/local-4.png";

const localImages = [local1, local2, local3, local4];
const TRANSITION_MS = 350;

interface LocalSectionVipProps {
  mapQuery?: string;
  staticImage?: string;
  description?: string;
  images?: string[];
  address?: string;
  hideGallery?: boolean;
  eyebrow?: string;
  title?: string;
}

export function LocalSectionVip({ mapQuery = "Rua+Jupiter+265+Santa+Lucia+Belo+Horizonte+MG", staticImage, description = "O Espaço Santa Vista, em Santa Lúcia, foi escolhido a dedo para este encontro. Ambiente reservado, estrutura premium e o clima certo para decisões que importam.", images, address, hideGallery = false, eyebrow = "Onde tudo acontece", title = "CONHEÇA O ESPAÇO" }: LocalSectionVipProps) {
  const displayImages = images || localImages;
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    displayImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [displayImages]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const goTo = (nextIndex: number) => {
    if (nextIndex === current) return;

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setPrevious(current);
    setCurrent(nextIndex);
    setIsTransitioning(false);

    requestAnimationFrame(() => {
      setIsTransitioning(true);
    });

    timeoutRef.current = window.setTimeout(() => {
      setPrevious(null);
      setIsTransitioning(false);
      timeoutRef.current = null;
    }, TRANSITION_MS);
  };

  const prev = () => goTo(current === 0 ? displayImages.length - 1 : current - 1);
  const next = () => goTo(current === displayImages.length - 1 ? 0 : current + 1);

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 gap-10 lg:gap-16 items-center ${hideGallery ? "max-w-2xl mx-auto" : "lg:grid-cols-2"}`}>
          {/* Text */}
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-accent">{eyebrow}</p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
              {title}
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-lg">
              {description}
            </p>
            {address && (
              <p className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                📍 {address}
              </p>
            )}
            <div className={`rounded-xl overflow-hidden border border-border/40 mt-2 ${hideGallery ? "h-56 md:h-64" : "aspect-video"}`}>
              <iframe
                src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Local do evento - Google Maps"
              />
            </div>
          </div>

          {/* Image area */}
          {!hideGallery && (
          <div className="relative rounded-2xl overflow-hidden border border-border/40 aspect-video bg-card">
            {staticImage ? (
              <img
                src={staticImage}
                alt="Local do evento"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <img
                  src={displayImages[current]}
                  alt={`Espaço - foto ${current + 1}`}
                  className="w-full h-full object-cover"
                />
                {previous !== null && (
                  <img
                    src={displayImages[previous]}
                    alt=""
                    aria-hidden="true"
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${
                      isTransitioning ? "opacity-0" : "opacity-100"
                    }`}
                  />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/70 border border-border/40 flex items-center justify-center hover:bg-background/90 transition-colors cursor-pointer"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/70 border border-border/40 flex items-center justify-center hover:bg-background/90 transition-colors cursor-pointer"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {displayImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === current ? "bg-accent" : "bg-foreground/30"
                      }`}
                      aria-label={`Foto ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          )}
        </div>
      </div>
    </section>
  );
}
