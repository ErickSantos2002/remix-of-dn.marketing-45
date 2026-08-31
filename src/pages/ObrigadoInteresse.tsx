import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ObrigadoInteresse() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 border-b border-border/30">
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar ao início</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Obrigado pelo seu interesse!
          </h1>

          <p className="text-lg text-muted-foreground mb-6">
            Recebemos suas informações e em breve nossa equipe entrará em contato 
            para apresentar mais detalhes sobre o ecossistema{" "}
            <span className="text-primary font-semibold">&lt;dn.ia&gt;</span>.
          </p>

          <div className="p-4 bg-muted/30 rounded-lg border border-border mb-8">
            <p className="text-sm text-muted-foreground">
              Fique de olho no seu e-mail e WhatsApp! 
              Vamos enviar informações exclusivas sobre nossos programas de mentoria e formação.
            </p>
          </div>

          <Button asChild size="lg" className="font-semibold">
            <Link to="/">Voltar para o site</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} dn.ia - Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
