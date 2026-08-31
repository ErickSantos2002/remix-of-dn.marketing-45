import { Coffee, UtensilsCrossed, Rocket, Users, Brain, TrendingUp, ShoppingCart, FolderKanban, Bot, Flag } from "lucide-react";

export type ScheduleItem = {
  time: string;
  title: string;
  icon: typeof Coffee;
  break?: boolean;
};

const defaultSchedule: ScheduleItem[] = [
  { time: "08h20", title: "Coffee de boas-vindas", icon: Coffee, break: true },
  { time: "09h15", title: "Introdução (IA x Humanos no mercado de trabalho)", icon: Users },
  { time: "10h15", title: "A evolução da IA: de onde viemos até os Super Agentes", icon: Brain },
  { time: "10h45", title: "Marketing: assertividade, landing page, tráfego, design e vídeo", icon: TrendingUp },
  { time: "11h30", title: "Vendas: atendimento 24h, CRM e follow-up", icon: ShoppingCart },
  { time: "12h00", title: "Gestão de projetos: quem garante que as coisas acontecem?", icon: FolderKanban },
  { time: "12h30", title: "Almoço", icon: UtensilsCrossed, break: true },
  { time: "13h30", title: "Mission Control + Super Agentes na prática — Como deixamos agentes de IA gerir a dn.ia", icon: Bot },
  { time: "16h30", title: "Encerramento + próximos passos", icon: Flag },
];

export function AgendaSectionVip({ schedule = defaultSchedule }: { schedule?: ScheduleItem[] }) {
  return (
    <section className="py-16 lg:py-24 bg-background relative overflow-hidden">
      {/* Subtle glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.4), transparent 70%)" }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            Cronograma do{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              dia
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Um dia inteiro de imersão prática — da teoria à implementação real com IA.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {schedule.map((item, i) => {
            const isLast = i === schedule.length - 1;
            const Icon = item.icon;

            return (
              <div key={i} className="flex gap-4 group">
                {/* Timeline column */}
                <div className="flex flex-col items-center shrink-0 w-14">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      item.break
                        ? "bg-accent/15 border-accent/30"
                        : "bg-card/80 border-border/40"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.break ? "text-accent" : "text-foreground/70"}`} />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[24px] bg-gradient-to-b from-accent/40 to-border/30" />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                  <span className="text-xs font-bold text-accent tracking-wide">{item.time}</span>
                  <p
                    className={`text-sm leading-relaxed mt-0.5 ${
                      item.break ? "text-muted-foreground italic" : "text-foreground/90 font-medium"
                    }`}
                  >
                    {item.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
