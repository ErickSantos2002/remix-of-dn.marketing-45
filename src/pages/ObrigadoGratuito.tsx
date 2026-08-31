import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { registerConversion } from "@/lib/leadConversion";
import { toast } from "sonner";

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/HXFgxx29Fxq0ljfZWEpQUu";

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
  { value: "ate-100k", label: "Até 100k/mês" },
  { value: "100k-500k", label: "Entre 100k e 500k/mês" },
  { value: "500k-1mm", label: "Entre 500k e 1MM/mês" },
  { value: "1mm-3mm", label: "Entre 1MM e 3MM/mês" },
  { value: "3mm-5mm", label: "Entre 3MM e 5MM/mês" },
  { value: "acima-5mm", label: "Acima de 5MM/mês" },
];

const employeesOptions = [
  { value: "individual", label: "Individual" },
  { value: "2-10", label: "2 - 10" },
  { value: "11-25", label: "11 - 25" },
  { value: "26-49", label: "26 - 49" },
  { value: "acima-50", label: "Acima de 50" },
];

const ObrigadoGratuito = () => {
  const [searchParams] = useSearchParams();
  
  // Capture personal data from URL params (from GratuitoModal)
  const sessionId = searchParams.get("sid") || "";
  const nome = searchParams.get("nome") || "";
  const email = searchParams.get("email") || "";
  const whatsappFromUrl = searchParams.get("whatsapp") || "";

  const [cargo, setCargo] = useState<string>("");
  const [customCargo, setCustomCargo] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [revenue, setRevenue] = useState<string>("");
  const [employees, setEmployees] = useState<string>("");
  const [challenges, setChallenges] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isOutroCargo = cargo === "outro";
  
  // Se for "outro", exige o campo customCargo preenchido
  const cargoValid = cargo && (!isOutroCargo || customCargo.trim());
  const isFormValid = cargoValid && companyName.trim() && revenue && employees && challenges.trim();

  // Função para obter o valor final do cargo
  const getFinalCargo = () => {
    if (isOutroCargo && customCargo.trim()) {
      return customCargo.trim();
    }
    return cargoOptions.find(o => o.value === cargo)?.label || cargo;
  };

  // Gerenciar countdown e redirecionamento
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

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsLoading(true);

    try {
      const finalCargo = getFinalCargo();
      const revenueLabel = revenueOptions.find(o => o.value === revenue)?.label || revenue;
      const employeesLabel = employeesOptions.find(o => o.value === employees)?.label || employees;

      // Decodificar email da URL (pode estar URL-encoded)
      const decodedEmail = decodeURIComponent(email).trim().toLowerCase();
      
      console.log('=== DEBUG OBRIGADO GRATUITO ===');
      console.log('URL completa:', window.location.href);
      console.log('sessionId:', sessionId);
      console.log('email original:', email);
      console.log('email decodificado:', decodedEmail);
      console.log('nome:', nome);
      console.log('Form data:', { finalCargo, companyName, revenueLabel, employeesLabel, challenges });

      const updateData = {
        cargo: finalCargo,
        empresa: companyName.trim(),
        faturamento: revenueLabel,
        funcionarios: employeesLabel,
        desafios: challenges.trim(),
        last_conversion_date: new Date().toISOString()
      };

      let updateSuccess = false;
      let updatedLeadId: string | null = null;

      // Tentar UPDATE por session_id primeiro
      if (sessionId) {
        const { data: updatedBySession } = await supabase
          .from("leads")
          .update(updateData)
          .eq("session_id", sessionId)
          .select("id")
          .maybeSingle();

        if (updatedBySession) {
          updateSuccess = true;
          updatedLeadId = updatedBySession.id;
        }
      }

      // Se não encontrou por session_id, tentar por email
      if (!updateSuccess && decodedEmail) {
        const { data: updatedByEmail } = await supabase
          .from("leads")
          .update(updateData)
          .eq("email", decodedEmail)
          .select("id")
          .maybeSingle();

        if (updatedByEmail) {
          updateSuccess = true;
          updatedLeadId = updatedByEmail.id;
        }
      }

      if (!updateSuccess) {
        console.error('Não foi possível atualizar o lead');
        toast.error("Erro ao salvar dados. Por favor, tente novamente.");
        setIsLoading(false);
        return;
      }

      // Register conversion for form completion
      if (updatedLeadId) {
        await registerConversion({
          leadId: updatedLeadId,
          tipo: "formulario_completo",
          pageSlug: "obrigadogratuito",
          sessionId: sessionId || null,
        });
      }

      // Enviar dados completos para Pingback
      const payload = {
        email: decodedEmail,
        customFields: [
          { fieldName: "session_id", fieldValue: sessionId },
          { fieldName: "nome", fieldValue: nome },
          { fieldName: "whatsapp", fieldValue: whatsappFromUrl },
          { fieldName: "fullPhone", fieldValue: whatsappFromUrl ? `+55${whatsappFromUrl}` : "" },
          { fieldName: "cargo", fieldValue: finalCargo },
          { fieldName: "empresa", fieldValue: companyName.trim() },
          { fieldName: "faturamento", fieldValue: revenueLabel },
          { fieldName: "funcionarios", fieldValue: employeesLabel },
          { fieldName: "desafios_ia", fieldValue: challenges.trim() },
          { fieldName: "timestamp", fieldValue: new Date().toISOString() },
          { fieldName: "source", fieldValue: "inscricao-gratuita" }
        ]
      };
      
      const { error } = await supabase.functions.invoke("send-to-pingback", {
        body: payload,
      });
      
      if (error) {
        console.error("Erro na Edge Function:", error);
      }

      // SUCESSO! Iniciar countdown de 3 segundos
      setIsLoading(false);
      setCountdown(3);
      
    } catch (error) {
      console.error("Erro ao enviar dados:", error);
      toast.error("Erro ao processar. Tente novamente.");
      setIsLoading(false);
    }
  };

  // Tela de sucesso com countdown
  if (countdown !== null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-14 h-14 text-green-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Inscrição Finalizada com Sucesso!
          </h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Você será redirecionado para o grupo VIP do WhatsApp em
          </p>
          <div className="text-7xl font-bold text-primary animate-pulse mb-2">
            {countdown}
          </div>
          <p className="text-muted-foreground">segundo{countdown !== 1 ? 's' : ''}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl animate-fade-in">
        {/* Ícone de Check */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
          Sua inscrição gratuita está quase finalizada!
        </h1>

        {/* Barra de Progresso Animada */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progresso</span>
            <span>90%</span>
          </div>
          <Progress value={90} className="h-3 animate-glow-pulse" />
        </div>

        {/* Subtítulo */}
        <p className="text-center text-muted-foreground mb-8 text-base md:text-lg">
          Responda a pesquisa abaixo para{" "}
          <span className="text-primary font-semibold">finalizar sua inscrição</span> e{" "}
          <span className="text-primary font-semibold">entrar em nosso grupo</span> do WhatsApp:
        </p>

        {/* Card do Formulário */}
        <div className="glass-card p-6 md:p-8 rounded-xl border border-border/50 space-y-6">
          {/* Cargo */}
          <div className="space-y-2">
            <Label htmlFor="cargo" className="text-foreground">
              Qual o seu cargo? <span className="text-primary">*</span>
            </Label>
            <Select value={cargo} onValueChange={(value) => {
              setCargo(value);
              if (value !== "outro") setCustomCargo("");
            }}>
              <SelectTrigger className="bg-muted/50 border-border/50">
                <SelectValue placeholder="Selecione seu cargo" />
              </SelectTrigger>
              <SelectContent>
                {cargoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Campo para cargo personalizado quando seleciona "Outro" */}
            {isOutroCargo && (
              <Input
                id="customCargo"
                placeholder="Digite seu cargo"
                value={customCargo}
                onChange={(e) => setCustomCargo(e.target.value)}
                className="bg-muted/50 border-border/50 mt-2"
              />
            )}
          </div>

          {/* Nome da Empresa */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-foreground">
              Qual o nome da sua empresa? <span className="text-primary">*</span>
            </Label>
            <Input
              id="companyName"
              placeholder="Nome da sua empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="bg-muted/50 border-border/50"
            />
          </div>

          {/* Faturamento */}
          <div className="space-y-2">
            <Label htmlFor="revenue" className="text-foreground">
              Qual o faturamento médio mensal da sua empresa? <span className="text-primary">*</span>
            </Label>
            <Select value={revenue} onValueChange={setRevenue}>
              <SelectTrigger className="bg-muted/50 border-border/50">
                <SelectValue placeholder="Selecione o faturamento" />
              </SelectTrigger>
              <SelectContent>
                {revenueOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Funcionários */}
          <div className="space-y-2">
            <Label htmlFor="employees" className="text-foreground">
              Quantos funcionários sua empresa possui? <span className="text-primary">*</span>
            </Label>
            <Select value={employees} onValueChange={setEmployees}>
              <SelectTrigger className="bg-muted/50 border-border/50">
                <SelectValue placeholder="Selecione a quantidade" />
              </SelectTrigger>
              <SelectContent>
                {employeesOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desafios com IA */}
          <div className="space-y-2">
            <Label htmlFor="challenges" className="text-foreground">
              Quais são os seus principais desafios na implementação de Inteligência Artificial no seu negócio? <span className="text-primary">*</span>
            </Label>
            <Textarea
              id="challenges"
              placeholder="Descreva seus principais desafios..."
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              className="bg-muted/50 border-border/50 min-h-[120px]"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className="w-full mt-4 py-6 text-lg font-semibold"
          >
            {isLoading ? "Salvando dados..." : "Finalizar Inscrição e Entrar no Grupo"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ObrigadoGratuito;
