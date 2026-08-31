import { useState } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { GratuitoModal } from "@/components/landing/GratuitoModal";
import { HeroSectionModernGratuito } from "@/components/landing/sections/HeroSectionModernGratuito";
import { AgendaSection } from "@/components/landing/sections/AgendaSection";
import { ToolkitSection } from "@/components/landing/sections/ToolkitSection";
import { ToolkitCTASectionGratuito } from "@/components/landing/sections/ToolkitCTASectionGratuito";
import { AuthoritySectionGratuito } from "@/components/landing/sections/AuthoritySectionGratuito";
import { BonusSection } from "@/components/landing/sections/BonusSection";
import { MentorSection } from "@/components/landing/sections/MentorSection";
import { FAQSection } from "@/components/landing/sections/FAQSection";
import { FinalCTASectionGratuito } from "@/components/landing/sections/FinalCTASectionGratuito";

const Gratuito = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenModal={openModal} />
      
      <main>
        <HeroSectionModernGratuito onOpenModal={openModal} />
        <AgendaSection />
        <ToolkitSection />
        <ToolkitCTASectionGratuito onOpenModal={openModal} />
        <AuthoritySectionGratuito onOpenModal={openModal} />
        <BonusSection />
        <MentorSection />
        <FAQSection />
        <FinalCTASectionGratuito onOpenModal={openModal} />
      </main>

      <Footer />
      
      <GratuitoModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default Gratuito;
