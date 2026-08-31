import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Users, Clock, Coffee } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { YouTubeEmbed } from "@/components/landing/YouTubeEmbed";

interface LastEditionSectionVipProps {
  videoId: string;
  photos: string[];
  videoTitle?: string;
}

export function LastEditionSectionVip({
  videoId,
  photos,
  videoTitle = "Última edição do evento",
}: LastEditionSectionVipProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const autoplay = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: false, stopOnFocusIn: false })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: false },
    [autoplay.current]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi]);

  // Lightbox controls
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);
  const next = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, close, prev, next]);

  const scrollToForm = () => {
    document.getElementById("inscricao")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden">
      {/* Subtle accent glow */}
      <div
        className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.5), transparent 70%)" }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-accent mb-3">
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight">
            Depois dessa manhã, não tem mais{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              "quando eu tiver tempo".
            </span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
          </p>
        </div>

        {/* BLOCO 1 — Hero do vídeo */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 lg:gap-12 items-center">
            {/* Vídeo */}
            <div className="mx-auto w-full max-w-[320px] lg:max-w-none">
              <YouTubeEmbed videoId={videoId} title={videoTitle} />
            </div>

            {/* Contexto + CTA */}
            <div className="text-center lg:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-4">
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed whitespace-pre-line">
                As empresas que vão fechar o ano com resultados diferentes já saíram na frente.{"\n\n"}
                As que só vão pensar nisso em dezembro, vão perder o início do próximo ano inteiro.{"\n\n"}
                Essa manhã existe pra você decidir isso com tempo — não sob pressão, não de última hora.&nbsp;
              </p>

              {/* Bullets com ícones */}
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 justify-center lg:justify-start">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm text-foreground">
                    Líderes de empresas reunidos presencialmente
                  </span>
                </li>
                <li className="flex items-center gap-3 justify-center lg:justify-start">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm text-foreground">
                    Manhã intensa de conteúdo&nbsp;
                  </span>
                </li>
                <li className="flex items-center gap-3 justify-center lg:justify-start">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Coffee className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm text-foreground">
                    Almoço incluso e networking de altíssimo nível
                  </span>
                </li>
              </ul>

              <button
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg"
              >
                Vou confirmar minha presença
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* BLOCO 2 — Galeria como carrossel */}
        {photos.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-foreground whitespace-pre-line">
                Momentos que marcaram o último{"\n"}encontro presencial
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                arraste ou use as setas para navegar
              </p>
            </div>

            <div className="relative">
              {/* Carrossel */}
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4">
                  {photos.map((src, i) => (
                    <div
                      key={i}
                      className="flex-[0_0_82%] sm:flex-[0_0_45%] lg:flex-[0_0_31%] min-w-0"
                    >
                      <button
                        onClick={() => setLightboxIndex(i)}
                        className="block w-full h-[220px] sm:h-[260px] lg:h-[300px] rounded-2xl overflow-hidden border border-border/40 hover:border-accent/60 transition-all duration-300 group cursor-zoom-in relative"
                        aria-label={`Abrir foto ${i + 1}`}
                      >
                        <img
                          src={src}
                          alt={`Última edição do evento — foto ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setas */}
              <button
                onClick={scrollPrev}
                className="absolute left-2 lg:-left-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-card/95 backdrop-blur border border-border hover:bg-accent hover:text-white hover:border-accent flex items-center justify-center transition-all shadow-lg"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-2 lg:-right-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-card/95 backdrop-blur border border-border hover:bg-accent hover:text-white hover:border-accent flex items-center justify-center transition-all shadow-lg"
                aria-label="Próxima foto"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dots */}
            {scrollSnaps.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-6 flex-wrap max-w-md mx-auto">
                {scrollSnaps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === selectedIndex
                        ? "w-6 bg-accent"
                        : "w-1.5 bg-border hover:bg-muted-foreground"
                    }`}
                    aria-label={`Ir para foto ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={close}
        >
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          <img
            src={photos[lightboxIndex]}
            alt={`Última edição do evento — foto ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />

          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Próxima foto"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </section>
  );
}
