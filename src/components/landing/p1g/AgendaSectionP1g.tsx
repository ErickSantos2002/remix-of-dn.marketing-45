import { Clock } from "lucide-react";

export function AgendaSectionP1g() {
  return (
    <section className="py-16 md:py-24 bg-black">
      <div className="container mx-auto px-4 md:px-6">
        {/* Agenda Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
          
          {/* Day 1 - Saturday Card */}
          <div className="rounded-2xl bg-[#1a1a1a] border border-orange-900/30 p-6 md:p-8 space-y-6">
            {/* Day Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white">DIA 24: SÁBADO</h3>
                <p className="text-gray-500 text-sm uppercase tracking-wider">24/JAN · CÉREBRO E A ESTRATÉGIA</p>
              </div>
            </div>

            {/* Morning Session */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-orange-500">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Manhã</span>
              </div>
              
              <h4 className="text-lg font-bold text-white">Marketing e Vendas com IA</h4>
              <p className="text-orange-500 text-sm">O Fim da Dependência de 100% de pessoas</p>
              
              <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                <p>
                  <span className="text-white font-medium">Seu Novo Diretor de Marketing:</span> Como configurar a IA para tomar decisões de branding e criar copies de alta conversão.
                </p>
                <p>
                  <span className="text-white font-medium">O Quebrador de Objeções:</span> A implementação do processo que cria propostas irrecusáveis e negocia com clientes usando a lógica dos meus melhores vendedores.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800" />

            {/* Afternoon Session */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-orange-500">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Tarde</span>
              </div>
              
              <h4 className="text-lg font-bold text-white">Sistemas Próprios e Inteligência de Dados</h4>
              <p className="text-orange-500 text-sm">O Poder de Criar Suas Próprias Ferramentas</p>
              
              <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                <p>
                  <span className="text-white font-medium">Dashboards com IA:</span> Vamos criar painéis de gestão que analisam a saúde do seu negócio em tempo real.
                </p>
                <p>
                  <span className="text-white font-medium">A "Fábrica de Soluções de IA":</span> O estudo de caso real de como criei 4 plataformas robustas em 3 meses usando IA (e como você pode criar as suas ferramentas sem saber programar).
                </p>
                <p>
                  <span className="text-white font-medium">Perfil de Cliente (Maturidade):</span> O uso estratégico de IA para mapear e converter o perfil exato do seu consumidor.
                </p>
              </div>
            </div>
          </div>

          {/* Day 2 - Sunday Card */}
          <div className="rounded-2xl bg-[#1a1a1a] border border-orange-900/30 p-6 md:p-8 space-y-6">
            {/* Day Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white">DIA 25: DOMINGO</h3>
                <p className="text-gray-500 text-sm uppercase tracking-wider">25/JAN · A ESCALA E A OPERAÇÃO</p>
              </div>
            </div>

            {/* Morning Session */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-orange-500">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Manhã</span>
              </div>
              
              <h4 className="text-lg font-bold text-white">Produção Visual e Mídia em Massa</h4>
              <p className="text-orange-500 text-sm">Apareça Mais, Trabalhe Menos</p>
              
              <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                <p>
                  <span className="text-white font-medium">Estúdio Criativo com IA:</span> Dominando Gemini e Higgsfield para criar imagens e vídeos profissionais em segundos.
                </p>
                <p>
                  <span className="text-white font-medium">Assistentes de Criação:</span> A entrega dos assistentes que geram conteúdo infinito para suas redes sociais, eliminando o bloqueio criativo.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800" />

            {/* Afternoon Session */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-orange-500">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Tarde</span>
              </div>
              
              <h4 className="text-lg font-bold text-white">A Orquestração da Equipe Enxuta (9 para 5)</h4>
              <p className="text-orange-500 text-sm">O Segredo da Lucratividade e Liberdade</p>
              
              <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                <p>
                  <span className="text-white font-medium">Agentes de Navegação:</span> Como colocar IAs para navegar na web e executar tarefas operacionais repetitivas por você (o fim do trabalho braçal).
                </p>
                <p>
                  <span className="text-white font-medium">Diretores Digitais no Manus:</span> A configuração final dos "especialistas" que vão liderar áreas da sua empresa.
                </p>
                <p>
                  <span className="text-white font-medium">Newsletter e Engajamento:</span> O sistema automático que mantém seu público aquecido semanalmente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
