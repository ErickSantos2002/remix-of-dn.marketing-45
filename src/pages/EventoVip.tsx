import { HeroSectionVip } from "@/components/landing/eventovip/HeroSectionVip";
import { AgendaSectionVip } from "@/components/landing/eventovip/AgendaSectionVip";
import { FormSectionVip } from "@/components/landing/eventovip/FormSectionVip";
import { LocalSectionVip } from "@/components/landing/eventovip/LocalSectionVip";
import { Footer } from "@/components/landing/Footer";

const EventoVip = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSectionVip />
      <FormSectionVip />
      <AgendaSectionVip />
      <LocalSectionVip />
      <Footer />
    </div>
  );
};

export default EventoVip;
