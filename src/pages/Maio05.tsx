import { useState, lazy, Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ConvidadoModalGratuito05Maio } from "@/components/landing/ConvidadoModalGratuito05Maio";
import { HeroSection05Maio } from "@/components/landing/sections/HeroSection05Maio";
import { LogoCarousel } from "@/components/landing/LogoCarousel";
import { LazySection } from "@/components/LazySection";

// Prefetch the first lazy section so its chunk starts downloading immediately
import("@/components/landing/sections/LearningMapSection05Maio");

const LearningMapSection05Maio = lazy(() =>
  import("@/components/landing/sections/LearningMapSection05Maio")
    .then(m => ({ default: m.LearningMapSection05Maio }))
    .catch(() => import("@/components/landing/sections/LearningMapSection05Maio").then(m => ({ default: m.LearningMapSection05Maio })))
);
const NumbersCasesSection05Maio = lazy(() =>
  import("@/components/landing/sections/NumbersCasesSection05Maio")
    .then(m => ({ default: m.NumbersCasesSection05Maio }))
    .catch(() => import("@/components/landing/sections/NumbersCasesSection05Maio").then(m => ({ default: m.NumbersCasesSection05Maio })))
);
const MentorSection = lazy(() =>
  import("@/components/landing/sections/MentorSection")
    .then(m => ({ default: m.MentorSection }))
    .catch(() => import("@/components/landing/sections/MentorSection").then(m => ({ default: m.MentorSection })))
);

const Maio05 = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenModal={openModal} />

      <main>
        <HeroSection05Maio onOpenModal={openModal} />

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
          <LazySection minHeight="600px">
            <LearningMapSection05Maio />
          </LazySection>
        </Suspense>

        <Suspense fallback={null}>
          <LazySection minHeight="500px">
            <NumbersCasesSection05Maio onOpenModal={openModal} />
          </LazySection>
        </Suspense>

        <Suspense fallback={null}>
          <LazySection minHeight="500px">
            <MentorSection />
          </LazySection>
        </Suspense>
      </main>

      <Footer />
      <ConvidadoModalGratuito05Maio isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default Maio05;
