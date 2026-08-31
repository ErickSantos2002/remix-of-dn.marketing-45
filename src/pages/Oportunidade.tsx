import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import logo from "@/assets/dnia-logo.png";

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export default function Oportunidade() {
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

      import('@/lib/leadScoring').then(({ scoreAndUpdateLead }) => scoreAndUpdateLead(lead.id));

      await registerConversion({
        leadId: lead.id,
        tipo: "interesse_ecossistema",
        pageSlug: "oportunidade",
      });

      if (isNew) {
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="mb-8">
        <img src={logo} alt="dn.ia" className="h-10 md:h-12" />
      </div>

      {/* Card do formulário */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Faça parte do ecossistema{" "}
            <span className="text-primary">&lt;dn.ia&gt;</span>
          </h1>
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
              <Label className="text-foreground text-sm">
                Selecione as opções de interesse:{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2">
                {/* Card clicável MTIA */}
                <label
                  htmlFor="mtia"
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    interesseMTIA
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    id="mtia"
                    checked={interesseMTIA}
                    onCheckedChange={(checked) =>
                      setInteresseMTIA(checked as boolean)
                    }
                    className="h-5 w-5 border-2"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-foreground">
                      MTIA (Mentoria)
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Mentoria individual com Rodrigo Nascimento
                    </p>
                  </div>
                </label>

                {/* Card clicável Formação */}
                <label
                  htmlFor="formacao"
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    interesseFormacao
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    id="formacao"
                    checked={interesseFormacao}
                    onCheckedChange={(checked) =>
                      setInteresseFormacao(checked as boolean)
                    }
                    className="h-5 w-5 border-2"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-foreground">
                      Formação <span className="text-primary">&lt;dn.ia&gt;</span>
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cursos e treinamentos em IA aplicada
                    </p>
                  </div>
                </label>
              </div>
              {errors.opcoes && (
                <p className="text-xs text-destructive mt-2">{errors.opcoes}</p>
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

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} dn.ia - Todos os direitos reservados
      </p>
    </div>
  );
}
