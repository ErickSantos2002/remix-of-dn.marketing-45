import { X, Check, Zap, Target, Sparkles } from "lucide-react";
import comparisonImage from "@/assets/imersao-3.jpg";

const problems = [
  "Dependência de programadores, designers e agências",
  "Entregas lentas, custo alto e frustração",
  "Fila de execução interminável",
];

const solutions = [
  "Ideia → comando → resultado em minutos",
  "Velocidade de lançamento que supera concorrentes",
  "Operação enxuta, sem inchar equipe",
  "Controle total da execução e qualidade",
];

export function ComparisonSection() {
  return (
    <section className="section-padding bg-background">
      <div className="section-container">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            ANTES E DEPOIS DO PROTOCOLO IA
          </h2>
          <p className="text-text-secondary text-lg">
            Veja a transformação na sua operação
          </p>
        </div>

        {/* Event Image */}
        <div className="mb-10 rounded-xl overflow-hidden">
          <img 
            src={comparisonImage} 
            alt="Participantes do evento Imersão Execução Total" 
            className="w-full h-48 md:h-64 object-cover"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Problem Side */}
          <div className="bg-card border border-border rounded-xl p-6 md:p-8">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              SUA REALIDADE HOJE
            </h3>
            <ul className="space-y-4">
              {problems.map((problem, index) => (
                <li key={index} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-text-secondary">{problem}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution Side */}
          <div className="bg-card border border-primary/30 rounded-xl p-6 md:p-8">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              SUA REALIDADE COM PROTOCOLO IA
            </h3>
            <ul className="space-y-4">
              {solutions.map((solution, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-text-secondary">{solution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
