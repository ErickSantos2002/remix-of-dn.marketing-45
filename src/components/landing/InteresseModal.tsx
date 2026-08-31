import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { getUtmParams } from "@/lib/utm";
import { registerConversion } from "@/lib/leadConversion";
import { captureLead } from "@/lib/leadCapture";
import { toast } from "sonner";

interface InteresseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export function InteresseModal({ isOpen, onClose }: InteresseModalProps) {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [temInteresse, setTemInteresse] = useState<"sim" | "nao" | "">("");
  const [interesseMTIA, setInteresseMTIA] = useState(false);
  const [interesseFormacao, setInteresseFormacao] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }

    if (!email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "E-mail inválido";
    }

    const phoneNumbers = whatsapp.replace(/\D/g, "");
    if (!phoneNumbers) {
      newErrors.whatsapp = "Telefone é obrigatório";
    } else if (phoneNumbers.length < 10) {
      newErrors.whatsapp = "Telefone inválido";
    }

    if (!temInteresse) {
      newErrors.interesse = "Selecione uma opção";
    }

    if (temInteresse === "sim" && !interesseMTIA && !interesseFormacao) {
      newErrors.opcoes = "Selecione pelo menos uma opção";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const utmParams = getUtmParams();
      const normalizedEmail = email.toLowerCase().trim();
      const phoneNumbers = whatsapp.replace(/\D/g, "");

      const interesseData = {
        nome: nome.trim(),
        whatsapp: phoneNumbers,
        interesse_ecossistema: temInteresse === "sim",
        interesse_mtia: temInteresse === "sim" ? interesseMTIA : false,
        interesse_formacao: temInteresse === "sim" ? interesseFormacao : false,
        data_interesse: new Date().toISOString(),
      };

      const { lead, isNew, error: captureError } = await captureLead({
        email: normalizedEmail,
        fields: {
          tipo: "interesse_ecossistema",
          source: "formulario-interesse",
          ...interesseData,
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_term: utmParams.utm_term,
          utm_content: utmParams.utm_content,
        },
      });

      if (captureError || !lead) {
        throw new Error(captureError || "Falha ao salvar lead");
      }

      // Score (fire-and-forget)
      import('@/lib/leadScoring').then(({ scoreAndUpdateLead }) => scoreAndUpdateLead(lead.id));

      await registerConversion({
        leadId: lead.id,
        tipo: "interesse_ecossistema",
        pageSlug: "oportunidade",
      });

      if (isNew) {
        // Resolve identity (fire-and-forget)
        import('@/lib/resolveIdentity').then(({ resolveIdentityForLead }) => {
          resolveIdentityForLead({
            leadId: lead.id,
            whatsapp: phoneNumbers,
            email: normalizedEmail,
            nome: nome.trim(),
            utm_source: utmParams.utm_source,
          });
        });
      }

      navigate("/obrigadointeresse");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Erro ao enviar formulário. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNome("");
    setEmail("");
    setWhatsapp("");
    setTemInteresse("");
    setInteresseMTIA(false);
    setInteresseFormacao(false);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Faça parte do ecossistema{" "}
              <span className="text-primary">&lt;dn.ia&gt;</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Preencha seus dados para saber mais sobre nossas soluções
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-foreground">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={errors.nome ? "border-destructive" : ""}
              />
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-foreground">
                Telefone / WhatsApp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                maxLength={15}
                className={errors.whatsapp ? "border-destructive" : ""}
              />
              {errors.whatsapp && (
                <p className="text-xs text-destructive">{errors.whatsapp}</p>
              )}
            </div>

            {/* Pergunta de interesse */}
            <div className="space-y-3 pt-2">
              <Label className="text-foreground">
                Você tem interesse em fazer parte do ecossistema da{" "}
                <span className="text-primary">&lt;dn.ia&gt;</span>?{" "}
                <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={temInteresse}
                onValueChange={(value: "sim" | "nao") => {
                  setTemInteresse(value);
                  if (value === "nao") {
                    setInteresseMTIA(false);
                    setInteresseFormacao(false);
                  }
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="sim" />
                  <Label htmlFor="sim" className="font-normal cursor-pointer">
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="nao" />
                  <Label htmlFor="nao" className="font-normal cursor-pointer">
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {errors.interesse && (
                <p className="text-xs text-destructive">{errors.interesse}</p>
              )}
            </div>

            {/* Opções condicionais */}
            {temInteresse === "sim" && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Label className="text-foreground">
                  Quero saber mais sobre:{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="mtia"
                      checked={interesseMTIA}
                      onCheckedChange={(checked) =>
                        setInteresseMTIA(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="mtia"
                      className="font-normal cursor-pointer"
                    >
                      MTIA (Mentoria)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="formacao"
                      checked={interesseFormacao}
                      onCheckedChange={(checked) =>
                        setInteresseFormacao(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="formacao"
                      className="font-normal cursor-pointer"
                    >
                      Formação <span className="text-primary">&lt;dn.ia&gt;</span>{" "}
                      (Cursos)
                    </Label>
                  </div>
                </div>
                {errors.opcoes && (
                  <p className="text-xs text-destructive">{errors.opcoes}</p>
                )}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? "Enviando..." : "Quero Fazer Parte"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
