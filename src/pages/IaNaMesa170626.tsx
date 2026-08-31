import { Helmet } from "react-helmet-async";
import { HeroSectionVip } from "@/components/landing/eventovip/HeroSectionVip";
import { AgendaSectionVip, type ScheduleItem } from "@/components/landing/eventovip/AgendaSectionVip";
import { FormSectionVip } from "@/components/landing/eventovip/FormSectionVip";
import { LocalSectionVip } from "@/components/landing/eventovip/LocalSectionVip";
import { LastEditionSectionVip } from "@/components/landing/eventovip/LastEditionSectionVip";
import { Footer } from "@/components/landing/Footer";
import { DoorOpen, Brain, Layers, Unlock, Sparkles, UtensilsCrossed, Rocket, Users, Flag } from "lucide-react";
import { getOgRoute, SITE_ORIGIN } from "../../scripts/og-routes";

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

const ultimaEdicaoPhotos: string[] = [
  foto01, foto02, foto03, foto04, foto05,
  foto06, foto07, foto08, foto09, foto10,
  foto11, foto12, foto13, foto14, foto15,
  foto16, foto17, foto18, foto19, foto20,
];

const schedule: ScheduleItem[] = [
  { time: "09h15", title: "Abertura", icon: DoorOpen },
  { time: "09h30", title: "A evolução da IA até 2026 nos negócios", icon: Brain },
  { time: "10h30", title: "Re-Modelagem de negócios com IA", icon: Layers },
  { time: "11h15", title: "Organogram.ia — IAs e humanos como um só time — Como deixamos agentes de IA gerir a dn.ia", icon: Users },
  { time: "12h00", title: "O que era impossível que IA tornou possível", icon: Sparkles },
  { time: "12h30", title: "Almoço", icon: UtensilsCrossed, break: true },
  { time: "14h00", title: "Encerramento", icon: Flag },
];

const ogRoute = getOgRoute("/ianamesa170626");

const IaNaMesa170626 = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {ogRoute && (
        <Helmet>
          <title>{ogRoute.title}</title>
          <meta name="description" content={ogRoute.description} />
          <link rel="canonical" href={`${SITE_ORIGIN}${ogRoute.path}`} />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={ogRoute.title} />
          <meta property="og:description" content={ogRoute.description} />
          <meta property="og:url" content={`${SITE_ORIGIN}${ogRoute.path}`} />
          <meta property="og:image" content={`${SITE_ORIGIN}${ogRoute.image}`} />
          {ogRoute.imageWidth && (
            <meta property="og:image:width" content={String(ogRoute.imageWidth)} />
          )}
          {ogRoute.imageHeight && (
            <meta property="og:image:height" content={String(ogRoute.imageHeight)} />
          )}
          {ogRoute.imageAlt && (
            <meta property="og:image:alt" content={ogRoute.imageAlt} />
          )}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={ogRoute.title} />
          <meta name="twitter:description" content={ogRoute.description} />
          <meta name="twitter:image" content={`${SITE_ORIGIN}${ogRoute.image}`} />
        </Helmet>
      )}
      <HeroSectionVip
        eventDate="17 de junho de 2026"
        timeLabel="Das 8h às 14h · Almoço incluso no local"
        location="Espaço Santa Vista — Santa Lúcia, BH"
        closed={false}
      />
      <FormSectionVip
        eventDate="17 de junho"
        tipo="Evento 17/06/26"
        source="ianamesa170626"
        closed={false}
        successMessage="Nos vemos dia 17 de junho no Espaço Santa Vista."
        nexusStageId="f932c109-846f-48ce-9a1b-787537e89932"
      />
      <LastEditionSectionVip
        videoId="SAGupi8AOro"
        photos={ultimaEdicaoPhotos}
        videoTitle="Última edição — IA na Mesa de Decisão"
      />
      <AgendaSectionVip schedule={schedule} />
      <LocalSectionVip />
      <Footer />
    </div>
  );
};

export default IaNaMesa170626;
