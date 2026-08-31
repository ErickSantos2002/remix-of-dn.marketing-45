import { Helmet } from "react-helmet-async";
import { Lightbulb, Rocket, Users, Handshake } from "lucide-react";
import { HeroSectionVip } from "@/components/landing/eventovip/HeroSectionVip";
import { FormSectionVip } from "@/components/landing/eventovip/FormSectionVip";
import { LastEditionSectionVip } from "@/components/landing/eventovip/LastEditionSectionVip";
import { Footer } from "@/components/landing/Footer";
import { getOgRoute, SITE_ORIGIN } from "../../scripts/og-routes";
import cafeComIaLogo from "@/assets/cafecomia-logo.png.asset.json";
import "./cafecomia.css";

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

const ogRoute = getOgRoute("/cafecomia");

const accentClass = "font-semibold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent";

const pillars = [
  {
    number: "01",
    title: "O problema nunca foi a ferramenta.",
    text: (
      <>
        O resultado não depende de qual IA você escolheu. Depende de saber integrar humanos e agentes
        de IA dentro da operação da sua empresa. É aí que mora{" "}
        <span className={accentClass}>a diferença entre usar IA e operar com ela</span>.
      </>
    ),
  },
  {
    number: "02",
    title: "Um organograma novo, com nome e função.",
    text: (
      <>
        Humanos e agentes de IA no mesmo time — cada um com nome, função e responsabilidade
        definidos. Esse organograma não é um conceito: é uma estrutura que já existe e já opera —
        e a gente vai <span className={accentClass}>construir junto</span> com você.
      </>
    ),
  },
  {
    number: "03",
    title: "Vamos mostrar isso acontecendo na prática.",
    text: (
      <>
        Na manhã do Café com IA, você vê o organograma da própria dn.ia funcionando ao vivo — os
        agentes de IA operando, decisões sendo tomadas, o time humano ao lado. Não é slide, é a
        operação acontecendo na sua frente — e depois{" "}
        <span className={accentClass}>a gente constrói com você</span>.
      </>
    ),
  },
];

const cafeBenefits = [
  { icon: Lightbulb, title: "Zero teoria — você vê o organograma da dn.ia operando ao vivo.", desc: "Sem slides. Você vê a operação real da dn.ia funcionando com agentes de IA." },
  { icon: Rocket, title: "Sai com clareza do que aplicar na sua empresa ainda esse semestre.", desc: "Um plano claro para implementar na sua operação, não teoria genérica." },
  { icon: Users, title: "Networking qualificado", desc: "Conexões com outros líderes que já estão adotando IA." },
  { icon: Handshake, title: "Acesso exclusivo", desc: "Conteúdo e insights que não estarão em nenhum outro lugar." },
];

const CafeComIa = () => {
  return (
    <div className="cafecomia-root min-h-screen bg-background text-foreground">
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
        eventDate="29 de julho de 2026"
        timeLabel="Das 8h30 às 12h"
        location="Belo Horizonte"
        closed={false}
        badgeLabel="Encontro fechado · 20 convidados"
        titlePrefix="Reservamos uma cadeira nessa mesa. "
        titleAccent="Ela tem o seu nome."
        titleNoWrap={false}
        description="Uma manhã fechada, direto ao ponto — para quem já passou da fase de entender que IA importa e quer implementar na própria empresa ainda esse semestre."
        ctaLabel="ENTRAR NA FILA DE ESPERA"
        ctaNote="* As vagas para o dia 29/07 foram preenchidas. Cadastre-se para ser avisado das próximas edições."
        logoSrc={cafeComIaLogo.url}
        logoClassName="h-10"
      />

      {/* Por que esse encontro existe */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-5">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-accent">
            Por que esse encontro existe
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            Entender IA não é mais o desafio.{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Implementar, é.
            </span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Esse encontro existe pra quem já passou da fase de entender que IA importa,
            e quer saber exatamente como aplicar isso na própria empresa ainda esse semestre.
          </p>
        </div>
      </section>

      {/* O que esperar desse dia exclusivo? + formulário */}
      <FormSectionVip
        eventDate="29 de julho"
        tipo="Fila de espera Café com IA"
        source="cafecomia"
        closed={false}
        successMessage="Você será avisado por e-mail e WhatsApp assim que abrirmos uma nova edição."
        benefits={cafeBenefits}
        footerNote="Fila de espera para próximas edições do Café com IA."
        ctaLabel="Entrar na fila de espera"
        formHeadline="Fila de espera — Café com IA"
        formSubheadline="As vagas do dia 29/07 foram preenchidas. Deixe seus dados para ser avisado das próximas edições."
        confirmationTitle="Você entrou na fila de espera."
        confirmationMessage={`Obrigado pelo interesse no Café com IA.\n\nAssim que abrirmos uma nova edição em Belo Horizonte, você será avisado com antecedência por e-mail e WhatsApp.\n\nFique atento às nossas redes para novidades.`}
      />

      {/* O que você leva dessa manhã */}
      <section className="py-16 lg:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-accent">
              O que você leva
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight max-w-2xl mx-auto">
              O que muda na prática —{" "}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                não em teoria
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {pillars.map((p) => (
              <div
                key={p.number}
                className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 space-y-3"
              >
                <span className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  {p.number}
                </span>
                <h3 className="text-lg font-semibold text-foreground leading-snug">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Momentos que marcaram */}
      <LastEditionSectionVip
        videoId="SAGupi8AOro"
        photos={ultimaEdicaoPhotos}
        videoTitle="Momentos que marcaram — última edição"
      />

      {/* CTA final — Fila de espera */}
      <section className="py-32 lg:py-44">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-[1.1] whitespace-pre-line">
            Vagas do dia 29/07 preenchidas.{"\n"}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Entre na fila de espera.
            </span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Deixe seus dados acima e seja avisado com antecedência sobre as próximas edições do Café com IA em Belo Horizonte.
          </p>
        </div>
      </section>

      <Footer address={"Belo Horizonte"} />
    </div>
  );
};

export default CafeComIa;
