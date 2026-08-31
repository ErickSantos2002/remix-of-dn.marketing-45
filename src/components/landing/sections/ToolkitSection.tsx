"use client";

import { 
  BadgeDollarSign, 
  ChartPie, 
  Cpu, 
  Megaphone, 
  Check, 
  Lock, 
  Bot 
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

// Import tool logos
import chatgptLogo from "@/assets/tools/chatgpt.png";
import claudeLogo from "@/assets/tools/claude.png";
import geminiLogo from "@/assets/tools/gemini.png";
import lovableLogo from "@/assets/tools/lovable.svg";
import manusLogo from "@/assets/tools/manus.png";

// Lista de Benefícios com Ícone Check
const BenefitList = ({ items }: { items: string[] }) => (
  <ul className="space-y-2">
    {items.map((item, index) => (
      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
        <span className="mt-0.5 flex-shrink-0">
          <Check className="h-4 w-4 text-primary" />
        </span>
        {item}
      </li>
    ))}
  </ul>
);

// Logo component with grayscale effect and brand color on hover
interface ToolLogoProps {
  src: string;
  name: string;
  hoverColor: string; // Brand color for hover effect
}

const ToolLogo = ({ src, name, hoverColor }: ToolLogoProps) => (
  <div 
    className="group relative flex h-20 w-36 md:h-24 md:w-44 items-center justify-center rounded-2xl border border-border/30 bg-background-secondary transition-all duration-300 hover:border-[var(--hover-color)]/50"
    style={{ '--hover-color': hoverColor } as React.CSSProperties}
  >
    {/* Glow effect on hover */}
    <div 
      className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{ 
        background: `radial-gradient(ellipse at center, ${hoverColor}15 0%, transparent 70%)`,
      }}
    />
    <img 
      src={src} 
      alt={name}
      loading="lazy"
      decoding="async"
      className="relative h-10 md:h-12 w-auto object-contain grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100" 
    />
  </div>
);

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
  return (
    <div className={cn("min-h-[14rem] list-none", area)}>
      <div className="relative h-full rounded-2xl border border-border/50 p-2 md:rounded-3xl md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border border-border/50 bg-background p-6 md:p-6">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border border-border/50 bg-muted/50 p-2">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="pt-0.5 text-xl font-semibold text-foreground md:text-2xl">
                {title}
              </h3>
              <div className="text-sm text-muted-foreground md:text-base">
                {description}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function ToolkitSection() {
  return (
    <section id="toolkit" className="relative section-padding overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />

      {/* Content */}
      <div className="section-container relative z-10">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            A anatomia do <span className="text-gradient">Protocolo Dominando IA</span>:
          </h2>
          <p className="text-lg md:text-xl text-foreground font-medium mb-4 max-w-3xl mx-auto">
            O método claro para escolher as ferramentas certas para cada setor da sua empresa.
          </p>
        </div>

        {/* SESSÃO DOS CARDS (GRID) */}
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-2 max-w-5xl mx-auto">
          {/* CARD 1: MARKETING */}
          <GridItem
            area="md:[grid-area:1/1/2/7]"
            icon={<Megaphone className="h-6 w-6 text-primary" />}
            title="Marketing: O Criativo Automático"
            description={
              <BenefitList
                items={[
                  "Anúncios Geradores de Cliques",
                  "Geração de Vídeos Virais com 1 Clique",
                  "Criação de Sites e Funnels de Alta Conversão"
                ]}
              />
            }
          />

          {/* CARD 2: VENDAS */}
          <GridItem
            area="md:[grid-area:1/7/2/13]"
            icon={<BadgeDollarSign className="h-6 w-6 text-primary" />}
            title="Vendas: A Máquina de Dinheiro"
            description={
              <BenefitList
                items={[
                  "Prospecção 100% Automatizada",
                  "Quebra de Objeções com IA",
                  "CRM Inteligente com Agentes"
                ]}
              />
            }
          />

          {/* CARD 3: OPERAÇÕES & GESTÃO */}
          <GridItem
            area="md:[grid-area:2/1/3/7]"
            icon={<ChartPie className="h-6 w-6 text-primary" />}
            title="Operações: O Cérebro da Empresa"
            description={
              <BenefitList
                items={[
                  "Dashboards Preditivos Automáticos",
                  "Gestão de Tarefas com Agentes de IA",
                  "Análise de Dados em Segundos"
                ]}
              />
            }
          />

          {/* CARD 4: TI & TECNOLOGIA */}
          <GridItem
            area="md:[grid-area:2/7/3/13]"
            icon={<Cpu className="h-6 w-6 text-primary" />}
            title="Tech: A fábrica de soluções de IA"
            description={
              <BenefitList
                items={[
                  "Crie Apps sem Código",
                  "Automatize Fluxos de Trabalho",
                  "Construa suas Próprias Ferramentas de IA"
                ]}
              />
            }
          />
        </ul>

        {/* SESSÃO DAS LOGOS & MISTÉRIO */}
        <div className="mt-16 md:mt-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-success/30 bg-success/5 mb-8">
            <Bot className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">Arsenal de IAs</span>
          </div>
          
          {/* Grid 3x2 like the reference image */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
            <ToolLogo src={chatgptLogo} name="ChatGPT" hoverColor="#10a37f" />
            <ToolLogo src={claudeLogo} name="Claude" hoverColor="#d97757" />
            <ToolLogo src={geminiLogo} name="Gemini" hoverColor="#4285f4" />
            <ToolLogo src={manusLogo} name="Manus" hoverColor="#7c3aed" />
            <ToolLogo src={lovableLogo} name="Lovable" hoverColor="#ff6b6b" />
            
            {/* O MISTÉRIO - styled like other cards */}
            <div className="group relative flex h-20 w-full md:h-24 items-center justify-center rounded-2xl border border-primary/30 bg-background-secondary transition-all duration-300 hover:border-primary/50">
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ 
                  background: `radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)`,
                }}
              />
              <div className="relative flex items-center gap-2 text-muted-foreground transition-colors duration-300 group-hover:text-primary">
                <Lock className="h-5 w-5" />
                <span className="text-sm font-semibold">+ 5 SECRETAS</span>
              </div>
            </div>
          </div>
          
          <p className="mt-10 text-sm text-muted-foreground italic">
            Revelação exclusiva e completa apenas nos dias 24 e 25 de Janeiro.
          </p>
        </div>
      </div>
    </section>
  );
}
