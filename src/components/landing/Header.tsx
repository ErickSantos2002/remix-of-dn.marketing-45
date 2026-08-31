import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/dnia-logo-branco.png";

interface HeaderProps {
  onOpenModal: () => void;
}

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "O Diferencial", href: "#diferencial" },
  { label: "Resultados", href: "#resultados" },
  { label: "O que você vai aprender", href: "#aprendizado" },
  { label: "Inscrição", href: "#inscricao" },
];

export function Header({ onOpenModal }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background sm:bg-background/90 sm:backdrop-blur-md border-b border-border/30">
      <div className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#inicio" className="flex-shrink-0">
            <img src={logo} alt="Buscar ID" className="h-8 md:h-10 w-auto" />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:block">
            <Button onClick={onOpenModal} className="bg-success hover:bg-success/90 text-white font-semibold">
              Quero Participar
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-border/30 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-text-secondary hover:text-primary transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Button onClick={() => { onOpenModal(); setIsMenuOpen(false); }} className="bg-success hover:bg-success/90 text-white font-semibold mt-2">
                Quero Participar
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
