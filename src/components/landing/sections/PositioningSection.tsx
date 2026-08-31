import { AlertTriangle } from "lucide-react";

export function PositioningSection() {
  return (
    <section id="positioning" className="relative section-padding overflow-hidden">
      {/* Spotlight effect from top */}
      <div className="absolute inset-0 bg-background spotlight" />
      
      {/* Concrete texture */}
      <div className="absolute inset-0 concrete-texture" />

      {/* Content */}
      <div className="section-container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Alert badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/10 mb-8">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Importante</span>
          </div>

          {/* Main message */}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Essa <span className="text-primary">não</span> é uma imersão de prompts.
          </h2>

          <div className="space-y-4 text-lg text-text-secondary">
            <p>
              Não vamos perder tempo ensinando a "conversar com o chat".
            </p>
            <p className="text-foreground font-medium">
              Será uma <span className="text-primary">Imersão de Implementação de IA aplicada</span>.
            </p>
          </div>

          {/* Separator line */}
          <div className="my-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Manifesto */}
          <p className="text-lg md:text-xl text-text-secondary leading-relaxed">
            Você vai instalar um <span className="text-foreground font-semibold">Novo Sistema Operacional</span> na sua empresa.
          </p>
          <p className="text-lg md:text-xl text-foreground font-medium mt-4">
            O foco não é a ferramenta, é a <span className="text-gradient">Autonomia</span> de construir soluções complexas com um clique.
          </p>
        </div>
      </div>
    </section>
  );
}
