import { Building2, TrendingUp, Rocket, User } from "lucide-react";

const personas = [
  {
    icon: Building2,
    title: "Empresários, donos de empresa e CEOs",
    description: "Líderes que querem autonomia na execução",
  },
  {
    icon: TrendingUp,
    title: "Faturamento entre R$ 2 mi e R$ 50 mi",
    description: "Empresas prontas para escalar com eficiência",
  },
  {
    icon: Rocket,
    title: "Sede por resultado prático",
    description: "Velocidade e autonomia operacional como prioridade",
  },
];

export function TargetAudienceSection() {
  return (
    <section id="para-quem" className="section-padding bg-background-secondary">
      <div className="section-container">
        {/* Headline */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground flex items-center justify-center gap-2">
            <User className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            PARA QUEM É ESSA IMERSÃO
          </h2>
        </div>

        {/* Personas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {personas.map((persona, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 text-center card-hover"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <persona.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{persona.title}</h3>
              <p className="text-text-secondary text-sm">{persona.description}</p>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-text-muted text-sm mt-8">
          (Essa página é focada em quem já entende ou já busca aplicar IA na prática)
        </p>
      </div>
    </section>
  );
}
