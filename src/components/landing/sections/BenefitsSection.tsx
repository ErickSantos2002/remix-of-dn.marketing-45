import { Zap, Code, Video, Bot, Rocket } from "lucide-react";
import { BenefitCard } from "../BenefitCard";

const benefits = [
  {
    icon: Zap,
    title: "Dominar o PROTOCOLO IA",
    description: "Da ideia à execução em minutos, não semanas.",
  },
  {
    icon: Code,
    title: "Construir sistemas sem programação",
    description: "Dashboards, automações e ferramentas internas sem código.",
  },
  {
    icon: Video,
    title: "Gerar vídeos e copy",
    description: "Vídeos, imagens e copy de alta conversão em segundos.",
  },
  {
    icon: Bot,
    title: "Criar máquinas de vendas",
    description: "Automações com agentes de IA 24/7.",
  },
];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="section-padding bg-background-secondary">
      <div className="section-container">
        {/* Headline */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground flex items-center justify-center gap-2">
            <Rocket className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            O QUE VOCÊ VAI CONSEGUIR
          </h2>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
