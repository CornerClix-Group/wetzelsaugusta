import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface W4FormProps {
  onboarding: any;
  onComplete: () => void;
  clockEmployeeId?: string | null;
}

export function W4Form({ onboarding, onComplete, clockEmployeeId }: W4FormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    filing_status: onboarding?.filing_status || "",
    allowances: onboarding?.allowances || 0,
    additional_withholding: onboarding?.additional_withholding || 0,
    exempt_from_withholding: onboarding?.exempt_from_withholding || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const payload = {
        user_id: userData.user.id,
        ...formData,
        w4_completed: true,
      };

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

      toast.success("W-4 information saved successfully");
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to save W-4 information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">W-4 Tax Withholding Information</h3>
        <p className="text-sm text-muted-foreground mb-6">
          This information determines how much federal income tax to withhold from your paycheck.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="filing_status">Filing Status *</Label>
          <Select
            value={formData.filing_status}
            onValueChange={(value) => setFormData({ ...formData, filing_status: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select filing status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single or Married filing separately</SelectItem>
              <SelectItem value="married">Married filing jointly</SelectItem>
              <SelectItem value="head">Head of household</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="allowances">Number of Allowances</Label>
          <Input
            id="allowances"
            type="number"
            min="0"
            value={formData.allowances}
            onChange={(e) => setFormData({ ...formData, allowances: parseInt(e.target.value) || 0 })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            More allowances = less tax withheld
          </p>
        </div>

        <div>
          <Label htmlFor="additional_withholding">Additional Withholding (Optional)</Label>
          <Input
            id="additional_withholding"
            type="number"
            step="0.01"
            min="0"
            value={formData.additional_withholding}
            onChange={(e) =>
              setFormData({ ...formData, additional_withholding: parseFloat(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            Extra amount to withhold from each paycheck
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="exempt"
            checked={formData.exempt_from_withholding}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, exempt_from_withholding: checked as boolean })
            }
          />
          <Label htmlFor="exempt" className="font-normal">
            I claim exemption from withholding
          </Label>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        <Save className="mr-2 h-4 w-4" />
        {loading ? "Saving..." : "Save & Continue"}
      </Button>
    </form>
  );
}
