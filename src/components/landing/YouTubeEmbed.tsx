import { useState } from "react";
import { Play } from "lucide-react";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

export function YouTubeEmbed({ videoId, title = "Video" }: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Show thumbnail facade until user clicks
  if (!isLoaded) {
    return (
      <button 
        onClick={() => setIsLoaded(true)}
        className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-card border border-border group cursor-pointer"
        aria-label={`Play ${title}`}
      >
        {/* YouTube thumbnail - lazy loaded */}
        <img 
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt={title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors duration-300 group-hover:bg-black/40">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
            <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-card border border-border">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
