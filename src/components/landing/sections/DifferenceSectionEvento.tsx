import { X, Diamond, ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import rodrigoImg from "@/assets/rodrigo-nascimento.jpg";

const contrastCards = [
  {
    type: "negative" as const,
    label: "O que você vê por aí",
    title: '"Aprenda a criar prompts incríveis"',
    text: "Ensinado por quem nunca geriu uma empresa, nunca teve funcionário, nunca começou o mês devendo. Sabe fazer IA produzir conteúdo — mas não sabe como isso gera lucro.",
  },
  {
    type: "positive" as const,
    label: "O que você vai encontrar aqui",
    title: '"Como a IA reduz custo e aumenta margem na prática"',
    text: "Ensinado por um empresário que reduziu o time de 30 para 5 pessoas, triplicou o faturamento e quadruplicou a margem. Com ferramentas que ele mesmo usa todo dia.",
  },
  {
    type: "negative" as const,
    label: "O que te falam",
    title: '"IA vai substituir todo mundo"',
    text: "Discurso apocalíptico de guru que quer te assustar pra vender curso. Zero prática, zero contexto de quem lida com folha de pagamento, imposto e fluxo de caixa todo mês.",
  },
  {
    type: "positive" as const,
    label: "O que é real",
    title: '"IA amplifica o que já funciona na sua empresa"',
    text: "Você não precisa demitir ninguém. Precisa fazer sua operação rodar com menos atrito, menos dependência de você e mais inteligência onde dói: receita, custo e processos.",
  },
];

const contrastPairs = [
  [contrastCards[0], contrastCards[1]],
  [contrastCards[2], contrastCards[3]],
];

const stats = [
  { value: "20+", label: "anos como empresário" },
  { value: "3x", label: "faturamento com IA" },
  { value: "4x", label: "margem de lucro" },
  { value: "5", label: "pessoas no time" },
];

interface DifferenceSectionEventoProps {
  onOpenModal?: () => void;
}

export function DifferenceSectionEvento({ onOpenModal }: DifferenceSectionEventoProps) {
  return (
    <section id="diferencial" className="relative section-padding overflow-hidden">
      {/* Top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="section-container max-w-[1080px]">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-12 text-accent font-semibold text-xs tracking-[4px] uppercase">
          <div className="w-6 h-px bg-accent" />
          Por que isso é diferente
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] mb-4 max-w-[700px]">
          Aqui não é <span className="text-primary">meninada</span> ensinando
          <br />a fazer videozinho com IA.
        </h2>

        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-[600px] mb-14">
          O mercado inteiro te ensina a usar IA na operação — fazer prompt bonito,
          criar imagem, montar copy. Mas ninguém te mostrou como isso se conecta
          com o que realmente importa na sua empresa.
        </p>

        {/* Contrast Pairs - Mobile: grouped pairs, Desktop: 2-col grid */}
        <div className="hidden md:grid grid-cols-2 gap-5 mb-14">
          {contrastCards.map((card, i) => (
            <div
              key={i}
              className={`p-7 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 ${
                card.type === "negative"
                  ? "bg-primary/4 border-primary/12 hover:border-primary/20"
                  : "bg-accent/4 border-accent/12 hover:border-accent/25 hover:shadow-[0_0_40px_hsl(var(--accent)/0.08)]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-[10px] flex items-center justify-center mb-4 ${
                  card.type === "negative" ? "bg-primary/10" : "bg-accent/10"
                }`}
              >
                {card.type === "negative" ? (
                  <X className="w-4 h-4 text-primary" />
                ) : (
                  <Diamond className="w-4 h-4 text-accent" />
                )}
              </div>
              <div
                className={`font-bold text-[11px] tracking-[2.5px] uppercase mb-3 ${
                  card.type === "negative" ? "text-primary" : "text-accent"
                }`}
              >
                {card.label}
              </div>
              <div className="font-bold text-lg md:text-xl mb-2 leading-tight">
                {card.title}
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {card.text}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Paired layout */}
        <div className="md:hidden space-y-8 mb-14">
          {contrastPairs.map((pair, pairIdx) => (
            <div
              key={pairIdx}
              className="border border-border/30 rounded-2xl p-4 space-y-0"
            >
              {pair.map((card, cardIdx) => (
                <div key={cardIdx}>
                  {cardIdx === 1 && (
                    <div className="flex items-center justify-center py-3">
                      <div className="flex items-center gap-2 text-accent text-xs font-semibold tracking-[2px] uppercase">
                        <ArrowDown className="w-4 h-4" />
                        Na imersão
                      </div>
                    </div>
                  )}
                  <div
                    className={`p-5 rounded-xl border backdrop-blur-sm ${
                      card.type === "negative"
                        ? "bg-primary/4 border-primary/12"
                        : "bg-accent/4 border-accent/12"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-[10px] flex items-center justify-center mb-4 ${
                        card.type === "negative" ? "bg-primary/10" : "bg-accent/10"
                      }`}
                    >
                      {card.type === "negative" ? (
                        <X className="w-4 h-4 text-primary" />
                      ) : (
                        <Diamond className="w-4 h-4 text-accent" />
                      )}
                    </div>
                    <div
                      className={`font-bold text-[11px] tracking-[2.5px] uppercase mb-3 ${
                        card.type === "negative" ? "text-primary" : "text-accent"
                      }`}
                    >
                      {card.label}
                    </div>
                    <div className="font-bold text-lg mb-2 leading-tight">
                      {card.title}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {card.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Closing statement */}
        <div className="mb-14 text-center">
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.15]">
            O problema não é a IA.
            <br />
            <span className="text-primary">É que quem te ensina nunca geriu uma empresa.</span>
          </p>
        </div>

        {/* Authority Block */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 items-center p-8 md:p-10 rounded-2xl glass-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/6 via-transparent to-primary/4 pointer-events-none" />
          
          <div className="w-36 h-36 md:w-40 md:h-40 rounded-2xl overflow-hidden border border-accent/20 flex-shrink-0 relative mx-auto md:mx-0">
            <img src={rodrigoImg} alt="Rodrigo Nascimento" className="w-full h-full object-cover" />
            <span className="absolute -bottom-2 -right-2 px-3 py-1 bg-primary rounded-md font-bold text-[11px] tracking-[1.5px] uppercase text-primary-foreground">
              Fundador
            </span>
          </div>

          <div className="relative z-10 text-center md:text-left">
            <div className="font-bold text-xl md:text-2xl mb-1">Rodrigo Nascimento</div>
            <div className="text-sm text-accent font-semibold mb-4">
              Empresário há 20+ anos · Fundador da dn.ia · Autor do livro "IA Fique-se ou Morra"
            </div>
            <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-5">
              Eu sei o que é começar o mês devendo. Sei o que é ter o WhatsApp
              explodindo com problema de funcionário às 7 da manhã. Sei o que é{" "}
              <strong className="text-foreground">
                negociar com fornecedor, atrasar salário, e mesmo assim ter que
                vender no dia seguinte.
              </strong>
              <br /><br />
              Hoje, com IA, eu e minha equipe de 5 pessoas fazemos o que antes
              exigia 30 — e com{" "}
              <strong className="text-foreground">o triplo do faturamento.</strong>{" "}
              Não porque eu sou gênio em tecnologia. Porque eu sei onde dói numa
              empresa e sei onde a IA resolve de verdade.
            </p>
            <div className="flex flex-wrap gap-8 justify-center md:justify-start">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col">
                  <span className="font-bold text-2xl md:text-3xl leading-none">{s.value}</span>
                  <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quote Block */}
        <div className="mt-12 p-6 md:p-8 border-l-[3px] border-primary bg-primary/3 rounded-r-xl">
          <div className="font-semibold text-lg md:text-xl lg:text-2xl leading-snug">
            "O rapaz que ficou estudando IA mas{" "}
            <span className="text-primary">nunca pagou um boleto</span> não vai
            saber te ajudar. Ele não sabe o que é ter funcionário, pagar imposto,
            não ter lucro e ter que pagar a folha mesmo assim.{" "}
            <span className="text-primary">Esse cara não entende o seu problema.</span>"
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            — Rodrigo Nascimento, na imersão dn.ia
          </div>
        </div>

        {/* CTA */}
        {onOpenModal && (
          <div className="mt-10 text-center">
            <div className="flex flex-col items-center gap-1 mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-sm md:text-base text-muted-foreground">DE</span>
                <span className="text-destructive line-through font-semibold text-lg md:text-xl">R$ 197</span>
                <span className="text-sm md:text-base text-muted-foreground">POR</span>
                <span className="text-success font-bold text-3xl md:text-4xl">R$ 47</span>
              </div>
              <p className="text-xs text-muted-foreground">Sem replay · Vagas limitadas</p>
            </div>
            <Button
              onClick={onOpenModal}
              size="lg"
              className="bg-gradient-to-r from-success to-success/70 hover:from-success/90 hover:to-success/60 text-white font-bold text-base md:text-lg px-12 py-7 h-auto rounded-full shadow-[0_8px_30px_hsl(var(--success)/0.4)] tracking-wider"
            >
              GARANTIR INGRESSO | LOTE 1
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
