// Import tool logos
import manus from "@/assets/tools/manus.png";
import tldv from "@/assets/tools/tldv.png";
import nanoBanana from "@/assets/tools/nano-banana.png";
import veo3 from "@/assets/tools/veo3.png";
import claude from "@/assets/tools/claude.png";
import gemini from "@/assets/tools/gemini.jpeg";
import chatgpt from "@/assets/tools/chatgpt.png";
import lovable from "@/assets/tools/lovable.png";

interface Tool {
  name: string;
  logo: string;
}

const tools: Tool[] = [
  { name: "ChatGPT", logo: chatgpt },
  { name: "Claude", logo: claude },
  { name: "Gemini", logo: gemini },
  { name: "Lovable", logo: lovable },
  { name: "Manus", logo: manus },
  { name: "tl;dv", logo: tldv },
  { name: "Nano Banana", logo: nanoBanana },
  { name: "Veo 3", logo: veo3 },
];

export function OrbitCarousel() {
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
        {tools.map((tool, index) => (
          <div
            key={tool.name}
            className={`
              grid-box grid-box-${index + 1}
              absolute flex items-center justify-center
              border border-border/50 rounded-full
              transition-all duration-300
              hover:border-primary/50 hover:scale-105
              group overflow-hidden
              bg-background/90 backdrop-blur-sm
            `}
            style={{
              willChange: 'left, top',
            }}
          >
            <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 text-center p-2 sm:p-3">
              <img
                src={tool.logo}
                alt={tool.name}
                className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 object-contain transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <span className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-foreground/70 group-hover:text-primary transition-colors duration-300">
                {tool.name}
              </span>
            </div>

            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: '0 0 30px hsl(var(--primary) / 0.3)',
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
