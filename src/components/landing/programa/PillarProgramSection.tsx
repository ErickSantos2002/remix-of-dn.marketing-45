import { ClipboardCheck, Users, Zap } from "lucide-react";
import danielImg from "@/assets/depoimentos/daniel-gaia.png";

interface PillarProgramSectionProps {
  onOpenModal: () => void;
}

const pillars = [
  {
    icon: ClipboardCheck,
    title: "Plano de IAficação personalizado",
    description: "Não é template. É o plano construído especificamente para o seu negócio, setor e operação.",
  },
  {
    icon: Users,
    title: "Acompanhamento real por 6 meses",
    description: "Um time de especialistas da dn.ia que conhece o seu contexto, acompanha cada etapa e corrige rota quando você travar.",
  },
  {
    icon: Zap,
    title: "Resultado comprovado em até 90 dias",
    description: "Processos rodando com IA. Métricas antes e depois. Número, não promessa.",
  },
];

export function PillarProgramSection({ onOpenModal }: PillarProgramSectionProps) {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Não é curso. Não é consultoria pontual.{" "}
            <span className="text-gradient-dnia">É o plano de IA da sua empresa.</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            O Programa de IAficação começa onde nenhum concorrente começa: pelo diagnóstico real do seu negócio com a Matriz IAficação 360°.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="glass-card card-glow p-6 md:p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <pillar.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{pillar.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>

        {/* Case âncora */}
        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 max-w-3xl mx-auto">
          <img src={danielImg} alt="Daniel Gaia" className="w-20 h-20 rounded-full object-cover shrink-0 border-2 border-primary/30" />
          <div>
            <p className="text-base md:text-lg leading-relaxed mb-2">
              <strong>Daniel Gaia</strong> entrou no Programa sem nenhuma capacidade de IA na empresa. Em 90 dias: automação do processo comercial inteiro e{" "}
              <span className="text-primary font-bold">+R$1,5M em propostas geradas.</span>
            </p>
            <p className="text-xs text-muted-foreground">Varejão das Tintas · Mentorado MTIA</p>
          </div>
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
