import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";
import { useClarity } from "@/hooks/useClarity";

// Pagina de confirmacao de descadastro de emails, servida pelo app (nao mais
// pela Edge Function `email-unsubscribe`) -- o Supabase reescreve respostas
// GET text/html das Edge Functions para text/plain e injeta um
// Content-Security-Policy "default-src 'none'; sandbox", o que quebra
// qualquer pagina (e bloquearia o <form> mesmo se renderizasse). A logica de
// seguranca (token HMAC, supressao, evento na timeline, one-click RFC 8058)
// continua inteira na Edge Function -- esta pagina so chama:
//   GET  /functions/v1/email-unsubscribe -> valida o token e devolve o email (nunca descadastra)
//   POST /functions/v1/email-unsubscribe -> confirma o descadastro de fato
//
// Regra de ouro do RFC 8058: o link do corpo do email (o que esta pagina
// representa) NUNCA pode ter efeito colateral so por ser aberto/carregado --
// por isso o GET aqui so busca dados para exibir; a supressao so acontece
// quando o usuario clica em "Confirmar descadastro" (POST).

type ViewState = "loading" | "confirm" | "success" | "invalid" | "error";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-unsubscribe`;

const Descadastrar = () => {
  useClarity("descadastrar");

  const [searchParams] = useSearchParams();
  const lid = searchParams.get("lid") ?? "";
  const e = searchParams.get("e") ?? "";
  const t = searchParams.get("t") ?? "";

  const [state, setState] = useState<ViewState>("loading");
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const query = new URLSearchParams({ lid, e, t }).toString();

  useEffect(() => {
    if (!lid || !e || !t) {
      setState("invalid");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${FUNCTION_URL}?${query}`, { method: "GET" });
        if (cancelled) return;

        if (res.status === 401 || res.status === 400) {
          setState("invalid");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }

        const data = await res.json().catch(() => null);
        if (!data?.ok || typeof data.email !== "string") {
          setState("error");
          return;
        }

        setEmail(data.email);
        setState("confirm");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lid, e, t]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${FUNCTION_URL}?${query}`, { method: "POST" });
      if (res.status === 401 || res.status === 400) {
        setState("invalid");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      setState("success");
    } catch {
      setState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Cancelar inscrição | dn.ia</title>
        <meta name="description" content="Gerencie o recebimento de emails da dn.ia." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="w-full max-w-md animate-fade-in">
        <div className="glass-card p-8 rounded-xl border border-border/50 text-center space-y-6">
          {state === "loading" && (
            <>
              <div className="flex justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <p className="text-muted-foreground">Verificando seu link...</p>
            </>
          )}

          {state === "confirm" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <MailX className="w-9 h-9 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Cancelar inscrição
                </h1>
                <p className="text-muted-foreground">
                  Deseja parar de receber nossos emails em{" "}
                  <strong className="text-foreground">{email}</strong>?
                </p>
              </div>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="w-full py-6 text-base font-semibold"
              >
                {isSubmitting ? "Processando..." : "Confirmar descadastro"}
              </Button>
            </>
          )}

          {state === "success" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Pronto!</h1>
                <p className="text-muted-foreground">
                  Você foi descadastrado e não receberá mais nossos emails.
                </p>
              </div>
            </>
          )}

          {state === "invalid" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Link inválido ou expirado
                </h1>
                <p className="text-muted-foreground">
                  Não foi possível confirmar este link de descadastro. Verifique se copiou o
                  endereço completo do email ou entre em contato conosco.
                </p>
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Algo deu errado
                </h1>
                <p className="text-muted-foreground">
                  Não conseguimos processar sua solicitação agora. Tente novamente em alguns
                  instantes.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Descadastrar;
