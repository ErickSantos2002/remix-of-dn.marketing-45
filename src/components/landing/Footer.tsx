import logo from "@/assets/dnia-logo-branco.png";

export function Footer({ address }: { address?: string }) {
  return (
    <footer className="bg-background border-t border-border/30 py-10">
      <div className="section-container text-center">
        <img src={logo} alt="dn.ia" className="h-8 mx-auto mb-4 opacity-60" />
        <p className="text-sm text-muted-foreground mb-2">
          Implementamos Inteligência Artificial para tornar as empresas mais eficientes.
        </p>
        {address && (
          <p className="text-xs text-muted-foreground mb-3">
            {address}
          </p>
        )}
        <p className="text-xs text-muted-foreground mb-3">
          © 2026 dn.ia — Todos os direitos reservados
        </p>
        <p className="text-[10px] text-muted-foreground/60 max-w-md mx-auto">
          Este site não faz parte do Facebook ou Facebook Inc. Da mesma forma, não é endossado pelo Facebook de nenhuma maneira.
        </p>
      </div>
    </footer>
  );
}
