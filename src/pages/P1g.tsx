import { useState, Suspense, lazy } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { GratuitoModal } from "@/components/landing/GratuitoModal";
import { HeroSectionP1g } from "@/components/landing/p1g/HeroSectionP1g";
import { LazySection } from "@/components/LazySection";

// Lazy load components below the fold
const AgendaSectionP1g = lazy(() => 
  import("@/components/landing/p1g/AgendaSectionP1g").then(m => ({ default: m.AgendaSectionP1g }))
);
const LogosSectionP1g = lazy(() => 
  import("@/components/landing/p1g/LogosSectionP1g").then(m => ({ default: m.LogosSectionP1g }))
);
const SkillsSection = lazy(() => 
  import("@/components/landing/sections/SkillsSection").then(m => ({ default: m.SkillsSection }))
);
const PositioningSection = lazy(() => 
  import("@/components/landing/sections/PositioningSection").then(m => ({ default: m.PositioningSection }))
);
const FinalCTASectionP1g = lazy(() => 
  import("@/components/landing/p1g/FinalCTASectionP1g").then(m => ({ default: m.FinalCTASectionP1g }))
);

// Skeleton fallback component
const SectionSkeleton = ({ height = "h-96" }: { height?: string }) => (
  <div className={`${height} bg-black animate-pulse`} />
);

export default function P1g() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Header onOpenModal={openModal} />
      
      <main>
        <HeroSectionP1g onOpenModal={openModal} />
        
        <LazySection minHeight="600px">
          <Suspense fallback={<SectionSkeleton height="h-[600px]" />}>
            <AgendaSectionP1g />
          </Suspense>
        </LazySection>
        
        <LazySection minHeight="200px">
          <Suspense fallback={<SectionSkeleton height="h-48" />}>
            <LogosSectionP1g />
          </Suspense>
        </LazySection>
        
        <LazySection minHeight="400px">
          <Suspense fallback={<SectionSkeleton height="h-96" />}>
            <SkillsSection />
          </Suspense>
        </LazySection>
        
        <LazySection minHeight="300px">
          <Suspense fallback={<SectionSkeleton height="h-72" />}>
            <PositioningSection />
          </Suspense>
        </LazySection>
        
        <LazySection minHeight="400px">
          <Suspense fallback={<SectionSkeleton height="h-96" />}>
            <FinalCTASectionP1g onOpenModal={openModal} />
          </Suspense>
        </LazySection>
      </main>
      
      <Footer />
      
      <GratuitoModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}
