import { HeroSectionVip } from "@/components/landing/eventovip/HeroSectionVip";
import { AgendaSectionVip, type ScheduleItem } from "@/components/landing/eventovip/AgendaSectionVip";
import { FormSectionVip } from "@/components/landing/eventovip/FormSectionVip";
import { LocalSectionVip } from "@/components/landing/eventovip/LocalSectionVip";
import { Footer } from "@/components/landing/Footer";
import { Coffee, UtensilsCrossed, Users, Brain, TrendingUp, ShoppingCart, FolderKanban, Bot, Flag } from "lucide-react";

import onehouse1 from "@/assets/local/onehouse-1.jpg";
import onehouse2 from "@/assets/local/onehouse-2.jpg";
import onehouse3 from "@/assets/local/onehouse-3.jpg";
import onehouse4 from "@/assets/local/onehouse-4.jpg";
import onehouse5 from "@/assets/local/onehouse-5.jpg";
import onehouse6 from "@/assets/local/onehouse-6.jpg";
import onehouse7 from "@/assets/local/onehouse-7.jpg";
import onehouse8 from "@/assets/local/onehouse-8.jpg";
import onehouse9 from "@/assets/local/onehouse-9.jpg";
import onehouse10 from "@/assets/local/onehouse-10.jpg";

const onehouseImages = [onehouse1, onehouse2, onehouse3, onehouse4, onehouse5, onehouse6, onehouse7, onehouse8, onehouse9, onehouse10];

const schedule140426: ScheduleItem[] = [
  { time: "08h20", title: "Coffee de boas-vindas", icon: Coffee, break: true },
  { time: "09h15", title: "Introdução", icon: Users },
  { time: "10h15", title: "A evolução da IA: de onde viemos até os Super Agentes", icon: Brain },
  { time: "10h45", title: "Marketing: assertividade, landing page, tráfego, design e vídeo", icon: TrendingUp },
  { time: "11h30", title: "Vendas: atendimento 24h, CRM e follow-up", icon: ShoppingCart },
  { time: "12h00", title: "Gestão de projetos: quem garante que as coisas acontecem?", icon: FolderKanban },
  { time: "12h30", title: "Almoço", icon: UtensilsCrossed, break: true },
  { time: "13h30", title: "dnOS + Super Agentes na prática — Como deixamos agentes de IA gerir a dn.ia", icon: Bot },
  { time: "16h30", title: "Encerramento + próximos passos", icon: Flag },
];

const EventoIa140426 = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSectionVip eventDate="14 de abril de 2026" closed={false} location="OneHouse — Higienópolis, SP" timeLabel="Das 8h30 às 17h" />
      <FormSectionVip eventDate="14 de abril" tipo="Evento 14/04/26" source="eventoia140426" closed={false} successMessage="Nos vemos dia 14 de abril no OneHouse." />
      <AgendaSectionVip schedule={schedule140426} />
      <LocalSectionVip
        mapQuery="R.+Maria+Antônia+330+Higienópolis+São+Paulo+SP"
        images={onehouseImages}
        description="O OneHouse fica localizado em uma das melhores regiões de São Paulo, perto de mercados, farmácias, restaurantes, faculdades e outros. A Região oferece atividade cultural e muito lazer. Fica próximo à Avenida Paulista e a 4 quadras da Universidade Presbiteriana Mackenzie."
        address="R. Maria Antônia, 330 - Higienópolis, São Paulo - SP"
      />
      <Footer />
    </div>
  );
};

export default EventoIa140426;
