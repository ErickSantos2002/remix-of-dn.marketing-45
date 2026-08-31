import { Check, Gift, Calendar, Clock, BookOpen, Target, MessageCircle } from "lucide-react";

const includedItems = [
  {
    icon: Calendar,
    title: "2 encontros ao vivo",
    detail: "24 e 25 de fevereiro | 19h30",
  },
  {
    icon: Clock,
    title: "6 horas de conteúdo 100% prático",
    detail: "Com demonstrações reais e exemplos aplicados a negócios como o seu.",
  },
  {
    icon: Target,
    title: "Método passo a passo para aplicação de IA",
    detail: "Clareza sobre o que usar, onde usar e por onde começar — sem depender de times técnicos.",
  },
  {
    icon: BookOpen,
    title: "Aplicações reais em marketing, vendas, atendimento e operação",
    detail: "Para ganhar eficiência, reduzir custos e melhorar margens.",
  },
  {
    icon: MessageCircle,
    title: "Interação ao vivo e espaço para dúvidas",
    detail: "Você acompanha ao vivo e pode interagir durante o evento.",
  },
];

const bonuses = [
  {
    title: "Checklist de aplicação imediata",
    description: "Um checklist prático para você sair do evento sabendo exatamente o que aplicar na semana seguinte no seu negócio.",
  },
  {
    title: "Mapa de decisões de IA para empresários",
    description: "Um guia simples e direto para entender onde usar (e onde não usar) IA em marketing, vendas, atendimento e gestão.",
  },
  {
    title: "Prioridade em convites futuros da DNIA",
    description: "Participantes deste evento recebem prioridade em novos encontros e programas práticos.",
  },
];

export function DeliverablesSection() {
  return (
    <section id="bonus" className="relative py-16 md:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="section-container relative z-10">
        {/* Headline */}
        <div className="text-center mb-4">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Tudo o que você vai receber ao participar
          </h2>
        </div>
        <p className="text-muted-foreground text-lg max-w-3xl mx-auto text-center mb-14">
          Um programa prático, ao vivo, focado em aplicação real de IA para aumentar margem e reduzir custos no seu negócio.
        </p>

        {/* Included Items */}
        <div className="max-w-3xl mx-auto mb-16">
          <h3 className="text-lg font-bold text-foreground mb-8 text-center tracking-wide">
            O que está incluso na sua inscrição
          </h3>
          <div className="space-y-4">
            {includedItems.map((item, index) => (
              <div
                key={index}
                className="group relative rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-5 md:p-6 flex items-start gap-4 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-11 h-11 bg-primary/15 border border-primary/30 rounded-full flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-foreground font-semibold block text-base">{item.title}</span>
                  <span className="text-muted-foreground text-sm mt-1 block">{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bonuses */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-foreground mb-8 text-center tracking-wide flex items-center justify-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> Bônus exclusivos para participantes
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {bonuses.map((bonus, index) => (
              <div
                key={index}
                className="group relative rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-6 text-center hover:border-primary/30 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/15 border border-primary/30 rounded-full mb-4">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-foreground font-bold text-sm mb-3">
                  BÔNUS {index + 1} — {bonus.title}
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {bonus.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  );
}
