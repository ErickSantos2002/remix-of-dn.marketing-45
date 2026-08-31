import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, ArrowDown } from "lucide-react";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/900.css";
import defaultLogo from "@/assets/dnia-logo-branco.png";
import rodrigoImg from "@/assets/rodrigo-nascimento.jpg";

interface HeroSectionVipProps {
  eventDate?: string;
  closed?: boolean;
  location?: string;
  timeLabel?: string;
  closedLabel?: string;
  closedNote?: string;
  badgeLabel?: string;
  titlePrefix?: string;
  titleAccent?: string;
  description?: string;
  ctaLabel?: string;
  ctaNote?: string;
  titleNoWrap?: boolean;
  logoSrc?: string;
  logoClassName?: string;
}

const getEventDetails = (date: string, location: string, timeLabel: string) => [
  { icon: Calendar, label: date },
  { icon: Clock, label: timeLabel },
  { icon: MapPin, label: location },
];

const topicChips = [
  "Transformação com IA",
  "Sistemas ao vivo no Lovable",
  "Agentes com OpenClaw",
  "Gestão com IA",
];

export function HeroSectionVip({
  eventDate = "25 de março de 2026",
  closed = true,
  location = "Espaço Santa Vista — Santa Lúcia, BH",
  timeLabel = "Das 8h30 às 17h · Almoço incluso no local",
  closedLabel = "INSCRIÇÕES ENCERRADAS",
  closedNote = "*As vagas para este evento foram preenchidas.",
  badgeLabel = "Evento VIP presencial",
  titlePrefix = "IA NA MESA ",
  titleAccent = "DE DECISÃO",
  description = "Um encontro privado para empresários e líderes que querem sair da teoria e ver IA funcionando na prática — com sistemas sendo construídos ao vivo e estratégias reais de gestão com inteligência artificial.",
  ctaLabel = "FAZER MINHA APLICAÇÃO",
  ctaNote = "* Vagas limitadas. Analisamos cada aplicação para garantir conversas de alto nível, que gerem valor real para todos.",
  titleNoWrap = true,
  logoSrc,
  logoClassName = "h-7",
}: HeroSectionVipProps) {
  const eventDetails = getEventDetails(eventDate, location, timeLabel);
  const scrollToForm = () => {
    document.getElementById("confirmar-presenca")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Mobile background photo */}
      <div className="absolute inset-0 lg:hidden pointer-events-none">
        <img
          src={rodrigoImg}
          alt="Rodrigo Nascimento"
          className="w-full h-full object-cover opacity-[0.3]"
          style={{ objectPosition: '50% 15%' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 30%, hsl(var(--background) / 0.4) 55%, hsl(var(--background)) 75%)' }}
        />
      </div>

      {/* Desktop background image — right side with gradient fade */}
      <div className="absolute inset-y-0 right-0 w-[55%] hidden lg:block pointer-events-none">
        <img
          src={rodrigoImg}
          alt="Rodrigo Nascimento"
          className="w-full h-full object-cover object-[center_15%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
      </div>

      {/* Accent glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, hsl(var(--accent) / 0.3) 0%, transparent 40%, hsl(var(--primary) / 0.2) 100%)",
        }}
      />

      <div className="container mx-auto px-4 relative z-10 py-16 lg:py-20">
        <div className="max-w-xl space-y-8">
          <div className="flex items-center gap-3">
            <img src={logoSrc ?? defaultLogo} alt="Logo do evento" className={logoClassName} />
            <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] tracking-widest uppercase font-semibold">
              {badgeLabel}
            </Badge>
          </div>

          <div className="space-y-4">
            <h1
              className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] ${titleNoWrap ? "whitespace-nowrap" : ""}`}
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              <span className="text-foreground">{titlePrefix}</span>
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {titleAccent}
              </span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {eventDetails.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2.5 bg-card/80 backdrop-blur-sm border border-accent/30 rounded-xl px-4 py-2.5 shadow-[0_0_20px_hsl(var(--accent)/0.08)]"
              >
                <item.icon className="w-5 h-5 text-accent shrink-0" />
                <span className="text-sm md:text-base font-semibold text-foreground">{item.label}</span>
              </div>
            ))}
          </div>




          {closed ? (
            <>
              <Button
                disabled
                size="lg"
                className="h-14 px-10 text-base font-bold bg-transparent border-2 border-destructive text-destructive rounded-xl gap-3 cursor-not-allowed disabled:opacity-100 hover:bg-transparent"
              >
                {closedLabel}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {closedNote}
              </p>
            </>
          ) : (
            <>
              <Button
                onClick={scrollToForm}
                size="lg"
                className="h-14 px-10 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-3"
              >
                {ctaLabel} <ArrowDown className="w-5 h-5" />
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {ctaNote}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
