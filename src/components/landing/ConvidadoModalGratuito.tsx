import { useState } from "react";
import { X, CheckCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { getUtmParams } from "@/lib/utm";
import { registerConversion } from "@/lib/leadConversion";
import { sendMetaConversion } from "@/lib/metaCapi";
import { captureLead } from "@/lib/leadCapture";

interface ConvidadoModalGratuitoProps {
  isOpen: boolean;
  onClose: () => void;
}

const generateSessionId = () => {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  const isMobile = numbers.length > 2 && numbers[2] === '9';
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (isMobile) {
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  }
};

export const ConvidadoModalGratuito = ({ isOpen, onClose }: ConvidadoModalGratuitoProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ nome?: string; email?: string; whatsapp?: string }>({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors: { nome?: string; email?: string; whatsapp?: string } = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email inválido";
    const whatsappNumbers = whatsapp.replace(/\D/g, "");
    if (whatsappNumbers.length < 10 || whatsappNumbers.length > 11) newErrors.whatsapp = "WhatsApp inválido (DDD + número)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    const newSessionId = generateSessionId();
    const whatsappNumbers = whatsapp.replace(/\D/g, "");
    const utmParams = getUtmParams();
    const normalizedEmail = email.toLowerCase().trim();
    const pageSlug = window.location.pathname || "/";

    let finalSessionId = newSessionId;

    try {
      const { lead, isNew } = await captureLead({
        email: normalizedEmail,
        sessionId: newSessionId,
        fields: {
          nome: nome.trim(),
          whatsapp: whatsappNumbers,
          tipo: 'Evento Gratuito 27Abr',
          tipo_participante: 'Convidado',
          source: pageSlug,
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_term: utmParams.utm_term,
          utm_content: utmParams.utm_content,
        },
      });

      if (lead) {
        finalSessionId = lead.session_id || newSessionId;
        import('@/lib/leadScoring').then(({ scoreAndUpdateLead }) => scoreAndUpdateLead(lead.id));

        await registerConversion({
          leadId: lead.id,
          tipo: "evento gratuito 27abr",
          pageSlug: "modal-evento-27abr",
          sessionId: finalSessionId,
        });

        sendMetaConversion({
          event_name: 'Lead',
          email: normalizedEmail,
          phone: whatsappNumbers,
          first_name: nome.trim(),
          custom_data: {
            lead_type: 'Evento Gratuito 27Abr',
            source: pageSlug
          }
        });

        if (isNew) {
          import('@/lib/resolveIdentity').then(({ resolveIdentityForLead }) => {
            resolveIdentityForLead({
              leadId: lead.id,
              whatsapp: whatsappNumbers,
              email: normalizedEmail,
              nome: nome.trim(),
              utm_source: utmParams.utm_source,
            });
          });
        }
      }
    } catch (err) {
      console.log("Erro ao processar lead:", err);
    }

    fetch("https://ia.iafik.com.br/webhook/conversao-modal-lp-dnia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nome.trim(),
        email: normalizedEmail,
        whatsapp: whatsappNumbers,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_term: utmParams.utm_term,
        utm_content: utmParams.utm_content,
      }),
    }).catch((err) => console.log("Erro webhook:", err));

    setIsLoading(false);
    setSuccess(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
              <CheckCircle className="w-7 h-7 text-primary" /> Inscrição confirmada!
            </h2>
            <p className="text-muted-foreground mb-6">
              Em breve você receberá os detalhes do evento no seu WhatsApp e e-mail.
            </p>
            <Button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                <Target className="w-6 h-6 text-primary" /> Confirme sua inscrição gratuita
              </h2>
              <p className="text-muted-foreground text-sm">
                Preencha seus dados para garantir sua participação
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-foreground">Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => { setNome(e.target.value); if (errors.nome) setErrors(prev => ({ ...prev, nome: undefined })); }}
                  className={`bg-background border-border ${errors.nome ? 'border-destructive' : ''}`}
                />
                {errors.nome && <p className="text-destructive text-xs">{errors.nome}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Seu e-mail corporativo <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }}
                  className={`bg-background border-border ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-foreground">WhatsApp <span className="text-destructive">*</span></Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => { setWhatsapp(formatPhone(e.target.value)); if (errors.whatsapp) setErrors(prev => ({ ...prev, whatsapp: undefined })); }}
                  maxLength={15}
                  className={`bg-background border-border ${errors.whatsapp ? 'border-destructive' : ''}`}
                />
                {errors.whatsapp && <p className="text-destructive text-xs">{errors.whatsapp}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
              >
                {isLoading ? "Processando..." : "Confirmar inscrição gratuita"}
              </Button>

              <button
                type="button"
                onClick={onClose}
                className="w-full text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Cancelar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
