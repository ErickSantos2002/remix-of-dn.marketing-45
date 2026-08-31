import { Timer, Clock, Target } from "lucide-react";

const cards = [
  {
    icon: Timer,
    title: "R$47 é menos do que você gasta num almoço de negócios.",
    text: "Só que nesse almoço você não sai com uma metodologia pronta pra aplicar IA na sua empresa.",
  },
  {
    icon: Clock,
    title: "R$47 para economizar 6 meses de tentativa e erro.",
    text: "Você pode tentar sozinho — ou pode encurtar o caminho com quem já fez isso dezenas de vezes.",
  },
  {
    icon: Target,
    title: "O risco é zero. O custo de não estar lá pode ser alto.",
    text: "Enquanto você espera, seu concorrente já está usando IA pra fazer mais com menos.",
  },
];

export function ValueObjectionSection() {
  return (
    <section className="relative section-padding overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="section-container max-w-[1080px]">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent font-semibold text-xs tracking-[3px] uppercase mb-4">
            Uma pergunta justa
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1]">
            Por que esse evento custa só{" "}
            <span className="text-accent">R$47</span>?
          </h2>
        </div>

        {/* Quote block */}
        <blockquote className="relative border-l-2 border-accent pl-6 md:pl-8 py-2 max-w-[900px] mx-auto mb-12">
          <span className="absolute -top-4 -left-1 text-accent/20 text-6xl font-serif leading-none select-none">
            "
          </span>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed italic">
            "Eu poderia cobrar R$500 e ainda assim seria barato pelo que entrego.
            Mas o objetivo não é lucrar com o ingresso — é colocar o maior número
            possível de empresários dentro da sala pra provar que essa metodologia
            funciona. Quem entrar, vai querer ir mais fundo. E aí sim, a gente
            conversa sobre mentoria."
          </p>
          <footer className="mt-4 font-bold text-sm text-accent">
            — Rodrigo Nascimento
          </footer>
        </blockquote>

        {/* Argument cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <div
              key={i}
              className="p-7 rounded-xl glass-card transition-all duration-300 hover:border-white/12 hover:-translate-y-0.5 flex flex-col items-start gap-4"
            >
              <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <c.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="font-bold text-base md:text-lg leading-snug mb-2">
                  {c.title}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
