import { useState, lazy, Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ConvidadoModal } from "@/components/landing/ConvidadoModal";
import { HeroSectionEvento } from "@/components/landing/sections/HeroSectionEvento";
import { LogoCarousel } from "@/components/landing/LogoCarousel";
import { LazySection } from "@/components/LazySection";

const LearningMapSection = lazy(() =>
  import("@/components/landing/sections/LearningMapSection")
    .then(m => ({ default: m.LearningMapSection }))
    .catch(() => import("@/components/landing/sections/LearningMapSection").then(m => ({ default: m.LearningMapSection })))
);
const NumbersCasesSection = lazy(() =>
  import("@/components/landing/sections/NumbersCasesSection")
    .then(m => ({ default: m.NumbersCasesSection }))
    .catch(() => import("@/components/landing/sections/NumbersCasesSection").then(m => ({ default: m.NumbersCasesSection })))
);
const MentorSection = lazy(() =>
  import("@/components/landing/sections/MentorSection")
    .then(m => ({ default: m.MentorSection }))
    .catch(() => import("@/components/landing/sections/MentorSection").then(m => ({ default: m.MentorSection })))
);

const V2Fev2425 = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenModal={openModal} />

      <main>
        <HeroSectionEvento onOpenModal={openModal} />

        {/* Logos */}
        <section className="section-padding bg-background border-t border-border/20">
          <div className="section-container text-center">
            <p className="text-xs tracking-[3px] uppercase text-muted-foreground mb-2 font-medium">
              Empresas que a dn.ia já ajudou
            </p>
            <LogoCarousel static />
          </div>
        </section>

        <Suspense fallback={null}>
          <LazySection>
            <LearningMapSection />
          </LazySection>

          <LazySection>
            <NumbersCasesSection onOpenModal={openModal} />
          </LazySection>

          <LazySection>
            <MentorSection />
          </LazySection>
        </Suspense>
      </main>

      <Footer />
      <ConvidadoModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default V2Fev2425;
