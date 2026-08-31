import { useState, lazy, Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ConvidadoModalGratuito } from "@/components/landing/ConvidadoModalGratuito";
import { HeroSection27Abril } from "@/components/landing/sections/HeroSection27Abril";
import { LogoCarousel } from "@/components/landing/LogoCarousel";
import { LazySection } from "@/components/LazySection";

// Prefetch the first lazy section so its chunk starts downloading immediately
import("@/components/landing/sections/LearningMapSection27Abril");

const LearningMapSection27Abril = lazy(() =>
  import("@/components/landing/sections/LearningMapSection27Abril")
    .then(m => ({ default: m.LearningMapSection27Abril }))
    .catch(() => import("@/components/landing/sections/LearningMapSection27Abril").then(m => ({ default: m.LearningMapSection27Abril })))
);
const NumbersCasesSection27Abril = lazy(() =>
  import("@/components/landing/sections/NumbersCasesSection27Abril")
    .then(m => ({ default: m.NumbersCasesSection27Abril }))
    .catch(() => import("@/components/landing/sections/NumbersCasesSection27Abril").then(m => ({ default: m.NumbersCasesSection27Abril })))
);
const MentorSection = lazy(() =>
  import("@/components/landing/sections/MentorSection")
    .then(m => ({ default: m.MentorSection }))
    .catch(() => import("@/components/landing/sections/MentorSection").then(m => ({ default: m.MentorSection })))
);

const Abril27 = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenModal={openModal} />

      <main>
        <HeroSection27Abril onOpenModal={openModal} />

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
            <LearningMapSection27Abril />
          </LazySection>
        </Suspense>

        <Suspense fallback={null}>
          <LazySection minHeight="500px">
            <NumbersCasesSection27Abril onOpenModal={openModal} />
          </LazySection>
        </Suspense>

        <Suspense fallback={null}>
          <LazySection minHeight="500px">
            <MentorSection />
          </LazySection>
        </Suspense>
      </main>

      <Footer />
      <ConvidadoModalGratuito isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default Abril27;
