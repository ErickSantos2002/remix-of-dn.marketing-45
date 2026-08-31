import mentorImage from "@/assets/rodrigo-nascimento.jpg";
import logoBuscarId from "@/assets/logo-buscarid.png";

export function MentorSection() {
  return (
    <section id="mentor" className="section-padding bg-background relative overflow-hidden">
      {/* Glow effect */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.2) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />
      
      <div className="section-container relative z-10">
        {/* Headline */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Seu Mentor
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Quem vai te guiar nessa aplicação prática de IA
          </h2>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto items-center">
          {/* Photo */}
          <div className="flex justify-center order-1">
            <div className="relative">
              <div 
                className="absolute inset-0 opacity-50 blur-2xl"
                style={{
                  background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
                }}
              />
              <img
                src={mentorImage}
                alt="Rodrigo Nascimento"
                className="relative w-64 h-80 md:w-72 md:h-96 rounded-2xl object-cover object-top border-2 border-primary/30 shadow-2xl shadow-primary/20"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-5 order-2">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Rodrigo Nascimento é autor do livro <span className="text-foreground font-semibold">"IAfique-se ou Morra"</span>, fundador da Buscar ID e cofundador da DNIA.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed">
              Atua há anos aplicando inteligência artificial dentro de empresas reais, ajudando empresários a ganhar eficiência, reduzir custos e tomar decisões melhores com IA — sem depender de times técnicos ou projetos complexos.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed">
              Já liderou iniciativas e capacitou mais de 1.500 profissionais, com experiências práticas em empresas como Localiza, Santander, iFood e Hotmart, consolidando-se como uma das principais referências no Brasil em aplicação prática de IA para negócios.
            </p>

            {/* Signature */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-foreground font-bold text-lg">Rodrigo Nascimento</p>
              <p className="text-muted-foreground text-sm">
                Autor de IAfique-se ou Morra • Cofundador da DNIA
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
