import { Cog, Video, DollarSign } from "lucide-react";

const skills = [
  {
    icon: Cog,
    title: "Sistemas & Apps",
    description: "Construir painéis e ferramentas internas para organizar a empresa, sem depender de TI.",
  },
  {
    icon: Video,
    title: "Marketing de Escala",
    description: "Criar criativos de alta conversão e vídeos com avatares em minutos, sem depender de agências.",
  },
  {
    icon: DollarSign,
    title: "Vendas Automáticas",
    description: "Implantar Agentes de IA para qualificar leads e agendar reuniões enquanto você dorme.",
  },
];

export function SkillsSection() {
  return (
    <section id="skills" className="relative section-padding overflow-hidden">
      {/* Black background with code texture */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 code-texture" />

      {/* Content */}
      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Sem enrolação <span className="text-gradient">e teoria.</span>
          </h2>
          <p className="text-text-secondary text-lg max-w-3xl mx-auto leading-relaxed">
            Vamos abrir <span className="text-foreground font-bold">o que acontece por trás do método</span> que criamos e aplicamos na Buscar ID e permitiu triplicar nossa produtividade e rentabilidade em 6 meses.
          </p>
        </div>

        {/* Skills Grid */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="group p-6 md:p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <skill.icon className="w-7 h-7 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-3">{skill.title}</h3>
              <p className="text-text-secondary leading-relaxed">{skill.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
