import { Button } from "@/components/ui/button";
import { trackCtaClick } from "@/lib/metaTracking";

interface CTAProgramSectionProps {
  onOpenModal: () => void;
}

export function CTAProgramSection({ onOpenModal }: CTAProgramSectionProps) {
  return (
    <section id="diagnostico" className="section-padding relative overflow-hidden section-bg-highlight diagonal-pattern">
      <div className="absolute inset-0 spotlight pointer-events-none" />

      <div className="section-container relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 leading-tight">
            Seus concorrentes já estão usando IA.{" "}
            <span className="text-gradient-dnia">Qual é o seu plano?</span>
          </h2>

          <p className="text-muted-foreground text-base md:text-lg mb-8">
            Gratuito. Individual. Focado na sua empresa. Sem compromisso.
          </p>

          <Button
            onClick={() => { trackCtaClick("cta_final"); onOpenModal(); }}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base md:text-lg px-8 py-6 rounded-2xl animate-glow-pulse"
          >
            Agendar meu diagnóstico agora
          </Button>

          <p className="text-xs text-muted-foreground mt-6">
            +100 empresas IAficadas · A próxima pode ser a sua.
          </p>
        </div>
      </div>
    </section>
  );
}
