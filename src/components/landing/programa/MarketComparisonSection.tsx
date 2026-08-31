import { Check, X, Minus } from "lucide-react";

const rows = [
  { criteria: "Diagnóstico real do negócio antes da ação", courses: "no", consulting: "no", dnia: "Matriz IAficação 360°" },
  { criteria: "Plano personalizado para a sua empresa", courses: "Template genérico", consulting: "Projeto específico, sem visão do todo", dnia: "Plano do SEU negócio" },
  { criteria: "Acompanhamento de execução", courses: "Termina no evento", consulting: "Termina na entrega", dnia: "6 meses com time dedicado" },
  { criteria: "Capacitação do time por função", courses: "no", consulting: "no", dnia: "Trilha personalizada por colaborador" },
  { criteria: "Resultado comprovado em até 90 dias", courses: "no", consulting: "Parcial (projeto isolado)", dnia: "Com nome, número e métrica" },
  { criteria: "Comunidade de empresários implementando IA", courses: "no", consulting: "no", dnia: "Hot seats, cases, encontros" },
  { criteria: "Ferramentas proprietárias", courses: "no", consulting: "no", dnia: "talent.ia, mentor.ia, Método C3Z" },
];

function CellContent({ value }: { value: string }) {
  if (value === "no") return <X className="w-4 h-4 text-destructive mx-auto" />;
  return <span className="text-xs leading-tight">{value}</span>;
}

export function MarketComparisonSection() {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Isso não é curso. Não é mentoria.{" "}
            <span className="text-gradient-dnia">É IAficação.</span>
          </h2>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium w-[35%]"></th>
                <th className="py-3 px-3 text-muted-foreground font-medium text-center">Cursos e Imersões</th>
                <th className="py-3 px-3 text-muted-foreground font-medium text-center">Consultorias</th>
                <th className="py-3 px-3 text-center font-bold text-primary">dn.ia</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.criteria} className="border-b border-border/20 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-foreground/90 text-xs md:text-sm">{row.criteria}</td>
                  <td className="py-3 px-3 text-center text-muted-foreground"><CellContent value={row.courses} /></td>
                  <td className="py-3 px-3 text-center text-muted-foreground"><CellContent value={row.consulting} /></td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-success shrink-0" />
                      <span className="text-xs text-foreground">{row.dnia}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10 max-w-2xl mx-auto leading-relaxed">
          Quem vende curso, vende conteúdo. Quem vende consultoria, vende projeto. A <strong className="text-foreground">dn.ia</strong> vende o diagnóstico que diz por onde começar, o plano que diz o que fazer, e o acompanhamento que garante que você chegue no resultado.
        </p>
      </div>
    </section>
  );
}
