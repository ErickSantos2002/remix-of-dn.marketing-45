import { Gift, Sparkles, BookOpen } from "lucide-react";

const bonuses = [
  {
    icon: Sparkles,
    title: 'Pack de "Diretores Digitais" (Prompt Library)',
    description: 'Não comece do zero. Receba os scripts prontos dos meus Agentes de Marketing, Vendas e Gestão para copiar e colar na sua empresa.',
    originalPrice: 'R$ 997,00',
  },
  {
    icon: BookOpen,
    title: 'A "Caixa Preta" de Ferramentas (Curadoria)',
    description: 'Eu testo centenas de IAs para você não precisar testar. O acesso à minha lista pessoal das únicas ferramentas que geram lucro real hoje.',
    originalPrice: 'R$ 497,00',
  },
];

export function BonusSection() {
  return (
    <section className="relative section-padding overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background-secondary" />
      
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      {/* Content */}
      <div className="section-container relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Gift className="w-8 h-8 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground uppercase tracking-wide">
            Bônus Exclusivos
          </h2>
        </div>

        {/* Bonus Cards */}
        <div className="space-y-4">
          {bonuses.map((bonus, index) => {
            const Icon = bonus.icon;
            return (
              <div 
                key={index}
                className="relative rounded-2xl bg-card/80 border border-border/50 overflow-hidden"
              >
                {/* Left orange border accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                
                <div className="flex gap-4 md:gap-6 p-5 md:p-6 pl-6 md:pl-8">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-bold text-primary mb-2">
                      BÔNUS {index + 1}: {bonus.title}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground mb-3 leading-relaxed">
                      {bonus.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm md:text-base">
                      <span className="text-muted-foreground line-through">{bonus.originalPrice}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-success font-bold">GRÁTIS</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
