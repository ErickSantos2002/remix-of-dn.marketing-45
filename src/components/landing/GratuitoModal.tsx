import { useState, useEffect } from "react";
import { X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUtmParams } from "@/lib/utm";
import { sendMetaConversion } from "@/lib/metaCapi";
import { registerConversion } from "@/lib/leadConversion";
import { captureLead } from "@/lib/leadCapture";

interface GratuitoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/HXFgxx29Fxq0ljfZWEpQUu";
const WEBHOOK_URL = "https://ia.iafik.com.br/webhook/conversao_modal_0702";

const sendToWebhook = async (nome: string, whatsapp: string) => {
  const payload = { nome, whatsapp };
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    
    // Salva log (sucesso ou erro)
    await supabase.from("webhook_logs").insert({
      webhook_url: WEBHOOK_URL,
      payload,
      status_code: response.status,
      response_body: responseText || null,
      error_message: !response.ok ? `HTTP Error: ${response.status}` : null,
      success: response.ok
    });
  } catch (err) {
    // Salva log de erro de rede/exceção
    await supabase.from("webhook_logs").insert({
      webhook_url: WEBHOOK_URL,
      payload,
      error_message: err instanceof Error ? err.message : "Unknown error",
      success: false
    });
  }
};

const generateSessionId = () => {
  return `grat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

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

export function GratuitoModal({ isOpen, onClose }: GratuitoModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; whatsapp?: string }>({});
  const [countdown, setCountdown] = useState<number | null>(null);

  // Countdown effect for WhatsApp redirect
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      window.location.href = WHATSAPP_GROUP_URL;
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setErrors({ email: "Digite um e-mail válido" });
      return;
    }

    setIsCheckingEmail(true);
    setErrors({});
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const utmParams = getUtmParams();
      const { lead: existingLead, isNew } = await captureLead({
        email: normalizedEmail,
        mode: "update_only",
      });

      if (existingLead) {
        // Reconversion: update UTMs/source via secure server upsert
        await captureLead({
          email: normalizedEmail,
          sessionId: existingLead.session_id,
          fields: {
            tipo: "modal_gratuito",
            source: "inscricao-gratuita",
            origem_campanha: "reconversao_070226",
            utm_source: utmParams.utm_source,
            utm_medium: utmParams.utm_medium,
            utm_campaign: utmParams.utm_campaign,
            utm_term: utmParams.utm_term,
            utm_content: utmParams.utm_content,
          },
        });

        // Score (fire-and-forget)
        import('@/lib/leadScoring').then(({ scoreAndUpdateLead }) => scoreAndUpdateLead(existingLead.id));

        // Register reconversion
        await registerConversion({
          leadId: existingLead.id,
          tipo: "modal_gratuito",
          pageSlug: "modal-gratuito-24-25fev",
          sessionId: existingLead.session_id,
        });

        // Reconversão: o e-mail é o único dado que o cliente conhece aqui — nome e
        // WhatsApp não são mais devolvidos pela API de captura (proteção de PII),
        // então o evento de conversão vai só com o e-mail.
        if (existingLead.has_nome && existingLead.has_whatsapp) {
          sendMetaConversion({
            event_name: "[C] LEAD GRATUITO",
            email: normalizedEmail,
            custom_data: {
              lead_type: "reconversao",
              source: "modal_gratuito"
            }
          });
        }

        // Verifica se TODOS os campos de perfil estão preenchidos
        const isComplete = existingLead.profile_complete;

        if (isComplete) {
          setCountdown(5);
        } else {
          const sessionId = existingLead.session_id || generateSessionId();
          const params = new URLSearchParams({
            sid: sessionId,
            email: normalizedEmail,
          });
          navigate(`/obrigadogratuito?${params.toString()}`);
        }
      } else {
        // Lead novo - mostra etapa 2
        setStep(2);
      }
    } catch (err) {
      console.log("Erro ao verificar email:", err);
      setStep(2);
    }

    setIsCheckingEmail(false);
  };

  const validate = () => {
    const newErrors: { name?: string; whatsapp?: string } = {};
    
    if (!name.trim()) newErrors.name = "Digite seu nome";
    
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
    const newSessionId = generateSessionId();
    const utmParams = getUtmParams();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { lead: newLead } = await captureLead({
        email: normalizedEmail,
        sessionId: newSessionId,
        fields: {
          tipo: "modal_gratuito",
          nome: name.trim(),
          whatsapp: numbers,
          source: "inscricao-gratuita",
          origem_campanha: "aula_070226",
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_term: utmParams.utm_term,
          utm_content: utmParams.utm_content,
        },
      });

      if (newLead) {
        // Score (fire-and-forget)
        import('@/lib/leadScoring').then(({ scoreAndUpdateLead }) => scoreAndUpdateLead(newLead.id));

        await registerConversion({
          leadId: newLead.id,
          tipo: "modal_gratuito",
          pageSlug: "modal-gratuito-24-25fev",
          sessionId: newLead.session_id || newSessionId,
        });

        // Resolve identity (fire-and-forget)
        import('@/lib/resolveIdentity').then(({ resolveIdentityForLead }) => {
          resolveIdentityForLead({
            leadId: newLead.id,
            whatsapp: numbers,
            email: normalizedEmail,
            nome: name.trim(),
            utm_source: utmParams.utm_source,
          });
        });
      }

      // Dispara webhook para lead novo
      sendToWebhook(name.trim(), numbers);

      // Dispara evento para Meta CAPI com nome correto
      sendMetaConversion({
        event_name: "[C] LEAD GRATUITO",
        email: normalizedEmail,
        phone: numbers,
        first_name: name.trim(),
        custom_data: {
          lead_type: "novo",
          source: "modal_gratuito"
        }
      });
    } catch (err) {
      console.log("Erro ao inserir lead:", err);
    }

    const params = new URLSearchParams({
      sid: newSessionId,
      nome: name.trim(),
      email: normalizedEmail,
      whatsapp: numbers
    });
    
    navigate(`/obrigadogratuito?${params.toString()}`);
  };

  const handleClose = () => {
    setStep(1);
    setEmail("");
    setName("");
    setWhatsapp("");
    setErrors({});
    setCountdown(null);
    onClose();
  };

  if (!isOpen) return null;

  // Tela de sucesso com countdown
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-overlay/80 backdrop-blur-sm" />
        
        <div className="relative bg-card border border-primary/30 rounded-xl p-6 md:p-8 w-full max-w-md animate-fade-in text-center">
          {/* Ícone de sucesso animado */}
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            Sua inscrição foi feita com sucesso!
          </h3>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Você será redirecionado para a <span className="text-primary font-semibold">comunidade no WhatsApp</span> em alguns segundos.
            <br /><br />
            <span className="text-foreground">Sua entrada na comunidade é de extrema importância</span> para receber todas as informações e conteúdos exclusivos.
          </p>
          
          {/* Countdown animado */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            {/* Círculo de progresso */}
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="44"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted/30"
              />
              <circle
                cx="48"
                cy="48"
                r="44"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - countdown / 5)}
                className="text-primary transition-all duration-1000 ease-linear"
                strokeLinecap="round"
              />
            </svg>
            {/* Número */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">{countdown}</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            segundo{countdown !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay/80 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-card border border-primary/30 rounded-xl p-6 md:p-8 w-full max-w-md animate-fade-in">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            {step === 1 ? "Garanta sua vaga gratuita!" : "Complete sua inscrição"}
          </h3>
          <p className="text-text-secondary">
            {step === 1 
              ? "Digite seu e-mail para começar:" 
              : "Preencha seus dados para finalizar:"}
          </p>
        </div>

        <form onSubmit={step === 1 ? handleEmailCheck : handleSubmit} className="space-y-4">
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
              disabled={step === 2}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground disabled:opacity-70"
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
          </div>

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-text-secondary">
                  Nome <span className="text-primary">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })); }}
                  placeholder="Seu nome completo"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
                {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
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
            </>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || isCheckingEmail}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
            >
              {step === 1 
                ? (isCheckingEmail ? "Verificando..." : "Continuar") 
                : (isLoading ? "Processando..." : "Garantir Minha Vaga Gratuita")}
            </Button>
            {step === 2 && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setStep(1)} 
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Voltar
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={handleClose} className="w-full text-muted-foreground hover:text-foreground">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
