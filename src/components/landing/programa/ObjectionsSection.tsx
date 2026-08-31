import { Clock, RefreshCw, Building2 } from "lucide-react";

const objections = [
  {
    icon: Clock,
    title: '"Mas eu não tenho tempo para mais nada."',
    body: "O Programa foi desenhado para quem não tem tempo — porque esse é o perfil de 100% dos nossos membros. São 3 a 5 horas por semana. Não é mais um curso que você vai assistir quando sobrar tempo. É execução guiada.",
    case: 'Victor Barreto disse na entrada: "estou cansado de fazer curso. Quero alguém que pegue na mão." Em 90 dias: +28% de conversão.',
  },
  {
    icon: RefreshCw,
    title: '"Já tentei antes e não funcionou."',
    body: "Isso é pré-requisito, não impedimento. 100% dos nossos cases tinham tentado antes. Compraram curso, abriram ChatGPT, contrataram freelancer. Travaram. A diferença não foi tentativa — foi diagnóstico + plano personalizado + acompanhamento real de execução.",
    case: null,
  },
  {
    icon: Building2,
    title: '"Meu setor é diferente."',
    body: "A dn.ia já IAficou agências, clínicas odontológicas, comércio, prestadores de serviço B2B, profissionais liberais. O diagnóstico existe exatamente porque cada empresa é diferente.",
    case: 'Geraldo Maciel tinha uma operação de gestão de carteira com 400 clientes ativos. Saiu do Programa com um agente de IA próprio gerenciando todo o portfólio de forma autônoma.',
  },
];

export function ObjectionsSection() {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="section-container">
        <div className="max-w-3xl mx-auto space-y-8">
          {objections.map((obj) => (
            <div key={obj.title} className="glass-card card-glow p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <obj.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold mb-3">{obj.title}</h3>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-3">{obj.body}</p>
                  {obj.case && (
                    <p className="text-sm text-foreground/80 border-l-2 border-primary/40 pl-4 italic">
                      {obj.case}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
