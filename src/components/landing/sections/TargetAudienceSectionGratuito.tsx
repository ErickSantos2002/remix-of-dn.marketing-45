import { CheckCircle, XCircle } from "lucide-react";

const audienceItems = [
  {
    title: "Empresários que já validaram o modelo de negócio",
    description: "E agora precisam ganhar eficiência e margem para continuar crescendo.",
  },
  {
    title: "Empresários, empreendedores, C-levels e diretores",
    description: "Que precisam tomar decisões sobre IA dentro da empresa.",
  },
  {
    title: "Quem quer aumentar margem de forma prática",
    description: "Chega de teoria. Hora de ver resultados reais.",
  },
];

export function TargetAudienceSectionGratuito() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Para <span className="text-gradient">quem é</span> esta aula?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Se você se identifica com algum desses perfis, esta aula foi feita para você
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
          {audienceItems.map((item, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 text-center"
            >
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl" />
              
              <div className="relative">
                <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                  <CheckCircle className="w-7 h-7 text-primary" />
                </div>
                
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Exclusion card */}
        <div className="max-w-2xl mx-auto">
          <div className="p-5 rounded-xl border border-destructive/30 bg-destructive/5 flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Não é para curiosos, estudantes ou quem busca apenas conhecer ferramentas de IA sem aplicação prática.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
