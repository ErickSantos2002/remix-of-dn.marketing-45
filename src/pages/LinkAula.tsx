import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { registerConversion } from "@/lib/leadConversion";
import { captureLead } from "@/lib/leadCapture";
import dniaLogo from "@/assets/dnia-logo-branco.png";

const ZOOM_LINK = "https://us02web.zoom.us/j/84563631946";
const PRESENCA_LABEL = "Presente_Aula 07/02";

const LinkAula = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Por favor, insira seu email.");
      return;
    }

    setIsLoading(true);

    try {
      const { lead: existingLead } = await captureLead({
        email: trimmedEmail,
        mode: "update_only",
        fields: { presenca: PRESENCA_LABEL },
      });

      if (existingLead) {
        // Register conversion for attendance tracking
        await registerConversion({
          leadId: existingLead.id,
          tipo: "presenca_aula",
          pageSlug: "linkaula",
        });
      }

      // Redirect to Zoom regardless
      window.location.href = ZOOM_LINK;
    } catch (err) {
      console.error("Erro ao registrar presença:", err);
      // Still redirect even on error
      window.location.href = ZOOM_LINK;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={dniaLogo} alt="dn.ia" className="h-10 opacity-80" />
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h1 className="text-xl md:text-2xl font-bold text-white text-center mb-6 leading-tight">
            Preencha com seu email para entrar na{" "}
            <span className="text-red-500">Sala Secreta</span>:
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Seu melhor email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12 text-base"
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-xl transition-all"
            >
              {isLoading ? "Entrando..." : "Entrar na Sala"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LinkAula;
