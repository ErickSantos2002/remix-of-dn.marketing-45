import { useState, useEffect, lazy, Suspense } from "react";
import { HeroSectionPrograma } from "@/components/landing/programa/HeroSectionPrograma";
import { LazySection } from "@/components/LazySection";
import logo from "@/assets/dnia-logo-branco.png";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { trackCtaClick } from "@/lib/metaTracking";
import { useClarity } from "@/hooks/useClarity";

const UrgencySection = lazy(() => import("@/components/landing/programa/UrgencySection").then(m => ({ default: m.UrgencySection })));
const ProblemSection = lazy(() => import("@/components/landing/programa/ProblemSection").then(m => ({ default: m.ProblemSection })));
const DiagnosticDetailSection = lazy(() => import("@/components/landing/programa/DiagnosticDetailSection").then(m => ({ default: m.DiagnosticDetailSection })));
const MentorSection = lazy(() => import("@/components/landing/programa/MentorSection").then(m => ({ default: m.MentorSection })));
const SocialProofProgramSection = lazy(() => import("@/components/landing/programa/SocialProofProgramSection").then(m => ({ default: m.SocialProofProgramSection })));
const CTAProgramSection = lazy(() => import("@/components/landing/programa/CTAProgramSection").then(m => ({ default: m.CTAProgramSection })));
const Footer = lazy(() => import("@/components/landing/Footer").then(m => ({ default: m.Footer })));
const DiagnosticoModal = lazy(() => import("@/components/landing/programa/DiagnosticoModal").then(m => ({ default: m.DiagnosticoModal })));

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Resultados", href: "#resultados" },
  { label: "Diagnóstico", href: "#diagnostico" },
];

const ProgramaIaficacao = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preloadIframe, setPreloadIframe] = useState(false);

  useClarity('programadeiaficacao');

  const openModal = () => setIsModalOpen(true);

  // Preload iframe assim que a primeira dobra montar (em paralelo com o restante da página)
  useEffect(() => {
    let cancelled = false;
    if (!cancelled) setPreloadIframe(true);
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="section-container">
          <div className="flex items-center justify-between h-16 md:h-20">
            <a href="#inicio" className="flex-shrink-0">
              <img src={logo} alt="dn.ia" className="h-8 md:h-10 w-auto" />
            </a>
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="hidden lg:block">
              <Button onClick={() => { trackCtaClick("header_desktop"); openModal(); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                Agendar meu diagnóstico agora
              </Button>
            </div>
            <button className="lg:hidden p-2 text-foreground" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          {isMenuOpen && (
            <nav className="lg:hidden py-4 border-t border-border/30 animate-fade-in">
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} className="text-muted-foreground hover:text-primary transition-colors py-2" onClick={() => setIsMenuOpen(false)}>
                    {link.label}
                  </a>
                ))}
                <Button onClick={() => { trackCtaClick("header_mobile"); openModal(); setIsMenuOpen(false); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-2">
                  Agendar meu diagnóstico agora
                </Button>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main>
        <HeroSectionPrograma onOpenModal={openModal} />

        <LazySection minHeight="500px">
          <Suspense fallback={null}>
            <UrgencySection onOpenModal={openModal} />
          </Suspense>
        </LazySection>

        <LazySection minHeight="700px">
          <Suspense fallback={null}>
            <ProblemSection onOpenModal={openModal} />
          </Suspense>
        </LazySection>

        <LazySection minHeight="900px">
          <Suspense fallback={null}>
            <DiagnosticDetailSection onOpenModal={openModal} />
          </Suspense>
        </LazySection>

        <LazySection minHeight="500px">
          <Suspense fallback={null}>
            <MentorSection />
          </Suspense>
        </LazySection>

        <LazySection minHeight="500px">
          <Suspense fallback={null}>
            <SocialProofProgramSection onOpenModal={openModal} />
          </Suspense>
        </LazySection>

        <LazySection minHeight="400px">
          <Suspense fallback={null}>
            <CTAProgramSection onOpenModal={openModal} />
          </Suspense>
        </LazySection>
      </main>

      <LazySection minHeight="300px">
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </LazySection>

      {(isModalOpen || preloadIframe) && (
        <Suspense fallback={null}>
          <DiagnosticoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </Suspense>
      )}

      {/* Preload Nexus scheduling iframe AFTER first paint to preserve FCP/LCP */}
      {preloadIframe && (
        <iframe
          src="https://nexus.dnia.ai/schedule/9cdd014b-a8ab-46ab-bbfb-0fb1e154e540?tag=programadeiaficacao&source=programadeiaficacao"
          aria-hidden="true"
          tabIndex={-1}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", border: 0, left: -9999, top: -9999 }}
          loading="lazy"
          title="preload"
        />
      )}
    </div>
  );
};

export default ProgramaIaficacao;
