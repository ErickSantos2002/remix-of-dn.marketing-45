import rodrigoImg from "@/assets/rodrigo-palco-profile-sm.png";
import { trackCtaClick } from "@/lib/metaTracking";

interface UrgencySectionProps {
  onOpenModal: () => void;
}

export function UrgencySection({ onOpenModal }: UrgencySectionProps) {
  return (
    <section className="section-padding border-t border-border/30 section-bg-red-glow dot-pattern">
      <div className="section-container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight">
            IAficar uma empresa é
          </h2>

          <blockquote className="text-lg md:text-xl text-primary font-semibold italic max-w-2xl mx-auto mb-6">
            "Aplicar a IA certa no local certo, para gerar mais lucro e reduzir custos."
          </blockquote>

          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            E isso só é possível com um bom diagnóstico da sua operação.
          </p>
        </div>

        {/* Rodrigo quote card */}
        <div className="max-w-2xl mx-auto glass-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <img
            src={rodrigoImg}
            alt="Rodrigo Nascimento"
            loading="lazy"
            className="w-24 h-28 md:w-28 md:h-32 rounded-xl object-cover object-top border border-primary/20 shadow-lg shadow-primary/10 shrink-0"
          />
          <div className="text-center md:text-left">
            <p className="text-base md:text-lg italic text-foreground/90 leading-relaxed mb-3">
              "A maioria das empresas tenta aplicar IA começando pela ferramenta. Nós começamos entendendo o negócio."
            </p>
            <p className="text-sm font-semibold text-foreground">Rodrigo Nascimento</p>
            <p className="text-xs text-muted-foreground">Fundador da dn.ia</p>
          </div>
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => { trackCtaClick("urgency"); onOpenModal(); }}
            className="text-primary hover:text-primary/80 underline underline-offset-4 text-sm font-medium transition-colors"
          >
            Quero agendar meu diagnóstico gratuito →
          </button>
        </div>
      </div>
    </section>
  );
}
