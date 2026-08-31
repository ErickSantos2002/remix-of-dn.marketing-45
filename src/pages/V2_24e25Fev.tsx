import { useState, lazy, Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ConvidadoModal } from "@/components/landing/ConvidadoModal";
import { FilterBar } from "@/components/landing/sections/FilterBar";
import { HeroSectionEventoV2 } from "@/components/landing/sections/HeroSectionEventoV2";
import { LogoCarousel } from "@/components/landing/LogoCarousel";
import { LazySection } from "@/components/LazySection";

// Lazy load sections below the fold
const DifferenceSectionEvento = lazy(() => import("@/components/landing/sections/DifferenceSectionEvento").then(m => ({ default: m.DifferenceSectionEvento })));
const CommonEnemySection = lazy(() => import("@/components/landing/sections/CommonEnemySection").then(m => ({ default: m.CommonEnemySection })));
const NumbersCasesSection = lazy(() => import("@/components/landing/sections/NumbersCasesSection").then(m => ({ default: m.NumbersCasesSection })));
const ValueObjectionSection = lazy(() => import("@/components/landing/sections/ValueObjectionSection").then(m => ({ default: m.ValueObjectionSection })).catch(() => import("@/components/landing/sections/ValueObjectionSection").then(m => ({ default: m.ValueObjectionSection }))));
const LearningMapSection = lazy(() => import("@/components/landing/sections/LearningMapSection").then(m => ({ default: m.LearningMapSection })));
const DeliverablesSection = lazy(() => import("@/components/landing/sections/DeliverablesSection").then(m => ({ default: m.DeliverablesSection })));
const FinalCTASectionEvento = lazy(() => import("@/components/landing/sections/FinalCTASectionEvento").then(m => ({ default: m.FinalCTASectionEvento })));

const V2_24e25Fev = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <FilterBar />
      <Header onOpenModal={openModal} />
      
      <main>
        <HeroSectionEventoV2 onOpenModal={openModal} />

        {/* Second fold - Client logos */}
        <section className="py-10 md:py-14 border-t border-border/30">
          <div className="section-container">
            <p className="text-center text-sm tracking-[3px] uppercase text-muted-foreground mb-2">
              Empresas que a dn.ia já ajudou
            </p>
          </div>
          <LogoCarousel static />
        </section>

        <LazySection minHeight="600px">
          <Suspense fallback={null}>
            <DifferenceSectionEvento onOpenModal={openModal} />
          </Suspense>
        </LazySection>

        <LazySection minHeight="600px">
          <Suspense fallback={null}>
            <LearningMapSection />
          </Suspense>
        </LazySection>

        <LazySection minHeight="600px">
          <Suspense fallback={null}>
            <DeliverablesSection />
          </Suspense>
        </LazySection>

        <LazySection minHeight="600px">
          <Suspense fallback={null}>
            <NumbersCasesSection onOpenModal={openModal} />
          </Suspense>
        </LazySection>

        <LazySection minHeight="400px">
          <Suspense fallback={null}>
            <ValueObjectionSection />
          </Suspense>
        </LazySection>

        <LazySection minHeight="400px">
          <Suspense fallback={null}>
            <FinalCTASectionEvento onOpenModal={openModal} />
          </Suspense>
        </LazySection>
      </main>

      <Footer />
      
      <ConvidadoModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default V2_24e25Fev;
