import { HeroSectionVip } from "@/components/landing/eventovip/HeroSectionVip";
import { AgendaSectionVip } from "@/components/landing/eventovip/AgendaSectionVip";
import { FormSectionVip } from "@/components/landing/eventovip/FormSectionVip";
import { LocalSectionVip } from "@/components/landing/eventovip/LocalSectionVip";
import { LastEditionSectionVip } from "@/components/landing/eventovip/LastEditionSectionVip";
import { Footer } from "@/components/landing/Footer";
import { useClarity } from "@/hooks/useClarity";

import foto01 from "@/assets/ultima-edicao/foto-01.jpg";
import foto02 from "@/assets/ultima-edicao/foto-02.jpg";
import foto03 from "@/assets/ultima-edicao/foto-03.jpg";
import foto04 from "@/assets/ultima-edicao/foto-04.jpg";
import foto05 from "@/assets/ultima-edicao/foto-05.jpg";
import foto06 from "@/assets/ultima-edicao/foto-06.jpg";
import foto07 from "@/assets/ultima-edicao/foto-07.jpg";
import foto08 from "@/assets/ultima-edicao/foto-08.jpg";
import foto09 from "@/assets/ultima-edicao/foto-09.jpg";
import foto10 from "@/assets/ultima-edicao/foto-10.jpg";
import foto11 from "@/assets/ultima-edicao/foto-11.jpg";
import foto12 from "@/assets/ultima-edicao/foto-12.jpg";
import foto13 from "@/assets/ultima-edicao/foto-13.jpg";
import foto14 from "@/assets/ultima-edicao/foto-14.jpg";
import foto15 from "@/assets/ultima-edicao/foto-15.jpg";
import foto16 from "@/assets/ultima-edicao/foto-16.jpg";
import foto17 from "@/assets/ultima-edicao/foto-17.jpg";
import foto18 from "@/assets/ultima-edicao/foto-18.jpg";
import foto19 from "@/assets/ultima-edicao/foto-19.jpg";
import foto20 from "@/assets/ultima-edicao/foto-20.jpg";

// Fotos da última edição
const ultimaEdicaoPhotos: string[] = [
  foto01, foto02, foto03, foto04, foto05,
  foto06, foto07, foto08, foto09, foto10,
  foto11, foto12, foto13, foto14, foto15,
  foto16, foto17, foto18, foto19, foto20,
];

const EventoIa130526 = () => {
  useClarity('eventoia130526');
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSectionVip
        eventDate="13 de maio de 2026"
        timeLabel="Das 8h30 às 17h · Almoço incluso no local"
        location="Espaço Santa Vista — Santa Lúcia, BH"
        closed={true}
        closedLabel="VAGAS ESGOTADAS"
        closedNote="Breve teremos uma nova oportunidade."
      />
      <FormSectionVip
        eventDate="13 de maio"
        tipo="Evento 13/05/26"
        source="eventoia130526"
        closed={true}
        successMessage="Nos vemos dia 13 de maio no Espaço Santa Vista."
        nexusStageId="f932c109-846f-48ce-9a1b-787537e89932"
        closedTitle="Vagas esgotadas"
        closedMessage="Breve teremos uma nova oportunidade."
      />
      <LastEditionSectionVip
        videoId="SAGupi8AOro"
        photos={ultimaEdicaoPhotos}
        videoTitle="Última edição — IA na Mesa de Decisão"
      />
      <AgendaSectionVip />
      <LocalSectionVip />
      <Footer />
    </div>
  );
};

export default EventoIa130526;
