import { UserCheck, Route, GraduationCap, Layers } from "lucide-react";

interface PeoplePillarSectionProps {
  onOpenModal: () => void;
}

const items = [
  {
    icon: UserCheck,
    title: "Diagnóstico individual",
    description: "Mapeamos perfil, função e responsabilidade de cada pessoa do time.",
  },
  {
    icon: Route,
    title: "Trilha personalizada por função",
    description: "Seu time não aprende 'IA geral'. Aprende a IA necessária para executar o plano da empresa.",
  },
  {
    icon: GraduationCap,
    title: "Capacitação conectada ao plano",
    description: "O dono aprende diferente do gestor. O gestor diferente do operador. Ninguém perde tempo com o que não aplica.",
  },
  {
    icon: Layers,
    title: "Sustentação sem depender do dono",
    description: "Cada pessoa aprende o que precisa, na ordem certa, conectada ao plano da empresa.",
  },
];

export function PeoplePillarSection({ onOpenModal }: PeoplePillarSectionProps) {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            IA na empresa sem capacitar o time é{" "}
            <span className="text-primary">automação com prazo de validade.</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            O dono aprende, se empolga, implementa. Funciona enquanto ele faz tudo. Tenta delegar — e o time não sabe como. Volta ao ponto zero.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10">
          {items.map((item) => (
            <div key={item.title} className="glass-card p-6 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Frase destaque */}
        <div className="max-w-2xl mx-auto text-center glass-card p-6 md:p-8 border-primary/20">
          <p className="text-base md:text-lg font-medium leading-relaxed">
            Empresa IAficada não é empresa com ferramentas de IA.{" "}
            <span className="text-primary font-bold">É empresa com time que sabe usar IA no que importa</span> — e sustenta o resultado sem depender do dono.
          </p>
        </div>

        <div className="text-center mt-10">
          <button
            onClick={onOpenModal}
            className="text-primary hover:text-primary/80 underline underline-offset-4 text-sm font-medium transition-colors"
          >
            Quero agendar meu diagnóstico gratuito →
          </button>
        </div>
      </div>
    </section>
  );
}
