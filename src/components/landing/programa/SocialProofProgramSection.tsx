import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trackCtaClick } from "@/lib/metaTracking";
import danielImg from "@/assets/depoimentos/daniel-gaia-sm.png";
import victorImg from "@/assets/depoimentos/victor-barreto-sm.png";
import mateusImg from "@/assets/depoimentos/mateus-aleixo-sm.png";
import geraldoImg from "@/assets/depoimentos/geraldo-maciel-sm.png";

interface SocialProofProgramSectionProps {
  onOpenModal: () => void;
}

const cases = [
  { name: "Daniel Gaia", metric: "+R$1,5M", detail: "em propostas · 90 dias", image: danielImg },
  { name: "Victor Barreto", metric: "+28%", detail: "de conversão", image: victorImg },
  { name: "Geraldo Maciel", metric: "400", detail: "clientes gerenciados por IA", image: geraldoImg },
  { name: "Mateus Aleixo", metric: "60+", detail: "clientes automatizados", image: mateusImg },
];

export function SocialProofProgramSection({ onOpenModal }: SocialProofProgramSectionProps) {
  return (
    <section id="resultados" className="section-padding section-bg-dual-glow dot-pattern">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm tracking-widest uppercase text-primary mb-4">Quem já fez o diagnóstico</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Resultado tem nome e número.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto mb-10">
          {cases.map((c) => (
            <div key={c.name} className="glass-card card-glow p-5 md:p-6 text-center">
              <div className="flex justify-center mb-3">
                {c.image ? (
                  <img src={c.image} alt={c.name} loading="lazy" width={56} height={56} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {c.name[0]}
                  </div>
                )}
              </div>
              <p className="font-semibold text-sm mb-2">{c.name}</p>
              <p className="text-2xl md:text-3xl font-bold text-primary mb-1">{c.metric}</p>
              <p className="text-xs text-muted-foreground">{c.detail}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={() => { trackCtaClick("social_proof"); onOpenModal(); }}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base px-8 py-6 rounded-2xl"
          >
            Agendar meu diagnóstico agora
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}
