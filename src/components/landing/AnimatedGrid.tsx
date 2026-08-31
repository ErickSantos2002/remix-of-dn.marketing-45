import { MessageSquare, Brain, Heart, Sparkles } from "lucide-react";
import imersaoHero from "@/assets/imersao-hero.jpg";
import imersao2 from "@/assets/imersao-2.jpg";
import imersao3 from "@/assets/imersao-3.jpg";
import imersao4 from "@/assets/imersao-4.jpg";
import rodrigoNascimento from "@/assets/rodrigo-nascimento.jpg";

interface GridItem {
  type: 'text' | 'image' | 'tool';
  content: string;
  image?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// Tools that will be featured in the grid
const gridItems: GridItem[] = [
  { type: 'tool', content: 'ChatGPT', icon: MessageSquare },
  { type: 'image', content: '', image: imersaoHero },
  { type: 'tool', content: 'Claude', icon: Brain },
  { type: 'tool', content: 'Lovable', icon: Heart },
  { type: 'image', content: '', image: rodrigoNascimento },
  { type: 'image', content: '', image: imersao2 },
  { type: 'tool', content: 'Gemini', icon: Sparkles },
  { type: 'image', content: '', image: imersao3 },
];

export function AnimatedGrid() {
  return (
    <div className="relative w-full max-w-[350px] sm:max-w-[400px] lg:max-w-[500px] xl:max-w-[588px] aspect-square mx-auto">
      {/* Glow effect behind grid */}
      <div className="absolute inset-0 -z-10">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Grid container - using absolute positioning for animations */}
      <div className="main-grid relative h-full w-full">
        {gridItems.map((item, index) => (
          <div
            key={index}
            className={`
              grid-box grid-box-${index + 1}
              absolute flex items-center justify-center
              border border-border/50 rounded-full
              transition-all duration-300
              hover:border-primary/50 hover:scale-105
              group overflow-hidden
              ${item.type === 'tool' ? 'bg-background/80 backdrop-blur-sm' : 'bg-background/50'}
            `}
          >
            {item.type === 'image' ? (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <img
                  src={item.image}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-background/20 group-hover:bg-transparent transition-colors duration-300" />
              </div>
            ) : item.type === 'tool' ? (
              <div className="flex flex-col items-center justify-center gap-1 text-center px-2">
                {item.icon && <item.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-primary" />}
                <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors duration-300">
                  {item.content}
                </span>
              </div>
            ) : (
              <span className="text-xs sm:text-sm lg:text-base font-medium text-foreground/80 group-hover:text-primary transition-colors duration-300 text-center px-2 relative z-10">
                {item.content}
              </span>
            )}

            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: '0 0 40px hsl(var(--primary) / 0.4)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Decorative rotating circle */}
      <div className="absolute -bottom-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 opacity-40">
        <svg 
          className="w-full h-full animate-spin-slow" 
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="8 4"
          />
        </svg>
      </div>

      {/* Additional decorative element */}
      <div className="absolute -top-2 -left-2 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 opacity-30">
        <svg 
          className="w-full h-full animate-spin-slow" 
          style={{ animationDirection: 'reverse', animationDuration: '25s' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        </svg>
      </div>
    </div>
  );
}
