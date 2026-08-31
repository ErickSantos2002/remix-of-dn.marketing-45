interface ProblemSectionProps {
  onOpenModal: () => void;
}

export function ProblemSection({ onOpenModal }: ProblemSectionProps) {
  return (
    <section className="section-padding border-t border-border/30 section-bg-blue-glow mesh-texture">
      <div className="section-container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Por que tantas empresas tentam usar IA…{" "}
            <span className="text-gradient-dnia">e não veem resultado?</span>
          </h2>

          <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-xl mx-auto">
            Dica: Não é falta de informação e sim a sobrecarga dela.
          </p>

          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-base md:text-lg text-foreground font-semibold mb-4">
              Você já tentou usar uma furadeira para colocar um prego na parede?
            </p>

            {/* Illustration placeholder */}
            <div className="glass-card p-8 md:p-10 mb-8 flex items-center justify-center">
              <div className="text-6xl md:text-8xl select-none">🔨 ≠ 🔩</div>
            </div>

            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
              De nada adianta a melhor ferramenta do mundo, se ela está sendo usada do jeito errado e no lugar errado.
            </p>

            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-4">
              Antes de sair testando ferramentas, é preciso entender o problema a ser solucionado.
            </p>

            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6">
              Provavelmente brincar de fazer imagem e texto bonitinho, não vai te trazer mais lucro…
            </p>

            <p className="text-foreground font-semibold text-base md:text-lg">
              A IA aplicada à estratégia é muito mais poderosa do que isso…
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
