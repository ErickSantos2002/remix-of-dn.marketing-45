import { Building2 } from "lucide-react";
import { LogoCarousel } from "../LogoCarousel";

import dep1 from "@/assets/depoimentos/depoimento-fabiof.png";
import dep2 from "@/assets/depoimentos/depoimento-denilson.png";
import dep3 from "@/assets/depoimentos/depoimento-juliane.png";
import dep4 from "@/assets/depoimentos/depoimento-denise.png";
import dep5 from "@/assets/depoimentos/depoimento-maria-eduarda.png";
import dep6 from "@/assets/depoimentos/depoimento-gabriela.png";
import dep7 from "@/assets/depoimentos/depoimento-ketlen.png";
import dep8 from "@/assets/depoimentos/depoimento-marcos.png";
import dep9 from "@/assets/depoimentos/depoimento-fabiano.png";
import dep10 from "@/assets/depoimentos/depoimento-daniane.png";

const testimonialImages = [dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9, dep10];

export function SocialProofSection() {
  const doubled = [...testimonialImages, ...testimonialImages];

  return (
    <section className="section-padding bg-background">
      <div className="section-container">
        {/* Testimonials Carousel */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
              O NOSSO MÉTODO FUNCIONA
            </h2>
            <p className="text-text-secondary mt-4 max-w-2xl mx-auto">
              Veja o que empresários como você têm a dizer sobre os resultados
            </p>
          </div>

          <div className="overflow-hidden">
            <div className="flex w-max animate-scroll-testimonials">
              {doubled.map((img, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[280px] md:w-[320px] mx-3"
                >
                  <img
                    src={img}
                    alt="Depoimento de aluno"
                    className="w-full rounded-xl border border-border shadow-sm"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CTA after testimonials */}
          <div className="mt-10 text-center">
            <a
              href="#inscricao"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-4 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary/25"
            >
              Quero Garantir Minha Vaga
            </a>
            <p className="text-text-secondary mt-3 text-sm">
              Vagas limitadas • Inscrições abertas
            </p>
          </div>
        </div>

        {/* Client Logos */}
        <div>
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-foreground flex items-center justify-center gap-3">
              <Building2 className="w-6 h-6 text-primary" /> CLIENTES QUE JÁ VALIDARAM RESULTADOS
            </h3>
            <p className="text-text-secondary mt-2">
              Empresas que confiam na metodologia e já foram treinadas pelo mentor Rodrigo Nascimento.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border">
            <LogoCarousel />
          </div>
        </div>
      </div>
    </section>
  );
}
