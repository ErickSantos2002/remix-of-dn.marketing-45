import { useState, lazy, Suspense } from "react";
import "@fontsource/outfit/600.css";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { GratuitoModal } from "@/components/landing/GratuitoModal";
import { HeroSectionAulaGratuita } from "@/components/landing/sections/HeroSectionAulaGratuita";
import { LazySection } from "@/components/LazySection";
const ProblemSection = lazy(() => import("@/components/landing/sections/ProblemSection").then(m => ({ default: m.ProblemSection })));
const LearningBulletsSection = lazy(() => import("@/components/landing/sections/LearningBulletsSection").then(m => ({ default: m.LearningBulletsSection })));
const TargetAudienceSectionGratuito = lazy(() => import("@/components/landing/sections/TargetAudienceSectionGratuito").then(m => ({ default: m.TargetAudienceSectionGratuito })));
const AuthoritySectionGratuito = lazy(() => import("@/components/landing/sections/AuthoritySectionGratuito").then(m => ({ default: m.AuthoritySectionGratuito })));
const FinalCTASectionGratuito = lazy(() => import("@/components/landing/sections/FinalCTASectionGratuito").then(m => ({ default: m.FinalCTASectionGratuito })));

const Fev2425 = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="theme-fev2425 min-h-screen bg-background">
      <Header onOpenModal={openModal} />
      
      <main>
        <HeroSectionAulaGratuita onOpenModal={openModal} />
        
        <LazySection minHeight="400px">
          <Suspense fallback={null}>
            <ProblemSection />
          </Suspense>
        </LazySection>
        
        <LazySection minHeight="400px">
          <Suspense fallback={null}>
            <LearningBulletsSection />
          </Suspense>
        </LazySection>
        
        <LazySection minHeight="400px">
          <Suspense fallback={null}>
            <TargetAudienceSectionGratuito />
          </Suspense>
        </LazySection>
        
        <LazySection minHeight="400px">
          <Suspense fallback={null}>
            <AuthoritySectionGratuito onOpenModal={openModal} />
          </Suspense>
        </LazySection>
        
        <LazySection minHeight="300px">
          <Suspense fallback={null}>
            <FinalCTASectionGratuito onOpenModal={openModal} />
          </Suspense>
        </LazySection>
      </main>

      <Footer />
      
      <GratuitoModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default Fev2425;
