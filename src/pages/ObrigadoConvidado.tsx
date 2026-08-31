import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/CGSF49yN6i3E3FQXVXq1Qn";

const cargoOptions = [
  "CEO / Fundador",
  "Diretor(a)",
  "Gerente",
  "Coordenador(a)",
  "Analista",
  "Consultor(a)",
  "Freelancer",
  "Estudante",
  "Outro"
];

const revenueOptions = [
  "Até 100k/mês",
  "Entre 100k e 500k/mês",
  "Entre 500k e 1MM/mês",
  "Entre 1MM e 3MM/mês",
  "Entre 3MM e 5MM/mês",
  "Acima de 5MM/mês"
];

const employeesOptions = [
  "Individual",
  "2 - 10",
  "11 - 25",
  "26 - 49",
  "Acima de 50"
];

const ObrigadoConvidado = () => {
  const [searchParams] = useSearchParams();
  const [cargo, setCargo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [revenue, setRevenue] = useState("");
  const [employees, setEmployees] = useState("");
  const [challenges, setChallenges] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Get data from URL params
  const sessionId = searchParams.get('sid') || '';
  const nome = decodeURIComponent(searchParams.get('nome') || '');
  const email = decodeURIComponent(searchParams.get('email') || '');
  const whatsappFromUrl = searchParams.get('whatsapp') || '';
  const tipoParticipante = decodeURIComponent(searchParams.get('tipo') || '');

  const isFormValid = cargo && companyName && revenue && employees && challenges.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) return;
    
    setIsLoading(true);
    
    try {
      const tipoLabel = tipoParticipante === 'mentorado' ? 'Mentorado MTIA' : (tipoParticipante === 'convidado' ? 'Convidado' : tipoParticipante);

      // Update the existing lead with additional info
      if (sessionId) {
        console.log('Updating lead with session_id:', sessionId);

        const { error: updateError } = await supabase
          .from('leads')
          .update({
            cargo,
            empresa: companyName,
            faturamento: revenue,
            funcionarios: employees,
            desafios: challenges.trim(),
            tipo_participante: tipoLabel
          })
          .eq('session_id', sessionId);

        if (updateError) {
          console.error('Error updating lead:', updateError);
          toast.error("Erro ao salvar dados. Por favor, tente novamente.");
          setIsLoading(false);
          return;
        }

        console.log('Lead updated successfully for session_id:', sessionId);
      }
      
      // Send to Pingback via edge function (webhook específico para convidados)
      const { error: functionError } = await supabase.functions.invoke('send-to-pingback-convidado', {
        body: {
          email: email,
          customFields: [
            { fieldName: "session_id", fieldValue: sessionId },
            { fieldName: "nome", fieldValue: nome },
            { fieldName: "whatsapp", fieldValue: whatsappFromUrl },
            { fieldName: "fullPhone", fieldValue: whatsappFromUrl ? `+55${whatsappFromUrl}` : "" },
            { fieldName: "MentoradoOUConvidado", fieldValue: tipoParticipante },
            { fieldName: "cargo", fieldValue: cargo },
            { fieldName: "empresa", fieldValue: companyName },
            { fieldName: "faturamento", fieldValue: revenue },
            { fieldName: "funcionarios", fieldValue: employees },
            { fieldName: "desafios_ia", fieldValue: challenges.trim() },
            { fieldName: "timestamp", fieldValue: new Date().toISOString() },
            { fieldName: "source", fieldValue: "inscricao-convidado" }
          ]
        }
      });
      
      if (functionError) {
        console.error('Error sending to Pingback:', functionError);
      }
      
      // Redirect to WhatsApp group
      window.location.href = WHATSAPP_GROUP_URL;
      
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">🎉</span>
          </div>
          <CardTitle className="text-2xl sm:text-3xl text-foreground">
            Parabéns, {nome || 'Convidado'}!
          </CardTitle>
          <p className="text-muted-foreground">
            Sua vaga exclusiva está quase garantida. Complete o formulário abaixo para finalizar sua inscrição.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progresso</span>
              <span>Passo 2 de 2</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cargo" className="text-foreground">Qual seu cargo?</Label>
              <Select value={cargo} onValueChange={setCargo}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione seu cargo" />
                </SelectTrigger>
                <SelectContent>
                  {cargoOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-foreground">Nome da empresa</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Nome da sua empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="revenue" className="text-foreground">Faturamento mensal</Label>
              <Select value={revenue} onValueChange={setRevenue}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o faturamento" />
                </SelectTrigger>
                <SelectContent>
                  {revenueOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="employees" className="text-foreground">Quantos funcionários?</Label>
              <Select value={employees} onValueChange={setEmployees}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione a quantidade" />
                </SelectTrigger>
                <SelectContent>
                  {employeesOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="challenges" className="text-foreground">Quais seus principais desafios com IA?</Label>
              <Textarea
                id="challenges"
                placeholder="Conte um pouco sobre os desafios que você enfrenta..."
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                className="bg-background border-border min-h-[100px]"
              />
            </div>
            
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
            >
              {isLoading ? "Finalizando..." : "Entrar no grupo do WhatsApp"}
            </Button>
            
            <p className="text-center text-xs text-muted-foreground">
              Ao continuar, você será redirecionado para o grupo exclusivo do WhatsApp
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ObrigadoConvidado;
