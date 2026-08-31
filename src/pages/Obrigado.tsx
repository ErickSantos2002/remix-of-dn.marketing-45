import { useState } from "react";
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

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/CPJogceTacmIA1XAf5f3qP";

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

const Obrigado = () => {
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [cargo, setCargo] = useState<string>("");
  const [customCargo, setCustomCargo] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [revenue, setRevenue] = useState<string>("");
  const [employees, setEmployees] = useState<string>("");
  const [challenges, setChallenges] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const isOutroCargo = cargo === "outro";

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value || !emailRegex.test(value.trim())) {
      setEmailError("Digite um e-mail válido");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
  };

  // Se for "outro", exige o campo customCargo preenchido
  const cargoValid = cargo && (!isOutroCargo || customCargo.trim());
  const isFormValid = email.trim() && !emailError && cargoValid && companyName.trim() && revenue && employees && challenges.trim();

  // Função para obter o valor final do cargo
  const getFinalCargo = () => {
    if (isOutroCargo && customCargo.trim()) {
      return customCargo.trim();
    }
    return cargoOptions.find(o => o.value === cargo)?.label || cargo;
  };

  const handleSubmit = async () => {
    if (!validateEmail(email)) return;
    if (!isFormValid) return;

    setIsLoading(true);

    try {
      const finalCargo = getFinalCargo();
      
      // UPDATE direto pelo email - lead já foi criado no modal de compra
      const normalizedEmail = email.trim().toLowerCase();
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          cargo: finalCargo,
          empresa: companyName.trim(),
          faturamento: revenueOptions.find(o => o.value === revenue)?.label || revenue,
          funcionarios: employeesOptions.find(o => o.value === employees)?.label || employees,
          desafios: challenges.trim()
        })
        .eq("email", normalizedEmail);

      if (updateError) {
        console.error('Erro ao atualizar lead:', updateError);
      }

      // Enviar dados via Edge Function para Pingback
      const { error } = await supabase.functions.invoke("send-to-pingback-paid", {
        body: {
          email: email.trim(),
          customFields: [
            { fieldName: "cargo", fieldValue: finalCargo },
            { fieldName: "empresa", fieldValue: companyName.trim() },
            { fieldName: "faturamento", fieldValue: revenueOptions.find(o => o.value === revenue)?.label || revenue },
            { fieldName: "funcionarios", fieldValue: employeesOptions.find(o => o.value === employees)?.label || employees },
            { fieldName: "desafios_ia", fieldValue: challenges.trim() },
            { fieldName: "timestamp", fieldValue: new Date().toISOString() },
            { fieldName: "source", fieldValue: "compra-imersao-execucao-total" }
          ]
        },
      });

      if (error) {
        console.error("Erro ao enviar dados:", error);
      }
    } catch (error) {
      console.error("Erro ao enviar dados:", error);
    }

    // Redirecionar para o grupo VIP
    window.location.href = WHATSAPP_GROUP_URL;
  };

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
          Sua compra está quase concluída!
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
          <span className="text-primary font-semibold">concluir sua compra</span> e{" "}
          <span className="text-primary font-semibold">entrar em nosso grupo VIP</span> do WhatsApp:
        </p>

        {/* Card do Formulário */}
        <div className="glass-card p-6 md:p-8 rounded-xl border border-border/50 space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Qual o seu e-mail? <span className="text-primary">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => email && validateEmail(email)}
              className="bg-muted/50 border-border/50"
            />
            {emailError && <p className="text-destructive text-sm">{emailError}</p>}
          </div>

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
            {isLoading ? "Redirecionando..." : "Concluir Inscrição e Entrar no Grupo"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Obrigado;
