import { AlertCircle, Radio } from "lucide-react";

export function ScarcitySection() {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div className="section-container relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Evento ao vivo, com <span className="text-gradient">vagas limitadas</span>
          </h2>

          <p className="text-muted-foreground text-lg">
            Para manter qualidade, interação e profundidade das demonstrações, as vagas são limitadas e as inscrições serão encerradas ao atingir o limite ou na data do evento.
          </p>

          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <Radio className="w-5 h-5 text-destructive" />
            <span className="text-foreground font-medium text-sm">
              Evento ao vivo, sem replay — se você não participar ao vivo, perde a experiência.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
