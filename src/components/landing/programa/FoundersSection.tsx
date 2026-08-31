import rodrigoImg from "@/assets/rodrigo-nascimento-sm.jpg";

export function FoundersSection() {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Fundada por empresários.{" "}
            <span className="text-gradient-dnia">Para empresários.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
          {/* Rodrigo */}
          <div className="glass-card p-6 md:p-8 text-center">
            <img
              src={rodrigoImg}
              alt="Rodrigo Nascimento"
              loading="lazy"
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-primary/30"
            />
            <h3 className="text-lg font-bold mb-1">Rodrigo Nascimento</h3>
            <p className="text-xs text-primary mb-3">Cofundador da dn.ia</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Empresário, especialista em IA aplicada a negócios e criador do Método C3Z. Atua diretamente com PMEs para transformar operações com inteligência artificial de forma prática e mensurável.
            </p>
            <p className="text-sm italic text-foreground/70 border-t border-border/30 pt-4">
              "Eu não sou consultor. Sou empresário. É por isso que resolvo a dor do empresário."
            </p>
          </div>

          {/* Carlos - placeholder */}
          <div className="glass-card p-6 md:p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 border-2 border-accent/30">
              <span className="text-2xl font-bold text-accent">C</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Carlos</h3>
            <p className="text-xs text-accent mb-3">Cofundador da dn.ia</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bio em construção. Trajetória complementar ao Rodrigo com expertise em tecnologia e gestão de ecossistemas.
            </p>
          </div>
        </div>

        {/* Frase de fechamento */}
        <p className="text-center text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          A <strong className="text-foreground">dn.ia</strong> não nasceu de uma tese acadêmica. Nasceu de dois empresários que sabiam que IA ia mudar tudo — e que a maioria das PMEs ia ficar para trás sem método, sem plano e sem acompanhamento. O ecossistema existe para resolver isso.
        </p>
      </div>
    </section>
  );
}
