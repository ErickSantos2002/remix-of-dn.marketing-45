import { Brain, BookOpen, Grid3X3, Compass, FileText, Wrench } from "lucide-react";

const tools = [
  { icon: Brain, name: "talent.ia", description: "Plataforma de diagnóstico de perfil comportamental e mapeamento do time." },
  { icon: BookOpen, name: "mentor.ia", description: "Acompanhamento da trilha de capacitação, calendário e recursos personalizados." },
  { icon: Compass, name: "Método C3Z", description: "Framework proprietário de implementação de IA em PMEs." },
  { icon: Grid3X3, name: "Matriz IAficação 360°", description: "Diagnóstico de maturidade de IA da empresa." },
  { icon: FileText, name: "Playbooks por setor", description: "Guias de referência para os setores mais frequentes dos nossos membros." },
  { icon: Wrench, name: "Templates de execução", description: "Ferramentas prontas para acelerar cada fase do plano." },
];

export function ToolsSection() {
  return (
    <section className="section-padding border-t border-border/30 mesh-texture">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Você não precisa construir stack do zero.{" "}
            <span className="text-gradient-dnia">A dn.ia já construiu.</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Membros do Programa têm acesso às ferramentas proprietárias desenvolvidas pela dn.ia.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto mb-10">
          {tools.map((tool) => (
            <div key={tool.name} className="glass-card card-glow p-5 text-center">
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <tool.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{tool.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground max-w-lg mx-auto">
          Membro da <strong className="text-foreground">dn.ia</strong> não começa do zero. Entra num ecossistema com ferramentas testadas, integradas e prontas para usar.
        </p>
      </div>
    </section>
  );
}
