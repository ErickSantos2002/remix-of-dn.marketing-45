import { TrendingUp, MessageSquare, Video, Brain, DollarSign } from "lucide-react";

const learningItems = [
  {
    icon: TrendingUp,
    title: "Como escalar marketing",
    description: "Como aumentar a geração de demanda com IA sem escalar equipe, ganhando velocidade, consistência e previsibilidade.",
  },
  {
    icon: MessageSquare,
    title: "Como escalar atendimento e vendas",
    description: "Mais atendimentos, mais conversões, menos despesas e menor dependência de estrutura — com IA aplicada de forma simples, prática e integrada ao dia a dia da empresa.",
  },
  {
    icon: Video,
    title: "Criação de imagens e vídeos profissionais com IA",
    description: "Como criar imagens e vídeos de alta qualidade com agilidade e consistência, sem gastar fortunas com estúdios, agências ou freelancers.",
  },
  {
    icon: Brain,
    title: "Como usar IA para criar soluções internas",
    description: "IA como aliada para economizar milhares de reais por ano criando soluções próprias de marketing, vendas, RH e gestão.",
  },
  {
    icon: DollarSign,
    title: "Aumento de receita e redução de custos",
    description: "Um método que vai além da ferramenta e foca no resultado final do negócio.",
  },
];

export function LearningBulletsSection() {
  return (
    <section id="skills" className="relative py-16 md:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background-secondary" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Content */}
      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            O que você vai <span className="text-gradient">aprender</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Em 6 horas de conteúdo 100% prático, você vai dominar o essencial para aplicar IA no seu negócio
          </p>
        </div>

        {/* First row - 3 cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-6">
          {learningItems.slice(0, 3).map((item, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl" />
              <div className="relative">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Second row - 2 cards centered and wider */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-[680px] mx-auto">
          {learningItems.slice(3).map((item, index) => (
            <div
              key={index + 3}
              className="group relative p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl" />
              <div className="relative">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
