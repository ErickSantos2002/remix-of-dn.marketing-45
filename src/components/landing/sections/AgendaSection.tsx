import { Clock, Video } from "lucide-react";

export function AgendaSection() {
  return (
    <section id="agenda" className="relative section-padding overflow-hidden">
      {/* Diagonal gradient background with accent line */}
      <div className="absolute inset-0 bg-background-secondary" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
      
      {/* Top and bottom accent lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} 
      />
      
      {/* Content */}
      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            O Cronograma de Implementação de <span className="text-primary">24 e 25/01</span>
          </h2>
          <p className="text-text-secondary text-lg">
            2 dias intensivos para instalar a estrutura que triplicou meu faturamento. Sem hype, apenas execução
          </p>
        </div>

        {/* Timeline / Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {/* Day 1 */}
          <div className="glass-card p-6 md:p-8 card-glow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">DIA 24: SÁBADO</h3>
                <p className="text-sm text-text-muted">24/JAN • CÉREBRO E A ESTRATÉGIA</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Manhã */}
              <div>
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Manhã</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Marketing e Vendas com IA</h4>
                <p className="text-xs text-primary font-medium mb-3">O Fim da Dependência de 100% de pessoas</p>
                
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li><span className="text-foreground font-medium">Seu Novo Diretor de Marketing:</span> Como configurar a IA para tomar decisões de branding e criar copies de alta conversão.</li>
                  <li><span className="text-foreground font-medium">O Quebrador de Objeções:</span> A implementação do processo que cria propostas irrecusáveis e negocia com clientes usando a lógica dos meus melhores vendedores.</li>
                </ul>
              </div>

              <div className="h-px bg-border" />

              {/* Tarde */}
              <div>
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Tarde</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Sistemas Próprios e Inteligência de Dados</h4>
                <p className="text-xs text-primary font-medium mb-3">O Poder de Criar Suas Próprias Ferramentas</p>
                
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li><span className="text-foreground font-medium">Dashboards com IA:</span> Vamos criar painéis de gestão que analisam a saúde do seu negócio em tempo real.</li>
                  <li><span className="text-foreground font-medium">A "Fábrica de Soluções de IA":</span> O estudo de caso real de como criei 4 plataformas robustas em 3 meses usando IA (e como você pode criar as suas ferramentas sem saber programar).</li>
                  <li><span className="text-foreground font-medium">Perfil de Cliente (Maturidade):</span> O uso estratégico de IA para mapear e converter o perfil exato do seu consumidor.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Day 2 */}
          <div className="glass-card p-6 md:p-8 card-glow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">DIA 25: DOMINGO</h3>
                <p className="text-sm text-text-muted">25/JAN • A ESCALA E A OPERAÇÃO</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Manhã */}
              <div>
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Manhã</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Produção Visual e Mídia em Massa</h4>
                <p className="text-xs text-primary font-medium mb-3">Apareça Mais, Trabalhe Menos</p>
                
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li><span className="text-foreground font-medium">Estúdio Criativo com IA:</span> Dominando Gemini e Higgsfield para criar imagens e vídeos profissionais em segundos.</li>
                  <li><span className="text-foreground font-medium">Assistentes de Criação:</span> A entrega dos assistentes que geram conteúdo infinito para suas redes sociais, eliminando o bloqueio criativo.</li>
                </ul>
              </div>

              <div className="h-px bg-border" />

              {/* Tarde */}
              <div>
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Tarde</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">A Orquestração da Equipe Enxuta (9 para 5)</h4>
                <p className="text-xs text-primary font-medium mb-3">O Segredo da Lucratividade e Liberdade</p>
                
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li><span className="text-foreground font-medium">Agentes de Navegação:</span> Como colocar IAs para navegar na web e executar tarefas operacionais repetitivas por você (o fim do trabalho braçal).</li>
                  <li><span className="text-foreground font-medium">Diretores Digitais no Manus:</span> A configuração final dos "especialistas" que vão liderar áreas da sua empresa.</li>
                  <li><span className="text-foreground font-medium">Newsletter e Engajamento:</span> O sistema automático que mantém seu público aquecido semanalmente.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Recording Info Note */}
        <div className="flex justify-center mt-8">
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary/10 border border-primary/20">
            <Video className="w-4 h-4 text-primary" />
            <span className="text-sm text-text-secondary">
              <span className="text-foreground font-medium">Aula 100% ao vivo.</span> Sem acesso a gravação
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
