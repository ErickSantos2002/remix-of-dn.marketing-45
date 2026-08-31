import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, ArrowRight, Users, Lightbulb, Rocket, Handshake, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { registerConversion } from "@/lib/leadConversion";
import { getUtmParams } from "@/lib/utm";
import { captureLead } from "@/lib/leadCapture";
import { validateFullName } from "@/lib/nameValidation";
import { validateEmailFormat, checkEmailDomainMX } from "@/lib/emailValidation";
import { toast } from "sonner";


const cargoOptions = [
  { value: "ceo-fundador", label: "CEO / Fundador" },
  { value: "diretor", label: "Diretor" },
  { value: "gerente", label: "Gerente" },
  { value: "coordenador", label: "Coordenador" },
  { value: "analista", label: "Analista" },
  { value: "consultor", label: "Consultor" },
  { value: "outro", label: "Outro" },
];

const revenueOptions = [
  { value: "ate-100k", label: "Até R$ 100 mil por mês" },
  { value: "100k-500k", label: "Entre R$ 100 mil e R$ 500 mil por mês" },
  { value: "500k-1mm", label: "Entre R$ 500 mil e R$ 1 milhão por mês" },
  { value: "1mm-3mm", label: "Entre R$ 1 milhão e R$ 3 milhões por mês" },
  { value: "3mm-5mm", label: "Entre R$ 3 milhões e R$ 5 milhões por mês" },
  { value: "acima-5mm", label: "Acima de R$ 5 milhões por mês" },
];

const employeesOptions = [
  { value: "individual", label: "Individual" },
  { value: "2-10", label: "2 - 10" },
  { value: "11-25", label: "11 - 25" },
  { value: "26-49", label: "26 - 49" },
  { value: "acima-50", label: "Acima de 50" },
];

export interface BenefitItem {
  icon: React.ElementType;
  title: string;
  desc: string;
}

const defaultBenefits: BenefitItem[] = [
  { icon: Lightbulb, title: "Sistemas criados ao vivo", desc: "Veja IA sendo implementada em tempo real, não slides." },
  { icon: Rocket, title: "Estratégias práticas de gestão", desc: "Saia com um plano claro para aplicar na sua empresa." },
  { icon: Users, title: "Networking qualificado", desc: "Conexões com outros líderes que já estão adotando IA." },
  { icon: Handshake, title: "Acesso exclusivo", desc: "Conteúdo e insights que não estarão em nenhum outro lugar." },
];

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function EventForm({ eventDate = "25 de março", tipo = "Evento VIP", source = "eventovip", closed = true, successMessage, confirmationTitle, confirmationMessage, nexusStageId, closedTitle, closedMessage, footerNote = "*Evento fechado — Vagas limitadas.", ctaLabel = "FAZER APLICAÇÃO", formHeadline = "Garanta sua chance de escalar seus resultados", formSubheadline = "Preencha seus dados para fazer sua aplicação" }: { eventDate?: string; tipo?: string; source?: string; closed?: boolean; successMessage?: string; confirmationTitle?: string; confirmationMessage?: string; nexusStageId?: string; closedTitle?: string; closedMessage?: React.ReactNode; footerNote?: string; ctaLabel?: string; formHeadline?: string; formSubheadline?: string }) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const indicacaoFromUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search).get("indicacao");
    return p ? p.trim() : "";
  }, []);
  const [indicacao, setIndicacao] = useState(indicacaoFromUrl);
  const indicacaoLocked = !!indicacaoFromUrl;
  useEffect(() => {
    if (indicacaoFromUrl) setIndicacao(indicacaoFromUrl);
  }, [indicacaoFromUrl]);
  const [funcionarios, setFuncionarios] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  

  
  const [nomeError, setNomeError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);

  if (closed) {
    return (
      <div className="text-center space-y-3 py-8">
        <AlertCircle className="w-14 h-14 text-destructive mx-auto" />
        <h3 className="text-xl font-bold text-destructive">{closedTitle || "Inscrições encerradas"}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {closedMessage || (
            <>
              As vagas para o evento <strong className="text-foreground">IA na Mesa de Decisão</strong> foram preenchidas.
              <br />
              Fique atento às nossas redes para próximos eventos.
            </>
          )}
        </p>
      </div>
    );
  }

  const isFormValid =
    nome.trim() &&
    !nomeError &&
    email.trim() &&
    !emailError &&
    !emailChecking &&
    whatsapp.replace(/\D/g, "").length >= 10 &&
    cargo &&
    empresa.trim() &&
    funcionarios &&
    faturamento &&
    indicacao.trim();

  const handleNomeBlur = () => {
    if (!nome.trim()) return;
    const r = validateFullName(nome);
    setNomeError(r.valid ? null : r.reason || "Nome inválido");
  };

  const handleEmailBlur = async () => {
    const value = email.trim().toLowerCase();
    if (!value) return;
    const fmt = validateEmailFormat(value);
    if (!fmt.valid) {
      setEmailError(fmt.reason || "E-mail inválido");
      return;
    }
    setEmailError(null);
    setEmailChecking(true);
    try {
      const mx = await checkEmailDomainMX(value);
      setEmailError(mx.valid ? null : (mx.reason || "Domínio de e-mail inválido"));
    } finally {
      setEmailChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Preencha todos os campos.");
      return;
    }
    // Defesa em profundidade
    const nameCheck = validateFullName(nome);
    if (!nameCheck.valid) {
      setNomeError(nameCheck.reason || "Nome inválido");
      toast.error(nameCheck.reason || "Nome inválido");
      return;
    }
    const fmt = validateEmailFormat(email.trim().toLowerCase());
    if (!fmt.valid) {
      setEmailError(fmt.reason || "E-mail inválido");
      toast.error(fmt.reason || "E-mail inválido");
      return;
    }
    setLoading(true);

    try {
      const utmParams = getUtmParams();
      const whatsappDigits = whatsapp.replace(/\D/g, "");
      const cargoLabel = cargoOptions.find((o) => o.value === cargo)?.label || cargo;
      const faturamentoLabel = revenueOptions.find((o) => o.value === faturamento)?.label || faturamento;
      const funcionariosLabel = employeesOptions.find((o) => o.value === funcionarios)?.label || funcionarios;

      console.log('[FormSectionVip] handleSubmit payload:', {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsappDigits,
        cargo: cargoLabel,
        empresa: empresa.trim(),
        funcionarios: funcionariosLabel,
        faturamento: faturamentoLabel,
        indicacao: indicacao.trim(),
        source,
        tipo,
        nexusStageId,
        utmParams,
      });

      const { lead, error: captureErr } = await captureLead({
        email: email.trim().toLowerCase(),
        fields: {
          nome: nome.trim(),
          whatsapp: whatsappDigits,
          cargo: cargoLabel,
          empresa: empresa.trim(),
          funcionarios: funcionariosLabel,
          faturamento: faturamentoLabel,
          indicacao: indicacao.trim(),
          tipo,
          source,
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_term: utmParams.utm_term,
          utm_content: utmParams.utm_content,
        },
      });

      if (captureErr || !lead) {
        throw new Error(captureErr || "Insert failed");
      }

      const leadId = lead.id;

      await registerConversion({
        leadId,
        tipo,
        pageSlug: source,
      });

      // Score (fire-and-forget)
      import('@/lib/leadScoring').then(({ scoreAndUpdateLead }) => scoreAndUpdateLead(leadId));

      // Direct Nexus handoff (fire-and-forget) — only when nexusStageId is configured for this page
      if (nexusStageId) {
        const tagName = (source || '').replace(/^\/+/, '').trim().toLowerCase();
        const handoffPayload = {
          lead_id: leadId,
          direct_stage: true,
          stage_id: nexusStageId,
          source,
          tags: tagName ? [tagName] : [],
        };
        console.log('[handoff-to-nexus] payload:', handoffPayload);
        supabase.functions
          .invoke('handoff-to-nexus', { body: handoffPayload })
          .then((res) => console.log('[handoff-to-nexus] response:', res))
          .catch((e) => console.error('[handoff-to-nexus] invoke failed:', e));
      }

      // Ticket.ia integration (fire-and-forget) — only fires if enabled in page config
      supabase.functions.invoke('send-to-ticketia', {
        body: {
          slug: source,
          lead: {
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            whatsapp: whatsappDigits,
            empresa: empresa.trim(),
            cargo: cargoLabel,
          },
        },
      }).catch((e) => console.warn('[ticketia] invoke failed', e));

      // Resolve identity (fire-and-forget)
      import('@/lib/resolveIdentity').then(({ resolveIdentityForLead }) => {
        resolveIdentityForLead({
          leadId,
          whatsapp: whatsappDigits,
          email: email.trim().toLowerCase(),
          nome: nome.trim(),
          utm_source: utmParams.utm_source,
        });
      });

      setShowConfirmDialog(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao confirmar presença. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-background/60 border-border/60 h-10 text-sm";
  const labelClass = "text-xs font-medium text-foreground/80";

  return (
    <>
    <Dialog open={showConfirmDialog} onOpenChange={(open) => {
      if (!open) setShowConfirmDialog(false);
    }}>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Rocket className="w-7 h-7" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold leading-tight">
            {confirmationTitle || "Sua aplicação foi recebida com sucesso! 🚀"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm md:text-[15px] text-muted-foreground leading-relaxed text-left pt-2">
              {confirmationMessage ? (
                <div className="whitespace-pre-line">{confirmationMessage}</div>
              ) : (
                <>
                  <p>Nossa equipe fará a análise do seu perfil e retornará em até 48 horas.</p>
                  <p>O IA na Mesa de Decisão foi criado para reunir empresários com desafios, momento de negócio e nível de maturidade semelhantes, garantindo conversas mais relevantes e trocas estratégicas.</p>
                  <p>Caso sua aplicação seja aprovada, você receberá um e-mail com a confirmação da sua participação e todas as informações sobre o evento.</p>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-3 pt-2">
          <Button
            onClick={() => setShowConfirmDialog(false)}
            className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            Entendi
          </Button>
          {successMessage && (
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {successMessage}
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <form onSubmit={handleSubmit} className="space-y-4 pt-6">
      <div className="mb-8">
        <h3 className="font-bold text-foreground mb-4 leading-tight text-lg">{formHeadline}</h3>
        <p className="text-muted-foreground text-sm px-px py-0 mx-0 my-0">{formSubheadline}</p>
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>Nome completo <span className="text-primary">*</span></Label>
        <Input
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => { setNome(e.target.value); if (nomeError) setNomeError(null); }}
          onBlur={handleNomeBlur}
          className={`${inputClass} ${nomeError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          aria-invalid={!!nomeError}
          required
        />
        {nomeError && (
          <p className="text-xs text-destructive flex items-center gap-1 pt-0.5">
            <AlertCircle className="w-3 h-3" /> {nomeError}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={labelClass}>WhatsApp <span className="text-primary">*</span></Label>
          <Input placeholder="(31) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))} className={inputClass} type="tel" required />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>E-mail <span className="text-primary">*</span></Label>
          <Input
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
            onBlur={handleEmailBlur}
            className={`${inputClass} ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            aria-invalid={!!emailError}
            type="email"
            required
          />
          {emailChecking && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Verificando domínio do e-mail...
            </p>
          )}
          {emailError && !emailChecking && (
            <p className="text-xs text-destructive flex items-center gap-1 pt-0.5">
              <AlertCircle className="w-3 h-3" /> {emailError}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={labelClass}>Cargo <span className="text-primary">*</span></Label>
          <Select value={cargo} onValueChange={setCargo}>
            <SelectTrigger className={inputClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {cargoOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Empresa <span className="text-primary">*</span></Label>
          <Input placeholder="Nome da empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={inputClass} required />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={labelClass}>Funcionários <span className="text-primary">*</span></Label>
          <Select value={funcionarios} onValueChange={setFuncionarios}>
            <SelectTrigger className={inputClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {employeesOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Faturamento mensal <span className="text-primary">*</span></Label>
          <Select value={faturamento} onValueChange={setFaturamento}>
            <SelectTrigger className={inputClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {revenueOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label className={labelClass}>Como ficou sabendo do evento? <span className="text-primary">*</span></Label>
        <Input placeholder="Rnews, E-mail, Indicação, etc" value={indicacao} onChange={(e) => setIndicacao(e.target.value)} className={`${inputClass} ${indicacaoLocked ? "opacity-80 cursor-not-allowed" : ""}`} type="text" required readOnly={indicacaoLocked} disabled={indicacaoLocked} />
      </div>
      <Button
        type="submit"
        disabled={loading || !isFormValid}
        className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 mt-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <>{ctaLabel} <ArrowRight className="w-4 h-4" /></>
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center pt-6">
        *{footerNote}
      </p>
    </form>
    </>
  );
}

export function FormSectionVip({ eventDate = "25 de março", tipo = "Evento VIP", source = "eventovip", closed = true, successMessage, confirmationTitle, confirmationMessage, nexusStageId, closedTitle, closedMessage, benefits = defaultBenefits, footerNote, ctaLabel = "FAZER APLICAÇÃO", formHeadline = "Garanta sua chance de escalar seus resultados", formSubheadline = "Preencha seus dados para fazer sua aplicação" }: { eventDate?: string; tipo?: string; source?: string; closed?: boolean; successMessage?: string; confirmationTitle?: string; confirmationMessage?: string; nexusStageId?: string; closedTitle?: string; closedMessage?: React.ReactNode; benefits?: BenefitItem[]; footerNote?: string; ctaLabel?: string; formHeadline?: string; formSubheadline?: string }) {
  return (
    <section id="confirmar-presenca" className="py-16 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — context */}
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                O que esperar desse{" "}
                <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  dia exclusivo?
                </span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Uma imersão prática com demonstrações ao vivo, estratégias
                reais e networking com quem está liderando a implementação de IA no mercado.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((b) => (
                <div
                  key={b.title}
                  className="flex gap-3 p-3 rounded-xl bg-card/60 border border-border/30"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <b.icon className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{b.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form card */}
          <div className="rounded-2xl overflow-hidden border border-border/40 bg-card/80 backdrop-blur-md shadow-2xl">
            <div className="h-1 bg-gradient-to-r from-accent to-primary" />
            <div className="p-5 md:p-7">
              <EventForm eventDate={eventDate} tipo={tipo} source={source} closed={closed} successMessage={successMessage} confirmationTitle={confirmationTitle} confirmationMessage={confirmationMessage} nexusStageId={nexusStageId} closedTitle={closedTitle} closedMessage={closedMessage} footerNote={footerNote} ctaLabel={ctaLabel} formHeadline={formHeadline} formSubheadline={formSubheadline} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
