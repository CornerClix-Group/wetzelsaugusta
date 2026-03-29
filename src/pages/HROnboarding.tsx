import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, FileText, Shield, Users } from "lucide-react";
import { W4Form } from "@/components/hr/W4Form";
import { DirectDepositForm } from "@/components/hr/DirectDepositForm";
import { EmergencyContactsForm } from "@/components/hr/EmergencyContactsForm";
import { DocumentUploadSection } from "@/components/hr/DocumentUploadSection";
import { PolicyAcknowledgements } from "@/components/hr/PolicyAcknowledgements";
import { EmployeeOnboardingDashboard } from "@/components/hr/EmployeeOnboardingDashboard";
import { useToast } from "@/hooks/use-toast";

export default function HROnboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeStep, setActiveStep] = useState<string>("w4");
  const [isOwner, setIsOwner] = useState(false);

  // "on behalf of" mode: owner filling HR info for a clock employee
  const forClockEmployeeId = searchParams.get("for");
  const forEmployeeName = searchParams.get("name");
  const isOnBehalfMode = !!forClockEmployeeId;

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      return data?.role;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    setIsOwner(userRole === "owner" || userRole === "manager");
  }, [userRole]);

  // In on-behalf mode, load onboarding by clock_employee_id; otherwise by user_id
  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["employee-onboarding", isOnBehalfMode ? forClockEmployeeId : user?.id],
    queryFn: async () => {
      if (isOnBehalfMode) {
        const { data, error } = await supabase
          .from("employee_onboarding")
          .select("*")
          .eq("clock_employee_id", forClockEmployeeId)
          .maybeSingle();
        if (error && error.code !== "PGRST116") throw error;
        return data;
      }
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employee_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: isOnBehalfMode || (!!user?.id && !isOwner),
  });

  const completionSteps = [
    { key: "w4", label: "W-4 Form", completed: onboarding?.w4_completed },
    { key: "direct_deposit", label: "Direct Deposit", completed: onboarding?.direct_deposit_completed },
    { key: "emergency", label: "Emergency Contacts", completed: onboarding?.emergency_contacts_completed },
    { key: "documents", label: "Documents", completed: onboarding?.documents_completed },
    { key: "policies", label: "Policies", completed: onboarding?.policies_completed },
  ];

  const totalSteps = completionSteps.length;
  const completedSteps = completionSteps.filter((s) => s.completed).length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const handleStepComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["employee-onboarding"] });
    toast({
      title: "Section Completed",
      description: "Your progress has been saved.",
    });

    // Auto-advance to next incomplete step
    const currentIndex = completionSteps.findIndex((s) => s.key === activeStep);
    const nextIncomplete = completionSteps.slice(currentIndex + 1).find((s) => !s.completed);
    if (nextIncomplete) {
      setActiveStep(nextIncomplete.key);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isOwner) {
    return <EmployeeOnboardingDashboard />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Employee Onboarding</h1>
            <p className="text-muted-foreground mt-2">Complete your onboarding requirements</p>
          </div>
          {onboarding?.onboarding_completed && (
            <Badge className="bg-green-600">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Onboarding Complete
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>
              {completedSteps} of {totalSteps} sections completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-5">
          {completionSteps.map((step) => (
            <Card
              key={step.key}
              className={`cursor-pointer transition-colors ${
                activeStep === step.key ? "border-primary" : ""
              }`}
              onClick={() => setActiveStep(step.key)}
            >
              <CardContent className="pt-6 text-center">
                {step.completed ? (
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                ) : (
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                )}
                <p className="text-sm font-medium">{step.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            {activeStep === "w4" && (
              <W4Form onboarding={onboarding} onComplete={handleStepComplete} />
            )}
            {activeStep === "direct_deposit" && (
              <DirectDepositForm onboarding={onboarding} onComplete={handleStepComplete} />
            )}
            {activeStep === "emergency" && (
              <EmergencyContactsForm onboarding={onboarding} onComplete={handleStepComplete} />
            )}
            {activeStep === "documents" && (
              <DocumentUploadSection userId={user?.id || ""} onComplete={handleStepComplete} />
            )}
            {activeStep === "policies" && (
              <PolicyAcknowledgements userId={user?.id || ""} onComplete={handleStepComplete} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
