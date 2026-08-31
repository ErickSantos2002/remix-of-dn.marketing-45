import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommonEnemySectionProps {
  onOpenModal: () => void;
}

const lies = [
  {
    num: "01",
    quote: '"Aprenda a criar prompts perfeitos e revolucione sua vida"',
    reality: (
      <>
        Legal. Mas como que um prompt bonito{" "}
        <strong className="text-primary">paga a sua folha no dia 5?</strong>{" "}
        Prompt não gera receita. Processo gera.
      </>
    ),
  },
  {
    num: "02",
    quote: '"IA vai substituir 80% dos empregos. Prepare-se ou morra."',
    reality: (
      <>
        Discurso de guru apocalíptico que{" "}
        <strong className="text-primary">nunca assinou uma carteira de trabalho.</strong>{" "}
        Quer te assustar pra vender curso de R$97.
      </>
    ),
  },
  {
    num: "03",
    quote: '"Crie vídeos incríveis com IA em 2 minutos"',
    reality: (
      <>
        Ótimo pro estagiário. Mas você é o dono.{" "}
        <strong className="text-primary">
          Seu problema não é criar vídeo — é ter lucro no fim do mês.
        </strong>
      </>
    ),
  },
  {
    num: "04",
    quote: '"Automatize tudo com IA e trabalhe 4 horas por dia"',
    reality: (
      <>
        Quem fala isso nunca teve 15 problemas no WhatsApp antes das 8 da manhã.{" "}
        <strong className="text-primary">Não existe empresa que roda sozinha.</strong>{" "}
        Existe empresa inteligente.
      </>
    ),
  },
];

export function CommonEnemySection({ onOpenModal }: CommonEnemySectionProps) {
  return (
    <section className="relative section-padding overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Warning banner */}
      <div className="max-w-[860px] mx-auto text-center mb-14 px-6">
        <div className="inline-flex items-center gap-2 px-5 py-2 border border-primary/25 rounded-full bg-primary/6 mb-7">
          <AlertTriangle className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-xs tracking-[3px] uppercase text-primary">
            Atenção: isso pode incomodar
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.15] mb-4">
          O mercado de IA está te
          <br />
          <span className="text-primary">vendendo a solução errada.</span>
        </h2>

        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-[580px] mx-auto">
          Enquanto você tenta entender como IA pode salvar sua empresa, te
          ensinam a fazer figurinha no WhatsApp. Reconhece alguma dessas?
        </p>
      </div>

      {/* Lie cards */}
      <div className="max-w-[860px] mx-auto flex flex-col gap-4 mb-14 px-6">
        {lies.map((lie) => (
          <div
            key={lie.num}
            className="grid grid-cols-[40px_1fr] md:grid-cols-[48px_1fr] gap-3.5 md:gap-5 items-start p-5 md:p-6 rounded-xl bg-primary/3 border border-primary/8 transition-all duration-300 hover:border-primary/18 hover:bg-primary/5 hover:translate-x-1"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-[10px] bg-primary/8 flex items-center justify-center font-bold text-base md:text-lg text-primary flex-shrink-0">
              {lie.num}
            </div>
            <div>
              <div className="font-bold text-base md:text-lg leading-tight mb-1.5">
                {lie.quote}
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {lie.reality}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Truth block */}
      <div className="max-w-[860px] mx-auto px-6">
        <div className="p-8 md:p-10 rounded-2xl bg-gradient-to-br from-accent/6 to-accent/2 border border-accent/15 relative overflow-hidden">
          <div className="absolute -top-[60px] -right-[60px] w-[200px] h-[200px] bg-[radial-gradient(circle,hsl(var(--accent)/0.25)_0%,transparent_70%)] blur-[60px] opacity-30 pointer-events-none" />

          <div className="flex items-center gap-2 font-bold text-xs tracking-[3px] uppercase text-accent mb-4 relative z-10">
            <span className="text-[8px]">◆</span>
            A verdade que ninguém te conta
          </div>

          <h3 className="font-bold text-xl md:text-2xl lg:text-3xl leading-tight mb-4 relative z-10">
            O problema não é a IA.
            <br />É que quem te ensina{" "}
            <span className="text-accent">nunca geriu uma empresa.</span>
          </h3>

          <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-[680px] relative z-10">
            Esse pessoal sabe tudo de tecnologia. Sabe configurar agente, sabe
            fazer automação bonita, sabe criar imagem com Midjourney. Mas{" "}
            <strong className="text-foreground">
              não sabe o que é começar o mês devendo
            </strong>
            , não sabe o que é ter um time de 15 pessoas dependendo de você,
            não sabe o que é ter a concorrência vendendo mais barato todo dia.
            <br /><br />
            Por isso nenhum conteúdo de IA te ajudou até agora. Porque{" "}
            <strong className="text-foreground">
              ninguém traduziu IA pra linguagem de quem paga boleto.
            </strong>{" "}
            Até agora.
          </p>

          <Button
            onClick={onOpenModal}
            className="mt-7 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-sm tracking-wider uppercase relative z-10 shadow-[0_0_30px_hsl(var(--accent)/0.2)]"
          >
            Quero aprender com quem fez
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
