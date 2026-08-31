import { Mic, BarChart3, MapPin, Target } from "lucide-react";

const features = [
  { icon: Mic, title: "Hot seats ao vivo", description: "Membros apresentam desafios reais e recebem direcionamento do time e de outros empresários." },
  { icon: BarChart3, title: "Cases de implementação", description: "O que funcionou, o que não funcionou, com número e contexto. Benchmark real, não teoria." },
  { icon: MapPin, title: "Encontros presenciais", description: "Conexões que viram parcerias, indicações e negócios." },
  { icon: Target, title: "Desafios semanais", description: "Execução contínua. Ninguém para no meio do caminho." },
];

export function CommunitySection() {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Você não vai implementar IA sozinho.{" "}
            <span className="text-gradient-dnia">(E não deveria.)</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Não é grupo de WhatsApp. Não é fórum que ninguém abre. É um ambiente de troca real entre empresários PME com o mesmo desafio.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10">
          {features.map((f) => (
            <div key={f.title} className="glass-card card-glow p-6 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Citação Mateus Aleixo */}
        <div className="max-w-2xl mx-auto glass-card p-6 md:p-8 border-accent/20 text-center">
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed italic">
            "Quando Mateus Aleixo automatizou o atendimento de <span className="text-primary font-bold">60+ clientes</span>, não fez sozinho. Fez dentro de um ecossistema que testou, validou e acelerou cada etapa."
          </p>
        </div>
      </div>
    </section>
  );
}
