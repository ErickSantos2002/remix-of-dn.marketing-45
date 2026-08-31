export function ProblemSection() {
  return (
    <section className="relative py-16 md:py-24 bg-[#FAFAF8]">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="section-container relative z-10">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Headline */}
           <h2 className="font-outfit text-3xl sm:text-4xl md:text-[2.75rem] leading-tight text-[#0F1B3D] text-center font-bold">
             Eu sei. Você é bombardeado diariamente por conteúdo de IA e, quanto mais consome, mais{" "}
             <span className="text-gradient">travado</span> fica.
           </h2>

          {/* Sub-headline */}
          <p className="text-xl md:text-2xl text-[#0F1B3D]/60 text-center leading-relaxed">
            Parece que não falam o seu idioma. Mas você não precisa conhecer todas as IAs. Precisa{" "}
            <span className="text-gradient font-semibold">dominar as certas</span>, aplicadas do jeito certo, para mudar o seu negócio.
          </p>

          {/* Separador dourado */}
          <div className="w-24 h-px bg-primary mx-auto" />

          {/* Conteúdo narrativo */}
          <div className="space-y-8 text-lg leading-relaxed text-[#0F1B3D]/60">
            {/* Bloco 1 */}
            <p>
              São centenas de ferramentas, mudanças constantes e promessas vazias sobre o que a IA pode fazer —{" "}
              <span className="text-[#0F1B3D]">
                mas pouca orientação prática sobre o que realmente funciona quando você chega na empresa na segunda-feira.
              </span>
            </p>

            {/* Bloco 2 - Blockquote */}
            <div className="border-l-4 border-primary bg-primary/10 rounded-r-lg py-5 px-6">
              <p className="text-[#0F1B3D] font-medium text-lg md:text-xl italic">
                "Eu vivo isso com empresários todos os dias.{" "}
                <span className="text-gradient font-bold not-italic">O problema nunca foi falta de informação. É excesso, sem direção.</span>"
              </p>
            </div>

            {/* Bloco 3 */}
            <p>
              Por isso criei este evento. Em duas noites ao vivo, vou te mostrar{" "}
              <span className="text-[#0F1B3D] font-medium">exatamente o que usar</span>, por onde começar e como a IA já está{" "}
              <span className="text-[#0F1B3D] font-medium">aumentando margens</span> em empresas como a sua — com demonstrações reais, feitas ao vivo.
            </p>

            {/* Bloco 4 */}
            <p className="text-3xl md:text-4xl font-bold text-[#0F1B3D] text-center pt-4">
              Sem teoria.
              <br />
              Sem lista infinita de ferramentas.
              <br />
              <span className="text-gradient">Só o que funciona.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  );
}
