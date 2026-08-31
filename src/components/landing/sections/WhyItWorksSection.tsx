import { Lightbulb } from "lucide-react";
import whyItWorksImage from "@/assets/imersao-2.jpg";

export function WhyItWorksSection() {
  return (
    <section className="section-padding bg-background">
      <div className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-6 flex items-center justify-center lg:justify-start gap-2">
              <Lightbulb className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              POR QUE FUNCIONA
            </h2>

            <p className="text-lg md:text-xl text-text-secondary leading-relaxed">
              O Protocolo IA é{" "}
              <span className="text-primary font-semibold">metodologia prática</span>, não teoria de
              "como usar o ChatGPT". Ele substitui dependência humana por execução automatizada —
              transformando qualquer ideia em ferramenta real, rápido e com alto impacto.
            </p>
          </div>

          {/* Image */}
          <div className="rounded-xl overflow-hidden shadow-lg">
            <img 
              src={whyItWorksImage} 
              alt="Rodrigo Nascimento apresentando o Protocolo IA" 
              className="w-full h-64 md:h-80 object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
