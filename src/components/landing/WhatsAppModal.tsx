import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getUtmParams } from "@/lib/utm";
import { registerConversion } from "@/lib/leadConversion";
import { captureLead } from "@/lib/leadCapture";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHECKOUT_URL = "https://pay.hotmart.com/J103622641K?checkoutMode=10";

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  
  const isMobile = numbers.length > 2 && numbers[2] === '9';
  
  if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }
  
  if (isMobile) {
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  }
};

export function WhatsAppModal({ isOpen, onClose }: WhatsAppModalProps) {
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; whatsapp?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; whatsapp?: string } = {};
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) newErrors.email = "Digite um e-mail válido";
    
    const numbers = whatsapp.replace(/\D/g, "");
    if (numbers.length < 10 || numbers.length > 11) newErrors.whatsapp = "Digite um número válido com DDD";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    const numbers = whatsapp.replace(/\D/g, "");
    const fullPhone = `+55${numbers}`;
    const normalizedEmail = email.trim().toLowerCase();
    
    try {
      const utmParams = getUtmParams();

      const { lead, isNew } = await captureLead({
        email: normalizedEmail,
        fields: {
          tipo: "modal_pago",
          whatsapp: numbers,
          source: "landing-imersao-execucao-total",
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_term: utmParams.utm_term,
          utm_content: utmParams.utm_content,
        },
      });

      if (lead) {
        // Score (fire-and-forget)
        import('@/lib/leadScoring').then(({ scoreAndUpdateLead }) => scoreAndUpdateLead(lead.id));

        await registerConversion({
          leadId: lead.id,
          tipo: "modal_pago",
          pageSlug: "pago",
        });

        if (isNew) {
          // Resolve identity (fire-and-forget)
          import('@/lib/resolveIdentity').then(({ resolveIdentityForLead }) => {
            resolveIdentityForLead({
              leadId: lead.id,
              whatsapp: numbers,
              email: normalizedEmail,
              utm_source: utmParams.utm_source,
            });
          });
        }
      }

      // Enviar via Edge Function
      await supabase.functions.invoke("send-to-pingback-modal", {
        body: {
          email: normalizedEmail,
          customFields: [
            { fieldName: "whatsapp", fieldValue: numbers },
            { fieldName: "fullPhone", fieldValue: fullPhone },
            { fieldName: "timestamp", fieldValue: new Date().toISOString() },
            { fieldName: "source", fieldValue: "landing-imersao-execucao-total" }
          ]
        },
      });
    } catch (err) {
      console.log("Erro ao salvar lead:", err);
    }

    // Sempre redireciona para checkout
    window.location.href = CHECKOUT_URL;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card border border-primary/30 rounded-xl p-6 md:p-8 w-full max-w-md animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Você está a um passo de dominar a Inteligência Artificial!
          </h3>
          <p className="text-text-secondary">
            Preencha com seus dados abaixo e você será redirecionado para o checkout:
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-text-secondary">
              E-mail <span className="text-primary">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }}
              placeholder="seu@email.com"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-text-secondary">
              Telefone / WhatsApp <span className="text-primary">*</span>
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => { setWhatsapp(formatPhone(e.target.value)); if (errors.whatsapp) setErrors(prev => ({ ...prev, whatsapp: undefined })); }}
              placeholder="(11) 99999-9999 ou 3333-4444"
              maxLength={15}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            {errors.whatsapp && <p className="text-destructive text-sm">{errors.whatsapp}</p>}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
            >
              {isLoading ? "Processando..." : "Continuar para Checkout"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="w-full text-muted-foreground hover:text-foreground">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
