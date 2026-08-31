import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Preciso saber programar ou ter conhecimento técnico?",
    answer: "NÃO. Zero código. Zero técnico. Se você usa WhatsApp e email, consegue usar essas ferramentas. Começamos do básico absoluto.",
  },
  {
    question: "Já fiz curso de IA e saí frustrado. Esse é diferente?",
    answer: "SIM. Completamente diferente. Outros cursos ensinam \"prompts mágicos\" e teoria. O Protocolo Dominando IA ensina QUAL ferramenta usar, COMO aplicar em cada setor, e você FAZ junto ao vivo. Não é palestra. É implementação prática.",
  },
  {
    question: "Me sinto perdido com tanta informação sobre IA. Vai me confundir mais?",
    answer: "NÃO. Esse é exatamente o problema que resolvemos. Você não vai aprender 100 ferramentas. Vai dominar as 10 CERTAS e saber quando usar cada uma. Método claro, passo a passo, sem sobrecarga.",
  },
  {
    question: "Acho que nunca vou conseguir dominar IA. É muito complexo para mim?",
    answer: "Esse protocolo foi feito para quem pensa assim. Não é para quem já domina. É para quem está perdido. Do básico ao avançado, em 48h, fazendo junto. Se não conseguir, devolvemos 100%.",
  },
  {
    question: "Vou ter acesso às gravações?",
    answer: "Por padrão, NÃO. A imersão é 100% ao vivo para você implementar junto. MAS: se você preferir ter acesso à gravação como backup, pode adquirir separadamente por R$ 197 no checkout. Por que não incluímos? Porque gravação vira \"vou ver depois\" e não gera implementação. Ao vivo, você FAZ e sai com resultado.",
  },
  {
    question: "Preciso pagar pelas ferramentas depois?",
    answer: "Algumas têm plano gratuito, outras custam $20-200/mês. MUITO menos que contratar pessoas, freelancers ou agências. E você fica com autonomia total — não depende de ninguém.",
  },
  {
    question: "Funciona para meu tipo de negócio/nicho?",
    answer: "Se você tem marketing, vendas, operação ou gestão: SIM. O protocolo funciona para 95% dos negócios. Você adapta as ferramentas para seu contexto específico.",
  },
  {
    question: "Vou ter suporte durante e depois da imersão?",
    answer: "SIM. Suporte ao vivo durante os 2 dias. MAIS: acesso vitalício ao Grupo VIP no WhatsApp para tirar dúvidas e fazer networking contínuo.",
  },
  {
    question: "E se eu não participar de alguma parte ou perder algo?",
    answer: "Você precisa estar presente nos 2 dias para ter resultado. Por isso é ao vivo, sem gravação incluída. Se você não pode participar nos 2 dias completos, considere adquirir o acesso à gravação (R$ 197 adicional).",
  },
  {
    question: "Como funciona a garantia? Posso realmente pedir reembolso?",
    answer: "SIM. 100% garantido. Participe dos 2 dias, aplique o protocolo. Se não sair com pelo menos 1 ferramenta funcionando, envie um email em até 7 dias e devolvemos tudo. Sem pergunta. Sem fricção.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative section-padding overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background-secondary" />

      {/* Content */}
      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground text-lg">
            As dúvidas mais comuns antes de garantir sua vaga.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-primary/5 transition-colors"
              >
                <span className="flex items-start gap-3 pr-4">
                  <span className="text-primary font-bold shrink-0">
                    {String(index + 1).padStart(2, '0')}.
                  </span>
                  <span className="font-semibold text-foreground">
                    {faq.question}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-primary shrink-0 transition-transform duration-300",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              
              <div
                className={cn(
                  "grid transition-all duration-300",
                  openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                    <div className="pl-8 border-l-2 border-primary/30">
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
