import { Button } from "@/components/ui/button";
import { Search, Target, ListOrdered, Map } from "lucide-react";
import { trackCtaClick } from "@/lib/metaTracking";

interface DiagnosticDetailSectionProps {
  onOpenModal: () => void;
}

const steps = [
  {
    number: "1",
    icon: Search,
    title: "Entendimento da operação",
    description: "Você nos conta e nós avaliamos como sua empresa funciona hoje:",
    items: ["Processos", "Equipes", "Fluxos de trabalho", "Gargalos operacionais"],
  },
  {
    number: "2",
    icon: Target,
    title: "Identificação das oportunidades de IA",
    description: "Mapeamos onde a Inteligência Artificial pode:",
    items: ["Automatizar tarefas", "Aumentar produtividade", "Reduzir custos operacionais", "Aumentar os lucros"],
  },
  {
    number: "3",
    icon: ListOrdered,
    title: "Definição de prioridades",
    description: "Nem tudo deve ser automatizado primeiro.",
    items: ["Definimos onde começar para gerar resultado mais rápido."],
  },
  {
    number: "4",
    icon: Map,
    title: "Plano de implementação inicial",
    description: "Você sai do encontro com um plano claro para aplicar IA na sua empresa nos próximos 90 dias.",
    items: [],
  },
];

export function DiagnosticDetailSection({ onOpenModal }: DiagnosticDetailSectionProps) {
  return (
    <section id="diagnostico" className="section-padding relative overflow-hidden section-bg-highlight concrete-texture">
      <div className="absolute inset-0 spotlight pointer-events-none" />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="text-sm tracking-widest uppercase text-primary mb-4">A parte que falta</p>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 leading-tight">
            Diagnóstico
          </h2>

          {/* Testimonial quote */}
          <div className="glass-card p-6 md:p-8 max-w-2xl mx-auto mb-8">
            <p className="text-base md:text-lg italic text-foreground/90 leading-relaxed mb-3">
              "O pessoal está cansado de curso… Ainda mais quando ele é dado por quem nunca teve empresa, nunca atrasou salário e nunca pagou um boleto na vida"
            </p>
            <p className="text-xs text-muted-foreground">
              Participante do programa de IAficação da <strong className="text-foreground">dn.ia</strong>
            </p>
          </div>
        </div>

        {/* Process description */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
            Em uma reunião online de diagnóstico, direto com um especialista da dn.ia:
          </p>

          {/* Visual Steps */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-2 max-w-3xl mx-auto">
            {[
              { num: "1", text: "Analisamos sua operação" },
              { num: "2", text: "Identificamos gargalos e oportunidades" },
              { num: "3", text: "Indicamos quais IAs vão gerar mais impacto" },
              { num: "4", text: "Te damos um plano de 90 dias para aplicar tudo" },
            ].map((step, i) => (
              <div key={step.num} className="flex sm:flex-col items-center gap-3 sm:gap-2 flex-1">
                <div className="flex items-center gap-3 sm:flex-col sm:gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {step.num}
                  </div>
                  <p className="text-sm text-foreground/80 text-left sm:text-center leading-snug">
                    {step.text}
                  </p>
                </div>
                {i < 3 && (
                  <>
                    <div className="hidden sm:block w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mt-1" />
                    <div className="sm:hidden w-px h-6 bg-gradient-to-b from-primary/30 to-transparent self-center ml-1 shrink-0" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-foreground font-semibold text-base md:text-lg mb-10 max-w-2xl mx-auto">
          O objetivo é simples: mostrar exatamente como IAficar toda sua operação nos próximos 3 meses.
        </p>

        {/* 4 Steps */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          {steps.map((step) => (
            <div key={step.number} className="glass-card card-glow p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {step.number}
                </div>
                <h3 className="font-bold text-base md:text-lg text-foreground">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {step.description}
              </p>
              {step.items.length > 0 && (
                <ul className="space-y-1.5">
                  {step.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={() => { trackCtaClick("diagnostic_detail"); onOpenModal(); }}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base md:text-lg px-8 py-6 rounded-2xl animate-glow-pulse"
          >
            Agendar meu diagnóstico agora
          </Button>
        </div>
      </div>
    </section>
  );
}
