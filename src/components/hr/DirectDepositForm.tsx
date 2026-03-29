import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Save, Shield } from "lucide-react";

interface DirectDepositFormProps {
  onboarding: any;
  onComplete: () => void;
  clockEmployeeId?: string | null;
}

export function DirectDepositForm({ onboarding, onComplete, clockEmployeeId }: DirectDepositFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: onboarding?.bank_name || "",
    account_type: onboarding?.account_type || "",
    routing_number: onboarding?.routing_number || "",
    account_number: "",
    confirm_account_number: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.account_number !== formData.confirm_account_number) {
      toast.error("Account numbers do not match");
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const payload: any = {
        bank_name: formData.bank_name,
        account_type: formData.account_type,
        routing_number: formData.routing_number,
        account_number_encrypted: formData.account_number,
        direct_deposit_completed: true,
      };

      if (clockEmployeeId) {
        payload.clock_employee_id = clockEmployeeId;
      } else {
        payload.user_id = userData.user.id;
      }

      if (onboarding?.id) {
        const { error } = await supabase
          .from("employee_onboarding")
          .update(payload)
          .eq("id", onboarding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_onboarding").insert(payload);
        if (error) throw error;
      }

      toast.success("Direct deposit information saved successfully");
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to save direct deposit information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Direct Deposit Setup</h3>
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your banking information is encrypted and stored securely. It will only be used for payroll
            purposes.
          </AlertDescription>
        </Alert>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bank_name">Bank Name *</Label>
          <Input
            id="bank_name"
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            placeholder="e.g., Wells Fargo, Bank of America"
            required
          />
        </div>

        <div>
          <Label htmlFor="account_type">Account Type *</Label>
          <Select
            value={formData.account_type}
            onValueChange={(value) => setFormData({ ...formData, account_type: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Checking</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="routing_number">Routing Number *</Label>
          <Input
            id="routing_number"
            value={formData.routing_number}
            onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
            placeholder="9-digit routing number"
            maxLength={9}
            pattern="[0-9]{9}"
            required
          />
        </div>

        <div>
          <Label htmlFor="account_number">Account Number *</Label>
          <Input
            id="account_number"
            type="password"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            placeholder="Enter account number"
            required
          />
        </div>

        <div>
          <Label htmlFor="confirm_account_number">Confirm Account Number *</Label>
          <Input
            id="confirm_account_number"
            type="password"
            value={formData.confirm_account_number}
            onChange={(e) => setFormData({ ...formData, confirm_account_number: e.target.value })}
            placeholder="Re-enter account number"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        <Save className="mr-2 h-4 w-4" />
        {loading ? "Saving..." : "Save & Continue"}
      </Button>
    </form>
  );
}
