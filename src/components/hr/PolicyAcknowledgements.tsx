import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { CheckCircle2, FileText } from "lucide-react";
import { SignaturePad } from "@/components/compliance/SignaturePad";

interface PolicyAcknowledgementsProps {
  userId: string;
  onComplete: () => void;
  clockEmployeeId?: string | null;
}

const policies = [
  {
    type: "handbook",
    title: "Employee Handbook",
    description: "I have read and understand the Wetzels of Augusta employee handbook and agree to comply with all policies and procedures outlined within.",
  },
  {
    type: "safety",
    title: "Safety Policy",
    description: "I acknowledge that I have received training on workplace safety procedures, including proper equipment operation, emergency protocols, and hazard reporting.",
  },
  {
    type: "harassment",
    title: "Anti-Harassment Policy",
    description: "I understand and agree to comply with the company's anti-harassment and anti-discrimination policies. I will treat all coworkers with respect and report any violations.",
  },
  {
    type: "confidentiality",
    title: "Confidentiality Agreement",
    description: "I agree to maintain confidentiality of all proprietary business information, customer data, and trade secrets during and after my employment.",
  },
];

export function PolicyAcknowledgements({ userId, onComplete, clockEmployeeId }: PolicyAcknowledgementsProps) {
  const queryClient = useQueryClient();
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: existingAcknowledgements } = useQuery({
    queryKey: ["policy-acknowledgements", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_acknowledgements")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const acknowledgedTypes = new Set(existingAcknowledgements?.map((a) => a.policy_type) || []);
  const allPoliciesAcknowledged = policies.every((p) => acknowledgedTypes.has(p.type));

  const handleAcknowledge = (policyType: string, checked: boolean) => {
    setAcknowledged((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(policyType);
      } else {
        newSet.delete(policyType);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    const pendingPolicies = policies.filter(
      (p) => acknowledged.has(p.type) && !acknowledgedTypes.has(p.type)
    );

    if (pendingPolicies.length === 0) {
      toast.error("No new policies to acknowledge");
      return;
    }

    const missingSignatures = pendingPolicies.filter((p) => !signatures[p.type]);
    if (missingSignatures.length > 0) {
      toast.error("Please sign all acknowledged policies");
      return;
    }

    setSubmitting(true);
    try {
      for (const policy of pendingPolicies) {
        const { error } = await supabase.from("policy_acknowledgements").insert({
          user_id: userId,
          policy_type: policy.type,
          signature_data: signatures[policy.type],
        });
        if (error) throw error;
      }

      // Mark policies section as complete
      const { error: updateError } = await supabase
        .from("employee_onboarding")
        .update({
          policies_completed: true,
          onboarding_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      toast.success("Policy acknowledgements submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["policy-acknowledgements"] });
      queryClient.invalidateQueries({ queryKey: ["employee-onboarding"] });
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit acknowledgements");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Policy Acknowledgements</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please read and acknowledge each policy by checking the box and signing below.
        </p>
      </div>

      <div className="space-y-4">
        {policies.map((policy) => {
          const isAlreadyAcknowledged = acknowledgedTypes.has(policy.type);
          const isChecked = acknowledged.has(policy.type);

          return (
            <Card key={policy.type} className={isAlreadyAcknowledged ? "bg-muted/30" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {policy.title}
                  </CardTitle>
                  {isAlreadyAcknowledged && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <CardDescription>{policy.description}</CardDescription>
              </CardHeader>

              {!isAlreadyAcknowledged && (
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`policy-${policy.type}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleAcknowledge(policy.type, checked as boolean)
                      }
                    />
                    <Label htmlFor={`policy-${policy.type}`} className="font-normal">
                      I acknowledge and agree to this policy
                    </Label>
                  </div>

                  {isChecked && (
                    <div>
                      <Label>Digital Signature *</Label>
                      <SignaturePad
                        signature={signatures[policy.type] || ""}
                        onSignatureChange={(sig) =>
                          setSignatures({ ...signatures, [policy.type]: sig })
                        }
                      />
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {!allPoliciesAcknowledged && (
        <>
          {acknowledged.size === 0 && (
            <Alert>
              <AlertDescription>
                Please acknowledge all policies to complete your onboarding.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || acknowledged.size === 0}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Acknowledgements"}
          </Button>
        </>
      )}

      {allPoliciesAcknowledged && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            All policies have been acknowledged. Your onboarding is complete!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
